# Overview

marcom-cadence is a personal app for fasting and eating windows, a diet plan and training tracking.

## Current state

The app has one screen:

- current status: fasting or eating, and the time until that changes,
- the next training,
- one bar showing the whole week,
- the list of fasting and eating periods.

The weekly schedule is fixed in code. There is no login or saved data yet.

## Structure

| Path | Purpose |
|---|---|
| `index.html` | Page markup |
| `css/app.css` | Styles, including light and dark themes |
| `js/schedule.js` | Weekly schedule and pure time calculations |
| `js/app.js` | Rendering and the once-a-minute refresh |
| `.nojekyll` | Tells GitHub Pages to publish the files as they are |

## Technical decisions

- Plain HTML, CSS and JavaScript modules, with no build step.
- All URLs are relative, because the site is served from `/marcom-cadence/`.
- Schedule times are hours counted from Monday 00:00, in the viewer's local time. A period may wrap past the end of the week.

## Data and privacy

The repository and the site are public. Only code and generic content belong here. Personal data such as weight, logs and measurements will be stored in Supabase behind login, with Row Level Security on every table.

## Running and deployment

See the [README](../README.md).
