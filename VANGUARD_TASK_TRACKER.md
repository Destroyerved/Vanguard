# VANGUARD — Team Task Tracker

> **Multi-Source Defence Situational Awareness System**
> Hackathon: **HACKHERTZ 2026 — Defense Track**
> Team: **Destroyer of Worlds**
> PRD Version: **1.1 (Harmonized & Production-Aligned)**

---

## 📊 Current Status — Backend Complete

> Updated after the backend implementation landed (commit `4e68d70`).

| Area | State |
|---|---|
| **Backend fusion pipeline** | 🟢 Complete and verified — ingestion, normalization, 6-stage fusion, threat posture |
| **AI intelligence** | 🟢 Complete — Gemini + enforced citation grounding + deterministic fallback |
| **REST / WebSocket API** | 🟢 Complete — 30 endpoints, 11 frame types |
| **Frontend** | ⬜ Not started — the API surface it needs is documented and live |
| **Tests** | 🟢 114 passing · typecheck clean · `npm run smoke` green |

### Verify it yourself

```bash
cd server && npm install && npm run smoke     # no API key needed
```

### Deliberate divergences from the original plan

The backend was built on **Express + an in-memory store**, not NestJS + PostgreSQL + PostGIS
+ Redis + BullMQ. This was a considered decision, not a shortcut:

- The COP is a **sliding one-hour window over a few thousand records**. Every query is a scan.
  A database buys durability the product does not need.
- The PRD requires **zero-config startup** (`npm run dev`, no Docker, no DB). That is a scored
  differentiator, and a Postgres/PostGIS/Redis stack would remove it.
- Geospatial work is done in-process with haversine plus a spatial grid index — measured at
  803 comparisons for 118 events, and a full fusion pass in 2–37 ms against a 3000 ms budget.

Rows B-02 to B-05 are marked ⚪ `Deferred` with the reasoning in their Notes rather than
silently ticked. **If the team wants persistence, `state/EventStore.ts` is the single seam to
replace** — nothing else in the system touches storage.

### Where the docs live

| Need | Document |
|---|---|
| Learn the system | [`docs/MASTER_GUIDELINES.md`](docs/MASTER_GUIDELINES.md) |
| Change backend code | [`docs/BACKEND_WALKTHROUGH.md`](docs/BACKEND_WALKTHROUGH.md) |
| Build the frontend against it | [`docs/API.md`](docs/API.md) |
| Working as an AI agent here | [`docs/AI_AGENT_GUIDE.md`](docs/AI_AGENT_GUIDE.md) |
| Present it | [`docs/presentation/`](docs/presentation/) |


---

## 📌 How to Use

Every team member should:

1. Find a task assigned to them.
2. Enter their name in **Owner**.
3. Update **Status** regularly.
4. Update **Progress** from `0–100%`.
5. Add the GitHub branch/PR when applicable.
6. Add blockers or important notes.

### Status Values

- ⬜ `Not Started`
- 🟡 `In Progress`
- 🔴 `Blocked`
- 🔵 `Review`
- 🟢 `Done`
- ⚪ `Deferred` — deliberately not built; the reason is recorded in **Notes**

### Priority

- 🔴 `Critical`
- 🟠 `High`
- 🟡 `Medium`
- ⚪ `Low`

---

## 🎯 Evaluation Weight Mapping

| Weight | Area | Primary Task Sections |
|---|---|---|
| **30%** | Data Fusion & Multi-Source Integration | Sections 2–5: Ingestion, Fusion, Confidence, Source Health |
| **25%** | Command Map & Geospatial UX | Section F-06–F-13: MapLibre, layers, clustering, heatmap, time-scrubber |
| **25%** | AI Summarization & Alert Prioritization | Sections B-38–B-41, F-25–F-29: Gemini briefing, COA, NL query, explainability |
| **20%** | Scalability & UI Craftsmanship | Sections F-34–F-43, D-01–D-12: Polish, radar sweep, threat-level HUD, demo |

---

# 🏗️ Project Tasks

## 1. Project Architecture & Setup

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| P-01 | Finalize system architecture — frontend, backend, AI, DB, real-time | | 🟢 Done | 100% | 🔴 Critical | — | | See `docs/ARCHITECTURE.md`. Express + in-memory store, no DB — the PRD requires zero-config startup. |
| P-02 | Define repository structure | | 🟢 Done | 100% | 🟠 High | P-01 | | `server/src/{ingestion,normalization,fusion,state,ai,api,ws,orchestrator}` |
| P-03 | Define API contracts — REST + WebSocket schemas | | 🟢 Done | 100% | 🔴 Critical | P-01 | | 30 REST endpoints + 11 WS frame types — `docs/API.md` |
| P-04 | Create `.env.example` and configuration strategy | | 🟢 Done | 100% | 🟠 High | P-01 | | `.env.example` — every variable optional; server boots with an empty env |
| P-05 | Create Docker development environment | | ⚪ Deferred | 0% | 🟠 High | P-01 | | Deliberate: `npm install && npm run dev` is the whole setup. Docker would add friction the product is designed to avoid. |

---

# 🖥️ Backend

