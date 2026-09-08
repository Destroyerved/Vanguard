# VANGUARD — FRONTEND TRANSFORMATION V2
## Senior Frontend Architect + Product Designer + Creative Technologist Master Execution Prompt

REPOSITORY:
https://github.com/anushkayerpude/VanGuard/tree/rudz

---

# MISSION

Transform the existing VANGUARD frontend from a conventional AI-generated/hackathon-style interface into a genuinely premium, professional defence situational-awareness platform.

This is NOT a cosmetic redesign.

This is a complete transformation of:

- visual language
- information architecture
- interaction design
- spatial composition
- motion design
- data visualization
- 3D/WebGL visualization
- typography
- component architecture
- responsive behavior
- loading/error/degraded states
- frontend performance

Preserve every existing working capability.

The final product must feel like serious operational software designed by a world-class product team.

It should feel closer to:

- aerospace mission software
- intelligence analysis workstations
- advanced geospatial systems
- professional command-and-control software
- high-end scientific visualization tools

It must NOT feel like:

- a SaaS dashboard
- a generic AI dashboard
- a Tailwind template
- a shadcn demo
- a bento-grid website
- a collection of cards
- a cyberpunk gaming HUD
- a hackathon prototype
- an AI-generated "futuristic" website

You have creative authority.

DO NOT ask the user what the design should look like.

Study the repository, understand the product, make strong design decisions, implement them, test them, critique them, and refine them.

---

# 01 — NON-NEGOTIABLE PRINCIPLES

1. Functionality comes first.
2. Real data is the source of truth.
3. Visualizations must represent actual information.
4. 3D must have semantic purpose.
5. Motion must communicate meaning.
6. Typography must feel purpose-built for the domain.
7. Do not use cards as the default layout primitive.
8. Do not use bento grids.
9. Do not use generic SaaS aesthetics.
10. Do not fabricate functionality or data.
11. Do not break backend contracts.
12. Do not replace working infrastructure without a reason.
13. The UI must remain understandable despite its sophistication.
14. Complexity should exist underneath the interface, not overwhelm the operator.
15. The final experience must look intentional at every resolution.

---

# 02 — PHASE ZERO: REPOSITORY FORENSICS

BEFORE WRITING FRONTEND CODE, inspect the repository deeply.

Read and understand all relevant files, including:

- README
- package.json
- frontend source
- components
- routes
- pages
- hooks
- state management
- types
- API clients
- backend routes
- WebSocket implementation
- data models
- map implementation
- event processing
- correlation logic
- confidence logic
- anomaly detection
- news pipeline
- OSINT/media verification
- simulation
- degraded communications
- documentation
- product requirements
- task/checklist files

Do not redesign from screenshots or assumptions.

Understand the actual system.

Create a mental model of:

DATA SOURCE
→
PROCESSING
→
STATE
→
USER ACTION
→
VISUAL OUTPUT

Identify every existing user-facing capability.

---

# 03 — BUILD A FUNCTIONALITY INVENTORY

Before implementation, map the current application.

For every route/screen, determine:

- what it does
- what data it consumes
- what APIs it calls
- what state it owns
- what interactions exist
- what actions the user can perform
- what loading states exist
- what errors exist
- what empty states exist
- what backend functionality must remain unchanged

Use this transformation model:

CURRENT SCREEN
→
CURRENT FUNCTIONALITY
→
DATA SOURCE
→
USER INTENT
→
NEW VISUAL MODEL
→
NEW INTERACTION
→
BACKEND CONNECTION
→
LOADING STATE
→
ERROR STATE
→
DEGRADED STATE

Do not remove a capability simply because the old UI was ugly.

Re-express it.

---

# 04 — DESIGN DIRECTOR MODE

You are the design authority for this transformation.

Do not ask questions such as:

"What color should I use?"

"Should this be a card?"

"Where should this button go?"

"What layout do you want?"

Make the decision yourself using:

- defence context
- operational usability
- information hierarchy
- existing functionality
- visual coherence
- accessibility
- performance

Prefer bold, original decisions over safe generic defaults.

However:

ORIGINAL ≠ RANDOM

Every unusual design choice must improve comprehension, hierarchy, interaction, or identity.

---

# 05 — CORE PRODUCT MENTAL MODEL

