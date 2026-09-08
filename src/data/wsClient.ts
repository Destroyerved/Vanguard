/**
 * VANGUARD — push-only WebSocket client for ws://HOST:PORT/stream.
 *
 * The server sends 11 typed frames and a monotonic per-connection `seq`; a
 * missing sequence number means a frame was dropped, so we tell the caller to
 * re-sync the whole picture over REST rather than render a stale-but-live COP.
 * The socket is deliberately one-directional (inbound client frames ignored).
 */

import { WS_URL } from './apiClient';

/** The 11 server push frame types (server/src/types/ws.ts). */
export type LiveFrame =
  | { type: 'HELLO'; timestamp: string; seq: number; payload: { serverVersion: string; tickIntervalMs: number; degradedMode: boolean } }
  | { type: 'EVENT_STREAM'; timestamp: string; seq: number; payload: { events: import('../types/schema').UnifiedEvent[] } }
  | { type: 'ALERT_TRIGGER'; timestamp: string; seq: number; payload: { event: import('../types/schema').UnifiedEvent; cluster?: import('../types/schema').CorrelationCluster } }
  | { type: 'BRIEFING_UPDATE'; timestamp: string; seq: number; payload: { summary: import('../types/schema').AISummary } }
  | { type: 'HEALTH_STATUS'; timestamp: string; seq: number; payload: { sources: import('../types/schema').SourceHealthDetail[] } }
  | { type: 'SITUATION_UPDATE'; timestamp: string; seq: number; payload: { situation: import('../types/schema').SituationSnapshot } }
  | { type: 'ESCALATION'; timestamp: string; seq: number; payload: { record: import('../types/schema').EscalationRecord } }
  | { type: 'CLUSTER_UPDATE'; timestamp: string; seq: number; payload: { clusters: import('../types/schema').CorrelationCluster[] } }
  | { type: 'ASSET_UPDATE'; timestamp: string; seq: number; payload: { assets: import('../types/schema').TacticalAsset[] } }
  | { type: 'METRICS'; timestamp: string; seq: number; payload: { metrics: import('../types/schema').SystemMetrics } }
  | { type: 'DEGRADED_MODE'; timestamp: string; seq: number; payload: { enabled: boolean; reason: string } };

export type FrameHandlers = {
  hello?: (payload: LiveFrame & { type: 'HELLO' }) => void;
  eventStream?: (payload: ImportedFrame<'EVENT_STREAM'>) => void;
  alertTrigger?: (payload: ImportedFrame<'ALERT_TRIGGER'>) => void;
  briefingUpdate?: (payload: ImportedFrame<'BRIEFING_UPDATE'>) => void;
  healthStatus?: (payload: ImportedFrame<'HEALTH_STATUS'>) => void;
  situationUpdate?: (payload: ImportedFrame<'SITUATION_UPDATE'>) => void;
  escalation?: (payload: ImportedFrame<'ESCALATION'>) => void;
  clusterUpdate?: (payload: ImportedFrame<'CLUSTER_UPDATE'>) => void;
  assetUpdate?: (payload: ImportedFrame<'ASSET_UPDATE'>) => void;
  metrics?: (payload: ImportedFrame<'METRICS'>) => void;
  degradedMode?: (payload: ImportedFrame<'DEGRADED_MODE'>) => void;
  /** Invoked when frames were dropped (seq gap) or the socket transitions state. */
  resync?: (reason: string) => void;
  state?: (state: 'connecting' | 'open' | 'closed' | 'reconnecting') => void;
};

type ImportedFrame<T extends LiveFrame['type']> = Extract<LiveFrame, { type: T }>;

const NOT_OPEN_STATES = (typeof WebSocket !== 'undefined' ? [WebSocket.CLOSED, WebSocket.CLOSING] : [3, 2]).map(String);

export class LiveStreamClient {
  private socket: WebSocket | null = null;
  private lastSeq = 0;
  private manualClose = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly url: string;
  private readonly handlers: FrameHandlers;

  constructor(url: string = WS_URL, handlers: FrameHandlers = {}) {
    this.url = url;
    this.handlers = handlers;
  }

  connect(): void {
    this.manualClose = false;
    this.handlers.state?.('connecting');

    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = ws;

    ws.onopen = () => {
      this.lastSeq = 0;
      this.handlers.state?.('open');
    };

    ws.onmessage = (event: MessageEvent) => {
      let frame: LiveFrame;
      try {
        frame = JSON.parse(String(event.data)) as LiveFrame;
      } catch {
        return; // malformed frame — ignore, never crash the operator UI
      }

      if (typeof frame.seq === 'number') {
        if (this.lastSeq !== 0 && frame.seq !== this.lastSeq + 1) {
          this.handlers.resync?.(
            `Frame gap detected (seq ${frame.seq} after ${this.lastSeq}) — re-syncing over REST`,
          );
        }
        this.lastSeq = frame.seq;
      }

      switch (frame.type) {
        case 'HELLO':
          this.handlers.hello?.(frame as LiveFrame & { type: 'HELLO' });
          break;
        case 'EVENT_STREAM':
          this.handlers.eventStream?.(frame as ImportedFrame<'EVENT_STREAM'>);
          break;
        case 'ALERT_TRIGGER':
          this.handlers.alertTrigger?.(frame as ImportedFrame<'ALERT_TRIGGER'>);
          break;
        case 'BRIEFING_UPDATE':
          this.handlers.briefingUpdate?.(frame as ImportedFrame<'BRIEFING_UPDATE'>);
          break;
        case 'HEALTH_STATUS':
          this.handlers.healthStatus?.(frame as ImportedFrame<'HEALTH_STATUS'>);
          break;
        case 'SITUATION_UPDATE':
          this.handlers.situationUpdate?.(frame as ImportedFrame<'SITUATION_UPDATE'>);
          break;
        case 'ESCALATION':
          this.handlers.escalation?.(frame as ImportedFrame<'ESCALATION'>);
          break;
        case 'CLUSTER_UPDATE':
          this.handlers.clusterUpdate?.(frame as ImportedFrame<'CLUSTER_UPDATE'>);
          break;
        case 'ASSET_UPDATE':
          this.handlers.assetUpdate?.(frame as ImportedFrame<'ASSET_UPDATE'>);
          break;
        case 'METRICS':
          this.handlers.metrics?.(frame as ImportedFrame<'METRICS'>);
          break;
        case 'DEGRADED_MODE':
          this.handlers.degradedMode?.(frame as ImportedFrame<'DEGRADED_MODE'>);
          break;
      }
    };

    ws.onerror = () => {
      // close handler will drive reconnection
    };

    ws.onclose = () => {
      this.socket = null;
      if (NOT_OPEN_STATES.includes(String(ws.readyState))) {
        this.handlers.state?.('closed');
      }
      if (!this.manualClose) {
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    this.handlers.state?.('reconnecting');
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 3000);
  }

  /** True while the socket is open and frames are flowing. */
  get isLive(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  close(): void {
    this.manualClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.close(1000, 'Client closing');
    this.socket = null;
    this.handlers.state?.('closed');
  }
}