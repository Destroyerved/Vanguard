# VANGUARD — Data Model Reference

**`UnifiedEvent` v1.1** — the authoritative contract.
Source of truth: `server/src/types/events.ts`.

---

## The central idea

Five feeds speak five different languages. Exactly one place in the system translates them,
and everything downstream — fusion, AI, API, WebSocket — is written against a single type and
has no knowledge of radar payloads or WMO weather codes.

That is what makes a sixth feed a one-file change.

---

## `UnifiedEvent`

```ts
interface UnifiedEvent {
  id: string;                       // "EV-RAD-T-R-1042" or "EV-INC-000024"
  sourceType: SourceType;           // radar | weather | personnel | log | incident
  sourceName: string;               // "RADAR-PRIMARY"
  timestamp: string;                // ISO 8601 UTC — MOST RECENT observation
  firstSeen?: string;               // ISO 8601 UTC — FIRST observation
  location: GeoLocation;
  severity: SeverityLevel;          // fused verdict
  baseSeverity: SeverityLevel;      // what the SOURCE claimed — never mutated
  title: string;                    // <= 80 chars
  description: string;
  confidence: number;               // integer 0-100
  confidenceBreakdown?: ConfidenceBreakdown;
  corroboratedBy: string[];         // IDs of independently confirming events
  clusterId?: string;               // "CL-000003"
  isAnomaly: boolean;
  anomalyReason?: string;
  raw: Record<string, unknown>;     // untouched source payload — the audit trail
}
```

### Field rules that are not negotiable

| Field | Rule |
|---|---|
| `location.lat` / `.lng` | WGS-84 decimal degrees. **Never** `latitude`/`longitude`. **Never** `[lng, lat]` outside GeoJSON serialization in `api/routes/map.ts` |
| `confidence` | Integer 0–100. Never a 0–1 float |
| `severity` vs `baseSeverity` | Only `fusion/severity.ts` may change `severity`. `baseSeverity` is immutable after normalization — it is what makes escalation auditable and idempotent |
| `raw` | Passed through untouched. It is the audit trail; never normalize into it |
| `timestamp` | Advances on every observation of an entity. Use `firstSeen` to ask when it was acquired |

---

## Identity: the most important distinction in the model

| Kind | Generator | ID form | Semantics |
|---|---|---|---|
| **Entity state** | `stableEventId(type, key)` | `EV-RAD-T-R-1042` | A persistent object, re-observed. Updates **one event in place** |
| **Discrete occurrence** | `nextEventId(type)` | `EV-INC-000024` | A thing that happened once. Always a new event |

| Source | Kind | Entity key |
|---|---|---|
| Radar track | entity | `trackId` |
| Unit telemetry | entity | `unitId` |
| Weather station | entity | `stationName` |
| Visual sighting | discrete | — |
| Perimeter trip | discrete | — |
| Sensor fault | discrete | — |
| System log | discrete | — |
| Incident report | discrete | — |

**Why this matters.** Without stable entity IDs, radar minted a new event every sweep — 188
events for 10 contacts inside a minute. Those near-identical re-reports then correlated *with
each other* and manufactured false corroboration: the exact failure the fusion engine exists
to prevent.

IDs are human-legible on purpose. A judge reading a citation of `EV-RAD-T-R-1042` can tell at
a glance it came from radar and find it in the feed without a lookup table. Opaque UUIDs would
destroy that.

---

## `GeoLocation`

```ts
interface GeoLocation {
  lat: number;                  // -90 .. +90
  lng: number;                  // -180 .. +180
  altitudeMeters?: number;      // AMSL
  headingDegrees?: number;      // 0-360, clockwise from true north
  speedKnots?: number;
}
```

Optional kinematics are **dropped rather than defaulted** when invalid — a bad reading must
never silently become a plausible-looking zero.

---

## `ConfidenceBreakdown`

Every field is an integer 0–100 so the UI renders it directly and a judge can check the
arithmetic by hand.

```ts
interface ConfidenceBreakdown {
  overall: number;             // == UnifiedEvent.confidence
  sourceAgreement: number;     // distinct source types agreeing, saturates at 3
  spatialAgreement: number;    // how tightly corroborators cluster in space
  temporalAgreement: number;   // how tightly they cluster in time
  sourceReliability: number;   // feed trust weight after health degradation
  dataFreshness: number;       // exponential recency decay
}
```

