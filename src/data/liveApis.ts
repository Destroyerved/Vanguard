/**
 * 100% REAL LIVE PUBLIC API FETCHERS WITH RESILIENT FALLBACKS
 * Fetches live data from official public APIs and automatically uses hardcoded
 * authentic fallback datasets if offline, rate-limited, or CORS restricted.
 */

import {
  FALLBACK_WEATHER,
  FALLBACK_FLIGHTS,
  FALLBACK_SEISMIC,
  FALLBACK_CISA_THREATS,
  FALLBACK_GDACS_ALERTS
} from './fallbackDatasets';

export interface LiveStreamResult<T> {
  data: T;
  isLive: boolean; // true = fetched live from real API, false = hardcoded fallback
  sourceName: string;
  fetchedAt: string;
}

// 1. LIVE WEATHER (Open-Meteo API + Fallback)
export async function getLiveWeather(): Promise<LiveStreamResult<any>> {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.2090&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure,visibility';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      data,
      isLive: true,
      sourceName: 'Open-Meteo Live REST API',
      fetchedAt: new Date().toLocaleTimeString()
    };
  } catch (err) {
    console.warn('[VanguardLiveAPI] Weather API unavailable, using resilient fallback:', err);
    return {
      data: FALLBACK_WEATHER,
      isLive: false,
      sourceName: 'Open-Meteo Hardcoded Cache',
      fetchedAt: new Date().toLocaleTimeString()
    };
  }
}

// 2. LIVE FLIGHT RADAR (OpenSky Network API + Fallback)
export async function getLiveFlights(): Promise<LiveStreamResult<any[]>> {
  const url = 'https://opensky-network.org/api/states/all?lamin=8.0&lomin=68.0&lamax=37.0&lomax=97.0';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const states = (data?.states || []).filter((s: any) => s[5] !== null && s[6] !== null).slice(0, 15);
    if (states.length === 0) throw new Error('Empty state vector array');
    return {
      data: states,
      isLive: true,
      sourceName: 'OpenSky Network Live ADS-B Stream',
      fetchedAt: new Date().toLocaleTimeString()
    };
  } catch (err) {
    console.warn('[VanguardLiveAPI] OpenSky API rate-limited, using resilient ADS-B radar fallback:', err);
    return {
      data: FALLBACK_FLIGHTS,
      isLive: false,
      sourceName: 'OpenSky ADS-B Hardcoded Cache',
      fetchedAt: new Date().toLocaleTimeString()
    };
  }
}

// 3. LIVE SEISMIC & HAZARD TELEMETRY (USGS API + Fallback)
export async function getLiveSeismic(): Promise<LiveStreamResult<any[]>> {
  const url = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=2.5&limit=10';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      data: data?.features || [],
      isLive: true,
      sourceName: 'USGS Live Global Seismic Network',
      fetchedAt: new Date().toLocaleTimeString()
    };
  } catch (err) {
    console.warn('[VanguardLiveAPI] USGS API unavailable, using resilient seismic fallback:', err);
    return {
      data: FALLBACK_SEISMIC,
      isLive: false,
      sourceName: 'USGS Hardcoded Cache',
      fetchedAt: new Date().toLocaleTimeString()
    };
  }
}

// 4. LIVE CYBER & SECURITY THREATS (CISA API + Fallback)
export async function getLiveCisaThreats(): Promise<LiveStreamResult<any[]>> {
  const url = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = (data?.vulnerabilities || []).reverse().slice(0, 10);
    return {
      data: list,
      isLive: true,
      sourceName: 'CISA Known Exploited Vulnerabilities Live Feed',
      fetchedAt: new Date().toLocaleTimeString()
    };
  } catch (err) {
    console.warn('[VanguardLiveAPI] CISA API unavailable, using resilient threat fallback:', err);
    return {
      data: FALLBACK_CISA_THREATS,
      isLive: false,
      sourceName: 'CISA Threat Hardcoded Cache',
      fetchedAt: new Date().toLocaleTimeString()
    };
  }
}

// 5. LIVE GLOBAL DISASTER ALERTS (GDACS API + Fallback)
export async function getLiveGdacsAlerts(): Promise<LiveStreamResult<any[]>> {
  const url = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.gdacs.org%2Fxml%2Frss.xml';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      data: data?.items || [],
      isLive: true,
      sourceName: 'GDACS Emergency Alert Live RSS Feed',
      fetchedAt: new Date().toLocaleTimeString()
    };
  } catch (err) {
    console.warn('[VanguardLiveAPI] GDACS API unavailable, using resilient disaster fallback:', err);
    return {
      data: FALLBACK_GDACS_ALERTS,
      isLive: false,
      sourceName: 'GDACS Hardcoded Cache',
      fetchedAt: new Date().toLocaleTimeString()
    };
  }
}
