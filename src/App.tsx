import React, { useEffect, useState } from 'react';
import { useEventStore } from './store/useEventStore';
import { LandingPage } from './components/Landing/LandingPage';
import { CommandHeader } from './components/Header/CommandHeader';
import { TacticalMap } from './components/Map/TacticalMap';
import { AIBriefingPanel } from './components/Briefing/AIBriefingPanel';
import { SourceFeed } from './components/Feed/SourceFeed';
import { PhosphorRadar } from './components/Radar/PhosphorRadar';
import { RafaleStrikeHUD } from './components/Rafale/RafaleStrikeHUD';
import { NukeStrikeModal } from './components/Rafale/NukeStrikeModal';
import { ExplainabilityModal } from './components/Explainability/ExplainabilityModal';
import { Activity, Radio, Cpu } from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'command'>('landing');
  const [activeRightTab, setActiveRightTab] = useState<'widgets' | 'feed'>('widgets');

  const kinematicTick = useEventStore((s) => s.kinematicTick);
  const screenShake = useEventStore((s) => s.screenShake);
  const screenNukeFlash = useEventStore((s) => s.screenNukeFlash);
  const sourceHealth = useEventStore((s) => s.sourceHealth);

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

  // Otherwise render full Tactical Command Center
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
        {/* LEFT COLUMN: Interactive Tactical Command Map (Col span: 5) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col h-full overflow-hidden">
          <TacticalMap />
        </div>

        {/* MIDDLE COLUMN: AI Situation Briefing & COA Matrix (Col span: 4) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col h-full overflow-hidden">
          <AIBriefingPanel />
        </div>

        {/* RIGHT COLUMN: Rafale F4 HUD (Top Right) + Phosphor Radar (Bottom Right) & Source Feed (Col span: 3) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col h-full gap-2 overflow-hidden">
          {/* Top of Right Column: Tab selector between Flight/Radar Widgets vs Source Feed */}
          <div className="flex items-center justify-between bg-[#08101a] border border-cyan-500/30 rounded p-1">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setActiveRightTab('widgets')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 transition ${
                  activeRightTab === 'widgets'
                    ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,240,255,0.6)] font-black'
                    : 'text-slate-400 hover:text-cyan-300'
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>HUD &amp; RADAR</span>
              </button>
              <button
                onClick={() => setActiveRightTab('feed')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 transition ${
                  activeRightTab === 'feed'
                    ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,240,255,0.6)] font-black'
                    : 'text-slate-400 hover:text-cyan-300'
                }`}
              >
                <Radio className="w-3 h-3" />
                <span>INTEL FEED</span>
              </button>
            </div>

            <div className="text-[9px] text-emerald-400 font-mono flex items-center space-x-1 pr-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>LIVE</span>
            </div>
          </div>

          {activeRightTab === 'widgets' ? (
            <>
              {/* TOP RIGHT: Rafale F4 Fighter Jet HUD & Nuclear Strike Simulation */}
              <div className="flex-1 min-h-[220px] max-h-[48%] flex flex-col overflow-hidden">
                <RafaleStrikeHUD />
              </div>

              {/* BOTTOM RIGHT: 3D Cathode-Ray Phosphor Radar Sweep */}
              <div className="flex-1 min-h-[220px] flex flex-col overflow-hidden">
                <PhosphorRadar />
              </div>
            </>
          ) : (
            /* Alternate Tab: Multi-Source Intel Feed */
            <div className="flex-1 flex flex-col overflow-hidden">
              <SourceFeed />
            </div>
          )}
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
          <span className="text-slate-500">ENCRYPTION: AES-256 GCM</span>
          <span className="text-cyan-400 font-bold">● C4ISR ONLINE</span>
        </div>
      </footer>

      {/* Modals */}
      <NukeStrikeModal />
      <ExplainabilityModal />
    </div>
  );
}

export default App;
