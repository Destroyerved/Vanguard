# VANGUARD — Visual Evidence & Computer Vision Engine

## Purpose

VANGUARD must analyze visual evidence **before** the AI generates a situation assessment.

The system should not send raw video directly to Gemini and rely on the LLM to interpret everything.

Instead:

```text
VIDEO / IMAGE
      ↓
MEDIA INGESTION
      ↓
FRAME EXTRACTION
      ↓
COMPUTER VISION
      ↓
OBJECTS + EVENTS + TRACKS
      ↓
VISUAL FORENSICS
      ↓
VISUAL EVIDENCE
      ↓
MULTI-SOURCE DATA FUSION
      ↓
EVIDENCE VALIDATION
      ↓
GEMINI REASONING
      ↓
FINAL SITUATION ASSESSMENT
```

The goal is to create a **machine-verifiable visual evidence layer** between raw media and AI decision-making.

---

# 1. Feature Goals

- Detect objects in incoming video.
- Track objects across frames.
- Detect important visual events.
- Detect smoke, fire, crowds, vehicles, people, infrastructure damage, etc.
- Support custom/open-vocabulary visual queries.
- Analyze temporal consistency.
- Detect possible media manipulation.
- Distinguish editing/enhancement from suspicious manipulation.
- Correlate visual evidence with radar, incident reports, weather, personnel and map data.
- Produce a confidence score.
- Give Gemini structured evidence instead of unprocessed video.
- Validate Gemini's claims against available evidence.
- Surface contradictions to the operator.
- Never automatically discard media only because AI/manipulation indicators exist.

---

# 2. Recommended Computer Vision Stack

## Primary Detection

### YOLO26

Use YOLO26 as the primary object detection model.

Initial recommendation:

```text
Development:
YOLO26n / YOLO26s

GPU production:
YOLO26s / YOLO26m
```

Use YOLO for:

- Person detection
- Vehicle detection
- Truck detection
- Boat detection
- Aircraft detection
- Common objects
- Infrastructure objects
- Other classes supported by the selected model

---

## Tracking

Use one of:

```text
ByteTrack
BoT-SORT
```

Recommended starting point:

```text
YOLO26 + ByteTrack
```

Tracking provides persistent object IDs.

Example:

```text
VEHICLE-001
VEHICLE-002
PERSON-001
PERSON-002
```

---

## Open-Vocabulary Detection

Use:

```text
Grounding DINO
```

This allows VANGUARD to search for concepts that may not exist in the base YOLO class list.

Example prompts:

```text
smoke
fire
damaged building
debris
crowd
checkpoint
boat
construction vehicle
collapsed structure
flooded road
```

Grounding DINO should be used selectively on suspicious/key frames instead of every frame.

---

## Semantic Verification

Optional:

```text
CLIP
```

Use CLIP for scene/semantic verification.

Example:

```text
"normal road"
"vehicle accident"
"fire"
"crowd"
"flooded area"
"damaged infrastructure"
```

CLIP should be treated as supporting evidence, not ground truth.

---

## Visual Forensics

Use a dedicated forensic pipeline/model where available.

Possible signals:

```text
Compression anomalies
Frame inconsistencies
Lighting inconsistencies
Texture inconsistencies
Edge artifacts
Temporal discontinuities
Metadata anomalies
Synthetic-media indicators
```

IMPORTANT:

```text
Manipulation signal ≠ fake
```

A legitimate video can be:

```text
AI upscaled
AI denoised
stabilized
cropped
re-encoded
color corrected
compressed
```

Therefore, VANGUARD must not automatically remove such videos.

---

# 3. High-Level Architecture

```text
                         VIDEO FEED
                             |
                             v
                  +----------------------+
                  |   MEDIA INGESTION    |
                  +----------+-----------+
                             |
                             v
                  +----------------------+
                  |   FRAME EXTRACTION   |
                  +----------+-----------+
                             |
              +--------------+--------------+
              |              |              |
              v              v              v
          +--------+   +------------+   +-----------+
          | YOLO26 |   | Grounding  |   | Forensics |
          |        |   | DINO       |   |           |
          +---+----+   +-----+------+   +-----+-----+
              |              |                |
              v              v                v
          Objects       Custom Objects     Integrity
              |              |              Signals
              +--------------+----------------+
                             |
                             v
                  +----------------------+
                  | OBJECT TRACKING      |
                  | ByteTrack/BoT-SORT   |
                  +----------+-----------+
                             |
                             v
                  +----------------------+
                  | TEMPORAL ANALYSIS    |
                  +----------+-----------+
                             |
                             v
                  +----------------------+
                  | VISUAL EVIDENCE      |
                  | ENGINE               |
                  +----------+-----------+
                             |
                             v
                  +----------------------+
                  | DATA FUSION ENGINE   |
                  +----------+-----------+
                             |
          +------------------+-------------------+
          |                  |                   |
          v                  v                   v
       RADAR             INCIDENTS           WEATHER
          |                  |                   |
          +------------------+-------------------+
                             |
                             v
                  +----------------------+
                  | CORROBORATION        |
                  +----------+-----------+
                             |
                             v
                  +----------------------+
                  | GEMINI REASONING     |
                  +----------+-----------+
                             |
                             v
                  +----------------------+
                  | CLAIM VALIDATOR       |
                  +----------+-----------+
                             |
                             v
                  +----------------------+
                  | COMMANDER BRIEFING   |
                  +----------------------+
```

---

# 4. Backend Directory Structure

Recommended structure:

