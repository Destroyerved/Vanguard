import { Injectable, Logger } from '@nestjs/common';
import { EventStore } from '../../database/event-store.interface.js';
import { FusionService } from '../../fusion/services/fusion.service.js';
import { AnomalyService } from '../../intelligence/services/anomaly.service.js';
import { ConfidenceService } from '../../intelligence/services/confidence.service.js';
import { StreamBus } from '../../stream/stream.bus.js';
import type { UnifiedEvent } from '../../common/types/index.js';

export interface IngestResult {
  event: UnifiedEvent;
  created: boolean;
  duplicateOf?: string;
}

@Injectable()
export class IngestionPipeline {
  private readonly logger = new Logger(IngestionPipeline.name);

  constructor(
    private readonly store: EventStore,
    private readonly fusion: FusionService,
    private readonly confidence: ConfidenceService,
    private readonly anomaly: AnomalyService,
    private readonly stream: StreamBus,
  ) {}

  /**
   * Validate, deduplicate, fuse, score, and persist an incoming event.
   * Returns the stored event (or the deduped duplicate reference).
   */
  async ingest(event: UnifiedEvent): Promise<IngestResult> {
    const existing = await this.store.findById(event.id);
    if (existing) {
      this.logger.debug(`Duplicate event ignored: ${event.id}`);
      return { event: existing, created: false, duplicateOf: existing.id };
    }

    let processed = { ...event };

    const fusion = await this.fusion.fuse(processed);
    processed.corroboratedBy = fusion.corroboratedBy;

    const breakdown = this.confidence.breakdown({
      sourceType: processed.sourceType,
      timestamp: processed.timestamp,
      corroborationCount: processed.corroboratedBy.length,
      sourceAgreement: fusion.sourceAgreement,
      spatialAgreement: fusion.spatialAgreement,
      temporalAgreement: fusion.temporalAgreement,
    });
    processed.confidence = breakdown.overall;
    processed.confidenceBreakdown = breakdown;

    processed.isAnomaly = this.anomaly.isAnomaly(processed);

    const stored = await this.store.save(processed);
    this.logger.log(
      `Ingested event ${stored.id} (${stored.sourceType}) confidence=${stored.confidence}% corroboratedBy=${stored.corroboratedBy.length}`,
    );

    this.stream.emit('EVENT_STREAM', stored);
    if (stored.isAnomaly) {
      this.stream.emit('ALERT_TRIGGER', {
        eventId: stored.id,
        severity: stored.severity,
        confidence: stored.confidence,
        title: stored.title,
      });
    }
    return { event: stored, created: true };
  }
}
