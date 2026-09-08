/**
 * VANGUARD — AI intelligence routes.
 *
 *   POST /api/v1/ai/briefing         force a fresh synthesis
 *   GET  /api/v1/ai/briefing/latest  cached briefing (always instant)
 *   POST /api/v1/ai/query            natural-language omnibar
 *   GET  /api/v1/ai/status           which synthesis engine is active
 *   POST /api/v1/ai/verify           re-check a briefing's citations
 */

import { Router } from 'express';
import type { Orchestrator } from '../../orchestrator/Orchestrator.js';
import { generateBriefing } from '../../ai/briefing.js';
import { findUngroundedCitations } from '../../ai/grounding.js';
import { isGeminiAvailable } from '../../ai/gemini.js';
import { parseAndExecuteQuery, parseQueryHeuristic } from '../../ai/nlQuery.js';
import { env } from '../../config/env.js';
import type { AISummary } from '../../types/ai.js';
import { ApiError, asyncHandler } from '../middleware/errors.js';

export function aiRoutes(orchestrator: Orchestrator): Router {
  const router = Router();

  /**
   * Force a fresh briefing.
   * `?deterministic=true` skips Gemini entirely — the switch used on stage to
   * demonstrate that the system stands up without the model.
   */
  router.post(
    '/briefing',
    asyncHandler(async (req, res) => {
      const forceDeterministic =
        req.query.deterministic === 'true' || req.body?.deterministic === true;

      const events = orchestrator.store.active();
      if (events.length === 0) {
        throw ApiError.badRequest('No active events — the pipeline has not ingested anything yet');
      }

      const summary = await generateBriefing({
        events,
        clusters: orchestrator.getClusters(),
        threatLevel: orchestrator.threat.getLevel(),
        threatScore: orchestrator.threat.getScore(),
        degradedFeeds: orchestrator
          .getSourceHealth()
          .filter((s) => s.status !== 'live')
          .map((s) => s.sourceName),
        degradedMode: orchestrator.isDegraded(),
        resolver: orchestrator.store,
        forceDeterministic,
      });

      orchestrator.briefingCache.set(summary);

      res.json({
        summary,
        // Proof, served alongside the claim: after grounding this must be empty.
        groundingVerified: findUngroundedCitations(summary, orchestrator.store).length === 0,
      });
    }),
  );

  /** The cached briefing. Never blocks on inference. */
  router.get('/briefing/latest', (_req, res) => {
    const summary = orchestrator.briefingCache.get();

    if (!summary) {
      res.status(202).json({
        summary: null,
        message: 'No briefing generated yet — the first synthesis is still pending',
        retryAfterMs: env.briefingIntervalMs,
      });
      return;
    }

    res.json({
      summary,
      ageMs: Math.round(orchestrator.briefingCache.ageMs()),
      generating: orchestrator.briefingCache.isGenerating(),
      groundingVerified: findUngroundedCitations(summary, orchestrator.store).length === 0,
    });
  });

  /**
   * Natural-language omnibar.
   * Accepts { query } and returns the parsed filter, a plain-English
   * restatement, and the matching events.
   */
  router.post(
    '/query',
    asyncHandler(async (req, res) => {
      const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
      if (query.length === 0) {
        throw ApiError.badRequest("Request body must include a non-empty 'query' string");
      }
      if (query.length > 500) {
        throw ApiError.badRequest('Query must be 500 characters or fewer');
      }

      const events = orchestrator.store.active();
      const result = await parseAndExecuteQuery(query, events);

      res.json({
        ...result,
        // Return the events themselves, capped, so the feed can render without
        // a second round trip for every matched ID.
        events: events.filter((e) => result.matchedEventIds.includes(e.id)).slice(0, 200),
      });
    }),
  );

  /** Heuristic-only parse — no model call, for latency comparison on stage. */
  router.post('/query/heuristic', (req, res) => {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (query.length === 0) {
      throw ApiError.badRequest("Request body must include a non-empty 'query' string");
    }

    const started = Date.now();
    const { filter, interpretation } = parseQueryHeuristic(query);

    res.json({
      query,
      filter,
      interpretation,
      parser: 'heuristic',
      latencyMs: Date.now() - started,
    });
  });

  /** Which synthesis engine is active, and how the last briefing was produced. */
  router.get('/status', (_req, res) => {
    const summary = orchestrator.briefingCache.get();

    res.json({
      geminiConfigured: isGeminiAvailable(),
      model: isGeminiAvailable() ? env.geminiModel : null,
      activeEngine: isGeminiAvailable() ? 'gemini' : 'deterministic',
      fallbackAvailable: true,
      briefingIntervalMs: env.briefingIntervalMs,
      lastBriefing: summary
        ? {
            generatedAt: summary.generatedAt,
            provenance: summary.provenance,
            developmentCount: summary.keyDevelopments.length,
            coaCount: summary.coursesOfAction.length,
            overallConfidence: summary.overallConfidence,
          }
        : null,
      note:
        'VANGUARD generates a complete, correctly cited briefing with no API key configured. ' +
        'Gemini improves the language; the fusion engine supplies the substance.',
    });
  });

  /**
   * Re-verify a briefing's citations against the live store.
   * Defaults to the cached briefing when no body is supplied — the endpoint a
   * judge can call to confirm the anti-hallucination claim independently.
   */
  router.post('/verify', (req, res) => {
    const candidate: AISummary | null =
      req.body?.summary ?? orchestrator.briefingCache.get();

    if (!candidate) {
      throw ApiError.badRequest('No briefing supplied and no cached briefing available');
    }

    const ungrounded = findUngroundedCitations(candidate, orchestrator.store);

    const allCitations = [
      ...candidate.keyDevelopments.flatMap((k) => k.supportingEventIds),
      ...candidate.prioritizedActions.flatMap((a) => a.supportingEventIds),
      ...candidate.coursesOfAction.flatMap((c) => c.supportingEventIds),
    ];

    res.json({
      verified: ungrounded.length === 0,
      totalCitations: allCitations.length,
      uniqueCitations: new Set(allCitations).size,
      ungroundedCitations: ungrounded,
      provenance: candidate.provenance,
      note:
        ungrounded.length === 0
          ? 'Every cited event ID resolves to a real event in the store.'
          : 'Ungrounded citations found — these were not filtered by the grounding pass.',
    });
  });

  return router;
}