```text
backend/
├── src/
│   ├── modules/
│   │   ├── media/
│   │   │   ├── media.controller.ts
│   │   │   ├── media.service.ts
│   │   │   ├── media.repository.ts
│   │   │   └── media.types.ts
│   │   │
│   │   ├── vision/
│   │   │   ├── vision.controller.ts
│   │   │   ├── vision.service.ts
│   │   │   ├── vision.types.ts
│   │   │   │
│   │   │   ├── detection/
│   │   │   │   ├── yolo.service.ts
│   │   │   │   └── yolo.types.ts
│   │   │   │
│   │   │   ├── tracking/
│   │   │   │   ├── tracker.service.ts
│   │   │   │   └── tracker.types.ts
│   │   │   │
│   │   │   ├── open-vocabulary/
│   │   │   │   ├── grounding-dino.service.ts
│   │   │   │   └── grounding-dino.types.ts
│   │   │   │
│   │   │   ├── semantic/
│   │   │   │   ├── clip.service.ts
│   │   │   │   └── clip.types.ts
│   │   │   │
│   │   │   ├── forensics/
│   │   │   │   ├── forensic.service.ts
│   │   │   │   └── forensic.types.ts
│   │   │   │
│   │   │   ├── preprocessing/
│   │   │   │   ├── frame.service.ts
│   │   │   │   └── frame.types.ts
│   │   │   │
│   │   │   └── evidence/
│   │   │       ├── evidence.service.ts
│   │   │       └── evidence.types.ts
│   │   │
│   │   ├── fusion/
│   │   │   ├── fusion.service.ts
│   │   │   ├── corroboration.service.ts
│   │   │   └── conflict.service.ts
│   │   │
│   │   ├── validation/
│   │   │   ├── evidence-validator.service.ts
│   │   │   ├── claim-validator.service.ts
│   │   │   └── validation.types.ts
│   │   │
│   │   └── ai/
│   │       ├── gemini.service.ts
│   │       ├── briefing.service.ts
│   │       └── prompts/
│   │
│   ├── workers/
│   │   ├── vision.worker.ts
│   │   ├── forensic.worker.ts
│   │   ├── fusion.worker.ts
│   │   └── validation.worker.ts
│   │
│   └── config/
│       ├── vision.config.ts
│       ├── models.config.ts
│       └── queue.config.ts
│
├── models/
│   ├── yolo/
│   ├── grounding-dino/
│   ├── clip/
│   └── forensic/
│
└── tests/
    ├── vision/
    ├── fusion/
    └── validation/
```

---

# 5. Media Ingestion

## Tasks

- [ ] Create media upload endpoint.
- [ ] Support video files.
- [ ] Support image files.
- [ ] Validate MIME type.
- [ ] Validate file extension.
- [ ] Limit file size.
- [ ] Generate unique media ID.
- [ ] Store original media.
- [ ] Extract metadata.
- [ ] Record upload timestamp.
- [ ] Record source.
- [ ] Record camera/source ID if available.
- [ ] Record geolocation if trusted metadata exists.
- [ ] Generate processing job.
- [ ] Return processing status.

Example:

```json
{
  "mediaId": "MED-92831",
  "sourceId": "CAM-17",
  "type": "video",
  "status": "QUEUED"
}
```

---

# 6. Frame Extraction

Do not run expensive models on every video frame.

For example:

```text
30 FPS video
       ↓
2–5 FPS initial analysis
       ↓
Detect suspicious segment
       ↓
Increase sampling
       ↓
Detailed analysis
```

## Tasks

- [ ] Implement video decoder.
- [ ] Extract frames.
- [ ] Store frame timestamps.
- [ ] Generate frame IDs.
- [ ] Implement configurable sampling FPS.
- [ ] Implement keyframe extraction.
- [ ] Implement scene-change detection.
- [ ] Cache extracted frames.
- [ ] Support reprocessing.
- [ ] Delete temporary files after processing.

Frame object:

```json
{
  "frameId": "FRAME-182",
  "mediaId": "MED-92831",
  "timestamp": 18.42,
  "path": "/frames/frame-182.jpg"
}
```

---

# 7. YOLO Detection Service

Create:

```text
YoloService
```

Responsibilities:

- Load model.
- Warm model.
- Run inference.
- Apply confidence threshold.
- Apply NMS/IoU settings.
- Normalize model output.
- Return bounding boxes.
- Record inference latency.
- Record model version.

Example:

```json
{
  "frameId": "FRAME-182",
  "detections": [
    {
      "class": "person",
      "confidence": 0.94,
      "bbox": {
        "x1": 120,
        "y1": 80,
        "x2": 310,
        "y2": 520
      }
    }
  ]
}
```

## Tasks

- [ ] Install YOLO runtime.
- [ ] Download/configure model.
- [ ] Create model wrapper.
- [ ] Create inference service.
- [ ] Create configuration.
- [ ] Add thresholds.
- [ ] Normalize output.
- [ ] Add model version.
- [ ] Add latency logging.
- [ ] Add error handling.
- [ ] Add tests.

---

# 8. Object Tracking

Use:

```text
ByteTrack
```

or:

```text
BoT-SORT
```

Pipeline:

```text
Frame
 ↓
YOLO
 ↓
Detections
 ↓
Tracker
 ↓
Persistent Track IDs
```

Example:

```json
{
  "trackId": "VEHICLE-003",
  "class": "vehicle",
  "firstSeen": 2.1,
  "lastSeen": 28.4,
  "framesSeen": 81,
  "confidence": 0.92,
  "trackingConsistency": 0.91
}
```

## Tasks

- [ ] Integrate tracker.
- [ ] Assign persistent IDs.
- [ ] Track object positions.
- [ ] Track first appearance.
- [ ] Track last appearance.
- [ ] Track frame count.
- [ ] Generate trajectory.
- [ ] Calculate tracking consistency.
- [ ] Detect entry.
- [ ] Detect exit.
- [ ] Detect disappearance.
- [ ] Detect tracking breaks.

