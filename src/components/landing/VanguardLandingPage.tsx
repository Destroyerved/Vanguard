import React, { useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'motion/react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Radio,
  Activity,
  Cpu,
  Server,
  Zap,
  Lock,
  Eye,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sliders,
  Database,
  Satellite,
  Compass,
  Radar,
  Crosshair,
  MapPin,
  Workflow,
  Sun,
  Moon,
  Users,
  Crown,
} from 'lucide-react';
import LoadingRadar, { RadarContact } from './LoadingRadar';
import WireframeDottedGlobe, { DEFENSE_SECTORS } from './WireframeDottedGlobe';
import TacticalTypewriter from './TacticalTypewriter';

interface VanguardLandingPageProps {
  onLaunchCop: () => void;
  serverOnline?: boolean;
  eventCount?: number;
  threatLevel?: string;
}

const HERO_TYPEWRITER_PHRASES = [
  'Multi-Source Defence Situational Awareness System',
  'One picture. Every source. Zero delay.',
  'Fusing 5 heterogeneous feeds into one explainable operating picture.',
  'Zero-hallucination citation grounding enforced in code.',
  'Sub-60ms fusion pass with deterministic air-gapped fallback.',
];

const VANGUARD_LETTERS = ['V', 'A', 'N', 'G', 'U', 'A', 'R', 'D'];

// Interactive Storytelling Scenario: 4 Operational Chapters
const STORY_CHAPTERS = [
  {
    step: '01',
    time: '02:14:02 UTC',
    title: 'Ghost Contact on the Horizon',
    subtitle: 'Fragmented Single-Feed Ambiguity',
    tag: 'SENSOR DETECTION',
    tagColor: 'text-amber-400 bg-amber-950/70 border-amber-500/40',
    description:
      'Long-range radar detects an unidentified kinematic track heading inbound at 260 knots (23.02°N, 72.57°E). Transponder is disabled. In conventional command centers, this is an isolated, ambiguous blip — easily mistaken for clutter or a lost civilian craft.',
    metrics: [
      { label: 'Feed', value: 'Surveillance Radar' },
      { label: 'Speed', value: '260 knots' },
      { label: 'Altitude', value: '18,400 ft' },
      { label: 'Raw Confidence', value: '62%' },
    ],
    status: 'Ambiguous Track',
  },
  {
    step: '02',
    time: '02:14:18 UTC',
    title: 'The Multi-Sensor Convergence',
    subtitle: '5 Disjoint Feeds Report Simultaneously',
    tag: 'SPATIOTEMPORAL FUSION',
    tagColor: 'text-[#a4c639] bg-[#33401c]/70 border-[#526a27]',
    description:
      'Within seconds, four other independent systems fire: an infrared beam trips on Sector 04 perimeter fence; Patrol GRIZZLY-1 reports visual movement; Open-Meteo detects sudden squall turbulence; dispatch receives an unauthorized checkpoint breach. Vanguard automatically correlates all 5 feeds across space (ΔR ≤ 2.1km) and time (ΔT ≤ 18s).',
    metrics: [
      { label: 'Correlated Sources', value: '5 / 5 Systems' },
      { label: 'Spatial Agreement', value: 'ΔR ≤ 2.1 km' },
      { label: 'Temporal Window', value: 'ΔT ≤ 18 s' },
      { label: 'Fusion Tick', value: '37 ms' },
    ],
    status: 'Cluster Fused',
  },
  {
    step: '03',
    time: '02:14:39 UTC',
    title: 'Explainable Confidence Arithmetic',
    subtitle: 'Counterfactual Proof Replaces Guesswork',
    tag: 'CONFIDENCE ENGINE',
    tagColor: 'text-emerald-400 bg-emerald-950/70 border-emerald-500/40',
    description:
      'No black-box guesses. VANGUARD applies its transparent formula: Confidence = min(100, round(Rs × Dt × Bc × 100)). Source reliability (0.92) × freshness (0.95) × cross-source corroboration multiplier (1.45) yields 96% confidence. Counterfactual proof: isolated radar was 62%; multi-source fusion added +34% verified certainty.',
    metrics: [
      { label: 'Source Reliability (Rs)', value: '0.92' },
      { label: 'Freshness (Dt)', value: '0.95' },
      { label: 'Corroboration (Bc)', value: '1.45x' },
      { label: 'Counterfactual Gain', value: '+34%' },
    ],
    status: '96% Confirmed',
  },
  {
    step: '04',
    time: '02:14:55 UTC',
    title: 'Ranked Courses of Action (COAs)',
    subtitle: 'Grounded Decision Support with Zero Hallucinations',
    tag: 'TACTICAL RESOLUTION',
    tagColor: 'text-[#c6ff00] bg-[#33401c]/70 border-[#526a27]',
    description:
      'The grounding gate verifies every citation against raw sensor events before the operator sees it. VANGUARD synthesizes 3 ranked defensive Courses of Action: 1. Vector Patrol GRIZZLY-1 to perimeter breach; 2. Launch Recon Drone swarm; 3. Alert perimeter QRF. Every action is logged in an immutable 4D time scrubber for post-mission audit.',
    metrics: [
      { label: 'COA 1', value: 'Vector Patrol GRIZZLY-1' },
      { label: 'COA 2', value: 'Deploy Recon UAV' },
      { label: 'Grounding Audit', value: '0 Hallucinations' },
      { label: 'Posture', value: 'CRITICAL ESCALATION' },
    ],
    status: 'Action Ready',
  },
];

// Tactical Task Force: Destroyer of Worlds
const TEAM_MEMBERS = [
  {
    name: 'Anushka Yerpude',
    role: 'Team Leader',
    isLeader: true,
    callsign: 'LEAD / FRONTEND',
    specialty: 'Team Lead & Frontend Specialist',
    focus: 'Directs the engineering effort and architects the high-fidelity defense HUD, responsive layout systems, 3D Canvas widgets, and Framer Motion interaction physics.',
    tacticalMetric: { label: 'FRONTEND ARCH', value: 'TACTICAL UI/UX & MOTION' },
    tags: ['TEAM LEAD', 'FRONTEND SPECIALIST', 'REACT HUD', 'FRAMER MOTION'],
  },
  {
    name: 'Ved Sharma',
    role: 'Team Mate',
    isLeader: false,
    callsign: 'CORE / BACKEND',
    specialty: 'Core Backend Creator & Architect',
    focus: 'Created the foundational VANGUARD backend server, the 6-stage Spatiotemporal Fusion Engine, Union-Find clustering algorithms, and the 114 invariant test suite.',
    tacticalMetric: { label: 'BACKEND CREATOR', value: '6-STAGE FUSION ENGINE' },
    tags: ['CORE BACKEND', 'FUSION ENGINE', 'UNION-FIND', '114 INVARIANTS'],
  },
  {
    name: 'Rudra Darji',
    role: 'Team Mate',
    isLeader: false,
    callsign: 'BACKEND / SYS',
    specialty: 'Backend Systems Engineer',
    focus: 'Architects real-time backend communication layers, sub-60ms sensor ingestion APIs, low-latency WebSocket event distribution, and distributed stream synchronization.',
    tacticalMetric: { label: 'BACKEND SYSTEMS', value: 'SUB-60MS INGEST PIPELINE' },
    tags: ['BACKEND SYSTEMS', 'REAL-TIME APIS', 'WEBSOCKETS', 'STREAM SYNC'],
  },
  {
    name: 'Bhavesh Landa',
    role: 'Team Mate',
    isLeader: false,
    callsign: 'AI / ML PIPELINES',
    specialty: 'AI / ML Pipelines & Intelligence',
    focus: 'Builds end-to-end AI/ML inference pipelines, Gemini 2.0 situational reasoning models, anti-hallucination citation validation gates, and predictive threat analytics.',
    tacticalMetric: { label: 'AI / ML PIPELINES', value: 'ZERO-HALLUCINATION GATE' },
    tags: ['AI / ML PIPELINES', 'GEMINI 2.0', 'THREAT INFERENCE', 'GROUNDING GATE'],
  },
];

