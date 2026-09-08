# Product Requirements Document (PRD)
# VANGUARD
### Multi-Source Defence Situational Awareness System

**Problem ID:** D-05 | **Track:** Defense | **Event:** HackHertz 2026  
**Team:** Destroyer of Worlds  
**Document Version:** 1.1 (Harmonized & Production-Aligned)  
**Status:** Approved for Build  

---

## 1. Executive Summary

Vanguard is a unified command and decision-support platform that fuses siloed defense and emergency data streams — surveillance radar, personnel and equipment status, live weather conditions, operational logs, and field incident reports — into a single, AI-synthesized Common Operating Picture (COP). It replaces the cognitive burden of manually cross-referencing multiple dashboards with an interactive geospatial command center that tells an operator in real time: **what is happening, how confident the system is, and what tactical actions to take next.**

**Tagline:** *One picture. Every source. Zero delay.*

---

## 2. Problem Statement

Command room decision-makers receive information simultaneously from multiple disconnected sources:
- Radar and surveillance tracking feeds
- Live meteorological and environmental observations
- Personnel and asset readiness monitors
- Structured operational logs and telemetry
- Dynamic emergency and tactical incident dispatches

Processing these disparate sources separately creates severe cognitive overload during fast-evolving tactical operations or peacetime crisis management. Conflicting reports, stale data, and spatial ambiguity delay situational comprehension at the exact moments when speed and precision are vital.

---

## 3. Goals & Success Metrics

| Goal | Success Metric |
|---|---|
| **Eliminate Manual Cross-Referencing** | Unified screen synchronizes and correlates data from 5+ heterogeneous streams in real time. |
| **Accelerate Situational Comprehension** | AI-generated executive briefing reduces "time to understand the operational picture" to under 10 seconds. |
| **Trustworthy & Explainable AI** | 100% of AI claims cite supporting event IDs; interactive explainability drawer reveals confidence math. |
| **Actionable Decision Support** | Beyond summaries, AI generates ranked Courses of Action (COAs) with explicit tactical tradeoffs. |
| **Demo-Ready Realism & Resilience** | Real-time Open-Meteo live weather combined with high-fidelity simulated radar/incident streaming, resilient to network dropout. |
| **Visual Craftsmanship & Impact** | Military-grade dark HUD aesthetic, glassmorphism, smooth animations, and zero-latency interactions. |

### Non-Goals (Hackathon Boundary)
- Integration with real-world classified or military MIL-STD networks.
- Full multi-tenant authentication / RBAC enforcement (mock operator profile switcher provided for demo).
- Native mobile applications (optimized for desktop command displays and multi-monitor layouts).
- Multi-year enterprise data warehousing.

---

## 4. Operational Personas

| Persona | Role | Primary Needs |
|---|---|---|
| **Command Operator** | Watchstander | High-level situational read, live tactical map, immediate alert escalation, minimal cognitive noise. |
| **Intelligence Analyst** | Deep Investigator | Drill down into raw sensor feeds, inspect corroboration chains, verify AI confidence math and source reliability. |
| **Duty Officer** | Tactical Decision Maker | Prioritized action items, AI Courses of Action (COAs) with tradeoffs, one-click PDF situation report export. |

---

## 5. Feature Specifications

### TIER 1 — Core Operational Foundation (Score Floor)

#### 5.1 Multi-Source Data Fusion Engine (Targeting 30% Weight)
- **5 Stream Ingestion**:
  1. **Weather**: Real live API ingestion via Open-Meteo (precipitation, wind vector, visibility, temperature; zero API key required).
  2. **Radar / Surveillance**: High-fidelity simulated kinematic tracks (velocity, heading, altitude, IFF tag).
  3. **Personnel & Assets**: Unit readiness, status telemetry, vehicle positions.
  4. **Operational Logs**: System events, communication logs, perimeter tripwires.
  5. **Incident Reports**: Tactical and civil dispatches with severity annotations.
