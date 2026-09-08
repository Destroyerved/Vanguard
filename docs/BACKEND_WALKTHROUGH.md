# VANGUARD — Full Backend Walkthrough

> A file-by-file, stage-by-stage tour of the fusion backend.
> Read this before changing anything in `server/src`.

**Audience:** engineers extending the system, and judges asking "what does it actually do?"
**Companion docs:** [ARCHITECTURE.md](ARCHITECTURE.md) · [FUSION_MATH.md](FUSION_MATH.md) · [API.md](API.md)

---

## 0. The one-paragraph version

Five heterogeneous feeds are polled on independent cadences. Their raw payloads are
normalized into a single `UnifiedEvent` type, validated at the boundary, and written to a
bounded in-memory store. Every tick, the whole active picture runs through a six-stage
fusion pipeline that deduplicates re-reports, correlates observations in space and time,
selects the strongest cross-source corroboration links, computes an explainable confidence
score, flags statistical outliers, and escalates severity where independent sources agree.
The result drives an aggregate threat posture with hysteresis, is broadcast over WebSocket,
and is periodically synthesized into a cited executive briefing — by Gemini when a key is
present, by a deterministic rule engine when it is not.

---

## 1. Directory map

```
server/
├── src/
│   ├── index.ts                  Boot sequence, graceful shutdown
│   ├── app.ts                    Express app factory (no port binding)
│   │
│   ├── config/
│   │   ├── constants.ts          EVERY tuning constant, each one justified
│   │   └── env.ts                Environment parsing. Nothing is required.
│   │
│   ├── types/
│   │   ├── events.ts             UnifiedEvent v1.1 — the authoritative model
│   │   ├── ai.ts                 AISummary, CourseOfAction, NLQueryFilter
│   │   ├── health.ts             SourceHealth, EscalationRecord, metrics
│   │   └── ws.ts                 Discriminated union of WebSocket frames
│   │
│   ├── util/
│   │   ├── geo.ts                Haversine, bearing, centroid, point-in-polygon
│   │   ├── stats.ts              mean, stdDev, z-score, robust z-score (MAD)
│   │   ├── random.ts             Seeded mulberry32 — reproducible demos
│   │   ├── time.ts               ISO handling, ages, military date-time groups
│   │   ├── ids.ts                Sequential AND stable entity IDs
│   │   └── logger.ts             Levelled, scoped console logger
│   │
│   ├── ingestion/                STAGE 0 — get the data
│   │   ├── SourceAdapter.ts      The one interface every feed implements
│   │   ├── weather.openMeteo.ts  REAL external API + 3-level fallback
│   │   ├── radar.sim.ts          Persistent kinematic track simulator
│   │   ├── personnel.sim.ts      Patrol units + visual sightings
│   │   ├── logs.sim.ts           Perimeter sensors + system logs
│   │   └── incidents.sim.ts      Field dispatches + SCENARIO ENGINE
│   │
│   ├── normalization/            STAGE 1 — one shape for everything
│   │   ├── normalize.ts          Five adapters -> UnifiedEvent
│   │   └── validate.ts           Repair what is safe, reject what is not
│   │
│   ├── fusion/                   STAGES 2-7 — the actual product
│   │   ├── dedupe.ts             Collapse redundant re-reports
│   │   ├── correlate.ts          Union-find spatiotemporal clustering
│   │   ├── corroborate.ts        Score and select evidence links
│   │   ├── confidence.ts         THE FORMULA
│   │   ├── anomaly.ts            Three independent z-score detectors
│   │   ├── severity.ts           Escalation rules + threat scoring
│   │   └── pipeline.ts           Orchestrates all six stages, in order
│   │
│   ├── state/
│   │   ├── EventStore.ts         Ring buffer + indices + time travel
│   │   ├── ThreatState.ts        Posture state machine with hysteresis
│   │   └── SourceHealthRegistry.ts  Health -> effective reliability
│   │
│   ├── ai/
│   │   ├── gemini.ts             Dependency-free structured-JSON client
│   │   ├── prompts.ts            System instruction + schemas
│   │   ├── grounding.ts          THE ANTI-HALLUCINATION GUARANTEE
│   │   ├── fallback.ts           Deterministic briefing, zero model calls
│   │   ├── briefing.ts           Synthesis orchestration + cache
│   │   └── nlQuery.ts            Omnibar: Gemini + heuristic, always both
│   │
│   ├── api/
│   │   ├── middleware/           Errors, async wrapper, query validation
│   │   └── routes/               situation, events, map, ai, intelligence, simulation
│   │
│   ├── ws/hub.ts                 Push-only broadcast hub with heartbeat
│   └── orchestrator/Orchestrator.ts   The single heartbeat
│
├── tests/                        114 tests
└── scripts/smoke.ts              15-second pre-demo confidence check
```

