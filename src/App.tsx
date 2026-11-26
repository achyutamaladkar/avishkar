import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Compass,
  Download,
  Home,
  LogOut,
  Orbit,
  Telescope,
  User,
} from 'lucide-react';
import { DataSourceBar } from './components/DataSourceBar';
import { FindInSky } from './components/FindInSky';
import { GlobeView } from './components/GlobeView';
import { JournalSection } from './components/JournalSection';
import { LiveOrbitTracker } from './components/LiveOrbitTracker';
import { LocationForm } from './components/LocationForm';
import { LoginPage, UserSession } from './components/LoginPage';
import { ObservingGuide } from './components/ObservingGuide';
import { PassDetails } from './components/PassDetails';
import { PassList } from './components/PassList';
import { ReminderActions } from './components/ReminderActions';
import { SkyTrackPlot } from './components/SkyTrackPlot';
import { DEFAULT_SATELLITE_ID } from './data/cities';
import {
  azimuthToCompass,
  formatDuration,
  formatPassDate,
  formatPassShortTime,
  predictPasses,
} from './services/passPredictor';
import { fetchLiveTle, TleFetchError } from './services/tleService';
import {
  ObserverLocation,
  OrbitDataset,
  PredictionResult,
  ViewingPreferences,
} from './types/orbit';

type AppSection = 'home' | 'passes' | 'sky' | 'guide' | 'journal';
type SkySubTab = 'radar' | 'globe' | 'find';

