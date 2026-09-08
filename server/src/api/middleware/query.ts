/**
 * VANGUARD — Query-parameter parsing and validation.
 *
 * Express hands every query value through as `string | string[] | undefined`.
 * These helpers turn that into validated typed values, rejecting bad input at
 * the boundary with a 400 rather than letting a NaN propagate into the fusion
 * math where it would surface much later as an unexplainable score.
 */

import type { Request } from 'express';
import { MAX_EVENTS_PER_RESPONSE } from '../../config/constants.js';
import type { SeverityLevel, SourceType } from '../../types/events.js';
import { SEVERITY_ORDER, SOURCE_TYPES } from '../../types/events.js';
import { ApiError } from './errors.js';

/** First value of a possibly-repeated query parameter. */
function first(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

/** Split a comma-separated (or repeated) parameter into trimmed values. */
export function csv(req: Request, name: string): string[] | undefined {
  const raw = req.query[name];
  if (raw === undefined) return undefined;

  const values = Array.isArray(raw) ? raw.map(String) : String(raw).split(',');
  const cleaned = values.map((v) => v.trim()).filter((v) => v.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
}

/** Parse and validate a `source` parameter. */
export function sourceTypes(req: Request, name = 'source'): SourceType[] | undefined {
  const values = csv(req, name);
  if (!values) return undefined;

  const invalid = values.filter((v) => !SOURCE_TYPES.includes(v as SourceType));
  if (invalid.length > 0) {
    throw ApiError.badRequest(
      `Invalid ${name} value(s): ${invalid.join(', ')}`,
      { allowed: SOURCE_TYPES },
    );
  }
  return values as SourceType[];
}

/** Parse and validate a `severity` parameter. */
export function severities(req: Request, name = 'severity'): SeverityLevel[] | undefined {
  const values = csv(req, name);
  if (!values) return undefined;

  const invalid = values.filter((v) => !SEVERITY_ORDER.includes(v as SeverityLevel));
  if (invalid.length > 0) {
    throw ApiError.badRequest(
      `Invalid ${name} value(s): ${invalid.join(', ')}`,
      { allowed: SEVERITY_ORDER },
    );
  }
  return values as SeverityLevel[];
}

/** Parse an integer parameter, enforcing bounds. */
export function int(
  req: Request,
  name: string,
  options: { min?: number; max?: number; fallback?: number } = {},
): number | undefined {
  const raw = first(req.query[name]);
  if (raw === undefined) return options.fallback;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw ApiError.badRequest(`Query parameter '${name}' must be a number, received '${raw}'`);
  }

  const value = Math.round(parsed);
  if (options.min !== undefined && value < options.min) {
    throw ApiError.badRequest(`Query parameter '${name}' must be >= ${options.min}`);
  }
  if (options.max !== undefined && value > options.max) {
    throw ApiError.badRequest(`Query parameter '${name}' must be <= ${options.max}`);
  }
  return value;
}

/** Parse a float parameter, enforcing bounds. */
export function float(
  req: Request,
  name: string,
  options: { min?: number; max?: number } = {},
): number | undefined {
  const raw = first(req.query[name]);
  if (raw === undefined) return undefined;

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw ApiError.badRequest(`Query parameter '${name}' must be a number, received '${raw}'`);
  }
  if (options.min !== undefined && value < options.min) {
    throw ApiError.badRequest(`Query parameter '${name}' must be >= ${options.min}`);
  }
  if (options.max !== undefined && value > options.max) {
    throw ApiError.badRequest(`Query parameter '${name}' must be <= ${options.max}`);
  }
  return value;
}

/** Parse a boolean parameter (`true`/`1`/`yes` are true). */
export function bool(req: Request, name: string): boolean | undefined {
  const raw = first(req.query[name]);
  if (raw === undefined) return undefined;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

/** Parse a plain string parameter. */
export function str(req: Request, name: string): string | undefined {
  const raw = first(req.query[name]);
  return raw !== undefined && raw.trim().length > 0 ? raw.trim() : undefined;
}

/** Standard `limit`/`offset` pagination, capped at the response maximum. */
export function pagination(req: Request): { limit: number; offset: number } {
  return {
    limit: int(req, 'limit', { min: 1, max: MAX_EVENTS_PER_RESPONSE, fallback: MAX_EVENTS_PER_RESPONSE })!,
    offset: int(req, 'offset', { min: 0, fallback: 0 })!,
  };
}

/**
 * Parse a `near=lat,lng,radiusKm` spatial constraint.
 * One combined parameter rather than three keeps a partially-specified circle
 * from silently becoming a query over the whole world.
 */
export function near(
  req: Request,
): { lat: number; lng: number; radiusMeters: number } | undefined {
  const raw = str(req, 'near');
  if (!raw) return undefined;

  const parts = raw.split(',').map((p) => Number(p.trim()));
  if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) {
    throw ApiError.badRequest("Query parameter 'near' must be 'lat,lng,radiusKm'");
  }

  const [lat, lng, radiusKm] = parts as [number, number, number];
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw ApiError.badRequest("Query parameter 'near' coordinates are outside the WGS-84 domain");
  }
  if (radiusKm <= 0) {
    throw ApiError.badRequest("Query parameter 'near' radius must be positive");
  }

  return { lat, lng, radiusMeters: radiusKm * 1000 };
}
