import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Orbit, Telescope } from 'lucide-react';
import { DataSourceBar } from './components/DataSourceBar';
import { LocationForm } from './components/LocationForm';
import { PassDetails } from './components/PassDetails';
import { PassList } from './components/PassList';
import { ReminderActions } from './components/ReminderActions';
import { SkyTrackPlot } from './components/SkyTrackPlot';
import { CITY_PRESETS, DEFAULT_SATELLITE_ID } from './data/cities';
import { predictPasses } from './services/passPredictor';
import { fetchLiveTle, getDemoTleDataset, TleFetchError } from './services/tleService';
import {
  ObserverLocation,
  PredictionResult,
  TleDataset,
  ViewingPreferences,
} from './types/orbit';

const DEFAULT_CITY = CITY_PRESETS[0];

const INITIAL_LOCATION: ObserverLocation = {
  name: `${DEFAULT_CITY.name}, ${DEFAULT_CITY.country}`,
  latitude: DEFAULT_CITY.latitude,
  longitude: DEFAULT_CITY.longitude,
  elevationM: DEFAULT_CITY.elevationM,
  timezone: DEFAULT_CITY.timezone,
};

const INITIAL_PREFERENCES: ViewingPreferences = {
  minElevationDeg: 10,
  lookaheadDays: 7,
  darknessThresholdDeg: -6,
};

