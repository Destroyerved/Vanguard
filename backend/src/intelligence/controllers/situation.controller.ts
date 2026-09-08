import { Controller, Get } from '@nestjs/common';
import { SituationStateService } from '../services/situation-state.service.js';

@Controller('api/v1/situation')
export class SituationController {
  constructor(private readonly state: SituationStateService) {}

  @Get('current')
  async current() {
    await this.state.refresh();
    return this.state.getCurrent();
  }

  @Get('timeline')
  async timeline() {
    await this.state.refresh();
    return this.state.getTimeline();
  }
}
