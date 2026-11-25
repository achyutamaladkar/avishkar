import React from 'react';
import { AlertTriangle, Database, Radio, RefreshCw } from 'lucide-react';
import { TleDataset } from '../types/orbit';

interface DataSourceBarProps {
  tle: TleDataset | null;
  isLoading: boolean;
  onRefreshLive: () => void;
  onExitDemo: () => void;
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
  onExitDemo,
}) => {
  if (!tle) return null;

  return (
    <section
      className={`source-bar ${tle.isDemo ? 'source-bar-demo' : 'source-bar-live'}`}
      aria-label="Orbit data status"
    >
      <div className="source-bar-left">
        <span className={`mode-badge ${tle.isDemo ? 'badge-demo' : 'badge-live'}`}>
          {tle.isDemo ? (
            <>
              <AlertTriangle size={14} aria-hidden="true" />
              DEMO MODE · SAMPLE DATA
            </>
          ) : (
            <>
              <Radio size={14} aria-hidden="true" />
              LIVE SGP4 PREDICTIONS
            </>
          )}
        </span>

        <div className="source-meta">
          <span>
            <Database size={13} aria-hidden="true" />
            <strong>Source:</strong> {tle.sourceName}
            {tle.fromCache && !tle.isDemo ? ' (cached)' : ''}
          </span>
          <span>
            <strong>Last refreshed:</strong> {formatAge(tle.fetchedAt)} (
            {new Date(tle.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
          </span>
          <span>
            <strong>TLE epoch:</strong> {new Date(tle.epochAt).toUTCString().replace(':00 GMT', ' UTC')}
          </span>
        </div>
      </div>

      <div className="source-bar-actions">
        {tle.isDemo ? (
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            onClick={onExitDemo}
            disabled={isLoading}
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Switch to Live CelesTrak</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-compact"
            onClick={onRefreshLive}
            disabled={isLoading}
            title="Fetch fresh TLE elements from CelesTrak"
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} aria-hidden="true" />
            <span>Refresh TLE</span>
          </button>
        )}
      </div>
    </section>
  );
};
