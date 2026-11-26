import React from 'react';
import { AlertTriangle, Database, Radio, RefreshCw } from 'lucide-react';
import { getOrbitDataStaleStatus } from '../services/tleService';
import { OrbitDataset } from '../types/orbit';

interface DataSourceBarProps {
  tle: OrbitDataset | null;
  isLoading: boolean;
  onRefreshLive: () => void;
}

function formatAge(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return 'unknown';
  const diffMin = Math.max(0, Math.round((Date.now() - ms) / 60_000));
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 48) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export const DataSourceBar: React.FC<DataSourceBarProps> = ({
  tle,
  isLoading,
  onRefreshLive,
}) => {
  if (!tle) return null;

  const staleStatus = getOrbitDataStaleStatus(tle);

  return (
    <section
      className={`source-bar ${staleStatus.stale ? 'source-bar-stale' : 'source-bar-live'}`}
      aria-label="Orbit data status"
    >
      <div className="source-bar-left">
        <span className="mode-badge badge-live">
          <Radio size={14} aria-hidden="true" />
          LIVE SGP4 PREDICTIONS
        </span>

        <div className="source-meta">
          <span>
            <Database size={13} aria-hidden="true" />
            <strong>Source:</strong> {tle.sourceName}
            {tle.fromCache ? ' (cached)' : ''}
          </span>
          <span>
            <strong>Fetched:</strong> {formatAge(tle.fetchedAt)} (
            {new Date(tle.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
          </span>
          <span>
            <strong>Element epoch:</strong> {formatAge(tle.epochAt)} (
            {new Date(tle.epochAt).toUTCString().replace(':00 GMT', ' UTC')})
          </span>
        </div>

        {staleStatus.stale && staleStatus.reason && (
          <p className="stale-warning" role="status">
            <AlertTriangle size={14} aria-hidden="true" />
            <span>
              <strong>Stale orbit data:</strong> {staleStatus.reason}
            </span>
          </p>
        )}
      </div>

      <div className="source-bar-actions">
        <button
          type="button"
          className="btn btn-ghost btn-compact"
          onClick={onRefreshLive}
          disabled={isLoading}
          title="Fetch fresh OMM orbital elements from CelesTrak"
        >
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} aria-hidden="true" />
          <span>Refresh Orbit Data</span>
        </button>
      </div>
    </section>
  );
};
