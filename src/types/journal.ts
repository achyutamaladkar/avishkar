export interface ObservationEntry {
  id: string;
  satelliteName: string;
  passId: string | null;
  date: string;        // ISO date YYYY-MM-DD
  time: string;        // HH:mm local
  locationName: string;
  latitude: number;
  longitude: number;
  spotted: boolean;
  notes: string;
  equipment: string;
  skyConditions: string;
  createdAt: string;   // ISO string
  updatedAt: string;   // ISO string
}
