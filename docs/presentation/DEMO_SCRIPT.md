# VANGUARD — Live Demo Script

**Runtime: 6 minutes** · Every command and every number below is from the running system.

---

## T-10 minutes — Pre-flight

```bash
cd server
npm run typecheck && npm test && npm run smoke
```

All three must be clean. Then start it and let it run for **at least 90 seconds** before you
present — the picture needs to populate and the posture needs to settle.

```bash
npm run dev
```

Confirm the baseline:

```bash
curl -s localhost:3001/api/v1/situation/current | jq '.situation | {threatLevel, threatScore, totalEvents, criticalCount}'
```

| Healthy | Unhealthy — do not present |
|---|---|
| `threatLevel: "green"` or `"yellow"` | `"red"` before you have triggered anything |
| `criticalCount: 0–3` | Most events critical |
| `totalEvents: 30–60` | 0, or hundreds |

If unhealthy: `POST /api/v1/simulation/reset` and wait 60 s. If still wrong, a compounding
bug has returned — see MASTER_GUIDELINES Part IV.

**Have two terminals ready.** One running the server, one for curl. Have the map full-screen.

---

## 0:00 — Open cold on the live system

> "This is a defense operations centre. Five separate data feeds. Radar, perimeter sensors,
> patrol telemetry, field dispatches — and live weather, which is genuinely coming from
> Open-Meteo right now, over Ahmedabad."

**Do:** let the map move. Do not narrate the UI.

> "Today, an officer watching this reads five different screens and assembles the picture in
> their head. VANGUARD assembles it for them — and shows its working."

---

## 0:40 — The fusion moment

**Do:** click a contact with a corroboration badge.

> "One contact. Watch what's attached to it."

```
EV-RAD-T-R-1012   Uncorrelated uav contact         CRITICAL   100%
  corroborated by
    EV-LOG-000031  Perimeter trip P-302     430m,  12s
    EV-PER-000037  Visual — GRIZZLY-1       890m,  31s
    EV-INC-000024  Unauthorized entry      1.2km,  48s
```

> "Radar saw it. A thermal tripwire saw it. A patrol saw it. A dispatcher reported it.
> **Nobody told the system these were related.** It worked that out from distance, time, and
> which kinds of sensor can confirm which."

*Pause here. This is the core claim.*

---

## 1:20 — Explainability drawer

**Do:** open the drawer on that contact.

> "Every number here decomposes."

```
reliability 0.92  ×  recency 1.00  ×  corroboration 1.60  =  100%

sourceReliability  92    dataFreshness     100
spatialAgreement   57    temporalAgreement  93
sourceAgreement   100
```

> "Radar is weighted 0.92 because it's calibrated but gets clutter. This reading is one second
> old, so recency is essentially 1. Four distinct sources agree, which caps the corroboration
> boost at 1.6."

**Then point at the counterfactual:**

```
confidence without corroboration:  92%
                         fusion:  +8
```

> "That's the number that matters. **Without cross-source corroboration this would be 92%.
> Fusion bought eight points of certainty.** And the boost is capped on purpose — otherwise a
> flood of correlated noise could manufacture confidence out of nothing."

---

## 2:10 — Natural language omnibar

**Do:** type into the omnibar.

> "Show me high severity radar contacts near sector 1 in the past hour"

```
Filtering for source radar, severity high/critical, within 60 minutes, near Sector 1 North.
parser: heuristic   latency: 2ms   matches: 2
```

> "Two milliseconds. No API call. There's a Gemini parser too, but the deterministic one runs
> first and always — so the omnibar works with no key and no network."

---

## 2:40 — The briefing, and the grounding guarantee

**Do:** open the briefing panel.

> "This is the AI layer. Notice every claim carries event IDs."

**Do:** click a citation — it opens the raw event.

> "Those aren't decorative. Here's why."

**Switch to the terminal:**

```bash
curl -s -X POST localhost:3001/api/v1/ai/verify | jq
```

```json
{
  "verified": true,
  "totalCitations": 42,
  "uniqueCitations": 24,
  "ungroundedCitations": [],
  "note": "Every cited event ID resolves to a real event in the store."
}
```

