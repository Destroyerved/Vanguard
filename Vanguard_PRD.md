# Product Requirements Document
# VANGUARD
### Multi-Source Defence Situational Awareness System

**Problem ID:** D-05 | **Track:** Defense | **Event:** HackHertz 2026
**Team:** Destroyer of Worlds
**Document Version:** 1.0
**Status:** Draft for Build

---

## 1. Executive Summary

Vanguard is a unified command & decision-support platform that fuses siloed defense/emergency data streams — surveillance, radar, personnel/equipment status, weather, logs, and incident reports — into a single, AI-synthesized operational picture. It replaces the cognitive burden of manually cross-referencing multiple dashboards with one geospatial command center that tells an operator, in real time: **what's happening, how confident we are, and what to do next.**

**Tagline:** *One picture. Every source. Zero delay.*

---

## 2. Problem Statement

Command room decision-makers receive information from multiple disconnected sources — surveillance feeds, equipment reports, weather conditions, maps, and incident reports. Processing this information separately makes it difficult to obtain a clear overall picture, causing cognitive overload during fast-evolving tactical or peacetime emergency operations. Decisions get slower and error-prone exactly when speed and accuracy matter most.

---

## 3. Goals & Success Metrics

| Goal | Success Metric |
|---|---|
| Eliminate manual cross-referencing | Single screen shows fused data from 5+ sources |
| Faster comprehension | AI briefing reduces "time to understood situation" |
| Trustworthy AI output | Every AI claim traceable to source events + confidence score |
| Demo-ready realism | Live-streaming simulated data indistinguishable from real feed during judging |
| Craftsmanship | Judges visually impressed within first 10 seconds |

### Non-Goals (out of scope for hackathon)
- Real classified/live military data integration
- Full auth/RBAC system (stub only if time allows)
- Native mobile app
- Persistent long-term data warehouse

---

## 4. Personas

| Persona | Primary Need |
|---|---|
| **Command Operator** | Fast situational read — map + AI brief, minimal noise |
| **Analyst** | Drill into raw source feeds, verify AI conclusions, explore confidence math |
| **Duty Officer** | Prioritized action items, alert escalation, minimal false positives |

---

## 5. Feature Set

### TIER 1 — Core (score floor, must be flawless)

#### 5.1 Data Fusion Engine (maps to 30% weightage)
- Ingest ≥5 sources: **weather (real API), radar/sensor (simulated), personnel/equipment status (simulated), operational logs (simulated), incident reports (simulated)**
- Normalize all events into one **Unified Event Schema** (see §7)
- **Confidence scoring**: `confidence = sourceReliability × recencyDecay × corroborationBoost`
- **Corroboration engine**: detect when 2+ independent sources report events in the same spatiotemporal window → link them, boost confidence
- **Source health monitor**: live up/degraded/down indicator per feed, with simulated dropout injected for realism
- **Deduplication**: prevent duplicate events from cluttering the map/feed

#### 5.2 Interactive Tactical Map (maps to 25% weightage)
- MapLibre GL / Leaflet base map
- **Toggleable layers**: Assets, Alerts, Weather, Zones — independently switchable
- Marker clustering for dense regions
- Click-to-inspect popup: fused event detail, contributing sources, confidence badge
- **Heatmap mode**: incident density overlay
- **Time-scrubber**: drag to replay last N hours of events unfolding
- Zone/geofence overlays (patrol zones, restricted areas, incident radii)

#### 5.3 AI Situation Synthesis Engine (maps to 25% weightage)
- Periodic + trigger-based LLM call (Gemini/Claude) fed the current fused event window
- Structured JSON output: executive summary, risk level, prioritized action items
- **Every summary claim cites its supporting event IDs** — no ungrounded hallucination
- Risk-level flag (Green → Yellow → Orange → Red) drives global UI theme/alert state

