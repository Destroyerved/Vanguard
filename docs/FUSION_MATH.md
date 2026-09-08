# VANGUARD — Fusion Mathematics

> Every number on the screen, derived. Nothing here requires trusting a model.

All constants live in `server/src/config/constants.ts` and are served live at
`GET /api/v1/intelligence/config`, so this document can never drift from the running engine.

---

## 1. Confidence

### 1.1 The formula

$$
\text{Confidence} = \min\!\left(100,\ \operatorname{round}\!\left(R_s \times D_t \times B_c \times 100\right)\right)
$$

| Term | Name | Range | Source |
|---|---|---|---|
| $R_s$ | Source reliability | 0.0 – 1.0 | Feed weight × health multiplier |
| $D_t$ | Recency decay | 0.05 – 1.0 | Exponential in event age |
| $B_c$ | Corroboration boost | 1.0 – 1.6 | Independent confirming sources |

Three properties make this defensible in front of defense judges:

1. **Deterministic** — no model, no randomness. Same inputs, same score, always.
2. **Decomposable** — every factor is surfaced individually, so an operator can see *why* a
   score is what it is rather than being asked to trust it.
3. **Bounded** — corroboration is capped, so a flood of correlated low-grade reports cannot
   manufacture false certainty.

### 1.2 Source reliability $R_s$

$$R_s = R_{\text{nominal}} \times H$$

| Feed | $R_{\text{nominal}}$ | Rationale |
|---|---|---|
| Weather (Open-Meteo) | 0.95 | Real measured API, calibrated, low noise |
| Radar | 0.92 | Calibrated instrument, but clutter and ghosts |
| Personnel | 0.88 | GPS telemetry — accurate but sparse, latency-prone |
| Log / sensors | 0.80 | Deterministic machine events, prone to false trips |
| Incident | 0.72 | Human-reported: highest variance and reporting bias |

Health multiplier $H$: `live` → 1.00, `degraded` → 0.75, `down` → 0.40.

The ordering encodes a judgement: instrumented sensors with calibrated error models outrank
machine-generated logs, which outrank unverified human field reports.

### 1.3 Recency decay $D_t$

$$D_t = \max\!\left(0.05,\ e^{-\lambda \Delta t}\right), \qquad \lambda = \frac{\ln 2}{T_{1/2}}, \qquad T_{1/2} = 900\ \text{s}$$

| Age | $D_t$ |
|---|---|
| 0 s | 1.000 |
| 5 min | 0.794 |
| **15 min** | **0.500** ← half-life |
| 30 min | 0.250 |
| 60 min | 0.063 |
| ≥ 78 min | 0.050 (floor) |

A 15-minute half-life matches the operational tempo of a watch floor: older than that and you
re-verify before acting. The floor prevents a stale but still-relevant observation collapsing
to exactly zero weight.

**Side effect worth noting:** because recency is a live term, the threat score decays on its
own as a situation goes quiet. No separate decay job is needed.

### 1.4 Corroboration boost $B_c$

$$B_c = \min\!\left(1.6,\ 1 + 0.15 \times (N_{\text{eff}} - 1)\right)$$

where the **effective** source count discounts same-source confirmation:

$$N_{\text{eff}} = 1 + \sum_{c \in C} w_c, \qquad w_c = \begin{cases} 1.00 & \text{if } \text{type}(c) \neq \text{type}(e) \\ 0.35 & \text{if } \text{type}(c) = \text{type}(e) \end{cases}$$

Two returns from the same radar are one instrument's opinion expressed twice. Radar plus a
thermal tripwire is genuinely independent evidence. **Fusion rewards independence, not
volume.**

| Corroborators | $N_{\text{eff}}$ | $B_c$ |
|---|---|---|
| none | 1.00 | 1.000 |
| 1 same-source | 1.35 | 1.053 |
| 1 cross-source | 2.00 | 1.150 |
| 3 cross-source | 4.00 | 1.450 |
| 5 cross-source | 6.00 | 1.600 (capped) |

The 1.6 cap corresponds to five fully independent sources; a sixth adds nothing.

### 1.5 Worked example (live output)

A non-squawking UAV track, corroborated by log, incident and personnel:

```
reliability 0.92 × recency 0.9991 × corroboration 1.6 = 147% → capped at 100%

breakdown: { overall: 100, sourceAgreement: 100, spatialAgreement: 57,
             temporalAgreement: 93, sourceReliability: 92, dataFreshness: 100 }

counterfactual: without corroboration = 92%   (gain: +8)
```

The **counterfactual** is served by `GET /api/v1/events/:id/correlations` and answers the
question that actually matters: *what did cross-source agreement buy me here?*

### 1.6 The breakdown factors

All are integers 0–100 so the UI renders them directly and a judge can check the arithmetic.

