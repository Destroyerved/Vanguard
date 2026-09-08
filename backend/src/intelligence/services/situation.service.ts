import { Injectable } from '@nestjs/common';
import { PRIORITY_ORDER } from '../../common/constants/index.js';
import type {
  PriorityLevel,
  SituationState,
  SituationTimelineEntry,
  ThreatLevel,
  UnifiedEvent,
} from '../../common/types/index.js';

@Injectable()
export class SituationService {
  /**
   * Derive an aggregate threat level from the highest-priority active alert
   * and current alert distribution.
   */
  computeThreatLevel(alerts: { priority: PriorityLevel }[]): ThreatLevel {
    if (alerts.length === 0) return 'green';

    let worst = 0;
    for (const a of alerts) {
      worst = Math.max(worst, PRIORITY_ORDER[a.priority]);
    }
    if (worst >= 4) return 'red';
    if (worst >= 3) return 'orange';
    if (worst >= 2) return 'yellow';
    return 'green';
  }

  buildState(alerts: { priority: PriorityLevel }[], generatedAt = new Date().toISOString()): SituationState {
    const threatLevel = this.computeThreatLevel(alerts);
    const activeAlertsCount = alerts.length;
    return {
      threatLevel,
      activeAlertsCount,
      generatedAt,
      summary: this.summary(threatLevel, activeAlertsCount),
    };
  }

  private summary(threatLevel: ThreatLevel, activeAlertsCount: number): string {
    const levelLabel = threatLevel.toUpperCase();
    if (activeAlertsCount === 0) {
      return `System nominal. No active alerts. Threat level ${levelLabel}.`;
    }
    return `Threat level ${levelLabel}. ${activeAlertsCount} active alert(s) requiring attention.`;
  }

  escalation(timeline: SituationTimelineEntry[], newThreatLevel: ThreatLevel, triggerEvent?: UnifiedEvent): SituationTimelineEntry[] {
    const latest = timeline[timeline.length - 1];
    const prevLevel = latest ? latest.threatLevel : 'green';
    if (prevLevel === newThreatLevel) return timeline;

    const entry: SituationTimelineEntry = {
      timestamp: new Date().toISOString(),
      threatLevel: newThreatLevel,
      triggerEventId: triggerEvent?.id,
    };
    return [...timeline, entry];
  }
}
