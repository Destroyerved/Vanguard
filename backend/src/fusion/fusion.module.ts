import { Module } from '@nestjs/common';
import { FusionService } from './services/fusion.service.js';

@Module({
  providers: [FusionService],
  exports: [FusionService],
})
export class FusionModule {}