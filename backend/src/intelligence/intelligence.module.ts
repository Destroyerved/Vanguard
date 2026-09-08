import { Module } from '@nestjs/common';
import { AnomalyService } from './services/anomaly.service.js';
import { ConfidenceService } from './services/confidence.service.js';
import { IntelligenceService } from './services/intelligence.service.js';
import { MapService } from './services/map.service.js';
import { PriorityService } from './services/priority.service.js';
import { SituationService } from './services/situation.service.js';
import { SituationStateService } from './services/situation-state.service.js';
import { SourceHealthService } from './services/source-health.service.js';
import { IntelligenceController } from './controllers/intelligence.controller.js';
import { MapController } from './controllers/map.controller.js';
import { SituationController } from './controllers/situation.controller.js';

@Module({
  controllers: [
    IntelligenceController,
    MapController,
    SituationController,
  ],
  providers: [
    AnomalyService,
    ConfidenceService,
    IntelligenceService,
    MapService,
    PriorityService,
    SituationService,
    SituationStateService,
    SourceHealthService,
  ],
  exports: [
    AnomalyService,
    ConfidenceService,
    MapService,
    PriorityService,
    SituationService,
    SituationStateService,
  ],
})
export class IntelligenceModule {}