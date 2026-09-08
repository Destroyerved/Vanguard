import type { Zone } from '../common/types/index.js';

export abstract class ZoneStore {
  abstract findAll(): Promise<Zone[]>;
  abstract save(zone: Zone): Promise<Zone>;
}

export class InMemoryZoneStore extends ZoneStore {
  private readonly zones = new Map<string, Zone>();

  async findAll(): Promise<Zone[]> {
    return Array.from(this.zones.values());
  }

  async save(zone: Zone): Promise<Zone> {
    this.zones.set(zone.id, zone);
    return zone;
  }
}