---

## 2. Boot sequence (`src/index.ts`)

Order is deliberate and each step depends on the last.

```
1. Construct Orchestrator     adapters, store, health registry, threat state
2. await orchestrator.init()  warms the LIVE Open-Meteo cache
3. createApp(orchestrator)    Express routes bound to that orchestrator
4. hub.attach(server)         WebSocket on the SAME http server, one port
5. server.listen()
6. orchestrator.start()       tick loop + background briefing loop begin
```

**Why step 2 precedes step 6:** starting ingestion before the weather cache is warm
produces a first tick with an empty weather layer. That is the first thing anyone notices.

**Graceful shutdown** is guarded by a `shuttingDown` flag so a second Ctrl-C does not begin a
second teardown. `unhandledRejection` and `uncaughtException` are logged rather than fatal —
the process keeps serving rather than dying mid-demo.

---

## 3. The tick (`src/orchestrator/Orchestrator.ts`)

One timer drives everything, default 3000 ms.

```
TICK
 ├─ 1. POLL      adapters whose own interval has elapsed
 ├─ 2. NORMALIZE raw payloads -> UnifiedEvent
 ├─ 3. VALIDATE  repair or reject at the boundary
 ├─ 4. STORE     upsert into the ring buffer
 ├─ 5. FUSE      the six-stage pipeline over the ACTIVE picture
 ├─ 6. ASSESS    aggregate threat posture, with hysteresis
 ├─ 7. FEED FWD  publish contacts of interest back to the simulators
 └─ 8. BROADCAST WebSocket frames; briefing runs on its own slower loop
```

Three properties worth understanding:

**Independent adapter cadences.** Each adapter declares `pollIntervalMs`. The orchestrator
polls it only when that much time has elapsed. A 120-second weather poll and a 3-second
radar sweep coexist on one timer without either being wrong.

**No tick can throw.** Adapter polls go through `Promise.allSettled`, and the tick body is
wrapped. A failing feed degrades one source; it does not stop the pipeline.

**Briefing is fire-and-forget.** The tick never awaits an inference call. The picture keeps
updating at full rate while a model request is in flight — or hanging.

### Step 7 deserves its own note

```ts
const pointsOfInterest = this.contactsOfInterest(fusion.events);
this.personnel.setPointsOfInterest(pointsOfInterest);
this.logs.setPointsOfInterest(pointsOfInterest);
```

This closes the loop that makes correlation **real rather than lucky**. Non-routine radar
tracks and unresolved incidents are published back to the personnel and perimeter
simulators. Patrols then file visual sightings near actual contacts, and perimeter sensors
trip on things that are genuinely there. Without this the five feeds would be five
independent random processes and any correlation between them would be coincidence.

---

## 4. Stage 0 — Ingestion

### The contract (`ingestion/SourceAdapter.ts`)

```ts
interface SourceAdapter {
  readonly sourceType: SourceType;
  readonly sourceName: string;
  readonly nominalReliability: number;   // 0..1
  readonly pollIntervalMs: number;
  init?(): Promise<void> | void;
  poll(ctx: PollContext): Promise<PollOutcome> | PollOutcome;
  shutdown?(): Promise<void> | void;
}
```

Every feed — the live API and all four simulators — implements this one interface. Swapping
the radar simulator for a real track feed means writing one adapter and changing nothing
else.

**Adapters never construct a `UnifiedEvent`.** They emit `RawObservation` only. That keeps
the boundary between "what the sensor said" and "what VANGUARD believes" explicit.

### Weather — the real one (`weather.openMeteo.ts`)

The only feed carrying genuine external data. One HTTP request covers all five sectors
(Open-Meteo accepts comma-separated coordinate lists), so five stations cost one round trip.

Three-level resilience, and the layer always renders:

| Level | Condition | Behaviour |
|---|---|---|
| `live` | API responds | Fresh measured conditions |
| `degraded` | API unreachable, cache warm | Last good response, flagged `synthetic: true` |
| `degraded` | API unreachable, cache cold | Deterministic climatological baseline |

Severity is assigned by **operational impact**, not meteorological drama: visibility below
2 km degrades optical surveillance, gusts at 35 kt ground rotary and UAV operations, heavy
precipitation attenuates radar. The question is never "is this bad weather" but "does this
degrade sensors, ground aircraft, or mask an approach."

### Radar (`radar.sim.ts`)

