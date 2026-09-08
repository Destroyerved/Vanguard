/**
 * VANGUARD — Natural-language command omnibar parser.
 *
 * Turns "show me high severity radar contacts near sector 3 in the last hour"
 * into a structured `NLQueryFilter` the event store executes directly.
 *
 * TWO PARSERS, ALWAYS BOTH PRESENT:
 *   - Gemini structured extraction, which handles arbitrary phrasing.
 *   - A deterministic keyword parser, which handles the phrasings an operator
 *     actually types and runs in well under a millisecond.
 *
 * The heuristic parser is not merely a fallback for when the API is down. It
 * always runs first and its result is MERGED UNDER the model's, so a filter the
 * keyword parser is certain about survives even if the model omits it. Belt and
 * braces: the omnibar keeps working with no key, no network, and no latency.
 */

import { AO_SECTORS } from '../config/constants.js';
import type { NLQueryFilter, NLQueryResult } from '../types/ai.js';
import type { SeverityLevel, SourceType, UnifiedEvent } from '../types/events.js';
import { haversineMeters } from '../util/geo.js';
import { createLogger } from '../util/logger.js';
import { generateStructured, isGeminiAvailable } from './gemini.js';
import { buildNLQueryPrompt, NL_QUERY_SCHEMA, NL_QUERY_SYSTEM_INSTRUCTION } from './prompts.js';

const log = createLogger('ai:nlq');

/* ------------------------------------------------------------------ *
 * Heuristic parser
 * ------------------------------------------------------------------ */

const SOURCE_KEYWORDS: Record<SourceType, string[]> = {
  radar: ['radar', 'contact', 'track', 'aircraft', 'drone', 'uav', 'air', 'surveillance'],
  weather: ['weather', 'wind', 'rain', 'storm', 'visibility', 'fog', 'precipitation', 'met'],
  personnel: ['personnel', 'unit', 'patrol', 'squad', 'troop', 'asset', 'callsign', 'readiness'],
  log: ['log', 'sensor', 'perimeter', 'tripwire', 'system', 'network', 'alarm'],
  incident: ['incident', 'report', 'dispatch', 'casualty', 'emergency', 'breach', 'intrusion'],
  social_media: [
    'social', 'social media', 'osint', 'posts', 'post', 'video clip', 'clip', 'footage',
    'deepfake', 'fabricated', 'fake', 'authentic', 'instagram', 'telegram', 'youtube',
  ],
  audio_recording: [
    'audio', 'hydrophone', 'acoustic', 'recording', 'sound', 'waveform', 'voice clip',
  ],
};

const SEVERITY_KEYWORDS: Record<SeverityLevel, string[]> = {
  critical: ['critical', 'severe', 'emergency', 'red'],
  high: ['high', 'urgent', 'serious', 'priority', 'important'],
  medium: ['medium', 'moderate', 'elevated'],
  low: ['low', 'routine', 'minor', 'nominal'],
};

/**
 * Keyword-and-regex parser. Deterministic, instantaneous, and correct for the
 * phrasings an operator under time pressure actually uses.
 */
