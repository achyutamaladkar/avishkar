import React, { useEffect, useState } from 'react';
import { Bell, BellOff, CalendarPlus, CheckCircle2, Info, Trash2 } from 'lucide-react';
import { azimuthToCompass, formatPassDate, formatPassShortTime } from '../services/passPredictor';
import { ObserverLocation, SatellitePass } from '../types/orbit';
import { downloadPassIcs } from '../utils/icsExport';

interface ReminderActionsProps {
  pass: SatellitePass;
  location: ObserverLocation;
  isDemo: boolean;
}

interface StoredReminder {
  passId: string;
  satelliteName: string;
  startTimeMs: number;
  notifyAtMs: number;
  leadMinutes: number;
  peakDirection: string;
  maxElevationDeg: number;
}

const REMINDERS_KEY = 'orbitview.reminders.v1';

function loadReminders(): StoredReminder[] {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredReminder[];
    return Array.isArray(parsed) ? parsed.filter((r) => r.startTimeMs > Date.now() - 60_000) : [];
  } catch {
    return [];
  }
}

function saveReminders(reminders: StoredReminder[]): void {
  try {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
  } catch {
    // Ignore storage issues cleanly
  }
}

export const ReminderActions: React.FC<ReminderActionsProps> = ({ pass, location, isDemo }) => {
  const [leadMinutes, setLeadMinutes] = useState<number>(10);
  const [icsFeedback, setIcsFeedback] = useState<string | null>(null);
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);
  const [reminders, setReminders] = useState<StoredReminder[]>(() => loadReminders());

  const notificationsSupported = typeof window !== 'undefined' && 'Notification' in window;
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(() =>
    notificationsSupported ? Notification.permission : 'unsupported',
  );

  // Schedule active timers for saved reminders while the app is open
  useEffect(() => {
    if (!notificationsSupported || permissionState !== 'granted') return;

    const timers: number[] = [];
    for (const rem of reminders) {
      const delay = rem.notifyAtMs - Date.now();
      if (delay > 0 && delay < 7 * 86_400_000) {
        const id = window.setTimeout(() => {
          try {
            new Notification(`${rem.satelliteName} pass in ${rem.leadMinutes} min`, {
              body: `Peak ${rem.maxElevationDeg.toFixed(0)}° ${rem.peakDirection} at ${formatPassShortTime(
                rem.startTimeMs,
                location.timezone,
              )}`,
              tag: rem.passId,
            });
          } catch {
            // Some mobile browsers require ServiceWorkerRegistration.showNotification
            if ('serviceWorker' in navigator) {
              void navigator.serviceWorker.ready.then((reg) =>
                reg.showNotification(`${rem.satelliteName} pass in ${rem.leadMinutes} min`, {
                  body: `Peak ${rem.maxElevationDeg.toFixed(0)}° ${rem.peakDirection}`,
                  tag: rem.passId,
                }),
              );
            }
          }
        }, delay);
        timers.push(id);
      }
    }

    return () => {
      timers.forEach((id) => clearTimeout(id));
    };
  }, [reminders, permissionState, notificationsSupported, location.timezone]);

  const handleDownloadIcs = () => {
    const filename = downloadPassIcs({
      pass,
      location,
      reminderMinutes: leadMinutes,
      isDemo,
    });
    setIcsFeedback(`Downloaded ${filename} (includes a ${leadMinutes}-minute calendar alert).`);
  };

  const activeReminder = reminders.find((r) => r.passId === pass.id);

  const handleSetBrowserReminder = async () => {
    setNotifFeedback(null);
    if (!notificationsSupported) {
      setNotifFeedback(
        'Browser notifications are not supported on this browser. Use the .ics calendar export above for reliable reminders.',
      );
      return;
    }

    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await Notification.requestPermission();
      setPermissionState(perm);
    }

    if (perm !== 'granted') {
      setNotifFeedback(
        'Notification permission was not granted. Your .ics calendar export still works without browser permissions.',
      );
      return;
    }

    const notifyAtMs = pass.startTimeMs - leadMinutes * 60_000;
    if (notifyAtMs <= Date.now()) {
      setNotifFeedback(
        'This pass starts sooner than your selected lead time. Choose a shorter lead time or download the .ics file.',
      );
      return;
    }

    const nextReminder: StoredReminder = {
      passId: pass.id,
      satelliteName: pass.satelliteName,
      startTimeMs: pass.startTimeMs,
      notifyAtMs,
      leadMinutes,
      peakDirection: azimuthToCompass(pass.peakAzimuthDeg),
      maxElevationDeg: pass.maxElevationDeg,
    };

    const updated = [...reminders.filter((r) => r.passId !== pass.id), nextReminder];
    setReminders(updated);
    saveReminders(updated);
    setNotifFeedback(
      `Browser reminder scheduled for ${formatPassShortTime(notifyAtMs, location.timezone)} (${leadMinutes} min before pass).`,
    );
  };

  const handleRemoveReminder = (passId: string) => {
    const updated = reminders.filter((r) => r.passId !== passId);
    setReminders(updated);
    saveReminders(updated);
    setNotifFeedback('Browser reminder removed.');
  };

  return (
    <section className="panel reminder-panel" aria-label="Reminders and calendar export">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Step 4 · Plan To Watch</p>
          <h2>Set a reminder &amp; export calendar event</h2>
        </div>
      </div>

      <div className="reminder-controls">
        <div className="field lead-time-field">
          <label htmlFor="lead-time-select">Remind me before pass starts</label>
          <select
            id="lead-time-select"
            value={leadMinutes}
            onChange={(e) => setLeadMinutes(Number(e.target.value))}
          >
            <option value={5}>5 minutes before</option>
            <option value={10}>10 minutes before</option>
            <option value={15}>15 minutes before</option>
            <option value={30}>30 minutes before</option>
          </select>
        </div>

        <div className="reminder-buttons">
          <button type="button" className="btn btn-primary" onClick={handleDownloadIcs}>
            <CalendarPlus size={18} aria-hidden="true" />
            <span>Download .ics Calendar Event</span>
          </button>

          {activeReminder ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleRemoveReminder(pass.id)}
            >
              <Trash2 size={16} aria-hidden="true" />
              <span>Cancel Browser Reminder</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void handleSetBrowserReminder()}
              disabled={!notificationsSupported}
            >
              {notificationsSupported ? (
                <Bell size={16} aria-hidden="true" />
              ) : (
                <BellOff size={16} aria-hidden="true" />
              )}
              <span>
                {notificationsSupported ? 'Notify Me in Browser' : 'Notifications Unavailable'}
              </span>
            </button>
          )}
        </div>
      </div>

      {icsFeedback && (
        <p className="feedback-success" role="status">
          <CheckCircle2 size={15} aria-hidden="true" />
          <span>{icsFeedback}</span>
        </p>
      )}

      {notifFeedback && (
        <p className="inline-hint" role="status">
          {notifFeedback}
        </p>
      )}

      <p className="reminder-limit-note">
        <Info size={14} aria-hidden="true" />
        <span>
          <strong>Browser notification limits:</strong> Web notifications only fire if your browser
          remains running and permission is granted; some mobile OSes suspend background tabs. For
          dependable alarms across all devices, use <strong>Download .ics Calendar Event</strong>.
        </span>
      </p>

      {reminders.length > 0 && (
        <div className="saved-reminders">
          <span className="metric-label">Scheduled browser reminders ({reminders.length})</span>
          <ul>
            {reminders.map((rem) => (
              <li key={rem.passId}>
                <span>
                  {rem.satelliteName} · {formatPassDate(rem.startTimeMs, location.timezone)} at{' '}
                  {formatPassShortTime(rem.notifyAtMs, location.timezone)} ({rem.leadMinutes}m
                  early)
                </span>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => handleRemoveReminder(rem.passId)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
