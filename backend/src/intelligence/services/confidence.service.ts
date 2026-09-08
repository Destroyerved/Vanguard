import { Injectable } from '@nestjs/common';
import { CONFIDENCE, SOURCE_RELIABILITY } from '../../common/constants/index.js';
import type {
  ConfidenceBreakdown,
  SourceType,
  UnifiedEvent,
} from '../../common/types/index.js';

export interface ConfidenceInput {
  sourceType: SourceType;
  timestamp: string;
  corroborationCount: number;
  sourceAgreement: number;
  spatialAgreement: number;
  temporalAgreement: number;
}

@Injectable()
export class ConfidenceService {
  /**
   * PRD §5.1 formula:
   *   Confidence = min(100, round(SourceReliability * RecencyDecay * CorroborationBoost * 100))
   *   RecencyDecay       = e^(-lambda * deltaT)
   *   CorroborationBoost = 1 + 0.15 * (N - 1)
   */
  compute(input: ConfidenceInput): number {
    const { sourceType, timestamp, corroborationCount } = input;
    const reliability = this.sourceReliability(sourceType, timestamp);
    const recency = this.recencyDecay(timestamp);
    const boost = this.corroborationBoost(corroborationCount);
    const raw = reliability * recency * boost * 100;
    return Math.min(CONFIDENCE.MAX, Math.round(raw));
  }

  sourceReliability(sourceType: SourceType, _timestamp?: string): number {
    return SOURCE_RELIABILITY[sourceType];
  }

  recencyDecay(timestamp: string): number {
    const age = Date.now() - new Date(timestamp).getTime();
    if (age <= 0) return 1;
    return Math.exp(-CONFIDENCE.LAMBDA * age);
  }

  corroborationBoost(count: number): number {
    return 1 + CONFIDENCE.CORROBORATION_STEP * (Math.max(1, count) - 1);
  }

  breakdown(input: ConfidenceInput): ConfidenceBreakdown {
    const overall = this.compute(input);
    // Normalize sub-factors to 0-100 percentages.
    return {
      overall,
      sourceAgreement: Math.round(input.sourceAgreement * 100),
      spatialAgreement: Math.round(input.spatialAgreement * 100),
      temporalAgreement: Math.round(input.temporalAgreement * 100),
      sourceReliability: Math.round(this.sourceReliability(input.sourceType) * 100),
      dataFreshness: Math.round(this.recencyDecay(input.timestamp) * 100),
    };
  }

  evaluate(event: UnifiedEvent, corroborationCount: number): number {
    return this.compute({
      sourceType: event.sourceType,
      timestamp: event.timestamp,
      corroborationCount,
      sourceAgreement: 1,
      spatialAgreement: 1,
      temporalAgreement: 1,
    });
  }
}
