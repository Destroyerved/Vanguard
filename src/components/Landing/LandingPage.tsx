import React from 'react';
import {
  ShieldAlert,
  Radio,
  Crosshair,
  Flame,
  Zap,
  Activity,
  Layers,
  ChevronRight,
  Terminal,
  FileDown,
  Cpu,
  Navigation,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  Eye,
  Lock,
  Volume2
} from 'lucide-react';
import { soundFx } from '../../services/soundFx';
import { RafaleTopRightNuke } from '../Rafale/RafaleTopRightNuke';
import { PhosphorRadar } from '../Radar/PhosphorRadar';
import { useEventStore } from '../../store/useEventStore';

interface LandingPageProps {
  onEnterCommandRoom: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterCommandRoom }) => {
  const executeDetonation = useEventStore((s) => s.executeDetonation);

  const handleLaunch = () => {
    soundFx.playTargetLock();
    onEnterCommandRoom();
  };

  return (
    <div className="relative min-h-screen bg-[#04070b] text-[#c9d8e6] font-mono selection:bg-cyan-500 selection:text-black overflow-x-hidden">
      {/* Background CRT Scanlines & Grid */}
      <div className="fixed inset-0 scanlines opacity-40 pointer-events-none z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-[#04070b] to-[#020407] pointer-events-none" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#060a10]/90 border-b border-cyan-500/30 px-6 py-3.5 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-cyan-950/80 border border-cyan-400 rounded flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.4)]">
            <Crosshair className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '20s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display font-black text-lg tracking-widest text-cyan-300 drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]">
                VANGUARD
              </span>
              <span className="px-1.5 py-0.2 bg-cyan-950 border border-cyan-400/40 text-[9px] text-cyan-400 font-bold rounded">
                D-05 DEFENSE COP
              </span>
            </div>
            <div className="text-[10px] text-slate-500">MULTI-SOURCE DEFENSE SITUATIONAL AWARENESS</div>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-6 text-xs text-slate-400">
          <a href="#architecture" className="hover:text-cyan-300 transition">Architecture</a>
          <a href="#capabilities" className="hover:text-cyan-300 transition">Core Capabilities</a>
          <a href="#live-preview" className="hover:text-cyan-300 transition">Radar &amp; Rafale C2</a>
          <a href="#explainability" className="hover:text-cyan-300 transition">Confidence Math</a>
        </nav>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-amber-950/50 border border-amber-500/40 rounded text-[10px] text-amber-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>DEFCON 3 // ELEVATED</span>
          </div>

          <button
            onClick={handleLaunch}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider rounded shadow-[0_0_20px_rgba(0,240,255,0.6)] flex items-center space-x-1.5 transition transform hover:scale-105"
          >
            <span>ENTER COMMAND ROOM</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Section with Top Right Rafale and Left Bottom Radar integration */}
      <section className="relative z-20 pt-10 pb-16 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mb-12">
          {/* Main Hero Content (Left 7 cols) */}
          <div className="lg:col-span-7 text-left space-y-5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-cyan-950/70 border border-cyan-400/40 rounded-full text-xs text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold tracking-wider uppercase">Problem ID: D-05 | HackHertz 2026</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">Approved for Build</span>
            </div>

            <h1 className="font-display font-black text-3xl sm:text-5xl md:text-6xl text-white tracking-tight leading-tight">
              ONE PICTURE.<br />
              <span className="text-cyan-400 drop-shadow-[0_0_25px_rgba(0,240,255,0.8)]">EVERY SOURCE.</span><br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-cyan-200 to-amber-300">
                ZERO DELAY.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed">
              Vanguard is an AI-synthesized <b>Common Operating Picture (COP) &amp; Tactical Command Platform</b> fusing surveillance radar, live Open-Meteo atmospheric telemetry, personnel readiness monitors, tripwire logs, and tactical incident dispatches.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleLaunch}
                className="px-6 py-3 bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs uppercase tracking-widest rounded shadow-[0_0_30px_rgba(0,240,255,0.7)] flex items-center space-x-2 transition transform hover:-translate-y-0.5"
              >
                <Activity className="w-4 h-4" />
                <span>LAUNCH TACTICAL COMMAND ROOM (COP)</span>
              </button>

              <a
                href="#architecture"
                className="px-5 py-3 bg-[#091522] hover:bg-[#0e1f33] border border-cyan-500/40 text-cyan-300 font-bold text-xs uppercase tracking-wider rounded transition flex items-center space-x-2"
              >
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>TOPOLOGY SPEC</span>
              </a>
            </div>
          </div>

          {/* TOP RIGHT: Rafale F4 Nuking the UI Widget (Right 5 cols) */}
          <div className="lg:col-span-5 flex flex-col h-[340px] shadow-[0_0_40px_rgba(255,42,75,0.3)]">
            <RafaleTopRightNuke onNukeTriggered={executeDetonation} />
          </div>
        </div>

        {/* Live Metrics Ribbon & Left-Bottom Radar Preview */}
        <div id="live-preview" className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-6">
          {/* LEFT BOTTOM: Live Phosphor Radar Screen (Col span 5) */}
          <div className="lg:col-span-5 h-[320px] flex flex-col shadow-[0_0_30px_rgba(0,240,255,0.2)]">
            <PhosphorRadar />
          </div>

          {/* RIGHT 7 COLS: Mission Metrics Grid */}
          <div className="lg:col-span-7 grid grid-cols-2 gap-3 h-full content-between">
            <div className="bg-[#070e17]/80 border border-cyan-500/30 rounded p-4 tactical-box">
              <div className="text-[10px] text-slate-500 uppercase">Multi-INT Ingestion</div>
              <div className="text-xl font-bold text-cyan-300">5 LIVE STREAMS</div>
              <div className="text-[10px] text-slate-400 mt-1">Radar kinematics, Open-Meteo weather, SAM status, tripwires, dispatches</div>
            </div>

            <div className="bg-[#070e17]/80 border border-cyan-500/30 rounded p-4 tactical-box">
              <div className="text-[10px] text-slate-500 uppercase">AI Situation Synthesis</div>
              <div className="text-xl font-bold text-emerald-400">&lt; 10 SECONDS</div>
              <div className="text-[10px] text-slate-400 mt-1">Grounded executive brief with zero hallucination</div>
            </div>

            <div className="bg-[#070e17]/80 border border-cyan-500/30 rounded p-4 tactical-box">
              <div className="text-[10px] text-slate-500 uppercase">Grounding Citations</div>
              <div className="text-xl font-bold text-cyan-300">100% CITED</div>
              <div className="text-[10px] text-slate-400 mt-1">Every summary claim links directly to immutable event IDs</div>
            </div>

            <div className="bg-[#070e17]/80 border border-red-500/40 rounded p-4 tactical-box tactical-box-red">
              <div className="text-[10px] text-slate-500 uppercase">Strategic Air Dominance</div>
              <div className="text-xl font-bold text-red-400">RAFALE ASMP-A</div>
              <div className="text-[10px] text-slate-400 mt-1">300 kT hypersonic stand-off nuclear strike C2</div>
            </div>
          </div>
        </div>
      </section>

      {/* System Architecture Diagram Section */}
      <section id="architecture" className="relative z-20 py-16 px-6 max-w-7xl mx-auto border-t border-cyan-500/20">
        <div className="text-center mb-10">
          <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1">
            FULL-STACK ARCHITECTURAL SPECIFICATION
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white">
            VANGUARD MODULAR COMMAND TOPOLOGY
          </h2>
        </div>

        {/* ASCII & Component Diagram Box */}
        <div className="bg-[#060b12] border-2 border-cyan-500/40 rounded-lg p-6 font-mono text-xs shadow-[0_0_40px_rgba(0,240,255,0.15)] overflow-x-auto">
          <div className="text-center font-bold text-cyan-300 text-sm mb-4 border-b border-cyan-500/30 pb-2">
            VANGUARD FRONTEND ARCHITECTURE (React 18 + TypeScript + Zustand)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Box 1: Tactical Map */}
            <div className="bg-[#091422] border border-cyan-400/50 rounded p-4">
              <div className="flex items-center justify-between text-cyan-300 font-bold mb-2">
                <span className="flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Tactical Map</span>
                </span>
                <span className="text-[9px] bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-400">Leaflet GL</span>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1">
                <li>• 4 Dynamic Layers (Assets, Alerts, Weather, Zones)</li>
                <li>• MGRS Coordinates &amp; Flight Vector Intercepts</li>
                <li>• Dynamic 4D Time-Scrubber (-60m to Live)</li>
                <li>• Nuclear Ground Zero &amp; Fallout Dispersion Plumes</li>
              </ul>
            </div>

            {/* Box 2: AI Briefing Panel */}
            <div className="bg-[#091422] border border-cyan-400/50 rounded p-4">
              <div className="flex items-center justify-between text-cyan-300 font-bold mb-2">
                <span className="flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>AI Briefing Panel</span>
                </span>
                <span className="text-[9px] bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-400">Gemini 2.0</span>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1">
                <li>• Grounded Executive SITREP with Clickable Citations</li>
                <li>• Ranked Courses of Action (COAs) with Tradeoffs</li>
                <li>• Prioritized Action Directives (P1 - P5)</li>
                <li>• Web Speech API Tactical Voice Synthesizer</li>
              </ul>
            </div>

            {/* Box 3: Source Feed / Event List */}
            <div className="bg-[#091422] border border-cyan-400/50 rounded p-4">
              <div className="flex items-center justify-between text-cyan-300 font-bold mb-2">
                <span className="flex items-center space-x-1.5">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  <span>Source Feed / Event List</span>
                </span>
                <span className="text-[9px] bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-400">Multi-INT</span>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1">
                <li>• Multi-INT Filters (Radar, Weather, Ground, Logs, Dispatches)</li>
                <li>• Deterministic Confidence Math Badges (0 - 100%)</li>
                <li>• Corroboration Links &amp; Outlier Anomaly Detection</li>
                <li>• Interactive Explainability &amp; Raw JSON Inspector</li>
              </ul>
            </div>
          </div>

          {/* Central Connecting Bus */}
          <div className="p-3 bg-[#08121d] border border-cyan-400/60 rounded text-center mb-6">
            <div className="text-cyan-400 font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>UNIFIED EVENT STORE &amp; SPATIOTEMPORAL FUSION ENGINE (ZUSTAND)</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              Haversine Spatial Windows (≤ 35km) • Temporal Slicing (≤ 45m) • Recency Decay e^(-λt) • Web Audio FX Synthesizer
            </div>
          </div>

          {/* Dual Tactical Widgets Specification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#06141a] border border-cyan-500/60 rounded p-3">
              <div className="text-cyan-400 font-bold text-xs mb-1 flex items-center space-x-1.5">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <span>LEFT BOTTOM: 3D PHOSPHOR RADAR DISPLAY</span>
              </div>
              <div className="text-[11px] text-slate-300">
                60 FPS rotating cathode-ray beam, phosphor persistence blip trails, 25-150nm range rings, target lock-on telemetry, and audio pings.
              </div>
            </div>

            <div className="bg-[#12080a] border border-red-500/60 rounded p-3">
              <div className="text-red-400 font-bold text-xs mb-1 flex items-center space-x-1.5">
                <Flame className="w-4 h-4 text-red-400" />
                <span>TOP RIGHT: RAFALE F4 HUD &amp; NUCLEAR STRIKE C2</span>
              </div>
              <div className="text-[11px] text-slate-300">
                Mach 2.05, FL500, 5.8G pitch ladder telemetry, Two-Man PAL authentication, ASMP-A 300 kT hypersonic cruise, blast overpressure &amp; BDA.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Section */}
      <section id="capabilities" className="relative z-20 py-16 px-6 max-w-7xl mx-auto border-t border-cyan-500/20">
        <div className="text-center mb-12">
          <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1">
            KEY DEFENSE CAPABILITIES
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white">
            DESIGNED FOR TACTICAL SUPERIORITY
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#070e17]/80 border border-cyan-500/30 rounded-lg p-5 tactical-box">
            <div className="w-10 h-10 rounded bg-cyan-950/80 border border-cyan-400 flex items-center justify-center text-cyan-400 mb-4">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">Multi-Source Fusion Engine</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Ingests live meteorological data from Open-Meteo alongside radar kinematic tracks, personnel readiness monitors, electronic tripwires, and tactical dispatches.
            </p>
          </div>

          <div className="bg-[#070e17]/80 border border-cyan-500/30 rounded-lg p-5 tactical-box">
            <div className="w-10 h-10 rounded bg-cyan-950/80 border border-cyan-400 flex items-center justify-center text-cyan-400 mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">Explainable AI &amp; Ranked COAs</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Generates executive situation briefings where 100% of claims cite verified event IDs. Synthesizes ranked Courses of Action with explicit operational tradeoffs.
            </p>
          </div>

          <div className="bg-[#070e17]/80 border border-cyan-500/30 rounded-lg p-5 tactical-box">
            <div className="w-10 h-10 rounded bg-cyan-950/80 border border-cyan-400 flex items-center justify-center text-cyan-400 mb-4">
              <Volume2 className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">Tactical Voice Synthesis</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Enables hands-free command watchstanding through client-side Web Speech API audio briefings with military phonetic formatting and real-time audio waveforms.
            </p>
          </div>

          <div className="bg-[#070e17]/80 border border-cyan-500/30 rounded-lg p-5 tactical-box">
            <div className="w-10 h-10 rounded bg-cyan-950/80 border border-cyan-400 flex items-center justify-center text-cyan-400 mb-4">
              <Flame className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">Rafale Nuclear Strike C2</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Simulates strategic nuclear deterrence workflows: Two-Man PAL authentication, ASMP-A missile release, hypersonic cruise, detonation flash, and fallout plume mapping.
            </p>
          </div>

          <div className="bg-[#070e17]/80 border border-cyan-500/30 rounded-lg p-5 tactical-box">
            <div className="w-10 h-10 rounded bg-cyan-950/80 border border-cyan-400 flex items-center justify-center text-cyan-400 mb-4">
              <Crosshair className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">Phosphor Radar Sweep</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Authentic CRT cathode-ray phosphor radar with range rings (25–150 nm), persistent fading blips, acoustic pings, Doppler shift metrics, and IFF contact locks.
            </p>
          </div>

          <div className="bg-[#070e17]/80 border border-cyan-500/30 rounded-lg p-5 tactical-box">
            <div className="w-10 h-10 rounded bg-cyan-950/80 border border-cyan-400 flex items-center justify-center text-cyan-400 mb-4">
              <FileDown className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">Military SITREP Export</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Instantly downloads official military situation reports containing active DEFCON postures, executive summaries, active COA matrices, and correlated event logs.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="relative z-20 py-20 px-6 bg-gradient-to-b from-transparent via-cyan-950/20 to-black text-center border-t border-cyan-500/20">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex p-3 rounded-full bg-cyan-950 border border-cyan-400 shadow-[0_0_30px_rgba(0,240,255,0.5)]">
            <ShieldAlert className="w-8 h-8 text-cyan-400 animate-pulse" />
          </div>

          <h2 className="font-display font-black text-3xl sm:text-5xl text-white">
            EXPERIENCE THE COMMON OPERATING PICTURE
          </h2>

          <p className="text-sm text-slate-300 font-sans max-w-xl mx-auto">
            Step directly into the Sector-7 Northern Frontier Command Center with live multi-source data fusion, left-bottom radar, and top-right Rafale nuclear strike C2.
          </p>

          <div>
            <button
              onClick={handleLaunch}
              className="px-8 py-4 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-black text-base uppercase tracking-widest rounded shadow-[0_0_40px_rgba(0,240,255,0.8)] transition transform hover:scale-105"
            >
              LAUNCH VANGUARD COMMAND CENTER »
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 bg-[#020407] border-t border-cyan-500/20 py-6 px-6 text-center text-xs text-slate-500">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto">
          <div>VANGUARD DEFENSE SITUATIONAL AWARENESS SYSTEM • D-05 HACKHERTZ 2026</div>
          <div className="text-cyan-400 font-bold mt-2 sm:mt-0">TEAM: DESTROYER OF WORLDS</div>
        </div>
      </footer>
    </div>
  );
};
