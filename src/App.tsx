import React, { useEffect, useState } from 'react';
import { useEventStore } from './store/useEventStore';
import { LandingPage } from './components/Landing/LandingPage';
import { CommandHeader } from './components/Header/CommandHeader';
import { TacticalMap } from './components/Map/TacticalMap';
import { AIBriefingPanel } from './components/Briefing/AIBriefingPanel';
import { SourceFeed } from './components/Feed/SourceFeed';
import { PhosphorRadar } from './components/Radar/PhosphorRadar';
import { RafaleStrikeHUD } from './components/Rafale/RafaleStrikeHUD';
import { RafaleTopRightNuke } from './components/Rafale/RafaleTopRightNuke';
import { NukeStrikeModal } from './components/Rafale/NukeStrikeModal';
import { ExplainabilityModal } from './components/Explainability/ExplainabilityModal';
import { Activity, Radio, Cpu, Flame } from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'command'>('landing');
  const [activeRightTab, setActiveRightTab] = useState<'hud' | 'feed'>('hud');

  const kinematicTick = useEventStore((s) => s.kinematicTick);
  const screenShake = useEventStore((s) => s.screenShake);
  const screenNukeFlash = useEventStore((s) => s.screenNukeFlash);
  const sourceHealth = useEventStore((s) => s.sourceHealth);
  const executeDetonation = useEventStore((s) => s.executeDetonation);

  // Background Kinematic simulation tick (every 1s)
  useEffect(() => {
    const interval = setInterval(() => {
      kinematicTick();
    }, 1000);
    return () => clearInterval(interval);
  }, [kinematicTick]);

  // If on Landing Page, render Landing Page
  if (currentView === 'landing') {
    return <LandingPage onEnterCommandRoom={() => setCurrentView('command')} />;
  }

  // Tactical Command Center Layout:
  // LEFT COLUMN: Tactical Map (Top) + Phosphor Radar (Left Bottom)
  // MIDDLE COLUMN: AI Briefing Panel (Grounded SITREP + COA Matrix)
  // RIGHT COLUMN: Rafale F4 HUD Nuking the UI (Top Right) + Source Feed / Telemetry (Bottom Right)
  return (
    <div
      className={`relative w-screen h-screen flex flex-col bg-[#04070b] text-[#c9d8e6] overflow-hidden select-none ${
        screenShake ? 'animate-screen-shake' : ''
      }`}
    >
      {/* Nuclear Detonation White Flash Screen Effect */}
      {screenNukeFlash && (
        <div className="fixed inset-0 z-50 bg-white pointer-events-none animate-nuke-flash" />
      )}

      {/* CRT Scanline & Ambient Grid Texture */}
      <div className="absolute inset-0 scanlines opacity-60 z-30 pointer-events-none" />

      {/* Top Tactical Command Header */}
      <CommandHeader onBackToLanding={() => setCurrentView('landing')} />

      {/* Main Command Center Layout Grid */}
      <main className="flex-1 p-2 grid grid-cols-12 gap-2 overflow-hidden z-20">
        {/* LEFT COLUMN (Col span: 5): Tactical Map (Top) + Phosphor Radar (Left Bottom) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col h-full gap-2 overflow-hidden">
          {/* Tactical Map */}
          <div className="flex-[3] min-h-[260px] flex flex-col overflow-hidden">
            <TacticalMap />
          </div>

          {/* LEFT BOTTOM: 3D Cathode-Ray Phosphor Radar */}
          <div className="flex-[2] min-h-[200px] flex flex-col overflow-hidden">
            <PhosphorRadar />
          </div>
        </div>

        {/* MIDDLE COLUMN (Col span: 4): AI Situation Briefing & Grounded COAs */}
        <div className="col-span-12 lg:col-span-4 flex flex-col h-full overflow-hidden">
          <AIBriefingPanel />
        </div>

        {/* RIGHT COLUMN (Col span: 3): TOP RIGHT RAFALE NUKING THE UI + SOURCE FEED */}
        <div className="col-span-12 lg:col-span-3 flex flex-col h-full gap-2 overflow-hidden">
          {/* TOP RIGHT: Rafale F4 Nuking the UI & Cockpit HUD */}
          <div className="flex-[3] min-h-[260px] flex flex-col overflow-hidden">
            <RafaleTopRightNuke onNukeTriggered={executeDetonation} />
          </div>

          {/* RIGHT BOTTOM: Multi-Source Intel Stream Feed */}
          <div className="flex-[3] min-h-[200px] flex flex-col overflow-hidden">
            <SourceFeed />
          </div>
        </div>
      </main>

      {/* Bottom Status Ticker Bar */}
      <footer className="relative z-30 bg-[#05080c] border-t border-cyan-500/30 px-3 py-1 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex items-center space-x-4">
          <span className="text-cyan-400 font-bold flex items-center">
            <Activity className="w-3 h-3 mr-1 text-emerald-400 animate-pulse" />
            VANGUARD INGESTION STREAM:
          </span>
          {sourceHealth.map((sh) => (
            <div key={sh.sourceType} className="flex items-center space-x-1">
              <span className={`w-1.5 h-1.5 rounded-full ${sh.status === 'live' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="uppercase text-slate-300">{sh.sourceType}:</span>
              <span className="text-white font-bold">{sh.latencyMs}ms</span>
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-slate-500">RADAR: LEFT-BOTTOM (PSR-3D)</span>
          <span className="text-red-400 font-bold">● RAFALE: TOP-RIGHT (ASMP-A)</span>
        </div>
      </footer>

      {/* Modals */}
      <NukeStrikeModal />
      <ExplainabilityModal />
    </div>
  );
}

export default App;
