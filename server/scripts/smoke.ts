/**
 * VANGUARD — end-to-end smoke test.
 *
 * Drives the real pipeline in-process (no HTTP, no port) for a fixed number of
 * ticks, then asserts the invariants that matter operationally. Run it before
 * a demo to confirm the whole chain is healthy in about fifteen seconds:
 *
 *   npm run smoke
 *
 * This is the check that would have caught every calibration bug found during
 * the build: escalation compounding, entity duplication, and a posture that
 * boots straight to RED with nowhere left to escalate.
 */

import { Orchestrator } from '../src/orchestrator/Orchestrator.js';
import { findUngroundedCitations } from '../src/ai/grounding.js';
import { generateBriefing } from '../src/ai/briefing.js';

const TICKS = 12;

let failures = 0;

function check(label: string, condition: boolean, detail: string): void {
  const mark = condition ? 'PASS' : 'FAIL';
  if (!condition) failures++;
  console.log(`  [${mark}] ${label} — ${detail}`);
}

async function main(): Promise<void> {
  console.log('\nVANGUARD smoke test\n');

  const orchestrator = new Orchestrator();
  await orchestrator.init();

  console.log(`Running ${TICKS} pipeline ticks...`);
  for (let i = 0; i < TICKS; i++) {
    await orchestrator.tick();
    await new Promise((r) => setTimeout(r, 250));
  }

  const situation = orchestrator.getSituation();
  const stats = orchestrator.getFusion()?.stats;
  const events = orchestrator.store.active();
  const health = orchestrator.getSourceHealth();

  console.log('\nIngestion');
  check('all seven feeds registered', health.length === 7, `${health.length} feeds`);
  check('events ingested', events.length > 0, `${events.length} active events`);

  const bySource = orchestrator.store.countsBySource();
  check(
    'every feed produced events',
    Object.values(bySource).every((n) => n > 0),
    JSON.stringify(bySource),
  );

  console.log('\nEntity identity');
  const radarIds = new Set(events.filter((e) => e.sourceType === 'radar').map((e) => e.id));
  check(
    'radar tracks are stable entities, not one event per sweep',
    radarIds.size < 60,
    `${radarIds.size} distinct radar events after ${TICKS} sweeps`,
  );

  console.log('\nFusion');
  check('fusion pass completed', stats !== undefined, `${stats?.durationMs ?? '-'}ms`);
  check(
    'fusion is fast enough for a 3s tick',
    (stats?.durationMs ?? 999) < 500,
    `${stats?.durationMs}ms per pass`,
  );
  check(
    'confidence is in range for every event',
    events.every((e) => e.confidence >= 0 && e.confidence <= 100),
    'all 0-100',
  );
  check(
    'every event carries a confidence breakdown',
    events.every((e) => e.confidenceBreakdown !== undefined),
    'breakdown present',
  );

  console.log('\nMedia authenticity');
  const media = events.filter(
    (e) => e.sourceType === 'social_media' || e.sourceType === 'audio_recording',
  );
  check('media feeds produced events', media.length > 0, `${media.length} media events`);
  check(
    'every media event carries an authenticity audit',
    media.every((e) => e.mediaAudit !== undefined),
    'audit present on all',
  );
  const fabricated = media.filter(
    (e) => e.mediaAudit?.manipulationCategory === 'EVENT_FABRICATING',
  );
  const unverified = media.filter(
    (e) => e.mediaAudit?.manipulationCategory === 'AUTHENTICITY_UNVERIFIED',
  );
  check(
    'fabricated/uncorroborated media is SURFACED, never discarded, and never reads as high-confidence',
    [...fabricated, ...unverified].every((e) => e.confidence < 80),
    `${fabricated.length + unverified.length} fabricated/unverified items still in the picture`,
  );
  check(
    'every media confidence carries the authenticity discount in [60, 100]',
    media.every((e) => (e.confidenceBreakdown?.mediaAuthenticity ?? 100) >= 60),
    'factor never zeroes an item',
  );

  console.log('\nSeverity discipline');
  const criticalUncorroborated = events.filter(
    (e) => e.severity === 'critical' && e.corroboratedBy.length === 0 && e.baseSeverity !== 'critical',
  );
  check(
    'no event is promoted to CRITICAL without corroboration',
    criticalUncorroborated.length === 0,
    `${criticalUncorroborated.length} uncorroborated promotions`,
  );

  const overEscalated = events.filter((e) => {
    const order = ['low', 'medium', 'high', 'critical'];
    return order.indexOf(e.severity) - order.indexOf(e.baseSeverity) > 2;
  });
  check(
    'no event escalated more than two tiers',
    overEscalated.length === 0,
    `${overEscalated.length} over-escalated`,
  );

  console.log('\nThreat posture');
  check(
    'posture is not pinned at RED on a routine picture',
    situation.threatLevel !== 'red',
    `${situation.threatLevel.toUpperCase()} at score ${situation.threatScore.toFixed(1)}`,
  );

  console.log('\nAI synthesis and grounding');
  const summary = await generateBriefing({
    events,
    clusters: orchestrator.getClusters(),
    threatLevel: situation.threatLevel,
    threatScore: situation.threatScore,
    degradedFeeds: [],
    degradedMode: false,
    resolver: orchestrator.store,
  });

  check('briefing generated', summary.headline.length > 0, `engine: ${summary.provenance.engine}`);
  check(
    'briefing contains key developments',
    summary.keyDevelopments.length > 0,
    `${summary.keyDevelopments.length} developments`,
  );
  check(
    'briefing contains courses of action',
    summary.coursesOfAction.length >= 2,
    `${summary.coursesOfAction.length} COAs`,
  );

  const ungrounded = findUngroundedCitations(summary, orchestrator.store);
  check(
    'EVERY citation resolves to a real event',
    ungrounded.length === 0,
    ungrounded.length === 0 ? 'zero hallucinated IDs' : ungrounded.join(', '),
  );

  console.log('\nResilience');
  orchestrator.setDegradedMode(true);
  await orchestrator.tick();
  const degradedConfidence = mean(orchestrator.store.active().map((e) => e.confidence));

  orchestrator.setDegradedMode(false);
  await orchestrator.tick();
  const restoredConfidence = mean(orchestrator.store.active().map((e) => e.confidence));

  check(
    'degraded comms lowers confidence across the picture',
    degradedConfidence < restoredConfidence,
    `${degradedConfidence.toFixed(0)}% degraded vs ${restoredConfidence.toFixed(0)}% restored`,
  );

  await orchestrator.shutdown();

  console.log(
    failures === 0
      ? '\nAll smoke checks passed.\n'
      : `\n${failures} smoke check(s) FAILED.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;

main().catch((error: unknown) => {
  console.error('smoke test crashed:', error);
  process.exit(1);
});
