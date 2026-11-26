import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { deleteEntry, loadEntries } from '../services/journalService';
import type { ObservationEntry } from '../types/journal';
import type { ObserverLocation, SatellitePass } from '../types/orbit';
import { JournalForm } from './JournalForm';

interface JournalSectionProps {
  pass: SatellitePass | null;
  location: ObserverLocation;
  timezone: string;
  openCreateTrigger?: number;
}

export const JournalSection: React.FC<JournalSectionProps> = ({
  pass,
  location,
  timezone,
  openCreateTrigger = 0,
}) => {
  const [entries, setEntries] = useState<ObservationEntry[]>(() => loadEntries());
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ObservationEntry | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Refresh on mount (e.g. another tab may have changed localStorage)
  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  useEffect(() => {
    if (openCreateTrigger > 0) {
      setEditingEntry(null);
      setShowForm(true);
    }
  }, [openCreateTrigger]);

  const handleSaved = useCallback((next: ObservationEntry[]) => {
    setEntries(next);
    setShowForm(false);
    setEditingEntry(null);
  }, []);

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this observation entry?')) return;
    setEntries(deleteEntry(id));
    if (expandedId === id) setExpandedId(null);
  };

  const handleEdit = (entry: ObservationEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleNewEntry = () => {
    setEditingEntry(null);
    setShowForm(true);
  };

  return (
    <section className="panel journal-panel" aria-label="Observation journal">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Observation Journal</p>
          <h2>
            <BookOpen size={18} style={{ verticalAlign: '-3px', marginRight: 6 }} aria-hidden="true" />
            My Journal
          </h2>
        </div>
        {!showForm && (
          <button
            type="button"
            className="btn btn-primary btn-compact"
            onClick={handleNewEntry}
          >
            <Plus size={14} aria-hidden="true" />
            <span>New Entry</span>
          </button>
        )}
      </div>

      {showForm && (
        <JournalForm
          existingEntry={editingEntry}
          pass={editingEntry ? null : pass}
          location={location}
          timezone={timezone}
          onSaved={handleSaved}
          onCancel={() => {
            setShowForm(false);
            setEditingEntry(null);
          }}
        />
      )}

      {entries.length === 0 && !showForm && (
        <div className="empty-panel">
          <BookOpen size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} aria-hidden="true" />
          <h3>No observations yet</h3>
          <p className="muted">
            After watching a satellite pass, tap <strong>New Entry</strong> or <strong>Save Observation</strong> from a pass to record what you saw.
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <ul className="journal-list">
          {entries.map((e) => {
            const isExpanded = expandedId === e.id;
            return (
              <li key={e.id} className={`journal-entry ${isExpanded ? 'journal-entry-expanded' : ''}`}>
                <button
                  type="button"
                  className="journal-entry-header"
                  onClick={() => setExpandedId(isExpanded ? null : e.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="journal-entry-summary">
                    <span className={`spotted-dot ${e.spotted ? 'spotted-yes' : 'spotted-no'}`} title={e.spotted ? 'Spotted' : 'Not spotted'}>
                      {e.spotted ? <Check size={10} /> : <X size={10} />}
                    </span>
                    <div>
                      <strong>{e.satelliteName || 'Unknown satellite'}</strong>
                      <span className="journal-entry-meta">
                        {e.date} · {e.time} · {e.locationName || 'No location'}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isExpanded && (
                  <div className="journal-entry-body">
                    <div className="journal-detail-grid">
                      <div>
                        <span className="metric-label">Spotted</span>
                        <strong className="metric-value">{e.spotted ? 'Yes' : 'No'}</strong>
                      </div>
                      <div>
                        <span className="metric-label">Date &amp; time</span>
                        <strong className="metric-value">{e.date} {e.time}</strong>
                      </div>
                      <div>
                        <span className="metric-label">Location</span>
                        <strong className="metric-value">{e.locationName || '—'}</strong>
                      </div>
                      <div>
                        <span className="metric-label">Coordinates</span>
                        <strong className="metric-value">{e.latitude.toFixed(4)}°, {e.longitude.toFixed(4)}°</strong>
                      </div>
                    </div>

                    {e.notes && (
                      <div className="journal-notes-block">
                        <span className="metric-label">Notes (your observation)</span>
                        <p>{e.notes}</p>
                      </div>
                    )}

                    {(e.equipment || e.skyConditions) && (
                      <div className="journal-detail-grid">
                        {e.equipment && (
                          <div>
                            <span className="metric-label">Equipment</span>
                            <strong className="metric-value">{e.equipment}</strong>
                          </div>
                        )}
                        {e.skyConditions && (
                          <div>
                            <span className="metric-label">Sky conditions</span>
                            <strong className="metric-value">{e.skyConditions}</strong>
                          </div>
                        )}
                      </div>
                    )}

                    {e.passId && (
                      <p className="journal-pass-note">
                        Linked to predicted pass <code>{e.passId}</code>
                      </p>
                    )}

                    <div className="journal-entry-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-compact"
                        onClick={() => handleEdit(e)}
                      >
                        <Edit3 size={14} aria-hidden="true" /> Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-compact"
                        onClick={() => handleDelete(e.id)}
                        style={{ color: 'var(--status-rose-text)' }}
                      >
                        <Trash2 size={14} aria-hidden="true" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
