/**
 * VANGUARD — Event routes.
 *
 *   GET /api/v1/events                   filtered event feed
 *   GET /api/v1/events/stats             aggregate counts for the charts
 *   GET /api/v1/events/:id               one event
 *   GET /api/v1/events/:id/correlations  corroborating evidence + confidence math
 *
 * The `/correlations` endpoint is the API surface behind the Explainability
 * Drawer, and it is the most important endpoint in the product. It returns not
 * just the corroborating events but the arithmetic that produced the score,
 * so an operator can verify a confidence number instead of trusting it.
 */

import { Router } from 'express';
import type { Orchestrator } from '../../orchestrator/Orchestrator.js';
import {
  CORRELATION_RADIUS_METERS,
  CORRELATION_WINDOW_SECONDS,
} from '../../config/constants.js';
import { computeConfidence, confidenceBand } from '../../fusion/confidence.js';
import { corroborationStrength } from '../../fusion/corroborate.js';
import { haversineMeters } from '../../util/geo.js';
import { deltaSeconds, humanAge } from '../../util/time.js';
import { ApiError } from '../middleware/errors.js';
import { bool, int, near, pagination, severities, sourceTypes, str } from '../middleware/query.js';

export function eventRoutes(orchestrator: Orchestrator): Router {
  const router = Router();

  /**
   * Filtered event feed.
   * Supports ?source= &severity= &minConfidence= &withinSeconds= &anomalies=
   *          &minCorroborations= &near=lat,lng,km &q= &limit= &offset=
   */
  router.get('/', (req, res) => {
    const { limit, offset } = pagination(req);

    const { events, total } = orchestrator.store.queryWithCount({
      sourceTypes: sourceTypes(req),
      severities: severities(req),
      minConfidence: int(req, 'minConfidence', { min: 0, max: 100 }),
      withinSeconds: int(req, 'withinSeconds', { min: 1 }),
      anomaliesOnly: bool(req, 'anomalies'),
      minCorroborations: int(req, 'minCorroborations', { min: 0 }),
      near: near(req),
      text: str(req, 'q'),
      limit,
      offset,
    });

    res.json({ events, count: events.length, total, limit, offset });
  });

  /** Aggregate counts for the severity and source distribution charts. */
  router.get('/stats', (_req, res) => {
    const active = orchestrator.store.active();
    const fusion = orchestrator.getFusion();

    res.json({
      total: active.length,
      bySource: orchestrator.store.countsBySource(),
      bySeverity: orchestrator.store.countsBySeverity(),
      anomalies: active.filter((e) => e.isAnomaly).length,
      corroborated: active.filter((e) => e.corroboratedBy.length > 0).length,
      clusters: fusion?.clusters.length ?? 0,
      meanConfidence:
        active.length === 0
          ? 0
          : Math.round(active.reduce((s, e) => s + e.confidence, 0) / active.length),
      confidenceBands: {
        high: active.filter((e) => e.confidence >= 80).length,
        medium: active.filter((e) => e.confidence >= 50 && e.confidence < 80).length,
        low: active.filter((e) => e.confidence < 50).length,
      },
      escalatedByFusion: active.filter((e) => e.severity !== e.baseSeverity).length,
      lastFusion: fusion?.stats ?? null,
    });
  });

  /** One event by ID. */
  router.get('/:id', (req, res) => {
    const event = orchestrator.store.get(req.params.id!);
    if (!event) throw ApiError.notFound(`No event with id '${req.params.id}'`);

    res.json({
      event,
      confidenceBand: confidenceBand(event.confidence),
      age: humanAge(event.timestamp),
      cluster: orchestrator.getClusters().find((c) => c.eventIds.includes(event.id)) ?? null,
    });
  });

  /**
   * The Explainability Drawer payload.
   *
   * Returns four things a sceptical operator needs to accept a score:
   *   1. the corroborating events themselves,
   *   2. the strength, distance and time offset of each link,
   *   3. the exact multiplicands behind the confidence arithmetic,
   *   4. a counterfactual showing what the score would be with no corroboration.
   *
   * Item 4 is what makes the value of fusion visible: it answers "what did
   * cross-source agreement actually buy me here?" with a number.
   */
  router.get('/:id/correlations', (req, res) => {
    const event = orchestrator.store.get(req.params.id!);
    if (!event) throw ApiError.notFound(`No event with id '${req.params.id}'`);

    const corroborators = orchestrator.store.getMany(event.corroboratedBy);

    const links = corroborators.map((c) => {
      const link = corroborationStrength(event, c);
      return {
        event: c,
        strength: link.strength,
        distanceMeters: link.distanceMeters,
        deltaSeconds: link.deltaSeconds,
        rationale: link.rationale,
      };
    });

    const effectiveReliability = orchestrator.health.effectiveReliability(event.sourceType);

    const scored = computeConfidence({ event, corroborators, effectiveReliability });
    const withoutCorroboration = computeConfidence({
      event,
      corroborators: [],
      effectiveReliability,
    });

    res.json({
      eventId: event.id,
      event,
      confidence: {
        overall: scored.confidence,
        band: confidenceBand(scored.confidence),
        breakdown: scored.breakdown,
        factors: scored.factors,
        formula:
          'confidence = min(100, round(sourceReliability x recencyDecay x mediaAuthenticity x corroborationBoost x 100))',
        explanation: scored.explanation,
      },
      counterfactual: {
        confidenceWithoutCorroboration: withoutCorroboration.confidence,
        confidenceGain: scored.confidence - withoutCorroboration.confidence,
        note:
          'The difference this cross-source corroboration contributed to the score. ' +
          'A gain of zero means the event stands on its own source alone.',
      },
      corroboration: {
        count: links.length,
        distinctSources: [...new Set(corroborators.map((c) => c.sourceType))],
        links,
      },
      correlationWindows: {
        radiusMeters: CORRELATION_RADIUS_METERS,
        windowSeconds: CORRELATION_WINDOW_SECONDS,
      },
      cluster: orchestrator.getClusters().find((c) => c.eventIds.includes(event.id)) ?? null,
    });
  });

  /**
   * Candidate correlations that did NOT make the corroboration cut.
   * Useful in the drawer to show the engine considered and rejected them,
   * rather than appearing to have missed nearby activity entirely.
   */
  router.get('/:id/candidates', (req, res) => {
    const event = orchestrator.store.get(req.params.id!);
    if (!event) throw ApiError.notFound(`No event with id '${req.params.id}'`);

    const selected = new Set(event.corroboratedBy);

    const candidates = orchestrator.store
      .active()
      .filter((other) => other.id !== event.id && !selected.has(other.id))
      .map((other) => ({
        other,
        distanceMeters: Math.round(haversineMeters(event.location, other.location)),
        deltaSeconds: Math.round(deltaSeconds(event.timestamp, other.timestamp)),
      }))
      .filter(
        (c) =>
          c.distanceMeters <= CORRELATION_RADIUS_METERS * 2 &&
          c.deltaSeconds <= CORRELATION_WINDOW_SECONDS * 2,
      )
      .map((c) => {
        const withinSpatial = c.distanceMeters <= CORRELATION_RADIUS_METERS;
        const withinTemporal = c.deltaSeconds <= CORRELATION_WINDOW_SECONDS;
        return {
          eventId: c.other.id,
          sourceType: c.other.sourceType,
          title: c.other.title,
          distanceMeters: c.distanceMeters,
          deltaSeconds: c.deltaSeconds,
          strength: corroborationStrength(event, c.other).strength,
          rejectedBecause: !withinSpatial
            ? `Outside the ${CORRELATION_RADIUS_METERS}m spatial window`
            : !withinTemporal
              ? `Outside the ${CORRELATION_WINDOW_SECONDS}s temporal window`
              : 'Correlated, but a stronger link from the same source type was selected',
        };
      })
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 20);

    res.json({ eventId: event.id, considered: candidates.length, candidates });
  });

  return router;
}