## 2. Backend Foundation

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-01 | Initialize NestJS backend | | 🟢 Done | 100% | 🔴 Critical | — | | Express 4 + TypeScript (ESM) rather than NestJS — 4 runtime deps total, faster cold start, no decorator/DI overhead for a 6-stage pipeline. |
| B-02 | Setup PostgreSQL | | ⚪ Deferred | 0% | 🔴 Critical | B-01 | | DECISION: in-memory ring buffer (`state/EventStore.ts`). The COP is a sliding 1h window over ~5k records; Postgres buys durability the product does not need at the cost of zero-friction setup. |
| B-03 | Setup PostGIS | | ⚪ Deferred | 0% | 🔴 Critical | B-02 | | Geospatial handled in-process: haversine + a spatial grid index (`util/geo.ts`, `fusion/correlate.ts`). 803 comparisons for 118 events. |
| B-04 | Setup Redis | | ⚪ Deferred | 0% | 🟠 High | B-01 | | Not needed — single process, no cross-instance state. |
| B-05 | Setup BullMQ workers | | ⚪ Deferred | 0% | 🟡 Medium | B-04 | | Not needed — one orchestrator tick loop with independent per-adapter cadences. |

## 3. Backend Data Models

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-06 | Create UnifiedEvent model | @rudra129r-lgtm | 🟢 Done | 100% | 🔴 Critical | B-02 | | `types/events.ts` — UnifiedEvent v1.1. See `docs/DATA_MODEL.md` |
| B-07 | Create Source model with reliability profile | @rudra129r-lgtm | 🟢 Done | 100% | 🟠 High | B-02 | | `state/SourceHealthRegistry.ts` — health multiplies into effective reliability, feeding the confidence formula directly |
| B-08 | Create Asset model | @rudra129r-lgtm | 🟢 Done | 100% | 🟠 High | B-02 | | `TacticalAsset` + `GET /api/v1/map/assets` |
| B-09 | Create Incident model | @rudra129r-lgtm | 🟢 Done | 100% | 🔴 Critical | B-02 | | Incidents normalize into UnifiedEvent with a reporter-credibility model |
| B-10 | Create Alert model | | 🟢 Done | 100% | 🔴 Critical | B-02 | | Alerts are severity-filtered events — `GET /api/v1/map/alerts` |
| B-11 | Create Zone model with geospatial data | | 🟢 Done | 100% | 🟠 High | B-03 | | `OperationalZone` + GeoJSON polygons at `GET /api/v1/map/zones` |
| B-12 | Create Weather Observation model | @rudra129r-lgtm | 🟢 Done | 100% | 🟠 High | B-02 | | `WeatherPayload` from the live Open-Meteo grid |
| B-13 | Create Telemetry / Log model | @rudra129r-lgtm | 🟢 Done | 100% | 🟠 High | B-02 | | Perimeter trips, sensor faults and system logs |
| B-14 | Create Situation model | | 🟢 Done | 100% | 🔴 Critical | B-02 | | `SituationSnapshot` + `state/ThreatState.ts` with hysteresis |
| B-15 | Create AI Briefing model | | 🟢 Done | 100% | 🟠 High | B-02 | | `AISummary` with a `provenance` audit trail |
| B-16 | Create Audit Log model | | 🟢 Done | 100% | 🟡 Medium | B-02 | | `EscalationRecord` logs every posture change with its trigger event IDs |

---

# 📡 Multi-Source Data Ingestion

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-17 | Build generic event ingestion endpoint | @rudra129r-lgtm | 🟢 Done | 100% | 🔴 Critical | B-06 | | `ingestion/SourceAdapter.ts` — one interface every feed implements |
| B-18 | Build radar ingestion | @rudra129r-lgtm | 🟢 Done | 100% | 🔴 Critical | B-06 | | Persistent dead-reckoned kinematic tracks, not random points |
| B-19 | Build weather ingestion | @rudra129r-lgtm | 🟢 Done | 100% | 🟠 High | B-06 | | LIVE Open-Meteo API with 3-level fallback (live -> cache -> synthetic) |
| B-20 | Build personnel ingestion | @rudra129r-lgtm | 🟢 Done | 100% | 🟠 High | B-06 | | Patrol orbits + visual sightings that corroborate real contacts |
| B-21 | Build operational logs ingestion | @rudra129r-lgtm | 🟢 Done | 100% | 🟠 High | B-06 | | Perimeter sensors with a modelled false-alarm rate |
| B-22 | Build incident ingestion | @rudra129r-lgtm | 🟢 Done | 100% | 🔴 Critical | B-06 | | Field dispatches + the demo scenario engine |
| B-23 | Implement input validation | @rudra129r-lgtm | 🟢 Done | 100% | 🔴 Critical | B-17 | | `normalization/validate.ts` — repairs what is safe, rejects what is not |
| B-24 | Implement event deduplication | @rudra129r-lgtm | 🟢 Done | 100% | 🟠 High | B-17 | | `fusion/dedupe.ts` — same-source, 150m, 30s, same title |

---

# 🧠 Data Fusion Engine

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-25 | Build event normalization pipeline | @rudra129r-lgtm | 🟢 Done | 100% | 🔴 Critical | B-18–B-22 | | `normalization/normalize.ts` — 5 shapes into one type; entity-stable vs discrete IDs |
| B-26 | Build spatial correlation engine | | 🟢 Done | 100% | 🔴 Critical | B-03, B-25 | | Haversine, ΔR ≤ 5km, grid-indexed |
| B-27 | Build temporal correlation engine | | 🟢 Done | 100% | 🔴 Critical | B-25 | | ΔT ≤ 600s; correlation requires BOTH windows |
| B-28 | Build entity correlation engine | | 🟢 Done | 100% | 🟠 High | B-25 | | Union-find transitive closure — `fusion/correlate.ts` |
| B-29 | Build source agreement engine | | 🟢 Done | 100% | 🔴 Critical | B-25 | | `fusion/corroborate.ts` — affinity × proximity × simultaneity, breadth-first selection |
| B-30 | Build conflict detection engine | | 🟢 Done | 100% | 🟠 High | B-29 | | Conflict is represented rather than resolved: uncorroborated claims simply score lower and both remain visible |
| B-31 | Build data freshness engine | | 🟢 Done | 100% | 🟠 High | B-25 | | Exponential recency decay, 15-minute half-life |

