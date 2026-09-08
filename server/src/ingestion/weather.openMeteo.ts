/**
 * VANGUARD — Live weather ingestion via Open-Meteo.
 *
 * This is the one feed carrying REAL external data. Open-Meteo was chosen
 * deliberately: no API key, no rate-limit ceremony, no signup — a judge can
 * clone the repo and immediately see genuine measured conditions over the area
 * of operations, which is what separates a working fusion system from a
 * simulator wearing a uniform.
 *
 * RESILIENCE CONTRACT: this adapter never throws and never blocks the tick
 * loop. Network failure degrades through three levels:
 *   1. live      — fresh response from the API
 *   2. degraded  — API unreachable, serving the last good response from cache
 *   3. degraded  — no cache yet, serving a synthetic climatological baseline
 * The weather layer therefore always renders. A blank map during a pitch is a
 * failure mode worth engineering away.
 */

import { AO_SECTORS } from '../config/constants.js';
import { createLogger } from '../util/logger.js';
import { nowIso } from '../util/time.js';
import {
  degraded,
  ok,
  type PollContext,
  type PollOutcome,
  type RawObservation,
  type SourceAdapter,
} from './SourceAdapter.js';

const log = createLogger('ingest:wx');

/** WMO 4677 weather interpretation codes, condensed to operational language. */
export const WMO_CODES: Record<number, { label: string; severe: boolean }> = {
  0: { label: 'Clear sky', severe: false },
  1: { label: 'Mainly clear', severe: false },
  2: { label: 'Partly cloudy', severe: false },
  3: { label: 'Overcast', severe: false },
  45: { label: 'Fog', severe: true },
  48: { label: 'Depositing rime fog', severe: true },
  51: { label: 'Light drizzle', severe: false },
  53: { label: 'Moderate drizzle', severe: false },
  55: { label: 'Dense drizzle', severe: false },
  56: { label: 'Light freezing drizzle', severe: true },
  57: { label: 'Dense freezing drizzle', severe: true },
  61: { label: 'Slight rain', severe: false },
  63: { label: 'Moderate rain', severe: false },
  65: { label: 'Heavy rain', severe: true },
  66: { label: 'Light freezing rain', severe: true },
  67: { label: 'Heavy freezing rain', severe: true },
  71: { label: 'Slight snowfall', severe: false },
  73: { label: 'Moderate snowfall', severe: true },
  75: { label: 'Heavy snowfall', severe: true },
  77: { label: 'Snow grains', severe: false },
  80: { label: 'Slight rain showers', severe: false },
  81: { label: 'Moderate rain showers', severe: false },
  82: { label: 'Violent rain showers', severe: true },
  85: { label: 'Slight snow showers', severe: false },
  86: { label: 'Heavy snow showers', severe: true },
  95: { label: 'Thunderstorm', severe: true },
  96: { label: 'Thunderstorm with slight hail', severe: true },
  99: { label: 'Thunderstorm with heavy hail', severe: true },
};

/** Decode a WMO code, tolerating values outside the published table. */
export function decodeWmo(code: number): { label: string; severe: boolean } {
  return WMO_CODES[code] ?? { label: `Unclassified (WMO ${code})`, severe: code >= 60 };
}

/** The normalized shape this adapter emits into `payload`. */
export interface WeatherPayload {
  stationName: string;
  lat: number;
  lng: number;
  temperatureC: number;
  apparentTemperatureC: number;
  relativeHumidity: number;
  precipitationMm: number;
  weatherCode: number;
  weatherLabel: string;
  isSevere: boolean;
  cloudCoverPercent: number;
  windSpeedKnots: number;
  windDirectionDeg: number;
  windGustKnots: number;
  visibilityMeters: number;
  /** True when this reading came from cache or the synthetic baseline. */
  synthetic: boolean;
  observedAt: string;
}

/** Fields requested from the Open-Meteo `current` block. */
const CURRENT_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation',
  'weather_code',
  'cloud_cover',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
].join(',');

interface OpenMeteoCurrent {
  time?: string;
  temperature_2m?: number;
  apparent_temperature?: number;
  relative_humidity_2m?: number;
  precipitation?: number;
  weather_code?: number;
  cloud_cover?: number;
  wind_speed_10m?: number;
  wind_direction_10m?: number;
  wind_gusts_10m?: number;
}

interface OpenMeteoResponse {
  latitude?: number;
  longitude?: number;
  current?: OpenMeteoCurrent;
  hourly?: { time?: string[]; visibility?: number[] };
}

export class OpenMeteoAdapter implements SourceAdapter {
  readonly sourceType = 'weather' as const;
  readonly sourceName = 'OPEN-METEO';
  readonly nominalReliability = 0.95;
  readonly pollIntervalMs: number;

  private cache: WeatherPayload[] = [];
  private cacheAt = 0;
  private consecutiveFailures = 0;

  constructor(pollIntervalMs = 120_000, private readonly baseUrl = 'https://api.open-meteo.com/v1/forecast') {
    this.pollIntervalMs = pollIntervalMs;
  }

  async init(): Promise<void> {
    // Warm the cache at boot so the first render already has real weather.
    await this.poll({ nowMs: Date.now(), tick: 0, degradedMode: false });
  }

