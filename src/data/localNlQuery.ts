import { SeverityLevel, SourceType, UnifiedEvent } from '../types/schema';

/**
 * Offline natural-language event filter.
 *
 * The server exposes POST /ai/query, which uses Gemini when a key is present
 * and a deterministic heuristic parser otherwise. This is that same heuristic,
 * running in the browser, so the omnibar is a working feature in demo mode
 * rather than a dead input box.
 *
 * It reads intent from the phrases operators actually type — a severity word,
 * a source name, a confidence threshold, a time window — and reports back what
 * it understood so the interpretation stays inspectable.
 */

const SEVERITY_WORDS: Array<[RegExp, SeverityLevel]> = [
  [/\bcritical\b/i, 'critical'],
  [/\bhigh(?:[- ]severity)?\b/i, 'high'],
  [/\bmedium\b/i, 'medium'],
  [/\b(?:low|routine|nominal)\b/i, 'low'],
];

const SOURCE_WORDS: Array<[RegExp, SourceType]> = [
  [/\bradar\b/i, 'radar'],
  [/\b(?:weather|meteo|squall|storm)\b/i, 'weather'],
  [/\b(?:personnel|patrol|unit|troop)\b/i, 'personnel'],
  [/\b(?:perimeter|tripwire|infrared|log|sensor)\b/i, 'log'],
  [/\b(?:incident|dispatch|checkpoint)\b/i, 'incident'],
  [/\b(?:social|osint|viral|post)\b/i, 'social_media'],
  [/\b(?:audio|acoustic|hydrophone|sonar)\b/i, 'audio_recording'],
];

export interface LocalNlResult {
  interpretation: string;
  parser: 'heuristic';
  latencyMs: number;
  matchedEventIds: string[];
}

export function runLocalNlQuery(query: string, events: UnifiedEvent[]): LocalNlResult {
  const started = performance.now();
  const q = query.trim();
  const clauses: string[] = [];

  const severity = SEVERITY_WORDS.find(([re]) => re.test(q))?.[1];
  const sourceType = SOURCE_WORDS.find(([re]) => re.test(q))?.[1];
  const anomaliesOnly = /\b(?:anomal|outlier|unusual|suspicious)/i.test(q);
  const corroboratedOnly = /\b(?:corroborat|confirmed|multi[- ]source|cross[- ]check)/i.test(q);

  const confMatch = q.match(/(?:above|over|greater than|>|at least)\s*(\d{1,3})\s*%?/i);
  const minConfidence = confMatch ? Math.min(100, parseInt(confMatch[1], 10)) : undefined;

  const minutesMatch = q.match(/(?:last|past|within)\s*(\d{1,4})\s*(second|sec|minute|min|hour|hr)/i);
  let withinMs: number | undefined;
  if (minutesMatch) {
    const n = parseInt(minutesMatch[1], 10);
    const unit = minutesMatch[2].toLowerCase();
    const factor = unit.startsWith('sec') ? 1_000 : unit.startsWith('hour') || unit.startsWith('hr') ? 3_600_000 : 60_000;
    withinMs = n * factor;
  }

  // Free-text remainder: only words no structured clause already consumed.
  // Without this, "critical radar contacts" would be parsed as severity +
  // source AND then require the literal words "critical radar" in the text,
  // filtering out the very events it just selected.
  const stopWords = new Set([
    'show','me','all','the','a','an','with','and','or','in','on','from','last','past','within',
    'above','over','greater','than','at','least','events','event','contacts','contact','signals',
    'signal','tracks','track','minutes','minute','seconds','second','hours','hour','confidence','sector',
    'anomalies','anomaly','anomalous','corroborated','confirmed','multi','source','feeds','feed',
    'more','than','two','three','only','that','have','been','with','into','near','around','please',
  ]);

  // Strip whatever the recognised clauses already matched.
  let remainder = q.toLowerCase();
  for (const [re] of SEVERITY_WORDS) remainder = remainder.replace(re, ' ');
  for (const [re] of SOURCE_WORDS) remainder = remainder.replace(re, ' ');
  if (confMatch) remainder = remainder.replace(confMatch[0], ' ');
  if (minutesMatch) remainder = remainder.replace(minutesMatch[0], ' ');

  const leftoverWords = remainder
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w) && !/^\d+$/.test(w));

  const hasStructuredClause =
    Boolean(severity) ||
    Boolean(sourceType) ||
    anomaliesOnly ||
    corroboratedOnly ||
    minConfidence !== undefined ||
    withinMs !== undefined;

  // Leftover words are connectives and filler far more often than they are
  // search terms ("two or more feeds", "perimeter breaches"). Once a
  // structured clause has been recognised, treating them as an additional
  // required match reliably returns nothing, so free text is only used as a
  // fallback when nothing else was understood.
  const freeText = hasStructuredClause ? [] : leftoverWords;

  const now = Date.now();
  const matched = events.filter((e) => {
    if (severity && e.severity !== severity) return false;
    if (sourceType && e.sourceType !== sourceType) return false;
    if (anomaliesOnly && !e.isAnomaly) return false;
    if (corroboratedOnly && (e.corroboratedBy?.length ?? 0) === 0) return false;
    if (minConfidence !== undefined && e.confidence < minConfidence) return false;
    if (withinMs !== undefined && now - Date.parse(e.timestamp) > withinMs) return false;
    if (freeText.length) {
      const hay = `${e.id} ${e.title} ${e.description} ${e.sourceName ?? ''}`.toLowerCase();
      if (!freeText.some((w) => hay.includes(w))) return false;
    }
    return true;
  });

  if (severity) clauses.push(`severity = ${severity}`);
  if (sourceType) clauses.push(`source = ${sourceType.replace('_', ' ')}`);
  if (anomaliesOnly) clauses.push('anomalies only');
  if (corroboratedOnly) clauses.push('corroborated by ≥2 feeds');
  if (minConfidence !== undefined) clauses.push(`confidence ≥ ${minConfidence}%`);
  if (withinMs !== undefined) clauses.push(`within the last ${Math.round(withinMs / 60000) || '<1'} min`);
  if (freeText.length) clauses.push(`text matches “${freeText.join(' ')}”`);

  const interpretation = clauses.length
    ? `Filtered the stream where ${clauses.join(', ')} — ${matched.length} of ${events.length} events matched.`
    : `No filter clauses recognised in “${q}”, so the full stream of ${events.length} events is shown.`;

  return {
    interpretation,
    parser: 'heuristic',
    latencyMs: Math.max(1, Math.round(performance.now() - started)),
    matchedEventIds: matched.map((e) => e.id),
  };
}
