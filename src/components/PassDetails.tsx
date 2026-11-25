import React from 'react';
import { CloudSun, Compass, Info, MoonStar, Sun } from 'lucide-react';
import {
  azimuthToCompass,
  formatDuration,
  formatPassDate,
  formatPassTime,
} from '../services/passPredictor';
import { SatellitePass } from '../types/orbit';

interface PassDetailsProps {
  pass: SatellitePass;
  timezone: string;
}

const SKY_EXPLANATIONS: Record<SatellitePass['skyCondition'], string> = {
  astronomical: 'Astronomical darkness (Sun > 18° below horizon) — optimal contrast.',
  nautical: 'Nautical twilight (Sun 12°–18° below horizon) — bright stars visible, strong contrast.',
  civil: 'Civil/early twilight (Sun 6°–12° below horizon) — brightest passes stand out against deep blue sky.',
};

export const PassDetails: React.FC<PassDetailsProps> = ({ pass, timezone }) => {
  const startDir = azimuthToCompass(pass.startAzimuthDeg);
  const peakDir = azimuthToCompass(pass.peakAzimuthDeg);
  const endDir = azimuthToCompass(pass.endAzimuthDeg);

  return (
    <section className="panel details-panel" aria-label="Selected pass visibility details">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Visibility Breakdown</p>
          <h2>
            {pass.satelliteName} · {formatPassDate(pass.startTimeMs, timezone)}
          </h2>
        </div>
        <span className="filter-pill">Duration: {formatDuration(pass.durationSec)}</span>
      </div>

      <div className="timeline-steps">
        <div className="timeline-step">
          <span className="step-tag step-start">Start</span>
          <strong>{formatPassTime(pass.startTimeMs, timezone)}</strong>
          <span>
            {pass.startAzimuthDeg}° ({startDir}) · {pass.startElevationDeg.toFixed(0)}° up
          </span>
        </div>
        <div className="timeline-step">
          <span className="step-tag step-peak">Peak</span>
          <strong>{formatPassTime(pass.peakTimeMs, timezone)}</strong>
          <span>
            {pass.peakAzimuthDeg}° ({peakDir}) · {pass.maxElevationDeg.toFixed(1)}° up
          </span>
        </div>
        <div className="timeline-step">
          <span className="step-tag step-end">End</span>
          <strong>{formatPassTime(pass.endTimeMs, timezone)}</strong>
          <span>
            {pass.endAzimuthDeg}° ({endDir}) · {pass.endElevationDeg.toFixed(0)}° up
          </span>
        </div>
      </div>

      <div className="details-notes">
        <div className="detail-row">
          <Compass size={16} aria-hidden="true" />
          <div>
            <strong>How to spot it:</strong> Face <strong>{startDir}</strong> around{' '}
            {formatPassTime(pass.startTimeMs, timezone)}. Track a steady, non-blinking bright point
            moving smoothly toward <strong>{peakDir}</strong> at {pass.maxElevationDeg.toFixed(0)}°
            elevation, then fading toward <strong>{endDir}</strong>.
          </div>
        </div>

        <div className="detail-row">
          <MoonStar size={16} aria-hidden="true" />
          <div>
            <strong>Observer sky darkness:</strong> Sun is {Math.abs(pass.sunElevationAtPeakDeg).toFixed(1)}°
            below your horizon at peak. {SKY_EXPLANATIONS[pass.skyCondition]}
          </div>
        </div>

        <div className="detail-row">
          <Sun size={16} aria-hidden="true" />
          <div>
            <strong>Spacecraft illumination:</strong> Sunlit for{' '}
            {Math.round(pass.sunlitFraction * 100)}% of its above-horizon arc
            {pass.sunlitFraction < 0.9
              ? ' (enters or exits Earth’s shadow during this pass, so it may abruptly fade or appear mid-sky).'
              : ' (stays sunlit across the visible arc).'}
          </div>
        </div>

        <div className="detail-row detail-caveat">
          <CloudSun size={16} aria-hidden="true" />
          <div>
            <strong>Prediction limits:</strong>{' '}
            <span className="muted">
              Horizon window: {formatPassTime(pass.horizonRiseTimeMs, timezone)} –{' '}
              {formatPassTime(pass.horizonSetTimeMs, timezone)}. Cloud cover, haze, nearby
              buildings, trees, and urban light pollution can still prevent naked-eye viewing.
            </span>
          </div>
        </div>
      </div>

      <p className="inline-tip">
        <Info size={14} aria-hidden="true" />
        Tip: Go outside 5 minutes early so your eyes adjust to the dark and you can orient toward{' '}
        {startDir}.
      </p>
    </section>
  );
};