---

# 9. Object Analytics

For every track calculate:

```text
Object Type
Confidence
Track Duration
First Seen
Last Seen
Frame Count
Trajectory
Detection Stability
Tracking Consistency
```

Example:

```json
{
  "trackId": "PERSON-002",
  "type": "person",
  "confidence": 0.91,
  "duration": 18.2,
  "detectionStability": 0.94
}
```

Tasks:

- [ ] Calculate persistence.
- [ ] Calculate average confidence.
- [ ] Calculate minimum confidence.
- [ ] Calculate maximum confidence.
- [ ] Calculate track stability.
- [ ] Store trajectory.
- [ ] Generate movement events.

---

# 10. Grounding DINO

Grounding DINO should be optional and triggered when:

```text
Important event detected
OR
Operator asks a custom question
OR
YOLO output is insufficient
```

Example:

```text
"Is there smoke?"
"Is there debris?"
"Is there a damaged building?"
```

## Tasks

- [ ] Integrate Grounding DINO.
- [ ] Create service wrapper.
- [ ] Create prompt registry.
- [ ] Support dynamic text prompts.
- [ ] Run on selected frames.
- [ ] Normalize bounding boxes.
- [ ] Store confidence.
- [ ] Store prompt used.
- [ ] Store model version.
- [ ] Add timeout.
- [ ] Add fallback.

---

# 11. CLIP Semantic Verification

Use CLIP as supporting evidence.

Example:

```json
{
  "frameId": "FRAME-182",
  "semanticScores": [
    {
      "label": "vehicle accident",
      "score": 0.87
    },
    {
      "label": "normal road",
      "score": 0.21
    }
  ]
}
```

## Tasks

- [ ] Create CLIP service.
- [ ] Create label registry.
- [ ] Support configurable labels.
- [ ] Run semantic analysis.
- [ ] Normalize scores.
- [ ] Store results.
- [ ] Add model version.
- [ ] Add tests.

---

# 12. Temporal Analysis

Video must be analyzed over time.

Detect:

- [ ] Object persistence.
- [ ] Sudden object appearance.
- [ ] Sudden disappearance.
- [ ] Motion discontinuity.
- [ ] Scene inconsistency.
- [ ] Lighting inconsistency.
- [ ] Tracking instability.
- [ ] Unexpected frame transitions.
- [ ] Suspicious temporal gaps.

Example:

```text
00:00
Vehicle detected

00:05
Vehicle detected

00:10
Vehicle detected

00:15
Vehicle disappears

00:16
Vehicle appears in a significantly different location
```

Generate:

```json
{
  "type": "TEMPORAL_ANOMALY",
  "timestamp": 15.4,
  "risk": 0.72
}
```

---

# 13. Visual Forensics

Create:

```text
ForensicService
```

The service should generate multiple signals rather than a binary:

```text
FAKE = TRUE/FALSE
```

Use signals such as:

```text
Compression anomaly
Frame anomaly
Lighting anomaly
Texture anomaly
Edge anomaly
Metadata anomaly
Temporal anomaly
Synthetic-media signal
```

Example:

```json
{
  "mediaId": "MED-92831",
  "visualAnomalyScore": 0.24,
  "temporalAnomalyScore": 0.18,
  "compressionAnomalyScore": 0.33,
  "syntheticMediaSignal": 0.41,
  "manipulationRisk": 0.31
}
```

---

# 14. Manipulation Classification

Use:

```text
AUTHENTIC
EDITED
ENHANCED
SUSPICIOUS_MANIPULATION
POTENTIAL_SYNTHETIC
UNKNOWN
```

## AUTHENTIC

No meaningful manipulation signals.

## EDITED

Video may have been cropped, cut, re-encoded or otherwise edited.

## ENHANCED

Video has been visually enhanced without sufficient evidence that the underlying event was changed.

Examples:

```text
AI upscaling
denoising
stabilization
sharpening
color correction
```

## SUSPICIOUS_MANIPULATION

There are meaningful indications that visual content may have been altered.

## POTENTIAL_SYNTHETIC

There are strong indicators of synthetic/generated media.

## UNKNOWN

There is insufficient evidence.

---

# 15. Critical Rule: Do Not Automatically Delete Media

The system must never do:

```text
Manipulation detected
        ↓
DELETE VIDEO
```

Instead:

```text
Manipulation detected
        ↓
FLAG MEDIA
        ↓
REDUCE MEDIA AUTHENTICITY
        ↓
CHECK OTHER SOURCES
        ↓
CORROBORATE EVENT
        ↓
GENERATE FINAL CONFIDENCE
```

Example:

```text
Video authenticity:
68%

Radar:
Corroborates event

Incident reports:
2 reports corroborate event

Final intelligence confidence:
88%
```

This is one of the most important design principles of VANGUARD.

---

# 16. Visual Evidence Aggregation

Create:

```text
VisualEvidenceService
```

It combines:

```text
YOLO
Tracking
Grounding DINO
CLIP
Temporal Analysis
Forensics
```

Example output:

```json
{
  "mediaId": "MED-92831",

  "scene": {
    "duration": 43.2,
    "framesAnalyzed": 24
  },

  "objects": {
    "persons": 7,
    "vehicles": 3
  },

  "events": [
    {
      "type": "SMOKE_DETECTED",
      "timestamp": 26.1,
      "confidence": 0.83
    }
  ],

  "tracking": {
    "activeTracks": 8,
    "trackingConsistency": 0.91
  },

  "semantic": {
    "topScene": "vehicle accident",
    "score": 0.87
  },

  "forensics": {
    "visualAnomalyScore": 0.24,
    "manipulationRisk": 0.31
  }
}
```

