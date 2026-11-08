# Overview

marcom-cadence is a personal app for fasting and eating windows, a diet plan and training tracking.

## Current state

The app opens with a login form (email and password of the Supabase account) and shows the views after sign-in. The session is kept in the browser, so the form appears again only after signing out with the header button or when the session expires.

The app has a navigation menu with six views:

- **Today:** current status with progress, live countdowns to the end of the fast or the next fast, the next meal and the next training, the week timeline and today's meals with past and next meals marked. Clicking the next meal card opens the Diet view on that meal's day with its recipe expanded.
- **Week:** the week timeline and the list of fasting and eating periods. The current period is marked, and eating periods expand into an hour calendar of that period, one section per day.
- **Diet:** a day picker and the selected day as a calendar of hour rows, with meals, trainings, and fast starts and ends in their hours. Several empty hours in a row collapse into one short row, and a button shows all hours instead. The choice is remembered in the browser. Fasting and training hours are shaded, and the current hour is marked. Meals show estimated energy and macronutrients and an expandable recipe.
- **Shopping:** a shopping list for the next 1 to 14 days, counted from now and summed from the planned meals. It can be shown by category or as a flat list, sorted by default order or alphabetically, and switched from sushi to its replacement ingredients. Items can be ticked one by one or all at once, ticked items can be hidden, and the visible list can be copied or printed on A4. Spices are not included. Ticks last until the page is reloaded.
- **Training:** a set timer with exercise name, set time, rest and number of sets. Set time 0 means each set ends with a button. Phase changes play a sound and vibrate where supported, and the screen stays on while the timer runs. Settings are remembered in the browser. There is no training log yet.
- **Measurements:** a cartoon figure with measuring points and latest values, a form for saving measurements with date and time, changes since the first entry, and history. Measurements are saved in Supabase. Saving the same date and time again merges the values. Entries left in browser storage by the earlier browser-only version are moved to the account on start and then removed from the browser.

The week timeline is one bar for the whole week. Dashed lines mark each midnight, and a line labelled Now marks the current day and time.

The header also switches between light and dark mode and between English and Polish. Both choices are remembered in the browser. Without a saved choice, the app follows the system theme and the browser language.

The weekly schedule and meal plan are fixed in code.

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
| `js/i18n.js` | Language loading and translation lookup |
| `js/schedule.js` | Weekly schedule and pure time calculations |
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
- Schedule times are hours counted from Monday 00:00, in the viewer's local time. A period may wrap past the end of the week.
- The Supabase client library (`supabase-js`) is loaded as a module from the jsDelivr CDN with a pinned version, so there is still no build step or `node_modules`.

## Data and privacy

The repository and the site are public. Only code and generic content belong here. Personal data, currently the measurements, lives in Supabase behind login, with Row Level Security on every table; setup and rules are in [Supabase](supabase.md). Browser storage holds the login session, the theme, language and hour display choice, and the set timer settings.

## Debugging

`npm start` serves the source files as they are, so the browser runs exactly the code in the repository. Breakpoints can be set in the browser developer tools (F12, Sources), or in VS Code with a launch configuration of type `msedge` or `chrome` pointing at `http://localhost:3100` while `npm start` is running. A local run uses the same Supabase project and data as the published site.

## Running and deployment

See the [README](../README.md).
