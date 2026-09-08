import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LiveStreamClient } from './wsClient';

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = FakeWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    instances.push(this);
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  simulateFrame(frame: unknown) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }

  simulateMalformed() {
    this.onmessage?.({ data: 'not-json{{{' });
  }
}

let instances: FakeWebSocket[] = [];
const lastSocket = () => instances[instances.length - 1];

describe('LiveStreamClient', () => {
  beforeEach(() => {
    instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('connects and reports the open state after HELLO', () => {
    const states: string[] = [];
    const client = new LiveStreamClient('ws://test/stream', { state: (s) => states.push(s) });
    client.connect();

    const ws = lastSocket();
    expect(ws).toBeTruthy();
    expect(ws.url).toBe('ws://test/stream');
    ws.open();
    ws.simulateFrame({
      type: 'HELLO',
      timestamp: 't',
      seq: 1,
      payload: { serverVersion: '1', tickIntervalMs: 300, degradedMode: false },
    });
    expect(states).toContain('open');
  });

  it('is open (live) while the socket is readable', () => {
    const client = new LiveStreamClient('ws://test/stream');
    client.connect();
    lastSocket().open();
    expect(client.isLive).toBe(true);
  });

  it('dispatches typed frames to the matching handler', () => {
    const events: unknown[] = [];
    const client = new LiveStreamClient('ws://test/stream', {
      eventStream: (f) => events.push(f.payload.events),
      situationUpdate: (f) => events.push(f.payload.situation),
      briefingUpdate: (f) => events.push(f.payload.summary),
    });
    client.connect();
    const ws = lastSocket();
    ws.open();
    ws.simulateFrame({ type: 'EVENT_STREAM', timestamp: 't', seq: 1, payload: { events: [{ id: 'E1' }] } });
    ws.simulateFrame({ type: 'SITUATION_UPDATE', timestamp: 't', seq: 2, payload: { situation: { threatLevel: 'red' } } });
    ws.simulateFrame({ type: 'BRIEFING_UPDATE', timestamp: 't', seq: 3, payload: { summary: { headline: 'H' } } });
    expect(events).toHaveLength(3);
    expect(events[0]).toEqual([{ id: 'E1' }]);
  });

  it('covers the alert / escalation / health / cluster frames', () => {
    const called: string[] = [];
    const client = new LiveStreamClient('ws://test/stream', {
      alertTrigger: () => called.push('alert'),
      escalation: () => called.push('escalation'),
      healthStatus: () => called.push('health'),
      clusterUpdate: () => called.push('clusters'),
      degradedMode: () => called.push('degraded'),
    });
    client.connect();
    const ws = lastSocket();
    ws.open();
    ws.simulateFrame({ type: 'ALERT_TRIGGER', timestamp: 't', seq: 1, payload: { event: null } });
    ws.simulateFrame({ type: 'ESCALATION', timestamp: 't', seq: 2, payload: { record: { id: 'e' } } });
    ws.simulateFrame({ type: 'HEALTH_STATUS', timestamp: 't', seq: 3, payload: { sources: [] } });
    ws.simulateFrame({ type: 'CLUSTER_UPDATE', timestamp: 't', seq: 4, payload: { clusters: [] } });
    ws.simulateFrame({ type: 'DEGRADED_MODE', timestamp: 't', seq: 5, payload: { enabled: true, reason: 'x' } });
    expect(called).toEqual(['alert', 'escalation', 'health', 'clusters', 'degraded']);
  });

  it('signals a resync when a seq gap is detected', () => {
    const reasons: string[] = [];
    const client = new LiveStreamClient('ws://test/stream', { resync: (r) => reasons.push(r) });
    client.connect();
    const ws = lastSocket();
    ws.open();
    ws.simulateFrame({ type: 'HELLO', timestamp: 't', seq: 1, payload: {} });
    ws.simulateFrame({ type: 'EVENT_STREAM', timestamp: 't', seq: 3, payload: { events: [] } });
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('seq 3 after 1');
  });

  it('does not flag the very first frame as a gap', () => {
    const reasons: string[] = [];
    const client = new LiveStreamClient('ws://test/stream', { resync: (r) => reasons.push(r) });
    client.connect();
    lastSocket().open();
    lastSocket().simulateFrame({ type: 'HELLO', timestamp: 't', seq: 42, payload: {} });
    expect(reasons).toHaveLength(0);
  });

  it('ignores malformed frames without crashing', () => {
    const client = new LiveStreamClient('ws://test/stream');
    client.connect();
    const ws = lastSocket();
    ws.open();
    expect(() => ws.simulateMalformed()).not.toThrow();
  });

  it('enters reconnecting state on unexpected close and stops after close()', () => {
    vi.useFakeTimers();
    const states: string[] = [];
    const client = new LiveStreamClient('ws://test/stream', { state: (s) => states.push(s) });
    client.connect();
    lastSocket().open();
    lastSocket().close();
    expect(states).toContain('reconnecting');
    client.close();
    expect(states).toContain('closed');
  });
});