Not a random point generator. Maintains **persistent contacts** with position, heading,
speed and altitude, dead-reckoned forward every sweep, with manoeuvre noise and a turn-back
rule at the edge of coverage.

This matters for three reasons:
1. Correlation is only meaningful if a contact stays put long enough for another feed to see
   it. Random points never correlate.
2. The time-scrubber replays a coherent trajectory rather than noise.
3. Kinematic anomaly detection needs a realistic speed distribution to find an outlier in.

`injectHostileContact()` adds a fast, low, small-RCS, non-squawking track — the classic
penetrating-threat profile, and a deliberate kinematic outlier.

### Personnel, Logs, Incidents

- **Personnel** — patrol orbits with drift, readiness and fuel drain, and **visual sightings**
  filed when a contact of interest is inside observation range, with detection probability
  falling off with distance.
- **Logs** — fixed perimeter sensors (IR, seismic, fence-tension, acoustic, magnetic) that
  trip on real contacts, plus a modelled **false-alarm rate**. Signal amplitude is the
  discriminator, and it is carried into the payload so an operator drilling in can see what
  the engine acted on.
- **Incidents** — human reports with a reporter credibility model, plus the **scenario
  engine** (`triggerScenario`) that queues coordinated bursts for the live demo.

---

## 5. Stage 1 — Normalization (`normalization/normalize.ts`)

The single choke point where five incompatible shapes become one type.

### Entity state vs discrete occurrence

The most important distinction in the file:

```ts
base(observation, location, severity, title, description, entityKey?)
```

| `entityKey` | Meaning | ID form | Example |
|---|---|---|---|
| supplied | **Entity state** — a persistent object, re-observed | `EV-RAD-T-R-1042` | radar track, unit telemetry, weather station |
| omitted | **Discrete occurrence** — a thing that happened | `EV-INC-000024` | incident report, perimeter trip, sighting |

Entity-state observations reuse their ID, so re-observation **updates one event in place**.

This was found the hard way. Without it, radar re-emitted all its tracks every sweep and the
store held 188 events for 10 contacts inside a minute. Those near-identical re-reports then
correlated *with each other* and manufactured exactly the false corroboration the fusion
engine exists to prevent.

`firstSeen` is preserved across updates by the store, so the time-scrubber can still answer
"did this contact exist yet at 11:42?" even though `timestamp` has advanced.

### Severity assignment is judgement, written down

Each normalizer encodes an explicit operational rule rather than a bare threshold:

- **Radar** — driven by *non-cooperation*, not speed. A fast airliner squawking a valid code
  is routine; a slow drone with no transponder is not.
- **Incident** — a reported severity is a **claim by a human of known credibility**. A
  high-severity report from an unverified low-credibility source is downgraded one tier.
  VANGUARD does not let an anonymous tip set command posture on its own. If the report is
  real, corroboration will escalate it back up through the fusion rules.
- **Personnel sighting** — filed as `medium`, not `high`. "I see something" is an
  observation, not yet a threat. If it is real, the radar return it coincides with will
  corroborate it.
- **Log trip** — signal amplitude discriminates; suspected false alarms enter as `low` and
  can be promoted by corroboration.

### Validation (`normalization/validate.ts`)

**Repairs** what is safely repairable (clamp an out-of-range confidence, normalize a heading
into 0-360, default a missing array). **Rejects** what is not (missing ID, unparseable
timestamp, coordinates outside the WGS-84 domain).

A malformed event that slips through surfaces later as a `NaN` in a confidence score or a
contact rendered in the Gulf of Guinea — far harder to diagnose than a rejection at the door.

---

## 6. Stages 2-7 — The fusion pipeline (`fusion/pipeline.ts`)

**The ordering is not incidental. Reordering any pair breaks a stated invariant.**

### Stage 2 — Dedupe

Collapse redundant re-reports **first**. Every later stage counts sources; duplicates would
be counted as independent confirmation.

Two events are duplicates when *all* hold: same `sourceType`, within 150 m, within 30 s, same
normalized title. Note the deliberate asymmetry with correlation — dedupe requires the
**same** source, correlation rewards **different** sources. One collapses redundancy, the
other builds independent confirmation.

The survivor is the **newest** event (operationally you act on the latest position) but
inherits the **highest confidence** in the group (the best look you got), and records
absorbed IDs under `raw.mergedFrom`.

### Stage 3 — Correlate

Two events correlate when they satisfy **both** windows: haversine ≤ 5 km **and** |Δt| ≤ 600 s.

