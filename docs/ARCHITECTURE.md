# VANGUARD — System Architecture

**Version 1.1** · Problem ID D-05 · HackHertz 2026 Defense Track

---

## 1. Architectural thesis

> **The fusion engine is the product. The language model is a presentation layer.**

Most AI hackathon entries are a prompt with a UI attached: remove the API key and nothing
remains. VANGUARD inverts that. Every number an operator sees — confidence, severity, threat
posture, anomaly flags — is produced by deterministic, auditable code. The model is handed a
finished analysis and asked only to phrase it.

Three consequences follow, and they are the reason the architecture looks the way it does:

1. **It works with no API key.** The deterministic synthesizer produces a complete, correctly
   cited briefing. Verified: `npm run smoke` passes with `GEMINI_API_KEY` unset.
2. **Every claim is checkable.** Confidence decomposes into named factors an operator can
   verify by hand; every AI citation is resolved against the store before it is served.
3. **The model cannot corrupt the picture.** It has no write path to severity, confidence, or
   threat level. Even the `threatLevel` it returns is discarded.

---

## 2. System overview

```
                              DATA SOURCES
                                    │
        ┌───────────┬───────────────┼───────────────┬───────────┐
        │           │               │               │           │
    Open-Meteo    Radar         Personnel        Logs       Incidents
     (LIVE API)   (sim)           (sim)          (sim)         (sim)
     0.95 rel   0.92 rel        0.88 rel       0.80 rel      0.72 rel
     120s poll   3s poll         6s poll        4s poll       5s poll
        │           │               │               │           │
        └───────────┴───────────────┼───────────────┴───────────┘
                                    │  RawObservation[]
                                    ▼
                   ┌────────────────────────────────┐
                   │      INGESTION ORCHESTRATOR    │
                   │  independent per-feed cadences │
                   │  Promise.allSettled isolation  │
                   └────────────────┬───────────────┘
                                    ▼
                   ┌────────────────────────────────┐
                   │         NORMALIZATION          │
                   │   5 shapes -> UnifiedEvent v1.1│
                   │   entity-stable vs discrete IDs│
                   └────────────────┬───────────────┘
                                    ▼
                   ┌────────────────────────────────┐
                   │      VALIDATION BOUNDARY       │
                   │   repair safe · reject unsafe  │
                   └────────────────┬───────────────┘
                                    ▼
                   ┌────────────────────────────────┐
                   │    EVENT STORE (ring buffer)   │
                   │  5000 cap · 1h active horizon  │
                   │  hash index · time-travel      │
                   └────────────────┬───────────────┘
                                    ▼
     ┌──────────────────────────────────────────────────────────┐
     │                  FUSION PIPELINE                         │
     │                                                          │
     │   1 DEDUPE      collapse same-source re-reports          │
     │        ▼                                                 │
     │   2 CORRELATE   union-find over Δ R ≤5km ∧ Δ T ≤600s     │
     │        ▼                                                 │
     │   3 CORROBORATE affinity × proximity × simultaneity      │
     │        ▼        breadth-first link selection             │
     │   4 SCORE       reliability × recency × corroboration    │
     │        ▼                                                 │
     │   5 ANOMALY     rate / kinematic / spatial z-scores      │
     │        ▼                                                 │
     │   6 ESCALATE    idempotent severity rules + threat score │
     └───────────────────────────┬──────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
     ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
     │  THREAT STATE  │ │ SOURCE HEALTH  │ │  AI SYNTHESIS  │
     │  hysteresis    │ │ health drives  │ │  Gemini  ──┐   │
     │  audit log     │ │ reliability    │ │            ▼   │
     └────────┬───────┘ └───────┬────────┘ │  GROUNDING GATE│
              │                 │          │            │   │
              │                 │          │  Deterministic │
              │                 │          │  fallback  ◄┘  │
              │                 │          └───────┬────────┘
              └─────────────────┴──────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
        ┌────────────────┐              ┌────────────────┐
        │  REST /api/v1  │              │  WS /stream    │
        │  30 endpoints  │              │  11 frame types│
        └────────┬───────┘              └───────┬────────┘
                 └───────────────┬──────────────┘
                                 ▼
                  ┌──────────────────────────────┐
                  │   VANGUARD COMMAND CENTER    │
                  │  React 18 · MapLibre GL      │
                  │  Zustand · Recharts          │
                  └──────────────────────────────┘
```

---

## 3. Layer responsibilities

| Layer | Owns | Explicitly does NOT |
|---|---|---|
| **Ingestion** | Polling, feed liveness, raw payloads | Construct `UnifiedEvent`; assign confidence |
| **Normalization** | Shape conversion, base severity from source claims | Assign confidence; escalate severity |
| **Validation** | Reject malformed, repair recoverable | Alter semantics |
| **Store** | Retention, indexing, point-in-time replay | Interpret events |
| **Fusion** | Dedupe, correlate, corroborate, score, flag, escalate | Talk to the network or the model |
| **State** | Posture with hysteresis, health → reliability | Score individual events |
| **AI** | Language, phrasing, COA articulation | Decide severity, confidence, or posture |
| **API/WS** | Serialization, filtering, transport | Compute anything |

The rule that keeps this honest: **only `fusion/confidence.ts` may produce a confidence
number, and only `fusion/severity.ts` may change a severity.**

---

## 4. Key design decisions

### 4.1 Entity state vs discrete occurrence

A radar track is a **persistent object re-observed every sweep**, not one event per sweep.
Entity-state observations derive a stable ID from the entity key and update one event in
place; discrete occurrences get sequential IDs.

*Why it matters:* without this the store held 188 events for 10 contacts within a minute, and
those near-identical re-reports correlated with each other — manufacturing precisely the false
corroboration the fusion engine exists to prevent.

