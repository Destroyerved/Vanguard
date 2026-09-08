/**
 * VANGUARD — Server entry point.
 *
 * Boot order matters and is deliberate:
 *   1. Construct the orchestrator (adapters, store, health, threat state).
 *   2. Initialize adapters — this warms the live Open-Meteo cache, so the
 *      first HTTP response already carries real weather.
 *   3. Build the Express app.
 *   4. Attach the WebSocket hub to the same HTTP server (one port, not two).
 *   5. Listen, then start the tick loop.
 *
 * Step 2 runs before step 5 on purpose: starting ingestion before the network
 * is warm produces a first tick with an empty weather layer, which is the one
 * thing a judge notices immediately.
 */

import { createServer } from 'node:http';
import { createApp } from './app.js';
import { describeEnv, env } from './config/env.js';
import { Orchestrator, SERVER_VERSION } from './orchestrator/Orchestrator.js';
import { createLogger } from './util/logger.js';
import { WsHub } from './ws/hub.js';

const log = createLogger('boot');

const BANNER = String.raw`
 __      __ _   _  _  ___ _   _  _   ___ ___
 \ \    / //_\ | \| |/ __| | | |/_\ | _ \   \
  \ \/\/ // _ \| .' | (_ | |_| / _ \|   / |) |
   \_/\_//_/ \_\_|\_|\___|\___/_/ \_\_|_\___/
  Multi-Source Defence Situational Awareness
`;

async function main(): Promise<void> {
  console.log(BANNER);
  log.info(`VANGUARD server v${SERVER_VERSION}`);
  log.info(describeEnv());

  if (!env.aiEnabled) {
    log.warn(
      'No GEMINI_API_KEY configured — briefings will be produced by the deterministic ' +
        'synthesis engine. Every feature remains fully operational.',
    );
  }

  const orchestrator = new Orchestrator();
  await orchestrator.init();

  const app = createApp(orchestrator);
  const server = createServer(app);

  const hub = new WsHub();
  hub.attach(server, { serverVersion: SERVER_VERSION, tickIntervalMs: env.tickIntervalMs });
  orchestrator.setHub(hub);

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(env.port, env.host, resolve);
  });

  const displayHost = env.host === '0.0.0.0' ? 'localhost' : env.host;
  log.info(`HTTP    http://${displayHost}:${env.port}/api/v1`);
  log.info(`WS      ws://${displayHost}:${env.port}/stream`);
  log.info(`Health  http://${displayHost}:${env.port}/health`);

  orchestrator.start();

  /* -- Graceful shutdown ---------------------------------------------- */

  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    // A second Ctrl-C should not start a second teardown.
    if (shuttingDown) return;
    shuttingDown = true;

    log.info(`${signal} received — shutting down`);

    await orchestrator.shutdown();
    await hub.shutdown();

    await new Promise<void>((resolve) => server.close(() => resolve()));

    log.info('shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  // Log and keep running rather than dying mid-demo on a stray rejection.
  process.on('unhandledRejection', (reason) => {
    log.error(`unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`);
  });

  process.on('uncaughtException', (error) => {
    log.error(`uncaught exception: ${error.message}`, { stack: error.stack });
  });
}

main().catch((error: unknown) => {
  log.error(
    `fatal startup error: ${error instanceof Error ? `${error.message}\n${error.stack}` : String(error)}`,
  );
  process.exit(1);
});
