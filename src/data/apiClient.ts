/**
 * VANGUARD — typed REST client for the fusion backend (server/).
 *
 * Every function returns the server contract (see types/schema.ts). Calls are
 * aborted after a short timeout so a missing backend degrades to the app's
 * resilient fallback rather than hanging the polling loop.
 */

import type {
  AnomaliesResponse,
  BriefingLatestResponse,
  BriefingPostResponse,
  CandidatesResponse,
  ClustersResponse,
  CorrelationsResponse,
  EventsResponse,
  NLQueryResponse,
  SituationCurrentResponse,
  SituationTimelineResponse,
  SourceHealthResponse,
  SystemMetrics,
} from '../types/schema';

export const BACKEND_URL = 'http://localhost:3001/api/v1';
export const WS_URL = 'ws://localhost:3001/stream';

const DEFAULT_TIMEOUT_MS = 4000;

class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly path: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
  } catch (err) {
    const cause = err instanceof Error ? err : new Error(String(err));
    throw new ApiError(
      `Request to ${path} failed: ${cause.message}`,
      0,
      path,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? detail;
    } catch {
      /* non-JSON error body — keep statusText */
    }
    throw new ApiError(detail, res.status, path);
  }

  return (await res.json()) as T;
}

/** GET /situation/current — posture, source health, clusters, last escalation. */
export const getSituation = () => request<SituationCurrentResponse>('/situation/current');

/** GET /situation/timeline — chronological escalation audit log. */
export const getTimeline = (limit = 200) =>
  request<SituationTimelineResponse>(`/situation/timeline?limit=${limit}`);

/** GET /events — active events (capped at 500 to keep the polling loop fast). */
export const getEvents = (limit = 500) => request<EventsResponse>(`/events?limit=${limit}`);

/** GET /intelligence/source-health — per-feed liveness + aggregate. */
export const getSourceHealth = () => request<SourceHealthResponse>('/intelligence/source-health');

/** GET /intelligence/clusters — current correlation clusters with members. */
export const getClusters = (limit = 50) =>
  request<ClustersResponse>(`/intelligence/clusters?limit=${limit}`);

/** GET /intelligence/anomalies — statistical outliers with detector attribution. */
export const getAnomalies = () => request<AnomaliesResponse>('/intelligence/anomalies');

/** GET /intelligence/metrics — process + pipeline telemetry. */
export const getMetrics = () => request<{ metrics: SystemMetrics }>('/intelligence/metrics');

/** GET /ai/briefing/latest — cached briefing; never blocks on inference. */
export const getBriefingLatest = () => request<BriefingLatestResponse>('/ai/briefing/latest');

/** POST /ai/briefing — force a fresh synthesis (optionally deterministic). */
export const postBriefing = (deterministic = false) =>
  request<BriefingPostResponse>('/ai/briefing', {
    method: 'POST',
    body: JSON.stringify({ deterministic }),
  });

/** GET /events/:id/correlations — the explainability drawer payload. */
export const getCorrelations = (id: string) =>
  request<CorrelationsResponse>(`/events/${encodeURIComponent(id)}/correlations`);

/** GET /events/:id/candidates — correlation links the engine rejected, and why. */
export const getCandidates = (id: string) =>
  request<CandidatesResponse>(`/events/${encodeURIComponent(id)}/candidates`);

/** POST /ai/query — natural-language omnibar against the live store. */
export const postQuery = (query: string) =>
  request<NLQueryResponse>('/ai/query', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });

/** POST /simulation/degraded — cut or restore comms across all feeds. */
export const postDegraded = (enabled: boolean) =>
  request<{ enabled: boolean; reason: string }>('/simulation/degraded', {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });

/** POST /simulation/scenario — inject a named scenario into the pipeline. */
export const postScenario = (scenario: string) =>
  request<{ scenario: string; status: string }>('/simulation/scenario', {
    method: 'POST',
    body: JSON.stringify({ scenario }),
  });