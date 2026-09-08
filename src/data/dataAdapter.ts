/**
 * Vanguard Unified Data Adapter
 * Provides a single, clean import point for any UI component (React, Next.js, Vue, MapLibre).
 * Returns live data when online and seamless hardcoded fallbacks when offline.
 */

import {
  getLiveWeather,
  getLiveFlights,
  getLiveSeismic,
  getLiveCisaThreats,
  getLiveGdacsAlerts,
  LiveStreamResult
} from './liveApis';

export interface VanguardUnifiedStreams {
  weather: LiveStreamResult<any>;
  flights: LiveStreamResult<any[]>;
  seismic: LiveStreamResult<any[]>;
  cisaThreats: LiveStreamResult<any[]>;
  gdacsAlerts: LiveStreamResult<any[]>;
  fetchedAt: string;
}

/**
 * Universal Data Importer for any UI component
 */
export async function fetchAllVanguardStreams(): Promise<VanguardUnifiedStreams> {
  const [weather, flights, seismic, cisaThreats, gdacsAlerts] = await Promise.all([
    getLiveWeather(),
    getLiveFlights(),
    getLiveSeismic(),
    getLiveCisaThreats(),
    getLiveGdacsAlerts(),
  ]);

  return {
    weather,
    flights,
    seismic,
    cisaThreats,
    gdacsAlerts,
    fetchedAt: new Date().toLocaleTimeString(),
  };
}

export * from './liveApis';
export * from './fallbackDatasets';
