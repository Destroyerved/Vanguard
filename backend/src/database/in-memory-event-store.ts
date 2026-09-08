import { Injectable, Logger } from '@nestjs/common';
import type { UnifiedEvent } from '../common/types/index.js';
import { EventFilter, EventStore } from './event-store.interface.js';

@Injectable()
export class InMemoryEventStore extends EventStore {
  private readonly logger = new Logger(InMemoryEventStore.name);
  private readonly events = new Map<string, UnifiedEvent>();

  async save(event: UnifiedEvent): Promise<UnifiedEvent> {
    this.events.set(event.id, event);
    return event;
  }

  async findById(id: string): Promise<UnifiedEvent | undefined> {
    return this.events.get(id);
  }

  async findAll(filter: EventFilter = {}): Promise<UnifiedEvent[]> {
    const all = Array.from(this.events.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    const filtered = all.filter((e) => {
      if (filter.sourceType && e.sourceType !== filter.sourceType) return false;
      if (filter.severity && e.severity !== filter.severity) return false;
      return true;
    });
    if (filter.limit && filter.limit > 0) {
      return filtered.slice(0, filter.limit);
    }
    return filtered;
  }

  async findByCorroboration(ids: string[]): Promise<UnifiedEvent[]> {
    return ids
      .map((id) => this.events.get(id))
      .filter((e): e is UnifiedEvent => e !== undefined);
  }

  async clear(): Promise<void> {
    this.events.clear();
    this.logger.log('Event store cleared');
  }
}