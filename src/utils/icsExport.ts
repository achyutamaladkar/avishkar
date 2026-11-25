import { azimuthToCompass, formatPassTime } from '../services/passPredictor';
import { ObserverLocation, SatellitePass } from '../types/orbit';

function toIcsUtc(timestampMs: number): string {
  const d = new Date(timestampMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}` +
    `${pad(d.getUTCMonth() + 1)}` +
    `${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}` +
    `${pad(d.getUTCMinutes())}` +
    `${pad(d.getUTCSeconds())}Z`
  );
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function buildPassIcsContent(options: {
  pass: SatellitePass;
  location: ObserverLocation;
  reminderMinutes: number;
  isDemo: boolean;
  nowMs?: number;
}): string {
  const { pass, location, reminderMinutes, isDemo, nowMs = Date.now() } = options;
  const startDir = azimuthToCompass(pass.startAzimuthDeg);
  const peakDir = azimuthToCompass(pass.peakAzimuthDeg);
  const endDir = azimuthToCompass(pass.endAzimuthDeg);

  const summary = `${pass.satelliteName} Visible Pass (Peak ${pass.maxElevationDeg.toFixed(
    0,
  )}° ${peakDir})${isDemo ? ' [Demo Data]' : ''}`;

  const descriptionLines = [
    `OrbitView Predicted Satellite Pass`,
    `Spacecraft: ${pass.satelliteName} (NORAD ${pass.noradId})`,
    `Observer: ${location.name} (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`,
    `Start: ${formatPassTime(pass.startTimeMs, location.timezone)} (${pass.startAzimuthDeg}° ${startDir}, ${pass.startElevationDeg}° el)`,
    `Peak: ${formatPassTime(pass.peakTimeMs, location.timezone)} (${pass.peakAzimuthDeg}° ${peakDir}, ${pass.maxElevationDeg}° el)`,
    `End: ${formatPassTime(pass.endTimeMs, location.timezone)} (${pass.endAzimuthDeg}° ${endDir}, ${pass.endElevationDeg}° el)`,
    `Data mode: ${isDemo ? 'Demo Mode (Archived Sample TLE)' : 'Live CelesTrak TLE + SGP4'}`,
    `Note: Predicted visibility assumes clear skies and an unobstructed horizon.`,
  ];

  const locationText = `${location.name} (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(
    4,
  )})`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OrbitView//Satellite Pass Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${pass.id}@orbitview.local`,
    `DTSTAMP:${toIcsUtc(nowMs)}`,
    `DTSTART:${toIcsUtc(pass.startTimeMs)}`,
    `DTEND:${toIcsUtc(pass.endTimeMs)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `LOCATION:${escapeIcsText(locationText)}`,
    `DESCRIPTION:${escapeIcsText(descriptionLines.join('\n'))}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(`${pass.satelliteName} pass starts in ${reminderMinutes} minutes`)}`,
    `TRIGGER:-PT${Math.max(1, Math.round(reminderMinutes))}M`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `${lines.join('\r\n')}\r\n`;
}

export function buildPassIcsFilename(pass: SatellitePass): string {
  const d = new Date(pass.startTimeMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(
    d.getUTCHours(),
  )}${pad(d.getUTCMinutes())}Z`;
  const slug = pass.satelliteName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `orbitview-${slug || pass.noradId}-${stamp}.ics`;
}

export function downloadPassIcs(options: {
  pass: SatellitePass;
  location: ObserverLocation;
  reminderMinutes: number;
  isDemo: boolean;
}): string {
  const content = buildPassIcsContent(options);
  const filename = buildPassIcsFilename(options.pass);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
