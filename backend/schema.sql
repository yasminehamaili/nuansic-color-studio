-- =============================================================================
-- Nuansic — Phase 1: Database schema + Row Level Security
-- =============================================================================
-- Run this in the Supabase SQL editor (or as a migration). Order matters:
-- tables first, then RLS, then the auth trigger that populates `users`.

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
-- One row per auth user. ai_credits is intentionally never writable from the
-- client — see the RLS policies below and the create_palette() function,
-- which is the ONLY sanctioned way credits get spent, and the webhook Edge
-- Function, which is the ONLY sanctioned way credits get added.

create table public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  ai_credits integer not null default 5,
  created_at timestamptz not null default now()
);

-- id is already indexed as the primary key (btree, unique), but an explicit
-- index is added per spec for clarity / in case the PK constraint is ever
-- changed without someone noticing the index goes with it.
create index if not exists idx_users_id on public.users (id);

alter table public.users enable row level security;

-- Users can read ONLY their own row. Because RLS is row-level, this alone
-- also hides `email` (and everything else) from every other user — there is
-- no separate column-level grant needed for that requirement.
create policy "users_select_own"
  on public.users
  for select
  using (auth.uid() = id);

-- Deliberately NO insert policy for the anon/authenticated roles: rows are
-- created exclusively by the trigger below (SECURITY DEFINER, runs as the
-- table owner, bypasses RLS safely because it's not client-invocable).
--
-- Deliberately NO update policy for the anon/authenticated roles, for ANY
-- column, including ai_credits: this is what makes "no one can update their
-- own credits from the frontend" true. Only the service_role key (used
-- exclusively inside the webhook Edge Function, never shipped to the client)
-- bypasses RLS entirely and can update this table.
--
-- Deliberately NO delete policy: users cannot delete their own account row
-- via the client API. (Account deletion, if you want it, should go through
-- a server-side path that also cleans up auth.users.)


-- -----------------------------------------------------------------------------
-- palettes
-- -----------------------------------------------------------------------------
create table public.palettes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  colors     jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_palettes_user_id on public.palettes (user_id);

alter table public.palettes enable row level security;

create policy "palettes_select_own"
  on public.palettes
  for select
  using (auth.uid() = user_id);

-- WITH CHECK is what actually stops a user from inserting a row with
-- someone else's user_id — USING alone only governs which existing rows a
-- statement can see/target, not what values are allowed in a new row.
create policy "palettes_insert_own"
  on public.palettes
  for insert
  with check (auth.uid() = user_id);

create policy "palettes_delete_own"
  on public.palettes
  for delete
  using (auth.uid() = user_id);

-- No update policy: palettes are treated as immutable once saved. If you
-- want editable palettes later, add an update policy with matching
-- using()/with check() clauses (both — an update can change user_id too).


-- -----------------------------------------------------------------------------
-- processed_webhook_events — idempotency ledger for Phase 2
-- -----------------------------------------------------------------------------
-- The unique constraint on event_id is the actual replay-attack defense: a
-- second webhook delivery for the same event_id fails the insert, and the
-- Edge Function treats that as "already handled, do nothing" rather than
-- crediting the account twice. RLS is enabled with NO policies at all —
-- only the service_role key (which bypasses RLS) ever touches this table,
-- so locking out anon/authenticated entirely is intentional, not an
-- oversight.
create table public.processed_webhook_events (
  event_id     text primary key,
  processed_at timestamptz not null default now()
);

alter table public.processed_webhook_events enable row level security;
-- (no policies — anon/authenticated get zero access, by design)


-- -----------------------------------------------------------------------------
-- Auth trigger: create the public.users row when someone signs up
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER means this runs with the privileges of the function's
-- owner (not the caller), which is what lets it write into a table the
-- caller has no INSERT policy for. It's safe specifically because it is NOT
-- something a client can invoke directly — it only ever runs as a trigger
-- on auth.users, which only Supabase's own auth system writes to.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- create_palette() — the sanctioned way to spend a credit + save a palette
-- -----------------------------------------------------------------------------
-- This isn't explicitly requested in the brief, but it's the missing piece
-- that makes "ai_credits can never be updated from the frontend" actually
-- workable: the app still needs a way to *spend* a credit when someone
-- generates a palette. This function does the credit check, the decrement,
-- and the palette insert as one atomic transaction — so a user can never
-- end up with a saved palette that didn't cost a credit, or a decremented
-- credit with no palette saved (e.g. from a request that fails halfway).
--
-- SECURITY DEFINER + auth.uid() inside the function (not a parameter) is
-- what makes this safe to expose to authenticated clients via RPC: the
-- function always acts on the CALLER's own row, never on an id the client
-- could pass in.
create or replace function public.create_palette(colors jsonb)
returns public.palettes
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  remaining integer;
  new_row public.palettes;
begin
  if caller_id is null then
    raise exception 'not authenticated';
  end if;

  -- Row lock prevents a race where two concurrent requests both read
  -- "1 credit left" and both succeed, leaving credits at -1.
  select ai_credits into remaining
    from public.users
    where id = caller_id
    for update;

  if remaining is null or remaining <= 0 then
    raise exception 'no ai credits remaining';
  end if;

  update public.users
    set ai_credits = ai_credits - 1
    where id = caller_id;

  insert into public.palettes (user_id, colors)
    values (caller_id, colors)
    returning * into new_row;

  return new_row;
end;
$$;

-- Let authenticated users call it (the function's own logic, not a grant,
-- is what scopes it to their own account).
grant execute on function public.create_palette(jsonb) to authenticated;


-- -----------------------------------------------------------------------------
-- add_credits() — the sanctioned way credits get ADDED, called only by the
-- webhook Edge Function (via the service_role client)
-- -----------------------------------------------------------------------------
-- Deliberately NOT granted to authenticated/anon — see the missing GRANT
-- EXECUTE below. Only service_role (which the Edge Function uses, and which
-- is never exposed to the browser) can invoke this. Keeping the actual
-- credit-increment logic in one auditable SQL function, rather than letting
-- the Edge Function run an arbitrary UPDATE, means there's exactly one place
-- to check when asking "how can ai_credits change?"
create or replace function public.add_credits(target_user_id uuid, amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  update public.users
    set ai_credits = ai_credits + amount
    where id = target_user_id;

  if not found then
    raise exception 'no user with id %', target_user_id;
  end if;
end;
$$;

-- No GRANT EXECUTE to authenticated/anon here — intentional. service_role
-- has inherent access regardless of grants, which is exactly the point:
-- this function is reachable only from trusted server-side code.
--
-- IMPORTANT: Postgres grants EXECUTE on newly-created functions to PUBLIC
-- by default — simply not writing a GRANT statement does NOT lock this
-- down on its own. The explicit REVOKE below is what actually closes that
-- gap; skipping it would leave add_credits() callable by any authenticated
-- user despite looking locked down at a glance. (Caught this by testing
-- against a real Postgres instance rather than assuming — worth remembering
-- for any future SECURITY DEFINER function you add.)
revoke execute on function public.add_credits(uuid, integer) from public;

-- Same PUBLIC-by-default behavior applies to create_palette() above — it's
-- harmless there since we DO want authenticated to call it, but being
-- explicit (rather than relying on the default) means the next person
-- reading this file doesn't have to know the Postgres default to trust it.
revoke execute on function public.create_palette(jsonb) from public;
