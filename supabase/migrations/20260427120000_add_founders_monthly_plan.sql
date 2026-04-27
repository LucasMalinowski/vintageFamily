-- Add founders_monthly to the plan_code check constraint and seed the row.

alter table public.plan_settings
  drop constraint plan_settings_plan_code_check;

alter table public.plan_settings
  add constraint plan_settings_plan_code_check
  check (plan_code in ('standard_monthly', 'standard_yearly', 'founders_monthly', 'founders_yearly'));

insert into public.plan_settings (plan_code, is_visible, is_active)
values ('founders_monthly', false, true)
on conflict (plan_code) do nothing;
