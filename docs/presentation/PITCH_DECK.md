# VANGUARD — Pitch Deck

**Multi-Source Defence Situational Awareness System**
Problem ID D-05 · HackHertz 2026 Defense Track · Team Destroyer of Worlds

*14 slides · 6 minutes · one live demo*

---

## Slide 1 — Title

# VANGUARD
### One picture. Every source. Zero delay.

**Multi-Source Defence Situational Awareness System**

Problem D-05 · Defense Track
Team Destroyer of Worlds

> *Speaker note (10s):* Open on the live command center already running. Let the map move
> behind you while you say the tagline. Do not read the slide.

---

## Slide 2 — The problem

# A watchstander has five screens and ten seconds

| Feed | Sits in | Says |
|---|---|---|
| Radar | Its own console | "Contact, 23.02N 72.57E, 260 knots, no transponder" |
| Perimeter sensors | A different console | "IR trip, sector 4, amplitude 0.87" |
| Patrol telemetry | A tablet | "GRIZZLY-1 reports visual contact" |
| Weather | A web terminal | "Visibility 1.8 km" |
| Dispatch | A radio net | "Unauthorized entry, sector 4" |

### Five systems. One event. Nobody sees it.

> *Speaker note (35s):* This is the whole pitch. Five different systems just described the
> **same intrusion** and not one of them knows the others exist. The officer has to assemble
> that in their head, under time pressure, while the situation develops.

---

## Slide 3 — Why "put it on one screen" is not the answer

### Aggregation makes it worse

One screen with five times the noise is not situational awareness.

**Fusion asks a harder question:**

> *Which of these observations are about the same thing?*

Four hard problems underneath:
1. **Correspondence** — no shared ID links a radar return to a sensor trip
2. **Conflict** — radar holds a contact; the patrol there sees nothing
3. **Variable reliability** — a calibrated radar ≠ an anonymous tip
4. **False corroboration** — one radar reporting six times is **not** six confirmations

> *Speaker note (30s):* Point 4 is the one that kills naive systems. Redundancy dressed as
> independence produces confident wrong answers — worse than no fusion at all.

---

## Slide 4 — Why generic AI fails here

| Failure | Looks like | Why it disqualifies the tool |
|---|---|---|
| Fabricated specifics | *"Three contacts at 240 knots"* — there were two at 180 | An officer may act on it |
| Unfalsifiable confidence | *"High confidence of a breach"* | Where did that come from? |
| Invented citations | Cites event IDs that don't exist | Looks **more** rigorous while being less |

### An unverifiable summary is worse than no summary

It carries the authority of a system without the accountability of one.

> *Speaker note (25s):* Defense judges have seen a dozen ChatGPT wrappers today. Name the
> failure mode before they do.

---

## Slide 5 — VANGUARD

# The fusion engine is the product.
# The language model is a presentation layer.

```
5 feeds → normalize → DEDUPE → CORRELATE → CORROBORATE
                    → SCORE → ANOMALY → ESCALATE → posture
                                    ↓
                        AI phrases the finished analysis
                                    ↓
                          GROUNDING GATE (code, not prompt)
```

**Every number is deterministic arithmetic. The model never produces one.**

> *Speaker note (25s):* This inverts the usual hackathon architecture and it is the single
> most important slide. Everything else follows from it.

---

## Slide 6 — Live: five feeds, one contact

### *(Demo — click a corroborated contact on the map)*

```
EV-RAD-T-R-1012   Uncorrelated uav contact          CRITICAL   100%
  corroborated by:
    EV-LOG-000031  Perimeter trip P-302      430m away, 12s apart
    EV-PER-000037  Visual — GRIZZLY-1        890m away, 31s apart
    EV-INC-000024  Unauthorized entry       1.2km away, 48s apart
```

**Three independent instruments. One physical intrusion. Found automatically.**

> *Speaker note (30s):* This is the money shot. Say the sentence: *"Nobody told the system
> these were related. It worked it out from space, time, and source physics."*

---

## Slide 7 — Explainable confidence

$$\text{Confidence} = \min(100,\ R_s \times D_t \times B_c \times 100)$$

| Factor | Value | Meaning |
|---|---|---|
| Source reliability | 0.92 | Radar, healthy |
| Recency decay | 0.999 | 1.2 seconds old |
| Corroboration boost | 1.60 | 4 distinct sources (capped) |

### The number that matters is a subtraction

```
with corroboration:     100%
without corroboration:   92%
              fusion:    +8
```

> *Speaker note (35s):* Open the Explainability Drawer live. The counterfactual converts an
> abstract claim into a measured quantity — *this is what fusion bought you.*
> **The cap on the boost is deliberate:** it is what stops correlated noise manufacturing
> certainty.

---

## Slide 8 — The anti-hallucination guarantee

### We assume the model is lying, and check

```
1. Resolve every supportingEventId against the store
2. STRIP  every ID that does not resolve
3. DISCARD every claim left with zero citations
4. RECOMPUTE overall confidence from survivors
```

**Enforced in code (`ai/grounding.ts`), not requested in a prompt.**