#### 5.4 Confidence Indicator System
- Per-event and per-AI-claim confidence (0–100, color-coded Low/Med/High)
- Visual badges everywhere confidence-bearing data is shown — map markers, feed list, AI panel

---

### TIER 2 — Differentiators (this is where Vanguard wins)

#### 5.5 Anomaly Detection Layer
Rule/statistics-based outlier flagging (sudden incident cluster, sensor spike, abnormal report frequency) that runs **before** AI summarization — demonstrates engineering depth beyond "just call an LLM."

#### 5.6 Natural-Language Command Query Bar
Free-text query ("show all high-severity events near Zone 3 in the last hour") → LLM parses to filter params → map/feed update live. High demo wow-factor, low build cost.

#### 5.7 AI-Generated Courses of Action (COA)
Beyond "what happened": 2–3 ranked response options with tradeoffs, directly targeting the AI Summarization & Alert Prioritization criterion.

#### 5.8 Voice Briefing Mode
Text-to-speech reads the executive summary aloud (Web Speech API — no backend cost). Strong command-room realism for the demo.

#### 5.9 Common Operating Picture Sync
Two browser tabs/windows reflect the same live state (WebSocket/polling) — visually demonstrates multi-operator scalability.

#### 5.10 Alert Escalation Timeline
Vertical ticker showing how risk level evolved through the session, annotated with the trigger event for each change.

#### 5.11 Explainability Drawer
Click any AI claim → see exact source events + confidence math behind it. Strong "trustworthy AI" signal, especially resonant for a defense judging panel.

---

### TIER 3 — Moonshot Polish (only if time remains)

#### 5.12 What-If Simulation Mode
Operator drags a hypothetical incident onto the map → fusion + AI re-run live to show downstream impact.

#### 5.13 Tactical Visual Theme
Dark UI, animated radar sweep, glassmorphism panels, subtle scanline/HUD aesthetic — cheap craftsmanship points (20% weight).

#### 5.14 Degraded-Mode Simulation
"Comms lost" banner demo — system falls back gracefully to last-known cached picture. On-theme for defense credibility.

#### 5.15 One-Click Situation Report Export (PDF)
Exports current fused picture + AI summary as a shareable report — makes the demo feel like a real deliverable.

---

## 6. System Architecture

```
┌───────────────────────────────────────────────────────────┐
│                     VANGUARD FRONTEND                       │
│                    (React 18 + TypeScript)                  │
│                                                               │
│  ┌────────────┐  ┌───────────────┐  ┌───────────────────┐  │
│  │  Tactical   │  │  AI Briefing   │  │   Source Feed /    │  │
│  │    Map      │  │     Panel      │  │   Event List       │  │
│  │ (MapLibre)  │  │ (summary, COA, │  │  (filterable,       │  │
│  │  + layers   │  │  risk, voice)  │  │   confidence tags)  │  │
│  └──────┬──────┘  └───────┬───────┘  └──────────┬─────────┘  │
│         │                  │                      │            │
│         └──────────────────┼──────────────────────┘            │
│                    Unified Event Store                          │
│                   (Zustand / Context API)                       │
└──────────────────────────┬───────────────────────────────────┘
                            │
        ┌────────────────────┴─────────────────────┐
        │          FUSION / INGESTION LAYER          │
        │  • Normalizer         • Anomaly Detector    │
        │  • Confidence Scorer  • Dedup/Corroboration │
        └───┬────────┬────────┬────────┬─────────────┘
            │         │        │        │
        Weather    Radar   Personnel  Incidents/Logs
       (Open-Meteo (sim)     (sim)       (sim)
        real API)
                            │
                  ┌──────────┴───────────┐
                  │   AI Synthesis Layer   │
                  │  (Gemini/Claude API)   │
                  │  Summary · COA · Query │
                  │      Parsing           │
                  └────────────────────────┘
```

---

## 7. Data Model

