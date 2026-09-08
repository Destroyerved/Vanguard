import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { EventsModule } from './events/events.module.js';
import { FusionModule } from './fusion/fusion.module.js';
import { IntelligenceModule } from './intelligence/intelligence.module.js';
import { StreamModule } from './stream/stream.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    StreamModule,
    FusionModule,
    IntelligenceModule,
    EventsModule,
  ],
})
export class AppModule {}