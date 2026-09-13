-- =============================================================================
-- Bump the starting ai_credits balance for new signups from 5 to 10.
-- =============================================================================
-- This only changes the DEFAULT applied when a new row is inserted into
-- public.users (i.e. when someone signs up) — it does NOT touch the balance
-- of any account that already exists. Existing users keep whatever credits
-- they currently have; only accounts created after this runs will start
-- with 10.
--
-- Palette generation cost is unchanged: create_palette() already deducts
-- exactly 1 credit per palette (see schema.sql), so nothing else needs to
-- change for "each palette is 1 credit" — that part was already correct.

alter table public.users
  alter column ai_credits set default 10;