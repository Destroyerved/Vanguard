import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StreamBus } from './stream.bus.js';
import { StreamGateway } from './stream.gateway.js';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
  ],
  providers: [StreamBus, StreamGateway],
  exports: [StreamBus],
})
export class StreamModule {}