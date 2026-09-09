/**
 * VANGUARD — WebSocket stream envelope contracts (ws://HOST:PORT/stream).
 *
 * Every frame is a JSON object with a discriminating `type`, an ISO `timestamp`
 * and a typed `payload`. Clients switch on `type` exhaustively.
 */

import type { UnifiedEvent, CorrelationCluster, TacticalAsset } from './events.js';
import type { AISummary } from './ai.js';
import type { VisionSummary } from './vision.js';
import type {
  EscalationRecord,
  SituationSnapshot,
  SourceHealth,
  SystemMetrics,
} from './health.js';

export type WsMessageType =
  | 'HELLO'
  | 'EVENT_STREAM'
  | 'ALERT_TRIGGER'
  | 'BRIEFING_UPDATE'
  | 'HEALTH_STATUS'
  | 'SITUATION_UPDATE'
  | 'ESCALATION'
  | 'CLUSTER_UPDATE'
  | 'ASSET_UPDATE'
  | 'METRICS'
  | 'DEGRADED_MODE'
  | 'VISION_UPDATE';

interface WsBase<T extends WsMessageType, P> {
  type: T;
  timestamp: string;
  /** Monotonic per-connection sequence number, for client-side gap detection. */
  seq: number;
  payload: P;
}

export type WsMessage =
  | WsBase<'HELLO', { serverVersion: string; tickIntervalMs: number; degradedMode: boolean }>
  | WsBase<'EVENT_STREAM', { events: UnifiedEvent[] }>
  | WsBase<'ALERT_TRIGGER', { event: UnifiedEvent; cluster?: CorrelationCluster }>
  | WsBase<'BRIEFING_UPDATE', { summary: AISummary }>
  | WsBase<'HEALTH_STATUS', { sources: SourceHealth[] }>
  | WsBase<'SITUATION_UPDATE', { situation: SituationSnapshot }>
  | WsBase<'ESCALATION', { record: EscalationRecord }>
  | WsBase<'CLUSTER_UPDATE', { clusters: CorrelationCluster[] }>
  | WsBase<'ASSET_UPDATE', { assets: TacticalAsset[] }>
  | WsBase<'METRICS', { metrics: SystemMetrics }>
  | WsBase<'DEGRADED_MODE', { enabled: boolean; reason: string }>
  | WsBase<'VISION_UPDATE', { summary: VisionSummary }>;
