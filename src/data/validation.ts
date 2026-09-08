/**
 * Vanguard Zod Runtime Validation Module
 * Enforces strict runtime validation for UnifiedEvent payloads (PRD §7.1).
 */

import { z } from 'zod';
import { UnifiedEvent } from '../types/schema';

export const GeoLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  altitudeMeters: z.number().optional(),
  headingDegrees: z.number().min(0).max(360).optional(),
  speedKnots: z.number().min(0).optional(),
});

export const ConfidenceBreakdownSchema = z.object({
  overall: z.number().min(0).max(100),
  sourceAgreement: z.number().min(0).max(100),
  spatialAgreement: z.number().min(0).max(100),
  temporalAgreement: z.number().min(0).max(100),
  sourceReliability: z.number().min(0).max(100),
  dataFreshness: z.number().min(0).max(100),
});

export const UnifiedEventSchema = z.object({
  id: z.string().min(1),
  sourceType: z.enum(['radar', 'weather', 'personnel', 'log', 'incident']),
  timestamp: z.string(),
  location: GeoLocationSchema,
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(1),
  description: z.string(),
  confidence: z.number().min(0).max(100),
  confidenceBreakdown: ConfidenceBreakdownSchema.optional(),
  corroboratedBy: z.array(z.string()),
  isAnomaly: z.boolean(),
  raw: z.record(z.string(), z.unknown()),
});

export function validateUnifiedEvent(payload: unknown): UnifiedEvent {
  return UnifiedEventSchema.parse(payload) as UnifiedEvent;
}
