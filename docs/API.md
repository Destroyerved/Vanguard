# VANGUARD — API Reference

**Base URL:** `http://localhost:3001/api/v1` · **Stream:** `ws://localhost:3001/stream`
**Version:** 1.1.0

`GET /api/v1` returns a self-describing index of every endpoint below.

---

## Conventions

**Coordinates.** Internally and in all JSON bodies: `{ lat, lng }` WGS-84 decimal degrees.
GeoJSON responses use `[lng, lat]` per the spec — the map routes are the only place that flip
happens.

**Timestamps.** ISO 8601 UTC strings everywhere. Epoch milliseconds only in `?at=` parameters.

**Confidence.** Integer 0–100. Bands: high ≥ 80, medium ≥ 50, low < 50.

**Errors.** One envelope for every failure:

```json
{
  "error": {
    "status": 400,
    "message": "Invalid severity value(s): urgent",
    "details": { "allowed": ["low", "medium", "high", "critical"] },
    "path": "/api/v1/events?severity=urgent",
    "timestamp": "2026-09-08T12:00:00.000Z"
  }
}
```

---

## Health

### `GET /health`
Liveness. Dependency-free.
```json
{ "status": "ok", "version": "1.1.0", "timestamp": "...", "uptimeSeconds": 142 }
```

### `GET /ready`
Readiness — `200` only once the pipeline has produced a picture, else `503`.

---

## Situation

### `GET /api/v1/situation/current`
Everything the top bar needs, in one call.

```json
{
  "situation": {
    "threatLevel": "orange",
    "threatScore": 70.8,
    "activeAlertsCount": 7,
    "criticalCount": 2,
    "highCount": 5,
    "totalEvents": 47,
    "anomalyCount": 6,
    "correlatedClusters": 5,
    "meanConfidence": 93,
    "degradedMode": false,
    "headline": "2 critical events active — Uncorrelated uav contact R-1012"
  },
  "sources": [ /* SourceHealth[] */ ],
  "clusters": 5,
  "lastEscalation": { /* EscalationRecord */ }
}
```

### `GET /api/v1/situation/timeline`
Posture-change audit log, newest first.

| Param | Default | Notes |
|---|---|---|
| `limit` | 50 | 1–200 |

Each record carries `from`, `to`, `score`, a plain-English `reason`, and the
`triggerEventIds` actually responsible.

### `GET /api/v1/situation/replay`
Point-in-time snapshot — the 4D time-scrubber engine.

| Param | Default | Notes |
|---|---|---|
| `at` | latest | Epoch **milliseconds** |
| `limit` / `offset` | 100 / 0 | |

Returns `bounds` (earliest/latest retained) so the client can draw the scrubber track without
a second call. A persistent contact appears in a snapshot if it had been *acquired* by that
instant, even though its timestamp has since advanced.

---

## Events

### `GET /api/v1/events`

| Param | Example | Notes |
|---|---|---|
| `source` | `radar,log` | Comma-separated |
| `severity` | `high,critical` | Comma-separated |
| `minConfidence` | `80` | 0–100 |
| `withinSeconds` | `900` | Age cap |
| `anomalies` | `true` | Anomaly-flagged only |
| `minCorroborations` | `1` | Corroborated only |
| `near` | `23.02,72.57,12` | `lat,lng,radiusKm` — one parameter, so a partial circle cannot silently become a global query |
| `q` | `perimeter` | Substring over title + description |
| `limit` / `offset` | `100` / `0` | Max 500 |

```json
{ "events": [ /* UnifiedEvent[] */ ], "count": 50, "total": 412, "limit": 50, "offset": 0 }
```

`total` is the count *before* pagination, so the UI can render "showing 50 of 412".

### `GET /api/v1/events/stats`
Aggregates for the charts: `bySource`, `bySeverity`, `confidenceBands`, `anomalies`,
`corroborated`, `clusters`, `escalatedByFusion`, and the last fusion pass's `stats`.

### `GET /api/v1/events/:id`
One event, plus its `confidenceBand`, human-readable `age`, and containing `cluster`.

