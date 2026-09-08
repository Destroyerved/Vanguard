# VANGUARD — AI Agent Guide

> **Read this file before writing any code in this repository.**
> Applies to Claude, Gemini, Cursor, Windsurf, Copilot, Cline, Antigravity, and any other
> coding agent.

This is the shared, committed contract. Device-local operational rules (git remotes, push
protocol) live in the untracked `AGENTS.md` / `GEMINI.md` / `CLAUDE.md`.

---

## 1. What this project is, in one paragraph

VANGUARD fuses five heterogeneous defense data streams into one explainable Common Operating
Picture. A deterministic pipeline deduplicates, correlates, corroborates, scores, flags and
escalates every observation; a language model then phrases the result. **The fusion engine is
the product; the model is a presentation layer.** Anything that inverts that relationship is
wrong, however impressive it looks in a demo.

---

## 2. The nine rules

### Rule 1 — `UnifiedEvent` v1.1 is the only event shape

Defined in `server/src/types/events.ts`. Non-negotiable field names:

- Coordinates are `lat` / `lng`. Never `latitude`/`longitude`, never `[lng, lat]` tuples
  outside GeoJSON serialization in `api/routes/map.ts`.
- `confidence` is an **integer 0–100**. Never a 0–1 float.
- `sourceType` ∈ `radar | weather | personnel | log | incident`.
- `severity` ∈ `low | medium | high | critical`.
- `baseSeverity` preserves what the source claimed; only fusion may change `severity`.

Adding a `SourceType` without a normalizer is a **compile error** (exhaustiveness guard in
`normalizeObservation`). Do not silence it with a `default` branch — write the normalizer.

### Rule 2 — Only two files may produce these numbers

| Number | Sole owner |
|---|---|
| `confidence`, `confidenceBreakdown` | `fusion/confidence.ts` |
| `severity` (post-fusion), threat score | `fusion/severity.ts` |

If you find yourself writing `confidence: 85` anywhere else, you are introducing a number
nobody can explain. Normalizers set a **provisional** 50 that stage 4 overwrites; that is the
only exception.

### Rule 3 — The model never decides anything quantitative

The LLM is handed a finished analysis. It must never be asked to judge:

- what is anomalous → `fusion/anomaly.ts` (z-scores)
- how confident the system is → recomputed in `ai/grounding.ts` from surviving citations
- what the threat level is → `state/ThreatState.ts`; the model's returned `threatLevel` is
  **discarded and replaced**

Asking a model "does this look unusual?" replaces a verifiable number with an opinion.

### Rule 4 — Every AI claim must be grounded, and grounding is enforced in code

Prompting is a request, not a constraint. `ai/grounding.ts` resolves every
`supportingEventIds` entry against the store, **strips** unresolvable IDs, and **discards**
claims left with none. Never weaken this. Never add a code path that serves model output
without passing through `groundSummary`.

### Rule 5 — Nothing may be required to run

`npm install && npm run dev` with an **empty environment** must produce a complete operational
picture. No API key, no database, no Docker, no cloud account.

Any feature you add needs a working degraded path. Follow the existing pattern: Gemini →
deterministic fallback; Open-Meteo → cache → synthetic baseline.

### Rule 6 — Fusion stage order is load-bearing

```
dedupe → correlate → corroborate → score → anomaly → escalate
```

Each ordering is justified in `fusion/pipeline.ts`. Reordering any pair breaks a stated
invariant — e.g. deduping after correlating lets duplicate re-reports count as independent
confirmation and manufacture false certainty.

### Rule 7 — Escalation must stay idempotent

The pipeline re-fuses the whole active picture **every tick over the same objects**.
`applySeverityEscalation` resets `severity = baseSeverity` before applying rules. Removing
that reset makes severity compound tick over tick until the entire board reads CRITICAL.

There is a regression test named for it. Do not delete it.

### Rule 8 — Entity state vs discrete occurrence

| Kind | ID | Examples |
|---|---|---|
| **Entity state** (persistent, re-observed) | `stableEventId(type, key)` | radar track, unit telemetry, weather station |
| **Discrete occurrence** (happened once) | `nextEventId(type)` | incident report, perimeter trip, visual sighting |

Getting this wrong floods the store with near-duplicates that correlate with each other. It
is the single most damaging mistake available in this codebase.

### Rule 9 — Defensive scope only

VANGUARD is situational awareness and decision support. It must never automate kinetic
targeting, weapons release, or lethal autonomous decisions. COA generation is constrained by
system instruction to observation, verification, reinforcement, evacuation, deconfliction and
communication. **Do not relax that constraint.**

