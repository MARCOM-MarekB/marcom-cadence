# Supabase

Supabase holds the personal data of marcom-cadence: a hosted Postgres database with login and an automatic REST API (the Data API). The browser talks only to that API and never connects to Postgres directly. Connecting a project step by step is described in [Supabase setup](supabase-setup.md).

## How access works

The page sends two things with every request:

- **Publishable key:** public, identifies the project. It is in `js/supabase.js` and in this repository. On its own it gives access to no data.
- **Login token (JWT):** issued after signing in with the app account. Postgres then runs the query as the `authenticated` role, with the user id from the token.

Every table has Row Level Security with a policy that allows only rows where `user_id` equals the signed-in user. The database enforces it, so knowing the publishable key is not enough to read anything. The `anon` role (not signed in) has no grants on the app's schema.

Never put these in the repository or the page code:

- the **secret key** (formerly `service_role`), which bypasses Row Level Security,
- the **database password**, needed only for a direct connection from a tool such as pgAdmin or `psql`,
- **account access tokens**, which manage the whole Supabase account.

The Supabase dashboard (Table Editor, SQL Editor) runs as the `postgres` role and sees all data. It is the admin tool; the app has no admin account.

## Project

| Setting | Value |
|---|---|
| Project URL | `https://sylmbnnigldjmjxtyeli.supabase.co` |
| Publishable key | `sb_publishable_SbRDLsC4DH5pk68cia5onw_0rcwi3pE` |
| Region | Central EU (Frankfurt), `eu-central-1` |
| Plan | Free |
| Schema | `marcom_cadence` |

Project options:

- **Enable Data API:** on, the page uses this API.
- **Automatically expose new tables:** off. Each table gets explicit `grant` statements for the `authenticated` role in its migration.
- **Enable automatic RLS:** on. It covers only the `public` schema, so migrations enable RLS on every table explicitly.
- **Data API, Exposed schemas:** includes `marcom_cadence`. Without it the API answers that the schema is not exposed.

## Authentication

The app has one account, created by hand. Settings under **Authentication**:

- **Users:** the app account, created with **Add user**, **Create new user**, with **Auto Confirm User** checked.
- **Sign In / Providers:** **Allow new users to sign up** is off, so nobody else can create an account.
- **URL Configuration:** **Site URL** is `https://marcom-marekb.github.io/marcom-cadence/`, and `http://localhost:3100` is in **Redirect URLs**.

The app signs in with email and password. `supabase-js` keeps the session in browser storage and refreshes the token, so the login form appears only after signing out or when the session expires.

## Database changes

All tables live in the `marcom_cadence` schema. Schema changes are SQL files in `supabase/migrations/`, named `<timestamp>_<description>.sql`, the naming the Supabase CLI uses.

The **Supabase GitHub integration** applies them: the project is connected to the `MARCOM-MarekB/marcom-cadence` repository with working directory `.` (the folder that contains `supabase/`) and production branch `main`. It runs on the Free plan; preview branches per pull request would need the Pro plan and are not used. On every push to `main`, Supabase runs the migration files it has not run yet, in name order, and records them in `supabase_migrations.schema_migrations`. This is the equivalent of `dotnet ef database update` in a deployment pipeline. Applied migrations and integration runs are visible in the dashboard.

An applied file is never edited; a later change is a new file with a later timestamp.

| Migration | Contents |
|---|---|
| `20261108000000_create_measurements.sql` | `marcom_cadence` schema with usage for `authenticated`; `measurements` table with one row per date and time, one column per body measurement, unique per user, date and time, and an owner-only policy |

## Tables

| Table | Purpose |
|---|---|
| `marcom_cadence.measurements` | Body measurements. `user_id` is set to the signed-in user, and the policy rejects any other value. |
