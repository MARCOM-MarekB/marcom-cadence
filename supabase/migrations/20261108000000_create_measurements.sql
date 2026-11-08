-- Own schema for marcom-cadence, so its tables stay apart from anything else in the project.
-- The Data API reaches it only after it is added to Exposed schemas in the Data API settings.
create schema marcom_cadence;

grant usage on schema marcom_cadence to authenticated;

-- Body measurements of the signed-in user.
-- One row per measuring moment; saving the same date and time again updates that row.
create table marcom_cadence.measurements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measured_on date not null,
  measured_at time,
  weight      numeric(5,1),
  neck        numeric(5,1),
  chest       numeric(5,1),
  biceps      numeric(5,1),
  waist       numeric(5,1),
  hips        numeric(5,1),
  thigh       numeric(5,1),
  calf        numeric(5,1),
  created_at  timestamptz not null default now(),
  constraint measurements_moment_unique unique nulls not distinct (user_id, measured_on, measured_at)
);

alter table marcom_cadence.measurements enable row level security;

-- Signed-in users get access explicitly. The anon role (not signed in) gets nothing.
grant select, insert, update, delete on marcom_cadence.measurements to authenticated;

create policy "Owner has full access"
  on marcom_cadence.measurements
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
