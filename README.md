# VANGUARD

### Multi-Source Defence Situational Awareness System

> **From fragmented data to one unified operational picture.**

VANGUARD is an AI-powered **situational awareness and decision-support platform** designed to aggregate heterogeneous operational data sources, correlate information across time and geography, assess confidence, prioritize alerts, and generate concise executive situation briefings.

Instead of forcing decision-makers to interpret multiple disconnected feeds, VANGUARD creates a **single unified command view** where critical information is contextualized, correlated, and prioritized.

---

## 🎯 Problem

Modern command and emergency operations can involve information arriving simultaneously from:

- Radar and surveillance systems
- Weather feeds
- Equipment reports
- Personnel systems
- Incident reports
- Operational logs
- Geographic information

When these sources are processed independently, decision-makers face:

- Information overload
- Fragmented situational awareness
- Conflicting reports
- Difficulty identifying what matters most
- Delays in understanding rapidly changing situations

### VANGUARD addresses this by transforming multiple raw streams into a unified, explainable operational picture.

---

# 🚀 Core Capabilities

## 1. Multi-Source Data Fusion

VANGUARD ingests and normalizes heterogeneous information into a common event model.

Supported sources include:

```text
┌─────────────┐
│    RADAR    │
└──────┬──────┘
       │
┌──────▼──────┐
│   WEATHER   │
└──────┬──────┘
       │
┌──────▼──────┐
│  PERSONNEL  │
└──────┬──────┘
       │
┌──────▼──────┐
│    LOGS     │
└──────┬──────┘
       │
┌──────▼──────┐
│  INCIDENTS  │
└──────┬──────┘
       │
       ▼
┌──────────────────────────┐
│    VANGUARD FUSION       │
│          ENGINE           │
└──────────────────────────┘
```

Different sources are transformed into a unified representation before being correlated.

---

# 🧠 2. Intelligent Situation Synthesis

VANGUARD doesn't simply display incoming information.

It identifies relationships between events using:

- Spatial correlation
- Temporal correlation
- Source reliability
- Event relationships
- Data freshness
- Cross-source agreement
- Conflicting observations

Multiple observations describing the same developing situation can therefore be presented as **one correlated intelligence event**.

---

# 📊 3. Explainable Confidence Scoring

Every fused situation is assigned a confidence level.

Rather than providing an unexplained percentage, VANGUARD breaks confidence into contributing factors.

Example:

```text
CONFIDENCE SCORE
────────────────────────────

Overall Confidence       87%

Source Agreement         92%
Spatial Agreement        90%
Temporal Agreement       84%
Source Reliability       82%
Data Freshness           98%

Corroborating Sources      3
Conflicting Sources        0
```

This allows decision-makers to understand **why the system believes a situation is reliable**.

---

# ⚠️ 4. Alert Prioritization

Not every event deserves equal attention.

VANGUARD evaluates incoming situations using multiple factors such as:

- Severity
- Confidence
- Recency
- Number of corroborating sources
- Geographic relevance
- Persistence

Events are then categorized into:

```text
CRITICAL
HIGH
MEDIUM
LOW
```

This allows operators to focus on the information requiring attention first.

---

# 🗺️ 5. Interactive Operational Map

VANGUARD provides an interactive geospatial command map.

### Dynamic layers

```text
☑ Assets
☑ Alerts
☑ Weather
☑ Zones
```

The map allows operators to:

- View operational assets
- Locate incidents
- Identify alert hotspots
- Visualize weather conditions
- Inspect geographic zones
- Toggle information layers dynamically

---

# 🤖 6. AI Situation Briefing

VANGUARD uses Gemini to transform the structured operational state into a concise executive briefing.

The AI receives **fused and validated information rather than raw unprocessed feeds**.

### Example output

```text
CURRENT SITUATION
────────────────────────

Status: ELEVATED
Confidence: 87%

KEY DEVELOPMENTS

• Multiple correlated events detected
  within the same geographic region.

• Environmental conditions are
  affecting sensor reliability.

• One source disagreement requires
  further verification.


PRIORITY ATTENTION

1. HIGH
   Review the correlated incident.

2. MEDIUM
   Verify conflicting source data.

3. LOW
   Monitor environmental changes.
```

The system is designed so that AI **assists human decision-making rather than replacing it**.

---

# 🏗️ System Architecture

