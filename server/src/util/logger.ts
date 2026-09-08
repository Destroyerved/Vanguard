/**
 * VANGUARD — structured console logger.
 *
 * Zero dependencies, level-filtered, with a fixed-width scope column so the
 * boot sequence and tick log read like a system console rather than noise.
 */

import { env } from '../config/env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const LEVEL_TAG: Record<Level, string> = {
  debug: 'DBG',
  info: 'INF',
  warn: 'WRN',
  error: 'ERR',
};

const threshold = LEVEL_RANK[env.logLevel] ?? LEVEL_RANK.info;

function emit(level: Level, scope: string, message: string, meta?: unknown): void {
  if (LEVEL_RANK[level] < threshold) return;

  const stamp = new Date().toISOString().slice(11, 23);
  const line = `${stamp} ${LEVEL_TAG[level]} [${scope.padEnd(12)}] ${message}`;

  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  if (meta === undefined) {
    sink(line);
  } else {
    sink(line, typeof meta === 'string' ? meta : safeJson(meta));
  }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

/** Create a logger bound to a fixed scope, e.g. `createLogger('fusion')`. */
export function createLogger(scope: string): Logger {
  return {
    debug: (m, meta) => emit('debug', scope, m, meta),
    info: (m, meta) => emit('info', scope, m, meta),
    warn: (m, meta) => emit('warn', scope, m, meta),
    error: (m, meta) => emit('error', scope, m, meta),
  };
}

export const logger = createLogger('vanguard');
