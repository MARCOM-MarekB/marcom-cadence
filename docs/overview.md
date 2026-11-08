# Overview

marcom-cadence is a personal app for fasting and eating windows, a diet plan and training tracking.

## Current state

The app opens with a login form (email and password of the Supabase account) and shows the views after sign-in. A button with an eye next to the password field shows the typed password in a fixed-width font, so similar characters such as I and l can be told apart. The session is kept in the browser, so the form appears again only after signing out with the header button or when the session expires. Signing out also ends the session on the server; when that request fails, for example on a phone that was offline, the session is still removed from the browser.

The app has a navigation menu with six views:

- **Today:** current status with progress, live countdowns to the end of the fast or the next fast, the next meal and the next training, the week timeline and today's meals with past and next meals marked. Clicking the next meal card opens the Diet view on that meal's day with its recipe expanded.
- **Week:** the week timeline and the list of fasting and eating periods. The current period is marked, and eating periods expand into an hour calendar of that period, one section per day.
- **Diet:** a day picker and the selected day as a calendar of hour rows, with meals, trainings, and fast starts and ends in their hours. Several empty hours in a row collapse into one short row, and a button shows all hours instead. The choice is remembered in the browser. Fasting and training hours are shaded, and the current hour is marked. Meals show estimated energy and macronutrients and an expandable recipe.
- **Shopping:** a shopping list for the next 1 to 14 days, counted from now and summed from the planned meals. It can be shown by category or as a flat list, sorted by default order or alphabetically, and switched from sushi to its replacement ingredients. Items can be ticked one by one or all at once, ticked items can be hidden, and the visible list can be copied or printed on A4. Spices are not included. Ticks last until the page is reloaded.
- **Training:** five tabs, and the open tab is remembered in the browser.
  - **Set timer:** exercise name, set time, rest and number of sets. Set time 0 means each set ends with a button. Phase changes play a sound and vibrate where supported, and the screen stays on while the timer runs. Settings are remembered in the browser.
  - **Log:** the workout log in Supabase, the 100 most recent workouts newest first. Each row sums up the workout, one line per exercise, with equal sets in a row counted, such as "RDL: 3×8+8 @ 60 kg" or "Back lever: Tuck 3×10 s". A new workout starts at today's training from the schedule, or at the current time when none is planned today. **Copy previous workout** opens a new workout with the exercises and sets of the most recent one, and **Copy** on a row does the same for that workout; the start is suggested again and max marks are cleared. In the form, exercises are added from the catalog, each with its sets; the set inputs follow the exercise: repetitions (per side when the exercise counts per side), weight, added weight and band, or hold time, plus the progression when the exercise has any and a max mark. **+ set** adds a copy of the last set. Next to each set the form shows its share of the previous max of the same exercise and progression, the last max before the workout start. Sets with no values are left out when saving, and the whole workout is saved in one write.
  - **Maxes:** one card per exercise and progression with sets marked as a max: the latest max with its date and change from the max before, and the best one when it is not the latest. A card expands into the history of maxes, newest first, each with the sets of that exercise in its workout and their share of the max before that workout, so a ramp such as 8 sets from 50% up to a single at 100% or more can be read back. Load is the weight for weight exercises, and for bodyweight exercises the body weight from the last measurement before the workout (or the first one after, when there is none before) plus the added weight; sets with a band have no load and are not counted. Repetition exercises compare reps, hold exercises seconds. When a workout has several max sets for one exercise and progression, the highest counts. Maxes are read again after a workout is saved, deleted or imported and when the Training view opens.
  - **Exercises:** the exercise catalog in Supabase. Each exercise has a name and notes in English and Polish, shown in the interface language, or in the other language when that one is empty, how it is measured (repetitions, repetitions and weight, bodyweight with added weight or a band, or hold time), whether repetitions count per side, notes and progressions from easiest to hardest, such as tuck, advanced tuck and full back lever. A progression removed in the form stays stored as archived, so sets that used it keep its name. Progression names are also in both languages. An exercise used in a workout cannot be deleted, only archived; archived exercises are hidden unless the list shows them and cannot be added to a workout.
  - **Schedule:** the training days of the week with start time and duration, used by the timelines, the Today countdown, the Diet calendar and new workouts. Saving stores a version valid from today and keeps earlier versions; until one is saved, the built-in schedule (Monday 19:30 and Thursday 20:00, two hours each) is used.
  - Under the tabs, **Export JSON** downloads the exercises, workouts and schedule versions as one file, and **Import JSON** writes such a file into the account after showing what it holds. Records with the same id, or schedules with the same start date, are replaced; everything else stays.
- **Measurements:** a cartoon figure with measuring points and latest values, a form for saving measurements with date and time, changes since the first entry, and history. Measurements are saved in Supabase. Saving the same date and time again merges the values. Entries left in browser storage by the earlier browser-only version are moved to the account on start and then removed from the browser.