`spatialAgreement` and `temporalAgreement` report **0 when there are no corroborators** — with
nothing to agree with, agreement is zero. Honest rather than flattering.

---

## `CorrelationCluster`

```ts
interface CorrelationCluster {
  id: string;                     // "CL-000003"
  eventIds: string[];
  distinctSources: SourceType[];
  centroid: { lat: number; lng: number };
  radiusMeters: number;           // greatest member distance from centroid
  firstSeen: string;
  lastSeen: string;
  peakSeverity: SeverityLevel;
  meanConfidence: number;
}
```

Clusters are the **transitive closure** of pairwise correlation. Singletons are never emitted
— a cluster of one is not a corroborated situation.

Centroids are computed in 3-D Cartesian space and projected back, which is correct across the
antimeridian and at high latitudes where averaging degrees is not.

> **Caution for anyone extending this:** a property of a cluster is *not* a property of its
> members. Because clusters are transitive, a chain of overlapping 5 km links can span tens of
> kilometres. Severity escalation deliberately reads each event's **own** `corroboratedBy`,
> never the cluster's `distinctSources`.

---

## AI contracts

```ts
interface AISummary {
  generatedAt: string;
  threatLevel: ThreatLevel;        // supplied by the engine; model output discarded
  headline: string;
  executiveSummary: string;
  keyDevelopments: GroundedClaim[];
  prioritizedActions: PrioritizedAction[];
  coursesOfAction: CourseOfAction[];
  overallConfidence: number;       // recomputed from surviving citations
  provenance: BriefingProvenance;
}

interface GroundedClaim {
  point: string;
  supportingEventIds: string[];    // never empty after grounding
}

interface BriefingProvenance {
  engine: 'gemini' | 'deterministic';
  model?: string;
  latencyMs: number;
  eventsConsidered: number;
  citationsStripped: number;       // invented IDs removed
  claimsDiscarded: number;         // claims with zero valid evidence
  degradedReason?: string;
}
```

**The grounding invariant:** after `groundSummary`, every `supportingEventIds` entry resolves
to a real event in the store, and no claim has an empty citation list.
`findUngroundedCitations()` must always return `[]` — asserted in the test suite and served at
`POST /api/v1/ai/verify`.

`provenance` makes the model's honesty observable rather than assumed.

---

## Health and telemetry

```ts
interface SourceHealth {
  sourceType: SourceType;
  sourceName: string;
  status: 'live' | 'degraded' | 'down';
  lastUpdate: string;
  reliabilityScore: number;        // EFFECTIVE, after health degradation
  nominalReliability: number;      // when fully healthy
  activeCount: number;
  totalIngested: number;
  consecutiveFailures: number;
  meanLatencyMs: number;
  manuallyDegraded: boolean;
  note?: string;
}
```

`reliabilityScore` is the value fed into the confidence formula. Multipliers: `live` 1.00,
`degraded` 0.75, `down` 0.40. This is the coupling that makes feed degradation propagate into
every score rather than being a coloured dot.

```ts
interface EscalationRecord {
  id: string;                      // "ESC-000007"
  timestamp: string;
  from: ThreatLevel;
  to: ThreatLevel;
  score: number;
  reason: string;
  triggerEventIds: string[];       // the events actually responsible
}
```

---

## Enums

```ts
type SourceType   = 'radar' | 'weather' | 'personnel' | 'log' | 'incident';
type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';   // ordered
type ThreatLevel   = 'green' | 'yellow' | 'orange' | 'red';    // ordered
type SourceStatus  = 'live' | 'degraded' | 'down';
```

`SEVERITY_ORDER` and `THREAT_ORDER` export the canonical orderings — always compare by index,
never by string.

---

## Validation contract

`normalization/validate.ts` gates the store.

**Rejects (fatal):** missing/empty `id`, unknown `sourceType`, unparseable `timestamp`,
missing or non-numeric coordinates, coordinates outside the WGS-84 domain.

**Repairs (non-fatal):** out-of-range confidence is clamped, invalid severity defaults to
`low`, missing `corroboratedBy` becomes `[]`, headings normalize into 0–360, titles truncate
at 80 chars, non-numeric optional kinematics are dropped.

A malformed event that slips through surfaces later as a `NaN` in a confidence score or a
contact rendered in the Gulf of Guinea — far harder to diagnose than a rejection at the door.