const INITIAL_LOCATION: ObserverLocation = {
  name: 'London, England, United Kingdom',
  latitude: 51.5072,
  longitude: -0.1276,
  elevationM: 11,
  timezone: 'Europe/London',
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

const USER_SESSION_KEY = 'orbitview.user.v1';

function loadUserSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(USER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserSession>;
    if (parsed && typeof parsed.name === 'string' && typeof parsed.gmail === 'string') {
      return {
        name: parsed.name,
        gmail: parsed.gmail,
        signedInAt: parsed.signedInAt ?? new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

const NAV_ITEMS: Array<{
  id: AppSection;
  label: string;
  shortLabel: string;
  icon: typeof Home;
}> = [
  { id: 'home', label: 'Home', shortLabel: 'Home', icon: Home },
  { id: 'passes', label: 'Passes', shortLabel: 'Passes', icon: Calendar },
  { id: 'sky', label: 'Sky Guide', shortLabel: 'Sky', icon: Compass },
  { id: 'guide', label: 'Telescope Guide', shortLabel: 'Scope', icon: Telescope },
  { id: 'journal', label: 'Journal', shortLabel: 'Journal', icon: BookOpen },
];

export function App() {
  const [user, setUser] = useState<UserSession | null>(() => loadUserSession());
  const [activeSection, setActiveSection] = useState<AppSection>('home');
  const [skySubTab, setSkySubTab] = useState<SkySubTab>('radar');
  const [showPassDetail, setShowPassDetail] = useState(false);

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
  const [journalTrigger, setJournalTrigger] = useState(0);

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleLogin = (nextUser: UserSession) => {
    try {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(nextUser));
    } catch {
      // Ignore storage errors cleanly
    }
    setUser(nextUser);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(USER_SESSION_KEY);
    } catch {
      // Ignore storage errors cleanly
    }
    setUser(null);
  };

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
            'Could not fetch live OMM orbit data from CelesTrak. Check your network connection.',
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

  const switchSection = (section: AppSection) => {
    setActiveSection(section);
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0;
    }
  };

  const handleSearchSubmit = (next: {
    location: ObserverLocation;
    preferences: ViewingPreferences;
    satelliteId: string;
  }) => {
    setLocation(next.location);
    setPreferences(next.preferences);
    setSatelliteId(next.satelliteId);
    setShowPassDetail(false);
    void runLivePrediction(next.location, next.preferences, next.satelliteId, false);
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
    setShowPassDetail(true);
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0;
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

  const nextPass = prediction?.passes[0] ?? null;

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

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
              Live SGP4 satellite pass predictor &amp; sky-track planner
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
              {location.name.split(',')[0]} · {location.latitude.toFixed(2)}°,{' '}
              {location.longitude.toFixed(2)}°
            </span>
          </div>
          <div className="header-user-pill" title={user.gmail}>
            <User size={15} aria-hidden="true" />
            <span>{user.name}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            onClick={handleLogout}
          >
            <LogOut size={14} aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      </header>

      <div className="app-layout">
        {/* Desktop Sidebar */}
        <aside className="app-sidebar" aria-label="Main navigation">
          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sidebar-nav-btn ${active ? 'sidebar-nav-active' : ''}`}
                  onClick={() => switchSection(item.id)}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.id === 'passes' && prediction && (
                    <span className="nav-count-pill">{prediction.passes.length}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="sidebar-status-card">
            <span className="metric-label">Active Location</span>
            <strong className="sidebar-loc-name">{location.name}</strong>
            <span className="sidebar-loc-coords">
              {location.latitude.toFixed(3)}°, {location.longitude.toFixed(3)}° · {location.timezone}
            </span>
            <span className="sidebar-data-tag">
              {tle ? `Orbit: ${tle.sourceName}` : isLoading ? 'Fetching orbit…' : 'Orbit unavailable'}
            </span>
          </div>
        </aside>

        {/* Independent Section Scroll Area */}
        <main ref={scrollAreaRef} className="section-scroll-area">
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
                  <strong>Data unavailable</strong>
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
              </div>
            </section>
          )}

          {/* SECTION 1: HOME */}
          {activeSection === 'home' && (
            <div className="section-stack">
              <DataSourceBar
                tle={tle}
                isLoading={isLoading}
                onRefreshLive={() => void runLivePrediction(location, preferences, satelliteId, true)}
              />

              <LiveOrbitTracker dataset={tle} location={location} />

              <div className="home-grid">
                <LocationForm
                  location={location}
                  preferences={preferences}
                  satelliteId={satelliteId}
                  isLoading={isLoading}
                  onSubmit={handleSearchSubmit}
                />

                <section className="panel next-pass-panel" aria-label="Next predicted pass">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Next Predicted Pass</p>
                      <h2>{nextPass ? nextPass.satelliteName : 'Upcoming Pass Summary'}</h2>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="loading-panel">
                      <div className="spinner" aria-hidden="true" />
                      <p className="muted">Calculating upcoming passes for {location.name}…</p>
                    </div>
                  ) : nextPass ? (
                    <div className="next-pass-body">
                      <div className="next-pass-time">
                        <span className="pass-date">
                          {formatPassDate(nextPass.startTimeMs, location.timezone)}
                        </span>
                        <strong>
                          {formatPassShortTime(nextPass.startTimeMs, location.timezone)} –{' '}
                          {formatPassShortTime(nextPass.endTimeMs, location.timezone)}
                        </strong>
                      </div>

                      <div className="pass-metrics">
                        <div>
                          <span className="metric-label">Peak elevation</span>
                          <strong className="metric-value">
                            {nextPass.maxElevationDeg.toFixed(0)}°{' '}
                            {azimuthToCompass(nextPass.peakAzimuthDeg)}
                          </strong>
                        </div>
                        <div>
                          <span className="metric-label">Duration</span>
                          <strong className="metric-value">
                            {formatDuration(nextPass.durationSec)}
                          </strong>
                        </div>
                        <div>
                          <span className="metric-label">Sky path</span>
                          <strong className="metric-value">
                            {azimuthToCompass(nextPass.startAzimuthDeg)} →{' '}
                            {azimuthToCompass(nextPass.endAzimuthDeg)}
                          </strong>
                        </div>
                      </div>

                      <div className="next-pass-actions">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            setSelectedPassId(nextPass.id);
                            setShowPassDetail(true);
                            switchSection('passes');
                          }}
                        >
                          <span>Inspect Pass Details</span>
                          <ArrowUpRight size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setSelectedPassId(nextPass.id);
                            switchSection('sky');
                          }}
                        >
                          <Compass size={16} aria-hidden="true" />
                          <span>Open Sky Guide</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="muted">
                      No likely-visible passes found in the current window. Adjust your elevation
                      slider or search window, or check the Passes tab.
                    </p>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* SECTION 2: PASSES */}
          {activeSection === 'passes' && (
            <div className="section-stack">
              {isLoading && (
                <div className="panel loading-panel" aria-busy="true">
                  <div className="spinner" aria-hidden="true" />
                  <div>
                    <h3>Fetching live orbit elements &amp; calculating passes…</h3>
                    <p className="muted">
                      Running SGP4 propagation and solar illumination checks for {location.name}.
                    </p>
                  </div>
                </div>
              )}

              {!isLoading && prediction && !showPassDetail && (
                <PassList
                  passes={prediction.passes}
                  stats={prediction.stats}
                  selectedPassId={selectedPassId}
                  locationName={location.name}
                  timezone={location.timezone}
                  minElevationDeg={preferences.minElevationDeg}
                  searchStartMs={prediction.searchStartMs}
                  lookaheadDays={prediction.lookaheadDays}
                  onSelectPass={handleSelectPass}
                />
              )}

              {!isLoading && selectedPass && showPassDetail && (
                <div className="selected-pass-stack">
                  <div className="back-bar">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowPassDetail(false)}
                    >
                      <ArrowLeft size={16} aria-hidden="true" />
                      <span>Back to Passes</span>
                    </button>
                    <div className="back-bar-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-compact"
                        onClick={() => {
                          setSkySubTab('find');
                          switchSection('sky');
                        }}
                      >
                        <Compass size={15} aria-hidden="true" />
                        <span>Find in Sky</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-compact"
                        onClick={() => {
                          setJournalTrigger((c) => c + 1);
                          switchSection('journal');
                        }}
                      >
                        <BookOpen size={15} aria-hidden="true" />
                        <span>Save Observation</span>
                      </button>
                    </div>
                  </div>

                  <PassDetails pass={selectedPass} timezone={location.timezone} />
                  <ReminderActions pass={selectedPass} location={location} />
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: SKY GUIDE */}
          {activeSection === 'sky' && (
            <div className="section-stack">
              {selectedPass ? (
                <>
                  <div className="sky-subtabs" role="tablist" aria-label="Sky guide views">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={skySubTab === 'radar'}
                      className={`guide-tab ${skySubTab === 'radar' ? 'guide-tab-active' : ''}`}
                      onClick={() => setSkySubTab('radar')}
                    >
                      Sky-Track Radar
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={skySubTab === 'globe'}
                      className={`guide-tab ${skySubTab === 'globe' ? 'guide-tab-active' : ''}`}
                      onClick={() => setSkySubTab('globe')}
                    >
                      3D Orbit View
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={skySubTab === 'find'}
                      className={`guide-tab ${skySubTab === 'find' ? 'guide-tab-active' : ''}`}
                      onClick={() => setSkySubTab('find')}
                    >
                      Find in Sky
                    </button>
                  </div>

                  {skySubTab === 'radar' && (
                    <SkyTrackPlot
                      pass={selectedPass}
                      timezone={location.timezone}
                      minElevationDeg={preferences.minElevationDeg}
                    />
                  )}

                  {skySubTab === 'globe' && tle && (
                    <GlobeView
                      pass={selectedPass}
                      dataset={tle}
                      location={location}
                      timezone={location.timezone}
                    />
                  )}

                  {skySubTab === 'find' && (
                    <FindInSky
                      pass={selectedPass}
                      location={location}
                      timezone={location.timezone}
                      embedded
                      onSaveObservation={() => {
                        setJournalTrigger((c) => c + 1);
                        switchSection('journal');
                      }}
                    />
                  )}
                </>
              ) : (
                <div className="panel empty-panel">
                  <h3>No pass selected</h3>
                  <p className="muted">
                    Choose a city on Home or select an upcoming pass in Passes to view the Sky-Track
                    Radar, 3D Orbit View, and Find in Sky guide.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => switchSection('passes')}
                  >
                    Go to Passes
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: TELESCOPE GUIDE */}
          {activeSection === 'guide' && (
            <div className="section-stack">
              <ObservingGuide
                selectedPass={selectedPass}
                timezone={location.timezone}
                locationName={location.name}
              />
            </div>
          )}

          {/* SECTION 5: JOURNAL */}
          {activeSection === 'journal' && (
            <div className="section-stack">
              <JournalSection
                pass={selectedPass}
                location={location}
                timezone={location.timezone}
                openCreateTrigger={journalTrigger}
              />
            </div>
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile section navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`bottom-nav-btn ${active ? 'bottom-nav-active' : ''}`}
              onClick={() => switchSection(item.id)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