The week timeline is one bar for the whole week. Dashed lines mark each midnight, and a line labelled Now marks the current day and time.

The header also switches between light and dark mode and between English and Polish. Both choices are remembered in the browser. Without a saved choice, the app follows the system theme and the browser language.

The fasting periods and the meal plan are fixed in code.

## Structure

| Path | Purpose |
|---|---|
| `index.html` | Page markup and all views |
| `css/app.css` | Styles, including light and dark themes |
| `img/figure.png` | Anime-style figure used in the Measurements view |
| `img/mascot.svg` | Cartoon figure, not used yet |
| `favicon.svg` | App icon, in the style of the Marcom logo (white letter on a teal circle) |
| `i18n/*.json` | Interface texts, one file per language |
| `js/app.js` | Rendering, navigation and the once-a-second refresh |
| `js/diet.js` | Products, meals with values and ingredients, weekly plan, totals and shopping list calculation; names and recipe steps are in `i18n/*.json` |
| `js/set-timer.js` | Set timer logic, based on end times so background delays are caught up |
| `js/set-timer-view.js` | Set timer form, sound, screen wake lock and rendering |
| `js/supabase.js` | Supabase client: project URL, publishable key and the `marcom_cadence` schema |
| `js/auth-view.js` | Login form shown before the app, and signing out |
| `js/measurements.js` | Reading, saving and deleting measurements in Supabase, moving old browser entries, and calculations |
| `js/measurements-view.js` | Rendering and the form of the Measurements view |
| `js/exercises.js` | Reading, saving and deleting exercises in Supabase |
| `js/exercises-view.js` | Exercise catalog list and form in the Training view |
| `js/workouts.js` | Reading, saving and deleting workouts in Supabase, and reading every workout with a max set |
| `js/workouts-view.js` | Workout log list and form |
| `js/maxes.js` | Max calculations: set load, body weight at a moment, max history and percentages |
| `js/maxes-view.js` | Maxes tab; reads the max workouts and body weights and gives the workout form the previous max |
| `js/training-schedule.js` | Reading and saving training schedule versions, and the built-in schedule |
| `js/training-schedule-view.js` | Schedule form; applies the schedule in use to the whole app |
| `js/training-transfer.js` | Export and import of the training log as JSON |
| `js/training-transfer-view.js` | Export and import buttons |
| `js/dates.js` | Local date and time formatting for inputs and date columns |
| `js/training-tabs.js` | Tabs of the Training view |
| `js/i18n.js` | Language loading, translation lookup, and user texts stored in every language |
| `js/schedule.js` | Fasting periods, the training sessions in use and pure time calculations |
| `js/theme.js` | Theme switching |
| `js/theme-init.js` | Applies the saved theme before the page is drawn |
| `supabase/migrations/*.sql` | Database schema in Supabase, applied by the Supabase GitHub integration on push to `main`; see [Supabase](supabase.md) |
| `.nojekyll` | Tells GitHub Pages to publish the files as they are |
| `package.json` | `npm start` for local serving on port 3100; the app itself has no npm dependencies |

## Technical decisions

- Plain HTML, CSS and JavaScript modules, with no build step.
- All URLs are relative, because the site is served from `/marcom-cadence/`.
- Navigation uses the address hash (`#today`, `#week`, `#diet`, `#shopping`, `#training`, `#measurements`), which works on GitHub Pages without server rules.
- Meal ingredients are structured data, so recipes and the shopping list use one source.
- Translated texts in `index.html` use the `data-i18n` attribute. Every language file must contain the same keys.
- Texts the user writes into the database, such as exercise and progression names, are stored in every language as `{"en": "...", "pl": "..."}`. A plain string reads as the same text in every language. Free notes of a workout are stored as written, in one language.
- Schedule times are hours counted from Monday 00:00, in the viewer's local time. A period may wrap past the end of the week.
- The Supabase client library (`supabase-js`) is loaded as a module from the jsDelivr CDN with a pinned version, so there is still no build step or `node_modules`.

## Data and privacy

The repository and the site are public. Only code and generic content belong here. Personal data, currently the measurements, the exercise catalog, the workouts and the training schedule, lives in Supabase behind login, with Row Level Security on every table; setup and rules are in [Supabase](supabase.md). Browser storage holds the login session, the theme, language and hour display choice, the set timer settings and the open Training tab.

## Debugging

`npm start` serves the source files as they are, so the browser runs exactly the code in the repository. Breakpoints can be set in the browser developer tools (F12, Sources), or in VS Code with a launch configuration of type `msedge` or `chrome` pointing at `http://localhost:3100` while `npm start` is running. A local run uses the same Supabase project and data as the published site.

## Running and deployment

See the [README](../README.md).