Clusters are the **transitive closure** of that relation, computed with union-find (path
compression + union by rank). Transitivity is operationally right: a radar track and a
perimeter trip 8 km apart do not correlate directly, but if a patrol sighting sits between
them and correlates with both, all three belong to one developing picture — the same chain
of reasoning a human analyst performs.

A spatial grid index (cell size = correlation radius) reduces the naive O(n²) scan to roughly
O(n) at realistic densities. Singleton clusters are **not** emitted: a cluster of one is not
a corroborated situation.

### Stage 4 — Corroborate

Correlation says *"these belong to the same situation."*
Corroboration says *"these confirm each other"* — a stricter claim, and the only one allowed
to raise confidence.

```
strength = affinity(sourceA, sourceB) × proximity × simultaneity
```

The affinity matrix encodes evidential compatibility. Radar↔log is the strongest pairing
(two independent instruments observing one physical intrusion). Weather corroborates weakly
and asymmetrically — it *explains* conditions around a contact rather than confirming the
contact exists.

**Selection prefers breadth over depth.** Pass 1 takes the strongest link from each distinct
source type; pass 2 backfills. Without this, an event in a dense radar cluster fills all six
slots with radar and the system looks corroborated while actually being one instrument's
opinion repeated six times.

### Stage 5 — Score

See [FUSION_MATH.md](FUSION_MATH.md) for the full derivation.

```
confidence = min(100, round(sourceReliability × recencyDecay × corroborationBoost × 100))
```

Must run after corroboration (it reads `corroboratedBy`) and before escalation (the
promotion rule reads the score).

### Stage 6 — Anomaly

**Runs before the LLM, never after.** Outlier detection is a solved statistical problem;
asking a language model "does this look unusual?" replaces a verifiable number with an
opinion. The model is *told* which events are anomalous. It is never asked to decide.

Three independent detectors, strongest verdict wins:

| Detector | Question | Method |
|---|---|---|
| **Rate** | Is this feed reporting far above its own baseline? | z-score of the current bucket against 12 rolling windows, per feed |
| **Kinematic** | Is this contact's speed an outlier among its peers? | z-score with the sample excluded from its own baseline |
| **Spatial** | Is this event unusually isolated? | z-score of nearest-neighbour distance; positive tail only |

The rate detector takes whichever of the classical or **robust (median/MAD)** z-score is more
alarmed, because a single extreme spike inflates σ and can mask the very outlier it was meant
to catch.

### Stage 7 — Escalate

The only stage permitted to change `severity` away from what the source reported.
`baseSeverity` always preserves the original claim, so the UI can show
`MEDIUM → HIGH (escalated by fusion)` and the escalation is itself auditable.

**Idempotence first.** The stage resets `severity = baseSeverity` before applying rules.

> This is a hard-won line. The pipeline re-fuses the whole active picture every tick over the
> same event objects. An earlier revision escalated from the *current* severity, so a medium
> event became high on tick two and critical on tick three **with no new evidence**. Within a
> minute the entire board read CRITICAL and the threat score ran away. There is a regression
> test named for this.

**Rule 1 — multi-source corroboration.** An event holding links to ≥ 3 **distinct** feeds
escalates one tier.

> The test is the event's *own* corroboration links, deliberately **not** the source diversity
> of its cluster. Clusters are transitive, so a chain of overlapping 5 km links can span tens
> of kilometres. Escalating every member escalated 37 of 45 events — a distant contact linked
> through two intermediaries inherited "confirmed by three sources" without anything having
> confirmed it.

**Rule 2 — high-confidence promotion to CRITICAL.** Three conditions, all required:

| Condition | Failure mode it prevents |
|---|---|
| `baseSeverity === 'high'` | Rules chaining in one pass: a routine `medium` network log promoted to `high`, then promoted again to CRITICAL |
| `confidence ≥ 85` | The quantitative bar |
| ≥ 1 **independent** corroborator | A fresh reading from a reliable sensor scores ~92% on reliability and recency *alone* — without this, every uncorroborated radar return became CRITICAL on arrival |

One instrument's unconfirmed opinion is not a command emergency, however trustworthy the
instrument.

### Threat scoring

```
score = Σ over live events of  severityWeight × (confidence / 100) × recency
```

Weights are strongly superlinear (`low 0.25, medium 1.5, high 7, critical 15`) because posture
must be driven by **threats, not volume**. A watch floor tracking 200 routine contacts is not
at higher alert than one tracking 20. With a flatter scale, routine traffic accumulates a
permanent floor that makes GREEN unreachable.

