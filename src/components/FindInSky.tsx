import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Compass,
  Crosshair,
  Smartphone,
  X,
} from 'lucide-react';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';
import { azimuthToCompass, formatPassTime } from '../services/passPredictor';
import type { ObserverLocation, PassPoint, SatellitePass } from '../types/orbit';

interface FindInSkyProps {
  pass: SatellitePass;
  location: ObserverLocation;
  timezone: string;
  onClose?: () => void;
  onSaveObservation?: () => void;
  embedded?: boolean;
}

function interpolatePass(trajectory: PassPoint[], nowMs: number): PassPoint | null {
  if (trajectory.length === 0) return null;
  if (nowMs <= trajectory[0].timestampMs) return trajectory[0];
  if (nowMs >= trajectory[trajectory.length - 1].timestampMs) {
    return trajectory[trajectory.length - 1];
  }
  for (let i = 0; i < trajectory.length - 1; i++) {
    const a = trajectory[i];
    const b = trajectory[i + 1];
    if (nowMs >= a.timestampMs && nowMs <= b.timestampMs) {
      const frac = (nowMs - a.timestampMs) / (b.timestampMs - a.timestampMs);
      return {
        timestampMs: nowMs,
        azimuthDeg: a.azimuthDeg + frac * (b.azimuthDeg - a.azimuthDeg),
        elevationDeg: a.elevationDeg + frac * (b.elevationDeg - a.elevationDeg),
        rangeKm: a.rangeKm + frac * (b.rangeKm - a.rangeKm),
        sunElevationDeg: a.sunElevationDeg,
        isSunlit: a.isSunlit,
        isVisible: a.isVisible,
      };
    }
  }
  return trajectory[trajectory.length - 1];
}

