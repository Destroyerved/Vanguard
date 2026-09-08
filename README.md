# 🛡️ VANGUARD
### Multi-Source Defence Situational Awareness System

> **One picture. Every source. Zero delay.**  
> *From fragmented data streams to one unified, explainable operational picture.*

[![Track](https://img.shields.io/badge/Track-Defense-red.svg)](https://github.com/Destroyerved/Vanguard)
[![Event](https://img.shields.io/badge/Event-HackHertz%202026-blue.svg)](https://github.com/Destroyerved/Vanguard)
[![Problem ID](https://img.shields.io/badge/Problem%20ID-D--05-orange.svg)](https://github.com/Destroyerved/Vanguard)
[![AI](https://img.shields.io/badge/AI-Google%20Gemini%202.0%20%2F%201.5-purple.svg)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

VANGUARD is an AI-powered **Common Operating Picture (COP) and decision-support command platform** designed for defense and emergency watchstanders. It aggregates heterogeneous operational data streams, correlates information across space and time, computes transparent confidence metrics, prioritizes critical alerts, and generates grounded executive situation briefings and tactical Courses of Action (COAs).

Instead of forcing decision-makers to cognitively assemble dozens of disconnected screens during high-stress operations, VANGUARD presents an **interactive, unified tactical command view** where every contact is correlated, every claim is traceable to source evidence, and every action is prioritized.

---

## 🎯 The Operational Problem

Modern tactical operations centers and emergency command rooms suffer from severe cognitive overload. Data arrives continuously and asynchronously from siloed systems:

- **Surveillance & Radar**: Kinematic contact tracks, transponders, IFF tags
- **Meteorological Feeds**: Atmospheric conditions, visibility, precipitation radar
- **Personnel & Unit Readiness**: GPS telemetry, squad health, asset readiness
- **Operational Logs**: Perimeter sensors, access tripwires, network telemetries
- **Incident Reports**: Human field reports, emergency dispatches, threat advisories

When operators process these feeds in silos, critical consequences emerge:
1. **Information Overload**: Hundreds of noisy events obscure high-priority developments.
2. **Delayed Comprehension**: Minutes lost cross-referencing maps, weather forecasts, and incident reports.
3. **Conflicting Observations**: Radar tracks contradict ground sensor logs, causing hesitation.
4. **AI Hallucination Risk**: Generic AI tools produce ungrounded summaries that defense operators cannot verify or trust.

### VANGUARD resolves this by fusing raw multi-source streams into a correlated, explainable, and actionable tactical picture in real time.

---

## 🚀 Core Capabilities

### 1. Multi-Source Data Fusion Engine
VANGUARD normalizes heterogeneous streams into an authoritative Common Event Model:
- **Live Weather Feed**: Real-time atmospheric conditions via the **Open-Meteo API** (zero API key required).
- **Radar & Sensor Tracks**: High-fidelity kinematic contacts with speed, heading, and altitude vectors.
- **Personnel & Asset Telemetry**: Real-time position, status, and readiness tracking.
- **Operational Logs**: Automated perimeter tripwire alerts and system diagnostic logs.
- **Field Incidents**: Manual and automated tactical dispatch reports.

```text
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  OPEN-METEO  │  │    RADAR     │  │  PERSONNEL   │  │ OPERATIONAL  │  │  INCIDENTS   │
│  LIVE WEATHER│  │ SENSOR TRACKS│  │   TELEMETRY  │  │ SYSTEM LOGS  │  │  DISPATCHES  │
└───────┬──────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
        │                │                 │                 │                 │
        └────────────────┴────────────┬────┴─────────────────┴─────────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    VANGUARD INGESTION &       │
                      │     NORMALIZATION ENGINE      │
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │  SPATIOTEMPORAL CORRELATION   │
                      │     & CORROBORATION LAYER     │
                      └───────────────────────────────┘
```

---

### 2. Intelligent Situation Synthesis & Corroboration
VANGUARD identifies relationships between events before displaying them:
- **Spatial Clustering**: Haversine distance proximity windowing ($\le \Delta R$).
- **Temporal Windowing**: Aligns events unfolding within the same dynamic time slice ($\le \Delta T$).
- **Corroboration Linking**: When independent sources confirm the same developing threat, VANGUARD links them via `corroboratedBy` and boosts situational certainty.
- **Anomaly Detection**: Statistical z-score outlier detection flags unusual incident spikes or sensor anomalies *before* LLM synthesis.

---

### 3. Explainable Confidence Scoring
Every fused event and AI claim is backed by transparent, deterministic confidence mathematics:

$$\text{Confidence} = \min\left(100, \text{round}\left(\text{SourceReliability} \times \text{RecencyDecay} \times \text{CorroborationBoost} \times 100\right)\right)$$

Operators can open the **Interactive Explainability Drawer** to inspect the mathematical breakdown:

```text
EXPLAINABILITY BREAKDOWN: CONTACT #E-4091
────────────────────────────────────────────────────
Overall Confidence Score                    88% (HIGH)

  • Source Reliability Weight               92%
  • Spatial Corroboration Agreement         90%
  • Temporal Correlation Window             85%
  • Data Freshness (Recency)                96%
  • Multi-Source Corroboration Boost        +15% (3 independent feeds)

Contributing Feeds:
  [1] RADAR-PRIMARY   (Track #R-204)  - Confirmed Kinematics
  [2] IR-PERIMETER    (Sensor #P-12)  - Thermal Signature
  [3] OPEN-METEO      (Station #725)  - Severe Weather Masking
────────────────────────────────────────────────────
```

---

### 4. Alert Prioritization Matrix
Incoming situations are scored and triaged into four distinct operational severity tiers:

```text
┌───────────┐  Immediate tactical emergency requiring operational intervention.
│ CRITICAL  │  (Multi-source corroborated threat, perimeter breach, severe storm impact)
├───────────┤
│   HIGH    │  Developing contact requiring verification; multiple indicators aligned.
├───────────┤
│  MEDIUM   │  Isolated anomaly or weather alert; monitoring required.
├───────────┤
│    LOW    │  Routine telemetry, minor maintenance log, or single-sensor anomaly.
└───────────┘
```

---

### 5. Interactive Tactical Command Map
Hardware-accelerated geospatial canvas powered by **MapLibre GL JS**:
- **4 Dynamic Switchable Layers**:
  - `☑ Assets`: Dynamic operational units with heading vectors and speed readouts.
  - `☑ Alerts`: Severity-coded tactical pins with instant pulse animations on critical contacts.
  - `☑ Weather`: Real-time Open-Meteo precipitation overlays and wind velocity vectors.
  - `☑ Zones`: Operational sectors, restricted airspace, geofences, and danger radii.
- **Contact Clustering**: Smoothly handles high-density contact volumes without visual clutter.
- **Incident Heatmap Mode**: Instant toggle to visualize geographic incident concentration.
- **4D Time-Scrubber**: Slider to scrub back in time and replay how a tactical scenario developed.

---

### 6. AI Situation Briefing & Courses of Action (COA)
VANGUARD utilizes **Google Gemini (2.0 / 1.5 Flash)** to generate structured executive briefings and ranked Courses of Action:
- **Strict Evidence Grounding**: Every key finding **must cite supporting event IDs**.
- **Ranked Courses of Action (COAs)**: Provides tactical options with concrete pros and operational tradeoffs.

```text
CURRENT SITUATIONAL BRIEFING [GREEN → YELLOW → ORANGE → RED]
──────────────────────────────────────────────────────────────────────────
STATUS: ORANGE (HEIGHTENED READINESS) | OVERALL CONFIDENCE: 88%

KEY DEVELOPMENTS:
• Correlated perimeter alert detected in Sector 4 [Events: #E-1024, #E-1029].
• Heavy precipitation masking primary optical surveillance [Event: #W-0811].
• Secondary radar confirms fast-moving unidentified contact [Event: #R-4012].

RECOMMENDED COURSES OF ACTION (COA):
1. [URGENCY 5/5] Intercept & Verify Contact
   • Pro: Immediate neutralization of potential perimeter breach.
   • Tradeoff: Diverts Quick Reaction Force (QRF) from Sector 2 standby.
2. [URGENCY 4/5] Deploy Drone Reconnaissance
   • Pro: Zero personnel risk; confirms thermal signature through weather.
   • Tradeoff: 4-minute deployment latency in high-wind conditions.
3. [URGENCY 2/5] Passive Radar Sensor Gain Adjustment
   • Pro: Compensates for atmospheric noise without moving ground assets.
   • Tradeoff: Does not confirm contact identity.
```

---

## 🌟 Elite Hackathon Differentiators

VANGUARD integrates 8 purpose-built differentiator capabilities designed to showcase unmatched technical craftsmanship:

| Differentiator | Description | Technical Implementation |
|---|---|---|
| **Natural-Language Command Omnibar** | Query the entire tactical picture in plain English (e.g. *"Show all high-severity radar contacts near Sector 3 in the past hour"*). | Gemini function calling / structured filter extraction parsed into instant map/feed filters. |
| **AI Courses of Action (COA) with Tradeoffs** | Actionable tactical recommendations with explicit tradeoffs rather than passive text summaries. | Structured JSON schema in Gemini prompt engineering. |
| **Voice Briefing Mode** | Hands-free audio situation report readout for command room realism. | Browser-native Web Speech API synthesis with military cadence. |
| **Interactive Explainability Drawer** | Drill into any AI claim or event to inspect underlying event IDs and confidence factors. | Sliding slide-over panel with raw JSON and dynamic factor charts. |
| **4D Time-Scrubber** | Scrub back in time to replay tactical incidents chronologically. | Client-side event timeline buffer with slider controls. |
| **Dynamic Tactical Threat UI** | Global UI ambient glow and navigation HUD automatically shift according to aggregate threat level (`GREEN` $\to$ `YELLOW` $\to$ `ORANGE` $\to$ `RED`). | Reactive Tailwind CSS theme tokens driven by aggregate state. |
| **What-If Sandbox & Degraded Comms** | Inject hypothetical incidents or simulate sensor blackout to verify system resilience. | Client-side simulation sandbox + offline cached state fallback banner. |
| **One-Click SITREP PDF Export** | Export a military-standard Situation Report (SITREP) in one click. | Client-side `jsPDF` formatted document generation. |

---

## 🏗️ System Architecture

VANGUARD is architected as a **High-Performance Modular System with Instant Dual-Mode Fallback**:
1. **Full-Stack WebSocket Mode**: Connects to the Node.js/NestJS ingestion and fusion service.
2. **Turnkey Standalone Mode**: Includes an in-browser Web Worker simulation engine. Any judge can clone and run `npm run dev` with **zero database configuration, zero Docker setup, and zero friction**.

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

## 🧩 Unified Event Model

All incoming feeds are strictly normalized into the `UnifiedEvent` interface before entering the fusion pipeline:

```typescript
export interface UnifiedEvent {
  id: string;                             // Unique event identifier (e.g. "EV-1024")
  sourceType: 'radar' | 'weather' | 'personnel' | 'log' | 'incident';
  timestamp: string;                      // ISO 8601 UTC timestamp
  location: {
    lat: number;                          // Latitude (-90 to +90)
    lng: number;                          // Longitude (-180 to +180)
    altitudeMeters?: number;              // Optional contact altitude
    headingDegrees?: number;              // Optional contact heading vector (0-360)
    speedKnots?: number;                  // Optional contact speed
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;                          // Concise tactical title
  description: string;                    // Operational context
  confidence: number;                     // 0 to 100 integer score
  confidenceBreakdown?: {
    overall: number;
    sourceReliability: number;
    spatialAgreement: number;
    temporalAgreement: number;
    dataFreshness: number;
  };
  corroboratedBy: string[];               // Linked IDs of confirming events
  isAnomaly: boolean;                     // Flagged by outlier detection engine
  raw: Record<string, unknown>;           // Original raw telemetry payload
}
```

### Example Normalized Event (JSON)

```json
{
  "id": "EV-4091",
  "sourceType": "radar",
  "timestamp": "2026-09-08T11:45:00Z",
  "location": {
    "lat": 23.0325,
    "lng": 72.5841,
    "altitudeMeters": 1200,
    "headingDegrees": 135,
    "speedKnots": 240
  },
  "severity": "high",
  "title": "Uncorrelated Fast Contact",
  "description": "Primary radar detected fast-moving contact crossing restricted airspace sector 4.",
  "confidence": 88,
  "confidenceBreakdown": {
    "overall": 88,
    "sourceReliability": 92,
    "spatialAgreement": 90,
    "temporalAgreement": 85,
    "dataFreshness": 96
  },
  "corroboratedBy": ["EV-4088", "EV-4090"],
  "isAnomaly": true,
  "raw": {
    "transponder": "NONE",
    "radarFreqGhz": 9.4,
    "radarRcsM2": 1.8
  }
}
```

---

## 📡 REST & WebSocket API Specification

### REST Endpoints
```http
# Situational Overview
GET  /api/v1/situation/current          # Current threat level, active count, executive summary
GET  /api/v1/situation/timeline         # Threat level escalation history log

# Events & Corroboration
GET  /api/v1/events                     # Filterable by ?source=&severity=&limit=
GET  /api/v1/events/:id                 # Detailed event inspection
GET  /api/v1/events/:id/correlations    # Supporting events linked by corroboration engine

# Tactical Map Data
GET  /api/v1/map/assets                 # Unit positions, vectors, and statuses
GET  /api/v1/map/alerts                 # Active spatial alerts
GET  /api/v1/map/weather                # Real-time Open-Meteo weather grid
GET  /api/v1/map/zones                  # Operational GeoJSON zones and boundaries

# AI Intelligence & Decision Support
POST /api/v1/ai/briefing                # Triggers on-demand Gemini synthesis
GET  /api/v1/ai/briefing/latest         # Fetches latest cached briefing and COAs
POST /api/v1/ai/query                   # Natural-language query bar parser
GET  /api/v1/intelligence/source-health # Up/degraded/down metrics for all feeds
```

### Real-Time WebSocket Channel (`ws://localhost:3001/stream`)
```json
{
  "type": "EVENT_STREAM",
  "timestamp": "2026-09-08T11:45:01Z",
  "payload": {
    "event": { "id": "EV-4091", "severity": "high", "confidence": 88 }
  }
}
```

---

## ⚙️ Technology Stack

| Layer | Technology | Role |
|---|---|---|
| **Frontend Framework** | **React 18 + TypeScript + Vite** | High-performance, low-latency command center UI. |
| **Tactical Map** | **MapLibre GL JS** | WebGL vector map rendering, clustering, and GeoJSON overlays. |
| **Styling & HUD** | **Tailwind CSS + Custom CSS** | Dark tactical aesthetics, HUD scanlines, glassmorphism. |
| **Data Visualization**| **Recharts + Lucide Icons** | Confidence factor gauges, severity breakdowns, tactical icons. |
| **State Management** | **Zustand** | Instantaneous reactive state for maps, feeds, and filters. |
| **AI Intelligence** | **Google Gemini 2.0 / 1.5 Flash** | Sub-second executive situation briefing and ranked COA generation. |
| **Live Weather** | **Open-Meteo API** | Real-world global weather without API keys or rate limits. |
| **Backend / Streaming**| **Node.js + Express / WS** | Multi-source event ingestion, fusion pipeline, and WebSocket broadcast. |
| **Voice Synthesis** | **Web Speech API** | Hands-free browser-native tactical audio briefing. |
| **Reporting** | **jsPDF** | One-click military-standard SITREP PDF generation. |

---

## 📈 Evaluation Alignment

VANGUARD is engineered to systematically score maximum points across all HackHertz defense criteria:

| Evaluation Area | Weight | Vanguard Implementation |
|---|---|---|
| **Data Fusion & Multi-Source Integration** | **30%** | Ingestion of 5 diverse streams (including live Open-Meteo), schema normalization, spatiotemporal corroboration, mathematical confidence engine, and source health monitoring. |
| **Command Map & Geospatial UX** | **25%** | MapLibre GL tactical canvas, 4 dynamic toggleable layers, contact clustering, interactive popups, density heatmap, and 4D time-scrubber replay. |
| **AI Situation Summarization & Alert Prioritization** | **25%** | Gemini-powered executive briefings with mandatory event citation, ranked Courses of Action (COAs) with tradeoffs, explainability drawer, and NL query bar. |
| **System Scalability & UI Craftsmanship** | **20%** | Military HUD theme, dynamic threat level glow, voice briefing readout, what-if sandbox, degraded comms simulation, and zero-friction dual-mode deployment. |

---

## 🛣️ Development Roadmap

- [x] **Phase 1: Architecture & Unified Model (Data Fusion 30%)**
  - [x] Harmonize PRD and README specifications
  - [x] Authoritative `UnifiedEvent` schema and type definitions
  - [x] Mathematical confidence scoring formula
  - [ ] Multi-source mock generator & Open-Meteo weather client
  - [ ] Spatiotemporal corroboration engine

- [ ] **Phase 2: Geospatial Command Map (Geospatial UX 25%)**
  - [ ] MapLibre GL dark tactical basemap
  - [ ] 4 toggleable layers (Assets, Alerts, Weather, Zones)
  - [ ] Contact clustering and popup inspection cards
  - [ ] Incident density heatmap
  - [ ] 4D time-scrubber replay controls

- [ ] **Phase 3: AI Intelligence & Decision Support (AI Summarization 25%)**
  - [ ] Gemini API structured briefing pipeline
  - [ ] Hard event grounding (`supportingEventIds`)
  - [ ] Ranked Courses of Action (COAs) with tradeoff analysis
  - [ ] Natural-language command query bar parser
  - [ ] Slide-out Explainability Drawer

- [ ] **Phase 4: Craftsmanship & Polish (Craftsmanship 20%)**
  - [ ] Military dark HUD theme & dynamic threat glow (`GREEN` $\to$ `RED`)
  - [ ] Radar sweep animation & alert sound cues
  - [ ] Voice briefing readout (Web Speech API)
  - [ ] Alert escalation timeline

- [ ] **Phase 5: Demonstration Scenarios & Resilience (Stretch)**
  - [ ] Coordinated border spike simulation scenario
  - [ ] Degraded comms blackout fallback mode
  - [ ] One-click military SITREP PDF export

---

## 👥 Team & Attribution

**Team:** Destroyer of Worlds  
**Event:** HackHertz 2026 — Defense Track  
**Project:** VANGUARD (Multi-Source Defence Situational Awareness System)  

*Note: VANGUARD is a purely defensive situational awareness and decision-support system. It does not automate kinetic targeting, offensive weapons release, or lethal autonomous decisions.*