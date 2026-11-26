import type { ObservationEntry } from '../types/journal';

const STORAGE_KEY = 'orbitview.journal.v1';

function readAll(): ObservationEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(entries: ObservationEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // quota or private-mode — ignore silently
  }
}

export function loadEntries(): ObservationEntry[] {
  return readAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function saveEntry(entry: ObservationEntry): ObservationEntry[] {
  const all = readAll();
  const idx = all.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    all[idx] = { ...entry, updatedAt: new Date().toISOString() };
  } else {
    all.push(entry);
  }
  persist(all);
  return loadEntries();
}

export function deleteEntry(id: string): ObservationEntry[] {
  const all = readAll().filter((e) => e.id !== id);
  persist(all);
  return loadEntries();
}

export function createBlankEntry(
  overrides: Partial<ObservationEntry> = {},
): ObservationEntry {
  const now = new Date();
  return {
    id: `obs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    satelliteName: '',
    passId: null,
    date: now.toISOString().slice(0, 10),
    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    locationName: '',
    latitude: 0,
    longitude: 0,
    spotted: false,
    notes: '',
    equipment: '',
    skyConditions: '',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  };
}