```text
                         DATA SOURCES
                              │
          ┌───────────────────┼───────────────────┐
          │         │         │         │         │
        Radar    Weather   Personnel   Logs    Incidents
          │         │         │         │         │
          └───────────────────┼───────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    INGESTION    │
                    │      LAYER      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  NORMALIZATION  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   EVENT BUS     │
                    │     REDIS       │
                    └────────┬────────┘
                             │
               ┌─────────────┼─────────────┐
               │             │             │
               ▼             ▼             ▼
          Spatial        Temporal       Entity
         Correlation    Correlation    Correlation
               │             │             │
               └─────────────┼─────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  FUSION ENGINE  │
                    └────────┬────────┘
                             │
             ┌───────────────┼────────────────┐
             │               │                │
             ▼               ▼                ▼
       Confidence        Conflict         Anomaly
         Engine           Engine           Engine
             │               │                │
             └───────────────┼────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ PRIORITY ENGINE  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ SITUATION STATE │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   GEMINI AI     │
                    │   BRIEFING      │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
                REST API          WebSocket
                    │                 │
                    └────────┬────────┘
                             ▼
                  ┌─────────────────────┐
                  │   COMMAND CENTER    │
                  │                     │
                  │ Map • Alerts • AI   │
                  │ Situation • Sources │
                  └─────────────────────┘
```

---

# ⚙️ Technology Stack

## Frontend

- React
- TypeScript
- Tailwind CSS
- MapLibre / Leaflet
- Recharts

## Backend

- Node.js
- NestJS
- TypeScript
- REST APIs
- WebSockets

## Data & Infrastructure

- PostgreSQL
- PostGIS
- Redis
- BullMQ

## Artificial Intelligence

- Google Gemini API

---

# 🔄 Data Processing Pipeline

VANGUARD follows a structured intelligence pipeline:

```text
1. INGEST
      ↓
2. VALIDATE
      ↓
3. NORMALIZE
      ↓
4. CORRELATE
      ↓
5. FUSE
      ↓
6. CALCULATE CONFIDENCE
      ↓
7. DETECT CONFLICTS / ANOMALIES
      ↓
8. PRIORITIZE
      ↓
9. BUILD SITUATION STATE
      ↓
10. GENERATE AI BRIEFING
      ↓
11. STREAM TO COMMAND CENTER
```

This architecture ensures that AI operates on **structured, contextualized information** instead of disconnected raw data.

---

# ⚡ Real-Time Situational Awareness

VANGUARD is designed around an event-driven architecture.

When a new event arrives:

```text
New Event
   ↓
Event Bus
   ↓
Fusion Engine
   ↓
Situation State Updated
   ↓
Alert Recalculated
   ↓
WebSocket
   ↓
Command Center
```

Operators don't need to continuously refresh the dashboard.

Changes can be pushed to the command interface in real time.

---

# 🧩 Unified Event Model

All incoming sources are transformed into a common event structure.

Conceptually:

```json
{
  "id": "event-1024",
  "source": "RADAR",
  "type": "DETECTION",
  "timestamp": "2026-09-08T10:34:21Z",
  "location": {
    "latitude": 23.03,
    "longitude": 72.58
  },
  "confidence": 0.82,
  "payload": {}
}
```

This allows different systems to communicate through a common representation.

---

# 🔎 Evidence-Based Intelligence

Every generated situation maintains a relationship with the events that contributed to it.

```text
Situation
    │
    ├── Radar Observation
    │
    ├── Sensor Observation
    │
    ├── Incident Report
    │
    └── Weather Observation
```

This allows operators to trace:

> **What evidence produced this situation?**

and:

> **Why does the system have this confidence level?**

---

# 🧪 Simulation & Demonstration

VANGUARD can use synthetic operational scenarios to demonstrate the complete intelligence pipeline without requiring access to sensitive or classified data.

Example scenarios:

### Normal Operations

```text
Stable environment
Healthy data sources
No critical alerts
```

### Weather Degradation

```text
Weather changes
       ↓
Sensor reliability decreases
       ↓
Confidence recalculated
       ↓
Situation status updated
```

### Multi-Source Correlation

```text
Radar observation
       +
Sensor observation
       +
Incident report
       ↓
Spatial + temporal correlation
       ↓
High-confidence situation
       ↓
Priority alert
       ↓
AI briefing
```

### Conflicting Sources

