/**
 * VANGUARD — Media authenticity routes.
 *
 *   GET /api/v1/media                   media events, filterable by verdict
 *   GET /api/v1/media/categories        per-category audit breakdown
 *   GET /api/v1/media/:id               one full media authenticity audit
 *
 * This is the API surface the media authenticity flow explicitly demands: the
 * operator must be able to surface evidence and its reasons, not just consume a
 * score. Every social-media and audio-recording event behind the fusion
 * pipeline is exposed here with its complete audit — forensic metadata, the
 * per-check scores, the provenance chain, the artifact findings, and the
 * corroboration-derived verdict. Uncertain media is always presented.
 */

import { Router } from 'express';
import type { Orchestrator } from '../../orchestrator/Orchestrator.js';
import { confidenceBand } from '../../fusion/confidence.js';
import type { ManipulationCategory, UnifiedEvent } from '../../types/events.js';
import { humanAge } from '../../util/time.js';
import { ApiError } from '../middleware/errors.js';
import { int, str } from '../middleware/query.js';

const CATEGORY_ORDER: ManipulationCategory[] = [
  'NONE_DETECTED',
  'LEGITIMATE_ENHANCEMENT',
  'HYBRID_CORROBORATED',
  'EVENT_FABRICATING',
  'AUTHENTICITY_UNVERIFIED',
];

export function mediaRoutes(orchestrator: Orchestrator): Router {
  const router = Router();

  /** All media-carrying events, newest first, filterable by verdict. */
  router.get('/', (req, res) => {
    const category = str(req, 'category');
    const minAuthenticity = int(req, 'minAuthenticity', { min: 0, max: 100 });

    const media = orchestrator.store.active().filter(
      (e): e is UnifiedEvent & { mediaAudit: NonNullable<UnifiedEvent['mediaAudit']> } =>
        e.mediaAudit !== undefined,
    );

    const filtered = media.filter((e) => {
      if (category) {
        const requested = category.toUpperCase().replace(/[^A-Z_]/g, '') as ManipulationCategory;
        if (!CATEGORY_ORDER.includes(requested)) {
          throw ApiError.badRequest(
            `Unknown manipulation category '${category}'. Valid: ${CATEGORY_ORDER.join(', ')}`,
          );
        }
        if (e.mediaAudit.manipulationCategory !== requested) return false;
      }
      if (minAuthenticity !== undefined && e.mediaAudit.authenticityScore < minAuthenticity) {
        return false;
      }
      return true;
    });

    res.json({
      count: filtered.length,
      total: media.length,
      media: filtered.map((e) => ({
        event: e,
        confidenceBand: confidenceBand(e.confidence),
        age: humanAge(e.timestamp),
      })),
    });
  });

  /** Aggregate audit breakdown: total per verdict, means, fabrication count. */
  router.get('/categories', (_req, res) => {
    const media = orchestrator.store.active().filter((e) => e.mediaAudit !== undefined);

    const byCategory = CATEGORY_ORDER.reduce(
      (acc, category) => {
        acc[category] = media.filter((e) => e.mediaAudit!.manipulationCategory === category).length;
        return acc;
      },
      {} as Record<ManipulationCategory, number>,
    );

    const mean = (fn: (e: UnifiedEvent) => number, fallback: number): number =>
      media.length === 0
        ? fallback
        : Math.round(media.reduce((s, e) => s + fn(e), 0) / media.length);

    res.json({
      total: media.length,
      byCategory,
      meanAuthenticity: mean((e) => e.mediaAudit!.authenticityScore, 0),
      meanManipulationRisk: mean((e) => e.mediaAudit!.manipulationRisk, 0),
      meanCorroboration: mean((e) => e.mediaAudit!.corroborationScore, 0),
      syntheticItems: media.filter((e) => e.mediaAudit!.aiSyntheticScore >= 45).length,
      categoryOrder: CATEGORY_ORDER,
    });
  });

  /** One event with its complete media authenticity audit. */
  router.get('/:id', (req, res) => {
    const event = orchestrator.store.get(req.params.id!);
    if (!event) throw ApiError.notFound(`No event with id '${req.params.id}'`);
    if (!event.mediaAudit) {
      throw ApiError.notFound(`Event '${req.params.id}' carries no media authenticity audit`);
    }

    const corroborators = orchestrator.store.getMany(event.corroboratedBy);

    res.json({
      event,
      audit: event.mediaAudit,
      age: humanAge(event.timestamp),
      confidenceBand: confidenceBand(event.confidence),
      corroboration: {
        count: corroborators.length,
        distinctSources: [...new Set(corroborators.map((c) => c.sourceType))],
        events: corroborators,
      },
      cluster: orchestrator.getClusters().find((c) => c.eventIds.includes(event.id)) ?? null,
    });
  });

  return router;
}