- **Normalization**: Ingested feeds are mapped into the strict `UnifiedEvent` schema (§7).
- **Spatiotemporal Corroboration**: Correlates events occurring within defined spatial radii (Haversine distance $\le \Delta R$) and temporal windows ($\le \Delta T$). Corroborating sources are linked via `corroboratedBy`.
- **Explainable Confidence Scoring**:
  $$\text{Confidence} = \min\left(100, \text{round}\left(\text{SourceReliability} \times \text{RecencyDecay} \times \text{CorroborationBoost} \times 100\right)\right)$$
  - *Source Reliability*: Static/dynamic weight per feed type ($0.0 - 1.0$).
  - *Recency Decay*: Exponential decay based on event age ($e^{-\lambda \Delta t}$).
  - *Corroboration Boost*: Progressive scaling for multi-source confirmation ($1.0 + 0.15 \times (N - 1)$).
- **Source Health Monitoring**: Live status indicator (`live`, `degraded`, `down`) with simulated dropout injection.
- **Deduplication & Anomaly Flagging**: Statistical z-score outlier detection on incident frequency and sensor deviations.

#### 5.2 Interactive Tactical Command Map (Targeting 25% Weight)
- **Engine**: MapLibre GL JS / Leaflet vector map styled with a custom dark tactical basemap.
- **4 Dynamic Toggleable Layers**:
  - `☑ Assets`: Ground, naval, and aerial unit markers with directional headings.
  - `☑ Alerts`: Prioritized tactical alerts color-coded by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
  - `☑ Weather`: Real-time weather overlays (radar precipitation, wind vector particles).
  - `☑ Zones`: Operational sectors, restricted airspace, patrol perimeters, and incident geofences.
- **Marker Clustering & Fly-to Focus**: Dense contact points automatically cluster; clicking an alert flies the camera to the hotspot.
- **Interactive Event Popups**: Immediate summary badge, confidence meter, corroborating source tags, and drill-down trigger.
- **Incident Heatmap Mode**: Dynamic density surface displaying spatial concentration of high-severity events.
- **4D Time-Scrubber**: Slider allowing operators to scrub backwards in time and replay how the operational picture unfolded.

#### 5.3 AI Situation Synthesis & Alert Prioritization (Targeting 25% Weight)
- **Model**: Google Gemini 2.0 / 1.5 Flash via structured JSON response schema.
- **Grounded Executive Briefing**:
  - High-level threat assessment and situational summary.
  - Overall threat status badge (`GREEN`, `YELLOW`, `ORANGE`, `RED`).
  - Strict grounding: **every key development must cite contributing `supportingEventIds`**. Zero hallucination.
- **Ranked Action Items**: Prioritized tactical directives with urgency scores ($1 - 5$).

#### 5.4 Confidence & Alert Indicator System
- Color-coded confidence badges across all UI surfaces:
  - High ($\ge 80\%$): Emerald Green
  - Medium ($50\% - 79\%$): Amber Yellow
  - Low ($< 50\%$): Crimson Red
- Global threat status drives ambient HUD accents and flashing indicators during `RED` / `CRITICAL` spikes.

---

### TIER 2 — Competitive Differentiators (Winning Capabilities)

#### 5.5 Natural-Language Command Query Bar
- Free-form omnibar input (e.g., *"Show all high-severity radar anomalies near Sector 4 in the past 30 minutes"*).
- Gemini function calling / structured parsing extracts temporal, spatial, severity, and source filters.
- Real-time instant filtering of the tactical map, event feed, and statistics.

#### 5.6 AI Courses of Action (COA) with Tradeoff Analysis
- Generates 2–3 distinct tactical courses of action for the commanding officer (e.g., *COA 1: Rapid Interception*, *COA 2: Perimeter Containment*, *COA 3: Reconnaissance Drone Dispatch*).
- Each COA includes an operational summary, pros, risks, and resource tradeoffs.

#### 5.7 Voice Briefing Mode (Tactical Audio Synthesis)
- Hands-free audio situation report leveraging the browser's native Web Speech API.
- Converts the latest Gemini executive briefing into a crisp, military-style voice readout with play/pause controls.

