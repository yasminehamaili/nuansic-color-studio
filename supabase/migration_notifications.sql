-- ============================================================
-- Nuansic — Notification preferences migration
-- Run after migration_profile_billing.sql
-- ============================================================

alter table public.users
  add column if not exists notify_product_updates boolean not null default true,
  add column if not exists notify_color_of_day boolean not null default false,
  add column if not exists notify_saved_palette_tips boolean not null default true;

-- Extend the column-level grant from the profile migration to also
-- cover these three. Same reasoning as before: ai_credits and email
-- are still never in this list, so they stay unreachable from the
-- client no matter what the frontend sends.
revoke update on public.users from authenticated;
grant update (
  username,
  display_name,
  avatar_url,
  notify_product_updates,
  notify_color_of_day,
  notify_saved_palette_tips
) on public.users to authenticated;