---

# 17. Visual Confidence

Calculate separate confidence values.

```text
Object Confidence
Tracking Confidence
Temporal Confidence
Semantic Confidence
Media Integrity
```

Example:

```json
{
  "objectConfidence": 0.94,
  "trackingConfidence": 0.91,
  "temporalConfidence": 0.87,
  "semanticConfidence": 0.82,
  "mediaIntegrity": 0.68
}
```

Do not collapse these into one score too early.

---

# 18. Authenticity Score

Create a configurable authenticity score.

Possible components:

```text
Technical Integrity
Frame Forensics
Temporal Consistency
Detector Consistency
Provenance
Metadata
```

Example starting weights:

```text
20% Technical Integrity
20% Frame Forensics
20% Temporal Consistency
20% Detector Consistency
10% Provenance
10% Metadata
```

Make all weights configurable.

The score should communicate uncertainty rather than claim absolute authenticity.

---

# 19. Data Fusion

Visual evidence becomes another source in VANGUARD.

Current sources:

```text
Radar
Weather
Personnel
Incident Reports
Maps
Logs
```

Add:

```text
Visual Evidence
```

Architecture:

```text
                 DATA FUSION
                      |
       +--------------+--------------+
       |              |              |
     RADAR          VIDEO        INCIDENTS
       |              |              |
       +--------------+--------------+
                      |
                      v
                 CORRELATION
```

---

# 20. Spatial Correlation

Correlate:

```text
Camera Location
Visual Event Location
Incident Location
Radar Location
Operational Zone
Map Entity
```

Example:

```text
Camera:
CAM-17

Zone:
ZONE-A

Incident:
ZONE-A

Radar:
ZONE-A
```

Increase corroboration when sources agree spatially.

Tasks:

- [ ] Convert camera coordinates.
- [ ] Attach video events to locations.
- [ ] Match nearby incidents.
- [ ] Match nearby radar events.
- [ ] Calculate distance.
- [ ] Configure spatial thresholds.
- [ ] Generate spatial correlation score.

---

# 21. Temporal Correlation

Compare:

```text
Video timestamp
Radar timestamp
Incident timestamp
Personnel report timestamp
```

Example:

```text
Video event:
14:32:11

Radar:
14:32:08

Incident:
14:32:14
```

These events are temporally compatible.

Tasks:

- [ ] Normalize timestamps.
- [ ] Convert timezones.
- [ ] Calculate time difference.
- [ ] Configure correlation window.
- [ ] Generate temporal agreement score.

---

# 22. Cross-Source Corroboration

Create:

```text
CorroborationService
```

Calculate:

```text
Source Agreement
Spatial Agreement
Temporal Agreement
Entity Agreement
```

Example:

```json
{
  "sourceAgreement": 0.96,
  "spatialAgreement": 0.94,
  "temporalAgreement": 0.91,
  "entityAgreement": 0.89
}
```

---

# 23. Evidence Graph

Represent evidence relationships.

```text
                    EVENT
                      |
        +-------------+-------------+
        |             |             |
      VIDEO          RADAR       INCIDENT
        |             |             |
        v             v             v
    Vehicle-1      Activity-A    Report-42
        |
        v
      Zone-A
```

Evidence graph should allow the UI to answer:

```text
Why does VANGUARD believe this event happened?
```

Example:

```text
EVENT-42
├── Video CAM-17
│   ├── 3 vehicles
│   ├── smoke detected
│   └── confidence 0.83
│
├── Radar
│   └── activity detected
│
└── Incident Report
    └── event reported in Zone A
```

---

# 24. Gemini Integration

Gemini should NOT be the first component to interpret the raw video.

Instead provide:

```text
Structured Visual Evidence
+
Structured Radar Data
+
Structured Incident Data
+
Structured Weather Data
+
Structured Personnel Data
+
Evidence Graph
```

Example input:

```json
{
  "visualEvidence": {
    "persons": 7,
    "vehicles": 3,
    "smokeDetected": true,
    "trackingConsistency": 0.91,
    "temporalConsistency": 0.87,
    "manipulationRisk": 0.31
  },

  "corroboration": {
    "radar": true,
    "incidentReports": 2,
    "sourceAgreement": 0.96
  },

  "media": {
    "authenticityScore": 0.68,
    "classification": "ENHANCED"
  }
}
```

---

# 25. Gemini Output Schema

Force structured output.

```json
{
  "situation": "Activity detected in Zone A.",

  "keyFindings": [
    "Three vehicles detected.",
    "Seven persons detected.",
    "Smoke-like visual event detected."
  ],

  "confidence": "HIGH",

  "confidenceScore": 0.88,

  "mediaAssessment": {
    "authenticityScore": 0.68,
    "classification": "ENHANCED",
    "caveat": "Visual media contains manipulation indicators."
  },

  "claims": [
    {
      "id": "C1",
      "text": "Three vehicles are visible.",
      "confidence": 0.94
    },
    {
      "id": "C2",
      "text": "Smoke is present.",
      "confidence": 0.83
    }
  ],

  "recommendedActions": [
    "Review the flagged video segment.",
    "Use corroborating radar and incident reports."
  ]
}
```

---

# 26. Evidence Validator

Create:

```text
EvidenceValidatorService
```

Pipeline:

```text
Gemini Claim
      ↓
Evidence Validator
      ↓
+-----+------+------+
|            |      |
YOLO        RADAR INCIDENT
|            |      |
+------------+------+
             ↓
       VALIDATION RESULT
```

Possible statuses:

```text
SUPPORTED
PARTIALLY_SUPPORTED
CONTRADICTED
UNCERTAIN
UNVERIFIABLE
```

---