export function parseQueryHeuristic(query: string): {
  filter: NLQueryFilter;
  interpretation: string;
} {
  const q = query.toLowerCase();
  const filter: NLQueryFilter = {};
  const described: string[] = [];

  // Source types.
  const sources: SourceType[] = [];
  for (const [source, keywords] of Object.entries(SOURCE_KEYWORDS) as [SourceType, string[]][]) {
    if (keywords.some((k) => q.includes(k))) sources.push(source);
  }
  if (sources.length > 0) {
    filter.sourceTypes = sources;
    described.push(`source ${sources.join('/')}`);
  }

  // Severities. "high severity" implies critical too — an operator asking for
  // serious events does not mean "serious but please hide the worst ones".
  const severities: SeverityLevel[] = [];
  for (const [severity, keywords] of Object.entries(SEVERITY_KEYWORDS) as [SeverityLevel, string[]][]) {
    if (keywords.some((k) => q.includes(k))) severities.push(severity);
  }
  if (severities.includes('high') && !severities.includes('critical')) {
    severities.push('critical');
  }
  if (severities.length > 0) {
    filter.severities = severities;
    described.push(`severity ${severities.join('/')}`);
  }

  // Time windows.
  const explicitMinutes = q.match(/(?:last|past|within)\s+(\d+)\s*(min|minute|minutes|m)\b/);
  const explicitHours = q.match(/(?:last|past|within)\s+(\d+)\s*(hour|hours|h|hr|hrs)\b/);

  if (explicitMinutes?.[1]) {
    filter.withinMinutes = Number(explicitMinutes[1]);
  } else if (explicitHours?.[1]) {
    filter.withinMinutes = Number(explicitHours[1]) * 60;
  } else if (/\b(?:past|last)\s+hour\b/.test(q)) {
    filter.withinMinutes = 60;
  } else if (/\b(recent|just now|right now|currently|last few minutes)\b/.test(q)) {
    filter.withinMinutes = 15;
  }
  if (filter.withinMinutes !== undefined) {
    described.push(`within ${filter.withinMinutes} minutes`);
  }

  // Named sector.
  for (const sector of AO_SECTORS) {
    const number = sector.name.match(/\d+/)?.[0];
    const direction = sector.name.split(' ')[2]?.toLowerCase();

    const matchesNumber = number !== undefined && q.includes(`sector ${number}`);
    const matchesDirection =
      direction !== undefined && (q.includes(`${direction}ern`) || q.includes(`${direction} sector`));

    if (matchesNumber || matchesDirection) {
      filter.zoneName = sector.name;
      filter.nearPoint = { lat: sector.lat, lng: sector.lng, radiusKm: sector.radiusMeters / 1000 };
      described.push(`near ${sector.name}`);
      break;
    }
  }

  // Anomalies.
  if (/\b(anomal|unusual|strange|outlier|abnormal|odd)\w*/.test(q)) {
    filter.anomaliesOnly = true;
    described.push('anomalies only');
  }

  // Corroboration.
  if (/\b(corroborat|confirmed|verified|multi-?source|cross-?referenc)\w*/.test(q)) {
    filter.minCorroborations = 1;
    described.push('corroborated only');
  }

  // Explicit confidence threshold.
  const confidence = q.match(/(?:above|over|at least|>=?)\s*(\d{1,3})\s*%/);
  if (confidence?.[1]) {
    filter.minConfidence = Math.min(100, Number(confidence[1]));
    described.push(`confidence >= ${filter.minConfidence}%`);
  } else if (/\bhigh confidence\b/.test(q)) {
    filter.minConfidence = 80;
    described.push('confidence >= 80%');
  }

  const interpretation =
    described.length === 0
      ? 'Showing all events — no filter constraints detected.'
      : `Filtering for ${described.join(', ')}.`;

  return { filter, interpretation };
}

/* ------------------------------------------------------------------ *
 * Gemini parser
 * ------------------------------------------------------------------ */

interface RawFilter {
  interpretation?: string;
  sourceTypes?: string[];
  severities?: string[];
  minConfidence?: number;
  withinMinutes?: number;
  zoneName?: string;
  anomaliesOnly?: boolean;
  minCorroborations?: number;
  textContains?: string;
}

const VALID_SOURCES: SourceType[] = [
  'radar',
  'weather',
  'personnel',
  'log',
  'incident',
  'social_media',
  'audio_recording',
];
const VALID_SEVERITIES: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];

