# Window

A personal intermittent-fasting app: a guided ramp from 16:8 to 20:4, a 24-hour dial for the current fast,
daily logging of active calories burned, steps, sleep and strength sessions, and weekly weigh-ins that
estimate your real deficit without food logging.

Installable PWA. Works offline. All data stays on the device (IndexedDB); use Settings > Export backup.

## The ramp

| Stage | Eating window   |
|-------|-----------------|
| 16:8  | 12:00 to 20:00  |
| 17:7  | 13:00 to 20:00  |
| 18:6  | 13:30 to 19:30  |
| 19:5  | 14:00 to 19:00  |
| 20:4  | 15:00 to 19:00  |

Each stage lasts at least 7 days. Hitting the target on 5 of 7 days unlocks the next stage; otherwise repeat the week.

## Develop

```bash
npm install
npm run dev
```

`npm run build` outputs a static site to `dist/`. Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.

## Install on Android

Open the Pages URL in Chrome, then menu > **Add to Home screen** (or the install prompt). Enable the evening
reminder in Settings to allow notifications.
