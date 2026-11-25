import React from 'react';
import { ArrowUpRight, Clock, Eye, Sparkles } from 'lucide-react';
import {
  azimuthToCompass,
  formatDuration,
  formatPassDate,
  formatPassShortTime,
  formatPassTime,
} from '../services/passPredictor';
import { FilteredPassStats, SatellitePass } from '../types/orbit';

interface PassListProps {
  passes: SatellitePass[];
  stats: FilteredPassStats | null;
  selectedPassId: string | null;
  timezone: string;
  minElevationDeg: number;
  isDemo: boolean;
  onSelectPass: (passId: string) => void;
}

const QUALITY_LABELS: Record<SatellitePass['quality'], string> = {
  excellent: 'Excellent pass',
  good: 'Good pass',
  fair: 'Fair pass',
};

const SKY_LABELS: Record<SatellitePass['skyCondition'], string> = {
  astronomical: 'Dark sky',
  nautical: 'Nautical twilight',
  civil: 'Civil twilight',
};

export const PassList: React.FC<PassListProps> = ({
  passes,
  stats,
  selectedPassId,
  timezone,
  minElevationDeg,
  isDemo,
  onSelectPass,
}) => {
  if (passes.length === 0) {
    return (
      <div className="panel empty-panel">
        <h3>No likely-visible passes found</h3>
        <p>
          We checked {stats?.totalAboveHorizon ?? 0} above-horizon passes in your selected window,
          but none met all visibility criteria ({stats?.daylight ?? 0} in daylight,{' '}
          {stats?.inShadow ?? 0} in Earth’s shadow, {stats?.tooLow ?? 0} below {minElevationDeg}°).
        </p>
        <p className="muted">
          Try lowering the minimum elevation slider or expanding the search window to 10 days.
        </p>
      </div>
    );
  }

  return (
    <section className="pass-list-section" aria-label="Upcoming visible passes">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Step 2 · Likely-Visible Passes</p>
          <h2>
            {passes.length} upcoming {passes.length === 1 ? 'pass' : 'passes'}
          </h2>
        </div>
        {stats && (
          <span className="filter-pill">
            Filtered from {stats.totalAboveHorizon} total orbits ({timezone})
          </span>
        )}
      </div>

      <p className="prediction-disclaimer">
        <Eye size={14} aria-hidden="true" />
        <span>
          {isDemo
            ? 'Sample prediction from archived TLE data (Demo Mode). '
            : 'Predicted visibility based on SGP4 orbit math, solar illumination, and twilight darkness. '}
          Local clouds, trees, buildings, and city light pollution can still block the view.
        </span>
      </p>

      <div className="pass-cards">
        {passes.map((pass) => {
          const isSelected = pass.id === selectedPassId;
          const startDir = azimuthToCompass(pass.startAzimuthDeg);
          const peakDir = azimuthToCompass(pass.peakAzimuthDeg);
          const endDir = azimuthToCompass(pass.endAzimuthDeg);

          return (
            <button
              key={pass.id}
              type="button"
              className={`pass-card ${isSelected ? 'pass-card-selected' : ''}`}
              onClick={() => onSelectPass(pass.id)}
              aria-pressed={isSelected}
            >
              <div className="pass-card-top">
                <div>
                  <span className="pass-date">{formatPassDate(pass.startTimeMs, timezone)}</span>
                  <strong className="pass-time-range">
                    {formatPassShortTime(pass.startTimeMs, timezone)} –{' '}
                    {formatPassShortTime(pass.endTimeMs, timezone)}
                  </strong>
                </div>
                <span className={`quality-badge quality-${pass.quality}`}>
                  <Sparkles size={12} aria-hidden="true" />
                  {QUALITY_LABELS[pass.quality]}
                </span>
              </div>

              <div className="pass-metrics">
                <div className="metric">
                  <span className="metric-label">Peak elevation</span>
                  <strong className="metric-value">
                    {pass.maxElevationDeg.toFixed(0)}° {peakDir}
                  </strong>
                </div>
                <div className="metric">
                  <span className="metric-label">Visible duration</span>
                  <strong className="metric-value">
                    <Clock size={13} aria-hidden="true" /> {formatDuration(pass.durationSec)}
                  </strong>
                </div>
                <div className="metric">
                  <span className="metric-label">Sky path</span>
                  <strong className="metric-value">
                    {startDir} → {endDir}
                  </strong>
                </div>
              </div>

              <div className="pass-times-detail">
                <span>Start {formatPassTime(pass.startTimeMs, timezone)}</span>
                <span>Peak {formatPassTime(pass.peakTimeMs, timezone)}</span>
                <span>End {formatPassTime(pass.endTimeMs, timezone)}</span>
              </div>

              <div className="pass-card-footer">
                <span className="sky-pill">{SKY_LABELS[pass.skyCondition]}</span>
                <span className="inspect-link">
                  {isSelected ? 'Selected' : 'Inspect sky path'} <ArrowUpRight size={14} aria-hidden="true" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