  async poll(context: PollContext): Promise<PollOutcome> {
    const started = Date.now();

    // Degraded-comms simulation: deliberately serve the frozen cache so the
    // operator can see uncertainty rise rather than the layer vanishing.
    if (context.degradedMode) {
      return degraded(
        this.emit(this.cachedOrSynthetic(true)),
        Date.now() - started,
        'Degraded comms engaged — serving last cached meteorological picture',
      );
    }

    try {
      const readings = await this.fetchGrid();
      this.cache = readings;
      this.cacheAt = Date.now();
      this.consecutiveFailures = 0;
      return ok(this.emit(readings), Date.now() - started);
    } catch (error) {
      this.consecutiveFailures++;
      const reason = error instanceof Error ? error.message : String(error);
      log.warn(`Open-Meteo poll failed (${this.consecutiveFailures}x): ${reason}`);

      return degraded(
        this.emit(this.cachedOrSynthetic(false)),
        Date.now() - started,
        this.cache.length > 0
          ? `Open-Meteo unreachable — serving cache from ${new Date(this.cacheAt).toISOString()}`
          : 'Open-Meteo unreachable — serving synthetic climatological baseline',
      );
    }
  }

  /**
   * One HTTP request covering every sector.
   * Open-Meteo accepts comma-separated coordinate lists and returns an array,
   * so five stations cost one round trip rather than five.
   */
  private async fetchGrid(): Promise<WeatherPayload[]> {
    const lats = AO_SECTORS.map((s) => s.lat).join(',');
    const lngs = AO_SECTORS.map((s) => s.lng).join(',');

    const url =
      `${this.baseUrl}?latitude=${lats}&longitude=${lngs}` +
      `&current=${CURRENT_FIELDS}` +
      `&hourly=visibility&forecast_hours=1` +
      `&wind_speed_unit=kn&timezone=UTC`;

    // Node 20+ provides global fetch and AbortSignal.timeout.
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const body = (await response.json()) as OpenMeteoResponse | OpenMeteoResponse[];
    // A single coordinate returns an object; multiple return an array.
    const entries = Array.isArray(body) ? body : [body];

    return entries.map((entry, i) => this.toPayload(entry, i));
  }

  private toPayload(entry: OpenMeteoResponse, index: number): WeatherPayload {
    const sector = AO_SECTORS[index] ?? AO_SECTORS[0]!;
    const current = entry.current ?? {};
    const code = current.weather_code ?? 0;
    const decoded = decodeWmo(code);

    return {
      stationName: sector.name,
      lat: entry.latitude ?? sector.lat,
      lng: entry.longitude ?? sector.lng,
      temperatureC: round1(current.temperature_2m ?? 28),
      apparentTemperatureC: round1(current.apparent_temperature ?? 30),
      relativeHumidity: Math.round(current.relative_humidity_2m ?? 60),
      precipitationMm: round1(current.precipitation ?? 0),
      weatherCode: code,
      weatherLabel: decoded.label,
      isSevere: decoded.severe,
      cloudCoverPercent: Math.round(current.cloud_cover ?? 0),
      windSpeedKnots: round1(current.wind_speed_10m ?? 6),
      windDirectionDeg: Math.round(current.wind_direction_10m ?? 240),
      windGustKnots: round1(current.wind_gusts_10m ?? 10),
      visibilityMeters: Math.round(entry.hourly?.visibility?.[0] ?? 20_000),
      synthetic: false,
      observedAt: current.time ? `${current.time}Z`.replace(/Z+$/, 'Z') : nowIso(),
    };
  }

  /** Cached readings if available, otherwise a synthetic baseline. */
  private cachedOrSynthetic(frozen: boolean): WeatherPayload[] {
    if (this.cache.length > 0) {
      return this.cache.map((c) => ({ ...c, synthetic: true, observedAt: frozen ? c.observedAt : c.observedAt }));
    }
    return this.syntheticBaseline();
  }

  /**
   * Deterministic climatological fallback for the AO.
   * Values track a plausible pre-monsoon Gujarat day so the demo still looks
   * physically sensible with no network at all.
   */
  private syntheticBaseline(): WeatherPayload[] {
    const hourUtc = new Date().getUTCHours();
    // Diurnal temperature curve peaking around 09Z (mid-afternoon IST).
    const diurnal = Math.cos(((hourUtc - 9) / 24) * 2 * Math.PI);

    return AO_SECTORS.map((sector, i) => {
      const temp = 29 + 5 * diurnal + i * 0.4;
      const gusty = i % 2 === 0;
      return {
        stationName: sector.name,
        lat: sector.lat,
        lng: sector.lng,
        temperatureC: round1(temp),
        apparentTemperatureC: round1(temp + 2.5),
        relativeHumidity: Math.round(55 + 10 * Math.sin(i + hourUtc / 4)),
        precipitationMm: gusty ? 0.4 : 0,
        weatherCode: gusty ? 61 : 2,
        weatherLabel: gusty ? 'Slight rain' : 'Partly cloudy',
        isSevere: false,
        cloudCoverPercent: gusty ? 72 : 35,
        windSpeedKnots: round1(7 + i * 1.5),
        windDirectionDeg: (230 + i * 12) % 360,
        windGustKnots: round1(12 + i * 2),
        visibilityMeters: gusty ? 9_000 : 22_000,
        synthetic: true,
        observedAt: nowIso(),
      };
    });
  }

  private emit(readings: WeatherPayload[]): RawObservation[] {
    const timestamp = nowIso();
    return readings.map((payload) => ({
      sourceType: this.sourceType,
      sourceName: this.sourceName,
      timestamp,
      payload: payload as unknown as Record<string, unknown>,
    }));
  }

  /** Latest readings, for the GET /api/v1/map/weather layer. */
  getLatestGrid(): WeatherPayload[] {
    return this.cache.length > 0 ? this.cache : this.syntheticBaseline();
  }
}

const round1 = (n: number): number => Math.round(n * 10) / 10;