```text
Source A → Normal
Source B → Anomaly
Source C → Normal

        ↓

Conflict detected

        ↓

Confidence adjusted

        ↓

Human verification requested
```

---

# 🔐 Security & Reliability

VANGUARD is designed with security and traceability in mind.

Planned capabilities include:

- JWT authentication
- Role-based access control
- Input validation
- API rate limiting
- Audit logging
- Request tracing
- Source health monitoring
- Data freshness tracking
- Configurable confidence models

The system is intended as a **human-in-the-loop decision-support platform**.

---

# 📡 API Overview

### Situation

```http
GET /api/v1/situation/current
GET /api/v1/situation/history
GET /api/v1/situation/timeline
```

### Events

```http
GET /api/v1/events
GET /api/v1/events/:id
GET /api/v1/events/:id/correlations
```

### Incidents

```http
GET  /api/v1/incidents
GET  /api/v1/incidents/:id
POST /api/v1/incidents
```

### Map

```http
GET /api/v1/map/assets
GET /api/v1/map/incidents
GET /api/v1/map/weather
GET /api/v1/map/zones
GET /api/v1/map/hotspots
```

### Intelligence

```http
GET /api/v1/intelligence/conflicts
GET /api/v1/intelligence/anomalies
GET /api/v1/intelligence/confidence/:id
```

### AI

```http
POST /api/v1/ai/briefing
GET  /api/v1/ai/briefing/latest
```

---

# 📈 Evaluation Alignment

VANGUARD is designed directly around the challenge evaluation criteria.

| Evaluation Area | VANGUARD |
|---|---|
| **Data Fusion & Multi-Source Integration — 30%** | Unified event model, multi-stream ingestion, spatial/temporal correlation |
| **Command Map & Geospatial UX — 25%** | Interactive tactical map, assets, alerts, weather and zones |
| **AI Summarization & Alert Prioritization — 25%** | Gemini-powered briefings, confidence scoring and priority engine |
| **Scalability & UI Craftsmanship — 20%** | Event-driven architecture, Redis, background processing, real-time updates and modular services |

---

# 🛣️ Roadmap

### Phase 1 — Foundation

- [x] Project architecture
- [ ] Database schema
- [ ] Unified event model
- [ ] API foundation

### Phase 2 — Data Fusion

- [ ] Multi-source ingestion
- [ ] Event normalization
- [ ] Spatial correlation
- [ ] Temporal correlation
- [ ] Confidence engine
- [ ] Conflict detection

### Phase 3 — Command Center

- [ ] Interactive map
- [ ] Dynamic map layers
- [ ] Real-time alerts
- [ ] Situation dashboard
- [ ] Source health monitoring

### Phase 4 — AI Intelligence

- [ ] Gemini integration
- [ ] Situation synthesis
- [ ] Executive briefing
- [ ] Prioritized action items
- [ ] Evidence-linked AI responses

### Phase 5 — Demonstration

- [ ] Synthetic data generator
- [ ] Scenario engine
- [ ] Real-time simulation
- [ ] Incident replay
- [ ] End-to-end testing

---

# 🏆 Why VANGUARD?

Traditional systems present information.

**VANGUARD contextualizes it.**

Traditional dashboards show multiple alerts.

**VANGUARD determines which events belong together.**

Traditional AI summaries can be difficult to trust.

**VANGUARD connects AI-generated insights back to the underlying evidence.**

The result is a unified system that transforms:

```text
                FRAGMENTED DATA
                      │
                      ▼
             ┌─────────────────┐
             │    VANGUARD     │
             │                 │
             │  Fuse           │
             │  Correlate      │
             │  Evaluate       │
             │  Prioritize     │
             │  Explain        │
             └────────┬────────┘
                      │
                      ▼
            UNIFIED SITUATIONAL
                 AWARENESS
                      │
                      ▼
             BETTER-INFORMED
              HUMAN DECISIONS
```

---

## ⚠️ Scope

VANGUARD is a **defensive situational-awareness and decision-support system**.

It is designed to assist human operators in understanding complex, rapidly changing information environments. It does not automate weapon targeting, engagement decisions, or offensive operational actions.

---

## 👥 Team

### Destroyer of Worlds

Built for **HACKHERTZ 2026 — Defense Track**

**Project:** VANGUARD  
**Problem:** Multi-Source Defence Situational Awareness System

---

## 📜 License

This project is developed as a hackathon prototype for educational and demonstration purposes.