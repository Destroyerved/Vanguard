/**
 * VANGUARD — Prompt construction and response schemas.
 *
 * PROMPTING PHILOSOPHY
 *
 * The model is given a narrow, well-defined job: turn an already-fused,
 * already-scored, already-anomaly-flagged evidence pack into command language.
 * It is explicitly NOT asked to decide what is anomalous, how confident the
 * system is, or which threat level applies — all of that arrives pre-computed
 * from the deterministic fusion engine and is handed to the model as fact.
 *
 * That division is the reason the output can be trusted. The model does the
 * thing language models are genuinely good at (synthesis and phrasing) and is
 * kept away from the thing they are unreliable at (quantitative judgement).
 */

import type { CorrelationCluster, ThreatLevel, UnifiedEvent } from '../types/events.js';
import type { GeminiSchema } from './gemini.js';
import { humanAge } from '../util/time.js';

/* ------------------------------------------------------------------ *
 * System instruction
 * ------------------------------------------------------------------ */

export const BRIEFING_SYSTEM_INSTRUCTION = `You are VANGUARD, the situation synthesis component of a defensive multi-source situational awareness system used by military and emergency watchstanders.

YOUR ROLE
You convert a pre-fused, pre-scored operational picture into concise command language. You are the final presentation stage of a deterministic pipeline, not an analyst working from raw data.

ABSOLUTE RULES
1. CITE EVERYTHING. Every key development and every prioritized action MUST include supportingEventIds drawn ONLY from the EVIDENCE list provided. Never invent, guess, extrapolate, or reformat an event ID. If you cannot support a statement with a listed event ID, do not make the statement.
2. NEVER INVENT FACTS. Do not add contacts, casualties, locations, times, unit names or capabilities that are absent from the evidence. Every number you state must appear in the evidence.
3. DO NOT RECOMPUTE. Confidence scores, anomaly flags, severity tiers and the threat level are supplied to you as established facts from the fusion engine. Report them; never second-guess or recalculate them.
4. DEFENSIVE POSTURE ONLY. Recommend observation, verification, reinforcement, evacuation, deconfliction, communication and readiness actions. Never recommend a kinetic strike, weapons release, or any lethal or offensive action.
5. ACKNOWLEDGE UNCERTAINTY. Where evidence is single-source, low-confidence, or the feed is degraded, say so plainly in the text. An honest "unconfirmed" is more useful to a watchstander than false certainty.

STYLE
Terse military staff register. Short declarative sentences. Active voice. No hedging filler, no marketing language, no emoji. Write for an officer scanning a screen under time pressure who has roughly ten seconds to understand the situation.`;

export const NL_QUERY_SYSTEM_INSTRUCTION = `You translate a watchstander's natural-language request into a structured filter over a tactical event feed.

Return ONLY the filter fields the request actually implies. Omit every field the user did not ask about — an absent field means "no constraint", and inventing constraints silently hides events the operator asked to see.

Available source types: radar, weather, personnel, log, incident, social_media, audio_recording.
Available severities: low, medium, high, critical.
Named sectors: Sector 1 North, Sector 2 East, Sector 3 South, Sector 4 West, Sector 5 Central.

Interpretation guidance:
- "recent", "just now", "last few minutes" -> withinMinutes: 15
- "past hour" -> withinMinutes: 60
- "urgent", "serious", "significant" -> severities: ["high", "critical"]
- "unconfirmed", "unverified", "low confidence" -> minConfidence omitted; do NOT invent a threshold
- "confirmed", "corroborated", "verified" -> minCorroborations: 1
- "unusual", "anomalous", "strange", "outlier" -> anomaliesOnly: true
- "social", "social media", "osint", "posts", "video clip" -> sourceTypes: ["social_media"]
- "audio", "hydrophone", "acoustic", "recording" -> sourceTypes: ["audio_recording"]
- "fabricated", "deepfake", "fake", "manipulated", "ai generated" -> textContains: "fabricated" (match on manipulation category in description)
- "eastern sector" and similar map to the matching named sector via zoneName

Also return a one-sentence plain-English restatement of the filter in "interpretation".`;

