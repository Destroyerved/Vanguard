# 🛡️ VANGUARD
### Multi-Source Defence Situational Awareness System

> **One picture. Every source. Zero delay.**
> *From fragmented data streams to one unified, explainable operational picture.*

[![Track](https://img.shields.io/badge/Track-Defense-red.svg)](https://github.com/Destroyerved/Vanguard)
[![Event](https://img.shields.io/badge/Event-HackHertz%202026-blue.svg)](https://github.com/Destroyerved/Vanguard)
[![Problem ID](https://img.shields.io/badge/Problem%20ID-D--05-orange.svg)](https://github.com/Destroyerved/Vanguard)
[![Tests](https://img.shields.io/badge/tests-114%20passing-brightgreen.svg)](server/tests)
[![Backend](https://img.shields.io/badge/backend-operational-brightgreen.svg)](server)
[![AI](https://img.shields.io/badge/AI-Gemini%202.0%20%2B%20deterministic%20fallback-purple.svg)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

VANGUARD is an AI-powered **Common Operating Picture (COP) and decision-support platform** for
defense and emergency watchstanders. It ingests five heterogeneous data streams, correlates
them across space and time, computes transparent confidence, prioritizes what matters, and
generates evidence-grounded situation briefings and ranked Courses of Action.

---

## ⚡ The thesis

> **The fusion engine is the product. The language model is a presentation layer.**

Most AI entries are a prompt with a UI attached — remove the API key and nothing remains.
VANGUARD inverts that. Every number an operator sees is produced by deterministic, auditable
code. The model is handed a finished analysis and asked only to phrase it.

**You can verify this in ten seconds:**

```bash
cd server && npm install && npm run smoke
```

No API key. No database. No Docker. The pipeline runs, fuses five feeds, and produces a fully
cited briefing — `provenance.engine: "deterministic"`.

---

## 🚀 Quick start

```bash
git clone https://github.com/Destroyerved/Vanguard.git
cd Vanguard/server
npm install
npm run dev
```

```
HTTP    http://localhost:3001/api/v1
WS      ws://localhost:3001/stream
Health  http://localhost:3001/health
```

**Optional** — richer briefing prose via Gemini:

```bash
cp .env.example .env      # add GEMINI_API_KEY, then restart
```

Without a key the deterministic synthesizer runs instead. Every feature stays operational.

### First things to try

```bash
# The whole picture in one call
curl localhost:3001/api/v1/situation/current

# Explainability drawer — the full confidence arithmetic for one event
curl localhost:3001/api/v1/events/<id>/correlations

# Verify the AI is not hallucinating citations
curl -X POST localhost:3001/api/v1/ai/verify

# Drive an escalation end to end
curl -X POST localhost:3001/api/v1/simulation/scenario \
  -H 'content-type: application/json' -d '{"scenario":"border_spike"}'

# Cut the comms and watch confidence fall across the whole board
curl -X POST localhost:3001/api/v1/simulation/degraded \
  -H 'content-type: application/json' -d '{"enabled":true}'
```

---

## 📚 Documentation

| Document | What it covers |
|---|---|
| **[Master Guidelines](docs/MASTER_GUIDELINES.md)** · [PDF](docs/VANGUARD_Master_Guidelines.pdf) | The learning guide. Domain foundations, engineering principles, the math from first principles, and **the seven real bugs we hit and fixed** |
| **[Backend Walkthrough](docs/BACKEND_WALKTHROUGH.md)** | File-by-file, stage-by-stage tour of the fusion backend |
| **[Architecture](docs/ARCHITECTURE.md)** | System design, layer discipline, failure modes, performance |
| **[Fusion Mathematics](docs/FUSION_MATH.md)** | Every formula, derived and justified |
| **[API Reference](docs/API.md)** | 30 REST endpoints + 11 WebSocket frame types |
| **[Data Model](docs/DATA_MODEL.md)** | `UnifiedEvent` v1.1 contract |
| **[AI Agent Guide](docs/AI_AGENT_GUIDE.md)** | **Read before any agent writes code here** |
| **[Pitch Deck](docs/presentation/PITCH_DECK.md)** · [PDF](docs/presentation/VANGUARD_Pitch_Deck.pdf) | 14 slides, ~6 minutes, with speaker notes |
| **[Demo Script](docs/presentation/DEMO_SCRIPT.md)** · [PDF](docs/presentation/VANGUARD_Demo_Script.pdf) | Stage runbook — every command and number verified live |
| **[PRD](Vanguard_PRD.md)** | Product requirements v1.1 |

---

## 🎯 The operational problem

Five systems describe the **same intrusion**, and none of them knows the others exist:

| Feed | Says |
|---|---|
| Radar | *"Contact, 23.02N 72.57E, 260 knots, no transponder"* |
| Perimeter sensors | *"IR trip, sector 4, amplitude 0.87"* |
| Patrol telemetry | *"GRIZZLY-1 reports visual contact"* |
| Weather | *"Visibility 1.8 km"* |
| Dispatch | *"Unauthorized entry, sector 4"* |

A watchstander assembles that in their head, under time pressure, while the situation develops.

**Putting it all on one screen is not the answer** — that is aggregation, and it makes the
overload worse. Fusion asks the harder question: *which of these observations are about the
same thing?*

---

## 🧠 How it works

```
5 FEEDS  →  NORMALIZE  →  ┌─ 1 DEDUPE      collapse same-source re-reports
                          │  2 CORRELATE   union-find, ΔR ≤5km ∧ ΔT ≤600s
                          │  3 CORROBORATE affinity × proximity × simultaneity
                          │  4 SCORE       reliability × recency × corroboration
                          │  5 ANOMALY     rate / kinematic / spatial z-scores
                          └─ 6 ESCALATE    idempotent rules → threat posture
                                    ↓
                     AI phrases the finished analysis
                                    ↓
                     GROUNDING GATE — enforced in code
                                    ↓
                     REST + WebSocket → Command Center
```

**The stage order is load-bearing.** Deduping *after* correlating would let duplicate
re-reports count as independent confirmation and manufacture false certainty.

### 1. Five sources, one contract

| Feed | Kind | Reliability | Poll |
|---|---|---|---|
| **Open-Meteo** | 🌍 **Live external API** | 0.95 | 120 s |
| Radar / surveillance | Persistent kinematic tracks | 0.92 | 3 s |
| Personnel telemetry | Patrol orbits + visual sightings | 0.88 | 6 s |
| Operational logs | Perimeter sensors + system events | 0.80 | 4 s |
| Field incidents | Dispatches with reporter credibility | 0.72 | 5 s |

Everything normalizes into `UnifiedEvent` v1.1 before entering the pipeline. Adding a sixth
feed touches four files and nothing downstream.

### 2. Explainable confidence

$$\text{Confidence} = \min\!\left(100,\ \text{round}(R_s \times D_t \times B_c \times 100)\right)$$

Live output from `GET /api/v1/events/:id/correlations`:

```
reliability 0.92 × recency 1.00 × corroboration 1.60 = 100%

breakdown   sourceReliability  92    dataFreshness     100
            spatialAgreement   57    temporalAgreement  93
            sourceAgreement   100

counterfactual   without corroboration:  92%
                              fusion:    +8
```

**The counterfactual is the number that matters.** It converts "we fuse sources" from a claim
into a measured quantity.

Corroboration is **capped at 1.6**, and same-source confirmation counts at only 0.35 — because
one radar reporting six times is not six confirmations.

### 3. The anti-hallucination guarantee

Prompting a model not to invent IDs is a request, not a constraint. So VANGUARD assumes it is
lying and checks:

```
1. Resolve every supportingEventId against the event store
2. STRIP    IDs that do not resolve
3. DISCARD  claims left with zero citations
4. RECOMPUTE overall confidence from survivors
```

Enforced in [`ai/grounding.ts`](server/src/ai/grounding.ts). Verify it yourself:

```bash
curl -X POST localhost:3001/api/v1/ai/verify
# → { "verified": true, "totalCitations": 42, "ungroundedCitations": [] }
```

### 4. Anomaly detection runs *before* the model

Three independent z-score detectors — rate, kinematic, spatial. Asking a language model
"does this look unusual?" would replace a verifiable number with an opinion. The model is
*told* what is anomalous; it never decides.

```
kinematic z=2.98 : Speed 312kt is 3.0 sigma from the 92kt mean (sigma 93kt) across 19 contacts
spatial   z=4.57 : Isolated contact: nearest activity 11.7km away, 4.6 sigma beyond normal
```

### 5. Degradation propagates into the math

Feed health multiplies directly into the confidence formula. Cutting the comms does not paint
an amber dot — it lowers the trust weight of every feed, so **every score across the picture
falls**.

| | Before | Degraded | Restored |
|---|---|---|---|
| Mean confidence | 93% | **43%** | 92% |
| Feed reliability | 0.92 | 0.37 | 0.92 |

---

## 📡 API surface

Full reference: **[docs/API.md](docs/API.md)** · `GET /api/v1` returns a live index.

```http
GET  /api/v1/situation/current            posture, counts, source health
GET  /api/v1/situation/timeline           escalation audit log
GET  /api/v1/situation/replay?at=<ms>     4D time-scrubber snapshot

GET  /api/v1/events                       ?source= &severity= &near=lat,lng,km &q=
GET  /api/v1/events/:id/correlations   ★  explainability drawer + counterfactual
GET  /api/v1/events/:id/candidates        links the engine REJECTED, and why

GET  /api/v1/map/{assets|alerts|weather|zones|heatmap|all}    GeoJSON layers

POST /api/v1/ai/briefing?deterministic=   force synthesis (or force no-model)
GET  /api/v1/ai/briefing/latest           cached, never blocks
POST /api/v1/ai/query                     natural-language omnibar
POST /api/v1/ai/verify                 ★  independently re-check citations

GET  /api/v1/intelligence/config       ★  every live tuning constant
GET  /api/v1/intelligence/fusion          per-stage timings and counts
GET  /api/v1/intelligence/anomalies       z-scores with detector attribution

POST /api/v1/simulation/scenario          border_spike | perimeter_breach | ...
POST /api/v1/simulation/degraded          cut/restore comms
POST /api/v1/simulation/inject            what-if sandbox
```

**WebSocket** `ws://localhost:3001/stream` — 11 frame types, push-only, per-connection
sequence numbers for gap detection.

---

## 📊 Measured performance

| Metric | Value |
|---|---|
| Fusion pass (118 events) | **2–37 ms** against a 3000 ms tick budget |
| Correlation comparisons | 803 grid-indexed vs ~7,000 naive |
| NL query (heuristic) | **0–2 ms**, no API call |
| Mean tick duration | ~56 ms (≈50× headroom) |
| Runtime dependencies | 4 (`express`, `ws`, `cors`, `dotenv`) |
| Tests | 114 passing, strict TypeScript, zero `any` |

---

## 🔬 Engineering honesty

Seven real bugs were found by **running** the system, not reading it. Each has a regression
test, and each is documented with its lesson in
[Master Guidelines Part IV](docs/MASTER_GUIDELINES.md).

| Bug | Root cause |
|---|---|
| Whole board turned CRITICAL in a minute | Escalation compounded from *current* severity across ticks |
| 188 events for 10 radar contacts | Every sweep minted a new event ID → false corroboration |
| 37 of 45 events escalated | Escalation keyed on *cluster* source diversity; clusters are transitive |
| Uncorroborated contacts marked CRITICAL | Promotion needed only confidence, which a fresh sensor reaches alone |
| A routine network log reached CRITICAL | Two escalation rules chained within one pass |
| Posture booted at RED | Thresholds calibrated for a far smaller picture |
| A feed empty for the first 15 s | Stochastic reporting with no seeded backlog |

---

## 🏗️ Repository layout

```
Vanguard/
├── server/                        Node.js + TypeScript fusion backend
│   ├── src/
│   │   ├── ingestion/             5 source adapters (1 live API, 4 simulators)
│   │   ├── normalization/         → UnifiedEvent + validation boundary
│   │   ├── fusion/                the 6-stage pipeline
│   │   ├── state/                 event store, threat state, source health
│   │   ├── ai/                    Gemini + grounding + deterministic fallback
│   │   ├── api/                   REST routes and middleware
│   │   ├── ws/                    WebSocket broadcast hub
│   │   └── orchestrator/          the single tick loop
│   ├── tests/                     114 tests
│   └── scripts/smoke.ts           15s end-to-end invariant check
├── docs/                          architecture, math, API, guidelines, PDFs
└── Vanguard_PRD.md                product requirements v1.1
```

---

## 🛠️ Commands

```bash
npm run dev         # tsx watch, hot reload
npm run build       # tsc → dist/
npm start           # run the build
npm test            # 114 tests
npm run typecheck   # strict, noUncheckedIndexedAccess
npm run smoke       # 15s end-to-end pipeline assertions
```

`npm run smoke` asserts what actually broke during development: no uncorroborated CRITICAL
promotions, no event escalated more than two tiers, radar tracks stable across sweeps, posture
not pinned at RED, **zero ungrounded citations**, and confidence falling under degraded comms.

**Run it before a demo.**

---

## 📈 Evaluation alignment

| Criterion | Weight | Implementation |
|---|---|---|
| **Data fusion & multi-source integration** | 30% | 5 feeds incl. live Open-Meteo · `UnifiedEvent` normalization · haversine + temporal correlation with union-find closure · explainable confidence with counterfactual · 3 anomaly detectors · health→reliability coupling |
| **Command map & geospatial UX** | 25% | MapLibre-ready GeoJSON for 4 layers · marker clustering · severity-weighted density heatmap · 4D time-scrubber via `snapshotAt` with `firstSeen` semantics |
| **AI summarization & prioritization** | 25% | Grounded briefings with **enforced** citation checking · ranked COAs with honest tradeoffs · NL omnibar (Gemini + 2 ms heuristic) · explainability drawer with rejected-candidate view |
| **Scalability & craftsmanship** | 20% | 114 tests · ~50× perf headroom · dual-mode AI fallback · degraded-comms simulation · zero-friction setup · 4 runtime dependencies |

---

## 🛣️ Status

- [x] **Phase 1 — Ingestion & Fusion Engine** *(complete, verified)*
  - [x] `UnifiedEvent` v1.1 schema and validation boundary
  - [x] 5 source adapters incl. live Open-Meteo with 3-level fallback
  - [x] 6-stage fusion pipeline with per-stage timings
  - [x] Explainable confidence + counterfactual
  - [x] 3 statistical anomaly detectors
  - [x] Threat posture with hysteresis and audit log
- [x] **Phase 3 — AI Intelligence** *(complete, verified)*
  - [x] Gemini structured-output integration
  - [x] **Enforced citation grounding** + independent verification endpoint
  - [x] Deterministic fallback synthesizer
  - [x] Ranked COAs with tradeoffs · NL omnibar
- [x] **Backend API & streaming** *(complete, verified)*
  - [x] 30 REST endpoints · 11 WebSocket frame types
  - [x] Operator simulation controls (scenarios, degraded comms, what-if)
- [ ] **Phase 2 — Geospatial Command Map** *(API complete; React client pending)*
- [ ] **Phase 4 — Command Center UI & craftsmanship**
- [ ] **Phase 5 — SITREP PDF export, voice briefing**

---

## 👥 Team & scope

**Team:** Destroyer of Worlds
**Event:** HackHertz 2026 — Defense Track · Problem ID **D-05**

> **Defensive scope, enforced in code.** VANGUARD is a situational awareness and
> decision-support system. It does not automate kinetic targeting, weapons release, or lethal
> autonomous decisions. Course-of-action generation is constrained by system instruction to
> observation, verification, reinforcement, evacuation, deconfliction and communication.

[MIT License](LICENSE)