| Factor | Definition |
|---|---|
| `sourceReliability` | $R_s \times 100$ |
| `dataFreshness` | $D_t \times 100$ |
| `sourceAgreement` | $\min(1, \text{distinctTypes}/3) \times 100$ |
| `spatialAgreement` | $\text{mean}_c \max(0, 1 - d_c/\Delta R) \times 100$ |
| `temporalAgreement` | $\text{mean}_c \max(0, 1 - \|\Delta t_c\|/\Delta T) \times 100$ |

Spatial and temporal agreement report **0 when there are no corroborators** — with nothing to
agree with, agreement is zero. This is honest rather than flattering.

---

## 2. Correlation

Two events correlate when **both** windows are satisfied:

$$d_{\text{haversine}}(a,b) \le \Delta R = 5000\ \text{m} \quad \wedge \quad |t_a - t_b| \le \Delta T = 600\ \text{s}$$

Haversine rather than a planar approximation: with a 5 km radius over a 90 km AO, flat-earth
error would bias clustering near the AO edges.

$$d = 2R \arcsin\sqrt{\sin^2\!\frac{\Delta\varphi}{2} + \cos\varphi_1 \cos\varphi_2 \sin^2\!\frac{\Delta\lambda}{2}}$$

Clusters are the **transitive closure** of the pairwise relation, via union-find with path
compression and union by rank. Transitivity is operationally correct: A and C 8 km apart do
not correlate directly, but if B sits between and correlates with both, all three belong to
one developing picture.

**Complexity.** A spatial grid with cell size $\Delta R$ means any correlating pair must share
a cell or be neighbours, reducing the naive $O(n^2)$ scan to roughly $O(n)$. Measured: **803
comparisons for 118 events**, against ~7,000 for the naive scan.

Singleton clusters are not emitted — a cluster of one is not a corroborated situation.

---

## 3. Corroboration strength

$$S(e, c) = A\big(\text{type}(e), \text{type}(c)\big) \times \underbrace{\max\!\left(0, 1 - \tfrac{d}{\Delta R}\right)}_{\text{proximity}} \times \underbrace{\max\!\left(0, 1 - \tfrac{|\Delta t|}{\Delta T}\right)}_{\text{simultaneity}}$$

### Affinity matrix $A$

*"If feed A reports something, how much does a report from feed B increase my belief?"*

| | radar | log | personnel | incident | weather |
|---|---|---|---|---|---|
| **radar** | 0.35 | **0.95** | 0.85 | 0.80 | 0.30 |
| **log** | **0.95** | 0.35 | 0.90 | 0.85 | 0.25 |
| **personnel** | 0.85 | 0.90 | 0.35 | 0.90 | 0.30 |
| **incident** | 0.80 | 0.85 | 0.90 | 0.35 | 0.45 |
| **weather** | 0.30 | 0.25 | 0.30 | 0.45 | 0.35 |

- **Radar ↔ log is strongest (0.95)** — two independent instruments observing one physical
  intrusion by completely different mechanisms.
- **Weather is deliberately weak.** It *explains* conditions around a contact (sensor masking,
  degraded optics) rather than confirming the contact exists. It stays in the graph so the
  briefing can say "storm cell is masking optical surveillance", but it cannot inflate a
  contact's confidence on its own.
- **Same-source is 0.35** throughout — the diagonal.

Links below $S = 0.2$ are discarded as non-informative.

### Selection: breadth before depth

1. Score every cluster neighbour, drop links below threshold, sort by strength.
2. **Pass 1** — take the strongest link from each *distinct* source type.
3. **Pass 2** — backfill remaining slots (max 6) with the next strongest.

Without pass 1, an event in a dense radar cluster fills all six slots with radar. The system
would then *look* corroborated while actually being one instrument's opinion repeated six
times — and the confidence engine would see no cross-source independence to reward.

---

## 4. Deduplication

Duplicates when **all** hold:

$$\text{type}(a) = \text{type}(b) \ \wedge\ d \le 150\text{m} \ \wedge\ |\Delta t| \le 30\text{s} \ \wedge\ \text{title}_{\text{norm}}(a) = \text{title}_{\text{norm}}(b)$$

Note the **deliberate asymmetry with correlation**: dedupe requires the *same* source,
correlation rewards *different* sources. One collapses redundancy; the other builds
independent confirmation.

Survivor policy: **newest** event (you act on the latest position), inheriting the **highest
confidence** in the group (the best look you got), with absorbed IDs recorded in
`raw.mergedFrom`.

---

## 5. Anomaly detection

All three detectors run **before** the LLM. Outlier detection is a solved statistical
problem; asking a language model "does this look unusual?" replaces a verifiable number with
an opinion.

$$z = \frac{x - \mu}{\sigma}, \qquad \text{flag when } |z| \ge 2.5$$

### Robust fallback

$$z_{\text{robust}} = \frac{0.6745\,(x - \tilde{x})}{\text{MAD}}, \qquad \text{MAD} = \text{median}(|x_i - \tilde{x}|)$$

