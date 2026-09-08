# VANGUARD — Team Task Tracker

> **Multi-Source Defence Situational Awareness System**  
> Hackathon: **HACKHERTZ 2026 — Defense Track**  
> Team: **Destroyer of Worlds**

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

### Priority

- 🔴 `Critical`
- 🟠 `High`
- 🟡 `Medium`
- ⚪ `Low`

---

# 🏗️ Project Tasks

## 1. Project Architecture & Setup

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| P-01 | Finalize system architecture — frontend, backend, AI, DB, real-time | | ⬜ Not Started | 0% | 🔴 Critical | — | | |
| P-02 | Define repository structure | | ⬜ Not Started | 0% | 🟠 High | P-01 | | |
| P-03 | Define API contracts — REST + WebSocket schemas | | ⬜ Not Started | 0% | 🔴 Critical | P-01 | | |
| P-04 | Create `.env.example` and configuration strategy | | ⬜ Not Started | 0% | 🟠 High | P-01 | | |
| P-05 | Create Docker development environment | | ⬜ Not Started | 0% | 🟠 High | P-01 | | |

---

# 🖥️ Backend

## 2. Backend Foundation

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-01 | Initialize NestJS backend | | ⬜ Not Started | 0% | 🔴 Critical | — | | |
| B-02 | Setup PostgreSQL | | ⬜ Not Started | 0% | 🔴 Critical | B-01 | | |
| B-03 | Setup PostGIS | | ⬜ Not Started | 0% | 🔴 Critical | B-02 | | |
| B-04 | Setup Redis | | ⬜ Not Started | 0% | 🟠 High | B-01 | | |
| B-05 | Setup BullMQ workers | | ⬜ Not Started | 0% | 🟡 Medium | B-04 | | |

## 3. Backend Data Models

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-06 | Create UnifiedEvent model | | ⬜ Not Started | 0% | 🔴 Critical | B-02 | | |
| B-07 | Create Source model with reliability profile | | ⬜ Not Started | 0% | 🟠 High | B-02 | | |
| B-08 | Create Asset model | | ⬜ Not Started | 0% | 🟠 High | B-02 | | |
| B-09 | Create Incident model | | ⬜ Not Started | 0% | 🔴 Critical | B-02 | | |
| B-10 | Create Alert model | | ⬜ Not Started | 0% | 🔴 Critical | B-02 | | |
| B-11 | Create Zone model with geospatial data | | ⬜ Not Started | 0% | 🟠 High | B-03 | | |
| B-12 | Create Weather Observation model | | ⬜ Not Started | 0% | 🟠 High | B-02 | | |
| B-13 | Create Telemetry / Log model | | ⬜ Not Started | 0% | 🟠 High | B-02 | | |
| B-14 | Create Situation model | | ⬜ Not Started | 0% | 🔴 Critical | B-02 | | |
| B-15 | Create AI Briefing model | | ⬜ Not Started | 0% | 🟠 High | B-02 | | |
| B-16 | Create Audit Log model | | ⬜ Not Started | 0% | 🟡 Medium | B-02 | | |

---

# 📡 Multi-Source Data Ingestion

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-17 | Build generic event ingestion endpoint | | ⬜ Not Started | 0% | 🔴 Critical | B-06 | | |
| B-18 | Build radar ingestion | | ⬜ Not Started | 0% | 🔴 Critical | B-06 | | |
| B-19 | Build weather ingestion | | ⬜ Not Started | 0% | 🟠 High | B-06 | | |
| B-20 | Build personnel ingestion | | ⬜ Not Started | 0% | 🟠 High | B-06 | | |
| B-21 | Build operational logs ingestion | | ⬜ Not Started | 0% | 🟠 High | B-06 | | |
| B-22 | Build incident ingestion | | ⬜ Not Started | 0% | 🔴 Critical | B-06 | | |
| B-23 | Implement input validation | | ⬜ Not Started | 0% | 🔴 Critical | B-17 | | |
| B-24 | Implement event deduplication | | ⬜ Not Started | 0% | 🟠 High | B-17 | | |

---