export const VanguardLandingPage: React.FC<VanguardLandingPageProps> = ({
  onLaunchCop,
  serverOnline = false,
  eventCount = 118,
  threatLevel = 'green',
}) => {
  // Theme State: Light / Dark Mode Toggle
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Mouse Tracking for dynamic cursor spotlight over the cyber grid
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: -1000, y: -1000 });

  // Active story chapter state
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(1);

  // Interactive Confidence Arithmetic Calculator State
  const [sourceReliability, setSourceReliability] = useState<number>(0.92);
  const [dataFreshness, setDataFreshness] = useState<number>(0.95);
  const [corroborationMultiplier, setCorroborationMultiplier] = useState<number>(1.45);

  // Selected Radar Contact State
  const [inspectedContact, setInspectedContact] = useState<RadarContact | null>(null);

  // Demo Mission Briefing Modal State
  const [briefingModalOpen, setBriefingModalOpen] = useState<boolean>(false);
  const [briefingFormSubmitted, setBriefingFormSubmitted] = useState<boolean>(false);

  // Framer Motion Scroll Hooks
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const heroY = useTransform(scrollYProgress, [0, 0.12], [0, -75]);
  const heroScale = useTransform(scrollYProgress, [0, 0.12], [1, 0.94]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.10], [1, 0]);
  const heroFilter = useTransform(scrollYProgress, [0, 0.10], ['blur(0px)', 'blur(8px)']);

  const orbY1 = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const orbY2 = useTransform(scrollYProgress, [0, 1], [0, -180]);

  // Calculated Confidence values
  const rawConfidence = Math.min(
    100,
    Math.round(sourceReliability * dataFreshness * corroborationMultiplier * 100)
  );
  const baseWithoutCorroboration = Math.min(
    100,
    Math.round(sourceReliability * dataFreshness * 1.0 * 100)
  );
  const counterfactualFusionGain = rawConfidence - baseWithoutCorroboration;

  const isDark = theme === 'dark';

  // Dynamic Glass & Layout Theme Classes
  const glassPanelClass = isDark ? 'glass-panel border-[#33401c]/60 bg-black/85' : 'glass-panel-light';
  const glassPanelGlowClass = isDark ? 'glass-panel-glow border-[#526a27]/60 shadow-[0_0_35px_rgba(51,64,28,0.35)]' : 'glass-panel-glow-light';
  const glassCardClass = isDark ? 'glass-card-interactive border-white/10 hover:border-[#526a27]' : 'glass-card-interactive-light';
  const glassPillClass = isDark ? 'glass-pill border-[#33401c]/70 bg-black/60' : 'glass-pill-light';
  const textHeadingColor = isDark ? 'text-white' : 'text-slate-900';
  const textBodyColor = isDark ? 'text-slate-300' : 'text-slate-700';
  const textMutedColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const gridBackgroundClass = isDark ? 'cyber-grid-dark' : 'cyber-grid-light';
  const sectionBorderClass = isDark ? 'border-[#33401c]/50' : 'border-slate-200';
  const sliderTrackClass = isDark ? 'bg-[#1a2310]' : 'bg-slate-200';

  const getChapterTagClass = (step: string) => {
    switch (step) {
      case '01':
        return isDark
          ? 'text-amber-400 bg-amber-950/70 border-amber-500/40'
          : 'text-amber-800 bg-amber-100/90 border-amber-300 shadow-sm';
      case '02':
        return isDark
          ? 'text-[#a4c639] bg-[#33401c]/70 border-[#526a27]'
          : 'text-lime-800 bg-lime-100/90 border-lime-300 shadow-sm';
      case '03':
        return isDark
          ? 'text-emerald-400 bg-emerald-950/70 border-emerald-500/40'
          : 'text-emerald-800 bg-emerald-100/90 border-emerald-300 shadow-sm';
      case '04':
        return isDark
          ? 'text-[#c6ff00] bg-[#33401c]/70 border-[#526a27]'
          : 'text-lime-800 bg-lime-100/90 border-lime-300 shadow-sm';
      default:
        return 'text-[#a4c639] border-[#526a27]';
    }
  };

  const activeChapter = STORY_CHAPTERS[activeChapterIndex];

  return (
    <div
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      className={`min-h-screen font-sans selection:bg-lime-400 selection:text-black overflow-x-hidden relative transition-colors duration-500 ${
        isDark ? 'bg-[#000000] text-slate-100' : 'bg-[#f8fafc] text-slate-900'
      }`}
    >
      {/* ─── 1. FRAMER SCROLL PROGRESS BAR (TACTICAL OLIVE / LIME) ───────────────── */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#526a27] via-[#a4c639] to-[#c6ff00] origin-left z-50 shadow-[0_0_16px_rgba(164,198,57,0.95)]"
      />

      {/* ─── 2. TOP FLOATING BRAND & CONTROLS (TACTICAL OLIVE GREEN) ─────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-10 lg:px-14 pt-4 sm:pt-6 flex items-center justify-between pointer-events-none select-none">
        {/* Left: Brand / Company Name */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <Shield className="w-5 h-5 text-[#a4c639]" />
          <span className="font-heading font-extrabold text-sm sm:text-base tracking-wider uppercase text-white">
            VANGUARD <span className="text-[#a4c639] font-mono text-xs font-semibold">DEFENSE</span>
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-[#33401c]/90 text-[#a4c639] border border-[#526a27]">
            D-05 // HACKHERTZ 2026
          </span>
        </div>

        {/* Center: Tactical Track Badge Pill */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/85 border border-[#526a27]/60 shadow-[0_0_15px_rgba(51,64,28,0.5)] text-[10px] font-mono text-[#a4c639] pointer-events-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-[#a4c639] animate-ping shadow-[0_0_8px_#a4c639]" />
          <span>PROBLEM ID D-05 · 114 INVARIANT TESTS PASSING</span>
        </div>

        {/* Right: Tactical Light/Dark Switch & Launch COP */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Tactical Segmented Light / Dark Switch */}
          <div
            className={`flex items-center p-0.5 rounded-full ${glassPillClass} border shadow-xl relative backdrop-blur-xl ${
              isDark ? 'border-[#526a27]/40 bg-black/60' : 'border-slate-300 bg-white/80'
            }`}
          >
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`relative flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-colors cursor-pointer z-10 ${
                !isDark ? 'text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className={`w-3 h-3 ${!isDark ? 'text-amber-500' : 'text-slate-400'}`} />
              <span>LIGHT</span>
              {!isDark && (
                <motion.div
                  layoutId="activeThemeCapsule"
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  className="absolute inset-0 rounded-full bg-white shadow-md border border-slate-200 -z-10"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`relative flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-colors cursor-pointer z-10 ${
                isDark ? 'text-[#a4c639] font-black' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Moon className={`w-3 h-3 ${isDark ? 'text-[#a4c639]' : 'text-slate-500'}`} />
              <span>DARK</span>
              {isDark && (
                <motion.div
                  layoutId="activeThemeCapsule"
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  className="absolute inset-0 rounded-full bg-[#33401c] border border-[#526a27] shadow-[0_0_12px_rgba(82,106,39,0.5)] -z-10"
                />
              )}
            </button>
          </div>

          {/* Quick Launch COP Button (Tactical Olive / Lime) */}
          <motion.button
            type="button"
            onClick={onLaunchCop}
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#a4c639] hover:bg-[#b8dd42] text-slate-950 font-mono text-xs font-black tracking-wider uppercase shadow-[0_0_22px_rgba(164,198,57,0.65)] border border-[#c6ff00]/40 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
            <span>Launch COP</span>
          </motion.button>
        </div>
      </header>

      {/* ─── FLOATING TACTICAL SECTION HUD ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        className="fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden 2xl:flex flex-col gap-2 font-mono text-[10px] select-none"
      >
        {[
          { label: '01 HERO', href: '#hero' },
          { label: '02 TELEMETRY', href: '#telemetry' },
          { label: '03 STORY', href: '#story' },
          { label: '04 PLATFORM', href: '#what-it-does' },
          { label: '05 PIPELINE', href: '#how-it-works' },
          { label: '06 LAB', href: '#live-labs' },
          { label: '07 DEPLOY', href: '#deployment' },
          { label: '08 TEAM', href: '#team' },
        ].map((sec) => (
          <a
            key={sec.label}
            href={sec.href}
            className={`px-3 py-1.5 rounded-full ${glassPillClass} border transition-all hover:scale-105 flex items-center gap-2 ${
              isDark
                ? 'text-slate-400 hover:text-[#a4c639] hover:border-[#526a27]'
                : 'text-slate-600 hover:text-slate-950 hover:border-lime-500/60 shadow-sm'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#a4c639] opacity-80 shadow-[0_0_6px_#a4c639]" />
            <span className="font-semibold whitespace-nowrap">{sec.label}</span>
          </a>
        ))}
      </motion.div>

      {/* ─── 3. MINUTE TACTICAL & AEROSPACE BACKGROUND DOODLES + CYBER GRID ───────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Aerospace & Tactical Vector Doodles */}
        <svg
          className="w-full h-full animate-doodles opacity-50"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="doodleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#526a27" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#a4c639" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#526a27" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* 1. Top Left Flight Corridor Vectors */}
          <g stroke="rgba(82, 106, 39, 0.4)" strokeWidth="1" fill="none">
            <path d="M 60 120 L 260 120 L 320 160" strokeDasharray="4 4" />
            <circle cx="60" cy="120" r="2.5" fill="#526a27" />
            <circle cx="320" cy="160" r="2" fill="#a4c639" />
            <text x="70" y="112" fill="#a4c639" fontSize="9" fontFamily="monospace" letterSpacing="1">
              CORRIDOR_ALPHA // ALT 34.2K
            </text>
          </g>

          {/* 2. Top Right Telemetry Pitch Ladder */}
          <g stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" fill="none">
            <line x1="1480" y1="80" x2="1540" y2="80" />
            <line x1="1480" y1="80" x2="1480" y2="90" />
            <line x1="1540" y1="80" x2="1540" y2="90" />
            <text x="1548" y="84" fill="rgba(255, 255, 255, 0.35)" fontSize="8" fontFamily="monospace">
              +15°
            </text>

            <line x1="1490" y1="120" x2="1530" y2="120" strokeDasharray="3 3" />
            <text x="1538" y="124" fill="rgba(255, 255, 255, 0.25)" fontSize="8" fontFamily="monospace">
              00° HORIZON
            </text>

            <line x1="1480" y1="160" x2="1540" y2="160" />
            <line x1="1480" y1="160" x2="1480" y2="150" />
            <line x1="1540" y1="160" x2="1540" y2="150" />
            <text x="1548" y="164" fill="rgba(255, 255, 255, 0.35)" fontSize="8" fontFamily="monospace">
              -15°
            </text>
          </g>

          {/* 3. Tactical Reticles and Coordinate Ticks */}
          <g stroke="rgba(82, 106, 39, 0.35)" strokeWidth="1" fill="none">
            <path d="M 940 70 L 980 70 M 960 50 L 960 90" strokeDasharray="2 2" />
            <circle cx="960" cy="70" r="14" stroke="rgba(82, 106, 39, 0.25)" strokeDasharray="3 3" />
            <text x="986" y="73" fill="rgba(82, 106, 39, 0.5)" fontSize="8" fontFamily="monospace">
              LAT 23°02&apos;N // LNG 72°57&apos;E [SECTOR 04]
            </text>

            <circle cx="180" cy="540" r="18" stroke="rgba(82, 106, 39, 0.45)" />
            <circle cx="180" cy="540" r="4" fill="rgba(164, 198, 57, 0.6)" />
            <path d="M 155 540 L 170 540 M 190 540 L 205 540 M 180 515 L 180 530 M 180 550 L 180 565" stroke="rgba(82, 106, 39, 0.5)" />
            <text x="150" y="580" fill="rgba(164, 198, 57, 0.75)" fontSize="8" fontFamily="monospace">
              TARGET_TRACK [LOCK_ACQ: 260KT]
            </text>
          </g>

          {/* 4. Orbital Curved Splines & Azimuth Compass Arc */}
          <g stroke="url(#doodleGrad)" strokeWidth="1" fill="none">
            <path d="M 1200 180 C 1380 260, 1540 400, 1680 620" strokeDasharray="6 6" />
            <path d="M 1220 195 C 1390 270, 1530 395, 1660 590" opacity="0.5" />
            <text x="1340" y="240" fill="rgba(82, 106, 39, 0.4)" fontSize="8" fontFamily="monospace">
              AZIMUTH_SWEEP: 042° -&gt; 098°
            </text>
          </g>

          {/* 5. Bottom Left Micro Grid Crosshairs */}
          <g fill="rgba(255, 255, 255, 0.15)">
            <text x="80" y="980" fontSize="9" fontFamily="monospace">
              + + + +
            </text>
            <text x="80" y="1005" fontSize="8" fontFamily="monospace" fill="rgba(82, 106, 39, 0.45)">
              VGD-C2 // ARCH_V4.8.2 // INVARIANTS: 114 PASS
            </text>
          </g>

          {/* 6. Subtle Velocity Vector Lines */}
          <g stroke="rgba(255, 255, 255, 0.14)" strokeWidth="0.75" strokeDasharray="3 6">
            <line x1="380" y1="280" x2="480" y2="240" />
            <line x1="420" y1="360" x2="540" y2="310" />
            <line x1="300" y1="420" x2="450" y2="370" />
          </g>
        </svg>

        {/* Animated Cyber Grid Layer (Tactical Olive Green on Void Black) */}
        <div className={`absolute inset-0 ${gridBackgroundClass} radial-grid-mask opacity-75`} />

        {/* Interactive Mouse-Tracking Spotlight over the Cyber Grid */}
        <div
          className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, ${
              isDark ? 'rgba(82, 106, 39, 0.12)' : 'rgba(82, 106, 39, 0.08)'
            }, transparent 70%)`,
          }}
        />

        {/* Subtle Floating Ambient Mesh Orbs (Tactical Green) */}
        {isDark ? (
          <>
            <motion.div
              style={{ y: orbY1 }}
              animate={{
                x: [0, 50, -25, 0],
                scale: [1, 1.1, 0.95, 1],
              }}
              transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/6 left-1/5 w-[600px] h-[400px] bg-[#33401c]/25 blur-[160px] rounded-full"
            />
            <motion.div
              style={{ y: orbY2 }}
              animate={{
                x: [0, -40, 40, 0],
                scale: [1, 1.08, 0.95, 1],
              }}
              transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/2 right-10 w-[550px] h-[550px] bg-[#33401c]/30 blur-[170px] rounded-full"
            />
          </>
        ) : (
          <>
            <motion.div
              style={{ y: orbY1 }}
              animate={{
                x: [0, 60, -30, 0],
                scale: [1, 1.15, 0.92, 1],
              }}
              transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/6 left-1/5 w-[600px] h-[450px] bg-[#526a27]/15 blur-[150px] rounded-full"
            />
          </>
        )}
      </div>

      {/* ─── 4. MONUMENTAL HERO: DESIGNER YERPUDE MASTER FRAME ──────────────────────── */}
      <motion.section
        id="hero"
        style={{ y: heroY, scale: heroScale, opacity: heroOpacity, filter: heroFilter }}
        className="relative w-screen h-screen min-h-[100dvh] max-h-screen bg-[#000000] text-white overflow-hidden select-none font-sans flex flex-col justify-between pt-16 pb-3 sm:pb-4 px-4 sm:px-8 lg:px-12 z-10"
      >

        {/* HORIZONTAL TACTICAL HIGHLIGHT BAR BEHIND VANGUARD */}
        <div className="relative w-full flex items-center justify-center z-20 mb-2 mt-auto pt-24 sm:pt-28 md:pt-32">
          {/* Tactical Olive Green Highlight Bar (#33401c) */}
          <div className="absolute inset-x-0 h-11 sm:h-13 md:h-14 bg-[#33401c] flex items-center justify-between z-0 border-y border-[#526a27]/70 shadow-[0_0_35px_rgba(51,64,28,0.85)]">
            {/* Left Vertical Accent */}
            <div className="w-2.5 sm:w-3.5 h-full bg-[#526a27] shadow-[0_0_12px_#526a27]" />
            {/* Right Horizontal Accent Tab with Tactical Lime Glow */}
            <div className="w-10 sm:w-14 h-2 sm:h-2.5 bg-[#a4c639] mr-24 sm:mr-36 md:mr-44 shadow-[0_0_14px_rgba(164,198,57,0.85)]" />
          </div>

          {/* VANGUARD GIANT HEADLINE WITH TACTICAL SHADE GLOW */}
          <h1
            className="relative z-10 font-vanguard font-black uppercase text-white tracking-[0.035em] text-[13.5vw] sm:text-[12.5vw] md:text-[11.2vw] lg:text-[10.5vw] leading-none select-none text-center"
            style={{
              filter:
                'drop-shadow(0 0 16px rgba(82, 106, 39, 0.95)) drop-shadow(0 0 35px rgba(51, 64, 28, 0.9)) drop-shadow(0 0 70px rgba(51, 64, 28, 0.6))',
            }}
          >
            VANGUARD
          </h1>
        </div>

        {/* BOTTOM BEVELED TACTICAL FRAME CONTAINER */}
        <div className="relative w-full max-w-[1580px] mx-auto z-10 mb-2">
          <div className="relative w-full min-h-[190px] sm:min-h-[210px] md:min-h-[225px] p-5 sm:p-7 flex flex-col justify-between">
            {/* SVG Crisp Chamfered Border & Black Background */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              preserveAspectRatio="none"
              viewBox="0 0 1000 400"
            >
              <path
                d="M 38 0 L 1000 0 L 1000 400 L 0 400 L 0 38 Z"
                fill="#000000"
                stroke="rgba(255, 255, 255, 0.28)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* Top Frame Accents (Marker Pills) */}
            <div className="relative z-10 flex items-center justify-between w-full pt-0.5">
              <div className="flex items-center gap-3 ml-6 sm:ml-8">
                <div className="w-8 sm:w-10 h-2 bg-[#526a27] shadow-[0_0_8px_#33401c]" />
                <span className="text-[10px] font-mono text-[#a4c639] tracking-widest uppercase font-bold">
                  DEFENSE TRACK · HACKHERTZ 2026 · PROBLEM ID D-05 · 114 INVARIANTS PASS
                </span>
              </div>
              <div className="w-8 sm:w-10 h-2 bg-[#526a27] mr-56 sm:mr-72 md:mr-88 shadow-[0_0_8px_#33401c]" />
            </div>

            {/* Bottom Content Area (Split Text & Merged Functionality) */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 items-end pb-3 pt-6 sm:pt-8">
              {/* Left Column: "Exploring the Skies & Beyond" */}
              <div className="md:col-span-6 pl-2 sm:pl-8">
                <p className="text-[#a4c639] font-sans font-bold text-sm sm:text-base md:text-lg lg:text-xl leading-tight tracking-tight drop-shadow-[0_0_8px_rgba(51,64,28,0.7)] mb-1">
                  Exploring the<br />
                  Skies &amp; Beyond
                </p>
                <h2 className="text-xs sm:text-sm font-heading font-extrabold uppercase tracking-wider text-slate-200">
                  Multi-Source Defence Situational Awareness System
                </h2>

                {/* Tactical Typewriter Pill */}
                <div className="mt-2.5 inline-flex items-center gap-2 text-xs font-mono bg-black/80 px-3.5 py-1.5 rounded-lg border border-[#526a27]/50 shadow-lg text-slate-200">
                  <span className="text-[#a4c639] font-bold">&gt;</span>
                  <TacticalTypewriter
                    words={HERO_TYPEWRITER_PHRASES}
                    typingSpeed={45}
                    deletingSpeed={22}
                    pauseDuration={2800}
                    className="font-mono font-semibold"
                    cursorClassName="text-[#a4c639]"
                  />
                </div>
              </div>

              {/* Right Column: "Science, Technology, and the Future of Flight" */}
              <div className="md:col-span-6 pr-36 sm:pr-48 md:pr-60 lg:pr-72">
                <p className="text-[#a4c639] font-sans font-bold text-xs sm:text-sm md:text-base leading-tight tracking-tight drop-shadow-[0_0_8px_rgba(51,64,28,0.7)] mb-1">
                  Science, Technology, and<br />
                  the Future of Flight
                </p>
                <p className="text-xs font-sans text-slate-300 leading-relaxed max-w-md">
                  From fragmented sensor streams to one explainable, unified operational picture. Ingests 5 feeds, calculates mathematical confidence, and coordinates instant response with zero hallucinations.
                </p>

                {/* Action CTAs (Tactical Olive Green & Lime Highlight) */}
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <motion.button
                    type="button"
                    onClick={onLaunchCop}
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#a4c639] hover:bg-[#b8dd42] text-slate-950 font-mono font-black text-xs tracking-wider uppercase shadow-[0_0_24px_rgba(164,198,57,0.55)] border border-[#c6ff00]/40 cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
                    <span>Launch COP</span>
                    <ArrowRight className="w-3 h-3" />
                  </motion.button>

                  <a
                    href="#telemetry"
                    onClick={(e) => {
                      e.preventDefault();
                      document.querySelector('#telemetry')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-black/60 hover:bg-[#33401c]/40 border border-[#526a27]/60 text-slate-200 hover:text-white font-mono text-xs uppercase tracking-wide transition-all"
                  >
                    <Compass className="w-3.5 h-3.5 text-[#a4c639]" />
                    <span>Telemetry</span>
                  </a>

                  <motion.button
                    type="button"
                    onClick={() => setBriefingModalOpen(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-black/40 hover:bg-white/10 border border-white/20 text-slate-300 hover:text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <Satellite className="w-3.5 h-3.5 text-[#a4c639]" />
                    <span>Briefing</span>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Pinned Bottom Scroll Prompt */}
            <div className="relative z-10 flex justify-center w-full pt-1">
              <motion.a
                href="#telemetry"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('#telemetry')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-2 text-[10px] font-mono uppercase text-[#a4c639] hover:text-[#c6ff00] transition-colors cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#a4c639] animate-ping shadow-[0_0_8px_#a4c639]" />
                <span>Scroll to Engage Defense Telemetry &amp; Intelligence Grid ↓</span>
              </motion.a>
            </div>
          </div>
        </div>

      </motion.section>

      {/* ─── 5. DUAL HARDWARE SHOWCASE: 3D GLOBE & KINEMATIC RADAR (SCROLL REVEAL) ──── */}
      <section id="telemetry" className={`py-28 border-t ${sectionBorderClass} relative z-10`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ${glassPillClass} text-xs font-mono text-[#a4c639] mb-4 border border-[#526a27]/50 bg-[#33401c]/30`}>
              <Radio className="w-4 h-4 text-[#a4c639] animate-pulse" />
              <span>MULTI-DOMAIN TELEMETRY SHOWCASE</span>
            </div>
            <h2 className={`font-heading text-3xl sm:text-5xl font-extrabold uppercase ${textHeadingColor}`}>
              Global Threat Sphere & Radar Sweep
            </h2>
            <p className={`mt-4 text-sm sm:text-base leading-relaxed ${textBodyColor}`}>
              Orthographic spatial tracking synchronized with high-precision rotational kinematic sweeps.
            </p>
          </motion.div>

          {/* DUAL 21st.dev HARDWARE SHOWCASE WITH SMOOTH SCROLL REVEAL */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-center text-left"
          >
            {/* Left Showcase: Wireframe Dotted Globe (moazamtrade / 21st.dev) */}
            <div className={`lg:col-span-7 ${glassPanelGlowClass} rounded-3xl p-6 relative overflow-hidden`}>
              <div className={`flex items-center justify-between mb-4 border-b ${sectionBorderClass} pb-3`}>
                <div className="flex items-center gap-2.5">
                  <Compass className="w-5 h-5 text-[#a4c639] animate-spin" style={{ animationDuration: '25s' }} />
                  <div>
                    <h3 className={`font-heading font-extrabold text-base tracking-wider uppercase ${textHeadingColor}`}>
                      3D Global Threat Sphere
                    </h3>
                    <p className={`text-[10px] font-mono ${textMutedColor}`}>
                      Orthographic Multi-Sensor Spatial Grid
                    </p>
                  </div>
                </div>
                <div className={`text-[11px] font-mono text-[#a4c639] ${glassPillClass} px-3 py-1 rounded-full border border-[#526a27]/60 bg-[#33401c]/50`}>
                  ORBIT: SECTOR 04 GUJARAT
                </div>
              </div>

              {/* Embedded Interactive 3D Dotted Globe */}
              <div className="w-full flex justify-center items-center py-2">
                <WireframeDottedGlobe
                  width={520}
                  height={430}
                  className="w-full max-w-full"
                  interactive={true}
                  theme={theme}
                />
              </div>

              {/* Globe Telemetry Footer */}
              <div className={`mt-3 pt-3 border-t ${sectionBorderClass} grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[10px] font-mono ${textMutedColor}`}>
                <div>
                  HQ NODE: <span className="text-[#a4c639] font-bold">23.02°N, 72.57°E</span>
                </div>
                <div>
                  STREAM: <span className="text-emerald-400 font-bold">5 LIVE FEEDS</span>
                </div>
                <div>
                  PROJECTION: <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>D3 ORTHOGRAPHIC</span>
                </div>
                <div>
                  SURFACE: <span className="text-[#a4c639] font-bold">CONTINUOUS ORBIT</span>
                </div>
              </div>
            </div>

            {/* Right Showcase: LoadingRadar (ruhith369 / 21st.dev) */}
            <div className={`lg:col-span-5 ${glassPanelGlowClass} rounded-3xl p-6 flex flex-col items-center justify-between relative overflow-hidden`}>
              <div className={`w-full flex items-center justify-between mb-4 border-b ${sectionBorderClass} pb-3`}>
                <div className="flex items-center gap-2.5">
                  <Radar className="w-5 h-5 text-[#a4c639] animate-pulse" />
                  <div>
                    <h3 className={`font-heading font-extrabold text-base tracking-wider uppercase ${textHeadingColor}`}>
                      Sector 04 Kinematic Radar
                    </h3>
                    <p className={`text-[10px] font-mono ${textMutedColor}`}>
                      High-Precision Rotational Target Sweep
                    </p>
                  </div>
                </div>
                <span className={`${glassPillClass} px-2.5 py-0.5 rounded text-[10px] font-mono text-[#a4c639] border border-[#526a27]/60 bg-[#33401c]/50`}>
                  radar81 (2.0s)
                </span>
              </div>

              {/* Embedded Interactive Radar with Target Inspection */}
              <div className="py-2">
                <LoadingRadar
                  size="hero"
                  colorScheme="olive"
                  showContacts={true}
                  interactiveControls={true}
                  onSelectContact={(c) => setInspectedContact(c)}
                  theme={theme}
                />
              </div>

              {/* Live Target Contact Glass Card */}
              <div className={`w-full mt-3 p-3.5 ${glassPanelClass} rounded-2xl text-xs font-mono border border-[#526a27]/50 bg-[#33401c]/30`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={textMutedColor}>PRIMARY TRACK:</span>
                  <span className="text-rose-500 font-bold uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    UNID-TRACK-892 (260 KT)
                  </span>
                </div>
                <p className={`text-[11px] leading-normal ${textBodyColor}`}>
                  Bearing 042°, ΔR 4.2km from Sector 04 perimeter. Corroborated across radar, visual
                  patrol telemetry, and perimeter IR trip.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 5. THE MISSION STORY: SECTOR 04 INTERCEPT (SCROLL REVEAL) ────────────── */}
      <section id="story" className={`py-24 border-y ${sectionBorderClass} relative z-10`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ${glassPillClass} text-xs font-mono text-[#a4c639] mb-4 border border-[#526a27]/50 bg-[#33401c]/30`}>
              <Crosshair className="w-4 h-4 text-[#a4c639]" />
              <span>THE OPERATIONAL NARRATIVE</span>
            </div>
            <h2 className={`font-heading text-3xl sm:text-5xl font-extrabold uppercase ${textHeadingColor}`}>
              Sector 04: Anatomy of an Intercept
            </h2>
            <p className={`mt-4 text-sm sm:text-base leading-relaxed ${textBodyColor}`}>
              Step into the watchstander’s shoes. Watch how VANGUARD transforms fragmented chaos into
              mathematical certainty during a coordinated intrusion.
            </p>
          </motion.div>

          {/* Story Chapter Stepper Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {STORY_CHAPTERS.map((chap, idx) => (
              <motion.button
                key={chap.step}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveChapterIndex(idx)}
                className={`p-4 rounded-2xl font-mono text-left transition-all cursor-pointer ${
                  activeChapterIndex === idx
                    ? `${glassPanelGlowClass} border-[#a4c639] shadow-[0_0_25px_rgba(164,198,57,0.35)] scale-[1.02]`
                    : `${glassPanelClass} opacity-70 hover:opacity-100`
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#a4c639]">PHASE {chap.step}</span>
                  <span className={`text-[10px] ${textMutedColor}`}>{chap.time}</span>
                </div>
                <div className={`font-heading font-bold text-sm uppercase truncate ${textHeadingColor}`}>
                  {chap.title}
                </div>
              </motion.button>
            ))}
          </div>

          {/* Active Story Chapter Display Card with Smooth Motion AnimatePresence */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeChapter.step}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={`${glassPanelGlowClass} rounded-3xl p-6 sm:p-10 relative overflow-hidden`}
            >
              <div className={`flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b ${sectionBorderClass} mb-8`}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border ${getChapterTagClass(activeChapter.step)}`}>
                      {activeChapter.tag}
                    </span>
                    <span className={`text-xs font-mono ${textMutedColor}`}>
                      TIMECODE: <span className="font-bold text-[#a4c639]">{activeChapter.time}</span>
                    </span>
                  </div>
                  <h3 className={`font-heading text-2xl sm:text-4xl font-extrabold uppercase ${textHeadingColor}`}>
                    {activeChapter.title}
                  </h3>
                  <p className="text-xs sm:text-sm font-mono text-[#a4c639] mt-1 font-semibold">
                    {activeChapter.subtitle}
                  </p>
                </div>

                <div className={`${glassPillClass} px-5 py-2.5 rounded-2xl text-right`}>
                  <div className={`text-[10px] font-mono uppercase ${textMutedColor}`}>TACTICAL STATUS</div>
                  <div className="text-base font-mono font-bold text-emerald-400">{activeChapter.status}</div>
                </div>
              </div>

              {/* Narrative Body */}
              <p className={`text-sm sm:text-lg font-sans leading-relaxed max-w-4xl ${textBodyColor}`}>
                {activeChapter.description}
              </p>

              {/* Key Telemetry Metrics Grid */}
              <div className={`mt-8 pt-6 border-t ${sectionBorderClass} grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs`}>
                {activeChapter.metrics.map((m) => (
                  <div key={m.label} className={`p-4 ${glassPanelClass} rounded-2xl`}>
                    <div className={`text-[11px] mb-1 uppercase ${textMutedColor}`}>{m.label}</div>
                    <div className="text-base font-bold text-[#a4c639]">{m.value}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ─── 6. WHAT VANGUARD DOES: CORE CAPABILITIES ─────────────────────────────── */}
      <section id="what-it-does" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ${glassPillClass} text-xs font-mono text-[#a4c639] mb-4 border border-[#526a27]/50 bg-[#33401c]/30`}>
              <Zap className="w-4 h-4 text-[#a4c639]" />
              <span>PLATFORM CAPABILITIES</span>
            </div>
            <h2 className={`font-heading text-3xl sm:text-5xl font-extrabold uppercase ${textHeadingColor}`}>
              What VANGUARD Does
            </h2>
            <p className={`mt-4 text-sm sm:text-base leading-relaxed ${textBodyColor}`}>
              Engineered specifically for defense watchstanders facing multi-domain sensor overload.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            {/* Capability 1 */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -6, scale: 1.015 }}
              className={`${glassCardClass} rounded-3xl p-7 flex flex-col justify-between`}
            >
              <div>
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-5 ${
                  isDark ? 'bg-[#33401c]/80 border-[#526a27] text-[#a4c639] shadow-[0_0_20px_rgba(82,106,39,0.35)]' : 'bg-lime-100/90 border-lime-300 text-lime-800 shadow-sm'
                }`}>
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className={`font-heading text-2xl font-bold uppercase ${textHeadingColor} mb-2.5`}>
                  Multi-Source Spatiotemporal Fusion
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed font-sans ${textBodyColor}`}>
                  Normalizes 5 heterogeneous feeds (radar tracks, infrared fence trips, visual patrol
                  sightings, dispatch reports, and live Open-Meteo weather) into a unified dataset.
                  Correlates them in milliseconds using Haversine distance (&Delta;R &le; 5km) and temporal
                  clustering (&Delta;T &le; 600s) with Union-Find closure.
                </p>
              </div>
              <div className={`mt-6 pt-4 border-t ${sectionBorderClass} text-xs font-mono text-[#a4c639] flex items-center gap-1.5 font-bold`}>
                <span>Deduplicates false re-reports</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </motion.div>

            {/* Capability 2 */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -6, scale: 1.015 }}
              className={`${glassCardClass} rounded-3xl p-7 flex flex-col justify-between`}
            >
              <div>
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-5 ${
                  isDark ? 'bg-[#33401c]/80 border-[#526a27] text-[#a4c639] shadow-[0_0_20px_rgba(82,106,39,0.35)]' : 'bg-lime-100/90 border-lime-300 text-lime-800 shadow-sm'
                }`}>
                  <Sliders className="w-6 h-6" />
                </div>
                <h3 className={`font-heading text-2xl font-bold uppercase ${textHeadingColor} mb-2.5`}>
                  Explainable Confidence Arithmetic
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed font-sans ${textBodyColor}`}>
                  Eliminates black-box guesses. Confidence is calculated using deterministic formula:
                  min(100, round(Rs &times; Dt &times; Bc &times; 100)). Generates a live counterfactual score
                  proving exactly how much multi-source corroboration boosted certainty over isolated
                  sensors.
                </p>
              </div>
              <div className={`mt-6 pt-4 border-t ${sectionBorderClass} text-xs font-mono text-[#a4c639] flex items-center gap-1.5 font-bold`}>
                <span>Counterfactual gain (+8% to +35%)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </motion.div>

            {/* Capability 3 */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -6, scale: 1.015 }}
              className={`${glassCardClass} rounded-3xl p-7 flex flex-col justify-between`}
            >
              <div>
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-5 ${
                  isDark ? 'bg-[#33401c]/80 border-[#526a27] text-[#a4c639] shadow-[0_0_20px_rgba(82,106,39,0.35)]' : 'bg-lime-100/90 border-lime-300 text-lime-800 shadow-sm'
                }`}>
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className={`font-heading text-2xl font-bold uppercase ${textHeadingColor} mb-2.5`}>
                  Anti-Hallucination Grounding Gate
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed font-sans ${textBodyColor}`}>
                  The language model is purely a presentation layer. Before any briefing or Course of
                  Action is shown, an automated code gate in <code className="text-[#a4c639] font-mono">ai/grounding.ts</code>{' '}
                  cross-references every citation against the physical event store, stripping fabricated
                  claims with 100% honesty.
                </p>
              </div>
              <div className={`mt-6 pt-4 border-t ${sectionBorderClass} text-xs font-mono text-[#a4c639] flex items-center gap-1.5 font-bold`}>
                <span>0 ungrounded citations guarantee</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </motion.div>

            {/* Capability 4 */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -6, scale: 1.015 }}
              className={`${glassCardClass} rounded-3xl p-7 flex flex-col justify-between`}
            >
              <div>
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-5 ${
                  isDark ? 'bg-[#33401c]/80 border-[#526a27] text-[#a4c639] shadow-[0_0_20px_rgba(82,106,39,0.35)]' : 'bg-lime-100/90 border-lime-300 text-lime-800 shadow-sm'
                }`}>
                  <Server className="w-6 h-6" />
                </div>
                <h3 className={`font-heading text-2xl font-bold uppercase ${textHeadingColor} mb-2.5`}>
                  Air-Gapped & Degraded Comms Resilience
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed font-sans ${textBodyColor}`}>
                  Runs with zero external dependencies. No internet, no database, no cloud keys
                  required. When communications are severed or jammed, feed health coupling directly
                  scales the confidence arithmetic, so scores across the board fall transparently.
                </p>
              </div>
              <div className={`mt-6 pt-4 border-t ${sectionBorderClass} text-xs font-mono text-[#a4c639] flex items-center gap-1.5 font-bold`}>
                <span>100% offline edge operational</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 7. HOW IT WORKS: THE 3-STEP PIPELINE (SCROLL STAGGER) ────────────────── */}
      <section id="how-it-works" className={`py-24 border-y ${sectionBorderClass} relative z-10`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ${glassPillClass} text-xs font-mono text-[#a4c639] mb-4 border border-[#526a27]/50 bg-[#33401c]/30`}>
              <Workflow className="w-4 h-4 text-[#a4c639]" />
              <span>THE OPERATIONAL ARCHITECTURE</span>
            </div>
            <h2 className={`font-heading text-3xl sm:text-5xl font-extrabold uppercase ${textHeadingColor}`}>
              How VANGUARD Works
            </h2>
            <p className={`mt-4 text-sm sm:text-base leading-relaxed ${textBodyColor}`}>
              A 3-step deterministic execution loop running on a strict 3,000ms tick cadence.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={`${glassPanelGlowClass} rounded-3xl p-7 relative`}
            >
              <div className="flex items-center justify-between mb-5">
                <span className={`w-9 h-9 rounded-xl border font-mono text-sm flex items-center justify-center font-extrabold ${
                  isDark ? 'bg-[#33401c] border-[#526a27] text-[#a4c639]' : 'bg-lime-100 border-lime-400 text-lime-900'
                }`}>
                  01
                </span>
                <span className={`text-[10px] font-mono uppercase tracking-widest ${textMutedColor}`}>
                  Ingest & Normalize
                </span>
              </div>
              <h3 className={`font-heading text-xl font-bold uppercase mb-2 ${textHeadingColor}`}>
                Unified Sensor Schema
              </h3>
              <p className={`text-xs font-mono leading-relaxed ${textBodyColor}`}>
                Raw radar sweeps, patrol orbits, sensor trips, weather logs, and dispatches are validated
                at the ingest boundary into standard <code className="text-[#a4c639]">UnifiedEvent</code>{' '}
                v1.1 contracts.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`${glassPanelGlowClass} rounded-3xl p-7 relative`}
            >
              <div className="flex items-center justify-between mb-5">
                <span className={`w-9 h-9 rounded-xl border font-mono text-sm flex items-center justify-center font-extrabold ${
                  isDark ? 'bg-[#33401c] border-[#526a27] text-[#a4c639]' : 'bg-lime-100 border-lime-400 text-lime-900'
                }`}>
                  02
                </span>
                <span className={`text-[10px] font-mono uppercase tracking-widest ${textMutedColor}`}>
                  6-Stage Fusion Engine
                </span>
              </div>
              <h3 className={`font-heading text-xl font-bold uppercase mb-2 ${textHeadingColor}`}>
                Spatiotemporal Correlation
              </h3>
              <p className={`text-xs font-mono leading-relaxed ${textBodyColor}`}>
                Executes in 2–37ms: 1. Dedupe &rarr; 2. Correlate (Union-Find, &Delta;R &le; 5km) &rarr;
                3. Corroborate &rarr; 4. Score confidence &rarr; 5. Statistical z-score anomalies &rarr;
                6. Posture escalation.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className={`${glassPanelGlowClass} rounded-3xl p-7 relative`}
            >
              <div className="flex items-center justify-between mb-5">
                <span className={`w-9 h-9 rounded-xl border font-mono text-sm flex items-center justify-center font-extrabold ${
                  isDark ? 'bg-[#33401c] border-[#526a27] text-[#a4c639]' : 'bg-lime-100 border-lime-400 text-lime-900'
                }`}>
                  03
                </span>
                <span className={`text-[10px] font-mono uppercase tracking-widest ${textMutedColor}`}>
                  Grounded Output & C2
                </span>
              </div>
              <h3 className={`font-heading text-xl font-bold uppercase mb-2 ${textHeadingColor}`}>
                Decision Support & Actions
              </h3>
              <p className={`text-xs font-mono leading-relaxed ${textBodyColor}`}>
                Delivers full REST and WebSocket broadcast streams to the Command Center. Generates
                grounded situational briefings, ranked COAs, and an immutable 4D time scrubber for post-mission review.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 8. HANDS-ON CONFIDENCE CALCULATOR ────────────────────────────────────── */}
      <section id="live-labs" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ${glassPillClass} text-xs font-mono text-[#a4c639] mb-4 border border-[#526a27]/50 bg-[#33401c]/30`}>
              <Sliders className="w-4 h-4 text-[#a4c639]" />
              <span>HANDS-ON TELEMETRY LAB</span>
            </div>
            <h2 className={`font-heading text-3xl sm:text-5xl font-extrabold uppercase ${textHeadingColor}`}>
              Interactive Confidence Arithmetic
            </h2>
            <p className={`mt-4 text-sm sm:text-base leading-relaxed ${textBodyColor}`}>
              Test VANGUARD’s live confidence calculation algorithm in real time.
            </p>
          </motion.div>

          {/* Interactive Confidence Arithmetic Calculator */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`${glassPanelGlowClass} rounded-3xl p-6 sm:p-10 relative overflow-hidden`}
          >
            <div className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-6 border-b ${sectionBorderClass}`}>
              <div>
                <span className="text-xs font-mono text-[#a4c639] uppercase tracking-widest font-bold">
                  TRANSPARENT CONFIDENCE FORMULA
                </span>
                <h3 className={`font-heading text-2xl sm:text-3xl font-extrabold uppercase mt-1 ${textHeadingColor}`}>
                  Confidence = min(100, round(Rs &times; Dt &times; Bc &times; 100))
                </h3>
              </div>
              <div className={`${glassPillClass} px-4 py-1.5 rounded-full font-mono text-xs text-[#a4c639] font-bold border border-[#526a27] bg-[#33401c]/60`}>
                Counterfactual Fusion Audit
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Sliders on Left */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <span className={textHeadingColor}>Source Reliability (Rs):</span>
                    <span className="text-[#a4c639] font-bold text-sm">{sourceReliability.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.40"
                    max="0.99"
                    step="0.01"
                    value={sourceReliability}
                    onChange={(e) => setSourceReliability(parseFloat(e.target.value))}
                    className={`w-full accent-[#a4c639] cursor-pointer h-2 ${sliderTrackClass} rounded-lg appearance-none`}
                  />
                  <div className={`flex justify-between text-[10px] font-mono mt-1 ${textMutedColor}`}>
                    <span>Field Dispatch (0.72)</span>
                    <span>Perimeter (0.80)</span>
                    <span>Radar (0.92)</span>
                    <span>Open-Meteo (0.95)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <span className={textHeadingColor}>Data Freshness Decay (Dt):</span>
                    <span className="text-[#a4c639] font-bold text-sm">{dataFreshness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.20"
                    max="1.00"
                    step="0.01"
                    value={dataFreshness}
                    onChange={(e) => setDataFreshness(parseFloat(e.target.value))}
                    className={`w-full accent-[#a4c639] cursor-pointer h-2 ${sliderTrackClass} rounded-lg appearance-none`}
                  />
                  <div className={`flex justify-between text-[10px] font-mono mt-1 ${textMutedColor}`}>
                    <span>Stale (&gt;10 min)</span>
                    <span>Recent (&lt;2 min)</span>
                    <span>Live Instant (1.00)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <span className={textHeadingColor}>Corroboration Multiplier (Bc):</span>
                    <span className="text-[#a4c639] font-bold text-sm">
                      {corroborationMultiplier.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.00"
                    max="1.60"
                    step="0.05"
                    value={corroborationMultiplier}
                    onChange={(e) => setCorroborationMultiplier(parseFloat(e.target.value))}
                    className={`w-full accent-[#a4c639] cursor-pointer h-2 ${sliderTrackClass} rounded-lg appearance-none`}
                  />
                  <div className={`flex justify-between text-[10px] font-mono mt-1 ${textMutedColor}`}>
                    <span>Single Source (1.0x)</span>
                    <span>Dual Feed (1.35x)</span>
                    <span>Max Cap (1.60x)</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Output Box on Right */}
              <div className={`lg:col-span-5 ${glassPanelClass} rounded-2xl p-6 sm:p-7 font-mono border border-[#526a27]/50 shadow-2xl`}>
                <div className={`text-xs mb-2 uppercase tracking-wide ${textMutedColor}`}>Calculated Output:</div>
                <div className="flex items-baseline gap-3">
                  <motion.div
                    key={rawConfidence}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="text-6xl font-heading font-extrabold text-[#a4c639] drop-shadow-[0_0_20px_rgba(164,198,57,0.4)]"
                  >
                    {rawConfidence}%
                  </motion.div>
                  <div className={`text-xs ${textBodyColor}`}>
                    Confidence Score
                  </div>
                </div>

                <div className={`mt-5 pt-4 border-t ${sectionBorderClass} space-y-2.5 text-xs`}>
                  <div className={`flex justify-between ${textBodyColor}`}>
                    <span>Without Corroboration:</span>
                    <span className="font-semibold">{baseWithoutCorroboration}%</span>
                  </div>
                  <div className="flex justify-between text-[#a4c639] font-bold text-sm">
                    <span>Counterfactual Fusion Gain:</span>
                    <span>+{counterfactualFusionGain}%</span>
                  </div>
                </div>

                <div className={`mt-5 p-3.5 border rounded-xl text-[11px] leading-normal backdrop-blur-md ${
                  isDark ? 'bg-[#33401c]/60 border-[#526a27]/60 text-slate-200' : 'bg-lime-50/90 border-lime-300 text-lime-950'
                }`}>
                  💡 <span className="font-bold">The Counterfactual</span> converts "we fuse sources"
                  from an empty marketing claim into an exact, verifiable quantity.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 9. ENTERPRISE DEPLOYMENTS ─────────────────────────────────────────────── */}
      <section id="deployment" className={`py-24 border-y ${sectionBorderClass} relative z-10`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ${glassPillClass} text-xs font-mono text-[#a4c639] mb-4 border border-[#526a27]/50 bg-[#33401c]/30`}>
              <Server className="w-4 h-4 text-[#a4c639]" />
              <span>DEPLOYMENT OPTIONS</span>
            </div>
            <h2 className={`font-heading text-3xl sm:text-5xl font-extrabold uppercase ${textHeadingColor}`}>
              Tactical Edge to Sovereign Command
            </h2>
            <p className={`mt-4 text-sm sm:text-base leading-relaxed ${textBodyColor}`}>
              Whether deployed on an air-gapped forward outpost or a distributed theater command.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Tier 1 */}
            <motion.div
              whileHover={{ y: -6 }}
              className={`${glassCardClass} rounded-3xl p-7 flex flex-col justify-between`}
            >
              <div>
                <div className={`text-xs font-mono uppercase tracking-wider ${textMutedColor}`}>
                  Edge Hardware
                </div>
                <h3 className={`font-heading text-2xl font-bold uppercase mt-1 ${textHeadingColor}`}>
                  Tactical Edge Node
                </h3>
                <div className="mt-4 text-3xl font-heading font-extrabold text-[#a4c639]">
                  Air-Gapped
                </div>
                <p className={`mt-2 text-xs font-mono ${textBodyColor}`}>
                  Zero cloud dependency. Operates entirely on embedded hardware with deterministic fusion.
                </p>

                <div className={`mt-6 space-y-3 font-mono text-xs ${textBodyColor}`}>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#a4c639] shrink-0" />
                    <span>Deterministic Fusion Engine</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#a4c639] shrink-0" />
                    <span>5 Default Ingest Adapters</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#a4c639] shrink-0" />
                    <span>Sub-60ms Tick Budget</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={onLaunchCop}
                  className={`w-full py-3 rounded-xl ${glassPanelClass} hover:bg-white/15 border border-white/20 font-mono text-xs font-bold uppercase transition-colors cursor-pointer ${textHeadingColor}`}
                >
                  Launch Local Console
                </button>
              </div>
            </motion.div>

            {/* Tier 2 */}
            <motion.div
              whileHover={{ y: -6 }}
              className={`${glassPanelGlowClass} rounded-3xl p-7 flex flex-col justify-between relative border-2 border-[#a4c639] shadow-[0_0_50px_rgba(82,106,39,0.45)]`}
            >
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#a4c639] text-slate-950 font-mono text-[10px] font-extrabold uppercase tracking-wider shadow-lg">
                Most Operational
              </div>
              <div>
                <div className="text-xs font-mono text-[#a4c639] uppercase tracking-wider font-semibold">
                  Headquarters COP
                </div>
                <h3 className={`font-heading text-2xl font-bold uppercase mt-1 ${textHeadingColor}`}>
                  Sector Command
                </h3>
                <div className={`mt-4 text-3xl font-heading font-extrabold ${textHeadingColor}`}>
                  Full Stack C2
                </div>
                <p className={`mt-2 text-xs font-mono ${textBodyColor}`}>
                  Comprehensive multi-source situational awareness with Gemini 2.0 grounded briefings.
                </p>

                <div className={`mt-6 space-y-3 font-mono text-xs ${textBodyColor}`}>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#a4c639] shrink-0" />
                    <span>Gemini 2.0 + Deterministic Dual Mode</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#a4c639] shrink-0" />
                    <span>30 REST Endpoints + 11 WS Frame Types</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#a4c639] shrink-0" />
                    <span>4D Time-Scrubber Audit Replay</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={onLaunchCop}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#526a27] via-[#a4c639] to-[#c6ff00] hover:brightness-110 font-mono text-xs font-extrabold uppercase text-slate-950 shadow-[0_0_25px_rgba(164,198,57,0.5)] transition-all cursor-pointer"
                >
                  Enter Operational COP
                </button>
              </div>
            </motion.div>

            {/* Tier 3 */}
            <motion.div
              whileHover={{ y: -6 }}
              className={`${glassCardClass} rounded-3xl p-7 flex flex-col justify-between`}
            >
              <div>
                <div className={`text-xs font-mono uppercase tracking-wider ${textMutedColor}`}>
                  Sovereign Cloud
                </div>
                <h3 className={`font-heading text-2xl font-bold uppercase mt-1 ${textHeadingColor}`}>
                  Enterprise Defense
                </h3>
                <div className="mt-4 text-3xl font-heading font-extrabold text-[#c6ff00]">
                  Federated C2
                </div>
                <p className={`mt-2 text-xs font-mono ${textBodyColor}`}>
                  Custom NATO standard telemetry protocols, classified network integrations.
                </p>

                <div className={`mt-6 space-y-3 font-mono text-xs ${textBodyColor}`}>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#a4c639] shrink-0" />
                    <span>Custom Sensor Adapter Pipelines</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#a4c639] shrink-0" />
                    <span>Multi-Theater Federation Grid</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#a4c639] shrink-0" />
                    <span>SITREP Automated PDF Export</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => setBriefingModalOpen(true)}
                  className={`w-full py-3 rounded-xl ${glassPanelClass} hover:bg-white/15 border border-white/20 font-mono text-xs font-bold uppercase transition-colors cursor-pointer ${textHeadingColor}`}
                >
                  Schedule Defense Briefing
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 10. TACTICAL TASK FORCE: DESTROYER OF WORLDS ───────────────────────────── */}
      <section id="team" className={`py-24 border-t ${sectionBorderClass} relative z-10 scroll-mt-6`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ${glassPillClass} text-xs font-mono text-[#a4c639] mb-4 border border-[#526a27]/50 bg-[#33401c]/30`}>
              <Users className="w-4 h-4 text-[#a4c639] animate-pulse" />
              <span>HACKHERTZ 2026 · DEFENSE TASK FORCE</span>
            </div>
            <h2 className={`font-heading text-3xl sm:text-5xl font-extrabold uppercase ${textHeadingColor}`}>
              Team <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a4c639] via-[#c6ff00] to-[#a4c639]">Destroyer of Worlds</span>
            </h2>
            <p className={`mt-4 text-sm sm:text-base leading-relaxed ${textBodyColor}`}>
              The engineering crew behind VANGUARD. Architecting multi-source defense situational
              awareness, deterministic confidence arithmetic, and zero-hallucination command support.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM_MEMBERS.map((member, idx) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: idx * 0.1 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                  member.isLeader
                    ? `${glassPanelGlowClass} border-[#a4c639]/60 shadow-[0_0_35px_rgba(82,106,39,0.35)]`
                    : `${glassCardClass}`
                }`}
              >
                <div>
                  {/* Top Corner Badge */}
                  <div className="flex items-center justify-between mb-5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
                        member.isLeader
                          ? isDark
                            ? 'bg-amber-400/15 text-amber-300 border-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                            : 'bg-amber-100 text-amber-900 border-amber-400 shadow-sm'
                          : isDark
                          ? 'bg-[#33401c]/80 text-[#a4c639] border-[#526a27]'
                          : 'bg-lime-100/90 text-lime-900 border-lime-300 shadow-sm'
                      }`}
                    >
                      {member.isLeader ? (
                        <>
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          <span>TEAM LEADER</span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-3 h-3 text-[#a4c639]" />
                          <span>TEAM MATE</span>
                        </>
                      )}
                    </span>

                    <span className={`text-[10px] font-mono ${textMutedColor}`}>
                      {member.callsign}
                    </span>
                  </div>

                  {/* Member Avatar / Tactical Monogram */}
                  <div className="mb-5 flex items-center gap-3.5">
                    <div
                      className={`w-14 h-14 rounded-2xl border flex items-center justify-center font-heading font-black text-xl shrink-0 ${
                        member.isLeader
                          ? isDark
                            ? 'bg-gradient-to-br from-amber-500/25 via-[#526a27]/40 to-[#33401c]/50 border-amber-400/60 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
                            : 'bg-gradient-to-br from-amber-100 to-sky-100 border-amber-400 text-amber-800 shadow-md'
                          : isDark
                          ? 'bg-[#33401c]/90 border-[#526a27] text-[#a4c639] shadow-[0_0_20px_rgba(82,106,39,0.25)]'
                          : 'bg-lime-100/90 border-lime-300 text-lime-800 shadow-sm'
                      }`}
                    >
                      {member.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>

                    <div>
                      <h3 className={`font-heading text-lg font-bold uppercase tracking-wide leading-tight ${textHeadingColor}`}>
                        {member.name}
                      </h3>
                      <p className="text-[11px] font-mono text-[#a4c639] font-semibold mt-0.5">
                        {member.specialty}
                      </p>
                    </div>
                  </div>

                  {/* Focus / Description */}
                  <p className={`text-xs font-sans leading-relaxed mb-6 ${textBodyColor}`}>
                    {member.focus}
                  </p>
                </div>

                <div>
                  {/* Tactical Metric Box */}
                  <div className={`p-3 rounded-2xl ${glassPanelClass} border border-[#526a27]/40 mb-4`}>
                    <div className={`text-[10px] font-mono uppercase ${textMutedColor}`}>
                      {member.tacticalMetric.label}
                    </div>
                    <div className="text-xs font-mono font-bold text-[#a4c639] mt-0.5">
                      {member.tacticalMetric.value}
                    </div>
                  </div>

                  {/* Contribution Tags */}
                  <div className={`pt-3 border-t ${sectionBorderClass} flex flex-wrap gap-1.5`}>
                    {member.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`text-[9px] font-mono px-2 py-0.5 rounded ${glassPillClass} ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Team Mission Footer Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`mt-12 p-4 sm:p-5 rounded-2xl ${glassPanelClass} border border-[#526a27]/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs font-mono`}
          >
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className={textBodyColor}>
                TASK FORCE: <span className="text-[#a4c639] font-bold uppercase">Destroyer of Worlds</span> · ANUSHKA YERPUDE (LEAD) · VED SHARMA · RUDRA DARJI · BHAVESH LANDA
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={textMutedColor}>DEFENSE TRACK ·</span>
              <span className="text-emerald-400 font-bold">114 INVARIANT TESTS PASSING</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 11. BOTTOM CALL TO ACTION ─────────────────────────────────────────────── */}
      <section className="py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className={`${glassPanelGlowClass} rounded-3xl p-10 sm:p-14 border border-[#526a27]/50 shadow-[0_0_60px_rgba(82,106,39,0.35)]`}
          >
            <h2 className={`font-heading text-3xl sm:text-6xl font-black uppercase leading-tight ${textHeadingColor}`}>
              One Picture. Every Source. Zero Delay.
            </h2>
            <p className={`mt-5 text-sm sm:text-base font-sans max-w-2xl mx-auto leading-relaxed ${textBodyColor}`}>
              Experience the multi-source Common Operating Picture right in your browser. Fully
              operational without an API key or cloud database.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <motion.button
                type="button"
                onClick={onLaunchCop}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#526a27] via-[#a4c639] to-[#c6ff00] hover:brightness-110 text-slate-950 font-mono font-extrabold text-sm uppercase tracking-wider shadow-[0_0_40px_rgba(164,198,57,0.6)] cursor-pointer"
              >
                <Activity className="w-5 h-5 text-slate-950" />
                <span>Launch Operational COP Console</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 11. FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className={`${glassPanelClass} border-t ${sectionBorderClass} py-12 font-mono text-xs select-none relative z-10 ${textMutedColor}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b ${sectionBorderClass}`}>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#a4c639]" />
              <span className={`font-heading font-extrabold text-base tracking-wider ${textHeadingColor}`}>
                VANGUARD DEFENSE
              </span>
              <span>|</span>
              <span>Problem ID D-05</span>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <a
                href="https://github.com/Destroyerved/Vanguard"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#a4c639] transition-colors"
              >
                GitHub Repository
              </a>
              <button
                type="button"
                onClick={onLaunchCop}
                className="hover:text-[#a4c639] transition-colors cursor-pointer"
              >
                Launch COP Console
              </button>
              <a
                href="https://github.com/Destroyerved/Vanguard/blob/main/docs/MASTER_GUIDELINES.md"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#a4c639] transition-colors"
              >
                Master Guidelines
              </a>
              <a
                href="https://github.com/Destroyerved/Vanguard/blob/main/docs/ARCHITECTURE.md"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#a4c639] transition-colors"
              >
                Architecture
              </a>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] gap-4">
            <div>&copy; 2026 Destroyer of Worlds. Released under the MIT License.</div>
            <div>Track: Defense · HackHertz 2026 · Problem ID D-05</div>
          </div>
        </div>
      </footer>

      {/* ─── 12. BRIEFING MODAL ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {briefingModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`${glassPanelGlowClass} rounded-3xl p-6 sm:p-8 max-w-md w-full font-mono shadow-2xl relative border border-[#526a27]/60`}
            >
              <div className={`flex items-center justify-between mb-5 border-b ${sectionBorderClass} pb-3`}>
                <div className="flex items-center gap-2.5">
                  <Satellite className="w-5 h-5 text-[#a4c639]" />
                  <span className={`font-heading text-xl font-bold uppercase ${textHeadingColor}`}>
                    Schedule Mission Briefing
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBriefingModalOpen(false);
                    setBriefingFormSubmitted(false);
                  }}
                  className={`text-2xl leading-none cursor-pointer ${textMutedColor} hover:text-white`}
                >
                  &times;
                </button>
              </div>

              {briefingFormSubmitted ? (
                <div className="text-center py-6 space-y-4">
                  <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto animate-bounce" />
                  <h4 className={`font-heading text-xl font-bold uppercase ${textHeadingColor}`}>
                    Mission Briefing Dispatched
                  </h4>
                  <p className={`text-xs leading-relaxed ${textBodyColor}`}>
                    An encrypted briefing dossier and demonstration access keys have been dispatched
                    to your designated defense sector command post.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setBriefingModalOpen(false);
                      setBriefingFormSubmitted(false);
                    }}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-[#a4c639] text-slate-950 font-bold text-xs uppercase cursor-pointer"
                  >
                    Return to Platform
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setBriefingFormSubmitted(true);
                  }}
                  className="space-y-4 text-xs"
                >
                  <div>
                    <label className={`block mb-1 font-semibold ${textBodyColor}`}>CALLSIGN / OFFICER NAME</label>
                    <input
                      required
                      defaultValue="Major A. Sharma"
                      className={`w-full px-3.5 py-2.5 rounded-xl border focus:border-[#a4c639] focus:outline-none ${
                        isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-white/90 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block mb-1 font-semibold ${textBodyColor}`}>COMMAND / DEFENSE AGENCY</label>
                    <input
                      required
                      defaultValue="Sector 04 Tactical Command"
                      className={`w-full px-3.5 py-2.5 rounded-xl border focus:border-[#a4c639] focus:outline-none ${
                        isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-white/90 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block mb-1 font-semibold ${textBodyColor}`}>DEFENSE NETWORK CONTACT</label>
                    <input
                      required
                      type="email"
                      defaultValue="liaison@defense.gov"
                      className={`w-full px-3.5 py-2.5 rounded-xl border focus:border-[#a4c639] focus:outline-none ${
                        isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-white/90 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block mb-1 font-semibold ${textBodyColor}`}>DEPLOYMENT THEATER</label>
                    <select
                      className={`w-full px-3.5 py-2.5 rounded-xl border focus:border-[#a4c639] focus:outline-none ${
                        isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-white/90 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option>Sector 04 Border Defense</option>
                      <option>Indo-Pacific Maritime Horizon</option>
                      <option>Eastern Flank Early Warning</option>
                      <option>Air-Gapped Tactical Field Edge</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#526a27] via-[#a4c639] to-[#c6ff00] hover:brightness-110 font-extrabold text-slate-950 text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(164,198,57,0.5)] cursor-pointer"
                    >
                      Submit Secure Request
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VanguardLandingPage;