#### 5.8 Interactive Explainability Drawer
- Clicking any AI summary bullet or event opens a sliding inspection drawer showing:
  - Supporting source event cards with raw JSON view.
  - Contributing factor breakdown (Source Agreement, Spatial Agreement, Temporal Agreement, Source Reliability, Data Freshness).
  - Mathematical confidence computation breakdown.

#### 5.9 Dynamic Tactical Threat Level UI
- The aggregate threat level (`GREEN`, `YELLOW`, `ORANGE`, `RED`) adapts the global UI lighting, top navigation warning bar, and audible alert tones.

#### 5.10 Alert Escalation Timeline
- Chronological vertical timeline logging every alert level shift and the specific trigger event responsible.

---

### TIER 3 — Polish & Moonshot Capabilities (Craftsmanship 20%)

#### 5.11 What-If Scenario Sandbox
- Drag-and-drop hypothetical threats (e.g., severe storm, radar jamming, hostile contact) onto the map.
- Triggers instant client-side re-fusion and updates the briefing to show projected operational impact.

#### 5.12 Degraded-Comms Simulation
- One-click trigger simulating communications blackout or sensor jamming.
- System displays an amber "DEGRADED MODE — SERVING CACHED COP" banner, freezes last-known positions, and visibly increases uncertainty metrics.

#### 5.13 One-Click Situation Report (SITREP) PDF Export
- Generates a military-formatted SITREP document containing current timestamp, threat level, executive briefing, active COAs, map snapshot, and critical event tables via client-side PDF generation.

---

## 6. System Architecture

VANGUARD implements a **Modular Full-Stack Architecture with Instant Dual-Mode Fallback**. This ensures robust multi-service engineering while guaranteeing 100% turnkey operation during local judge evaluation.

```text
                               DATA SOURCES
                                    │
                ┌───────────────────┼───────────────────┐
                │         │         │         │         │
             Weather    Radar   Personnel   Logs    Incidents
           (Open-Meteo) (sim)     (sim)     (sim)     (sim)
                │         │         │         │         │
                └───────────────────┼───────────────────┘
                                    │
                                    ▼
                         ┌────────────────────┐
                         │  INGESTION ENGINE  │
                         └──────────┬─────────┘
                                    │
                                    ▼
                         ┌────────────────────┐
                         │   NORMALIZATION    │
                         │ (UnifiedEvent v1.1)│
                         └──────────┬─────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     │                             │
                     ▼                             ▼
          [Backend Service Mode]         [Client Fallback Mode]
          Node.js / Express / Nest       Web Worker Ingestion
          WebSocket Streaming            Reactive Zustand Store
                     │                             │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                         ┌────────────────────┐
                         │   FUSION ENGINE    │
                         │ • Spatiotemporal   │
                         │ • Corroboration    │
                         │ • Confidence Scorer│
                         │ • Anomaly Detector │
                         └──────────┬─────────┘
                                    │
                                    ▼
                         ┌────────────────────┐
                         │  GEMINI AI SYNTH   │
                         │ • Executive Brief  │
                         │ • Ranked COAs      │
                         │ • NL Query Parser  │
                         └──────────┬─────────┘
                                    │
                        ┌───────────┴───────────┐
                        │                       │
                        ▼                       ▼
                  REST Endpoints         WebSocket / SSE
                        │                       │
                        └───────────┬───────────┘
                                    ▼
                     ┌─────────────────────────────┐
                     │   VANGUARD COMMAND CENTER   │
                     │  React 18 • TypeScript     │
                     │  Tailwind • MapLibre GL     │
                     │  Recharts • Web Speech      │
                     └─────────────────────────────┘
```

---

## 7. Data Models & API Contracts

### 7.1 Authoritative TypeScript Interfaces