VANGUARD is not a dashboard.

It is a living intelligence environment.

The primary mental model is:

OBSERVE
→
CORRELATE
→
UNDERSTAND
→
ASSESS
→
DECIDE

Represent five fundamental dimensions:

SPATIAL
Where is something happening?

TEMPORAL
When did it happen?

SIGNAL
What observations exist?

CONFIDENCE
How certain are we?

PROVENANCE
Why should we trust it?

Additional dimensions:

THREAT
How serious is it?

FRESHNESS
How current is the information?

SYSTEM STATE
Are the sources and communications healthy?

The UI should make these relationships visible.

---

# 06 — THE INTERFACE MUST FEEL LIKE AN INSTRUMENT

Do not design "pages".

Design operational instruments.

Instead of:

CARD → NUMBER → LABEL

think:

SIGNAL → STATE → CONTEXT → RELATIONSHIP → ACTION

Instead of:

CHART → LEGEND

think:

TEMPORAL PATTERN → EVENT → CAUSALITY → INVESTIGATION

Instead of:

MAP → MARKERS

think:

SPATIAL FIELD → EVENTS → CORRELATIONS → THREAT → TIME

---

# 07 — VISUAL IDENTITY

Create a distinctive VANGUARD visual language.

Keywords:

PRECISION
CONTROL
SPATIAL
TACTICAL
TECHNICAL
CALM
AUTHORITATIVE
INTELLIGENT
HIGH-DENSITY
PROFESSIONAL

Visual ingredients:

- near-black operational surfaces
- steel/cold neutral hierarchy
- restrained cyan/blue analytical accents
- controlled amber
- controlled red
- fine coordinate systems
- subtle grids
- technical data labels
- signal traces
- precise separators
- spatial overlays
- depth
- carefully controlled glow
- meaningful motion

Do not turn the product into a neon sci-fi movie.

The aesthetic should feel expensive because of:

- composition
- typography
- information hierarchy
- precision
- motion
- visualization

not because of effects.

---

# 08 — ABSOLUTE ANTI-SLOP RULES

Do NOT use generic:

- dashboard cards
- bento layouts
- glassmorphism everywhere
- rounded rectangles everywhere
- gradient cards
- giant KPI cards
- pill-heavy navigation
- floating blobs
- decorative glows
- generic radar graphics
- meaningless 3D globes
- generic AI badges
- default shadcn styling
- default Material styling
- generic charts
- giant hero sections
- repetitive equal-width columns
- excessive border-radius
- excessive box shadows
- excessive backdrop blur

If the design can be described as:

"dark futuristic dashboard with cards"

START OVER.

---

# 09 — NO BENTO

This is a hard rule.

Do not arrange the application into:

small card + large card + small card + chart card + metric card.

Use:

- asymmetric compositions
- full-bleed workspaces
- spatial panels
- contextual drawers
- edge-mounted tools
- floating analytical surfaces
- layered information
- open canvas layouts
- data rails
- typography-based grouping

Containers should exist only when they communicate a meaningful relationship.

---

# 10 — TYPOGRAPHY

DO NOT use generic AI/SaaS fonts as the primary identity.

Avoid:

- Inter
- Geist
- Roboto
- Open Sans
- Poppins
- Montserrat
- Manrope
- DM Sans
- Plus Jakarta Sans
- Space Grotesk
- Arial

The type system should feel inspired by:

- aerospace
- defence instrumentation
- industrial systems
- intelligence workstations
- technical navigation

Evaluate:

- DIN-inspired families
- Eurostile-inspired families
- Saira
- Saira Condensed
- Rajdhani
- Archivo Narrow
- similarly refined industrial families

Do not use a "military stencil" font.

The interface should feel professional, not theatrical.

Use:

PRIMARY TYPEFACE
for navigation, headings, interface text

TECHNICAL MONOSPACE
for:

- timestamps
- coordinates
- event IDs
- source IDs
- telemetry
- raw data
- diagnostics
- technical identifiers

Use tabular numerals where useful.

Numbers should feel like instrumentation.

---

# 11 — TYPOGRAPHIC HIERARCHY

Build a deliberate hierarchy:

SYSTEM LABEL
small / tracked / technical

SECTION
compact / confident

INTELLIGENCE TITLE
strong / editorial