---

# 🎯 Confidence, Priority & Intelligence

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-32 | Implement multi-source confidence scoring | | 🟢 Done | 100% | 🔴 Critical | B-29, B-31 | | `fusion/confidence.ts` — reliability × recency × corroboration. 22 dedicated tests. |
| B-33 | Implement confidence breakdown | | 🟢 Done | 100% | 🔴 Critical | B-32 | | 6-factor breakdown + a counterfactual showing what corroboration contributed |
| B-34 | Implement alert priority engine | | 🟢 Done | 100% | 🔴 Critical | B-32 | | `fusion/severity.ts` — idempotent escalation rules; 4 severity tiers |
| B-35 | Implement anomaly detection | | 🟢 Done | 100% | 🟡 Medium | B-25 | | 3 z-score detectors (rate/kinematic/spatial) with a robust median/MAD fallback — runs BEFORE the model |
| B-36 | Build situation state engine | | 🟢 Done | 100% | 🔴 Critical | B-30, B-32, B-34 | | `state/ThreatState.ts` — GREEN/YELLOW/ORANGE/RED with 15% de-escalation hysteresis |
| B-37 | Build situation history / timeline | | 🟢 Done | 100% | 🟠 High | B-36 | | `GET /api/v1/situation/timeline` + `/replay?at=` point-in-time snapshots |

---

# 🤖 AI / Gemini Backend

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-38 | Integrate Gemini API | | 🟢 Done | 100% | 🔴 Critical | B-36 | | `ai/gemini.ts` — dependency-free structured-JSON client with retry/backoff |
| B-39 | Design structured situation briefing prompt | | 🟢 Done | 100% | 🔴 Critical | B-38 | | `ai/prompts.ts` — the model phrases a finished analysis; it never decides a number |
| B-40 | Implement structured AI output | | 🟢 Done | 100% | 🔴 Critical | B-39 | | `responseSchema` structured output + a deterministic fallback synthesizer |
| B-41 | Implement evidence linking for AI insights | | 🟢 Done | 100% | 🟠 High | B-40 | | `ai/grounding.ts` — invented IDs STRIPPED, uncited claims DISCARDED. `POST /ai/verify` re-checks independently. |

### AI Output Must Cover

- Threat level badge (`GREEN`, `YELLOW`, `ORANGE`, `RED`)
- Executive summary
- Key developments with `supportingEventIds` citations
- Prioritized action items with urgency scores
- Courses of Action (COAs) with tradeoff analysis
- Uncertainties
- Confidence/context

---

# 🌐 Backend APIs

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-42 | Situation REST APIs — current/history/timeline | | 🟢 Done | 100% | 🔴 Critical | B-36 | | `/situation/current`, `/timeline`, `/replay` |
| B-43 | Event REST APIs — list/detail/correlations | | 🟢 Done | 100% | 🟠 High | B-25 | | `/events`, `/:id`, `/:id/correlations`, `/:id/candidates`, `/stats` |
| B-44 | Map APIs — assets/alerts/weather/zones/hotspots | | 🟢 Done | 100% | 🔴 Critical | B-03, B-34 | | assets / alerts / weather / zones / heatmap / all — GeoJSON |
| B-45 | Intelligence APIs — confidence/conflicts/anomalies | | 🟢 Done | 100% | 🟠 High | B-30, B-32, B-35 | | source-health / clusters / anomalies / metrics / fusion / config |

---

# ⚡ Real-Time Backend

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-46 | Build WebSocket gateway | | 🟢 Done | 100% | 🔴 Critical | B-04 | | `ws/hub.ts` — push-only, heartbeat, per-connection sequence numbers |
| B-47 | Stream new events | @rudra129r-lgtm | 🟢 Done | 100% | 🟠 High | B-46, B-17 | | `EVENT_STREAM` frames |
| B-48 | Stream alert updates | | 🟢 Done | 100% | 🔴 Critical | B-46, B-34 | | `ALERT_TRIGGER` per critical event + `ESCALATION` on posture change |
| B-49 | Stream situation updates | | 🟢 Done | 100% | 🔴 Critical | B-46, B-36 | | `SITUATION_UPDATE`, `CLUSTER_UPDATE`, `HEALTH_STATUS`, `ASSET_UPDATE`, `METRICS` |

---

