/**
 * VANGUARD — Situation routes.
 *
 *   GET /api/v1/situation/current    current posture rollup
 *   GET /api/v1/situation/timeline   threat escalation history
 *   GET /api/v1/situation/replay     point-in-time snapshot (4D time-scrubber)
 */

import { Router } from 'express';
import type { Orchestrator } from '../../orchestrator/Orchestrator.js';
import { EVENT_ACTIVE_HORIZON_SECONDS } from '../../config/constants.js';
import { ApiError } from '../middleware/errors.js';
import { int, pagination } from '../middleware/query.js';

export function situationRoutes(orchestrator: Orchestrator): Router {
  const router = Router();

  /** Everything the top bar of the command center needs, in one call. */
  router.get('/current', (_req, res) => {
    res.json({
      situation: orchestrator.getSituation(),
      sources: orchestrator.getSourceHealth(),
      clusters: orchestrator.getClusters().length,
      lastEscalation: orchestrator.threat.getTimeline(1)[0] ?? null,
    });
  });

  /** Chronological posture-change log, newest first. */
  router.get('/timeline', (req, res) => {
    const limit = int(req, 'limit', { min: 1, max: 200, fallback: 50 })!;
    const timeline = orchestrator.threat.getTimeline(limit);

    res.json({
      timeline,
      count: timeline.length,
      currentLevel: orchestrator.threat.getLevel(),
      currentScore: orchestrator.threat.getScore(),
      lastChangeAt: orchestrator.threat.getLastChangeAt(),
    });
  });

  /**
   * Point-in-time replay — the engine behind the 4D time-scrubber.
   *
   * `at` is epoch milliseconds. The response also carries the store's time
   * bounds so the client can render the scrubber track without a second call.
   */
  router.get('/replay', (req, res) => {
    const bounds = orchestrator.store.timeBounds();
    const at = int(req, 'at', { min: 0 }) ?? bounds.latestMs;

    if (at < bounds.earliestMs - 60_000) {
      throw ApiError.badRequest(
        `Requested instant precedes the retained history window`,
        { earliestMs: bounds.earliestMs, latestMs: bounds.latestMs },
      );
    }

    const { limit, offset } = pagination(req);
    const events = orchestrator.store.snapshotAt(at);

    res.json({
      asOf: new Date(at).toISOString(),
      asOfMs: at,
      bounds: {
        earliestMs: bounds.earliestMs,
        latestMs: bounds.latestMs,
        earliest: new Date(bounds.earliestMs).toISOString(),
        latest: new Date(bounds.latestMs).toISOString(),
        horizonSeconds: EVENT_ACTIVE_HORIZON_SECONDS,
      },
      totalAtInstant: events.length,
      events: events
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
        .slice(offset, offset + limit),
    });
  });

  return router;
}
