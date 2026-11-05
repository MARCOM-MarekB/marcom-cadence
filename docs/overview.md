# Overview

marcom-cadence is a personal app for fasting and eating windows, a diet plan and training tracking.

## Current state

The app has a navigation menu with six views:

- **Today:** current status with progress, live countdowns to the end of the fast or the next fast, the next meal and the next training, the week timeline and today's meals with past and next meals marked.
- **Week:** the week timeline and the list of fasting and eating periods.
- **Diet:** a day picker and the selected day as a calendar of hour rows, with meals, trainings, and fast starts and ends in their hours. Several empty hours in a row collapse into one short row, and a button shows all hours instead. The choice is remembered in the browser. Fasting and training hours are shaded, and the current hour is marked. Meals show estimated energy and macronutrients and an expandable recipe.
- **Shopping:** a shopping list for the next 1 to 14 days, counted from now, summed from the planned meals and grouped by category. Items can be ticked and the list can be copied. Spices are not included, and ticks are not saved.
- **Training:** placeholder for the training log.
- **Measurements:** a cartoon figure with measuring points and latest values, a form for saving measurements by date, changes since the first entry, and history. Saving the same date again merges the values.

The week timeline is one bar for the whole week. Dashed lines mark each midnight, and a line labelled Now marks the current day and time.

The header also switches between light and dark mode and between English and Polish. Both choices are remembered in the browser. Without a saved choice, the app follows the system theme and the browser language.

The weekly schedule and meal plan are fixed in code. There is no login or saved personal data yet.

## Structure

| Path | Purpose |
|---|---|
| `index.html` | Page markup and all views |
| `css/app.css` | Styles, including light and dark themes |
| `favicon.svg` | App icon, in the style of the Marcom logo (white letter on a teal circle) |
| `i18n/*.json` | Interface texts, one file per language |
| `js/app.js` | Rendering, navigation and the once-a-second refresh |
| `js/diet.js` | Products, meals with values and ingredients, weekly plan, totals and shopping list calculation; names and recipe steps are in `i18n/*.json` |
| `js/measurements.js` | Measurement list, browser storage and calculations |
| `js/measurements-view.js` | Rendering and the form of the Measurements view |
| `js/i18n.js` | Language loading and translation lookup |
| `js/schedule.js` | Weekly schedule and pure time calculations |
| `js/theme.js` | Theme switching |
| `js/theme-init.js` | Applies the saved theme before the page is drawn |
| `.nojekyll` | Tells GitHub Pages to publish the files as they are |
| `package.json` | `npm start` for local serving on port 3100; the app itself has no dependencies |

## Technical decisions

- Plain HTML, CSS and JavaScript modules, with no build step.
- All URLs are relative, because the site is served from `/marcom-cadence/`.
- Navigation uses the address hash (`#today`, `#week`, `#diet`, `#shopping`, `#training`, `#measurements`), which works on GitHub Pages without server rules.
- Meal ingredients are structured data, so recipes and the shopping list use one source.
- Translated texts in `index.html` use the `data-i18n` attribute. Every language file must contain the same keys.
- Schedule times are hours counted from Monday 00:00, in the viewer's local time. A period may wrap past the end of the week.

## Data and privacy

The repository and the site are public. Only code and generic content belong here. Measurements are currently kept in browser storage, so they stay on one device and are lost if site data is cleared. They will move to Supabase behind login, with Row Level Security on every table, together with other personal data. Browser storage also holds the theme, language and hour display choice.

## Running and deployment

See the [README](../README.md).