# 🧪 Synthetic Data & Simulation

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-50 | Build synthetic multi-source data generator | @rudra129r-lgtm | 🟢 Done | 100% | 🔴 Critical | B-17 | | 4 seeded simulators — same SIM_SEED reproduces the same scenario on any machine |
| B-51 | Create normal operations scenario | | 🟢 Done | 100% | 🟠 High | B-50 | | Default steady state: ~45 events, posture GREEN/YELLOW |
| B-52 | Create weather degradation scenario | | 🟢 Done | 100% | 🟠 High | B-50 | | `severe_weather_impact` scenario + degraded-comms simulation |
| B-53 | Create multi-source correlation scenario | | 🟢 Done | 100% | 🔴 Critical | B-50, B-26, B-27 | | `border_spike` / `perimeter_breach` — verified driving ORANGE -> RED |
| B-54 | Create conflicting-source scenario | | 🟢 Done | 100% | 🟠 High | B-50, B-30 | | Sensor false alarms and low-credibility reports produce genuine source disagreement |
| B-55 | Build event replay/timeline engine | | 🟢 Done | 100% | 🟡 Medium | B-37 | | `EventStore.snapshotAt()` with firstSeen semantics — backs the 4D time-scrubber |

---

# 🔐 Backend Security & Reliability

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-56 | Implement authentication | | ⬜ Not Started | 0% | 🟠 High | B-01 | | Out of hackathon scope per PRD §3 Non-Goals |
| B-57 | Implement role-based access control | | ⬜ Not Started | 0% | 🟡 Medium | B-56 | | Out of hackathon scope per PRD §3 Non-Goals |
| B-58 | Implement API rate limiting | | ⬜ Not Started | 0% | 🟡 Medium | B-01 | | Body size capped at 1MB; full rate limiting not yet implemented |
| B-59 | Implement audit logging | | 🟢 Done | 100% | 🟡 Medium | B-16 | | Escalations log trigger events; briefings log engine, latency and stripped citations |
| B-60 | Implement system health checks | @rudra129r-lgtm | 🟢 Done | 100% | 🟠 High | B-02, B-04 | | `/health` liveness + `/ready` readiness + `/intelligence/metrics` |
| B-61 | Backend unit tests | @rudra129r-lgtm | 🟢 Done | 100% | 🟠 High | B-32, B-34 | | 114 tests across confidence, fusion, grounding and pipeline |
| B-62 | Backend integration tests | @rudra129r-lgtm | 🟢 Done | 100% | 🟠 High | B-36 | | `npm run smoke` — end-to-end pipeline invariant assertions |

---

# 🎨 Frontend

## 4. Frontend Foundation

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---|---|---|---|---|
| F-01 | Initialize React 18 + TypeScript + **Vite** | | ⬜ Not Started | 0% | 🔴 Critical | — | | PRD §8: Vite for instantaneous HMR |
| F-02 | Setup Tailwind CSS + custom dark tactical HUD theme (military-grade dark, glassmorphism, custom fonts) | | ⬜ Not Started | 0% | 🟠 High | F-01 | | PRD §8: Vanilla CSS + Tailwind |
| F-02b | Setup **Zustand** state management — reactive store connecting map, feed, time-scrubber, AI drawer | | ⬜ Not Started | 0% | 🔴 Critical | F-01 | | PRD §8: Zero-boilerplate reactive store |
| F-03 | Build reusable UI component system (badges, panels, meters, cards, buttons, modals) | | ⬜ Not Started | 0% | 🔴 Critical | F-02 | | |
| F-04 | Build command center application shell (top nav, sidebar, main content, footer) | | ⬜ Not Started | 0% | 🔴 Critical | F-03 | | |
| F-05 | Implement responsive layout | | ⬜ Not Started | 0% | 🟡 Medium | F-04 | | Optimized for desktop command displays and multi-monitor |

---

# 🗺️ Tactical Command Map

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---|---|---|---|---|
| F-06 | Integrate MapLibre GL JS with custom dark tactical basemap | | ⬜ Not Started | 0% | 🔴 Critical | F-04 | | PRD §5.2: WebGL hardware-accelerated, no proprietary API keys |
| F-07 | Build Assets map layer — ground, naval, aerial unit markers with directional headings | | ⬜ Not Started | 0% | 🔴 Critical | F-06 | | |
| F-08 | Build Alerts map layer — color-coded by severity (CRITICAL/HIGH/MEDIUM/LOW) | | ⬜ Not Started | 0% | 🔴 Critical | F-06 | | |
| F-09 | Build Weather map layer — real-time Open-Meteo overlays (precipitation radar, wind vector particles) | | ⬜ Not Started | 0% | 🟠 High | F-06 | | |
| F-10 | Build Zones map layer — operational sectors, restricted airspace, patrol perimeters, incident geofences (GeoJSON) | | ⬜ Not Started | 0% | 🟠 High | F-06 | | |
| F-11 | Build dynamic layer toggles (☑ Assets ☑ Alerts ☑ Weather ☑ Zones) | | ⬜ Not Started | 0% | 🔴 Critical | F-07–F-10 | | |
| F-12 | Build interactive event popups — summary badge, confidence meter, corroborating source tags, drill-down trigger | | ⬜ Not Started | 0% | 🟠 High | F-07, F-08 | | |
| F-13 | Build marker clustering + fly-to focus — dense contacts auto-cluster; clicking alert flies camera to hotspot | | ⬜ Not Started | 0% | 🔴 Critical | F-06 | | PRD §5.2: Marker Clustering & Fly-to Focus |
| F-13b | Build incident heatmap mode — dynamic density surface showing spatial concentration of high-severity events | | ⬜ Not Started | 0% | 🟠 High | F-08 | | PRD §5.2: Incident Heatmap Mode |
| F-43 | Build 4D Time-Scrubber — slider to scrub backwards in time and replay how operational picture unfolded | | ⬜ Not Started | 0% | 🟠 High | F-06, B-55 | | PRD §5.2: 4D Time-Scrubber |