```typescript
export type SourceType = 'radar' | 'weather' | 'personnel' | 'log' | 'incident';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type ThreatLevel = 'green' | 'yellow' | 'orange' | 'red';

export interface GeoLocation {
  lat: number;
  lng: number;
  altitudeMeters?: number;
  headingDegrees?: number;
  speedKnots?: number;
}

export interface ConfidenceBreakdown {
  overall: number;              // 0-100
  sourceAgreement: number;       // 0-100
  spatialAgreement: number;      // 0-100
  temporalAgreement: number;     // 0-100
  sourceReliability: number;     // 0-100
  dataFreshness: number;         // 0-100
}

export interface UnifiedEvent {
  id: string;
  sourceType: SourceType;
  timestamp: string;            // ISO 8601
  location: GeoLocation;
  severity: SeverityLevel;
  title: string;
  description: string;
  confidence: number;           // 0-100
  confidenceBreakdown?: ConfidenceBreakdown;
  corroboratedBy: string[];     // IDs of linked corroborating events
  isAnomaly: boolean;
  raw: Record<string, unknown>;
}

export interface CourseOfAction {
  id: string;
  title: string;
  description: string;
  pros: string[];
  tradeoffs: string[];
  recommendedUrgency: number;   // 1-5
}

export interface AISummary {
  generatedAt: string;
  threatLevel: ThreatLevel;
  headline: string;
  executiveSummary: string;
  keyDevelopments: {
    point: string;
    supportingEventIds: string[];
  }[];
  prioritizedActions: {
    action: string;
    urgency: number;            // 1-5
    supportingEventIds: string[];
  }[];
  coursesOfAction: CourseOfAction[];
}

export interface SourceHealth {
  sourceType: SourceType;
  sourceName: string;
  status: 'live' | 'degraded' | 'down';
  lastUpdate: string;
  reliabilityScore: number;     // 0.0 - 1.0
  activeCount: number;
}
```

### 7.2 REST & WebSocket API Contracts

#### REST Endpoints
```http
# Current Operational State
GET  /api/v1/situation/current          -> Returns { threatLevel, summary, activeAlertsCount }
GET  /api/v1/situation/timeline         -> Returns chronological threat level escalations

# Events & Correlations
GET  /api/v1/events                     -> Returns UnifiedEvent[] (supports ?source=&severity=&limit=)
GET  /api/v1/events/:id                 -> Returns single UnifiedEvent
GET  /api/v1/events/:id/correlations    -> Returns corroborating UnifiedEvent[]

# Map Layers
GET  /api/v1/map/assets                 -> Returns unit positions & vectors
GET  /api/v1/map/alerts                 -> Returns active alerts with coordinates
GET  /api/v1/map/weather                -> Returns live Open-Meteo weather grid
GET  /api/v1/map/zones                  -> Returns GeoJSON operational zones

# Intelligence & AI
POST /api/v1/ai/briefing                -> Triggers new Gemini briefing generation
GET  /api/v1/ai/briefing/latest         -> Returns latest cached AISummary
POST /api/v1/ai/query                   -> Free-text NL command bar query parser
GET  /api/v1/intelligence/source-health -> Returns SourceHealth[]
```

#### WebSocket Stream (`ws://localhost:3001/stream`)
```json
{
  "type": "EVENT_STREAM" | "ALERT_TRIGGER" | "BRIEFING_UPDATE" | "HEALTH_STATUS",
  "payload": {}
}
```

---

## 8. Technology Stack

| Component | Selected Technology | Rationale |
|---|---|---|
| **Frontend Framework** | React 18 + TypeScript + Vite | Rapid development, strong typing, instantaneous HMR. |
| **Styling & HUD** | Vanilla CSS + Tailwind CSS | Ultra-fast military command aesthetics, custom glassmorphism, responsive grid. |
| **Tactical Map** | MapLibre GL JS / Leaflet | WebGL hardware-accelerated rendering, no proprietary API keys needed, GeoJSON native. |
| **Data Visualization** | Recharts | Smooth confidence trendlines, severity distributions, source health meters. |
| **Client State** | Zustand | Zero-boilerplate reactive store connecting map, feed, time-scrubber, and AI drawer. |
| **AI Intelligence** | Google Gemini API (2.0 / 1.5 Flash) | Ultra-low latency, native structured JSON output, high context window. |
| **Live External Data** | Open-Meteo API | Authentic meteorological data, zero authentication friction. |
| **Backend & Ingestion**| Node.js / Express (or NestJS) + WS | High-throughput async event ingestion, WebSocket event dispatch. |
| **Audio Readout** | Web Speech API | Client-side text-to-speech with zero server dependency. |
| **Report Generation** | jsPDF / html2canvas | Instant military SITREP PDF download. |

