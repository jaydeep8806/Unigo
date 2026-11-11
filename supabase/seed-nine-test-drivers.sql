-- Development database only. These fictional drivers can match simulated rides only.
-- Enable driver_settings.development separately on a dedicated test project.
begin;
insert into public.drivers (id, name, phone, category, brand, model, registration, source, online, latitude, longitude, heartbeat)
select md5('unigo-nine-test-drivers-' || category || '-' || n)::uuid,
  'Test ' || initcap(category) || ' ' || n,
  '9' || lpad((case category when 'bike' then n when 'auto' then n + 3 else n + 6 end)::text, 9, '0'),
  category,
  case category when 'bike' then 'Hero' when 'auto' then 'Bajaj' else 'Maruti' end,
  case category when 'bike' then 'Splendor' when 'auto' then 'Auto' else 'Swift' end,
  'GJ03TX' || lpad((case category when 'bike' then n when 'auto' then n + 3 else n + 6 end)::text, 4, '0'),
  'seed', true, 22.3039 + n * 0.001, 70.8022 + n * 0.001, now()
from (values ('bike'), ('auto'), ('car')) as categories(category)
cross join generate_series(1, 3) as g(n)
on conflict (id) do nothing;
commit;
