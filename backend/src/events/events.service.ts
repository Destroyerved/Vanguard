import { Injectable, Logger } from '@nestjs/common';
import type { UnifiedEvent } from '../common/types/index.js';
import { EventStore } from '../database/event-store.interface.js';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly store: EventStore) {}

  async findAll(filter?: { sourceType?: string; severity?: string; limit?: number }) {
    return this.store.findAll(filter);
  }

  async findById(id: string): Promise<UnifiedEvent | undefined> {
    return this.store.findById(id);
  }

  async findCorrelations(id: string): Promise<UnifiedEvent[]> {
    const event = await this.store.findById(id);
    if (!event) return [];
    return this.store.findByCorroboration(event.corroboratedBy);
  }

  async clear(): Promise<void> {
    await this.store.clear();
  }
}