**Hysteresis:** escalation is immediate; de-escalation requires the score to fall 15% below
the threshold it would need to re-enter. Without it the HUD flickers at a boundary, which
both looks broken and trains operators to ignore the indicator.

---

## 7. State (`src/state/`)

### EventStore

A bounded ring buffer with a hash index. Deliberately **not** a database: the picture is a
sliding one-hour window, every query is a scan over a few thousand records, and adding
Postgres would buy durability the product does not need while costing the zero-friction setup
it depends on.

`snapshotAt(asOfMs)` powers the 4D time-scrubber. Existence is tested on `firstSeen` and
staleness on `timestamp` clamped to the replay instant — so a contact acquired ten minutes
ago appears in a five-minute-old snapshot even though its timestamp has since advanced.

### SourceHealthRegistry

The coupling that matters:

```ts
effectiveReliability(sourceType)   // live 1.0×, degraded 0.75×, down 0.40×
```

When a feed degrades, VANGUARD does not merely paint an amber dot. It lowers the trust weight
of everything that feed reports, so **confidence across the entire picture falls
automatically**. Degradation propagates into the math instead of being a cosmetic warning.

Measured live: engaging degraded comms moves mean confidence **93% → 43%**, and restoring it
returns to 92%.

### ThreatState

Applies hysteresis and maintains the escalation audit log. Every transition records its
numeric score, its cause, and the **specific events responsible**. "The system went RED" is
never an unexplained UI change.

---

## 8. AI layer (`src/ai/`)

### The division of labour

The model is given a narrow job: turn an **already-fused, already-scored, already-flagged**
evidence pack into command language. It is explicitly *not* asked to decide what is
anomalous, how confident the system is, or which threat level applies — all of that arrives
pre-computed and is handed to it as fact.

That division is why the output can be trusted. The model does what language models are good
at (synthesis and phrasing) and is kept away from what they are unreliable at (quantitative
judgement). Even the returned `threatLevel` is discarded and replaced with the engine's.

### Grounding (`grounding.ts`) — the guarantee

Prompting a model not to invent IDs is necessary but not sufficient; prompts are requests,
not constraints. So VANGUARD does not trust it at all:

1. Every `supportingEventIds` entry is resolved against the store.
2. IDs that do not resolve are **stripped**.
3. Claims left with zero valid citations are **discarded entirely**.
4. `overallConfidence` is **recomputed** from surviving citations — the model does not get to
   assert how confident the system is.

The counts of stripped citations and discarded claims are reported in `provenance`, so the
model's honesty is itself observable. `POST /api/v1/ai/verify` lets anyone re-check
independently.

### Deterministic fallback (`fallback.ts`)

A complete, correctly cited `AISummary` with **no model call at all**. It runs on a missing
key, rate limit, timeout, malformed output, or a briefing so hallucinated that grounding
empties it.

There is a stronger claim here than resilience. Because it reads the same fused evidence and
cites the same IDs, it demonstrates that VANGUARD's value lives in the **fusion engine**, not
the language model. Pull the key out and the system keeps working.

### NL omnibar (`nlQuery.ts`)

The heuristic parser is not merely a fallback. It **always runs first**, and its result is
merged *under* the model's, so a filter it is certain about survives even if the model omits
it. Measured latency: **0-2 ms** with no key, no network.

---

## 9. Where to change things

| To change... | Edit |
|---|---|
| Any tuning constant | `config/constants.ts` — all of them, each justified |
| Add a sixth data feed | New adapter in `ingestion/`, normalizer in `normalization/normalize.ts`, register in `Orchestrator` |
| Confidence formula | `fusion/confidence.ts` + `tests/confidence.test.ts` |
| Escalation rules | `fusion/severity.ts` — mind the idempotence reset |
| Prompt or schema | `ai/prompts.ts` |
| Add an endpoint | New router in `api/routes/`, mount in `app.ts`, document in `API.md` |
| A new WebSocket frame | Add to the union in `types/ws.ts`, broadcast from `Orchestrator` |

**Adding a `SourceType` without a normalizer is a compile error**, not a silent data loss —
the dispatch switch has an exhaustiveness guard.

---

## 10. Verifying a change

```bash
cd server
npm run typecheck    # strict, noUncheckedIndexedAccess
npm test             # 114 tests
npm run smoke        # 15s end-to-end pipeline assertions
npm run dev          # then curl the endpoints
```

`npm run smoke` asserts the invariants that every calibration bug found during this build
would have violated: no uncorroborated CRITICAL promotions, no event escalated more than two
tiers, radar tracks stable across sweeps, posture not pinned at RED, zero ungrounded
citations, and confidence falling under degraded comms.

Run it before a demo.
