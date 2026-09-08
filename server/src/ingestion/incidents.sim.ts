/**
 * VANGUARD — Field incident and dispatch simulator.
 *
 * Human-reported events: the noisiest, least reliable, and most operationally
 * urgent feed. Reports arrive with a reporter-assigned severity that VANGUARD
 * treats as a CLAIM rather than a fact — the fusion engine decides what the
 * event's severity actually is once it knows whether anything corroborates it.
 *
 * Also hosts the SCENARIO ENGINE: `triggerScenario` injects the coordinated
 * multi-report spikes that drive the live demo, and that the rate anomaly
 * detector is built to catch.
 */

import { AO_SECTORS } from '../config/constants.js';
import { destinationPoint, type LatLng } from '../util/geo.js';
import { createRng, type Rng } from '../util/random.js';
import { nowIso } from '../util/time.js';
import { ok, type PollContext, type PollOutcome, type RawObservation, type SourceAdapter } from './SourceAdapter.js';

export type IncidentCategory =
  | 'unauthorized_entry'
  | 'suspicious_vehicle'
  | 'medical'
  | 'equipment_failure'
  | 'civil_disturbance'
  | 'fire'
  | 'communications_loss'
  | 'unidentified_aircraft';

interface IncidentTemplate {
  category: IncidentCategory;
  title: string;
  detail: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Relative frequency in routine operations. */
  weight: number;
}

const TEMPLATES: IncidentTemplate[] = [
  {
    category: 'unauthorized_entry',
    title: 'Unauthorized entry reported',
    detail: 'Patrol element reports individuals inside the restricted perimeter.',
    severity: 'high',
    weight: 2,
  },
  {
    category: 'suspicious_vehicle',
    title: 'Suspicious vehicle observed',
    detail: 'Unmarked vehicle loitering on the approach road with no clearance on file.',
    severity: 'medium',
    weight: 3,
  },
  {
    category: 'medical',
    title: 'Medical assistance requested',
    detail: 'Casualty evacuation requested for a non-combat injury.',
    severity: 'medium',
    weight: 2,
  },
  {
    category: 'equipment_failure',
    title: 'Equipment failure reported',
    detail: 'Vehicle-mounted sensor package offline pending field repair.',
    severity: 'low',
    weight: 4,
  },
  {
    category: 'civil_disturbance',
    title: 'Civil disturbance forming',
    detail: 'Gathering crowd reported near the outer cordon.',
    severity: 'medium',
    weight: 1,
  },
  {
    category: 'fire',
    title: 'Fire reported',
    detail: 'Smoke and flame visible from a structure inside the sector boundary.',
    severity: 'high',
    weight: 1,
  },
  {
    category: 'communications_loss',
    title: 'Communications loss',
    detail: 'Element unreachable on primary and alternate nets.',
    severity: 'high',
    weight: 1,
  },
  {
    category: 'unidentified_aircraft',
    title: 'Unidentified aircraft overhead',
    detail: 'Low-flying aircraft observed with no visible markings or squawk.',
    severity: 'high',
    weight: 2,
  },
];

/** Reporting elements, each with its own credibility. */
const REPORTERS = [
  { id: 'DISP-01', name: 'Sector Dispatch', credibility: 0.9 },
  { id: 'DISP-02', name: 'Forward Observation Post', credibility: 0.85 },
  { id: 'CIV-11', name: 'Civil Liaison', credibility: 0.6 },
  { id: 'PATROL-04', name: 'Mobile Patrol', credibility: 0.88 },
  { id: 'ANON-00', name: 'Unverified Source', credibility: 0.35 },
] as const;

/** Named demo scenarios the operator can trigger live. */
export type ScenarioName =
  | 'border_spike'
  | 'perimeter_breach'
  | 'severe_weather_impact'
  | 'mass_casualty';

export class IncidentsSimAdapter implements SourceAdapter {
  readonly sourceType = 'incident' as const;
  readonly sourceName = 'FIELD-DISPATCH';
  readonly nominalReliability = 0.72;
  readonly pollIntervalMs: number;

  private readonly rng: Rng;
  private incidentSeq = 0;
  /** Reports queued by a scenario, drained over subsequent polls. */
  private queued: RawObservation[] = [];

  constructor(seed: number, pollIntervalMs = 5_000, private readonly intensity = 1) {
    this.rng = createRng(seed ^ 0x494e4344); // 'INCD'
    this.pollIntervalMs = pollIntervalMs;
  }

  /**
   * Seed a small backlog of standing reports.
   *
   * Without this the incident feed is empty for the first ~15 seconds, because
   * routine reporting is stochastic and sparse by design. An operational
   * picture that opens with one of its five feeds showing nothing reads as a
   * broken integration, and it denies the correlation engine anything to work
   * with until the first report happens to fire.
   */
  init(): void {
    const seed = Math.max(2, Math.round(3 * this.intensity));
    for (let i = 0; i < seed; i++) this.queued.push(this.randomIncident());
  }

