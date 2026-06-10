-- Settings UI now offers only weekly (7) / bi-weekly (14) / monthly (30).
-- Snap any legacy free-form values (e.g. 3) to the nearest supported option.
update public.users
set insight_interval_days = case
  when insight_interval_days <= 7 then 7
  when insight_interval_days <= 21 then 14
  else 30
end
where insight_interval_days is not null
  and insight_interval_days not in (7, 14, 30);
