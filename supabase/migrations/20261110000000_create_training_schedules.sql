-- Training schedule versions. The version in use is the one with the latest valid_from that is not in the future;
-- saving again on the same day replaces that day's version.
-- content: sessions [{day (0 is Monday), start (HH:MM), durationMin}].
create table marcom_cadence.training_schedules (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  valid_from date not null,
  content    jsonb not null check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now(),
  constraint training_schedules_valid_from_unique unique (user_id, valid_from)
);

alter table marcom_cadence.training_schedules enable row level security;

grant select, insert, update, delete on marcom_cadence.training_schedules to authenticated;

create policy "Owner has full access" on marcom_cadence.training_schedules
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
