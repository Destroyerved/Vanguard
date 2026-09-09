/**
 * VANGUARD — Visual Intelligence routes.
 *
 *   GET /api/v1/vision                      video evidence events, filterable
 *   GET /api/v1/vision/summary              §33 panel rollup
 *   GET /api/v1/vision/contradictions       surfaced §28 refuted claims
 *   GET /api/v1/vision/diagnostics          per-camera tracker state
 *   GET /api/v1/vision/:id                  one full visual evidence bundle
 *
 * Every video event behind the fusion pipeline carries a structured
 * `VisualEvidence` bundle — detections, tracks, forensics, claims and
 * contradictions — and this is the operator's window into it. Refuted claims
 * are ALWAYS presented (§15/§28): the operator sees both the statement and the
 * evidence that refuted it, never a silent discard.
 */

import { Router } from 'express';
import type { Orchestrator } from '../../orchestrator/Orchestrator.js';
import { confidenceBand } from '../../fusion/confidence.js';
import type {
  UnifiedEvent,
  VisualContradiction,
  VisualManipulationClass,
} from '../../types/events.js';
import { humanAge } from '../../util/time.js';
import { ApiError } from '../middleware/errors.js';
import { bool, int, pagination, str } from '../middleware/query.js';

const CLASSIFICATION_ORDER: VisualManipulationClass[] = [
  'AUTHENTIC',
  'EDITED',
  'ENHANCED',
  'SUSPICIOUS_MANIPULATION',
  'POTENTIAL_SYNTHETIC',
  'UNKNOWN',
];

/** Events carrying a visual evidence bundle, newest first. */
function visionEvents(orchestrator: Orchestrator): UnifiedEvent[] {
  return orchestrator.store
    .active()
    .filter((e) => e.visualEvidence !== undefined)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));
}

export function visionRoutes(orchestrator: Orchestrator): Router {
  const router = Router();

  /** Video evidence events, filterable by classification / manipulation. */
  router.get('/', (req, res) => {
    const classification = str(req, 'classification');
    const manipulated = bool(req, 'manipulated');
    const minAuthenticity = int(req, 'minAuthenticity', { min: 0, max: 100 });
    const camera = str(req, 'camera');
    const { limit, offset } = pagination(req);

    let videos = visionEvents(orchestrator);
    if (classification) {
      const requested = classification.toUpperCase().replace(/[^A-Z_]/g, '') as VisualManipulationClass;
      if (!CLASSIFICATION_ORDER.includes(requested)) {
        throw ApiError.badRequest(
          `Unknown classification '${classification}'. Valid: ${CLASSIFICATION_ORDER.join(', ')}`,
        );
      }
      videos = videos.filter((e) => e.visualEvidence!.forensics.classification === requested);
    }
    if (manipulated === true) {
      videos = videos.filter((e) => e.visualEvidence!.manipulated === true);
    } else if (manipulated === false) {
      videos = videos.filter((e) => e.visualEvidence!.manipulated === false);
    }
    if (minAuthenticity !== undefined) {
      videos = videos.filter(
        (e) => e.visualEvidence!.forensics.authenticityScore >= minAuthenticity,
      );
    }
    if (camera) {
      videos = videos.filter((e) => e.visualEvidence!.cameraId === camera);
    }

    const page = videos.slice(offset, offset + limit);
    res.json({
      count: page.length,
      total: videos.length,
      classificationOrder: CLASSIFICATION_ORDER,
      videos: page.map((e) => ({
        event: e,
        confidenceBand: confidenceBand(e.confidence),
        age: humanAge(e.timestamp),
      })),
    });
  });

  /** §33 panel rollup — the numbers the drawer renders. */
  router.get('/summary', (_req, res) => {
    res.json(orchestrator.getVisionSummary());
  });

  /** Every surfaced contradiction, with BOTH sides in view (§28). */
  router.get('/contradictions', (_req, res) => {
    const rows: {
      contradiction: VisualContradiction;
      event: {
        id: string;
        title: string;
        cameraId: string;
        cameraName: string;
        severity: string;
        confidence: number;
        clusterId?: string;
      };
      age: string;
    }[] = [];

    for (const event of visionEvents(orchestrator)) {
      const evidence = event.visualEvidence!;
      const contradictions = evidence.contradictions ?? [];
      for (const contradiction of contradictions) {
        rows.push({
          contradiction,
          event: {
            id: event.id,
            title: event.title,
            cameraId: evidence.cameraId,
            cameraName: evidence.cameraName,
            severity: event.severity,
            confidence: event.confidence,
            clusterId: event.clusterId,
          },
          age: humanAge(event.timestamp),
        });
      }
    }

    res.json({
      count: rows.length,
      contradictions: rows,
    });
  });

  /** Per-camera tracker state for the diagnostics drawer. */
  router.get('/diagnostics', (_req, res) => {
    res.json({
      cameras: orchestrator.getVisionDiagnostics(),
      summary: orchestrator.getVisionSummary(),
    });
  });

  /** One video event with its complete visual evidence bundle. */
  router.get('/:id', (req, res) => {
    const event = orchestrator.store.get(req.params.id!);
    if (!event) throw ApiError.notFound(`No event with id '${req.params.id}'`);
    if (!event.visualEvidence) {
      throw ApiError.notFound(`Event '${req.params.id}' carries no visual evidence bundle`);
    }

    const corroborators = orchestrator.store.getMany(event.corroboratedBy);

    res.json({
      event,
      visualEvidence: event.visualEvidence,
      mediaAudit: event.mediaAudit ?? null,
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