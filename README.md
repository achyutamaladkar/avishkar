# OrbitView

**OrbitView** is a beginner-friendly astronomy dashboard and installable Progressive Web App (PWA) that helps stargazers find upcoming likely-visible passes of the International Space Station (and other bright spacecraft), inspect each pass's arc across the sky, and plan to watch it with calendar exports or browser reminders.

## What Problem It Solves

Standard orbit trackers often show every overhead pass—even passes that happen in bright daylight, skim behind buildings near the horizon, or cross Earth's shadow unlit. OrbitView filters passes for:

1. **Observer darkness** — Sun at least 6° below the local horizon (civil/nautical/astronomical twilight).
2. **Spacecraft illumination** — Satellite outside Earth's cylindrical shadow (sunlit).
3. **Minimum elevation** — Peak elevation at or above the observer's chosen horizon clearance threshold (default `10°`).

All results are clearly labeled as predictions, since clouds, haze, trees, buildings, and light pollution can still affect real-world visibility.

## Features

- **Location & Viewing Preferences**: City search (live Open-Meteo geocoding with built-in offline city fallback), pasted `"lat, lon"` parsing, manual latitude/longitude/elevation inputs, IANA timezone selector, minimum elevation slider, and opt-in browser geolocation (`Use my location`).
- **Real SGP4 Pass Predictions**: Fetches live Two-Line Element (TLE) orbital data from **CelesTrak** and runs SGP4 propagation via `satellite.js`.
- **Responsible Caching & Honest Fallback**: Caches live TLEs in `localStorage` for 2 hours and displays source, refresh age, and TLE epoch. If live fetch fails, OrbitView shows an explicit error and offers a clearly badged **Demo Mode (Sample TLE)** rather than silently substituting sample results.
- **Interactive Sky-Track Radar**: Polar sky-dome plot (`N`/`E`/`S`/`W` compass bearings, `30°`/`60°` rings, minimum elevation ring) distinguishing the bright sunlit visible arc from shadowed/low segments, with an interactive timeline scrubber and Play/Pause simulation.
- **Reminders & Calendar Export**: Downloads a standard `.ics` calendar file with a `VALARM` reminder (works even when browser notifications are unavailable) plus optional, permission-gated browser notifications with clear explanation of their lifecycle limits.
- **Installable PWA**: Responsive dark-navy UI designed for desktop and mobile, complete with Web App Manifest and app-shell Service Worker.

## Running Locally

### Prerequisites

- Node.js 20+ and npm 10+

### Commands

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run unit tests (SGP4 pass prediction, validation, .ics export)
npm test

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

## Demonstrating the Main Flow

1. Launch `npm run dev` and open the local URL printed by Vite.
2. Choose a city (e.g., **Bengaluru**, **London**, **San Francisco**), click **Use my location**, or enter custom coordinates and time zone.
3. Adjust **Minimum satellite elevation** (e.g., `15°`) and click **Find passes**.
4. Review the **Orbit Data Status** bar showing `LIVE SGP4 PREDICTIONS`, CelesTrak source, last-refreshed time, and TLE epoch. *(If offline, click **Open Demo Mode (Sample TLE)** to explore the full UI with clearly labeled archived sample orbital elements.)*
5. Click any upcoming pass card to inspect its **Sky-Track Radar**, scrub or play through the pass arc, read the visibility/darkness/illumination breakdown, and click **Download .ics Calendar Event** or **Notify Me in Browser**.

## Orbit Data Source & Limitations

- **Orbit data**: Public GP/TLE data from [CelesTrak](https://celestrak.org/) (`https://celestrak.org/NORAD/elements/gp.php?CATNR=<id>&FORMAT=TLE`), cached locally for 2 hours.
- **City geocoding**: [Open-Meteo Geocoding API](https://open-meteo.com/) with a built-in curated city fallback for offline use.
- **Known limitations**:
  - SGP4 predictions gradually lose timing accuracy as a TLE ages (refresh TLE if more than a few days old; ISS performs periodic reboost maneuvers).
  - Visibility filtering checks geometric Sun elevation (`<= -6°`), cylindrical Earth umbra, and minimum elevation, but does not query live cloud-cover forecasts, terrain/building obstructions, or visual magnitude/brightness curves.
  - Browser notifications require the browser/app to remain active (or supported by the OS push/service-worker lifecycle); `.ics` calendar export is recommended for reliable device alarms.