The 0.6745 scaling makes it match the classical z-score for normally distributed data. The
rate detector takes whichever is **more alarmed**, because a single extreme spike inflates
$\sigma$ and can mask the very outlier it was meant to catch.

| Detector | Question | Baseline |
|---|---|---|
| **Rate** | Is this feed reporting above its own history? | 12 rolling 5-minute buckets, per feed |
| **Kinematic** | Is this contact's speed an outlier? | All other radar speeds, sample excluded from its own baseline |
| **Spatial** | Is this event unusually isolated? | Nearest-neighbour distances; **positive tail only** |

Per-feed baselines matter: a chatty log feed must not be permanently flagged just for being
chattier than radar. Feeds that report nothing still record a zero, otherwise a feed that goes
silent and returns looks like a spike against a baseline that never saw the silence.

**Live output:** `Speed 312kt is 3.0 sigma from the 92kt mean (sigma 93kt) across 19 contacts`

---

## 6. Severity escalation

`baseSeverity` always preserves what the source reported; `severity` is the fused verdict.

### Idempotence

The stage **resets `severity = baseSeverity`** before applying rules.

> The pipeline re-fuses the whole active picture every tick over the same event objects. An
> earlier revision escalated from the *current* severity, so a medium event became high on
> tick two and critical on tick three **with no new evidence**. Within a minute the whole board
> read CRITICAL. Regression test: *"does not compound severity when the same events are fused
> repeatedly."*

### Rule 1 — multi-source corroboration

$$|\{\text{type}(c) : c \in \text{corroboratedBy}(e)\} \cup \{\text{type}(e)\}| \ge 3 \implies \text{severity} \mathrel{+}= 1\ \text{tier}$$

The test is the event's **own** links, not its cluster's source diversity. Clusters are
transitive, so a chain of 5 km links can span tens of kilometres; escalating every member
escalated 37 of 45 events, letting a distant contact inherit "confirmed by three sources"
without anything having confirmed it.

### Rule 2 — promotion to CRITICAL

All three required:

$$\text{baseSeverity} = \text{high} \ \wedge\ \text{confidence} \ge 85 \ \wedge\ |\{c : \text{type}(c) \ne \text{type}(e)\}| \ge 1$$

| Condition | Failure mode prevented |
|---|---|
| `baseSeverity === 'high'` | Rules chaining in one pass — a routine `medium` log promoted twice to CRITICAL |
| `confidence ≥ 85` | The quantitative bar |
| ≥1 independent corroborator | A fresh reliable-sensor reading scores ~92% *alone*; without this every uncorroborated radar return became CRITICAL on arrival |

---

## 7. Threat posture

$$\text{score} = \sum_{e \in \text{live}} W(\text{severity}_e) \times \frac{\text{confidence}_e}{100} \times D_t(e)$$

| Severity | Weight |
|---|---|
| low | 0.25 |
| medium | 1.50 |
| high | 7.00 |
| critical | 15.00 |

Strongly superlinear on purpose: **posture must track threats, not volume.** One CRITICAL
outweighs 240 routine observations. A watch floor tracking 200 routine contacts is not at
higher alert than one tracking 20 — with a flatter scale, routine traffic accumulates a
permanent floor that makes GREEN unreachable and the indicator meaningless.

### Thresholds

| Posture | Score | Meaning |
|---|---|---|
| GREEN | < 25 | Routine traffic only |
| YELLOW | ≥ 25 | A corroborated high-severity development |
| ORANGE | ≥ 60 | Several corroborated highs, or one critical |
| RED | ≥ 110 | Multiple corroborated criticals |

Calibrated against the measured steady state (~45 concurrent events at default intensity), so
an untouched demo idles GREEN/YELLOW and a scenario injection visibly drives it up. **A system
that boots at RED has nowhere to escalate to, and trains its operator to ignore the
indicator.**

### Hysteresis

Escalation is immediate — you never delay raising an alarm.
De-escalation requires:

$$\text{score} < \text{floor}(\text{currentLevel}) \times (1 - 0.15)$$

Without it the HUD flickers between ORANGE and RED while the score oscillates around a
boundary, which both looks broken and trains operators to ignore the indicator.

**Measured progression:** GREEN → YELLOW (30.2) → ORANGE (70.9) at baseline; scenario
injection → RED (147.0 → 221.9).

---

## 8. Verifying any of this yourself

```bash
curl localhost:3001/api/v1/intelligence/config          # every constant, live
curl localhost:3001/api/v1/events/<id>/correlations     # full arithmetic for one event
curl localhost:3001/api/v1/events/<id>/candidates       # links the engine REJECTED, and why
curl localhost:3001/api/v1/intelligence/fusion          # per-stage timings and counts
curl localhost:3001/api/v1/intelligence/anomalies       # z-scores with detector attribution
cd server && npm test                                   # 114 tests, this document executable
```