/** Coerce raw model output into a validated filter, dropping anything invalid. */
function shapeFilter(raw: RawFilter): NLQueryFilter {
  const filter: NLQueryFilter = {};

  const sources = (raw.sourceTypes ?? []).filter((s): s is SourceType =>
    VALID_SOURCES.includes(s as SourceType),
  );
  if (sources.length > 0) filter.sourceTypes = sources;

  const severities = (raw.severities ?? []).filter((s): s is SeverityLevel =>
    VALID_SEVERITIES.includes(s as SeverityLevel),
  );
  if (severities.length > 0) filter.severities = severities;

  if (typeof raw.minConfidence === 'number' && raw.minConfidence > 0) {
    filter.minConfidence = Math.min(100, Math.max(0, Math.round(raw.minConfidence)));
  }
  if (typeof raw.withinMinutes === 'number' && raw.withinMinutes > 0) {
    filter.withinMinutes = Math.round(raw.withinMinutes);
  }
  if (typeof raw.anomaliesOnly === 'boolean' && raw.anomaliesOnly) {
    filter.anomaliesOnly = true;
  }
  if (typeof raw.minCorroborations === 'number' && raw.minCorroborations > 0) {
    filter.minCorroborations = Math.round(raw.minCorroborations);
  }
  if (typeof raw.textContains === 'string' && raw.textContains.trim().length > 0) {
    filter.textContains = raw.textContains.trim();
  }

  // Resolve a named zone to real coordinates. The model returns a name; only
  // the server knows where that sector actually is.
  if (typeof raw.zoneName === 'string') {
    const sector = AO_SECTORS.find(
      (s) => s.name.toLowerCase() === raw.zoneName!.toLowerCase().trim(),
    );
    if (sector) {
      filter.zoneName = sector.name;
      filter.nearPoint = {
        lat: sector.lat,
        lng: sector.lng,
        radiusKm: sector.radiusMeters / 1000,
      };
    }
  }

  return filter;
}

/**
 * Parse a query, then execute it against the supplied events.
 *
 * The heuristic parser always runs. When Gemini is available its result is
 * layered on top, with heuristic values filling any field the model omitted.
 */
export async function parseAndExecuteQuery(
  query: string,
  events: UnifiedEvent[],
): Promise<NLQueryResult> {
  const started = Date.now();
  const heuristic = parseQueryHeuristic(query);

  let filter = heuristic.filter;
  let interpretation = heuristic.interpretation;
  let parser: 'gemini' | 'heuristic' = 'heuristic';

  if (isGeminiAvailable()) {
    try {
      const result = await generateStructured<RawFilter>({
        systemInstruction: NL_QUERY_SYSTEM_INSTRUCTION,
        prompt: buildNLQueryPrompt(query),
        schema: NL_QUERY_SCHEMA,
        temperature: 0.1,
        maxOutputTokens: 512,
      });

      const modelFilter = shapeFilter(result.data);

      // Merge: model wins where it spoke, heuristic fills the gaps.
      filter = { ...heuristic.filter, ...modelFilter };
      interpretation =
        typeof result.data.interpretation === 'string' && result.data.interpretation.length > 0
          ? result.data.interpretation
          : heuristic.interpretation;
      parser = 'gemini';
    } catch (error) {
      log.warn(
        `Gemini query parse failed, using heuristic: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  const matched = applyFilter(events, filter);

  return {
    query,
    filter,
    interpretation,
    matchedEventIds: matched.map((e) => e.id),
    matchCount: matched.length,
    parser,
    latencyMs: Date.now() - started,
  };
}

/** Execute a parsed filter against a set of events. */
export function applyFilter(events: UnifiedEvent[], filter: NLQueryFilter): UnifiedEvent[] {
  const now = Date.now();
  const text = filter.textContains?.toLowerCase();

  return events.filter((e) => {
    if (filter.sourceTypes && !filter.sourceTypes.includes(e.sourceType)) return false;
    if (filter.severities && !filter.severities.includes(e.severity)) return false;
    if (filter.minConfidence !== undefined && e.confidence < filter.minConfidence) return false;
    if (filter.anomaliesOnly && !e.isAnomaly) return false;

    if (
      filter.minCorroborations !== undefined &&
      e.corroboratedBy.length < filter.minCorroborations
    ) {
      return false;
    }

    if (filter.withinMinutes !== undefined) {
      const ageMinutes = (now - Date.parse(e.timestamp)) / 60_000;
      if (!Number.isFinite(ageMinutes) || ageMinutes > filter.withinMinutes) return false;
    }

    if (filter.nearPoint) {
      const d = haversineMeters(e.location, {
        lat: filter.nearPoint.lat,
        lng: filter.nearPoint.lng,
      });
      if (d > filter.nearPoint.radiusKm * 1000) return false;
    }

    if (text) {
      const haystack = `${e.title} ${e.description}`.toLowerCase();
      if (!haystack.includes(text)) return false;
    }

    return true;
  });
}
