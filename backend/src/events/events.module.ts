import { Module } from '@nestjs/common';
import { EventsService } from './events.service.js';
import { IngestionPipeline } from './services/ingestion-pipeline.service.js';
import { IngestController } from './controllers/ingest.controller.js';
import { EventsController } from './controllers/events.controller.js';
import { FusionModule } from '../fusion/fusion.module.js';
import { IntelligenceModule } from '../intelligence/intelligence.module.js';
import { StreamModule } from '../stream/stream.module.js';

@Module({
  imports: [FusionModule, IntelligenceModule, StreamModule],
  controllers: [IngestController, EventsController],
  providers: [EventsService, IngestionPipeline],
  exports: [EventsService],
})
export class EventsModule {}