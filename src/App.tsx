import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Download, Orbit, Telescope } from 'lucide-react';
import { DataSourceBar } from './components/DataSourceBar';
import { LiveOrbitTracker } from './components/LiveOrbitTracker';
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
  OrbitDataset,
  PredictionResult,
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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function App() {
  const [location, setLocation] = useState<ObserverLocation>(INITIAL_LOCATION);
  const [preferences, setPreferences] = useState<ViewingPreferences>(INITIAL_PREFERENCES);
  const [satelliteId, setSatelliteId] = useState<string>(DEFAULT_SATELLITE_ID);

  const [tle, setTle] = useState<OrbitDataset | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [propagationError, setPropagationError] = useState<string | null>(null);
  const [cachedFallbackTle, setCachedFallbackTle] = useState<OrbitDataset | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const skyPlotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const computeAndApply = useCallback(
    (
      activeDataset: OrbitDataset,
      nextLoc: ObserverLocation,
      nextPrefs: ViewingPreferences,
    ) => {
      try {
        const result = predictPasses(activeDataset, nextLoc, nextPrefs, Date.now());
        setPropagationError(null);
        setPrediction(result);
        setSelectedPassId((prev) =>
          prev && result.passes.some((p) => p.id === prev)
            ? prev
            : result.passes[0]?.id ?? null,
        );
      } catch (err) {
        setPrediction(null);
        setSelectedPassId(null);
        setPropagationError(
          err instanceof Error
            ? err.message
            : 'SGP4 orbital propagation failed for these orbital elements.',
        );
      }
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
      setPropagationError(null);
      setCachedFallbackTle(null);

      try {
        const liveDataset = await fetchLiveTle(nextSatId, { forceRefresh });
        setTle(liveDataset);
        computeAndApply(liveDataset, nextLoc, nextPrefs);
      } catch (err) {
        const fetchErr = err as TleFetchError;
        setErrorMessage(
          fetchErr.message ||
            'Could not fetch live OMM orbit data from CelesTrak. Check your network connection or switch to Demo Mode.',
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

  const handleSelectPass = (passId: string) => {
    setSelectedPassId(passId);
    if (window.innerWidth <= 900 && skyPlotRef.current) {
      window.setTimeout(() => {
        skyPlotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  };

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
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
        <div className="header-actions">
          {installPrompt && (
            <button
              type="button"
              className="btn btn-secondary btn-compact"
              onClick={() => void handleInstallApp()}
            >
              <Download size={14} aria-hidden="true" />
              <span>Install App</span>
            </button>
          )}
          <div className="header-location-pill">
            <Telescope size={15} aria-hidden="true" />
            <span>
              {location.name} · {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
            </span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <DataSourceBar
          tle={tle}
          isLoading={isLoading}
          onRefreshLive={() => void runLivePrediction(location, preferences, satelliteId, true)}
          onEnterDemo={handleActivateDemo}
          onExitDemo={() => void runLivePrediction(location, preferences, satelliteId, true)}
        />

        <LiveOrbitTracker dataset={tle} location={location} />

        {propagationError && (
          <section className="error-banner" role="alert">
            <div className="error-banner-body">
              <AlertCircle size={20} aria-hidden="true" />
              <div>
                <strong>Orbital propagation error</strong>
                <p>{propagationError}</p>
              </div>
            </div>
            <div className="error-banner-actions">
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                onClick={() => void runLivePrediction(location, preferences, satelliteId, true)}
              >
                Refresh Orbit Data
              </button>
            </div>
          </section>
        )}

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
                  Use Stale Cached Data
                </button>
              )}
              <button
                type="button"
                className="btn btn-demo btn-compact"
                onClick={handleActivateDemo}
              >
                Open Demo Mode (Sample Data)
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
              <div className="loading-stack" aria-busy="true">
                <div className="panel loading-panel">
                  <div className="spinner" aria-hidden="true" />
                  <div>
                    <h3>Fetching orbit elements &amp; calculating passes…</h3>
                    <p className="muted">
                      Running SGP4 propagation and solar illumination checks for {location.name}.
                    </p>
                  </div>
                </div>
                <div className="skeleton-grid" aria-hidden="true">
                  <div className="skeleton-card" />
                  <div className="skeleton-card" />
                </div>
              </div>
            )}

            {!isLoading && prediction && (
              <PassList
                passes={prediction.passes}
                stats={prediction.stats}
                selectedPassId={selectedPassId}
                locationName={location.name}
                timezone={location.timezone}
                minElevationDeg={preferences.minElevationDeg}
                searchStartMs={prediction.searchStartMs}
                lookaheadDays={prediction.lookaheadDays}
                isDemo={Boolean(tle?.isDemo)}
                onSelectPass={handleSelectPass}
              />
            )}

            {!isLoading && selectedPass && (
              <div ref={skyPlotRef} className="selected-pass-stack">
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
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>
          OrbitView computes predictions locally in your browser using SGP4 orbital propagation (
          <code>satellite.js</code> <code>json2satrec</code>) and public OMM JSON data from
          CelesTrak. Visibility depends on local skies and obstructions.
        </p>
      </footer>
    </div>
  );
}

export default App;
