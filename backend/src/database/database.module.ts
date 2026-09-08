import { Global, Module } from '@nestjs/common';
import { EventStore } from './event-store.interface.js';
import { InMemoryEventStore } from './in-memory-event-store.js';
import { ZoneStore, InMemoryZoneStore } from './zone-store.interface.js';

@Global()
@Module({
  providers: [
    { provide: EventStore, useClass: InMemoryEventStore },
    { provide: ZoneStore, useClass: InMemoryZoneStore },
  ],
  exports: [EventStore, ZoneStore],
})
export class DatabaseModule {}