---

# 📊 Command Dashboard

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---|---|---|---|---|
| F-14 | Build situation overview panel — threat level badge, active alerts count, summary | | ⬜ Not Started | 0% | 🔴 Critical | B-42 | | |
| F-15 | Build active alerts panel | | ⬜ Not Started | 0% | 🔴 Critical | B-34 | | |
| F-16 | Build source health panel — live/degraded/down status per source with lastUpdate | | ⬜ Not Started | 0% | 🟠 High | B-60 | | Must match SourceHealth interface |
| F-17 | Build key metrics cards | | ⬜ Not Started | 0% | 🟠 High | F-14 | | |
| F-18 | Build operational event timeline | | ⬜ Not Started | 0% | 🟠 High | B-37 | | |
| F-18b | Build alert escalation timeline — vertical chronological timeline logging every threat-level shift + trigger event responsible | | ⬜ Not Started | 0% | 🟠 High | B-37 | | PRD §5.10 |
| F-19 | Build recent changes panel | | ⬜ Not Started | 0% | 🟠 High | B-37 | | |

---

# 🧠 Intelligence UI

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---|---|---|---|---|
| F-20 | Build confidence indicator — color-coded badges across all UI surfaces: ≥80% Emerald Green, 50–79% Amber Yellow, <50% Crimson Red | | ⬜ Not Started | 0% | 🔴 Critical | B-33 | | PRD §5.4 |
| F-21 | Build confidence breakdown — interactive display of 5 factors with visual bars | | ⬜ Not Started | 0% | 🔴 Critical | B-33 | | |
| F-22 | Build Interactive Explainability Drawer — sliding panel showing: supporting source event cards with raw JSON view, 5 contributing factor breakdown, mathematical confidence computation breakdown | | ⬜ Not Started | 0% | 🔴 Critical | B-33, B-41 | | PRD §5.8: Click any AI bullet or event to open |
| F-23 | Build conflicting-source warnings | | ⬜ Not Started | 0% | 🟠 High | B-30 | | |
| F-24 | Build anomaly indicators | | ⬜ Not Started | 0% | 🟡 Medium | B-35 | | |

---

# 🤖 AI Situation Briefing UI

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---|---|---|---|---|
| F-25 | Build AI executive briefing panel — threat level badge (GREEN/YELLOW/ORANGE/RED), headline, executive summary | | ⬜ Not Started | 0% | 🔴 Critical | B-40 | | |
| F-26 | Build prioritized action items with urgency scores (1–5) | | ⬜ Not Started | 0% | 🔴 Critical | B-40 | | |
| F-26b | Build AI Courses of Action (COA) panel — 2–3 COAs with pros, risks, resource tradeoffs | | ⬜ Not Started | 0% | 🔴 Critical | B-40b | | PRD §5.6 |
| F-27 | Build key developments section with `supportingEventIds` citations (clickable → event detail) | | ⬜ Not Started | 0% | 🟠 High | B-40 | | PRD §5.3: Every claim must cite event IDs |
| F-28 | Build uncertainty section | | ⬜ Not Started | 0% | 🟠 High | B-40 | | |
| F-29 | Build NL Command Query Bar — free-form omnibar, Gemini parses temporal/spatial/severity/source filters, instant map+feed+stats filtering | | ⬜ Not Started | 0% | 🔴 Critical | B-45b | | PRD §5.5: "Show all high-severity radar anomalies near Sector 4 in the past 30 minutes" |

---

# ⚡ Frontend Real-Time

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---|---|---|---|---|
| F-30 | Integrate WebSocket connection to `ws://localhost:3001/stream` | | ⬜ Not Started | 0% | 🔴 Critical | B-46 | | |
| F-31 | Implement live map updates (assets, alerts, weather zones update in real time) | | ⬜ Not Started | 0% | 🔴 Critical | F-30 | | |
| F-32 | Implement live alert updates (alert panel refreshes on ALERT_TRIGGER) | | ⬜ Not Started | 0% | 🔴 Critical | F-30 | | |
| F-33 | Implement live situation updates (threat level, briefing refresh on BRIEFING_UPDATE) | | ⬜ Not Started | 0% | 🔴 Critical | F-30 | | |
| F-33b | Implement live source health updates (HEALTH_STATUS stream) | | ⬜ Not Started | 0% | 🟠 High | F-30, B-49b | | |

---