  poll(_context: PollContext): PollOutcome {
    const started = Date.now();
    const observations: RawObservation[] = [];

    // Scenario-injected reports take priority and drain a few per poll, so a
    // spike arrives as a believable burst rather than one impossible instant.
    const drain = Math.min(this.queued.length, 3);
    for (let i = 0; i < drain; i++) observations.push(this.queued.shift()!);

    // Routine background reporting.
    if (this.rng.chance(0.35 * this.intensity)) {
      observations.push(this.randomIncident());
    }

    return ok(observations, Date.now() - started);
  }

  private randomIncident(at?: LatLng, forced?: IncidentTemplate): RawObservation {
    const template = forced ?? this.weightedTemplate();
    const sector = this.rng.pick(AO_SECTORS);
    const position =
      at ??
      destinationPoint(
        { lat: sector.lat, lng: sector.lng },
        this.rng.float(0, 360),
        this.rng.float(0, sector.radiusMeters * 0.8),
      );
    const reporter = this.rng.pick(REPORTERS);

    this.incidentSeq++;

    return {
      sourceType: this.sourceType,
      sourceName: this.sourceName,
      timestamp: nowIso(),
      payload: {
        incidentId: `I-${String(this.incidentSeq).padStart(5, '0')}`,
        category: template.category,
        title: template.title,
        detail: template.detail,
        // Severity as CLAIMED by the reporter. Fusion decides the real one.
        reportedSeverity: template.severity,
        lat: position.lat,
        lng: position.lng,
        sector: sector.name,
        reporterId: reporter.id,
        reporterName: reporter.name,
        reporterCredibility: reporter.credibility,
        casualties: template.category === 'medical' ? this.rng.int(1, 3) : 0,
        verified: this.rng.chance(reporter.credibility * 0.6),
      },
    };
  }

  /** Draw a template proportional to its routine-operations weight. */
  private weightedTemplate(): IncidentTemplate {
    const total = TEMPLATES.reduce((s, t) => s + t.weight, 0);
    let roll = this.rng.float(0, total);
    for (const t of TEMPLATES) {
      roll -= t.weight;
      if (roll <= 0) return t;
    }
    return TEMPLATES[0]!;
  }

  /**
   * Inject a coordinated scenario.
   *
   * Each scenario queues a burst of geographically clustered reports. That
   * clustering is what the correlation engine picks up, what drives the
   * severity escalation rule, and what pushes the rate anomaly detector past
   * its z-threshold — a single call exercises the entire pipeline end to end.
   *
   * Returns the epicentre so the caller can also inject matching radar and
   * sensor activity, producing genuine multi-source corroboration.
   */
  triggerScenario(scenario: ScenarioName, at?: LatLng): { epicenter: LatLng; queued: number } {
    const sector = this.rng.pick(AO_SECTORS);
    const epicenter = at ?? { lat: sector.lat, lng: sector.lng };

    const plans: Record<ScenarioName, { category: IncidentCategory; count: number; spreadM: number }> = {
      border_spike: { category: 'unauthorized_entry', count: 7, spreadM: 3_500 },
      perimeter_breach: { category: 'unauthorized_entry', count: 5, spreadM: 1_200 },
      severe_weather_impact: { category: 'equipment_failure', count: 6, spreadM: 8_000 },
      mass_casualty: { category: 'medical', count: 8, spreadM: 900 },
    };

    const plan = plans[scenario];
    const template =
      TEMPLATES.find((t) => t.category === plan.category) ?? TEMPLATES[0]!;

    for (let i = 0; i < plan.count; i++) {
      const at2 = destinationPoint(
        epicenter,
        this.rng.float(0, 360),
        this.rng.float(0, plan.spreadM),
      );
      this.queued.push(this.randomIncident(at2, template));
    }

    return { epicenter, queued: plan.count };
  }

  /**
   * Inject a single arbitrary incident — backs the what-if sandbox, where an
   * operator drags a hypothetical threat onto the map.
   */
  injectIncident(params: {
    lat: number;
    lng: number;
    category?: IncidentCategory;
    title?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }): RawObservation {
    const base =
      TEMPLATES.find((t) => t.category === params.category) ?? this.weightedTemplate();

    const observation = this.randomIncident({ lat: params.lat, lng: params.lng }, {
      ...base,
      title: params.title ?? base.title,
      severity: params.severity ?? base.severity,
    });

    (observation.payload as Record<string, unknown>).injected = true;
    (observation.payload as Record<string, unknown>).reporterName = 'WHAT-IF SANDBOX';
    return observation;
  }

  /** Reports still waiting to be drained, for the metrics panel. */
  pendingCount(): number {
    return this.queued.length;
  }
}
