/**
 * VANGUARD — Operator simulation controls.
 *
 *   POST /api/v1/simulation/scenario   trigger a coordinated demo scenario
 *   POST /api/v1/simulation/inject     drop a hypothetical incident (what-if)
 *   POST /api/v1/simulation/degraded   engage or clear degraded comms
 *   POST /api/v1/simulation/reset      clear all state
 *   GET  /api/v1/simulation/scenarios  list available scenarios
 *
 * These endpoints are what turn the demo from a narration into a live
 * demonstration: the operator changes the world and the whole pipeline
 * visibly reacts — correlation, escalation, threat rise, re-briefing.
 *
 * Gated behind ENABLE_SIMULATION_API so a deployment can serve the read-only
 * operational picture without exposing controls that mutate it.
 */

import { Router } from 'express';
import type { Orchestrator } from '../../orchestrator/Orchestrator.js';
import type { ScenarioName } from '../../ingestion/incidents.sim.js';
import { env } from '../../config/env.js';
import { ApiError } from '../middleware/errors.js';

const SCENARIOS: {
  name: ScenarioName;
  label: string;
  description: string;
  expectedEffect: string;
}[] = [
  {
    name: 'border_spike',
    label: 'Coordinated Border Spike',
    description:
      'Seven unauthorized-entry reports across a 3.5km front, plus two non-squawking fast contacts.',
    expectedEffect:
      'Rate anomaly detector fires on the incident feed; correlation forms a multi-source cluster; severity escalates one tier; posture rises toward ORANGE/RED.',
  },
  {
    name: 'perimeter_breach',
    label: 'Localized Perimeter Breach',
    description: 'Five tightly clustered entry reports within 1.2km, plus supporting radar contacts.',
    expectedEffect:
      'Tight spatial clustering drives high spatial-agreement scores; perimeter sensors trip and corroborate; confidence climbs above the 85% critical-promotion threshold.',
  },
  {
    name: 'severe_weather_impact',
    label: 'Severe Weather Impact',
    description: 'Six equipment failures spread across 8km, with no accompanying air activity.',
    expectedEffect:
      'Wide spatial spread produces weaker clustering; the briefing recommends re-weighting sensors rather than committing assets.',
  },
  {
    name: 'mass_casualty',
    label: 'Mass Casualty Event',
    description: 'Eight medical dispatches inside a 900m radius.',
    expectedEffect:
      'Casualty counts drive events straight to CRITICAL; prioritized actions reorder toward evacuation and medical response.',
  },
];

export function simulationRoutes(orchestrator: Orchestrator): Router {
  const router = Router();

  // One guard for the whole router rather than a repeated check per handler.
  router.use((_req, _res, next) => {
    if (!env.enableSimulationApi) {
      next(ApiError.forbidden('Simulation API is disabled (set ENABLE_SIMULATION_API=true)'));
      return;
    }
    next();
  });

  /** The scenarios available to the operator, with their expected effects. */
  router.get('/scenarios', (_req, res) => {
    res.json({ scenarios: SCENARIOS });
  });

  /** Trigger a coordinated scenario at an optional epicentre. */
  router.post('/scenario', (req, res) => {
    const name = req.body?.scenario ?? req.body?.name;
    const known = SCENARIOS.find((s) => s.name === name);

    if (!known) {
      throw ApiError.badRequest(
        `Unknown scenario '${String(name)}'`,
        { available: SCENARIOS.map((s) => s.name) },
      );
    }

    const at =
      typeof req.body?.lat === 'number' && typeof req.body?.lng === 'number'
        ? { lat: req.body.lat as number, lng: req.body.lng as number }
        : undefined;

    if (at && (at.lat < -90 || at.lat > 90 || at.lng < -180 || at.lng > 180)) {
      throw ApiError.badRequest('Epicentre coordinates are outside the WGS-84 domain');
    }

    const result = orchestrator.triggerScenario(known.name, at);

    res.json({
      ...result,
      label: known.label,
      description: known.description,
      expectedEffect: known.expectedEffect,
      note: 'Reports drain over the next few ticks so the spike arrives as a realistic burst.',
    });
  });

  /** Inject a single hypothetical incident — the what-if sandbox. */
  router.post('/inject', (req, res) => {
    const lat = req.body?.lat;
    const lng = req.body?.lng;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw ApiError.badRequest("Request body must include numeric 'lat' and 'lng'");
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw ApiError.badRequest('Coordinates are outside the WGS-84 domain');
    }

    const severity = req.body?.severity;
    if (
      severity !== undefined &&
      !['low', 'medium', 'high', 'critical'].includes(String(severity))
    ) {
      throw ApiError.badRequest("'severity' must be one of low, medium, high, critical");
    }

    const event = orchestrator.injectIncident({
      lat,
      lng,
      title: typeof req.body?.title === 'string' ? req.body.title : undefined,
      severity: severity as 'low' | 'medium' | 'high' | 'critical' | undefined,
    });

    if (!event) throw ApiError.badRequest('Injected incident failed validation');

    res.json({
      event,
      note: 'The injected event enters the next fusion pass and will be correlated with real activity.',
    });
  });

  /** Engage or clear degraded-comms simulation. */
  router.post('/degraded', (req, res) => {
    const enabled = req.body?.enabled;
    if (typeof enabled !== 'boolean') {
      throw ApiError.badRequest("Request body must include a boolean 'enabled'");
    }

    const result = orchestrator.setDegradedMode(enabled);

    res.json({
      ...result,
      effect: enabled
        ? 'All feeds marked down. Effective reliability drops to 40% of nominal, so every confidence score across the picture falls — degradation propagates into the fusion math rather than being a banner.'
        : 'Feeds restored to live. Confidence scores return to nominal on the next fusion pass.',
    });
  });

  /** Clear every event, the threat timeline and the cached briefing. */
  router.post('/reset', (_req, res) => {
    orchestrator.reset();
    res.json({
      reset: true,
      note: 'Store, threat timeline and briefing cache cleared. Ingestion continues from a clean picture.',
    });
  });

  return router;
}