METRIC
large / precise / engineered

METADATA
small / restrained

TIMESTAMP
technical monospace

Do not make everything bold.

Do not solve hierarchy with font size alone.

Use:

- scale
- weight
- tracking
- placement
- whitespace
- alignment
- contrast

---

# 12 — APPLICATION SHELL

Do not default to:

SIDEBAR
+
TOPBAR
+
CARD GRID

Build a command environment.

Suggested architecture:

NARROW COMMAND RAIL
+
PRIMARY OPERATIONAL CANVAS
+
CONTEXTUAL EDGE PANELS
+
FLOATING COMMAND CONTROLS

The shell should feel closer to an advanced workstation than an admin panel.

---

# 13 — COMMAND RAIL

Use a minimal persistent navigation rail.

Sections:

COMMAND
- Overview
- Tactical Map

INTELLIGENCE
- Events
- Threat Timeline
- Verified News
- OSINT Verification

SOURCES
- Source Health
- Data Streams

TOOLS
- API Console
- Scenarios

Avoid bright rounded selected pills.

Use:

- precise active line
- small state indicator
- subtle illumination
- controlled transition

Labels may reveal on hover/expand.

---

# 14 — COMMAND CANVAS

The primary application area should behave as an information canvas.

It should be possible to combine:

MAP
+
EVENTS
+
TIMELINE
+
SOURCE STATE
+
THREAT STATE
+
CONFIDENCE
+
PROVENANCE

without forcing the user to mentally stitch together unrelated screens.

---

# 15 — OVERVIEW TRANSFORMATION

The Overview page must be the strongest screen.

Do NOT make:

12 cards
+
3 charts.

Create one dominant operational composition.

Primary visual anchors:

1. Threat posture
2. Spatial situation
3. Intelligence brief
4. Active signals
5. Temporal context
6. Confidence/provenance

Use asymmetry.

Use scale.

Use open space strategically.

The screen should immediately answer:

WHAT IS HAPPENING?

HOW SERIOUS IS IT?

WHERE?

WHEN?

HOW CONFIDENT ARE WE?

WHY?

WHAT CHANGED?

---

# 16 — THREAT POSTURE

Never display threat posture as a normal card.

Build a living instrument.

Possible representations:

- concentric threat fields
- dynamic perimeter
- radial intensity
- signal propagation
- confidence halo
- environmental state

Display:

THREAT POSTURE
ELEVATED
74
CONFIDENCE 89%

The visual should communicate the state without overwhelming the operator.

State semantics:

GREEN
healthy / stable

YELLOW
elevated / caution

ORANGE
unstable / serious

RED
critical / escalation

Do not make the interface flash.

Do not gamify threat.

---

# 17 — THREE.JS / WEBGL / 3D

You have explicit permission to use:

- Three.js
- React Three Fiber
- WebGL
- custom shaders
- instanced geometry
- controlled post-processing
- Canvas
- GPU-accelerated visualization

But there is one absolute rule:

## 3D MUST REPRESENT INFORMATION.

Forbidden:

- rotating globe for decoration
- floating sphere
- random particles
- rotating cube
- fake hologram
- decorative terrain
- generic "AI network" animation

Acceptable examples:

### Spatial Threat Field

X/Y = geography
height = threat intensity
density = event concentration

### Temporal Intelligence Terrain

X/Y = geography
Z = time
vertical structures = event activity

### Correlation Topology

nodes = real sources/events
edges = real relationships
node size = real metric
edge strength = real relationship strength

### Confidence Field

position = spatial context
surface intensity = confidence
annotations = evidence

### Signal Propagation

origin = actual event/source
movement = actual temporal relationship

Choose the visualization that best represents the underlying data.

Do not force 3D when 2D is clearer.

---

# 18 — 3D SEMANTIC CONTRACT

For EVERY 3D visualization answer:

1. What does position represent?
2. What does scale represent?
3. What does color represent?
4. What does opacity represent?
5. What does motion represent?
6. What does a connection represent?
7. Where does each value come from?
8. What happens when the user selects an object?
9. What happens when the timeline changes?
10. What happens if WebGL is unavailable?

If these answers cannot be provided from real product data:

DO NOT BUILD THE 3D ELEMENT.

---

# 19 — 3D INTERACTION

Meaningful interactions can include:

- hover
- focus
- click
- isolate
- filter
- zoom
- rotate
- reset
- inspect

When selecting an object:

THE ACTUAL EVENT / SOURCE / RELATIONSHIP

must become selected in the rest of the application.

Example:

Select event in 3D
→
map focuses location
→
timeline focuses timestamp
→
investigation drawer opens
→
correlated events highlight

The 3D layer must be connected to application state.

---

# 20 — 3D PERFORMANCE

Use:

- instancing
- lightweight geometry
- controlled particle counts
- memoization
- throttled updates
- selective rendering
- visibility-based rendering
- progressive loading
- reduced-motion support
- 2D fallback

Never let 3D freeze the operational interface.

Pause unnecessary animation when the visualization is not visible.

---

# 21 — TACTICAL MAP

The map is NOT a card.

It is an environment.

Give it major screen real estate.

Preserve every existing capability.

Support, where already available:

- markers
- clusters
- events
- layers
- assets
- zones
- weather
- heatmaps
- filtering
- selection
- fly-to
- popups
- timeline
- correlations

Use contextual overlays.

Potential layers:

EVENT SIGNALS
UNCERTAINTY
CORRELATION PATHS
SOURCE ARCS
DENSITY
TEMPORAL TRAILS
THREAT CONTOURS

Do not clutter.

---

# 22 — MAP + TIMELINE = ONE SYSTEM

This is one of the most important interaction rules.

Map selection:

EVENT
→
timeline focus
→
correlated events
→
investigation

Timeline selection:

EVENT
→
map focus
→
spatial cluster
→
related signals
→
investigation

Time scrubbing should reconstruct the operational picture where the underlying data supports it.

The user should feel as though they are replaying the situation.

---

# 23 — EVENTS AS OBJECTS

Events should not merely be rows of cards.

Represent them through:

- signal points
- severity rings
- confidence halos
- source indicators
- temporal traces
- correlation edges

A corroborated event should visually differ from an isolated observation.

A stale event should visually differ from fresh information.

An uncertain event should visibly communicate uncertainty.

All of this must derive from real data.

---

# 24 — EVENT INVESTIGATION

Avoid generic centered modals.

Use contextual investigation surfaces.

Preferred:

RIGHT-SIDE INTELLIGENCE DRAWER

or

EDGE-MOUNTED ANALYTICAL WORKSPACE

Keep the underlying operational picture visible.

Show:

EVENT ID
SEVERITY
CONFIDENCE
LOCATION
TIME
PROVENANCE
CORRELATED EVENTS
ANOMALY
EXPLANATION
EVIDENCE
RAW PAYLOAD

Use relationships and hierarchy instead of nested cards.

---

# 25 — CONFIDENCE VISUALIZATION

Do not use circular progress bars as the primary representation.

Visualize confidence as an evidence flow.

Example:

SOURCE RELIABILITY
↓
DATA FRESHNESS
↓
SPATIAL AGREEMENT
↓
TEMPORAL AGREEMENT
↓
SOURCE AGREEMENT
↓
CORROBORATION
↓
FINAL CONFIDENCE

Show:

what increased confidence

what reduced confidence

what evidence exists

what is missing

why the score exists

Never replace backend confidence logic with frontend assumptions.

---

# 26 — PROVENANCE

Important intelligence should answer:

WHERE DID THIS COME FROM?

Make provenance inspectable.

Represent:

- source
- timestamp
- reliability
- contribution
- freshness
- correlation

Selecting a claim should reveal its actual supporting information.

Trust is part of the UX.

---

# 27 — SOURCE HEALTH

Do not create:

SOURCE A CARD
SOURCE B CARD
SOURCE C CARD

Create a source topology.

Nodes:

real sources

Node properties:

health
reliability
latency
freshness
contribution

Edges:

real relationships if available.

When a source fails, the operational picture should visibly reflect that loss.

---

# 28 — INFORMATION FRESHNESS

Information age should be visible.

FRESH
crisp / active

AGING
subtly muted

STALE
explicitly marked

MISSING
explicitly absent

Use:

timestamp
state
label
confidence
visual weight

Do not rely on opacity alone.

---

# 29 — THREAT TIMELINE

This is NOT a project-management timeline.

Create a temporal intelligence instrument.

Represent:

- event density
- escalation
- posture transitions
- source activity
- correlation windows
- event clusters
- significant state changes

Potential causal progression:

OBSERVATION
→
CORRELATION
→
CORROBORATION
→
ANOMALY
→
ESCALATION

Only show transitions supported by actual data.

---

# 30 — VERIFIED NEWS

Treat news as intelligence signals.

Connect:

news
↔
events
↔
location
↔
source
↔
verification
↔
timeline
↔
relevance

Do not make a generic news feed.

---

# 31 — OSINT / MEDIA FORENSICS

Build a forensic analysis workspace.

The media should be visually dominant.

Supporting information:

- authenticity
- confidence
- manipulation indicators
- metadata
- provenance
- source
- verification chain
- related events

If the backend provides localized analysis, visualize it.

Never fabricate forensic results.

Never claim a video is manipulated without actual evidence from the product pipeline.

---

# 32 — API CONSOLE

Build a professional system diagnostics interface.

Include real:

- endpoint navigation
- request builder
- status
- latency
- response
- JSON inspection
- request history
- copy actions
- metadata

Use technical typography.

Do not make it look like a generic developer admin panel.

---

# 33 — SIMULATION

Simulation must feel fundamentally different from live operations.

When simulation starts:

transform the environment.

Clearly communicate:

SIMULATION
SCENARIO
CURRENT STATE
CHANGE
PROJECTED IMPACT

Use:

- replay
- temporal controls
- state transitions
- event injection
- projected outcomes

Never confuse simulated and live information.

Do not fake projected outcomes.

---

# 34 — DEGRADED COMMUNICATIONS

This should be a first-class visual state.

Represent:

DEGRADED COMMS
LAST KNOWN COP
SOURCE LOSS
DATA AGE
CONFIDENCE IMPACT
CACHE STATE

The UI should communicate information decay.

As information becomes stale:

make the decay understandable.

When communication recovers:

show synchronization using actual state.

---

# 35 — MOTION LANGUAGE

Create a consistent motion grammar.

ARRIVAL
→
subtle spatial entry

UPDATE
→
small local transition

FOCUS
→
controlled emphasis

CORRELATION
→
relationship formation

ESCALATION
→
stronger but restrained transition

NAVIGATION
→
spatial continuity

RECOVERY
→
synchronization transition

Do NOT animate everything.

No:

- bouncing cards
- endless floating
- decorative particle loops
- excessive parallax
- random transitions

Animation must explain state.

---

# 36 — PHYSICS / DEPTH

Use subtle:

- depth
- parallax
- spring transitions
- spatial surfaces
- magnetic interactions
- cursor-relative movement

Only when they improve interaction.

Do not sacrifice clarity.

---

# 37 — ENVIRONMENTAL STATE

The interface may subtly respond to system state.

NORMAL
quiet neutral environment

ELEVATED
slightly stronger analytical contrast

CRITICAL
controlled peripheral emphasis

DEGRADED
muted / amber information-decay cues

Do not recolor the entire interface.

---

# 38 — COMMAND PALETTE

Implement Cmd/Ctrl + K if compatible with the application.

Expose only real actions.

Examples:

Go to Tactical Map
Show Critical Events
Find Event
Inspect Source
Show Degraded Sources
Replay Timeline
Open API Console
Open Scenarios

Do not create fake AI command functionality.

---

# 39 — KEYBOARD NAVIGATION

Where practical:

M → Map
E → Events
T → Timeline
S → Sources
N → News
Esc → close context
? → shortcuts

Avoid browser conflicts.

Keyboard focus must remain clear.

---

# 40 — LOADING

Do not use generic spinners everywhere.

Use contextual loading states.

Map:
progressive map initialization

Events:
structured signal rows

Intelligence:
structured text placeholders

3D:
progressive visualization loading

Loading should feel like the product itself.

---

# 41 — EMPTY STATES

Never write generic:

"No data."

Instead explain the system state.

Example:

NO ACTIVE CORRELATIONS

Current observations do not contain enough spatial or temporal agreement to form a fused event.

Only use messages consistent with actual system behavior.

---

# 42 — ERROR STATES

Every failure should communicate:

WHAT FAILED
WHAT IS AFFECTED
WHAT STILL WORKS
LAST KNOWN STATE
WHAT CAN BE DONE

