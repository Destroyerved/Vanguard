import { Injectable } from '@nestjs/common';
import { EventEmitter2 as EventEmitter } from '@nestjs/event-emitter';

export interface StreamEvent<T = unknown> {
  type: 'EVENT_STREAM' | 'ALERT_TRIGGER' | 'BRIEFING_UPDATE' | 'HEALTH_STATUS';
  payload: T;
}

@Injectable()
export class StreamBus {
  constructor(private readonly emitter: EventEmitter) {}

  emit<T>(type: StreamEvent['type'], payload: T): void {
    this.emitter.emit('stream.message', { type, payload } satisfies StreamEvent<T>);
  }

  subscribe(callback: (event: StreamEvent) => void): () => void {
    const listener = (event: StreamEvent) => callback(event);
    this.emitter.on('stream.message', listener);
    return () => this.emitter.off('stream.message', listener);
  }
}