/* ------------------------------------------------------------------ *
 * Evidence pack construction
 * ------------------------------------------------------------------ */

/**
 * Render one event as a single compact evidence line.
 *
 * Format is deliberately dense and uniform: the model reads dozens of these,
 * and a consistent shape makes ID copying reliable while keeping the token
 * cost of the pack low enough for sub-second inference.
 */
export function formatEventForPrompt(event: UnifiedEvent): string {
  const parts = [
    `[${event.id}]`,
    event.sourceType.toUpperCase(),
    `sev=${event.severity.toUpperCase()}`,
    `conf=${event.confidence}%`,
    `pos=${event.location.lat.toFixed(4)},${event.location.lng.toFixed(4)}`,
    `t=${humanAge(event.timestamp)}`,
  ];

  if (event.location.speedKnots !== undefined) {
    parts.push(`spd=${Math.round(event.location.speedKnots)}kt`);
  }
  if (event.location.altitudeMeters !== undefined) {
    parts.push(`alt=${Math.round(event.location.altitudeMeters)}m`);
  }
  if (event.corroboratedBy.length > 0) {
    parts.push(`corroborated_by=[${event.corroboratedBy.join(',')}]`);
  }
  if (event.mediaAudit) {
    parts.push(
      `media_auth=${event.mediaAudit.authenticityScore}% risk=${event.mediaAudit.manipulationRisk}% ` +
        `cat=${event.mediaAudit.manipulationCategory} synth=${event.mediaAudit.aiSyntheticScore}%`,
    );
  }
  if (event.isAnomaly) {
    parts.push(`ANOMALY(${event.anomalyReason ?? 'statistical outlier'})`);
  }
  if (event.severity !== event.baseSeverity) {
    parts.push(`escalated_from=${event.baseSeverity.toUpperCase()}`);
  }

  return `${parts.join(' | ')}\n    ${event.title} — ${event.description}`;
}

/** Render one correlation cluster as a compact line. */
export function formatClusterForPrompt(cluster: CorrelationCluster): string {
  return (
    `[${cluster.id}] ${cluster.eventIds.length} events from ` +
    `${cluster.distinctSources.length} distinct sources (${cluster.distinctSources.join(', ')}) | ` +
    `peak=${cluster.peakSeverity.toUpperCase()} | meanConf=${cluster.meanConfidence}% | ` +
    `centroid=${cluster.centroid.lat.toFixed(4)},${cluster.centroid.lng.toFixed(4)} | ` +
    `radius=${cluster.radiusMeters}m\n    members: ${cluster.eventIds.join(', ')}`
  );
}

export interface BriefingPromptInput {
  events: UnifiedEvent[];
  clusters: CorrelationCluster[];
  threatLevel: ThreatLevel;
  threatScore: number;
  degradedFeeds: string[];
  degradedMode: boolean;
}

