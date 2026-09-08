import { Controller, Get } from '@nestjs/common';
import { IntelligenceService } from '../services/intelligence.service.js';
import { SourceHealthService } from '../services/source-health.service.js';

@Controller('api/v1/intelligence')
export class IntelligenceController {
  constructor(
    private readonly intelligence: IntelligenceService,
    private readonly health: SourceHealthService,
  ) {}

  @Get('source-health')
  async sourceHealth() {
    return this.health.getAll();
  }

  @Get('conflicts')
  async conflicts() {
    return this.intelligence.conflicts();
  }

  @Get('anomalies')
  async anomalies() {
    return this.intelligence.anomalies();
  }
}