export function App() {
  const [location, setLocation] = useState<ObserverLocation>(INITIAL_LOCATION);
  const [preferences, setPreferences] = useState<ViewingPreferences>(INITIAL_PREFERENCES);
  const [satelliteId, setSatelliteId] = useState<string>(DEFAULT_SATELLITE_ID);

  const [tle, setTle] = useState<TleDataset | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cachedFallbackTle, setCachedFallbackTle] = useState<TleDataset | null>(null);

  const computeAndApply = useCallback(
    (
      activeTle: TleDataset,
      nextLoc: ObserverLocation,
      nextPrefs: ViewingPreferences,
    ) => {
      const result = predictPasses(activeTle, nextLoc, nextPrefs);
      setPrediction(result);
      setSelectedPassId((prev) =>
        prev && result.passes.some((p) => p.id === prev)
          ? prev
          : result.passes[0]?.id ?? null,
      );
    },
    [],
  );

  const runLivePrediction = useCallback(
    async (
      nextLoc: ObserverLocation,
      nextPrefs: ViewingPreferences,
      nextSatId: string,
      forceRefresh = false,
    ) => {
      setIsLoading(true);
      setErrorMessage(null);
      setCachedFallbackTle(null);

      try {
        const liveTle = await fetchLiveTle(nextSatId, { forceRefresh });
        setTle(liveTle);
        computeAndApply(liveTle, nextLoc, nextPrefs);
      } catch (err) {
        const fetchErr = err as TleFetchError;
        setErrorMessage(
          fetchErr.message ||
            'Could not fetch live TLE orbit data from CelesTrak. Check your network connection or switch to Demo Mode.',
        );
        if (fetchErr.cachedFallback) {
          setCachedFallbackTle(fetchErr.cachedFallback);
        }
        setPrediction(null);
        setTle(null);
      } finally {
        setIsLoading(false);
      }
    },
    [computeAndApply],
  );

  useEffect(() => {
    void runLivePrediction(INITIAL_LOCATION, INITIAL_PREFERENCES, DEFAULT_SATELLITE_ID, false);
  }, [runLivePrediction]);

  const handleSearchSubmit = (next: {
    location: ObserverLocation;
    preferences: ViewingPreferences;
    satelliteId: string;
  }) => {
    setLocation(next.location);
    setPreferences(next.preferences);
    setSatelliteId(next.satelliteId);

    if (tle?.isDemo && next.satelliteId === tle.noradId) {
      computeAndApply(tle, next.location, next.preferences);
      return;
    }

    if (tle?.isDemo) {
      const demo = getDemoTleDataset(next.satelliteId);
      setTle(demo);
      computeAndApply(demo, next.location, next.preferences);
      return;
    }

    void runLivePrediction(next.location, next.preferences, next.satelliteId, false);
  };

  const handleActivateDemo = () => {
    const demo = getDemoTleDataset(satelliteId);
    setErrorMessage(null);
    setCachedFallbackTle(null);
    setTle(demo);
    computeAndApply(demo, location, preferences);
  };

  const handleUseCachedLive = () => {
    if (!cachedFallbackTle) return;
    setErrorMessage(null);
    setTle(cachedFallbackTle);
    computeAndApply(cachedFallbackTle, location, preferences);
    setCachedFallbackTle(null);
  };

  const selectedPass = useMemo(
    () => prediction?.passes.find((p) => p.id === selectedPassId) ?? null,
    [prediction, selectedPassId],
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Orbit size={24} />
          </div>
          <div>
            <h1>OrbitView</h1>
            <p className="brand-subtitle">
              Real-time SGP4 satellite pass predictor &amp; sky-track planner
            </p>
          </div>
        </div>
        <div className="header-location-pill">
          <Telescope size={15} aria-hidden="true" />
          <span>
            {location.name} · {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
          </span>
        </div>
      </header>

      <main className="main-content">
        <DataSourceBar
          tle={tle}
          isLoading={isLoading}
          onRefreshLive={() => void runLivePrediction(location, preferences, satelliteId, true)}
          onExitDemo={() => void runLivePrediction(location, preferences, satelliteId, true)}
        />

        {errorMessage && (
          <section className="error-banner" role="alert">
            <div className="error-banner-body">
              <AlertCircle size={20} aria-hidden="true" />
              <div>
                <strong>Live orbit data unavailable</strong>
                <p>{errorMessage}</p>
              </div>
            </div>
            <div className="error-banner-actions">
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                onClick={() => void runLivePrediction(location, preferences, satelliteId, true)}
              >
                Retry Live Fetch
              </button>
              {cachedFallbackTle && (
                <button
                  type="button"
                  className="btn btn-secondary btn-compact"
                  onClick={handleUseCachedLive}
                >
                  Use Stale Cached TLE
                </button>
              )}
              <button
                type="button"
                className="btn btn-demo btn-compact"
                onClick={handleActivateDemo}
              >
                Open Demo Mode (Sample TLE)
              </button>
            </div>
          </section>
        )}

        <div className="workspace-grid">
          <div className="workspace-left">
            <LocationForm
              location={location}
              preferences={preferences}
              satelliteId={satelliteId}
              isLoading={isLoading}
              onSubmit={handleSearchSubmit}
            />
          </div>

          <div className="workspace-right">
            {isLoading && (
              <div className="panel loading-panel" aria-busy="true">
                <div className="spinner" aria-hidden="true" />
                <div>
                  <h3>Fetching orbit elements &amp; calculating passes…</h3>
                  <p className="muted">
                    Running SGP4 propagation and solar illumination checks for {location.name}.
                  </p>
                </div>
              </div>
            )}

            {!isLoading && prediction && (
              <PassList
                passes={prediction.passes}
                stats={prediction.stats}
                selectedPassId={selectedPassId}
                timezone={location.timezone}
                minElevationDeg={preferences.minElevationDeg}
                isDemo={Boolean(tle?.isDemo)}
                onSelectPass={setSelectedPassId}
              />
            )}

            {!isLoading && selectedPass && (
              <>
                <SkyTrackPlot
                  pass={selectedPass}
                  timezone={location.timezone}
                  minElevationDeg={preferences.minElevationDeg}
                />
                <PassDetails pass={selectedPass} timezone={location.timezone} />
                <ReminderActions
                  pass={selectedPass}
                  location={location}
                  isDemo={Boolean(tle?.isDemo)}
                />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
