# marcom-cadence

Personal app for planning fasting and eating windows, following a diet and tracking training.

Plain HTML, CSS and JavaScript with no build step, hosted on GitHub Pages. Personal data will live in Supabase behind login, never in this public repository.

## Run locally

JavaScript modules do not load from `file://`, so serve the folder over HTTP:

```
npx serve .
```

## Deploy

In the repository settings, open **Pages** and select **Deploy from a branch**, branch `main`, folder `/ (root)`. Every push to `main` then publishes the site at:

https://marcom-marekb.github.io/marcom-cadence/

## Documentation

- [Overview](docs/overview.md)
- [Overview (Polish)](docs/overview_pl.md)

## Licence

No licence has been granted. All rights reserved.