### `GET /api/v1/events/:id/correlations` ★
**The Explainability Drawer payload — the most important endpoint in the product.**

```json
{
  "eventId": "EV-RAD-T-R-1012",
  "event": { /* UnifiedEvent */ },
  "confidence": {
    "overall": 100,
    "band": "high",
    "breakdown": {
      "overall": 100, "sourceAgreement": 100, "spatialAgreement": 57,
      "temporalAgreement": 93, "sourceReliability": 92, "dataFreshness": 100
    },
    "factors": {
      "sourceReliability": 0.92, "recencyDecay": 0.9991, "corroborationBoost": 1.6,
      "effectiveSourceCount": 5.05, "distinctSourceTypes": 4, "ageSeconds": 1.2
    },
    "formula": "confidence = min(100, round(sourceReliability x recencyDecay x corroborationBoost x 100))",
    "explanation": "reliability 0.92 x recency 1 x corroboration 1.6 = 100% (6 corroborating observations)"
  },
  "counterfactual": {
    "confidenceWithoutCorroboration": 92,
    "confidenceGain": 8,
    "note": "The difference this cross-source corroboration contributed to the score."
  },
  "corroboration": {
    "count": 6,
    "distinctSources": ["log", "incident", "personnel"],
    "links": [
      { "event": {...}, "strength": 0.812, "distanceMeters": 430,
        "deltaSeconds": 12, "rationale": "LOG observation 430m away, 12s apart (affinity 0.95)" }
    ]
  },
  "correlationWindows": { "radiusMeters": 5000, "windowSeconds": 600 },
  "cluster": { /* CorrelationCluster */ }
}
```

The **counterfactual** answers the question that actually matters: *what did cross-source
agreement buy me here?*

### `GET /api/v1/events/:id/candidates`
Nearby events the engine **considered and rejected**, each with `rejectedBecause`. Shows the
engine did not simply miss adjacent activity.

---

## Map layers

All return GeoJSON `FeatureCollection`s for direct MapLibre consumption.

| Endpoint | Layer | Notes |
|---|---|---|
| `GET /map/assets` | Assets | Units with callsign, status, readiness, fuel |
| `GET /map/alerts` | Alerts | Defaults to medium+ — rendering every routine log line would bury the alerts that matter. Accepts `severity` / `source` |
| `GET /map/weather` | Weather | Live Open-Meteo grid; `live: false` means cached/synthetic |
| `GET /map/zones` | Zones | Sector polygons, AO boundary, plus sensor emplacements |
| `GET /map/heatmap` | Density | Points weighted by severity × confidence, so significance outglows mere volume |
| `GET /map/all` | All four | One round trip for first paint |

Alert feature properties include `escalated` (severity ≠ baseSeverity), `corroborationCount`,
`clusterId`, `isAnomaly`, `anomalyReason`, and kinematics.

---

## AI intelligence

### `POST /api/v1/ai/briefing`
Force a fresh synthesis.

| Param | Notes |
|---|---|
| `?deterministic=true` | Skip Gemini entirely — the switch used on stage to prove the system stands up without the model |

Returns `{ summary, groundingVerified }`. `groundingVerified` must always be `true`.

### `GET /api/v1/ai/briefing/latest`
The cached briefing. **Never blocks on inference.** `202` with `retryAfterMs` before the first
synthesis completes.

```json
{
  "summary": {
    "threatLevel": "red",
    "headline": "10 critical events active — Uncorrelated uav contact R-1012",
    "executiveSummary": "...",
    "keyDevelopments": [
      { "point": "5 independent feeds (radar, personnel, incident, log, weather) corroborate activity near 23.160, 72.571...",
        "supportingEventIds": ["EV-RAD-T-R-1012", "EV-PER-000037", "EV-INC-000024"] }
    ],
    "prioritizedActions": [ { "action": "...", "urgency": 5, "supportingEventIds": [...] } ],
    "coursesOfAction": [
      { "id": "COA-0001", "title": "Dispatch ground element for close verification",
        "description": "...", "pros": [...], "tradeoffs": [...],
        "recommendedUrgency": 5, "supportingEventIds": [...] }
    ],
    "overallConfidence": 98,
    "provenance": {
      "engine": "deterministic",
      "latencyMs": 0, "eventsConsidered": 60,
      "citationsStripped": 0, "claimsDiscarded": 0,
      "degradedReason": "GEMINI_API_KEY not configured"
    }
  },
  "ageMs": 4200,
  "generating": false,
  "groundingVerified": true
}
```

