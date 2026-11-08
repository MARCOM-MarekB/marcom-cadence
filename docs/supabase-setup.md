# Supabase setup

Step-by-step setup that connects a Supabase project to this repository and to the app. Everything is done by clicking in the Supabase dashboard and on GitHub; no command line is needed. The resulting configuration is described in [Supabase](supabase.md).

## Before you start

| What | Where it is used |
|---|---|
| Supabase account | Logging in to the dashboard at supabase.com |
| Supabase project | Created with **New project**: region Central EU (Frankfurt), **Enable Data API** on, **Automatically expose new tables** off, **Enable automatic RLS** on |
| Database password | Set when the project is created. Kept in a password manager, never in the repository |
| Project URL and publishable key | **Project Settings**, **API Keys**. Both are written in `js/supabase.js` |

Three different accounts are involved:

| Account | Purpose | Where you sign in with it |
|---|---|---|
| Supabase account | Managing the project in the dashboard | supabase.com |
| Database password | Direct Postgres connection, for example from pgAdmin | Nowhere in the app |
| App user | You as a Cadence user; your data belongs to it through `user_id` | The Cadence login form |

## Step 1: create the app user

1. **Authentication**, **Users**.
2. **Add user**, **Create new user**.
3. Enter the email and a new password for signing in to Cadence.
4. Check **Auto Confirm User**, so no confirmation email is sent.
5. **Create user**.

Check: the user appears in the list with an email and a UID.

## Step 2: turn off sign-up

1. **Authentication**, **Sign In / Providers**.
2. Turn off **Allow new users to sign up**.
3. **Save changes**.
4. Leave the **Email** provider on.

Nobody else can create an account in the app now.

## Step 3: set the addresses

1. **Authentication**, **URL Configuration**.
2. **Site URL**: `https://marcom-marekb.github.io/marcom-cadence/`, then **Save changes**.
3. **Redirect URLs**: **Add URL**, `http://localhost:3100`, then **Save URLs**.

Signing in with a password does not use these addresses. Links in emails, such as a password reset, redirect only to addresses on this list.

## Step 4: push the code

Commit and push the repository to `main`. The integration in the next step reads the migration files from GitHub, not from your disk.

## Step 5: connect GitHub and run the migrations

1. **Project Settings**, **Integrations**, **GitHub**, **Connect**.
2. Authorize Supabase on GitHub and choose the `marcom-cadence` repository.
3. **Supabase directory**: `supabase`.
4. **Production branch**: `main`.
5. Turn on **Deploy to production**.
6. Save.

Supabase now runs every file from `supabase/migrations/` that has not run yet. If nothing happens, push any later commit to `main`.

If **Deploy to production** is not available, open **SQL Editor**, **New query**, paste the migration file and run it.

## Step 6: check the database

1. **Table Editor**.
2. Switch the schema in the list at the top left to `marcom_cadence`.
3. The `measurements` table is there.

## Step 7: expose the schema to the Data API

1. **Project Settings**, **Data API**.
2. Add `marcom_cadence` to **Exposed schemas**.
3. Save.

The schema list shows only schemas that already exist, so this step comes after the migration. Without it the app shows "Could not load measurements".

## Step 8: test the app

1. Run `npm start` in the repository folder and open `http://localhost:3100`.
2. Sign in with the app user from step 1.
3. Open **Measurements** and save a value.
4. In **Table Editor**, schema `marcom_cadence`, table `measurements`, the row appears with your UID in `user_id`.

The published site at `https://marcom-marekb.github.io/marcom-cadence/` uses the same project and data.

## Later database changes

A new file in `supabase/migrations/` pushed to `main` is run by the integration automatically. Steps 1 to 7 are not repeated. A new schema needs step 7 again.

## When something fails

| Symptom | Cause | Fix |
|---|---|---|
| "Wrong email or password" | Wrong password, or the user is not confirmed | Check the user in **Users**; reset the password there if needed |
| "Could not load measurements" | Schema not in **Exposed schemas**, or the migration did not run | Steps 6 and 7 |
| Error `permission denied for schema marcom_cadence` | The `grant` statements did not run | Check that the whole migration ran |
| The integration fails on `already exists` | The migration was also pasted into SQL Editor by hand | Drop the schema in SQL Editor (`drop schema marcom_cadence cascade;`, only while it holds no data) and push again |

Details of failed requests are in the browser developer tools (F12), **Network** tab, and in the dashboard under **Logs**.
