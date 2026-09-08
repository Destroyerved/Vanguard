import { Injectable } from '@nestjs/common';
import { EventStore } from '../../database/event-store.interface.js';
import { AnomalyService } from './anomaly.service.js';

export interface Conflict {
  eventId: string;
  location: string;
  confidence: number;
  sourceType: string;
  timestamp: string;
}

@Injectable()
export class IntelligenceService {
  constructor(
    private readonly store: EventStore,
    private readonly anomaly: AnomalyService,
  ) {}

  /**
   * Flag events whose source observations disagree (e.g. conflicting
   * severities reported near the same location/time).
   */
  async conflicts(): Promise<Conflict[]> {
    const events = await this.store.findAll();
    const flagged: Conflict[] = [];

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i];
        const b = events[j];
        const sameArea =
          Math.abs(a.location.lat - b.location.lat) < 0.05 &&
          Math.abs(a.location.lng - b.location.lng) < 0.05;
        const sameWindow = Math.abs(
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        ) < 10 * 60 * 1000;
        const disagrees = a.severity !== b.severity && a.sourceType !== b.sourceType;

        if (sameArea && sameWindow && disagrees) {
          flagged.push({
            eventId: b.id,
            location: `${a.location.lat.toFixed(3)}, ${a.location.lng.toFixed(3)}`,
            confidence: b.confidence,
            sourceType: b.sourceType,
            timestamp: b.timestamp,
          });
        }
      }
    }
    return flagged;
  }

  async anomalies() {
    const events = await this.store.findAll();
    return events.filter((e) => this.anomaly.isAnomaly(e));
  }
}