import { Injectable } from '@nestjs/common';
import { SEVERITY_ORDER } from '../../common/constants/index.js';
import type { PriorityLevel, UnifiedEvent } from '../../common/types/index.js';

export interface PrioritizedAlert {
  priority: PriorityLevel;
  score: number;
  event: UnifiedEvent;
}

@Injectable()
export class PriorityService {
  /**
   * Alert priority (PRD §5.1): weighted evaluation of severity, confidence,
   * recency, corroboration count, and geographic relevance.
   */
  prioritize(event: UnifiedEvent, corroborationCount = 0): PrioritizedAlert {
    const severityScore = SEVERITY_ORDER[event.severity] / 4;
    const confidenceScore = (event.confidence ?? 0) / 100;

    const age = Math.max(0, Date.now() - new Date(event.timestamp).getTime());
    const recencyScore = Math.exp(-(age / (60 * 60 * 1000)));

    const corroborationScore = Math.min(1, corroborationCount / 3);

    const score =
      (severityScore * 0.35 +
        confidenceScore * 0.2 +
        recencyScore * 0.2 +
        corroborationScore * 0.25) *
      100;

    const priority = this.level(score, event.severity);
    return { priority, score: Math.round(score), event };
  }

  private level(score: number, severity: string): PriorityLevel {
    if (score >= 80 || severity === 'critical') return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }
}