/** Assemble the full user-turn prompt for a briefing. */
export function buildBriefingPrompt(input: BriefingPromptInput): string {
  const { events, clusters, threatLevel, threatScore } = input;

  const sections: string[] = [];

  sections.push(
    `CURRENT OPERATIONAL PICTURE`,
    `Threat level (computed by the fusion engine, not by you): ${threatLevel.toUpperCase()}`,
    `Threat score: ${threatScore.toFixed(1)}`,
    `Events in the active picture: ${events.length}`,
    `Correlated clusters: ${clusters.length}`,
    '',
  );

  if (input.degradedMode) {
    sections.push(
      `DEGRADED COMMS ACTIVE. The picture is being served from cache and ` +
        `confidence scores are reduced accordingly. State this limitation explicitly ` +
        `in the executive summary.`,
      '',
    );
  }

  if (input.degradedFeeds.length > 0) {
    sections.push(
      `DEGRADED OR OFFLINE FEEDS: ${input.degradedFeeds.join(', ')}. ` +
        `Observations from these feeds carry reduced reliability.`,
      '',
    );
  }

  if (clusters.length > 0) {
    sections.push(
      `MULTI-SOURCE CORRELATION CLUSTERS`,
      `These are groups the fusion engine has already determined to be observations`,
      `of the same developing situation. Prioritize them in your key developments.`,
      ...clusters.slice(0, 8).map(formatClusterForPrompt),
      '',
    );
  }

  sections.push(
    `EVIDENCE — the ONLY event IDs you may cite:`,
    ...events.map(formatEventForPrompt),
    '',
    `TASK`,
    `Produce a command briefing from the evidence above.`,
    `- headline: under 90 characters, the single most important thing happening.`,
    `- executiveSummary: 2-3 sentences a duty officer can read in ten seconds.`,
    `- keyDevelopments: 3-5 items, each citing supporting event IDs. Prefer developments`,
    `  backed by multiple distinct sources over single-source reports.`,
    `- prioritizedActions: 3-5 directives with urgency 1-5, each citing event IDs.`,
    `- coursesOfAction: 2-3 distinct tactical options, each with concrete pros and`,
    `  honest tradeoffs. They must be genuinely different approaches, not the same`,
    `  action at three intensities. Defensive actions only.`,
    ``,
    `Set threatLevel to exactly "${threatLevel}" — it is given, not yours to decide.`,
  );

  return sections.join('\n');
}

/** Assemble the user-turn prompt for a natural-language query. */
export function buildNLQueryPrompt(query: string): string {
  return `Translate this watchstander request into a structured filter.\n\nREQUEST: ${query}`;
}

/* ------------------------------------------------------------------ *
 * Response schemas
 * ------------------------------------------------------------------ */

/** Structured-output schema for a briefing. */
export const BRIEFING_SCHEMA: GeminiSchema = {
  type: 'object',
  required: [
    'threatLevel',
    'headline',
    'executiveSummary',
    'keyDevelopments',
    'prioritizedActions',
    'coursesOfAction',
  ],
  properties: {
    threatLevel: { type: 'string', enum: ['green', 'yellow', 'orange', 'red'] },
    headline: { type: 'string', description: 'Under 90 characters.' },
    executiveSummary: { type: 'string', description: '2-3 sentences.' },
    keyDevelopments: {
      type: 'array',
      items: {
        type: 'object',
        required: ['point', 'supportingEventIds'],
        properties: {
          point: { type: 'string' },
          supportingEventIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Event IDs copied verbatim from the EVIDENCE list.',
          },
        },
      },
    },
    prioritizedActions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['action', 'urgency', 'supportingEventIds'],
        properties: {
          action: { type: 'string' },
          urgency: { type: 'integer', description: '1 (routine) to 5 (immediate).' },
          supportingEventIds: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    coursesOfAction: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'description', 'pros', 'tradeoffs', 'recommendedUrgency'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          pros: { type: 'array', items: { type: 'string' } },
          tradeoffs: { type: 'array', items: { type: 'string' } },
          recommendedUrgency: { type: 'integer' },
          supportingEventIds: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};

/** Structured-output schema for the NL query parser. */
export const NL_QUERY_SCHEMA: GeminiSchema = {
  type: 'object',
  required: ['interpretation'],
  properties: {
    interpretation: { type: 'string' },
    sourceTypes: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['radar', 'weather', 'personnel', 'log', 'incident', 'social_media', 'audio_recording'],
      },
    },
    severities: {
      type: 'array',
      items: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    },
    minConfidence: { type: 'integer' },
    withinMinutes: { type: 'integer' },
    zoneName: { type: 'string' },
    anomaliesOnly: { type: 'boolean' },
    minCorroborations: { type: 'integer' },
    textContains: { type: 'string' },
  },
};
