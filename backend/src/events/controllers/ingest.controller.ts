import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IngestionPipeline } from '../services/ingestion-pipeline.service.js';
import { CreateEventDto } from '../dto/create-event.dto.js';
import type { UnifiedEvent } from '../../common/types/index.js';

@Controller('api/v1/events')
export class IngestController {
  constructor(private readonly pipeline: IngestionPipeline) {}

  /**
   * Generic event ingestion endpoint (B-17). Accepts any source type and maps
   * it through validation, deduplication, fusion, and confidence scoring.
   */
  @Post()
  @HttpCode(201)
  async ingest(@Body() dto: CreateEventDto) {
    const event: UnifiedEvent = {
      ...dto,
      corroboratedBy: dto.corroboratedBy ?? [],
      isAnomaly: dto.isAnomaly ?? false,
      confidence: dto.confidence ?? 0,
      raw: dto.raw ?? {},
    };
    return this.pipeline.ingest(event);
  }
}
