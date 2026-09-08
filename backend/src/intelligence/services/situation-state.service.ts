import { Injectable } from '@nestjs/common';
import { EventStore } from '../../database/event-store.interface.js';
import { PriorityService } from './priority.service.js';
import { SituationService } from './situation.service.js';
import type { SituationState, SituationTimelineEntry, UnifiedEvent } from '../../common/types/index.js';

@Injectable()
export class SituationStateService {
  private current?: SituationState;
  private timeline: SituationTimelineEntry[] = [];

  constructor(
    private readonly store: EventStore,
    private readonly priority: PriorityService,
    private readonly situation: SituationService,
  ) {}

  async refresh(): Promise<SituationState> {
    const events = await this.store.findAll();
    const alerts = events.map((e) => this.priority.prioritize(e, e.corroboratedBy.length));
    const next = this.situation.buildState(
      alerts.map((a) => ({ priority: a.priority })),
    );

    const currentLevel = this.current?.threatLevel ?? 'green';
    if (next.threatLevel !== currentLevel) {
      const trigger = this.findTriggerEvent(events, next.threatLevel);
      this.timeline = this.situation.escalation(this.timeline, next.threatLevel, trigger);
    }

    this.current = next;
    return next;
  }

  getCurrent(): SituationState | undefined {
    return this.current;
  }

  getTimeline(): SituationTimelineEntry[] {
    return this.timeline;
  }

  private findTriggerEvent(events: UnifiedEvent[], level: string): UnifiedEvent | undefined {
    const sorted = [...events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return sorted.find((e) => this.situation.computeThreatLevel([
      { priority: this.priority.prioritize(e).priority },
    ]) === level);
  }
}
