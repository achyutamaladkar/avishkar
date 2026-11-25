import React, { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { azimuthToCompass, formatPassTime } from '../services/passPredictor';
import { PassPoint, SatellitePass } from '../types/orbit';

interface SkyTrackPlotProps {
  pass: SatellitePass;
  timezone: string;
  minElevationDeg: number;
}

const SIZE = 380;
const CENTER = SIZE / 2;
const RADIUS = 146;

function polarToSvg(azimuthDeg: number, elevationDeg: number): { x: number; y: number } {
  const clampedEl = Math.max(0, Math.min(90, elevationDeg));
  const r = ((90 - clampedEl) / 90) * RADIUS;
  const azRad = (azimuthDeg * Math.PI) / 180;
  return {
    x: CENTER + r * Math.sin(azRad),
    y: CENTER - r * Math.cos(azRad),
  };
}

function buildPolylinePoints(points: PassPoint[]): string {
  return points
    .map((pt) => {
      const { x, y } = polarToSvg(pt.azimuthDeg, pt.elevationDeg);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export const SkyTrackPlot: React.FC<SkyTrackPlotProps> = ({
  pass,
  timezone,
  minElevationDeg,
}) => {
  const trajectory = pass.trajectory;
  const peakIndex = useMemo(() => {
    let bestIdx = 0;
    let bestEl = -Infinity;
    trajectory.forEach((pt, idx) => {
      if (pt.isVisible && pt.elevationDeg > bestEl) {
        bestEl = pt.elevationDeg;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }, [trajectory]);

  const [activeIndex, setActiveIndex] = useState(peakIndex);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setActiveIndex(peakIndex);
    setIsPlaying(false);
  }, [pass.id, peakIndex]);

  useEffect(() => {
    if (!isPlaying || trajectory.length === 0) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => {
        if (prev >= trajectory.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 180);
    return () => clearInterval(timer);
  }, [isPlaying, trajectory.length]);

  const visibleSegments = useMemo(() => {
    const segments: PassPoint[][] = [];
    let current: PassPoint[] = [];
    for (const pt of trajectory) {
      if (pt.isVisible) {
        current.push(pt);
      } else if (current.length > 0) {
        segments.push(current);
        current = [];
      }
    }
    if (current.length > 0) segments.push(current);
    return segments;
  }, [trajectory]);

  const activePoint = trajectory[activeIndex] ?? trajectory[0];
  const visiblePoints = trajectory.filter((p) => p.isVisible);
  const visibleStart = visiblePoints[0];
  const visibleEnd = visiblePoints[visiblePoints.length - 1];
  const peakPoint = trajectory[peakIndex];

  const startCoord = visibleStart ? polarToSvg(visibleStart.azimuthDeg, visibleStart.elevationDeg) : null;
  const peakCoord = peakPoint ? polarToSvg(peakPoint.azimuthDeg, peakPoint.elevationDeg) : null;
  const endCoord = visibleEnd ? polarToSvg(visibleEnd.azimuthDeg, visibleEnd.elevationDeg) : null;
  const activeCoord = activePoint ? polarToSvg(activePoint.azimuthDeg, activePoint.elevationDeg) : null;

  const minElRadius = ((90 - minElevationDeg) / 90) * RADIUS;
  const fullPathStr = buildPolylinePoints(trajectory);

  const compassPoints = [
    { label: 'N', deg: 0, major: true },
    { label: 'NE', deg: 45, major: false },
    { label: 'E', deg: 90, major: true },
    { label: 'SE', deg: 135, major: false },
    { label: 'S', deg: 180, major: true },
    { label: 'SW', deg: 225, major: false },
    { label: 'W', deg: 270, major: true },
    { label: 'NW', deg: 315, major: false },
  ];

  return (
    <div className="panel sky-plot-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Step 3 · Sky-Track Radar</p>
          <h2>Where to look in the sky</h2>
        </div>
        <span className="filter-pill">N at top · Center = 90° zenith</span>
      </div>

      <div className="sky-plot-layout">
        <div className="sky-svg-wrap">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="sky-svg"
            role="img"
            aria-label={`Sky track plot for ${pass.satelliteName} peaking at ${pass.maxElevationDeg.toFixed(
              0,
            )} degrees ${azimuthToCompass(pass.peakAzimuthDeg)}`}
          >
            <defs>
              <radialGradient id="skyDomeGrad" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor="#162a57" />
                <stop offset="70%" stopColor="#0c1733" />
                <stop offset="100%" stopColor="#060c1d" />
              </radialGradient>
              <filter id="glowCyan" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Sky Dome */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="url(#skyDomeGrad)"
              stroke="rgba(148, 179, 255, 0.36)"
              strokeWidth="1.5"
            />

            {/* Elevation Rings (30° and 60°) */}
            {[30, 60].map((el) => {
              const r = ((90 - el) / 90) * RADIUS;
              return (
                <g key={el}>
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={r}
                    fill="none"
                    stroke="rgba(148, 179, 255, 0.16)"
                    strokeWidth="1"
                  />
                  <text
                    x={CENTER + 4}
                    y={CENTER - r + 12}
                    fill="rgba(182, 196, 230, 0.7)"
                    fontSize="10"
                  >
                    {el}°
                  </text>
                </g>
              );
            })}

            {/* Minimum Elevation Threshold Ring */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={minElRadius}
              fill="none"
              stroke="rgba(251, 191, 36, 0.42)"
              strokeDasharray="4 4"
              strokeWidth="1.2"
            />

            {/* Compass Axes */}
            {[0, 45, 90, 135].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const dx = RADIUS * Math.sin(rad);
              const dy = RADIUS * Math.cos(rad);
              return (
                <line
                  key={deg}
                  x1={CENTER - dx}
                  y1={CENTER + dy}
                  x2={CENTER + dx}
                  y2={CENTER - dy}
                  stroke="rgba(148, 179, 255, 0.13)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Zenith cross */}
            <circle cx={CENTER} cy={CENTER} r="2.5" fill="rgba(148, 179, 255, 0.45)" />

            {/* Compass Labels */}
            {compassPoints.map((cp) => {
              const rad = (cp.deg * Math.PI) / 180;
              const labelR = RADIUS + 18;
              const lx = CENTER + labelR * Math.sin(rad);
              const ly = CENTER - labelR * Math.cos(rad);
              return (
                <text
                  key={cp.label}
                  x={lx}
                  y={ly + 4}
                  textAnchor="middle"
                  fill={cp.major ? '#f1f5ff' : '#8496c2'}
                  fontSize={cp.major ? '13' : '10.5'}
                  fontWeight={cp.major ? '700' : '600'}
                >
                  {cp.label}
                </text>
              );
            })}

            {/* Full Horizon-to-Horizon Trajectory (dimmed/dashed) */}
            {fullPathStr && (
              <polyline
                points={fullPathStr}
                fill="none"
                stroke="rgba(148, 179, 255, 0.4)"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
            )}

            {/* Highlighted Likely-Visible Sunlit Trajectory */}
            {visibleSegments.map((seg, idx) => (
              <polyline
                key={idx}
                points={buildPolylinePoints(seg)}
                fill="none"
                stroke="#5eead4"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glowCyan)"
              />
            ))}

            {/* Start / Peak / End Markers */}
            {startCoord && (
              <g>
                <circle cx={startCoord.x} cy={startCoord.y} r="5.5" fill="#38bdf8" stroke="#060b18" strokeWidth="1.5" />
                <text
                  x={startCoord.x + 8}
                  y={startCoord.y - 6}
                  fill="#bae6fd"
                  fontSize="10.5"
                  fontWeight="700"
                >
                  Start
                </text>
              </g>
            )}

            {peakCoord && (
              <g>
                <circle cx={peakCoord.x} cy={peakCoord.y} r="5.5" fill="#fbbf24" stroke="#060b18" strokeWidth="1.5" />
                <text
                  x={peakCoord.x + 8}
                  y={peakCoord.y + 4}
                  fill="#fde68a"
                  fontSize="10.5"
                  fontWeight="700"
                >
                  Peak {pass.maxElevationDeg.toFixed(0)}°
                </text>
              </g>
            )}

            {endCoord && (
              <g>
                <circle cx={endCoord.x} cy={endCoord.y} r="5.5" fill="#fb7185" stroke="#060b18" strokeWidth="1.5" />
                <text
                  x={endCoord.x + 8}
                  y={endCoord.y + 12}
                  fill="#fecdd3"
                  fontSize="10.5"
                  fontWeight="700"
                >
                  End
                </text>
              </g>
            )}

            {/* Animated / Scrubbed Spacecraft Position */}
            {activeCoord && activePoint && (
              <g>
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r="10"
                  fill={activePoint.isVisible ? 'rgba(94, 234, 212, 0.25)' : 'rgba(148, 179, 255, 0.2)'}
                />
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r="5"
                  fill="#ffffff"
                  stroke={activePoint.isVisible ? '#2dd4bf' : '#94a3b8'}
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>

          <div className="sky-legend">
            <span>
              <i className="legend-line legend-visible" /> Likely visible (sunlit &amp; dark sky)
            </span>
            <span>
              <i className="legend-line legend-dim" /> Below {minElevationDeg}° or shadowed
            </span>
            <span>
              <i className="legend-line legend-min" /> {minElevationDeg}° min elevation ring
            </span>
          </div>
        </div>

        {/* Interactive Scrubber & Live Telemetry */}
        <div className="sky-scrubber-card">
          <div className="scrubber-top">
            <span className="eyebrow">Pass Playback</span>
            <div className="scrubber-buttons">
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                onClick={() => {
                  if (activeIndex >= trajectory.length - 1) setActiveIndex(0);
                  setIsPlaying((p) => !p);
                }}
              >
                {isPlaying ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                <span>{isPlaying ? 'Pause' : 'Play path'}</span>
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-compact"
                onClick={() => {
                  setIsPlaying(false);
                  setActiveIndex(peakIndex);
                }}
                title="Jump to peak elevation"
              >
                <RotateCcw size={14} aria-hidden="true" />
                <span>Peak</span>
              </button>
            </div>
          </div>

          <input
            type="range"
            aria-label="Scrub pass timeline"
            min={0}
            max={Math.max(0, trajectory.length - 1)}
            value={activeIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setActiveIndex(Number(e.target.value));
            }}
          />

          {activePoint && (
            <div className="telemetry-grid">
              <div>
                <span className="metric-label">Local time</span>
                <strong className="metric-value">
                  {formatPassTime(activePoint.timestampMs, timezone)}
                </strong>
              </div>
              <div>
                <span className="metric-label">Look direction</span>
                <strong className="metric-value">
                  {Math.round(activePoint.azimuthDeg)}° ({azimuthToCompass(activePoint.azimuthDeg)})
                </strong>
              </div>
              <div>
                <span className="metric-label">Elevation</span>
                <strong className="metric-value">{activePoint.elevationDeg.toFixed(1)}°</strong>
              </div>
              <div>
                <span className="metric-label">Distance</span>
                <strong className="metric-value">{Math.round(activePoint.rangeKm)} km</strong>
              </div>
              <div className="telemetry-full">
                <span className="metric-label">Visibility state at this moment</span>
                <strong
                  className={`telemetry-status ${
                    activePoint.isVisible ? 'status-visible' : 'status-hidden'
                  }`}
                >
                  {activePoint.isVisible
                    ? 'Likely visible — sunlit spacecraft against dark sky'
                    : !activePoint.isSunlit
                      ? 'In Earth’s shadow (dark / unlit)'
                      : activePoint.elevationDeg < minElevationDeg
                        ? `Below your ${minElevationDeg}° minimum elevation`
                        : 'Sky too bright (twilight/daylight)'}
                </strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