`provenance` is the audit trail: which engine ran, how long it took, and **how many invented
citations were stripped**.

### `POST /api/v1/ai/query`
Natural-language omnibar. Body: `{ "query": "..." }` (max 500 chars).

```json
{
  "query": "show me high severity radar contacts near sector 1 in the past hour",
  "filter": {
    "sourceTypes": ["radar"],
    "severities": ["high", "critical"],
    "withinMinutes": 60,
    "zoneName": "Sector 1 North",
    "nearPoint": { "lat": 23.165, "lng": 72.5714, "radiusKm": 12 }
  },
  "interpretation": "Filtering for source radar, severity high/critical, within 60 minutes, near Sector 1 North.",
  "matchedEventIds": ["EV-RAD-T-R-1012", "EV-RAD-T-R-1013"],
  "matchCount": 2,
  "parser": "heuristic",
  "latencyMs": 2,
  "events": [ /* the matched events, capped at 200 */ ]
}
```

`parser` reports which path ran. The heuristic parser always runs and its result is merged
*under* the model's, so the omnibar works with no key, no network, in 0–2 ms.

### `POST /api/v1/ai/query/heuristic`
Heuristic parse only — no model call. Useful for a latency comparison on stage.

### `GET /api/v1/ai/status`
Which engine is active, the model ID, and the last briefing's provenance.

### `POST /api/v1/ai/verify` ★
Re-verify citations against the live store. Defaults to the cached briefing when no body is
supplied — **the endpoint a judge can call to check the anti-hallucination claim
independently.**

```json
{
  "verified": true,
  "totalCitations": 42,
  "uniqueCitations": 24,
  "ungroundedCitations": [],
  "note": "Every cited event ID resolves to a real event in the store."
}
```

---

## Intelligence and diagnostics

### `GET /api/v1/intelligence/source-health`
Per-feed liveness, latency, and **effective reliability after health degradation**.

```json
{
  "sources": [
    { "sourceType": "radar", "sourceName": "RADAR-PRIMARY", "status": "live",
      "reliabilityScore": 0.92, "nominalReliability": 0.92,
      "activeCount": 12, "totalIngested": 340, "meanLatencyMs": 1,
      "consecutiveFailures": 0, "manuallyDegraded": false }
  ],
  "aggregate": "live", "degradedMode": false,
  "liveCount": 5, "degradedCount": 0, "downCount": 0
}
```

### `GET /api/v1/intelligence/clusters`
Clusters with member events resolved inline, plus `multiSource` and `triggeredEscalation`
flags.

### `GET /api/v1/intelligence/anomalies`
Flagged outliers with z-scores and detector attribution (`rate` / `kinematic` / `spatial`).

### `GET /api/v1/intelligence/metrics`
Uptime, ticks, ingestion counts, tick durations, WS clients, store utilization.

### `GET /api/v1/intelligence/fusion`
The last pass, stage by stage.

```json
{
  "stageTimings": { "dedupe": 7.22, "correlate": 2.78, "corroborate": 19.78,
                    "score": 1.81, "anomaly": 4.71, "escalate": 0.79 },
  "stats": { "inputCount": 118, "outputCount": 111, "duplicatesRemoved": 7,
             "clustersFormed": 3, "anomaliesFlagged": 6, "escalations": 60,
             "pairwiseComparisons": 803, "durationMs": 37.22 },
  "stageOrder": ["dedupe","correlate","corroborate","score","anomaly","escalate"],
  "severityChanges": [ { "eventId": "...", "from": "medium", "to": "high", "reason": "..." } ]
}
```

