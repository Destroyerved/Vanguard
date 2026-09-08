/**
 * VANGUARD — API error handling and request instrumentation.
 *
 * Every error leaving the API has the same shape, so a client never has to
 * guess whether a failure produced `{error}`, `{message}` or a raw HTML page.
 */

import type { NextFunction, Request, Response } from 'express';
import { createLogger } from '../../util/logger.js';
import { nowIso } from '../../util/time.js';

const log = createLogger('api');

/** An error carrying an intended HTTP status. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, details);
  }

  static notFound(message: string): ApiError {
    return new ApiError(404, message);
  }

  static forbidden(message: string): ApiError {
    return new ApiError(403, message);
  }
}

/** The single error envelope every failure is rendered into. */
export interface ErrorEnvelope {
  error: {
    status: number;
    message: string;
    details?: unknown;
    path: string;
    timestamp: string;
  };
}

/** Terminal error handler. Must be registered after every route. */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = error instanceof ApiError ? error.status : 500;
  const message =
    error instanceof Error ? error.message : 'Unexpected server error';

  // 5xx means the server is broken and someone needs to see a stack trace;
  // 4xx means the caller sent something wrong and one line is enough.
  if (status >= 500) {
    log.error(`${req.method} ${req.originalUrl} -> ${status}: ${message}`, {
      stack: error instanceof Error ? error.stack : undefined,
    });
  } else {
    log.warn(`${req.method} ${req.originalUrl} -> ${status}: ${message}`);
  }

  const envelope: ErrorEnvelope = {
    error: {
      status,
      message,
      details: error instanceof ApiError ? error.details : undefined,
      path: req.originalUrl,
      timestamp: nowIso(),
    },
  };

  res.status(status).json(envelope);
}

/** 404 handler for unmatched routes. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      status: 404,
      message: `No route matches ${req.method} ${req.originalUrl}`,
      path: req.originalUrl,
      timestamp: nowIso(),
    },
  });
}

/**
 * Wrap an async route handler so a rejected promise reaches `errorHandler`.
 * Express 4 does not forward async rejections on its own; without this an
 * unhandled rejection would hang the request until the client timed out.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}

/** Log every request with its status and duration. */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - started;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'debug';
    log[level](`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
}
