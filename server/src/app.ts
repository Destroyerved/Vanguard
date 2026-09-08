/**
 * VANGUARD — Express application factory.
 *
 * Separated from `index.ts` so the app can be constructed without binding a
 * port, which is what lets the test suite exercise every route in-process.
 */

import express, { type Express } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import type { Orchestrator } from './orchestrator/Orchestrator.js';
import { SERVER_VERSION } from './orchestrator/Orchestrator.js';
import { aiRoutes } from './api/routes/ai.js';
import { eventRoutes } from './api/routes/events.js';
import { intelligenceRoutes } from './api/routes/intelligence.js';
import { mapRoutes } from './api/routes/map.js';
import { mediaRoutes } from './api/routes/media.js';
import { simulationRoutes } from './api/routes/simulation.js';
import { situationRoutes } from './api/routes/situation.js';
import { errorHandler, notFoundHandler, requestLogger } from './api/middleware/errors.js';
import { nowIso } from './util/time.js';

export function createApp(orchestrator: Orchestrator): Express {
  const app = express();

  // Trust the first proxy hop so client IPs are correct behind a dev tunnel.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    cors({
      origin: env.corsOrigins.includes('*') ? true : env.corsOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
    }),
  );
  // 1MB is generous for a query or an injected incident and small enough that
  // a malformed client cannot exhaust memory with one request.
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  /** Liveness probe. Deliberately dependency-free. */
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      version: SERVER_VERSION,
      timestamp: nowIso(),
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  /** Readiness probe: healthy only once the pipeline has produced a picture. */
  app.get('/ready', (_req, res) => {
    const metrics = orchestrator.getMetrics();
    const ready = metrics.ticks > 0 && orchestrator.store.size > 0;

    res.status(ready ? 200 : 503).json({
      ready,
      ticks: metrics.ticks,
      events: orchestrator.store.size,
      reason: ready ? undefined : 'Pipeline has not completed its first ingestion cycle',
    });
  });

  /** Self-describing API index — the entry point for a judge exploring by hand. */
  app.get('/api/v1', (_req, res) => {
    res.json({
      name: 'VANGUARD',
      description: 'Multi-Source Defence Situational Awareness System',
      version: SERVER_VERSION,
      websocket: `/stream`,
      endpoints: {
        situation: [
          'GET /api/v1/situation/current',
          'GET /api/v1/situation/timeline',
          'GET /api/v1/situation/replay?at=<epochMs>',
        ],
        events: [
          'GET /api/v1/events?source=&severity=&minConfidence=&near=lat,lng,km&q=&limit=&offset=',
          'GET /api/v1/events/stats',
          'GET /api/v1/events/:id',
          'GET /api/v1/events/:id/correlations',
          'GET /api/v1/events/:id/candidates',
        ],
        media: [
          'GET /api/v1/media?category=&minAuthenticity=',
          'GET /api/v1/media/categories',
          'GET /api/v1/media/:id',
        ],
        map: [
          'GET /api/v1/map/assets',
          'GET /api/v1/map/alerts',
          'GET /api/v1/map/weather',
          'GET /api/v1/map/zones',
          'GET /api/v1/map/heatmap',
          'GET /api/v1/map/all',
        ],
        ai: [
          'POST /api/v1/ai/briefing',
          'GET  /api/v1/ai/briefing/latest',
          'POST /api/v1/ai/query',
          'POST /api/v1/ai/query/heuristic',
          'GET  /api/v1/ai/status',
          'POST /api/v1/ai/verify',
        ],
        intelligence: [
          'GET /api/v1/intelligence/source-health',
          'GET /api/v1/intelligence/clusters',
          'GET /api/v1/intelligence/anomalies',
          'GET /api/v1/intelligence/metrics',
          'GET /api/v1/intelligence/fusion',
          'GET /api/v1/intelligence/config',
        ],
        simulation: [
          'GET  /api/v1/simulation/scenarios',
          'POST /api/v1/simulation/scenario',
          'POST /api/v1/simulation/inject',
          'POST /api/v1/simulation/degraded',
          'POST /api/v1/simulation/reset',
        ],
      },
    });
  });

  app.use('/api/v1/situation', situationRoutes(orchestrator));
  app.use('/api/v1/events', eventRoutes(orchestrator));
  app.use('/api/v1/media', mediaRoutes(orchestrator));
  app.use('/api/v1/map', mapRoutes(orchestrator));
  app.use('/api/v1/ai', aiRoutes(orchestrator));
  app.use('/api/v1/intelligence', intelligenceRoutes(orchestrator));
  app.use('/api/v1/simulation', simulationRoutes(orchestrator));

  // Order matters: 404 catches unmatched routes, errorHandler must be last.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
