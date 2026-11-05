# Overview

marcom-cadence is a personal app for fasting and eating windows, a diet plan and training tracking.

## Current state

The app has a navigation menu with four views:

- **Today:** current status (fasting or eating), the time until that changes, and the next training.
- **Week:** one bar showing the whole week and the list of fasting and eating periods.
- **Diet:** placeholder for the meal plan.
- **Training:** placeholder for the training log.

The header also switches between light and dark mode and between English and Polish. Both choices are remembered in the browser. Without a saved choice, the app follows the system theme and the browser language.

The weekly schedule is fixed in code. There is no login or saved personal data yet.

## Structure

| Path | Purpose |
|---|---|
| `index.html` | Page markup and all views |
| `css/app.css` | Styles, including light and dark themes |
| `i18n/*.json` | Interface texts, one file per language |
| `js/app.js` | Rendering, navigation and the once-a-minute refresh |
| `js/i18n.js` | Language loading and translation lookup |
| `js/schedule.js` | Weekly schedule and pure time calculations |
| `js/theme.js` | Theme switching |
| `js/theme-init.js` | Applies the saved theme before the page is drawn |
| `.nojekyll` | Tells GitHub Pages to publish the files as they are |
| `package.json` | `npm start` for local serving on port 3100; the app itself has no dependencies |

## Technical decisions

- Plain HTML, CSS and JavaScript modules, with no build step.
- All URLs are relative, because the site is served from `/marcom-cadence/`.
- Navigation uses the address hash (`#today`, `#week`, `#diet`, `#training`), which works on GitHub Pages without server rules.
- Translated texts in `index.html` use the `data-i18n` attribute. Every language file must contain the same keys.
- Schedule times are hours counted from Monday 00:00, in the viewer's local time. A period may wrap past the end of the week.

## Data and privacy

The repository and the site are public. Only code and generic content belong here. Personal data such as weight, logs and measurements will be stored in Supabase behind login, with Row Level Security on every table. Browser storage holds only the theme and language.

## Running and deployment

See the [README](../README.md).