# 🧠 Data Fusion Engine

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-25 | Build event normalization pipeline | | ⬜ Not Started | 0% | 🔴 Critical | B-18–B-22 | | |
| B-26 | Build spatial correlation engine | | ⬜ Not Started | 0% | 🔴 Critical | B-03, B-25 | | |
| B-27 | Build temporal correlation engine | | ⬜ Not Started | 0% | 🔴 Critical | B-25 | | |
| B-28 | Build entity correlation engine | | ⬜ Not Started | 0% | 🟠 High | B-25 | | |
| B-29 | Build source agreement engine | | ⬜ Not Started | 0% | 🔴 Critical | B-25 | | |
| B-30 | Build conflict detection engine | | ⬜ Not Started | 0% | 🟠 High | B-29 | | |
| B-31 | Build data freshness engine | | ⬜ Not Started | 0% | 🟠 High | B-25 | | |

---

# 🎯 Confidence, Priority & Intelligence

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-32 | Implement multi-source confidence scoring | | ⬜ Not Started | 0% | 🔴 Critical | B-29, B-31 | | |
| B-33 | Implement confidence breakdown | | ⬜ Not Started | 0% | 🔴 Critical | B-32 | | |
| B-34 | Implement alert priority engine | | ⬜ Not Started | 0% | 🔴 Critical | B-32 | | |
| B-35 | Implement anomaly detection | | ⬜ Not Started | 0% | 🟡 Medium | B-25 | | |
| B-36 | Build situation state engine | | ⬜ Not Started | 0% | 🔴 Critical | B-30, B-32, B-34 | | |
| B-37 | Build situation history / timeline | | ⬜ Not Started | 0% | 🟠 High | B-36 | | |

---

# 🤖 AI / Gemini Backend

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-38 | Integrate Gemini API | | ⬜ Not Started | 0% | 🔴 Critical | B-36 | | |
| B-39 | Design structured situation briefing prompt | | ⬜ Not Started | 0% | 🔴 Critical | B-38 | | |
| B-40 | Implement structured AI output | | ⬜ Not Started | 0% | 🔴 Critical | B-39 | | |
| B-41 | Implement evidence linking for AI insights | | ⬜ Not Started | 0% | 🟠 High | B-40 | | |

### AI Output Must Cover

- Situation summary
- Key developments
- Prioritized action items
- Uncertainties
- Confidence/context
- Evidence references

---

# 🌐 Backend APIs

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-42 | Situation REST APIs — current/history/timeline | | ⬜ Not Started | 0% | 🔴 Critical | B-36 | | |
| B-43 | Event REST APIs — list/detail/correlations | | ⬜ Not Started | 0% | 🟠 High | B-25 | | |
| B-44 | Map APIs — assets/alerts/weather/zones/hotspots | | ⬜ Not Started | 0% | 🔴 Critical | B-03, B-34 | | |
| B-45 | Intelligence APIs — confidence/conflicts/anomalies | | ⬜ Not Started | 0% | 🟠 High | B-30, B-32, B-35 | | |

---

# ⚡ Real-Time Backend

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-46 | Build WebSocket gateway | | ⬜ Not Started | 0% | 🔴 Critical | B-04 | | |
| B-47 | Stream new events | | ⬜ Not Started | 0% | 🟠 High | B-46, B-17 | | |
| B-48 | Stream alert updates | | ⬜ Not Started | 0% | 🔴 Critical | B-46, B-34 | | |
| B-49 | Stream situation updates | | ⬜ Not Started | 0% | 🔴 Critical | B-46, B-36 | | |

---

# 🧪 Synthetic Data & Simulation

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-50 | Build synthetic multi-source data generator | | ⬜ Not Started | 0% | 🔴 Critical | B-17 | | |
| B-51 | Create normal operations scenario | | ⬜ Not Started | 0% | 🟠 High | B-50 | | |
| B-52 | Create weather degradation scenario | | ⬜ Not Started | 0% | 🟠 High | B-50 | | |
| B-53 | Create multi-source correlation scenario | | ⬜ Not Started | 0% | 🔴 Critical | B-50, B-26, B-27 | | |
| B-54 | Create conflicting-source scenario | | ⬜ Not Started | 0% | 🟠 High | B-50, B-30 | | |
| B-55 | Build event replay/timeline engine | | ⬜ Not Started | 0% | 🟡 Medium | B-37 | | |

