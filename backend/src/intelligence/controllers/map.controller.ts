import { Controller, Get } from '@nestjs/common';
import { MapService } from '../services/map.service.js';

@Controller('api/v1/map')
export class MapController {
  constructor(private readonly map: MapService) {}

  @Get('assets')
  async assets() {
    return this.map.assets();
  }

  @Get('alerts')
  async alerts() {
    return this.map.alerts();
  }

  @Get('weather')
  async weather() {
    return this.map.weather();
  }

  @Get('zones')
  async zones() {
    return this.map.getZones();
  }
}