> "We assume the model is lying. Every ID it produces is resolved against the event store.
> Invented ones are **stripped**. Claims left with no evidence are **discarded entirely**.
> That's enforced in code, not requested in a prompt — because a prompt is a request, not a
> constraint."

**Optional, if a judge looks sceptical:**
> "Pick any citation on that screen and I'll open it."

---

## 3:40 — Escalation under load

```bash
curl -s -X POST localhost:3001/api/v1/simulation/scenario \
  -H 'content-type: application/json' \
  -d '{"scenario":"border_spike"}' | jq '.expectedEffect'
```

> "Coordinated border spike. Seven entry reports across a 3.5 kilometre front, plus two
> non-squawking fast contacts. Watch the posture."

**Do:** watch the map. Within ~10 seconds:

```
THREAT   ORANGE (70.9)  →  RED (147.0)  →  (221.9)
CRITICAL      2         →       10
```

> "The rate detector caught the incident feed running 3.2 sigma above its own baseline. The
> kinematic detector caught a contact at 312 knots against a 92 knot mean — 3 sigma. The
> correlation engine formed a multi-source cluster, three distinct feeds agreed, severity
> escalated, and the posture went red."

**Do:** open the escalation timeline.

> "And it logged exactly which events caused it. 'The system went red' is never an
> unexplained colour change."

---

## 4:30 — Degraded comms

```bash
curl -s -X POST localhost:3001/api/v1/simulation/degraded \
  -H 'content-type: application/json' -d '{"enabled":true}' | jq -r '.effect'
```

> "Now I cut the comms."

**Do:** point at the confidence figures falling across the whole board.

```
mean confidence   93%  →  43%
feed reliability 0.92  → 0.37
```

> "Most systems would show you an amber dot. Ours drops the **trust weight** of every feed,
> and that multiplies straight into the confidence formula — so every score across the entire
> picture falls. The degradation is in the math, not in a banner."

```bash
curl -s -X POST localhost:3001/api/v1/simulation/degraded \
  -H 'content-type: application/json' -d '{"enabled":false}'
```

> "Restore, and it comes back to 92."

---

## 5:10 — The proof

> "Last thing. Every AI project today has an API key. Let me show you what happens when I take
> ours away."

```bash
curl -s -X POST 'localhost:3001/api/v1/ai/briefing?deterministic=true' \
  | jq '{engine: .summary.provenance.engine, headline: .summary.headline,
         developments: (.summary.keyDevelopments | length),
         coas: (.summary.coursesOfAction | length),
         grounded: .groundingVerified}'
```

```json
{
  "engine": "deterministic",
  "headline": "10 critical events active — Uncorrelated uav contact R-1012",
  "developments": 4,
  "coas": 3,
  "grounded": true
}
```

> "Full briefing. Four cited developments. Three courses of action with honest tradeoffs.
> **Zero model calls.**"

*Pause.*

> "The language model improves the prose. **The fusion engine supplies the substance.** That's
> the difference between a system and a prompt."

---

## 5:50 — Close

> "VANGUARD. One picture, every source, zero delay. Purely defensive — no targeting, no
> weapons release, no lethal autonomy.
>
> Every number on that screen decomposes into factors you can check by hand. Name one and I'll
> show you where it came from."

---

## Contingencies

| If | Then |
|---|---|
| Weather layer looks empty | It cannot be — cache then synthetic baseline. *"That's the fallback doing its job."* |
| Gemini is slow | Briefings are pre-generated and cached; the panel never blocks. Mention it as a design choice. |
| Posture stuck GREEN | Trigger a scenario. That is what it is for. |
| Scenario seems to do nothing | Reports drain over several ticks by design. Wait 10 s and narrate the anomaly detectors. |
| Something genuinely breaks | `curl -X POST localhost:3001/api/v1/simulation/reset` and keep talking. |
| Asked for the frontend | Backend is complete and API-first; every panel described is a documented endpoint. Show `GET /api/v1`. |

---

## The four sentences that matter

If you remember nothing else:

1. *"Nobody told the system these were related — it worked it out from space, time, and sensor physics."*
2. *"Without corroboration this would be 92%. Fusion bought eight points."*
3. *"We assume the model is lying, and check every citation in code."*
4. *"Take the API key away and it still works. The fusion engine is the product."*