---

# 🔐 Backend Security & Reliability

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| B-56 | Implement authentication | | ⬜ Not Started | 0% | 🟠 High | B-01 | | |
| B-57 | Implement role-based access control | | ⬜ Not Started | 0% | 🟡 Medium | B-56 | | |
| B-58 | Implement API rate limiting | | ⬜ Not Started | 0% | 🟡 Medium | B-01 | | |
| B-59 | Implement audit logging | | ⬜ Not Started | 0% | 🟡 Medium | B-16 | | |
| B-60 | Implement system health checks | | ⬜ Not Started | 0% | 🟠 High | B-02, B-04 | | |
| B-61 | Backend unit tests | | ⬜ Not Started | 0% | 🟠 High | B-32, B-34 | | |
| B-62 | Backend integration tests | | ⬜ Not Started | 0% | 🟠 High | B-36 | | |

---

# 🎨 Frontend

## 4. Frontend Foundation

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| F-01 | Initialize React + TypeScript | | ⬜ Not Started | 0% | 🔴 Critical | — | | |
| F-02 | Setup Tailwind CSS | | ⬜ Not Started | 0% | 🟠 High | F-01 | | |
| F-03 | Build reusable UI component system | | ⬜ Not Started | 0% | 🔴 Critical | F-02 | | |
| F-04 | Build command center application shell | | ⬜ Not Started | 0% | 🔴 Critical | F-03 | | |
| F-05 | Implement responsive layout | | ⬜ Not Started | 0% | 🟡 Medium | F-04 | | |

---

# 🗺️ Tactical Command Map

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| F-06 | Integrate MapLibre / Leaflet | | ⬜ Not Started | 0% | 🔴 Critical | F-04 | | |
| F-07 | Build Assets map layer | | ⬜ Not Started | 0% | 🔴 Critical | F-06 | | |
| F-08 | Build Alerts map layer | | ⬜ Not Started | 0% | 🔴 Critical | F-06 | | |
| F-09 | Build Weather map layer | | ⬜ Not Started | 0% | 🟠 High | F-06 | | |
| F-10 | Build Zones map layer | | ⬜ Not Started | 0% | 🟠 High | F-06 | | |
| F-11 | Build dynamic layer toggles | | ⬜ Not Started | 0% | 🔴 Critical | F-07–F-10 | | |
| F-12 | Build map popup/detail panel | | ⬜ Not Started | 0% | 🟠 High | F-07, F-08 | | |
| F-13 | Build activity / alert hotspots | | ⬜ Not Started | 0% | 🟠 High | F-08 | | |

---

# 📊 Command Dashboard

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| F-14 | Build situation overview panel | | ⬜ Not Started | 0% | 🔴 Critical | B-42 | | |
| F-15 | Build active alerts panel | | ⬜ Not Started | 0% | 🔴 Critical | B-34 | | |
| F-16 | Build source health panel | | ⬜ Not Started | 0% | 🟠 High | B-60 | | |
| F-17 | Build key metrics cards | | ⬜ Not Started | 0% | 🟠 High | F-14 | | |
| F-18 | Build operational event timeline | | ⬜ Not Started | 0% | 🟠 High | B-37 | | |
| F-19 | Build recent changes panel | | ⬜ Not Started | 0% | 🟠 High | B-37 | | |

---

# 🧠 Intelligence UI

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| F-20 | Build confidence indicator | | ⬜ Not Started | 0% | 🔴 Critical | B-33 | | |
| F-21 | Build confidence breakdown | | ⬜ Not Started | 0% | 🔴 Critical | B-33 | | |
| F-22 | Build evidence viewer | | ⬜ Not Started | 0% | 🟠 High | B-41 | | |
| F-23 | Build conflicting-source warnings | | ⬜ Not Started | 0% | 🟠 High | B-30 | | |
| F-24 | Build anomaly indicators | | ⬜ Not Started | 0% | 🟡 Medium | B-35 | | |

