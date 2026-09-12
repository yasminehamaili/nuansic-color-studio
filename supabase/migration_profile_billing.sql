-- ============================================================
-- Nuansic — Profile & Billing migration
-- Run this in Supabase SQL Editor AFTER schema.sql has already
-- been applied. Safe to run once; re-running will error on the
-- "already exists" statements (that's expected/fine).
-- ============================================================

-- ----------------------------------------------------------
-- 1. Editable profile columns on public.users
-- ----------------------------------------------------------
alter table public.users
  add column if not exists username text unique,
  add column if not exists display_name text,
  add column if not exists avatar_url text;

-- Username format guard: 3-20 chars, letters/numbers/underscore only.
-- Prevents impersonation-style names with spaces/slashes and keeps
-- URLs safe if you ever route to /u/<username>.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'username_format'
  ) then
    alter table public.users
      add constraint username_format
      check (username is null or username ~ '^[a-zA-Z0-9_]{3,20}$');
  end if;
end $$;

-- ----------------------------------------------------------
-- 2. Column-level write protection
--
-- RLS policies control which ROWS a user can touch, not which
-- COLUMNS. Postgres column-level GRANTs handle the column part:
-- we explicitly grant UPDATE only on the columns a user should
-- ever be able to change themselves. ai_credits and email are
-- deliberately left out — no grant means no path to update them
-- from the client, regardless of what the frontend sends.
-- ----------------------------------------------------------
revoke update on public.users from authenticated;
grant update (username, display_name, avatar_url) on public.users to authenticated;

-- RLS still needs an UPDATE policy or no row is writable at all,
-- regardless of column grants. If schema.sql already defined one,
-- this replaces it with the same "own row only" rule (idempotent).
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
-- Column grants above are what actually stop ai_credits/email from
-- being touched — this policy alone only restricts which ROW.

-- ----------------------------------------------------------
-- 3. Billing history table
-- ----------------------------------------------------------
create table if not exists public.billing_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  amount_cents integer not null,
  currency text not null default 'usd',
  credits_granted integer not null,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create index if not exists billing_history_user_id_idx on public.billing_history(user_id);

alter table public.billing_history enable row level security;

-- Users can only ever READ their own billing rows. No INSERT/UPDATE/
-- DELETE policy exists for the authenticated role at all, which means
-- those operations are denied by default — only the webhook, running
-- with the service_role key (which bypasses RLS entirely), can write
-- here. This mirrors how ai_credits itself is protected.
drop policy if exists "billing_history_select_own" on public.billing_history;
create policy "billing_history_select_own"
  on public.billing_history
  for select
  using (auth.uid() = user_id);

-- The RLS policy above restricts which ROWS a query can return, but
-- Postgres also requires baseline table-level privilege before RLS
-- is even consulted. Grant SELECT only (no insert/update/delete) so
-- reading is possible but writing still has zero path from the client.
grant select on public.billing_history to authenticated;
grant select, insert, update, delete on public.billing_history to service_role;

-- ----------------------------------------------------------
-- 4. Avatar storage bucket + policies
--
-- Convention: object path is "<user_id>/<filename>", e.g.
-- "3f2e.../avatar.jpg". The (storage.foldername(name))[1] check
-- below reads that first path segment and compares it to the
-- caller's own uid, so a user can only write inside their own
-- folder — not overwrite anyone else's avatar.
-- ----------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read: avatars need to be viewable by anyone loading the
-- site (they're rendered in headers, dropdowns, etc.), same as
-- most social products. No private user data lives in this bucket.
drop policy if exists "avatar_public_read" on storage.objects;
create policy "avatar_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatar_owner_insert" on storage.objects;
create policy "avatar_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatar_owner_update" on storage.objects;
create policy "avatar_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatar_owner_delete" on storage.objects;
create policy "avatar_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