```typescript
interface UnifiedEvent {
  id: string;
  sourceType: 'weather' | 'radar' | 'personnel' | 'log' | 'incident';
  timestamp: string;              // ISO 8601
  location: { lat: number; lng: number };
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  confidence: number;             // 0-100
  corroboratedBy: string[];       // linked event IDs
  isAnomaly: boolean;
  raw: Record<string, unknown>;
}

interface AISummary {
  generatedAt: string;
  executiveSummary: string;
  riskLevel: 'green' | 'yellow' | 'orange' | 'red';
  prioritizedActions: {
    action: string;
    urgency: number;              // 1-5
    supportingEventIds: string[];
  }[];
  coursesOfAction: {
    title: string;
    description: string;
    tradeoffs: string;
  }[];
}

interface SourceHealth {
  sourceType: string;
  status: 'live' | 'degraded' | 'down';
  lastUpdate: string;
  reliabilityScore: number;       // 0-1, used in confidence calc
}
```

---

## 8. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS |
| Map | MapLibre GL JS (no API key needed) |
| Charts | Recharts (trends, severity breakdown) |
| State | Zustand |
| AI | Gemini API (structured JSON mode) |
| Real data | Open-Meteo (free weather API, no key) |
| Simulated data | Seeded interval-based generators |
| Voice | Web Speech API |
| Sync | WebSocket or polling (for multi-tab demo) |
| Export | jsPDF or similar |

---

## 9. Build Priority (mapped to evaluation weightage)

| Phase | Focus | Weight Targeted |
|---|---|---|
| Phase 1 | Unified schema, mock generators, fusion + confidence scoring, anomaly detection | Data Fusion 30% |
| Phase 2 | Map with layers, clustering, time-scrubber | Map/Geospatial UX 25% |
| Phase 3 | AI summary pipeline, COA generation, explainability drawer, NL query bar | AI Summarization 25% |
| Phase 4 | Theme, voice mode, escalation timeline, animations, responsive polish | Scalability/Craftsmanship 20% |
| Phase 5 (if time) | What-if mode, degraded-mode demo, PDF export | Stretch/wow-factor |

---

## 10. Demo Script

1. **Open** — map live-populating with events streaming across all layers, tactical theme visible immediately
2. **Toggle layers** — show assets/alerts/weather/zones independently
3. **Click an event** — show fused sources, corroboration links, confidence score
4. **Query bar** — type a natural-language filter, watch map/feed respond live
5. **AI Briefing** — walk through executive summary, prioritized actions, COAs; open explainability drawer on one claim
6. **Voice mode** — trigger spoken briefing
7. **Escalation** — simulate a spike (weather escalation + incident cluster) → watch risk flip to red, AI re-summarize, timeline log the change
8. **(Stretch)** — trigger degraded-mode banner, then recovery
9. **Close** — export situation report as PDF

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LLM latency live on stage | Trigger-based (not per-event) calls; pre-cached fallback summary |
| Map perf with many markers | Clustering + viewport-based rendering |
| Judges question data authenticity | Clear "SIMULATED FEED" labeling builds credibility, not distrust |
| Scope creep across 15 features | Strict phase gating — Tier 1 must be 100% done before Tier 2 starts |
| AI hallucination in defense context | Hard grounding: every claim requires supportingEventIds; explainability drawer surfaces this |

---

## 12. Evaluation Alignment Summary

| Criterion | Weight | Vanguard Features Targeting It |
|---|---|---|
| Data Fusion & Multi-Source Integration | 30% | Unified schema, corroboration engine, confidence scoring, anomaly detection, source health |
| Command Map & Geospatial UX | 25% | Layer toggles, clustering, heatmap, time-scrubber, zone overlays |
| AI Situation Summarization & Alert Prioritization | 25% | Executive summary, COA generation, explainability drawer, NL query bar |
| System Scalability & UI Craftsmanship | 20% | Tactical theme, multi-tab sync, voice mode, responsive/animated UI |

---

*End of PRD — Vanguard, Team Destroyer of Worlds, HackHertz 2026*
