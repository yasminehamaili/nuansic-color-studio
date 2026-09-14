-- Generation quota: 1 generated palette = 1 credit, refills once per
-- calendar day. Separate from ai_credits (which is a purchasable pool
-- spent on SAVING a palette) -- this is a daily generation cap.
--
-- One row per "identity": a signed-in user, an anonymous device id, or an
-- IP address (used as an abuse backstop for anonymous traffic). Only the
-- backend (via its service-role key) can read/write this table -- RLS is
-- enabled with no policies granted to anon/authenticated, same trust
-- model as create_palette().

create table if not exists public.generation_quota (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('user', 'device', 'ip')),
  owner_key text not null,
  credits_remaining int not null,
  max_credits int not null,
  reset_date date not null,
  updated_at timestamptz not null default now(),
  unique (owner_type, owner_key)
);

alter table public.generation_quota enable row level security;
-- Deliberately no policies here -- nobody using the anon or authenticated
-- key can read or write this table directly. Only the service_role key
-- (held by the FastAPI backend, never shipped to the browser) can call
-- the function below.

create or replace function public.consume_generation_credit(
  p_owner_type text,
  p_owner_key text,
  p_max_credits int
)
returns table(allowed boolean, credits_remaining int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row generation_quota%rowtype;
begin
  select * into v_row from generation_quota
    where owner_type = p_owner_type and owner_key = p_owner_key
    for update;

  if not found or v_row.reset_date <> current_date then
    -- First time we've seen this identity today (or ever) -- top up to
    -- max and spend 1 for this request in the same step.
    insert into generation_quota (owner_type, owner_key, credits_remaining, max_credits, reset_date)
    values (p_owner_type, p_owner_key, p_max_credits - 1, p_max_credits, current_date)
    on conflict (owner_type, owner_key) do update
      set credits_remaining = p_max_credits - 1,
          max_credits = p_max_credits,
          reset_date = current_date,
          updated_at = now()
    returning * into v_row;
    return query select true, v_row.credits_remaining;
  elsif v_row.credits_remaining <= 0 then
    return query select false, 0;
  else
    update generation_quota
      set credits_remaining = credits_remaining - 1, updated_at = now()
      where id = v_row.id
      returning * into v_row;
    return query select true, v_row.credits_remaining;
  end if;
end;
$$;

revoke all on function public.consume_generation_credit(text, text, int) from public;
grant execute on function public.consume_generation_credit(text, text, int) to service_role;