# ✨ Frontend UX & Polish

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---|---|---|---|---|
| F-34 | Implement loading/skeleton states | | ⬜ Not Started | 0% | 🟡 Medium | — | | |
| F-35 | Implement API/network error states | | ⬜ Not Started | 0% | 🟠 High | — | | |
| F-36 | Implement empty states | | ⬜ Not Started | 0% | 🟡 Medium | — | | |
| F-37 | Implement toast/notification system | | ⬜ Not Started | 0% | 🟡 Medium | — | | |
| F-38 | Accessibility pass | | ⬜ Not Started | 0% | 🟡 Medium | — | | |
| F-39 | Final visual polish | | ⬜ Not Started | 0% | 🔴 Critical | — | | |
| F-39b | Build Voice Briefing Mode — Web Speech API, military-style voice readout of latest Gemini briefing with play/pause controls | | ⬜ Not Started | 0% | 🟠 High | B-40 | | PRD §5.7: Hands-free audio SITREP |
| F-39c | Build Dynamic Tactical Threat Level UI — threat level drives global UI lighting, top nav warning bar, ambient HUD accents, flashing indicators during RED/CRITICAL spikes | | ⬜ Not Started | 0% | 🔴 Critical | B-36 | | PRD §5.9 |
| F-39d | Build radar sweep animation on command center | | ⬜ Not Started | 0% | 🟡 Medium | F-04 | | PRD §10: "Visual Wow Factor" |
| F-40 | Build What-If Scenario Sandbox — drag-and-drop hypothetical threats (severe storm, radar jamming, hostile contact) onto map; triggers client-side re-fusion and updated briefing | | ⬜ Not Started | 0% | 🟡 Medium | B-25 | | PRD §5.11 |
| F-41 | Build Degraded-Comms Simulation UI — amber "DEGRADED MODE — SERVING CACHED COP" banner, freeze last-known positions, visibly increased uncertainty metrics | | ⬜ Not Started | 0% | 🟡 Medium | B-49b | | PRD §5.12 |
| F-42 | Build One-Click SITREP PDF Export — military-formatted PDF via jsPDF/html2canvas containing timestamp, threat level, briefing, active COAs, map snapshot, critical event tables | | ⬜ Not Started | 0% | 🟠 High | B-40 | | PRD §5.13 |

---

# 🔗 Frontend + Backend Integration

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---|---|---|---|---|
| I-01 | Connect frontend to Situation APIs (`/situation/current`, `/situation/timeline`) | | ⬜ Not Started | 0% | 🔴 Critical | B-42, F-14 | | |
| I-02 | Connect frontend to Map APIs (`/map/assets`, `/alerts`, `/weather`, `/zones`) | | ⬜ Not Started | 0% | 🔴 Critical | B-44, F-06 | | |
| I-03 | Connect frontend to Intelligence APIs (`/intelligence/source-health`, confidence, conflicts) | | ⬜ Not Started | 0% | 🔴 Critical | B-45, F-20 | | |
| I-04 | Connect AI briefing UI to backend (`/ai/briefing`, `/ai/briefing/latest`) | | ⬜ Not Started | 0% | 🔴 Critical | B-40, F-25 | | |
| I-04b | Connect NL query bar to backend (`/ai/query`) | | ⬜ Not Started | 0% | 🔴 Critical | B-45b, F-29 | | |
| I-05 | Connect WebSocket live events (EVENT_STREAM, ALERT_TRIGGER, BRIEFING_UPDATE, HEALTH_STATUS) | | ⬜ Not Started | 0% | 🔴 Critical | B-47–B-49b, F-30 | | |
| I-06 | Test complete ingestion → fusion → dashboard flow | | ⬜ Not Started | 0% | 🔴 Critical | B-36, F-33 | | |
| I-07 | Test scenario → AI → briefing flow (including COAs) | | ⬜ Not Started | 0% | 🔴 Critical | B-40b, F-25 | | |

---

# 🎬 Demo & Hackathon Preparation

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---|---|---|---|---|
| D-01 | Prepare primary live demo scenario (PRD §10: 7-step judging walkthrough) | | ⬜ Not Started | 0% | 🔴 Critical | I-06, I-07 | | Must cover all 7 demo steps per PRD §10 |
| D-02 | Prepare backup demo scenario | | ⬜ Not Started | 0% | 🟠 High | I-06 | | |
| D-03 | Add simulation start/stop/reset controls | | ⬜ Not Started | 0% | 🟠 High | B-50 | | |
| D-03b | Add incident spike injection button — "Inject Incident Spike" triggers coordinated border anomaly | | ⬜ Not Started | 0% | 🟠 High | B-50 | | PRD §10 Step 6: Threat status transitions YELLOW → RED dynamically |
| D-03c | Add source dropout injection controls | | ⬜ Not Started | 0% | 🟡 Medium | B-50b | | PRD §5.1 |
| D-04 | Add replay controls | | ⬜ Not Started | 0% | 🟡 Medium | B-55 | | |
| D-05 | Finalize README | | ⬜ Not Started | 0% | 🟠 High | — | | |
| D-06 | Create final architecture diagram | | ⬜ Not Started | 0% | 🟠 High | P-01 | | |
| D-07 | Document API endpoints | | ⬜ Not Started | 0% | 🟡 Medium | B-42–B-45 | | |
| D-08 | Prepare judge walkthrough / pitch | | ⬜ Not Started | 0% | 🔴 Critical | D-01 | | Must include: visual wow, layer interactivity, explainability, NL query, AI briefing+voice, escalation injection, SITREP export |
| D-09 | Full system QA | | ⬜ Not Started | 0% | 🔴 Critical | I-06, I-07 | | |
| D-10 | Deploy frontend | | ⬜ Not Started | 0% | 🔴 Critical | D-09 | | |
| D-11 | Deploy backend + database + Redis | | ⬜ Not Started | 0% | 🔴 Critical | D-09 | | |
| D-12 | Perform final production smoke test | | ⬜ Not Started | 0% | 🔴 Critical | D-10, D-11 | | |

---

# 🏆 Official Problem Statement Coverage

Use this section before submission to verify that **every official requirement is implemented**.

