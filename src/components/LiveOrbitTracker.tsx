import React, { useEffect, useState } from 'react';
import { Radio, Satellite } from 'lucide-react';
import {
  azimuthToCompass,
  estimateCurrentPosition,
  formatPassTime,
} from '../services/passPredictor';
import { CurrentPositionEstimate, ObserverLocation, OrbitDataset } from '../types/orbit';

interface LiveOrbitTrackerProps {
  dataset: OrbitDataset | null;
  location: ObserverLocation;
}

export const LiveOrbitTracker: React.FC<LiveOrbitTrackerProps> = ({ dataset, location }) => {
  const [estimate, setEstimate] = useState<CurrentPositionEstimate | null>(null);
  const [propagationError, setPropagationError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataset) {
      setEstimate(null);
      setPropagationError(null);
      return;
    }

    const update = () => {
      try {
        const next = estimateCurrentPosition(dataset, location, new Date());
        setEstimate(next);
        setPropagationError(null);
      } catch (err) {
        setEstimate(null);
        setPropagationError(
          err instanceof Error ? err.message : 'Unable to estimate current spacecraft position.',
        );
      }
    };

    update();
    const timer = window.setInterval(update, 3000);
    return () => clearInterval(timer);
  }, [dataset, location]);

  if (!dataset) return null;

  return (
    <section
      className="panel live-tracker-panel"
      aria-label="Current estimated spacecraft position"
    >
      <div className="live-tracker-header">
        <div className="live-tracker-title">
          <Satellite size={16} aria-hidden="true" />
          <strong>{dataset.satelliteName} · Current Estimated Position</strong>
        </div>
        <span className={`estimate-badge ${dataset.isDemo ? 'badge-demo' : 'badge-estimate'}`}>
          <Radio size={12} aria-hidden="true" />
          {dataset.isDemo
            ? 'Demo Estimate (Sample Elements)'
            : 'SGP4 Orbit Estimate · Not Live GPS Telemetry'}
        </span>
      </div>

      {propagationError ? (
        <p className="field-error">{propagationError}</p>
      ) : (
        estimate && (
          <div className="live-tracker-grid">
            <div>
              <span className="metric-label">Ground track</span>
              <strong className="metric-value">
                {estimate.latitudeDeg.toFixed(2)}°, {estimate.longitudeDeg.toFixed(2)}°
              </strong>
            </div>
            <div>
              <span className="metric-label">Altitude / Speed</span>
              <strong className="metric-value">
                {Math.round(estimate.altitudeKm)} km · {estimate.speedKmS.toFixed(2)} km/s
              </strong>
            </div>
            <div>
              <span className="metric-label">From {location.name.split(',')[0]}</span>
              <strong className="metric-value">
                {Math.round(estimate.azimuthDeg)}° {azimuthToCompass(estimate.azimuthDeg)} ·{' '}
                {estimate.elevationDeg.toFixed(1)}° el
              </strong>
            </div>
            <div>
              <span className="metric-label">
                Sky status ({formatPassTime(estimate.timestampMs, location.timezone)})
              </span>
              <strong className="metric-value">
                {estimate.aboveHorizon ? 'Above horizon' : 'Below horizon'} ·{' '}
                {estimate.isSunlit ? 'Sunlit' : 'In shadow'}
              </strong>
            </div>
          </div>
        )
      )}
    </section>
  );
};
