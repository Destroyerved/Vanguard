/**
 * VANGUARD — Pipeline orchestrator.
 *
 * The single heartbeat of the system. One timer drives everything:
 *
 *   TICK (default 3s)
 *     |
 *     +-- 1. POLL adapters that are due (each has its own cadence)
 *     +-- 2. NORMALIZE raw observations into UnifiedEvents
 *     +-- 3. VALIDATE and reject malformed events at the boundary
 *     +-- 4. STORE into the bounded ring buffer
 *     +-- 5. FUSE the active picture (dedupe -> correlate -> corroborate ->
 *     |      score -> anomaly -> escalate)
 *     +-- 6. ASSESS the aggregate threat posture, with hysteresis
 *     +-- 7. BROADCAST the updated picture over WebSocket
 *     +-- 8. BRIEF asynchronously on its own slower cadence
 *
 * DESIGN NOTES
 *
 *   - Adapters have independent poll intervals, so a 2-minute weather poll and
 *     a 3-second radar sweep coexist on one timer without either being wrong.
 *   - The whole tick is wrapped so a failing adapter degrades one feed rather
 *     than killing the pipeline. Nothing in a tick may throw upward.
 *   - Briefing generation is fire-and-forget on its own interval. The tick loop
 *     never awaits an inference call, so the picture keeps updating at full
 *     rate even while a model request is in flight or hanging.
 */

import { env } from '../config/env.js';
import { AO_SECTORS, BRIEFING_MIN_INTERVAL_MS } from '../config/constants.js';
import { BriefingCache, generateBriefing } from '../ai/briefing.js';
import { IncidentsSimAdapter, type ScenarioName } from '../ingestion/incidents.sim.js';
import { AudioRecordingSimAdapter, SocialMediaSimAdapter } from '../ingestion/media.sim.js';
import { LogsSimAdapter } from '../ingestion/logs.sim.js';
import { OpenMeteoAdapter } from '../ingestion/weather.openMeteo.js';
import { PersonnelSimAdapter } from '../ingestion/personnel.sim.js';
import { RadarSimAdapter } from '../ingestion/radar.sim.js';
import type { PollOutcome, RawObservation, SourceAdapter } from '../ingestion/SourceAdapter.js';
import { normalizeBatch } from '../normalization/normalize.js';
import { validateBatch } from '../normalization/validate.js';
import { RateBaseline, runFusionPipeline, type FusionResult } from '../fusion/pipeline.js';
import { EventStore } from '../state/EventStore.js';
import { RedisEventStore } from '../state/RedisEventStore.js';
import { getRedisClient } from '../config/redis.js';
import { SourceHealthRegistry } from '../state/SourceHealthRegistry.js';
import { ThreatState } from '../state/ThreatState.js';
import type { CorrelationCluster, TacticalAsset, UnifiedEvent } from '../types/events.js';
import type { SituationSnapshot, SystemMetrics } from '../types/health.js';
import type { LatLng } from '../util/geo.js';
import { createLogger } from '../util/logger.js';
import { nowIso } from '../util/time.js';
import type { WsHub } from '../ws/hub.js';

const log = createLogger('orchestr');

export const SERVER_VERSION = '1.1.0';

export class Orchestrator {
  readonly store: EventStore = new RedisEventStore(getRedisClient());
  readonly health = new SourceHealthRegistry();
  readonly threat = new ThreatState();
  readonly briefingCache = new BriefingCache();

  readonly weather: OpenMeteoAdapter;
  readonly radar: RadarSimAdapter;
  readonly personnel: PersonnelSimAdapter;
  readonly logs: LogsSimAdapter;
  readonly incidents: IncidentsSimAdapter;
  readonly social: SocialMediaSimAdapter;
  readonly hydrophone: AudioRecordingSimAdapter;

  private readonly adapters: SourceAdapter[];
  private readonly lastPollAt = new Map<string, number>();
  private readonly rateBaseline = new RateBaseline();

  private hub: WsHub | null = null;
  private timer: NodeJS.Timeout | null = null;
  private briefingTimer: NodeJS.Timeout | null = null;

