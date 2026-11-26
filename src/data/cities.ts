import { SatelliteOption } from '../types/orbit';

export const SATELLITE_OPTIONS: SatelliteOption[] = [
  {
    noradId: '25544',
    name: 'ISS (ZARYA)',
    shortName: 'ISS',
    description: 'International Space Station — brightest crewed outpost in low Earth orbit.',
  },
  {
    noradId: '48274',
    name: 'CSS (TIANHE)',
    shortName: 'Tiangong',
    description: 'China Space Station — bright, frequent passes at mid-to-low latitudes.',
  },
  {
    noradId: '20580',
    name: 'HST',
    shortName: 'Hubble',
    description: 'Hubble Space Telescope — faint-to-moderate passes in low-latitude skies.',
  },
];

export const DEFAULT_SATELLITE_ID = '25544';

export const COMMON_TIMEZONES: string[] = [
  'UTC',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];
