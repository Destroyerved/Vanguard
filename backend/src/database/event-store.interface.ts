import type { UnifiedEvent } from '../common/types/index.js';

export interface EventFilter {
  sourceType?: string;
  severity?: string;
  limit?: number;
}

export abstract class EventStore {
  abstract save(event: UnifiedEvent): Promise<UnifiedEvent>;
  abstract findById(id: string): Promise<UnifiedEvent | undefined>;
  abstract findAll(filter?: EventFilter): Promise<UnifiedEvent[]>;
  abstract findByCorroboration(ids: string[]): Promise<UnifiedEvent[]>;
  abstract clear(): Promise<void>;
}