| Official Requirement | Implementation | Task | Owner | Status |
|---|---|---|---|---|
| Multi-stream data aggregation | Weather (Open-Meteo live) + Radar (OpenSky ADS-B) + Personnel (sim) + Logs (CEF/CISA) + Incidents (SALUTE/USGS/GDACS) | B-17–B-22 | @rudra129r-lgtm | 🟢 Done |
| Interactive geospatial tactical map | MapLibre GL JS with dark tactical basemap | F-06 | | ⬜ |
| Assets map layer | Ground, naval, aerial unit markers with directional headings | F-07 | | ⬜ |
| Alerts map layer | Color-coded by severity (CRITICAL/HIGH/MEDIUM/LOW) | F-08 | | ⬜ |
| Weather map layer | Real-time Open-Meteo overlays (precipitation, wind vectors) | F-09 | | ⬜ |
| Zones map layer | GeoJSON operational sectors, restricted airspace, patrol perimeters | F-10 | | ⬜ |
| AI situation synthesis | Gemini 2.0/1.5 Flash structured JSON briefing with grounded citations | B-38–B-40 | | ⬜ |
| Concise executive summary | Threat level badge + executive summary in AISummary | B-40, F-25 | | ⬜ |
| Confidence level indicator | Color-coded badges: ≥80% green, 50–79% amber, <50% red | F-20 | | ⬜ |
| Confidence breakdown | 5-factor breakdown (source, spatial, temporal, reliability, freshness) | F-21, B-33 | | ⬜ |
| Prioritized action items | Alert priority engine + AI-generated ranked actions with urgency (1–5) | B-34, B-40, F-26 | | ⬜ |
| Unified command center | Complete dark-themed command center with all panels | F-04 | | ⬜ |
| Data fusion | Spatial (Haversine) + temporal + source correlation + corroboration | B-25–B-29 | | ⬜ |
| Alert prioritization | Severity + confidence + recency + corroboration + geographic relevance + persistence | B-34 | | ⬜ |
| Scalability | Event-driven backend + Redis + BullMQ queues + WebSocket streaming | B-04, B-05, B-46 | | ⬜ |
| UI craftsmanship | Military-grade dark HUD, glassmorphism, smooth animations, zero-latency | F-02, F-39, F-39d | | ⬜ |
| **Natural-language query bar** | Free-form omnibar → Gemini function-calling → instant map+feed filtering | B-45b, F-29 | | ⬜ |
| **AI Courses of Action** | 2–3 COAs with pros, risks, resource tradeoffs | B-40b, F-26b | | ⬜ |
| **Voice briefing** | Web Speech API military-style audio readout with play/pause | F-39b | | ⬜ |
| **Explainability drawer** | Sliding panel: source cards, raw JSON, 5-factor math breakdown | F-22 | | ⬜ |
| **Threat-level dynamic UI** | Global UI lighting + nav bar + ambient glow + flashing during RED/CRITICAL | F-39c | | ⬜ |
| **Alert escalation timeline** | Vertical timeline of every threat-level shift + trigger event | F-18b | | ⬜ |
| **Marker clustering + fly-to** | Dense contacts auto-cluster; clicking alert flies camera | F-13 | | ⬜ |
| **Incident heatmap** | Dynamic density surface for high-severity events | F-13b | | ⬜ |
| **4D Time-Scrubber** | Slider to replay operational picture over time | F-43 | | ⬜ |
| **What-If sandbox** | Drag-and-drop hypothetical threats → client-side re-fusion | F-40 | | ⬜ |
| **Degraded-comms simulation** | Amber banner, cached COP, frozen positions, uncertainty tags | F-41 | | ⬜ |
| **SITREP PDF export** | One-click military-formatted PDF via jsPDF/html2canvas | F-42 | | ⬜ |
| **Source health monitoring** | live/degraded/down per source with reliability score | B-60, F-16 | | ⬜ |
| **Client fallback mode** | Web Worker ingestion + Zustand store when backend unavailable | P-06 | | ⬜ |

---

# 🧑‍💻 Team Ownership

## Team Members

| Name | Role | Primary Area | Secondary Area |
|---|---|---|---|
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |

### Suggested Ownership Split

**Backend Team**
- Data ingestion (weather live + 4 simulated sources)
- Database & PostGIS
- Data fusion (spatial Haversine + temporal + entity + source agreement)
- Confidence engine (5-factor breakdown with exact formula)
- Priority engine
- APIs (REST + WebSocket 4-type streaming)
- AI integration (Gemini briefing + COA generation + NL query)

**Frontend Team**
- Command center (dark HUD + glassmorphism)
- Tactical map (MapLibre + 4 layers + clustering + heatmap + time-scrubber)
- Dashboard (situation, alerts, source health, metrics, escalation timeline)
- Intelligence UI (confidence badges, explainability drawer)
- AI briefing (panel, COAs, key developments, NL query bar)
- Real-time UI (WebSocket live updates)
- UX polish (radar sweep, threat-level glow, voice briefing, SITREP export, what-if sandbox, degraded mode)

**Integration / DevOps**
- Docker (docker-compose)
- Dual-mode architecture (backend service + client fallback)
- Environment setup
- Deployment
- API integration (all REST + WebSocket endpoints)
- Testing (unit + integration)
- Demo infrastructure (simulation controls, incident injection, scenario prep)

**AI / Intelligence**
- Situation synthesis
- Prompt engineering (grounded claims with event IDs)
- Structured outputs (AISummary + COAs)
- Evidence linking
- Confidence reasoning
- Action prioritization
- NL query parsing (Gemini function calling)

---

# 🚨 Blockers

