import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { createBlankEntry, saveEntry } from '../services/journalService';
import type { ObservationEntry } from '../types/journal';
import type { ObserverLocation, SatellitePass } from '../types/orbit';
import { formatPassDate, formatPassTime } from '../services/passPredictor';

interface JournalFormProps {
  /** Entry to edit, or null to create a new one */
  existingEntry: ObservationEntry | null;
  /** Pre-fill from selected pass */
  pass: SatellitePass | null;
  location: ObserverLocation;
  timezone: string;
  onSaved: (entries: ObservationEntry[]) => void;
  onCancel: () => void;
}

export const JournalForm: React.FC<JournalFormProps> = ({
  existingEntry,
  pass,
  location,
  timezone,
  onSaved,
  onCancel,
}) => {
  const [entry, setEntry] = useState<ObservationEntry>(() => {
    if (existingEntry) return { ...existingEntry };
    const now = new Date();
    return createBlankEntry({
      satelliteName: pass?.satelliteName ?? '',
      passId: pass?.id ?? null,
      date: pass
        ? new Date(pass.startTimeMs).toISOString().slice(0, 10)
        : now.toISOString().slice(0, 10),
      time: pass
        ? `${String(new Date(pass.peakTimeMs).getHours()).padStart(2, '0')}:${String(new Date(pass.peakTimeMs).getMinutes()).padStart(2, '0')}`
        : `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      locationName: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
    });
  });

  // Reset form when pass or existingEntry changes
  useEffect(() => {
    if (existingEntry) {
      setEntry({ ...existingEntry });
    }
  }, [existingEntry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveEntry(entry);
    onSaved(updated);
  };

  const field = (key: keyof ObservationEntry, value: string) =>
    setEntry((prev) => ({ ...prev, [key]: value }));

  return (
    <form className="journal-form" onSubmit={handleSubmit}>
      <div className="journal-form-header">
        <h3>{existingEntry ? 'Edit Observation' : 'Log Observation'}</h3>
        <button type="button" className="btn btn-ghost btn-compact" onClick={onCancel} title="Cancel">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {pass && (
        <div className="journal-pass-link">
          <span className="metric-label">From predicted pass</span>
          <span>
            {pass.satelliteName} · {formatPassDate(pass.startTimeMs, timezone)}{' '}
            {formatPassTime(pass.startTimeMs, timezone)} –{' '}
            {formatPassTime(pass.endTimeMs, timezone)}
          </span>
        </div>
      )}

      <div className="form-grid">
        <div className="field">
          <label htmlFor="j-satellite">Satellite</label>
          <input
            id="j-satellite"
            type="text"
            value={entry.satelliteName}
            onChange={(e) => field('satelliteName', e.target.value)}
            placeholder="e.g. ISS (ZARYA)"
          />
        </div>
        <div className="field">
          <label htmlFor="j-location">Location</label>
          <input
            id="j-location"
            type="text"
            value={entry.locationName}
            onChange={(e) => field('locationName', e.target.value)}
            placeholder="e.g. London, UK"
          />
        </div>
        <div className="field">
          <label htmlFor="j-date">Date</label>
          <input
            id="j-date"
            type="date"
            value={entry.date}
            onChange={(e) => field('date', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="j-time">Time</label>
          <input
            id="j-time"
            type="time"
            value={entry.time}
            onChange={(e) => field('time', e.target.value)}
          />
        </div>

        <div className="field field-full">
          <label>Did you spot it?</label>
          <div className="spotted-toggle">
            <button
              type="button"
              className={`toggle-btn ${entry.spotted ? 'toggle-active' : ''}`}
              onClick={() => setEntry((p) => ({ ...p, spotted: true }))}
            >
              <Check size={14} aria-hidden="true" /> Yes
            </button>
            <button
              type="button"
              className={`toggle-btn ${!entry.spotted ? 'toggle-active toggle-no' : ''}`}
              onClick={() => setEntry((p) => ({ ...p, spotted: false }))}
            >
              <X size={14} aria-hidden="true" /> No
            </button>
          </div>
        </div>

        <div className="field field-full">
          <label htmlFor="j-notes">Notes</label>
          <textarea
            id="j-notes"
            rows={3}
            value={entry.notes}
            onChange={(e) => field('notes', e.target.value)}
            placeholder="What did you observe? Brightness, colour, speed, etc."
          />
        </div>

        <div className="field">
          <label htmlFor="j-equip">Equipment (optional)</label>
          <input
            id="j-equip"
            type="text"
            value={entry.equipment}
            onChange={(e) => field('equipment', e.target.value)}
            placeholder="Naked eye, binoculars…"
          />
        </div>
        <div className="field">
          <label htmlFor="j-sky">Sky conditions (optional)</label>
          <input
            id="j-sky"
            type="text"
            value={entry.skyConditions}
            onChange={(e) => field('skyConditions', e.target.value)}
            placeholder="Clear, partly cloudy…"
          />
        </div>
      </div>

      <div className="journal-form-actions">
        <button type="submit" className="btn btn-primary">
          {existingEntry ? 'Update Entry' : 'Save Observation'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};