# 27. Claim Validation

Example:

Gemini:

```text
Three vehicles are visible.
```

YOLO:

```text
3 vehicles
confidence = 94%
```

Result:

```text
SUPPORTED
```

---

# 28. Contradiction Detection

Example:

Gemini:

```text
No vehicles were detected.
```

YOLO:

```text
3 vehicles detected.
confidence = 94%
```

System:

```text
⚠ CONTRADICTION

AI claim:
No vehicles detected.

Visual evidence:
3 vehicles detected.

Confidence:
94%

Action:
Flag assessment for review.
```

Tasks:

- [ ] Extract claims.
- [ ] Map claims to evidence.
- [ ] Validate claims.
- [ ] Detect contradictions.
- [ ] Calculate claim confidence.
- [ ] Add contradiction events.
- [ ] Display contradiction.
- [ ] Recalculate final confidence.
- [ ] Preserve original AI response.

---

# 29. Final Intelligence Confidence

Final confidence should not equal media authenticity.

Example:

```text
Media Authenticity = 68%

Radar Corroboration = YES
Incident Reports = 2
Temporal Agreement = 91%
Spatial Agreement = 94%

Final Intelligence Confidence = 88%
```

Concept:

```text
MEDIA CONFIDENCE
        +
VISUAL EVIDENCE
        +
INDEPENDENT SOURCES
        +
TEMPORAL AGREEMENT
        +
SPATIAL AGREEMENT
        =
FINAL INTELLIGENCE CONFIDENCE
```

The final score must be explainable.

---

# 30. Processing Queue

Computer vision workloads can be expensive.

Use background workers.

```text
API
 |
 v
QUEUE
 |
 +-- Frame Worker
 |
 +-- YOLO Worker
 |
 +-- Tracking Worker
 |
 +-- Forensics Worker
 |
 +-- Grounding DINO Worker
 |
 +-- CLIP Worker
 |
 +-- Evidence Worker
 |
 +-- Fusion Worker
 |
 +-- Validation Worker
```

Recommended infrastructure:

```text
Redis
+
BullMQ / equivalent queue
```

Tasks:

- [ ] Configure Redis.
- [ ] Configure queue.
- [ ] Create workers.
- [ ] Add retries.
- [ ] Add timeout.
- [ ] Add job status.
- [ ] Add job progress.
- [ ] Add failed-job handling.
- [ ] Add concurrency limits.
- [ ] Add dead-letter handling.

---

# 31. Processing State Machine

Use:

```text
UPLOADED
   ↓
QUEUED
   ↓
EXTRACTING_FRAMES
   ↓
RUNNING_DETECTION
   ↓
RUNNING_TRACKING
   ↓
RUNNING_FORENSICS
   ↓
BUILDING_EVIDENCE
   ↓
RUNNING_FUSION
   ↓
RUNNING_AI
   ↓
VALIDATING
   ↓
COMPLETED
```

Error state:

```text
FAILED
```

Partial state:

```text
PARTIAL
```

Never fail the entire pipeline because one model fails.

---

# 32. Partial Failure Handling

Example:

```json
{
  "yolo": {
    "status": "SUCCESS"
  },

  "tracking": {
    "status": "SUCCESS"
  },

  "forensics": {
    "status": "FAILED"
  },

  "groundingDino": {
    "status": "SUCCESS"
  }
}
```

Final system response:

```text
Visual analysis completed with partial evidence.

Forensic analysis unavailable.
Final confidence reduced accordingly.
```

Never convert:

```text
Model failed
```

into:

```text
No evidence exists
```

---

# 33. Frontend Visual Intelligence Panel

Create a dedicated panel.

```text
┌──────────────────────────────────────┐
│ VISUAL INTELLIGENCE                  │
├──────────────────────────────────────┤
│                                      │
│ Persons                    7         │
│ Vehicles                   3         │
│ Smoke                      YES       │
│                                      │
│ Tracking Consistency       91%      │
│ Temporal Consistency       87%      │
│                                      │
│ Media Authenticity         68%      │
│ Manipulation Risk          32%      │
│                                      │
│ ⚠ Manipulation indicators detected │
│ ✓ Radar corroboration              │
│ ✓ 2 incident reports               │
│                                      │
│ [VIEW EVIDENCE]                      │
└──────────────────────────────────────┘
```

Tasks:

- [ ] Create Visual Intelligence component.
- [ ] Display object counts.
- [ ] Display events.
- [ ] Display confidence.
- [ ] Display manipulation risk.
- [ ] Display authenticity classification.
- [ ] Display corroborating sources.
- [ ] Display processing status.
- [ ] Add loading state.
- [ ] Add error state.

---

# 34. Video Timeline

Add visual evidence markers.

```text
00:00 ───── 00:10 ───── 00:20 ───── 00:30 ───── 00:40
                    ▲              ▲
                    |              |
                 Vehicle         Smoke
                 detected        detected
```

Add anomaly markers:

```text
⚠ Temporal anomaly
⚠ Manipulation signal
⚠ Detection conflict
```

Tasks:

- [ ] Create timeline.
- [ ] Add event markers.
- [ ] Add anomaly markers.
- [ ] Make markers clickable.
- [ ] Jump video to timestamp.
- [ ] Show evidence at timestamp.
- [ ] Show model confidence.

---

# 35. Bounding Box Visualization

When the operator opens a video:

```text
+--------------------------------------+
|                                      |
|       ┌─────────────┐                |
|       │  VEHICLE    │                |
|       └─────────────┘                |
|                                      |
|  ┌────────┐                           |
|  │ PERSON │                           |
|  └────────┘                           |
|                                      |
+--------------------------------------+
```

Tasks:

- [ ] Render YOLO bounding boxes.
- [ ] Render track IDs.
- [ ] Render confidence.
- [ ] Render event labels.
- [ ] Toggle detections.
- [ ] Toggle tracks.
- [ ] Filter object types.

---

# 36. Tactical Map Integration

Visual events must appear on the operational map.

Example:

```text
CAM-17
  |
  v
📍 ZONE-A

Detected:
3 vehicles
7 persons
Smoke

Confidence:
88%

Sources:
VIDEO
RADAR
INCIDENT
```

Tasks:

- [ ] Add camera locations.
- [ ] Add visual event markers.
- [ ] Add confidence.
- [ ] Add timestamp.
- [ ] Add source.
- [ ] Add object counts.
- [ ] Connect event to incident.
- [ ] Show evidence popup.
- [ ] Support map filtering.

---

# 37. Alert Prioritization

Visual evidence should affect alert priority.

Example:

```text
HIGH

Visual event detected
+
Radar corroboration
+
Incident report
+
High confidence
```

Medium:

```text
Visual event
+
Weak corroboration
```

Low:

```text
Low-confidence visual anomaly
+
No corroboration
```

Tasks:

- [ ] Define priority algorithm.
- [ ] Add visual confidence.
- [ ] Add corroboration score.
- [ ] Add source reliability.
- [ ] Add spatial relevance.
- [ ] Add temporal relevance.
- [ ] Generate priority score.

---

# 38. API Endpoints

## Start Analysis

```http
POST /api/vision/analyze/:mediaId
```

## Get Evidence

```http
GET /api/vision/:mediaId/evidence
```

## Get Detections

```http
GET /api/vision/:mediaId/detections
```

## Get Tracks

```http
GET /api/vision/:mediaId/tracks
```

## Get Events

```http
GET /api/vision/:mediaId/events
```

## Get Forensics

```http
GET /api/vision/:mediaId/forensics
```

## Get Authenticity

```http
GET /api/vision/:mediaId/authenticity
```

## Get Contradictions

```http
GET /api/vision/:mediaId/contradictions
```

## Reprocess

```http
POST /api/vision/:mediaId/reprocess
```

## Custom Visual Query

```http
POST /api/vision/:mediaId/query
```

Example:

```json
{
  "query": "smoke"
}
```

---

# 39. WebSocket Events

Create real-time events:

```text
vision.processing
vision.frames.ready
vision.detection.updated
vision.tracking.updated
vision.event.detected
vision.forensics.updated
vision.evidence.ready
vision.authenticity.updated
vision.correlation.updated
vision.contradiction.detected
vision.completed
```

Example:

```json
{
  "event": "vision.event.detected",
  "mediaId": "MED-92831",
  "type": "SMOKE_DETECTED",
  "timestamp": 26.1,
  "confidence": 0.83
}
```

---

# 40. Database Schema

## Media

```text
id
sourceId
filePath
type
duration
width
height
fps
timestamp
latitude
longitude
status
createdAt
```

## Frame

```text
id
mediaId
timestamp
frameNumber
filePath
createdAt
```

## VisualDetection

```text
id
mediaId
frameId
timestamp
class
confidence
bbox
model
modelVersion
createdAt
```

## ObjectTrack

```text
id
mediaId
trackId
class
firstSeen
lastSeen
confidence
trajectory
frameCount
trackingConsistency
createdAt
```

## VisualEvent

```text
id
mediaId
type
timestamp
confidence
source
evidence
createdAt
```

## VisualForensics

```text
id
mediaId
visualAnomalyScore
temporalAnomalyScore
compressionAnomalyScore
syntheticMediaSignal
manipulationRisk
modelVersion
createdAt
```

## VisualEvidence

```text
id
mediaId
objectCount
eventCount
trackingScore
semanticScore
temporalScore
forensicScore
authenticityScore
classification
createdAt
```

## EvidenceClaim

```text
id
eventId
claim
source
supportStatus
confidence
evidenceIds
createdAt
```

## Corroboration

```text
id
eventId
sourceType
sourceId
spatialAgreement
temporalAgreement
entityAgreement
overallAgreement
createdAt
```

---

# 41. Performance Optimization

Do not:

```text
30 FPS
×
5 models
×
Every video
```

Instead:

```text
VIDEO
 ↓
CHEAP FRAME SAMPLING
 ↓
YOLO
 ↓
SUSPICIOUS FRAME DETECTION
 ↓
EXPENSIVE MODELS
 ↓
EVIDENCE
```

Implement:

- [ ] Frame sampling.
- [ ] Scene-change detection.
- [ ] Suspicious-frame detection.
- [ ] Batch inference.
- [ ] GPU inference.
- [ ] Model warmup.
- [ ] Result caching.
- [ ] Frame caching.
- [ ] Worker concurrency.
- [ ] Queue prioritization.
- [ ] Model timeout.
- [ ] Automatic retry.

---

# 42. Model Routing

Use a tiered architecture.

## Tier 1 — Cheap

```text
Frame extraction
YOLO
Basic tracking
```

## Tier 2 — Targeted

```text
Grounding DINO
CLIP
Temporal analysis
```

## Tier 3 — Expensive

```text
Detailed forensic analysis
Deep synthetic-media analysis
```

Only escalate when required.

Example:

```text
YOLO detects unusual event
        ↓
Run Grounding DINO
        ↓
If evidence remains ambiguous
        ↓
Run forensic analysis
        ↓
Send structured result to Gemini
```

---

# 43. Security Requirements