### `GET /api/v1/intelligence/config` ★
**Every tuning constant the engine is actually running with**, served from the same module
the fusion code imports — so it can never drift from the behaviour it describes.

---

## Simulation controls

Gated behind `ENABLE_SIMULATION_API` (default `true`). Returns `403` when disabled.

### `GET /api/v1/simulation/scenarios`
The four scenarios with their descriptions and **expected pipeline effects**.

### `POST /api/v1/simulation/scenario`
Body: `{ "scenario": "border_spike", "lat"?: 23.16, "lng"?: 72.57 }`

| Scenario | Injects | Expected effect |
|---|---|---|
| `border_spike` | 7 entry reports over 3.5 km + 2 fast contacts | Rate anomaly fires; multi-source cluster; posture → ORANGE/RED |
| `perimeter_breach` | 5 reports within 1.2 km + radar | Tight clustering; high spatial agreement; criticals promoted |
| `severe_weather_impact` | 6 equipment failures over 8 km | Weak clustering; briefing recommends re-weighting sensors |
| `mass_casualty` | 8 medical dispatches within 900 m | Casualties drive CRITICAL; actions reorder to evacuation |

Reports drain over several ticks so the spike arrives as a realistic burst.

### `POST /api/v1/simulation/inject`
What-if sandbox. Body: `{ "lat", "lng", "title"?, "severity"? }`. The injected event enters
the next fusion pass and is correlated against real activity.

### `POST /api/v1/simulation/degraded`
Body: `{ "enabled": true }`. All feeds marked down; effective reliability drops to 40% of
nominal, so **every confidence score across the picture falls**.

*Measured: mean confidence 93% → 43%, restored to 92%.*

### `POST /api/v1/simulation/reset`
Clears the store, threat timeline, and briefing cache.

---

## WebSocket — `ws://localhost:3001/stream`

**Push-only by design.** Clients cannot drive the pipeline over the socket, so a misbehaving
or hostile client cannot influence the fusion engine.

Every frame:
```json
{ "type": "SITUATION_UPDATE", "timestamp": "...", "seq": 42, "payload": { } }
```

`seq` is monotonic **per connection**, so a client can detect a dropped frame and re-sync via
REST rather than silently rendering a stale picture.

| Type | Cadence | Payload |
|---|---|---|
| `HELLO` | On connect | `serverVersion`, `tickIntervalMs`, `degradedMode` |
| `EVENT_STREAM` | Per tick, when new | `{ events }` |
| `SITUATION_UPDATE` | Per tick | `{ situation }` |
| `CLUSTER_UPDATE` | Per tick | `{ clusters }` |
| `HEALTH_STATUS` | Per tick | `{ sources }` |
| `ASSET_UPDATE` | Per tick | `{ assets }` |
| `ALERT_TRIGGER` | Per critical event | `{ event, cluster? }` — fire an alert cue without diffing the stream |
| `ESCALATION` | On posture change | `{ record }` |
| `BRIEFING_UPDATE` | On new briefing | `{ summary }` |
| `METRICS` | Every 10 ticks | `{ metrics }` |
| `DEGRADED_MODE` | On toggle | `{ enabled, reason }` |

Heartbeat every 30 s; a connection missing one pong is reaped.

---

## Environment

Every variable is optional. **The server boots and serves a complete picture with an entirely
empty environment.**

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | HTTP + WS |
| `HOST` | `0.0.0.0` | Bind address |
| `CORS_ORIGINS` | `*` | Comma-separated |
| `GEMINI_API_KEY` | *(unset)* | Absent → deterministic engine |
| `GEMINI_MODEL` | `gemini-2.0-flash` | |
| `TICK_INTERVAL_MS` | `3000` | Pipeline cadence |
| `WEATHER_POLL_INTERVAL_MS` | `120000` | Open-Meteo poll |
| `BRIEFING_INTERVAL_MS` | `45000` | Background synthesis |
| `SIM_SEED` | `20260908` | Same seed → same demo |
| `SIM_INTENSITY` | `1` | Simulated event volume |
| `LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error` |
| `ENABLE_SIMULATION_API` | `true` | Gate operator controls |