| Date | Task ID | Person | Blocker | Severity | Resolution | Status |
|---|---|---|---|---|---|---|
| | | | | | | |
| | | | | | | |
| | | | | | | |

---

# 📅 Daily Standup

### Date: `YYYY-MM-DD`

**What I completed yesterday**
-

**What I am working on today**
-

**What is blocking me**
-

**PRs / Commits**
-

---

# 🔥 Final Hackathon Checklist

## Backend

- [ ] All 5 data sources ingest successfully (weather=Open-Meteo live, rest=simulated)
- [ ] Events normalized to UnifiedEvent v1.1 schema
- [ ] Spatial correlation working (Haversine ≤ ΔR)
- [ ] Temporal correlation working (window ≤ ΔT)
- [ ] Source agreement working
- [ ] Conflicts detected
- [ ] Confidence calculated (exact formula: Reliability × Recency × Corroboration)
- [ ] Confidence breakdown (5 factors) exposed via API
- [ ] Alert priority calculated (severity + confidence + recency + corroboration + geo + persistence)
- [ ] Anomaly detection working (z-score)
- [ ] Situation state generated (threat level green/yellow/orange/red)
- [ ] Gemini briefing working (structured JSON, grounded claims)
- [ ] AI Courses of Action working (2–3 COAs with tradeoffs)
- [ ] Evidence linking working (every claim cites event IDs)
- [ ] Source health checks working (live/degraded/down)
- [ ] NL query endpoint working (POST /ai/query)
- [ ] REST APIs working (all endpoints per PRD §7.2)
- [ ] WebSockets working (4 event types: EVENT_STREAM, ALERT_TRIGGER, BRIEFING_UPDATE, HEALTH_STATUS)
- [ ] Synthetic scenarios working (normal, weather degradation, multi-source, conflicting)
- [ ] Incident spike injection working
- [ ] Source dropout injection working
- [ ] Database migrations complete
- [ ] Backend tests passing

## Frontend

- [ ] Command center loads (dark HUD + glassmorphism)
- [ ] Tactical map works (MapLibre GL, dark basemap)
- [ ] Assets layer works (directional headings)
- [ ] Alerts layer works (severity color-coded)
- [ ] Weather layer works (Open-Meteo overlays)
- [ ] Zones layer works (GeoJSON)
- [ ] Layer toggles work
- [ ] Marker clustering + fly-to working
- [ ] Incident heatmap mode working
- [ ] 4D Time-scrubber working
- [ ] Interactive event popups working
- [ ] Situation overview works (threat level badge)
- [ ] Alerts panel works
- [ ] Source health works (live/degraded/down)
- [ ] Alert escalation timeline works
- [ ] Confidence indicator works (color-coded badges)
- [ ] Confidence breakdown works (5-factor visual)
- [ ] Explainability drawer works (raw JSON + formula breakdown)
- [ ] Conflicting-source warnings work
- [ ] AI briefing works (executive summary + citations)
- [ ] Prioritized actions work (urgency scores)
- [ ] AI COA panel works (2–3 COAs with tradeoffs)
- [ ] Key developments with event ID citations work
- [ ] NL query bar works (free-form → instant filtering)
- [ ] Real-time updates work (WebSocket)
- [ ] Live source health streaming works
- [ ] Threat-level dynamic UI works (HUD lighting + nav bar + glow)
- [ ] Voice briefing works (Web Speech API play/pause)
- [ ] Radar sweep animation works
- [ ] Loading/error/empty states work
- [ ] SITREP PDF export works (jsPDF/html2canvas)
- [ ] What-if sandbox works (drag-and-drop → re-fusion)
- [ ] Degraded-comms mode works (amber banner + cached COP)
- [ ] Final UI polish complete

## Integration

- [ ] Frontend ↔ Backend connected (all REST endpoints)
- [ ] Backend ↔ Database connected (PostgreSQL/PostGIS)
- [ ] Backend ↔ Redis connected
- [ ] Backend ↔ Gemini connected
- [ ] WebSocket live updates verified (4 event types)
- [ ] NL query end-to-end verified
- [ ] End-to-end scenario verified (ingestion → fusion → dashboard)
- [ ] Scenario → AI → briefing + COA flow verified
- [ ] Production deployment verified

## Demo

- [ ] Primary scenario tested (PRD §10 7-step walkthrough)
- [ ] Backup scenario tested
- [ ] Simulation controls tested (start/stop/reset)
- [ ] Incident spike injection tested
- [ ] Source dropout injection tested
- [ ] Threat-level transitions verified (YELLOW → RED)
- [ ] NL query demo step prepared
- [ ] Voice briefing demo step prepared
- [ ] SITREP export demo step prepared
- [ ] Degraded-comms demo step prepared
- [ ] Judge walkthrough prepared (all 7 PRD §10 steps)
- [ ] Architecture diagram ready
- [ ] README complete
- [ ] Final production smoke test complete
- [ ] No critical blockers
- [ ] Every official requirement checked off

---

# 🚀 Definition of Done

A task is considered **Done** only when:

- [ ] Code is implemented
- [ ] It works locally
- [ ] Relevant tests pass
- [ ] Frontend/backend integration is verified where applicable
- [ ] Code is pushed to GitHub
- [ ] PR is reviewed/merged
- [ ] Documentation is updated if required
- [ ] Owner has updated progress to `100%`

---

## VANGUARD

> **One picture. Every source. Zero delay.**

**Built by Destroyer of Worlds — HACKHERTZ 2026**