---

## 3. Where things live

```
server/src/config/constants.ts   ← every tuning constant. Change numbers HERE, nowhere else.
server/src/types/events.ts       ← the authoritative data contract
server/src/fusion/pipeline.ts    ← the six stages and why they are in that order
server/src/ai/grounding.ts       ← the anti-hallucination guarantee
server/src/orchestrator/         ← the single tick loop
docs/BACKEND_WALKTHROUGH.md      ← file-by-file tour
docs/FUSION_MATH.md              ← every formula, derived
docs/API.md                      ← 30 endpoints
```

---

## 4. Before you claim a change works

```bash
cd server
npm run typecheck   # strict; noUncheckedIndexedAccess is ON
npm test            # 114 tests
npm run smoke       # 15s end-to-end invariant assertions
```

`npm run smoke` asserts the things that actually broke during the original build:

- no event promoted to CRITICAL without corroboration
- no event escalated more than two tiers
- radar tracks stable across sweeps (entity identity holds)
- posture not pinned at RED on a routine picture
- **zero ungrounded citations**
- confidence falls under degraded comms

If you changed fusion constants, also verify the live behaviour:

```bash
npm run dev
curl localhost:3001/api/v1/intelligence/config   # confirm your constants are live
curl localhost:3001/api/v1/events/stats          # check the severity distribution is sane
```

A healthy baseline looks roughly like: ~45 events, mostly `low`/`medium`, a handful of `high`,
0–3 `critical`, posture GREEN or YELLOW. **If everything is CRITICAL, you have re-introduced a
compounding bug.**

---

## 5. Failure patterns already fixed — do not reintroduce

| Symptom | Root cause | Fix in place |
|---|---|---|
| Whole board turns CRITICAL within a minute | Escalation compounded from current severity across ticks | Reset to `baseSeverity` first |
| 188 events for 10 radar contacts | Every sweep minted a new event ID | Stable entity IDs |
| 37 of 45 events escalated | Escalation keyed on *cluster* source diversity; clusters are transitive and can span tens of km | Key on the event's **own** corroboration links |
| Uncorroborated single radar return marked CRITICAL | Promotion needed only high confidence, which a fresh reliable sensor reaches alone | Require ≥1 independent corroborator |
| Routine network log reaching CRITICAL | Rules 1 and 2 chained within one pass | Gate rule 2 on `baseSeverity === 'high'` |
| Posture boots at RED with nowhere to escalate | Thresholds calibrated for a far smaller picture; routine traffic accumulated a floor | Superlinear severity weights + thresholds calibrated to measured steady state |
| Incident feed empty for the first 15 s | Routine reporting is stochastic and sparse | Seed a small backlog in `init()` |

---

## 6. Style

Match the surrounding code. Specifically:

- **Comments explain *why*, never *what*.** The code says what. If a constant has a value,
  the comment says what would break at a different value.
- Every tuning constant carries a justification where it is defined.
- Strict TypeScript. No `any`. No non-null assertions except where an index is provably safe.
- Prefer a named function over a clever expression — a defense judge may read this.
- No new runtime dependencies without a clear reason. The backend runs on four:
  `express`, `ws`, `cors`, `dotenv`. Gemini is called with plain `fetch`.

---

## 7. Answering the hard questions

If a judge or reviewer asks, these are the honest answers:

**"Is this just a wrapper around Gemini?"**
No. Delete the API key and everything still works — `provenance.engine` flips to
`deterministic` and a fully cited briefing is still produced. The fusion engine is 100%
deterministic code with 114 tests.

**"How do you know the AI isn't hallucinating?"**
Every citation is resolved against the event store before serving. Invented IDs are stripped,
uncited claims are discarded, and the counts are shown on screen. `POST /api/v1/ai/verify`
re-checks it independently.

**"Where do the confidence numbers come from?"**
`reliability × recency × corroboration`, all three factors surfaced per event at
`GET /api/v1/events/:id/correlations`, along with a counterfactual showing what corroboration
actually contributed. `GET /api/v1/intelligence/config` serves the live constants.

**"Is the data real?"**
Weather is genuinely live from Open-Meteo. The other four are high-fidelity simulators —
persistent kinematic tracks, modelled sensor false-alarm rates, reporter credibility — because
real radar and personnel feeds are classified. Every adapter implements one interface, so
swapping in a real feed is one file.
