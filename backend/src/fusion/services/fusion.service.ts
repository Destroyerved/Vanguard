import { Injectable } from '@nestjs/common';
import {
  SOURCE_RELIABILITY,
  SPATIAL_RADIUS_METERS,
  TEMPORAL_WINDOW_MS,
} from '../../common/constants/index.js';
import { haversineMeters } from '../../common/geo.util.js';
import type { UnifiedEvent } from '../../common/types/index.js';
import { EventStore } from '../../database/event-store.interface.js';

export interface FusionResult {
  event: UnifiedEvent;
  corroboratedBy: string[];
  sourceAgreement: number;
  spatialAgreement: number;
  temporalAgreement: number;
}

@Injectable()
export class FusionService {
  constructor(private readonly store: EventStore) {}

  /**
   * Correlate an incoming event against the existing store and produce the
   * corroboration links and multi-factor agreement scores that feed the
   * confidence engine.
   */
  async fuse(event: UnifiedEvent): Promise<FusionResult> {
    const candidates = await this.store.findAll();

    const corroboratedBy: string[] = [];
    const spatialScore: number[] = [];
    const temporalScore: number[] = [];

    for (const candidate of candidates) {
      if (candidate.id === event.id) continue;

      const distance = haversineMeters(
        candidate.location,
        event.location,
      );
      const timeDelta = Math.abs(
        new Date(candidate.timestamp).getTime() - new Date(event.timestamp).getTime(),
      );

      const spatialMatch = distance <= SPATIAL_RADIUS_METERS;
      const temporalMatch = timeDelta <= TEMPORAL_WINDOW_MS;

      if (spatialMatch && temporalMatch) {
        corroboratedBy.push(candidate.id);
        spatialScore.push(1 - distance / (SPATIAL_RADIUS_METERS * 2));
        temporalScore.push(1 - timeDelta / (TEMPORAL_WINDOW_MS * 2));
      }
    }

    const sourceAgreement = this.sourceAgreement(event, corroboratedBy.length);
    const spatialAgreement =
      spatialScore.length === 0
        ? 1
        : spatialScore.reduce((a, b) => a + b, 0) / spatialScore.length;
    const temporalAgreement =
      temporalScore.length === 0
        ? 1
        : temporalScore.reduce((a, b) => a + b, 0) / temporalScore.length;

    return {
      event,
      corroboratedBy,
      sourceAgreement,
      spatialAgreement,
      temporalAgreement,
    };
  }

  /**
   * Cross-source agreement boosts with corroboration count and degrades when
   * the source's reliability is low relative to corroborating sources.
   */
  private sourceAgreement(event: UnifiedEvent, corroborationCount: number): number {
    const reliability = SOURCE_RELIABILITY[event.sourceType];
    const boost = Math.min(1, 0.5 + 0.1 * corroborationCount);
    return Math.round(reliability * boost * 100) / 100;
  }
}