Do not expose raw technical exceptions as the primary UX.

---

# 43 — RESPONSIVE DESIGN

Primary target:

1440×900
1600×900
1920×1080
2560×1440

Large screens should reveal:

- more spatial context
- more temporal context
- more relationships
- more intelligence

Do NOT simply make cards bigger.

Support smaller screens intelligently.

---

# 44 — COMMAND-CENTER MODE

Large screens may use:

- expanded map
- persistent timeline
- edge intelligence panels
- source topology
- threat posture
- contextual tools

Think multi-monitor operational workstation.

Do not waste large-screen space.

---

# 45 — EASY MODE

Easy Mode should answer:

WHAT HAPPENED?
HOW SERIOUS?
HOW CONFIDENT?
WHY?
WHAT CHANGED?
WHAT SHOULD I INSPECT?

Hide unnecessary technical detail.

Do not remove important safety/meaningful state.

---

# 46 — EXPERT MODE

Expert Mode can expose:

- source IDs
- coordinates
- confidence components
- provenance
- correlation details
- technical metadata
- raw payload
- telemetry
- WebSocket state

Switching modes should preserve context.

Do not duplicate business logic.

---

# 47 — COLOR SYSTEM

Base:

#05070A
#070B10
#0A0F15
#0E141C

Primary analytical accent:

cold cyan / blue

Warning:

amber

Critical:

controlled red

Healthy:

controlled green

Use color semantically.

Never use color purely as decoration.

---

# 48 — SURFACES

Do not make everything a card.

Use a combination of:

- open canvas
- flat surfaces
- thin separators
- translucent contextual surfaces
- edge panels
- floating tools
- full-bleed visualization

Rounded corners should be subtle and purposeful.

---

# 49 — MICRO-DETAILS

Use restrained technical details:

- coordinate ticks
- precision lines
- signal traces
- timestamps
- source identifiers
- data age
- technical labels
- grid references
- status indicators

These should communicate information.

Never add meaningless pseudo-technical decoration.

---

# 50 — ACCESSIBILITY

Maintain:

- keyboard navigation
- visible focus
- semantic HTML
- ARIA where needed
- screen-reader labels
- sufficient contrast
- reduced motion
- non-color state indicators

Critical state must never depend only on color.

---

# 51 — ENGINEERING

Use modern technology where justified:

- React
- TypeScript
- existing framework
- Motion / Framer Motion
- Three.js
- React Three Fiber
- WebGL
- Canvas
- SVG
- GSAP only if genuinely necessary
- Web Workers if useful

Do not add dependencies without justification.

Do not rewrite stable infrastructure for fashion.

---

# 52 — STATE ARCHITECTURE

Do not duplicate data logic in visualization components.

Separate:

DATA
STATE
DOMAIN LOGIC
PRESENTATION
INTERACTION

3D, map, timeline and investigation surfaces should consume shared application state.

One event should have one canonical identity.

---

# 53 — REAL-TIME UPDATES

Respect the existing WebSocket architecture.

Live updates should update only affected UI.

Avoid:

- full-page rerenders
- unnecessary map redraws
- restarting 3D scenes
- resetting user context

Preserve:

- selected event
- map position
- filters
- timeline position
- investigation context

unless the user explicitly changes them.

---

# 54 — PERFORMANCE

Optimize:

- React rendering
- WebSocket updates
- map rendering
- 3D rendering
- event lists
- animation
- DOM size
- memory

Use:

- memoization
- virtualization
- throttling
- batching
- instancing
- selective updates

The application must remain responsive during live data streams.

---

# 55 — NO FAKE DATA

NEVER invent:

- events
- coordinates
- threat scores
- confidence
- sources
- news
- OSINT findings
- telemetry
- weather
- simulation outcomes

Use actual backend data.

If unavailable:

show a professional empty/loading/error state.

---

# 56 — BACKEND CONTRACT PRESERVATION

Do not change APIs merely to simplify UI work.

Preserve:

- REST endpoints
- WebSocket protocols
- payload structures
- existing calculations
- authentication
- refresh behavior
- state semantics

If a backend change is genuinely necessary, understand the full dependency chain before changing it.

---

# 57 — COMPONENT ARCHITECTURE

Refactor toward domain-driven frontend architecture.