  private tickCount = 0;
  private startedAtMs = Date.now();
  private eventsIngested = 0;
  private duplicatesRemoved = 0;
  private clustersFormed = 0;
  private tickDurations: number[] = [];
  private degradedMode = false;

  private latestFusion: FusionResult | null = null;

  constructor() {
    this.weather = new OpenMeteoAdapter(env.weatherPollIntervalMs);
    this.radar = new RadarSimAdapter(env.simSeed, 3_000, env.simIntensity);
    this.personnel = new PersonnelSimAdapter(env.simSeed, 6_000, env.simIntensity);
    this.logs = new LogsSimAdapter(env.simSeed, 4_000, env.simIntensity);
    this.incidents = new IncidentsSimAdapter(env.simSeed, 5_000, env.simIntensity);
    this.social = new SocialMediaSimAdapter(env.simSeed, 6_000, env.simIntensity);
    this.hydrophone = new AudioRecordingSimAdapter(env.simSeed, 8_000, env.simIntensity);

    this.adapters = [
      this.weather,
      this.radar,
      this.personnel,
      this.logs,
      this.incidents,
      this.social,
      this.hydrophone,
    ];
  }

  /** Register feeds and warm every adapter. Safe to call once at boot. */
  async init(): Promise<void> {
    for (const adapter of this.adapters) {
      this.health.register(adapter.sourceType, adapter.sourceName, adapter.nominalReliability);
      try {
        await adapter.init?.();
      } catch (error) {
        log.warn(
          `${adapter.sourceName} init failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    this.startedAtMs = Date.now();
    log.info(`initialized ${this.adapters.length} ingestion adapters`);
  }

  /** Bind the WebSocket hub so ticks are broadcast. */
  setHub(hub: WsHub): void {
    this.hub = hub;
  }

  /** Start the tick loop and the background briefing loop. */
  start(): void {
    if (this.timer) return;

    this.timer = setInterval(() => {
      void this.tick();
    }, env.tickIntervalMs);

    this.briefingTimer = setInterval(() => {
      void this.refreshBriefing();
    }, Math.max(BRIEFING_MIN_INTERVAL_MS, env.briefingIntervalMs));

    log.info(`pipeline started — tick ${env.tickIntervalMs}ms, briefing ${env.briefingIntervalMs}ms`);

    // Run the first tick immediately so the API has data before the first
    // interval elapses; then seed a briefing off the resulting picture.
    void this.tick().then(() => this.refreshBriefing());
  }

  /** Stop both loops. */
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.briefingTimer) clearInterval(this.briefingTimer);
    this.timer = null;
    this.briefingTimer = null;
    log.info('pipeline stopped');
  }

  /* ---------------------------------------------------------------- *
   * The tick
   * ---------------------------------------------------------------- */

  /** One complete pipeline cycle. Never throws. */
  async tick(): Promise<void> {
    const started = performance.now();
    this.tickCount++;

    try {
      /* -- 1. POLL --------------------------------------------------- */
      const observations = await this.pollDueAdapters();

      /* -- 2. NORMALIZE ---------------------------------------------- */
      const normalized = normalizeBatch(observations);

      /* -- 3. VALIDATE ----------------------------------------------- */
      const { events: validated, rejected } = validateBatch(normalized);
      if (rejected > 0) log.warn(`${rejected} event(s) rejected at the validation boundary`);

      for (const event of validated) this.rateBaseline.record(event.sourceType);
      this.rateBaseline.rollIfDue();

      /* -- 4. STORE -------------------------------------------------- */
      this.store.upsert(validated);
      this.eventsIngested += validated.length;

      /* -- 5. FUSE --------------------------------------------------- */
      const fusion = runFusionPipeline({
        events: this.store.active(),
        reliabilityBySource: this.health.reliabilityMap(),
        rateBaseline: this.rateBaseline,
      });

      this.latestFusion = fusion;
      this.duplicatesRemoved += fusion.stats.duplicatesRemoved;
      this.clustersFormed += fusion.stats.clustersFormed;

      // Fusion mutates events in place; write them back so the store holds the
      // fused view rather than the pre-fusion one.
      this.store.upsert(fusion.events);

      /* -- 6. ASSESS ------------------------------------------------- */
      const escalation = this.threat.update(fusion.threat, fusion.events);

      /* -- 7. FEED FORWARD ------------------------------------------- */
      // Publish contacts of interest so the personnel, log and media simulators
      // can generate genuinely corroborating observations next tick. This
      // closes the loop that makes multi-source correlation real rather than
      // lucky — fabricated media attaches itself to live radar/incident
      // contacts, which is precisely how the HYBRID_CORROBORATED vs
      // EVENT_FABRICATING discrimination gets exercised.
      const pointsOfInterest = this.contactsOfInterest(fusion.events);
      this.personnel.setPointsOfInterest(pointsOfInterest);
      this.logs.setPointsOfInterest(pointsOfInterest);
      this.social.setPointsOfInterest(pointsOfInterest);
      this.hydrophone.setPointsOfInterest(pointsOfInterest);

      /* -- 8. BROADCAST ---------------------------------------------- */
      if (this.hub && validated.length > 0) {
        this.hub.broadcast('EVENT_STREAM', { events: validated });
      }
      if (this.hub) {
        this.hub.broadcast('SITUATION_UPDATE', { situation: this.getSituation() });
        this.hub.broadcast('CLUSTER_UPDATE', { clusters: fusion.clusters });
        this.hub.broadcast('HEALTH_STATUS', { sources: this.getSourceHealth() });
        this.hub.broadcast('ASSET_UPDATE', { assets: this.getAssets() });

        if (escalation) {
          this.hub.broadcast('ESCALATION', { record: escalation });
        }

        // A dedicated frame for each critical event so the client can fire an
        // alert cue without diffing the whole event stream.
        for (const event of validated) {
          if (event.severity !== 'critical') continue;
          const cluster = fusion.clusters.find((c) => c.eventIds.includes(event.id));
          this.hub.broadcast('ALERT_TRIGGER', { event, cluster });
        }

        if (this.tickCount % 10 === 0) {
          this.hub.broadcast('METRICS', { metrics: this.getMetrics() });
        }
      }

      // A posture change is significant enough to re-brief immediately rather
      // than waiting for the next scheduled synthesis.
      if (escalation) void this.refreshBriefing(true);
    } catch (error) {
      log.error(
        `tick ${this.tickCount} failed: ${
          error instanceof Error ? `${error.message}\n${error.stack}` : String(error)
        }`,
      );
    } finally {
      const duration = performance.now() - started;
      this.tickDurations.push(duration);
      if (this.tickDurations.length > 50) this.tickDurations.shift();
    }
  }

  /** Poll every adapter whose interval has elapsed. */
  private async pollDueAdapters(): Promise<RawObservation[]> {
    const nowMs = Date.now();
    const observations: RawObservation[] = [];

    const results = await Promise.allSettled(
      this.adapters.map(async (adapter) => {
        const key = `${adapter.sourceType}:${adapter.sourceName}`;
        const last = this.lastPollAt.get(key) ?? 0;
        if (nowMs - last < adapter.pollIntervalMs) return null;

        this.lastPollAt.set(key, nowMs);
        const outcome = await adapter.poll({
          nowMs,
          tick: this.tickCount,
          degradedMode: this.degradedMode,
        });
        return { adapter, outcome };
      }),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        log.warn(`adapter poll rejected: ${String(result.reason)}`);
        continue;
      }
      if (result.value === null) continue;

      const { adapter, outcome } = result.value as {
        adapter: SourceAdapter;
        outcome: PollOutcome;
      };

      this.health.recordPoll({
        sourceType: adapter.sourceType,
        sourceName: adapter.sourceName,
        status: outcome.status,
        latencyMs: outcome.latencyMs,
        observationCount: outcome.observations.length,
        note: outcome.note,
      });

      observations.push(...outcome.observations);
    }

    return observations;
  }

  /**
   * Contacts worth cross-checking: non-routine radar tracks and unresolved
   * incidents. Feeding these to the other simulators is what produces genuine
   * spatial and temporal coincidence between independent feeds.
   */
  private contactsOfInterest(events: UnifiedEvent[]): LatLng[] {
    return events
      .filter(
        (e) =>
          (e.sourceType === 'radar' || e.sourceType === 'incident') &&
          e.severity !== 'low',
      )
      .slice(0, 12)
      .map((e) => ({ lat: e.location.lat, lng: e.location.lng }));
  }

  /* ---------------------------------------------------------------- *
   * Briefing
   * ---------------------------------------------------------------- */

  /** Regenerate the cached briefing. Fire-and-forget; never blocks a tick. */
  async refreshBriefing(force = false): Promise<void> {
    if (this.briefingCache.isGenerating()) return;
    if (!force && this.briefingCache.ageMs() < BRIEFING_MIN_INTERVAL_MS) return;

    this.briefingCache.setGenerating(true);

    try {
      const events = this.store.active();
      if (events.length === 0) return;

      const summary = await generateBriefing({
        events,
        clusters: this.latestFusion?.clusters ?? [],
        threatLevel: this.threat.getLevel(),
        threatScore: this.threat.getScore(),
        degradedFeeds: this.getSourceHealth()
          .filter((s) => s.status !== 'live')
          .map((s) => s.sourceName),
        degradedMode: this.degradedMode,
        resolver: this.store,
      });

      this.briefingCache.set(summary);
      this.hub?.broadcast('BRIEFING_UPDATE', { summary });
    } catch (error) {
      log.error(
        `briefing refresh failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.briefingCache.setGenerating(false);
    }
  }

  /* ---------------------------------------------------------------- *
   * Read models for the API
   * ---------------------------------------------------------------- */

  /** Top-of-screen situational rollup. */
  getSituation(): SituationSnapshot {
    const active = this.store.active();
    const bySeverity = this.store.countsBySeverity();
    const meanConfidence =
      active.length === 0
        ? 0
        : Math.round(active.reduce((s, e) => s + e.confidence, 0) / active.length);

    return {
      timestamp: nowIso(),
      threatLevel: this.threat.getLevel(),
      threatScore: this.threat.getScore(),
      activeAlertsCount: bySeverity.critical + bySeverity.high,
      criticalCount: bySeverity.critical,
      highCount: bySeverity.high,
      totalEvents: active.length,
      anomalyCount: active.filter((e) => e.isAnomaly).length,
      correlatedClusters: this.latestFusion?.clusters.length ?? 0,
      meanConfidence,
      degradedMode: this.degradedMode,
      headline:
        this.briefingCache.get()?.headline ??
        `${active.length} events tracked — posture ${this.threat.getLevel().toUpperCase()}`,
    };
  }

  /** Per-feed health with live event counts. */
  getSourceHealth(): ReturnType<SourceHealthRegistry['snapshot']> {
    return this.health.snapshot(this.store.countsBySource());
  }

  /** Correlation clusters from the most recent fusion pass. */
  getClusters(): CorrelationCluster[] {
    return this.latestFusion?.clusters ?? [];
  }

  /** Latest fusion result, for the diagnostics endpoint. */
  getFusion(): FusionResult | null {
    return this.latestFusion;
  }

  /** Friendly units for the Assets map layer. */
  getAssets(): TacticalAsset[] {
    return this.personnel.getUnits().map((unit) => ({
      id: unit.unitId,
      callsign: unit.callsign,
      kind: unit.kind,
      location: { lat: unit.position.lat, lng: unit.position.lng },
      status: unit.status,
      readinessPercent: Math.round(unit.readinessPercent),
      lastUpdate: nowIso(),
    }));
  }

  /** Process metrics for the diagnostics panel. */
  getMetrics(): SystemMetrics {
    const mean =
      this.tickDurations.length === 0
        ? 0
        : this.tickDurations.reduce((s, v) => s + v, 0) / this.tickDurations.length;

    return {
      uptimeSeconds: Math.round((Date.now() - this.startedAtMs) / 1000),
      ticks: this.tickCount,
      eventsIngested: this.eventsIngested,
      eventsDeduplicated: this.duplicatesRemoved,
      clustersFormed: this.clustersFormed,
      meanTickDurationMs: Math.round(mean * 100) / 100,
      lastTickDurationMs:
        Math.round((this.tickDurations[this.tickDurations.length - 1] ?? 0) * 100) / 100,
      wsClients: this.hub?.clientCount ?? 0,
      storeSize: this.store.size,
      storeCapacity: this.store.maxSize,
    };
  }

  /* ---------------------------------------------------------------- *
   * Operator controls
   * ---------------------------------------------------------------- */

  /** Engage or clear degraded-comms simulation across every feed. */
  setDegradedMode(enabled: boolean): { degradedMode: boolean; affectedFeeds: string[] } {
    this.degradedMode = enabled;
    const affectedFeeds = this.health.setBlackout(enabled);

    log.info(`degraded comms ${enabled ? 'ENGAGED' : 'CLEARED'} (${affectedFeeds.length} feeds)`);

    this.hub?.broadcast('DEGRADED_MODE', {
      enabled,
      reason: enabled
        ? 'Operator engaged degraded comms simulation — serving cached COP'
        : 'Communications restored — live feeds resumed',
    });

    // Re-brief so the summary states the limitation immediately.
    void this.refreshBriefing(true);

    return { degradedMode: enabled, affectedFeeds };
  }

  /**
   * Trigger a coordinated demo scenario.
   *
   * Injects incident reports AND matching radar contacts at one epicentre, so
   * the correlation engine sees genuine multi-source agreement and the whole
   * pipeline — clustering, escalation, threat rise, re-briefing — fires end to
   * end from a single operator action.
   */
  triggerScenario(scenario: ScenarioName, at?: LatLng): {
    scenario: ScenarioName;
    epicenter: LatLng;
    incidentsQueued: number;
    radarContactsInjected: number;
  } {
    const { epicenter, queued } = this.incidents.triggerScenario(scenario, at);

    // Matching air activity, except for a weather scenario where it would make
    // no operational sense.
    const contacts = scenario === 'severe_weather_impact' ? 0 : 2;
    for (let i = 0; i < contacts; i++) this.radar.injectHostileContact(epicenter);

    // Steer the sensor and patrol simulators at the epicentre immediately so
    // corroboration appears on the very next tick rather than several later.
    this.logs.setPointsOfInterest([epicenter]);
    this.personnel.setPointsOfInterest([epicenter]);

    log.info(
      `scenario ${scenario} triggered at ${epicenter.lat.toFixed(4)}, ${epicenter.lng.toFixed(4)} ` +
        `(${queued} incidents, ${contacts} radar contacts)`,
    );

    return {
      scenario,
      epicenter,
      incidentsQueued: queued,
      radarContactsInjected: contacts,
    };
  }

  /** Inject a single hypothetical incident — the what-if sandbox. */
  injectIncident(params: {
    lat: number;
    lng: number;
    title?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }): UnifiedEvent | null {
    const observation = this.incidents.injectIncident(params);
    const [event] = normalizeBatch([observation]);
    if (!event) return null;

    const { events } = validateBatch([event]);
    if (events.length === 0) return null;

    this.store.upsert(events);
    this.hub?.broadcast('EVENT_STREAM', { events });
    return events[0]!;
  }

  /** Named sectors, for the Zones map layer and the NL parser. */
  getSectors(): typeof AO_SECTORS {
    return AO_SECTORS;
  }

  /** True while degraded-comms simulation is engaged. */
  isDegraded(): boolean {
    return this.degradedMode;
  }

  /** Clear all state and restart from a clean picture. */
  reset(): void {
    this.store.clear();
    this.threat.reset();
    this.briefingCache.clear();
    this.latestFusion = null;
    this.eventsIngested = 0;
    this.duplicatesRemoved = 0;
    this.clustersFormed = 0;
    this.tickCount = 0;
    this.startedAtMs = Date.now();
    if (this.degradedMode) this.setDegradedMode(false);
    log.info('orchestrator state reset');
  }

  /** Stop the loops and release adapter resources. */
  async shutdown(): Promise<void> {
    this.stop();
    for (const adapter of this.adapters) {
      try {
        await adapter.shutdown?.();
      } catch {
        /* best effort */
      }
    }
  }
}
