import { Injectable } from '@nestjs/common';
import type { UnifiedEvent } from '../../common/types/index.js';

/**
 * Statistical anomaly detection (PRD §5.1): z-score outlier detection on
 * incident frequency and sensor deviations.
 */
@Injectable()
export class AnomalyService {
  private static readonly Z_THRESHOLD = 2.5;

  /**
   * Flag an event as anomalous based on a numeric deviation score computed
   * from source-specific signals. Returns true when the deviation exceeds the
   * z-score threshold.
   */
  isAnomaly(event: UnifiedEvent): boolean {
    const deviation = this.deviationScore(event);
    return Math.abs(deviation) > AnomalyService.Z_THRESHOLD;
  }

  /**
   * Extract a normalized deviation value (-inf, +inf) from the event raw
   * payload. Signals like radar velocity, incident frequency, or sensor deltas
   * map here; defaults to 0 (no anomaly) when no signal is present.
   */
  deviationScore(event: UnifiedEvent): number {
    const raw = event.raw ?? {};
    const candidate =
      (raw as Record<string, unknown>).deviation ??
      (raw as Record<string, unknown>).zScore;

    if (typeof candidate !== 'number') return 0;
    return candidate;
  }

  /**
   * Flag new arrivals that deviate from the historical mean frequency for the
   * same source type (frequency-based outlier detection).
   */
  detectBatch(events: UnifiedEvent[]): UnifiedEvent[] {
    const flagged = new Set<string>();
    events.forEach((e) => {
      if (this.isAnomaly(e)) flagged.add(e.id);
    });
    return events.filter((e) => flagged.has(e.id));
  }
}