---

# 🤖 AI Situation Briefing UI

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| F-25 | Build AI executive briefing panel | | ⬜ Not Started | 0% | 🔴 Critical | B-40 | | |
| F-26 | Build prioritized action items | | ⬜ Not Started | 0% | 🔴 Critical | B-40 | | |
| F-27 | Build key developments section | | ⬜ Not Started | 0% | 🟠 High | B-40 | | |
| F-28 | Build uncertainty section | | ⬜ Not Started | 0% | 🟠 High | B-40 | | |
| F-29 | Build evidence-linked briefing UI | | ⬜ Not Started | 0% | 🟠 High | B-41 | | |

---

# ⚡ Frontend Real-Time

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| F-30 | Integrate WebSocket connection | | ⬜ Not Started | 0% | 🔴 Critical | B-46 | | |
| F-31 | Implement live map updates | | ⬜ Not Started | 0% | 🔴 Critical | F-30 | | |
| F-32 | Implement live alert updates | | ⬜ Not Started | 0% | 🔴 Critical | F-30 | | |
| F-33 | Implement live situation updates | | ⬜ Not Started | 0% | 🔴 Critical | F-30 | | |

---

# ✨ Frontend UX & Polish

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| F-34 | Implement loading/skeleton states | | ⬜ Not Started | 0% | 🟡 Medium | — | | |
| F-35 | Implement API/network error states | | ⬜ Not Started | 0% | 🟠 High | — | | |
| F-36 | Implement empty states | | ⬜ Not Started | 0% | 🟡 Medium | — | | |
| F-37 | Implement toast/notification system | | ⬜ Not Started | 0% | 🟡 Medium | — | | |
| F-38 | Accessibility pass | | ⬜ Not Started | 0% | 🟡 Medium | — | | |
| F-39 | Final visual polish | | ⬜ Not Started | 0% | 🔴 Critical | — | | |

---

# 🔗 Frontend + Backend Integration

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| I-01 | Connect frontend to Situation APIs | | ⬜ Not Started | 0% | 🔴 Critical | B-42, F-14 | | |
| I-02 | Connect frontend to Map APIs | | ⬜ Not Started | 0% | 🔴 Critical | B-44, F-06 | | |
| I-03 | Connect frontend to Intelligence APIs | | ⬜ Not Started | 0% | 🔴 Critical | B-45, F-20 | | |
| I-04 | Connect AI briefing UI to backend | | ⬜ Not Started | 0% | 🔴 Critical | B-40, F-25 | | |
| I-05 | Connect WebSocket live events | | ⬜ Not Started | 0% | 🔴 Critical | B-47–B-49, F-30 | | |
| I-06 | Test complete ingestion → fusion → dashboard flow | | ⬜ Not Started | 0% | 🔴 Critical | B-36, F-33 | | |
| I-07 | Test scenario → AI → briefing flow | | ⬜ Not Started | 0% | 🔴 Critical | B-40, F-25 | | |

---

# 🎬 Demo & Hackathon Preparation

| ID | Task | Owner | Status | Progress | Priority | Dependencies | GitHub / PR | Notes |
|---|---|---|---|---:|---|---|---|---|
| D-01 | Prepare primary live demo scenario | | ⬜ Not Started | 0% | 🔴 Critical | I-06, I-07 | | |
| D-02 | Prepare backup demo scenario | | ⬜ Not Started | 0% | 🟠 High | I-06 | | |
| D-03 | Add simulation start/stop/reset controls | | ⬜ Not Started | 0% | 🟠 High | B-50 | | |
| D-04 | Add replay controls | | ⬜ Not Started | 0% | 🟡 Medium | B-55 | | |
| D-05 | Finalize README | | ⬜ Not Started | 0% | 🟠 High | — | | |
| D-06 | Create final architecture diagram | | ⬜ Not Started | 0% | 🟠 High | P-01 | | |
| D-07 | Document API endpoints | | ⬜ Not Started | 0% | 🟡 Medium | B-42–B-45 | | |
| D-08 | Prepare judge walkthrough / pitch | | ⬜ Not Started | 0% | 🔴 Critical | D-01 | | |
| D-09 | Full system QA | | ⬜ Not Started | 0% | 🔴 Critical | I-06, I-07 | | |
| D-10 | Deploy frontend | | ⬜ Not Started | 0% | 🔴 Critical | D-09 | | |
| D-11 | Deploy backend + database + Redis | | ⬜ Not Started | 0% | 🔴 Critical | D-09 | | |
| D-12 | Perform final production smoke test | | ⬜ Not Started | 0% | 🔴 Critical | D-10, D-11 | | |

