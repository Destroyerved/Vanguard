/**
 * VANGUARD — Threat posture state machine.
 *
 * Holds the current threat level, applies hysteresis to every proposed change,
 * and maintains the escalation audit log that backs the alert timeline.
 *
 * Every transition is recorded with its numeric score, its cause, and the
 * specific events responsible. "The system went RED" is never an unexplained
 * UI state change — it is an entry an operator can open and interrogate.
 */

import { ESCALATION_LOG_CAPACITY } from '../config/constants.js';
import type { ThreatLevel, UnifiedEvent } from '../types/events.js';
import type { EscalationRecord } from '../types/health.js';
import { nextEscalationId } from '../util/ids.js';
import { createLogger } from '../util/logger.js';
import { nowIso } from '../util/time.js';
import { applyHysteresis, threatRank, type ThreatAssessment } from '../fusion/severity.js';

const log = createLogger('threat');

export class ThreatState {
  private level: ThreatLevel = 'green';
  private score = 0;
  private readonly timeline: EscalationRecord[] = [];
  private lastChangeAt = nowIso();

  /**
   * Feed a fresh assessment in. Returns the escalation record when the posture
   * actually changed, or null when it held.
   */
  update(assessment: ThreatAssessment, events: UnifiedEvent[]): EscalationRecord | null {
    this.score = assessment.score;

    const settled = applyHysteresis(this.level, assessment.level, assessment.score);
    if (settled === this.level) return null;

    const from = this.level;
    this.level = settled;
    this.lastChangeAt = nowIso();

    const escalating = threatRank(settled) > threatRank(from);
    const byId = new Map(events.map((e) => [e.id, e]));

    // Attribute the change to the events actually driving the score, not to
    // whatever happened to arrive last.
    const triggerEventIds = assessment.topContributors
      .map((c) => c.eventId)
      .filter((id) => byId.has(id))
      .slice(0, 5);

    const record: EscalationRecord = {
      id: nextEscalationId(),
      timestamp: this.lastChangeAt,
      from,
      to: settled,
      score: assessment.score,
      reason: escalating
        ? `Escalated to ${settled.toUpperCase()}: ${assessment.reason}`
        : `De-escalated to ${settled.toUpperCase()}: ${assessment.reason}`,
      triggerEventIds,
    };

    this.timeline.unshift(record);
    while (this.timeline.length > ESCALATION_LOG_CAPACITY) this.timeline.pop();

    log.info(
      `THREAT ${from.toUpperCase()} -> ${settled.toUpperCase()} (score ${assessment.score.toFixed(1)})`,
    );

    return record;
  }

  /** Current posture. */
  getLevel(): ThreatLevel {
    return this.level;
  }

  /** Current continuous score behind the posture. */
  getScore(): number {
    return this.score;
  }

  /** Escalation history, newest first. */
  getTimeline(limit = 50): EscalationRecord[] {
    return this.timeline.slice(0, limit);
  }

  /** ISO timestamp of the last posture change. */
  getLastChangeAt(): string {
    return this.lastChangeAt;
  }

  /**
   * Force a posture, bypassing hysteresis. Used only by the what-if sandbox and
   * the demo scenario controls, and always logged as operator-initiated so the
   * timeline never implies the engine reached this state on its own.
   */
  forceLevel(level: ThreatLevel, reason: string): EscalationRecord {
    const from = this.level;
    this.level = level;
    this.lastChangeAt = nowIso();

    const record: EscalationRecord = {
      id: nextEscalationId(),
      timestamp: this.lastChangeAt,
      from,
      to: level,
      score: this.score,
      reason: `[OPERATOR OVERRIDE] ${reason}`,
      triggerEventIds: [],
    };

    this.timeline.unshift(record);
    while (this.timeline.length > ESCALATION_LOG_CAPACITY) this.timeline.pop();
    return record;
  }

  /** Reset to GREEN with an empty timeline. Simulation reset only. */
  reset(): void {
    this.level = 'green';
    this.score = 0;
    this.timeline.length = 0;
    this.lastChangeAt = nowIso();
  }
}
