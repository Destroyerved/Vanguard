import { Injectable } from '@nestjs/common';
import {
  SOURCE_DISPLAY_NAMES,
  SOURCE_RELIABILITY,
  SOURCE_TYPES,
} from '../../common/constants/index.js';
import { EventStore } from '../../database/event-store.interface.js';
import type { SourceHealth, SourceHealthStatus, SourceType } from '../../common/types/index.js';

@Injectable()
export class SourceHealthService {
  constructor(private readonly store: EventStore) {}

  async getAll(): Promise<SourceHealth[]> {
    const events = await this.store.findAll();
    const now = Date.now();

    return SOURCE_TYPES.map((sourceType) => {
      const sourceEvents = events.filter((e) => e.sourceType === sourceType);
      const latest = sourceEvents.reduce<string | null>(
        (latest, e) =>
          latest === null || new Date(e.timestamp).getTime() > new Date(latest).getTime()
            ? e.timestamp
            : latest,
        null,
      );

      const status = this.status(sourceType, sourceEvents.length, latest, now);
      return {
        sourceType,
        sourceName: SOURCE_DISPLAY_NAMES[sourceType],
        status,
        lastUpdate: latest ?? new Date(0).toISOString(),
        reliabilityScore: SOURCE_RELIABILITY[sourceType],
        activeCount: sourceEvents.length,
      };
    });
  }

  private status(sourceType: SourceType, count: number, latest: string | null, now: number): SourceHealthStatus {
    if (count === 0) return 'down';
    if (latest === null) return 'down';

    const ageMs = now - new Date(latest).getTime();
    if (ageMs > 10 * 60 * 1000) return 'degraded';
    return 'live';
  }
}