- [ ] Validate media files.
- [ ] Restrict MIME types.
- [ ] Limit upload size.
- [ ] Sanitize filenames.
- [ ] Generate server-side file names.
- [ ] Isolate media processing.
- [ ] Prevent arbitrary command execution.
- [ ] Authenticate APIs.
- [ ] Authorize sensitive operations.
- [ ] Keep Gemini/API keys server-side.
- [ ] Never expose secrets to frontend.
- [ ] Log access to sensitive evidence.
- [ ] Add audit trail.
- [ ] Validate model inputs.
- [ ] Restrict worker permissions.

---

# 44. Observability

Track:

```text
Frame processing latency
YOLO inference latency
Tracking latency
Forensic latency
Gemini latency
Queue latency
GPU utilization
CPU utilization
Memory usage
Failed jobs
Model errors
Detection counts
```

Dashboard example:

```text
CV Pipeline Health

Frames/sec:             4.8
YOLO latency:           72ms
Tracking latency:       14ms
Forensics latency:      312ms
Queue depth:            3
GPU utilization:        71%
Failed jobs:            0
```

---

# 45. Testing

## Unit Tests

- [ ] Frame extraction.
- [ ] Frame timestamping.
- [ ] YOLO parser.
- [ ] Bounding box normalization.
- [ ] Confidence filtering.
- [ ] Tracking.
- [ ] Track consistency.
- [ ] Temporal analysis.
- [ ] Forensic scoring.
- [ ] Authenticity scoring.
- [ ] Evidence aggregation.
- [ ] Corroboration.
- [ ] Claim validation.
- [ ] Contradiction detection.
- [ ] Priority scoring.

---

# 46. Integration Tests

Test complete pipeline:

```text
Video
 ↓
Frame Extraction
 ↓
YOLO
 ↓
Tracking
 ↓
Forensics
 ↓
Evidence
 ↓
Fusion
 ↓
Gemini
 ↓
Claim Validation
 ↓
Final Brief
```

Expected:

```text
Pipeline completed successfully.
```

---

# 47. False Positive Testing

Use legitimate footage that has been:

```text
AI upscaled
AI denoised
stabilized
cropped
compressed
color corrected
```

Expected:

```text
Manipulation signals:
Possible

Classification:
ENHANCED / EDITED

Media:
PRESERVED
```

If independent sources corroborate the event:

```text
Final intelligence confidence:
Can remain HIGH
```

---

# 48. Contradiction Testing

Input:

```text
Video:
3 vehicles

Gemini:
"No vehicles detected."
```

Expected:

```text
CONTRADICTION DETECTED
```

System must:

- [ ] Flag claim.
- [ ] Show YOLO evidence.
- [ ] Show timestamp.
- [ ] Reduce confidence if appropriate.
- [ ] Trigger re-evaluation.
- [ ] Preserve original AI response.
- [ ] Record validation result.

---

# 49. End-to-End Demo Scenario

Use this as the hackathon demonstration.

```text
1. Operator uploads incident video.

2. VANGUARD assigns:
   MED-92831

3. Video is queued.

4. Frame extraction begins.

5. YOLO detects:
   3 vehicles
   7 persons

6. ByteTrack confirms persistent tracks.

7. Grounding DINO is triggered.

8. Grounding DINO detects:
   smoke

9. Temporal analysis confirms:
   persistent event

10. Forensics reports:
    moderate manipulation indicators

11. Media assessment:
    ENHANCED
    authenticity = 68%

12. Radar reports:
    activity in same zone

13. Incident reports:
    2 reports in same area

14. Corroboration:
    96%

15. Gemini receives structured evidence.

16. Gemini produces situation briefing.

17. Evidence Validator checks Gemini claims.

18. No unsupported high-impact claims remain.

19. Commander receives:
    final situation
    confidence
    evidence
    caveats
    prioritized actions
```

---

# 50. Example Final Output

```text
┌──────────────────────────────────────────────┐
│ VANGUARD SITUATION ASSESSMENT                │
├──────────────────────────────────────────────┤
│                                              │
│ EVENT: ACTIVITY DETECTED — ZONE A            │
│                                              │
│ FINAL CONFIDENCE                 88%         │
│                                              │
│ VISUAL EVIDENCE                              │
│ ├── Persons                     7            │
│ ├── Vehicles                    3            │
│ ├── Smoke                       Detected     │
│ └── Tracking consistency        91%          │
│                                              │
│ MEDIA ASSESSMENT                             │
│ ├── Authenticity                68%          │
│ └── Manipulation Risk           32%          │
│                                              │
│ CORROBORATION                                │
│ ├── Radar                       ✓            │
│ ├── Incident Reports             ✓ 2         │
│ └── Source Agreement             96%         │
│                                              │
│ ⚠ MEDIA CAVEAT                               │
│ Manipulation indicators were detected.       │
│ The video should not be treated as           │
│ standalone evidence.                         │
│                                              │
│ ASSESSMENT                                   │
│ Event is strongly corroborated by            │
│ independent sources.                         │
│                                              │
│ RECOMMENDED ACTION                            │
│ Preserve original media and review flagged   │
│ segments while relying on corroborating      │
│ sources.                                     │
│                                              │
└──────────────────────────────────────────────┘
```

---

# 51. Implementation Priority

## P0 — MUST HAVE

- [ ] Media ingestion.
- [ ] Frame extraction.
- [ ] YOLO26 integration.
- [ ] Object detection.
- [ ] ByteTrack/BoT-SORT tracking.
- [ ] Visual Evidence JSON.
- [ ] Data Fusion integration.
- [ ] Gemini structured input.
- [ ] Visual Intelligence UI.
- [ ] Video timeline.
- [ ] Map event integration.

## P1 — HIGH VALUE

- [ ] Temporal analysis.
- [ ] Visual forensics.
- [ ] Authenticity score.
- [ ] Manipulation classification.
- [ ] Corroboration.
- [ ] Evidence graph.
- [ ] Alert prioritization.
- [ ] WebSocket updates.