Potential structure:

components/
  command/
  spatial/
  intelligence/
  events/
  timeline/
  sources/
  forensics/
  simulation/
  system/
  ui/

Potential components:

CommandRail
OperationalCanvas
ThreatInstrument
SignalField
CorrelationGraph
ConfidenceFlow
EventTrace
EventInspector
SourceTopology
TemporalScrubber
SituationBrief
EvidenceChain
MediaForensics
SimulationEnvironment
DegradedStateLayer
SystemStatus
CommandPalette

Do not create components purely to satisfy a folder structure.

Avoid over-fragmentation.

---

# 58 — DESIGN TOKENS

Create centralized tokens for:

- typography
- spacing
- colors
- borders
- radius
- surfaces
- motion
- depth
- z-index

Do not scatter arbitrary CSS values everywhere.

---

# 59 — VISUAL DATA MAPPING

Every visual encoding should have a reason.

Examples:

EVENT SEVERITY
→ scale / intensity

CONFIDENCE
→ confidence field / visual weight

SOURCE RELIABILITY
→ node strength

FRESHNESS
→ information age

CORRELATION
→ connection

THREAT
→ state/environment

SOURCE FAILURE
→ topology degradation

Never map unrelated information to flashy visuals.

---

# 60 — INFORMATION HIERARCHY

Critical information wins through:

1. position
2. scale
3. contrast
4. typography
5. motion
6. color

Do not make everything loud.

The interface should remain calm even during high activity.

---

# 61 — THE "ONE SECOND" TEST

For every major screen:

The operator should understand the primary situation within approximately one second.

Ask:

What is happening?

Where?

How serious?

How confident?

What changed?

If this cannot be answered quickly, improve hierarchy.

---

# 62 — THE "FIVE SECOND" TEST

Hide:

- logo
- product name
- branding

Look at the interface for five seconds.

If it looks like a generic AI dashboard:

REDESIGN.

---

# 63 — THE "NO GRADIENT" TEST

Temporarily remove gradients.

If the interface loses most of its visual quality:

REDESIGN.

The design must stand on:

- composition
- typography
- spacing
- visualization
- motion
- hierarchy

---

# 64 — THE "NO 3D" TEST

Temporarily disable 3D.

The application should still communicate the product's core intelligence.

If removing 3D destroys the meaning:

the 3D implementation was probably decorative.

Fix it.

---

# 65 — THE "NO CARD" TEST

Replace/remove unnecessary card containers.

If the hierarchy collapses:

the information architecture is too dependent on containers.

Fix the hierarchy.

---

# 66 — THE "REAL DATA" TEST

Every major visual effect must be traceable to real data.

Ask:

Where does this number come from?

Where does this color come from?

Where does this movement come from?

Where does this connection come from?

If there is no answer:

remove the effect.

---

# 67 — DESIGNING FOR TRUST

Because this is a defence/intelligence product:

Never visually imply more certainty than the data supports.

If confidence is low:

show uncertainty.

If sources disagree:

show disagreement.

If information is stale:

show age.

If provenance is weak:

show it.

If data is missing:

show absence.

The interface must not manufacture confidence.

---

# 68 — VISUAL SURPRISE

Create several moments that feel genuinely original.

Potential examples:

- selecting an event reconstructs its evidence chain
- correlation relationships materialize spatially
- timeline scrubbing reconstructs the situation
- source degradation causes visible information decay
- confidence becomes an evidence flow
- threat escalation propagates through the operational picture
- 3D reveals relationships impossible to see in a normal dashboard
- map and timeline behave as one continuous instrument

These should be real interactions.

Not visual tricks.

---

# 69 — POLISH

After functionality works, perform a dedicated polish pass.

Inspect:

- spacing
- alignment
- typography
- hierarchy
- transitions
- visual density
- map overlays
- 3D readability
- responsive behavior
- loading states
- errors
- empty states
- hover states
- focus states

Remove anything unnecessary.

Premium design often comes from subtraction.

---

# 70 — FUNCTIONAL QA

Run:

- TypeScript
- lint
- production build
- frontend
- backend
- REST flows
- WebSocket flows

Test:

navigation
map
events
event investigation
confidence
correlation
timeline
source health
news
OSINT
simulation
degraded communications
Easy Mode
Expert Mode
API Console
raw JSON
filters
refresh
loading
empty
error
recovery