---

# 🏆 Official Problem Statement Coverage

Use this section before submission to verify that **every official requirement is implemented**.

| Official Requirement | Implementation | Owner | Status |
|---|---|---|---|
| Multi-stream data aggregation | Weather + Radar + Personnel + Logs + Incidents | | ⬜ |
| Interactive geospatial tactical map | MapLibre / Leaflet | | ⬜ |
| Assets map layer | Operational assets | | ⬜ |
| Alerts map layer | Alert visualization | | ⬜ |
| Weather map layer | Weather visualization | | ⬜ |
| Zones map layer | Operational zones | | ⬜ |
| AI situation synthesis | Gemini-powered synthesis | | ⬜ |
| Concise executive summary | AI briefing | | ⬜ |
| Confidence level indicator | Multi-source confidence engine | | ⬜ |
| Prioritized action items | Alert/action priority engine + AI | | ⬜ |
| Unified command center | Complete dashboard | | ⬜ |
| Data fusion | Spatial + temporal + source correlation | | ⬜ |
| Alert prioritization | Severity + confidence + recency + impact | | ⬜ |
| Scalability | Event-driven backend + Redis + queues | | ⬜ |
| UI craftsmanship | Final polished command interface | | ⬜ |

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
- Data ingestion
- Database
- Data fusion
- Confidence engine
- Priority engine
- APIs
- WebSockets
- AI integration

**Frontend Team**
- Command center
- Tactical map
- Dashboard
- Alerts
- Confidence visualization
- AI briefing
- Real-time UI
- UX polish

**Integration / DevOps**
- Docker
- Environment setup
- Deployment
- API integration
- WebSocket integration
- Testing
- Demo infrastructure

**AI / Intelligence**
- Situation synthesis
- Prompt engineering
- Structured outputs
- Evidence linking
- Confidence reasoning
- Action prioritization

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

- [ ] All data sources ingest successfully
- [ ] Events normalized
- [ ] Spatial correlation working
- [ ] Temporal correlation working
- [ ] Source agreement working
- [ ] Conflicts detected
- [ ] Confidence calculated
- [ ] Alert priority calculated
- [ ] Situation state generated
- [ ] Gemini briefing working
- [ ] Evidence linking working
- [ ] REST APIs working
- [ ] WebSockets working
- [ ] Synthetic scenarios working
- [ ] Database migrations complete
- [ ] Backend tests passing

## Frontend

- [ ] Command center loads
- [ ] Tactical map works
- [ ] Assets layer works
- [ ] Alerts layer works
- [ ] Weather layer works
- [ ] Zones layer works
- [ ] Layer toggles work
- [ ] Situation overview works
- [ ] Alerts panel works
- [ ] Source health works
- [ ] Confidence indicator works
- [ ] Confidence breakdown works
- [ ] Evidence viewer works
- [ ] AI briefing works
- [ ] Prioritized actions work
- [ ] Real-time updates work
- [ ] Loading/error/empty states work
- [ ] Final UI polish complete

## Integration

- [ ] Frontend ↔ Backend connected
- [ ] Backend ↔ Database connected
- [ ] Backend ↔ Redis connected
- [ ] Backend ↔ Gemini connected
- [ ] WebSocket live updates verified
- [ ] End-to-end scenario verified
- [ ] Production deployment verified

## Demo

- [ ] Primary scenario tested
- [ ] Backup scenario tested
- [ ] Simulation controls tested
- [ ] Judge walkthrough prepared
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

> **Fuse the data. Understand the situation. Prioritize what matters.**

**Built by Destroyer of Worlds — HACKHERTZ 2026**