### 4.2 Deterministic simulation

Every simulator draws from a seeded mulberry32 generator keyed on `SIM_SEED`. The same seed
produces the same scenario on every machine. A demo that behaves differently on the judge's
laptop than in rehearsal is a demo you cannot rehearse.

### 4.3 Feedback loop between feeds

Each tick, non-routine contacts are published back to the personnel and perimeter simulators.
Patrols then sight things that are actually there and sensors trip on real contacts. Without
this closed loop, five feeds would be five independent random processes and any correlation
between them would be coincidence rather than evidence.

### 4.4 Health degradation propagates into the math

`SourceHealthRegistry.effectiveReliability()` feeds directly into the confidence formula.
Degrading a feed lowers the trust weight of everything it reports, so confidence across the
whole picture falls. Measured: **93% → 43% → 92%** engaging and clearing degraded comms.

### 4.5 One HTTP server, one port

REST and WebSocket share a single `http.Server`. One port to configure, one process to run,
no CORS surprises between the two channels.

### 4.6 In-memory by design

The operational picture is a sliding one-hour window over a few thousand records. A database
would buy durability the product does not need at the cost of the zero-friction setup it
depends on. `npm install && npm run dev` is the entire deployment story.

---

## 5. Data flow: one contact's life

```
t+0.0s  Radar sweep emits RawObservation { trackId: "R-1042", speed: 260kt, transponder: null }
t+0.0s  normalizeRadar() → severity CRITICAL (non-squawking, fast, low, small RCS)
                          → id EV-RAD-T-R-1042 (stable: this track, not this sweep)
t+0.0s  validateEvent()  → coordinates in domain, heading normalized → accepted
t+0.0s  store.upsert()   → new entry; firstSeen recorded
t+0.0s  Orchestrator publishes its position as a contact of interest

t+3.0s  Perimeter sensor P-302 is within range → trips, amplitude 0.87 → severity HIGH
t+6.0s  Patrol GRIZZLY-1 is within 4.5km → files a visual sighting → severity MEDIUM

t+6.0s  FUSION
        dedupe      → no same-source duplicate
        correlate   → all three within 5km / 600s → cluster CL-000003
        corroborate → radar↔log affinity 0.95, radar↔personnel 0.85 → links selected
        score       → 0.92 × 0.999 × 1.30 = 100% (capped)
        anomaly     → kinematic z = 3.0 (260kt vs 92kt mean) → FLAGGED
        escalate    → 3 distinct sources → +1 tier; already CRITICAL

t+6.0s  Threat score rises; ThreatState escalates ORANGE → RED, logs the trigger IDs
t+6.0s  WS: EVENT_STREAM, ALERT_TRIGGER, CLUSTER_UPDATE, SITUATION_UPDATE, ESCALATION
t+6.0s  Posture change forces an immediate re-briefing

t+6.4s  Briefing cites EV-RAD-T-R-1042 → grounding resolves it → served
```

---

## 6. Failure modes and responses

| Failure | Response | Operator sees |
|---|---|---|
| Open-Meteo unreachable | Serve cache, then synthetic baseline | Amber feed status; `synthetic: true`; layer still renders |
| Gemini key absent | Deterministic synthesizer | Full briefing; `provenance.engine: "deterministic"` |
| Gemini times out / rate limits | 2 retries with backoff, then deterministic | Full briefing; `degradedReason` populated |
| Gemini hallucinates IDs | Stripped; empty claims discarded; falls back if all fail | `citationsStripped` count on screen |
| An adapter throws | `Promise.allSettled` isolates it; health marks degraded | One feed amber, others live |
| A tick throws | Caught and logged; next tick proceeds | Nothing; pipeline continues |
| Malformed event | Repaired or rejected at the boundary | Rejection counted in logs |
| Store fills | Oldest evicted (least operationally relevant) | Nothing; utilization in metrics |
| WebSocket client stalls | Heartbeat reaps after one missed pong | Reconnect; `seq` gaps detectable |

---

## 7. Performance (measured, default settings)

| Metric | Value |
|---|---|
| Fusion pass, ~120 events | **2–37 ms** |
| Slowest stage | corroborate, ~20 ms |
| Mean tick duration | ~56 ms against a 3000 ms budget |
| Pairwise comparisons (grid-indexed) | ~800 for 120 events vs ~7100 naive |
| NL query, heuristic parser | **0–2 ms** |
| Memory | bounded by 5000-event ring buffer |

Headroom is roughly 50× the tick budget.

---

## 8. Security and scope posture

- **Defensive only.** The COA generator is constrained by system instruction to observation,
  verification, reinforcement, evacuation and deconfliction. No kinetic targeting, no weapons
  release, no lethal autonomy.
- **No secrets in the repo.** `.env` is gitignored; `.env.example` documents the variables.
- **The WebSocket is push-only.** Clients cannot drive the pipeline over the socket, so a
  hostile client cannot influence the fusion engine.
- **Simulation controls are gated** behind `ENABLE_SIMULATION_API`, so a deployment can serve
  the read-only picture without exposing mutations.
- **Input validated at the boundary** — coordinates, enums, numeric ranges, body size cap.

---

## 9. Extending the system

Adding a sixth feed touches exactly four places:

1. `ingestion/yourFeed.ts` implementing `SourceAdapter`
2. A normalizer in `normalization/normalize.ts`
3. `SourceType` in `types/events.ts` and a reliability weight in `config/constants.ts`
4. Registration in the `Orchestrator` constructor

Nothing in fusion, AI, API or WebSocket changes — they are written against `UnifiedEvent`
alone. The exhaustiveness guard in the normalizer dispatch turns a forgotten step into a
compile error rather than silent data loss.