---

## 9. Build Priority & Execution Plan

| Phase | Milestone | Primary Focus | Weight |
|---|---|---|---|
| **Phase 1** | Ingestion & Unified Fusion Engine | Open-Meteo ingestion, mock generators, schema normalization, confidence formula, anomaly flags. | **30%** |
| **Phase 2** | Geospatial Tactical Command Map | MapLibre setup, 4 dynamic layers, marker clustering, popups, heatmap, 4D time scrubber. | **25%** |
| **Phase 3** | AI Situation Synthesis & Intelligence | Gemini API integration, structured briefing, cited claims, COA tradeoffs, explainability drawer, NL query bar. | **25%** |
| **Phase 4** | Command Center UI & Craftsmanship | Dark tactical theme, radar sweep animation, voice briefing, threat level glow, alert escalation timeline. | **20%** |
| **Phase 5** | Demo Scenarios & Stress Polish | What-If sandbox, degraded comms simulation, PDF SITREP export, multi-tab sync test. | **Bonus** |

---

## 10. Live Demonstration Script (Judging Walkthrough)

1. **First 10 Seconds (Visual Wow Factor)**:
   - Command Center opens in full-screen dark HUD mode with animated radar sweep.
   - Dynamic tactical map displays live streaming radar contacts, active patrol zones, and real Open-Meteo weather.
2. **Layer Interactivity & Fusion**:
   - Toggle layers independently (`Assets`, `Alerts`, `Weather`, `Zones`).
   - Click a high-priority contact on the map: view popup showing fused data from 3 separate feeds (Radar + Sensor + Weather) with an $88\%$ confidence rating.
3. **Interactive Explainability**:
   - Open the **Explainability Drawer** on an alert: show the exact formula breakdown ($\text{Reliability} \times \text{Recency} \times \text{Corroboration}$) and corroborating event IDs.
4. **Natural Language Query**:
   - In the omnibar, type: *"Highlight all high severity radar contacts in the eastern sector"*.
   - Watch the map and event feed filter instantly via Gemini parser.
5. **AI Situation Briefing & Voice Readout**:
   - Review the Gemini-generated situation briefing with grounded citations.
   - Expand the **Courses of Action (COAs)** to review tactical tradeoffs.
   - Click **Voice Briefing**: browser delivers a crisp audio readout of the SITREP.
6. **Dynamic Escalation & Simulation Injection**:
   - Click "Inject Incident Spike": simulate a coordinated border anomaly.
   - Threat status transitions dynamically from `YELLOW` to `RED`, ambient lighting flashes, and the timeline logs the escalation.
7. **Resilience & SITREP Export**:
   - Toggle "Degraded Comms Mode": demonstrate cached COP stability with visual uncertainty tags.
   - Click **Export SITREP**: instant military-grade PDF download.

---

## 11. Risk Assessment & Mitigations

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| **LLM Latency During Live Pitch** | Presentation stalls waiting for AI response. | Background pre-generation with instant cached snapshot; Gemini 1.5/2.0 Flash for sub-second inference. |
| **External Weather API Flakiness** | Blank weather layer during demo. | Built-in fallback cache to seed realistic meteorological patterns if Open-Meteo fails. |
| **Map Rendering Bottlenecks** | Stuttering frames with high contact counts. | MapLibre WebGL clustering and viewport spatial filtering. |
| **Judging Doubt on AI Hallucinations** | Defense judges question automated text. | Hard grounding: every claim references immutable event IDs; explainability drawer allows instant verification. |
