-- All tables follow one shape: id, user_id, explicit columns only for what is filtered or sorted,
-- and the rest of the record in a jsonb content column.
-- Growing lists (measurements, workouts) get their filter and sort columns;
-- the exercise catalog is a dictionary the user fills by hand, so it is read whole and sorted in the browser.

-- Measurements move from one column per value to content. The table held only test data.
drop table marcom_cadence.measurements;

-- Body measurements: one row per date and time. content holds the values, such as {"weight": 78, "waist": 100}.
create table marcom_cadence.measurements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measured_on date not null,
  measured_at time,
  content     jsonb not null check (jsonb_typeof(content) = 'object'),
  created_at  timestamptz not null default now(),
  constraint measurements_moment_unique unique nulls not distinct (user_id, measured_on, measured_at)
);

-- Exercise catalog. content: name, metric, perSide, notes, archived and progressions [{id, name, archived}].
create table marcom_cadence.exercises (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  content    jsonb not null check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now()
);

create index exercises_user_id_idx on marcom_cadence.exercises (user_id);

-- Workouts. content: durationMin, notes and items [{exerciseId, notes, sets [...]}].
-- The whole workout is one row, so saving it is a single atomic write.
create table marcom_cadence.workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  started_at timestamptz not null,
  content    jsonb not null check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now()
);

create index workouts_user_started_idx on marcom_cadence.workouts (user_id, started_at desc);

-- Finds workouts that use an exercise or a progression with a containment filter on content.
create index workouts_content_idx on marcom_cadence.workouts using gin (content jsonb_path_ops);

-- Row Level Security and access for signed-in users. The anon role gets nothing.
alter table marcom_cadence.measurements enable row level security;
alter table marcom_cadence.exercises enable row level security;
alter table marcom_cadence.workouts enable row level security;

grant select, insert, update, delete on
  marcom_cadence.measurements,
  marcom_cadence.exercises,
  marcom_cadence.workouts
  to authenticated;

create policy "Owner has full access" on marcom_cadence.measurements
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Owner has full access" on marcom_cadence.exercises
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Owner has full access" on marcom_cadence.workouts
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