Fix all issues found.

Do not leave:

- TODOs
- placeholders
- dead buttons
- fake interactions
- broken links
- console errors
- missing states

---

# 71 — VISUAL QA

Inspect every major screen at:

1440×900
1920×1080
2560×1440

Look for:

- generic card repetition
- weak hierarchy
- excessive rounded containers
- typography inconsistencies
- excessive gradients
- meaningless effects
- bad spacing
- poor map composition
- unreadable 3D
- animation overload
- inconsistent states
- awkward responsive behavior

Refactor.

---

# 72 — ANTI-SLOP AUDIT

Before declaring the task complete, explicitly inspect the implementation for:

[ ] generic dashboard grids
[ ] excessive cards
[ ] bento layout
[ ] generic AI styling
[ ] default component-library styling
[ ] generic fonts
[ ] decorative 3D
[ ] decorative particles
[ ] excessive gradients
[ ] excessive glassmorphism
[ ] excessive glow
[ ] meaningless animations
[ ] fake data
[ ] duplicated information
[ ] unnecessary borders
[ ] excessive pills
[ ] giant empty areas
[ ] confusing information density

Anything checked as a problem must be fixed.

---

# 73 — FINAL QUALITY GATE

The project is NOT finished when:

"the page works."

It is finished when:

FUNCTIONALLY COMPLETE
+
VISUALLY DISTINCTIVE
+
DATA-DRIVEN
+
FAST
+
ACCESSIBLE
+
RESPONSIVE
+
COHERENT
+
PROFESSIONAL

The final interface should look like something a serious defence technology company could ship.

---

# 74 — THE FINAL STANDARD

Do not design:

A dashboard.

Design:

A living operational intelligence instrument.

The visual system should make:

SPACE visible
TIME visible
SIGNALS visible
CORRELATION visible
CONFIDENCE visible
PROVENANCE visible
THREAT visible
FRESHNESS visible
UNCERTAINTY visible
SYSTEM HEALTH visible

The interface should allow the operator to move naturally through:

OBSERVE
→
CORRELATE
→
UNDERSTAND
→
ASSESS
→
DECIDE

The engineering already contains the foundation.

Your responsibility is to build the interface that foundation deserves.

---

# 75 — EXECUTION ORDER

Follow this sequence.

PHASE 1
Repository audit

PHASE 2
Functionality inventory

PHASE 3
Current UI architecture analysis

PHASE 4
Design system and visual language

PHASE 5
Typography

PHASE 6
Application shell

PHASE 7
Overview / command canvas

PHASE 8
Tactical map

PHASE 9
Events + investigation

PHASE 10
Timeline

PHASE 11
Source topology

PHASE 12
Confidence + provenance

PHASE 13
Verified News

PHASE 14
OSINT / media forensics

PHASE 15
Simulation

PHASE 16
Degraded communications

PHASE 17
3D/WebGL enhancement

PHASE 18
Motion polish

PHASE 19
Responsive optimization

PHASE 20
Accessibility

PHASE 21
Performance optimization

PHASE 22
Functional QA

PHASE 23
Visual QA

PHASE 24
Anti-slop audit

PHASE 25
Final polish

Do not skip directly from repository inspection to visual implementation.

---

# 76 — FINAL INSTRUCTION TO THE CODING AGENT

Take ownership of the transformation.

Do not produce a safe redesign.

Do not make the old UI slightly prettier.

Do not wrap existing content in nicer cards.

Do not add random 3D.

Do not add generic "AI" visual effects.

Do not use fashionable UI patterns just because they are fashionable.

Study the actual product.

Understand the actual data.

Understand the actual workflows.

Then create an interface that feels purpose-built around them.

Make it:

PRECISION-FIRST
DATA-DRIVEN
SPATIAL
TEMPORAL
EXPLAINABLE
CALM
FAST
TACTICAL
PREMIUM

The user has intentionally given you creative freedom.

Use it.

Build something that, when demonstrated, immediately communicates:

"This is not another hackathon dashboard."

It should feel like a serious operational intelligence system.

Do not stop at functional.

Do not stop at pretty.

Push until the interface feels inevitable — as if VANGUARD could only have been designed this way.
