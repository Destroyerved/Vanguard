import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BACKEND_URL,
  getEvents,
  getSituation,
  getCorrelations,
  postQuery,
} from './apiClient';

function mockFetchOnce(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const mock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 500 ? 'Internal Server Error' : 'OK',
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

describe('apiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET /events hits the typed endpoint with a limit query param', async () => {
    const body = { events: [], count: 0, total: 0, limit: 500, offset: 0 };
    const mock = mockFetchOnce(200, body);

    const res = await getEvents(500);
    expect(mock).toHaveBeenCalledTimes(1);
    const [url, init] = mock.mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/events?limit=500`);
    expect(init.headers).toEqual(expect.objectContaining({ 'Content-Type': 'application/json' }));
    expect(init.method).toBeUndefined();
    expect(res).toEqual(body);
  });

  it('GET /situation/current returns the server rollup', async () => {
    const body = {
      situation: { threatLevel: 'orange', threatScore: 180, totalEvents: 12, headline: 'Test' },
      sources: [],
      clusters: 2,
      lastEscalation: null,
    };
    mockFetchOnce(200, body);
    const res = await getSituation();
    expect(res.situation.threatScore).toBe(180);
    expect(res.clusters).toBe(2);
  });

  it('surfaces HTTP errors with status and path', async () => {
    mockFetchOnce(500, { error: { message: 'boom' } });
    await expect(getEvents()).rejects.toMatchObject({ name: 'ApiError', status: 500, path: '/events?limit=500' });
  });

  it('categories a network failure as status 0 (backend unreachable)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(getSituation()).rejects.toMatchObject({ name: 'ApiError', status: 0 });
  });

  it('POST /ai/query sends the query as JSON body', async () => {
    mockFetchOnce(200, {
      query: 'critical radar contacts',
      interpretation: 'filter radar',
      parser: 'heuristic',
      latencyMs: 12,
      matchedEventIds: ['RADAR-01'],
      matchCount: 1,
      filter: {},
      events: [],
    });
    const res = await postQuery('critical radar contacts');
    expect(res.matchedEventIds).toContain('RADAR-01');
    expect(res.parser).toBe('heuristic');
  });

  it('GET /events/:id/correlations encodes the event id', async () => {
    mockFetchOnce(200, { eventId: 'EVT-101', confidence: {}, counterfactual: {}, corroboration: {}, correlationWindows: {}, cluster: null, event: {} });
    const res = await getCorrelations('EVT/101');
    const url = vi.mocked(fetch).mock.calls[0][0];
    expect(url).toContain(encodeURIComponent('EVT/101'));
    expect(res.eventId).toBe('EVT-101');
  });
});