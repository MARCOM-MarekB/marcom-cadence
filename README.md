# marcom-cadence

Personal app for planning fasting and eating windows, following a diet and tracking training.

Plain HTML, CSS and JavaScript with no build step, hosted on GitHub Pages. Personal data lives in Supabase behind login, never in this public repository.

## Run locally

JavaScript modules do not load from `file://`, so serve the folder over HTTP:

```
npm start
```

The app runs at http://localhost:3100. Stop it with `Ctrl+C`.

## Deploy

In the repository settings, open **Pages** and select **Deploy from a branch**, branch `main`, folder `/ (root)`. Every push to `main` then publishes the site at:

https://marcom-marekb.github.io/marcom-cadence/

## Documentation

- [Overview](docs/overview.md)
- [Overview (Polish)](docs/overview_pl.html)
- [Supabase](docs/supabase.md)
- [Supabase (Polish)](docs/supabase_pl.html)
- [Supabase setup](docs/supabase-setup.md)
- [Supabase setup (Polish)](docs/supabase-setup_pl.html)

## Licence

No licence has been granted. All rights reserved.
