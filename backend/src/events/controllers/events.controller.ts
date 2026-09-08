import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { EventsService } from '../events.service.js';

@Controller('api/v1/events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  async list(
    @Query('source') source?: string,
    @Query('severity') severity?: string,
    @Query('limit') limit?: string,
  ) {
    return this.events.findAll({
      sourceType: source,
      severity,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const event = await this.events.findById(id);
    if (!event) throw new NotFoundException(`Event ${id} not found`);
    return event;
  }

  @Get(':id/correlations')
  async correlations(@Param('id') id: string) {
    const correlations = await this.events.findCorrelations(id);
    return correlations;
  }
}
