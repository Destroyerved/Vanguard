import { Injectable } from '@nestjs/common';
import { EventStore } from '../../database/event-store.interface.js';
import { PriorityService } from './priority.service.js';
import { ZoneStore } from '../../database/zone-store.interface.js';

@Injectable()
export class MapService {
  constructor(
    private readonly store: EventStore,
    private readonly priority: PriorityService,
    private readonly zones: ZoneStore,
  ) {}

  /**
   * Active alerts derived from stored events, colored by priority.
   */
  async alerts() {
    const events = await this.store.findAll();
    return events.map((e) => {
      const p = this.priority.prioritize(e, e.corroboratedBy.length);
      return {
        id: e.id,
        priority: p.priority,
        title: e.title,
        severity: e.severity,
        confidence: e.confidence,
        location: e.location,
        corroboratedBy: e.corroboratedBy.length,
        timestamp: e.timestamp,
      };
    });
  }

  async getZones() {
    return this.zones.findAll();
  }

  /**
   * Assets, weather grid, and hotspots are populated by the (future) data
   * source ingestion layer. These return structured empty envelopes so the
   * API contract holds.
   */
  async assets(): Promise<unknown[]> {
    return [];
  }

  async weather(): Promise<unknown> {
    return { source: 'open-meteo', grid: [], updatedAt: null };
  }
}