function angleDiff(a: number, b: number): number {
  return ((b - a) % 360 + 540) % 360 - 180;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0s';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const SVG_SIZE = 300;
const SVG_CENTER = SVG_SIZE / 2;
const SVG_RADIUS = 120;

function polarToSvg(azDeg: number, elDeg: number) {
  const clampedEl = Math.max(0, Math.min(90, elDeg));
  const r = ((90 - clampedEl) / 90) * SVG_RADIUS;
  const azRad = (azDeg * Math.PI) / 180;
  return {
    x: SVG_CENTER + r * Math.sin(azRad),
    y: SVG_CENTER - r * Math.cos(azRad),
  };
}

export const FindInSky: React.FC<FindInSkyProps> = ({
  pass,
  location,
  timezone,
  onClose,
  onSaveObservation,
  embedded = false,
}) => {
  const { status, data, start, stop, isSupported, isSecureContext } = useDeviceOrientation();
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStart = useCallback(async () => {
    await start();
  }, [start]);

  const handleStop = useCallback(() => {
    stop();
    if (onClose) onClose();
  }, [stop, onClose]);

  const passStatus = useMemo(() => {
    if (nowMs < pass.horizonRiseTimeMs) return 'approaching' as const;
    if (nowMs > pass.horizonSetTimeMs) return 'ended' as const;
    return 'active' as const;
  }, [nowMs, pass]);

  const timeLabel = useMemo(() => {
    if (passStatus === 'approaching') {
      return `ISS rises in ${formatCountdown(pass.horizonRiseTimeMs - nowMs)}`;
    }
    if (passStatus === 'active') {
      return `Pass active · ${formatCountdown(pass.horizonSetTimeMs - nowMs)} remaining`;
    }
    return 'Pass has ended';
  }, [passStatus, nowMs, pass]);

  const issPoint = useMemo(
    () => interpolatePass(pass.trajectory, nowMs),
    [pass.trajectory, nowMs],
  );

  const isLiveActive = status === 'active';
  const phoneHeading = isLiveActive ? data.heading : null;
  const phoneTilt = isLiveActive ? data.tilt : null;

  const guidance = useMemo(() => {
    if (!issPoint) return null;
    const issAz = issPoint.azimuthDeg;
    const issEl = issPoint.elevationDeg;

    let turnLabel: string | null = null;
    if (phoneHeading !== null) {
      const azDiff = angleDiff(phoneHeading, issAz);
      if (Math.abs(azDiff) > 10) {
        turnLabel =
          azDiff > 0
            ? `Turn right ${Math.round(Math.abs(azDiff))}°`
            : `Turn left ${Math.round(Math.abs(azDiff))}°`;
      } else {
        turnLabel = 'Direction aligned ✓';
      }
    }

    let tiltLabel: string | null = null;
    if (phoneTilt !== null) {
      const elDiff = issEl - phoneTilt;
      if (Math.abs(elDiff) > 5) {
        tiltLabel =
          elDiff > 0
            ? `Tilt higher ${Math.round(Math.abs(elDiff))}°`
            : `Tilt lower ${Math.round(Math.abs(elDiff))}°`;
      } else {
        tiltLabel = 'Elevation aligned ✓';
      }
    }

    return {
      azLabel: `Predicted ISS: ${Math.round(issAz)}° (${azimuthToCompass(issAz)})`,
      elLabel: `${Math.round(issEl)}° above horizon`,
      turnLabel,
      tiltLabel,
    };
  }, [issPoint, phoneHeading, phoneTilt]);

  const isAligned = useMemo(() => {
    if (!issPoint || phoneHeading === null || phoneTilt === null) return false;
    return (
      Math.abs(angleDiff(phoneHeading, issPoint.azimuthDeg)) <= 10 &&
      Math.abs(issPoint.elevationDeg - phoneTilt) <= 5
    );
  }, [issPoint, phoneHeading, phoneTilt]);

  const issCoord = issPoint ? polarToSvg(issPoint.azimuthDeg, issPoint.elevationDeg) : null;
  const phoneCoord =
    phoneHeading !== null && phoneTilt !== null ? polarToSvg(phoneHeading, phoneTilt) : null;

  const content = (
    <div className={embedded ? 'panel findinsky-embedded' : 'findinsky-panel panel'}>
      <div className="findinsky-header">
        <div>
          <p className="eyebrow">Live Sky Guide</p>
          <h2>Find {pass.satelliteName} in the Sky</h2>
        </div>
        {!embedded && onClose && (
          <button
            type="button"
            className="btn btn-ghost btn-compact"
            onClick={handleStop}
            title="Close sky guide"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className={`findinsky-status findinsky-status-${passStatus}`}>
        <span>
          {location.name.split(',')[0]} · {timeLabel}
        </span>
      </div>

      {!isSecureContext && (
        <div className="findinsky-unsupported" style={{ marginBottom: 12 }} role="alert">
          <p>
            <strong>HTTPS required for phone sensors:</strong> This page is not running in a secure
            context. Mobile browsers block compass and orientation readings over plain HTTP. Use the
            manual guide below, or open OrbitView over HTTPS on your phone.
          </p>
        </div>
      )}

      {status === 'idle' && (
        <div className="findinsky-start-box">
          <Smartphone size={30} style={{ color: 'var(--accent-teal)' }} aria-hidden="true" />
          <p>
            Tap <strong>Start Sky Guide</strong> to request compass and tilt sensors on a supported
            phone. Permission is only requested when you tap the button.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleStart()}
            disabled={!isSecureContext || !isSupported}
          >
            <Compass size={16} aria-hidden="true" /> Start Sky Guide
          </button>
          {!isSupported && (
            <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
              <code>DeviceOrientationEvent</code> is not supported in this browser. Use the manual
              guide below.
            </p>
          )}
        </div>
      )}

      {status === 'requesting' && (
        <div className="findinsky-start-box">
          <div className="spinner" aria-hidden="true" />
          <p>Waiting for orientation permission and first live sensor reading…</p>
        </div>
      )}

      {status === 'insecure' && (
        <div className="findinsky-unsupported" style={{ marginBottom: 12 }} role="alert">
          <p>
            <strong>HTTPS required:</strong> Live orientation sensors require a secure HTTPS
            connection. The manual direction and elevation guide below remains ready to use.
          </p>
        </div>
      )}

      {status === 'unsupported' && (
        <div className="findinsky-unsupported" style={{ marginBottom: 12 }} role="alert">
          <p>
            <strong>Device sensors unsupported:</strong> This browser does not support orientation
            sensors. Use the manual compass bearing and elevation below.
          </p>
        </div>
      )}

      {status === 'denied' && (
        <div className="findinsky-start-box">
          <p className="field-error">
            <strong>Permission denied.</strong> Allow motion &amp; orientation access in your
            browser settings and tap Retry, or use the manual guide below.
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => void handleStart()}>
            Retry Permission
          </button>
        </div>
      )}

      {status === 'no-sensor' && (
        <div className="findinsky-unsupported" style={{ marginBottom: 14 }} role="alert">
          <p style={{ margin: 0 }}>
            <AlertTriangle size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} aria-hidden="true" />
            <strong>No orientation sensor reading detected.</strong> Sensor guidance is unavailable
            on this device (most laptops and desktops do not have compass or tilt hardware). Use
            the manual direction and elevation guide below.
          </p>
        </div>
      )}

      {status === 'active' && (phoneHeading === null || phoneTilt === null) && (
        <div className="findinsky-unsupported" style={{ marginBottom: 14 }} role="status">
          <p style={{ margin: 0 }}>
            {phoneHeading === null
              ? 'Compass heading is unavailable on this device — tilt guidance is shown, and you can use the manual compass bearing below.'
              : 'Device tilt reading is unavailable — compass guidance is shown, and you can use the manual elevation angle below.'}
          </p>
        </div>
      )}

      {/* Sky Dome Compass */}
      <div className="findinsky-dome-wrap">
        <svg
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className="findinsky-dome"
          role="img"
          aria-label="Sky dome showing predicted ISS direction and live phone pointing direction"
        >
          <circle
            cx={SVG_CENTER}
            cy={SVG_CENTER}
            r={SVG_RADIUS}
            fill="#f1f5f9"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
          <circle
            cx={SVG_CENTER}
            cy={SVG_CENTER}
            r={SVG_RADIUS / 2}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <line
            x1={SVG_CENTER}
            y1={SVG_CENTER - SVG_RADIUS}
            x2={SVG_CENTER}
            y2={SVG_CENTER + SVG_RADIUS}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <line
            x1={SVG_CENTER - SVG_RADIUS}
            y1={SVG_CENTER}
            x2={SVG_CENTER + SVG_RADIUS}
            y2={SVG_CENTER}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          {(['N', 'E', 'S', 'W'] as const).map((dir, i) => {
            const ang = i * 90;
            const r2 = SVG_RADIUS + 14;
            const rad = (ang * Math.PI) / 180;
            return (
              <text
                key={dir}
                x={SVG_CENTER + r2 * Math.sin(rad)}
                y={SVG_CENTER - r2 * Math.cos(rad) + 4}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="11"
                fontWeight="700"
              >
                {dir}
              </text>
            );
          })}
          <circle cx={SVG_CENTER} cy={SVG_CENTER} r="2" fill="#94a3b8" />

          {issCoord && (
            <g>
              <circle cx={issCoord.x} cy={issCoord.y} r="11" fill="rgba(13,148,136,0.15)" />
              <circle
                cx={issCoord.x}
                cy={issCoord.y}
                r="6"
                fill="#0d9488"
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x={issCoord.x + 10}
                y={issCoord.y - 8}
                fill="#0d9488"
                fontSize="10"
                fontWeight="700"
              >
                ISS
              </text>
            </g>
          )}

          {phoneCoord && (
            <g>
              <circle cx={phoneCoord.x} cy={phoneCoord.y} r="8" fill="rgba(99,102,241,0.15)" />
              <circle
                cx={phoneCoord.x}
                cy={phoneCoord.y}
                r="4"
                fill="#6366f1"
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x={phoneCoord.x + 8}
                y={phoneCoord.y + 12}
                fill="#6366f1"
                fontSize="9"
                fontWeight="600"
              >
                Phone
              </text>
            </g>
          )}
        </svg>

        <div className="findinsky-dome-legend">
          <span>
            <i className="legend-dot" style={{ background: '#0d9488' }} /> ISS predicted position
          </span>
          {phoneCoord && (
            <span>
              <i className="legend-dot" style={{ background: '#6366f1' }} /> Live phone sensor
            </span>
          )}
        </div>
      </div>

      {/* Guidance instructions */}
      {guidance && (
        <div className={`findinsky-guidance ${isAligned ? 'guidance-aligned' : ''}`}>
          <div className="guidance-row">
            <Crosshair size={16} aria-hidden="true" />
            <strong>{guidance.azLabel}</strong>
            <span className="muted"> · {guidance.elLabel}</span>
          </div>
          {guidance.turnLabel && (
            <div className="guidance-instruction">
              {guidance.turnLabel.includes('right') ? (
                <ArrowRight size={18} aria-hidden="true" />
              ) : guidance.turnLabel.includes('left') ? (
                <ArrowLeft size={18} aria-hidden="true" />
              ) : (
                <Check size={18} aria-hidden="true" />
              )}
              <span>{guidance.turnLabel}</span>
            </div>
          )}
          {guidance.tiltLabel && (
            <div className="guidance-instruction">
              {guidance.tiltLabel.includes('higher') ? (
                <ArrowUp size={18} aria-hidden="true" />
              ) : guidance.tiltLabel.includes('lower') ? (
                <ArrowDown size={18} aria-hidden="true" />
              ) : (
                <Check size={18} aria-hidden="true" />
              )}
              <span>{guidance.tiltLabel}</span>
            </div>
          )}
          {isAligned && (
            <div className="guidance-aligned-msg">
              <Check size={18} aria-hidden="true" />
              <strong>You're pointing at the predicted ISS position!</strong>
            </div>
          )}
        </div>
      )}

      {/* Manual fallback (always visible) */}
      <div className="findinsky-manual">
        <span className="metric-label">Manual direction &amp; elevation guide (no sensors needed)</span>
        <div className="findinsky-manual-grid">
          <div>
            <span className="metric-label">Pass start</span>
            <strong>{formatPassTime(pass.startTimeMs, timezone)}</strong>
            <span>
              {pass.startAzimuthDeg}° {azimuthToCompass(pass.startAzimuthDeg)} ·{' '}
              {pass.startElevationDeg.toFixed(0)}° up
            </span>
          </div>
          <div>
            <span className="metric-label">Peak</span>
            <strong>{formatPassTime(pass.peakTimeMs, timezone)}</strong>
            <span>
              {pass.peakAzimuthDeg}° {azimuthToCompass(pass.peakAzimuthDeg)} ·{' '}
              {pass.maxElevationDeg.toFixed(1)}° up
            </span>
          </div>
          <div>
            <span className="metric-label">Pass end</span>
            <strong>{formatPassTime(pass.endTimeMs, timezone)}</strong>
            <span>
              {pass.endAzimuthDeg}° {azimuthToCompass(pass.endAzimuthDeg)} ·{' '}
              {pass.endElevationDeg.toFixed(0)}° up
            </span>
          </div>
        </div>
      </div>

      <p className="findinsky-disclaimer">
        Positions shown are <strong>predictions</strong> based on SGP4 orbital propagation. The app
        does not have live contact with the ISS. Phone compass accuracy varies by device.
      </p>

      <div className="findinsky-actions" style={{ gap: 10, flexWrap: 'wrap' }}>
        {onSaveObservation && (
          <button type="button" className="btn btn-primary" onClick={onSaveObservation}>
            Save Observation
          </button>
        )}
        {status === 'active' && (
          <button type="button" className="btn btn-secondary" onClick={handleStop}>
            Stop Sensors
          </button>
        )}
        {!embedded && onClose && (
          <button type="button" className="btn btn-secondary" onClick={handleStop}>
            Close Sky Guide
          </button>
        )}
      </div>
    </div>
  );

  if (embedded) return content;

  return <div className="findinsky-overlay">{content}</div>;
};