```bash
POST /api/v1/ai/verify
→ { "verified": true, "totalCitations": 42, "ungroundedCitations": [] }
```

> *Speaker note (30s):* Prompting is a request, not a constraint. Run the verify endpoint
> live. Invite a judge to name any citation and open it.

---

## Slide 9 — Live: escalation

### *(Demo — trigger `border_spike`)*

```
7 correlated entry reports over 3.5km  +  2 non-squawking fast contacts

  rate anomaly       → incident feed 3.2σ above its own baseline
  kinematic anomaly  → 312kt against a 92kt mean (3.0σ)
  correlation        → multi-source cluster forms
  escalation         → 3 distinct sources → severity +1 tier

  THREAT   ORANGE (70.9)  →  RED (147.0 → 221.9)
  CRITICAL      2         →       10
```

> *Speaker note (30s):* One operator action drives the entire pipeline end to end. Say the
> anomaly numbers out loud — they are real, from the running system.

---

## Slide 10 — Live: resilience

### *(Demo — engage degraded comms)*

```
                    BEFORE      DEGRADED      RESTORED
mean confidence       93%          43%           92%
feed reliability     0.92         0.37          0.92
```

### Degradation propagates into the math, not into a banner

Feed health multiplies directly into the confidence formula. When a feed degrades, **every
score across the picture falls automatically.**

> *Speaker note (25s):* Most systems paint an amber dot. Ours lowers the trust weight of
> everything that feed reports. That is the difference between displaying a problem and
> modelling one.

---

## Slide 11 — The proof: delete the API key

### *(Demo — regenerate the briefing with no key)*

```json
{
  "headline": "10 critical events active — Uncorrelated uav contact R-1012",
  "keyDevelopments": [ /* 4, all cited */ ],
  "coursesOfAction": [ /* 3, with honest tradeoffs */ ],
  "provenance": { "engine": "deterministic", "citationsStripped": 0 }
}
```

### Full briefing. Real citations. No model call.

**This is why it is not a wrapper.**

> *Speaker note (30s):* The strongest 30 seconds available. Do not skip it. Then: *"The LLM
> improves the prose. The fusion engine supplies the substance."*

---

## Slide 12 — Engineering

| | |
|---|---|
| **Tests** | 114 passing · strict TypeScript · zero `any` |
| **Fusion pass** | 2–37 ms against a 3000 ms tick budget (~50× headroom) |
| **Correlation** | Grid-indexed union-find — 803 comparisons for 118 events vs ~7,000 naive |
| **NL omnibar** | 0–2 ms, no API call, works offline |
| **Dependencies** | 4 runtime: `express`, `ws`, `cors`, `dotenv` |
| **Setup** | `npm install && npm run dev` — no key, no DB, no Docker |

### Seven real bugs found by running it, each with a regression test

Compounding escalation · entity duplication · cluster over-escalation ·
uncorroborated CRITICAL promotion · rule chaining · threat miscalibration · empty feed at boot

> *Speaker note (25s):* The bug list is a credibility asset, not an admission. It says we ran
> this, measured it, and fixed what we found.

---

## Slide 13 — Evaluation alignment

| Criterion | Weight | What we built |
|---|---|---|
| **Data fusion & multi-source integration** | 30% | 5 feeds incl. **live** Open-Meteo · `UnifiedEvent` normalization · haversine+temporal correlation · explainable confidence · 3 anomaly detectors · health→reliability coupling |
| **Command map & geospatial UX** | 25% | MapLibre GL · 4 GeoJSON layers · clustering · severity-weighted heatmap · 4D time-scrubber via `snapshotAt` |
| **AI summarization & prioritization** | 25% | Grounded briefings · **enforced** citation checking · ranked COAs with tradeoffs · NL omnibar · explainability drawer |
| **Scalability & craftsmanship** | 20% | 114 tests · 50× perf headroom · dual-mode fallback · degraded-comms simulation · zero-friction setup |

---

## Slide 14 — Close

# VANGUARD

### One picture. Every source. Zero delay.

**What we actually built:**
A deterministic multi-source fusion engine whose every number can be checked by hand,
with an AI layer that cannot lie to you because the code will not let it.

**Purely defensive.** No kinetic targeting. No weapons release. No lethal autonomy.

```
github.com/Destroyerved/Vanguard
```

> *Speaker note (20s):* End on the running system, not the slide. Offer: *"Name any number on
> that screen and I will show you where it came from."*

---

## Timing

| Slides | Content | Time |
|---|---|---|
| 1–4 | Problem framing | 1:40 |
| 5 | The thesis | 0:25 |
| 6–7 | **Live: fusion + explainability** | 1:05 |
| 8 | Grounding guarantee | 0:30 |
| 9–11 | **Live: escalation, resilience, no-key proof** | 1:25 |
| 12–14 | Engineering, alignment, close | 1:10 |
| | **Total** | **~6:15** |

**If cut to 4 minutes:** keep 1, 2, 5, 6, 7, 11, 14. The demo beats the slides every time.