## P2 — DIFFERENTIATOR

- [ ] Grounding DINO.
- [ ] CLIP.
- [ ] Claim validation.
- [ ] Contradiction detection.
- [ ] Human review workflow.
- [ ] Evidence explanation.
- [ ] Custom visual queries.

## P3 — POLISH

- [ ] GPU optimization.
- [ ] Batch inference.
- [ ] Model routing.
- [ ] Advanced observability.
- [ ] Model performance dashboard.
- [ ] Advanced forensic models.
- [ ] Dataset/evaluation dashboard.

---

# 52. Definition of Done

The feature is complete when:

- [ ] Video enters VANGUARD.
- [ ] Media receives a unique ID.
- [ ] Frames are extracted.
- [ ] YOLO detects objects.
- [ ] Objects are tracked.
- [ ] Visual events are generated.
- [ ] Temporal consistency is calculated.
- [ ] Forensic signals are calculated.
- [ ] Media authenticity is estimated.
- [ ] Manipulation does not automatically delete media.
- [ ] Visual evidence is stored.
- [ ] Visual evidence appears in the UI.
- [ ] Visual events appear on the tactical map.
- [ ] Visual evidence enters Data Fusion.
- [ ] Radar can corroborate video.
- [ ] Incident reports can corroborate video.
- [ ] Weather/personnel information can participate in fusion.
- [ ] Gemini receives structured evidence.
- [ ] Gemini produces structured claims.
- [ ] Claims are validated.
- [ ] Contradictions are detected.
- [ ] Operator can inspect supporting evidence.
- [ ] Suspicious timestamps can be reviewed.
- [ ] Final confidence is explainable.
- [ ] Complete end-to-end demo works.

---

# 53. Hackathon Differentiator

Do NOT describe the feature as:

> "VANGUARD uses YOLO for object detection."

Describe it as:

> **"VANGUARD creates a machine-verifiable visual evidence layer between raw media and AI decision-making."**

The architecture becomes:

```text
RAW MEDIA
    ↓
COMPUTER VISION
    ↓
OBSERVABLE FACTS
    ↓
TEMPORAL ANALYSIS
    ↓
MEDIA FORENSICS
    ↓
AUTHENTICITY ESTIMATION
    ↓
MULTI-SOURCE CORROBORATION
    ↓
EVIDENCE GRAPH
    ↓
AI REASONING
    ↓
CLAIM VALIDATION
    ↓
EXPLAINABLE DECISION
```

Core principle:

> **AI SHOULD REASON OVER EVIDENCE — NOT REPLACE EVIDENCE.**

---

# 54. Suggested Team Split

## Backend / CV Engineer

- [ ] YOLO integration.
- [ ] Tracking.
- [ ] Frame processing.
- [ ] Grounding DINO.
- [ ] CLIP.
- [ ] Forensics.
- [ ] Visual Evidence API.

## Backend / Data Fusion Engineer

- [ ] Evidence storage.
- [ ] Corroboration.
- [ ] Spatial correlation.
- [ ] Temporal correlation.
- [ ] Evidence graph.
- [ ] Confidence engine.

## AI Engineer

- [ ] Gemini integration.
- [ ] Structured prompts.
- [ ] Situation synthesis.
- [ ] Claim extraction.
- [ ] Claim validation.
- [ ] Contradiction detection.

## Frontend Engineer

- [ ] Visual Intelligence panel.
- [ ] Video player.
- [ ] Bounding boxes.
- [ ] Timeline.
- [ ] Map integration.
- [ ] Evidence graph UI.
- [ ] Alert UI.

## DevOps / Infrastructure

- [ ] Redis.
- [ ] Queue.
- [ ] GPU environment.
- [ ] Docker.
- [ ] Model deployment.
- [ ] Logging.
- [ ] Monitoring.
- [ ] Production configuration.

---

# 55. Final Architecture

```text
                         ┌───────────────────────┐
                         │       VANGUARD        │
                         │ COMMAND CENTER        │
                         └───────────┬───────────┘
                                     │
                     ┌───────────────┴───────────────┐
                     │                               │
               OPERATOR UI                     ALERT SYSTEM
                     │                               │
                     └───────────────┬───────────────┘
                                     │
                              DATA FUSION
                                     │
        ┌────────────────────────────┼──────────────────────────┐
        │                            │                          │
      RADAR                        VIDEO                     INCIDENTS
        │                            │                          │
        │                    ┌───────┴────────┐                 │
        │                    │ VISUAL ENGINE  │                 │
        │                    └───────┬────────┘                 │
        │                            │                          │
        │              ┌─────────────┼─────────────┐            │
        │              │             │             │            │
        │            YOLO        FORENSICS     SEMANTIC         │
        │              │             │          MODELS          │
        │              │             │             │            │
        │              └─────────────┼─────────────┘            │
        │                            │                          │
        │                         TRACKING                      │
        │                            │                          │
        └────────────────────────────┼──────────────────────────┘
                                     │
                              EVIDENCE GRAPH
                                     │
                              CORROBORATION
                                     │
                              EVIDENCE VALIDATOR
                                     │
                                  GEMINI
                                     │
                           EXECUTIVE SITUATION
                                  BRIEFING
```

---

# 56. Success Metric

The feature should ultimately answer four questions:

```text
1. WHAT IS VISIBLE?
        ↓
2. HOW CONFIDENT ARE WE?
        ↓
3. DOES OTHER DATA SUPPORT IT?
        ↓
4. CAN WE EXPLAIN WHY THE AI BELIEVES IT?
```

If VANGUARD can answer all four in a single command-center workflow, the Computer Vision feature is successfully integrated.
