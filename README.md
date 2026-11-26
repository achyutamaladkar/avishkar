# OrbitView

**OrbitView** is a satellite pass predictor, 3D orbit visualizer, and installable Progressive Web App (PWA) that calculates upcoming likely-visible passes of the International Space Station (and other spacecraft) from live orbital and geocoding data, guides you in the sky, and helps beginners prepare with a built-in **Telescope & Observing Guide**.

## Live Data Architecture

OrbitView operates strictly on real orbital and geocoding data with zero demo/sample pass fallback:

1. **City Coordinates — Open-Meteo Geocoding API**:
   - Searches live cities via Open-Meteo Geocoding (`https://geocoding-api.open-meteo.com/v1/search`).
   - Obtains and applies exact latitude, longitude, elevation, and time zone when you select a result.
   - Shows loading, empty, and connection error states without substituting preset coordinates.
2. **Satellite Orbit & Pass Predictions — CelesTrak + satellite.js 6.0.2**:
   - Fetches current General Perturbations (GP) OMM JSON orbit data directly from CelesTrak (`https://celestrak.org/NORAD/elements/gp.php?CATNR=<id>&FORMAT=JSON`).
   - Initializes orbital elements with `satellite.json2satrec` and propagates passes using SGP4 starting from the current date and time.
   - Displays orbit source, fetch timestamp, element epoch, and age.
   - If CelesTrak or orbital calculation fails, a clear "Data unavailable" message is shown.

## Setup and Running

### Prerequisites

- Node.js 20+ and npm 10+

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open the printed URL (typically `http://localhost:5173/`).

### 3. Run Tests & Production Build

```bash
# Run unit & calculation tests
npm test

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

## Main User Flow

1. **Sign In**: Enter your name, Gmail address, and password on the login screen.
2. **Search a City**: Type any city (e.g. *Tokyo*, *London*, *San Francisco*, *Bengaluru*) into the search field and select a result from the Open-Meteo suggestions.
3. **Inspect Predicted Passes & 3D Orbit**:
   - Review upcoming likely-visible passes with rise, peak elevation, compass direction, and end time.
   - Click any pass to inspect its sky path on the **Sky-Track Radar** and its predicted ground track on the **3D Orbit View**.
4. **Use Find in Sky & Calendar Export**: Launch **Find in Sky** for live compass/tilt guidance on supported mobile browsers, or download an `.ics` calendar reminder.
5. **Prepare with the Telescope & Observing Guide**:
   - Choose your setup (Naked-Eye, Binoculars, Refractor, Newtonian/Dobsonian, Maksutov/SCT, or GoTo/Satellite-Tracking).
   - Review the pass-specific checklist (when to be ready, which direction to face, and how to read the Sky-Track Radar), parts diagrams, setup sequence, common mistakes, and solar safety warning.
6. **Save to My Journal**: Log your observation notes, equipment, and sky conditions in **My Journal**.
