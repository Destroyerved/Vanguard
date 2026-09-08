import React, { useState } from 'react';
import { UnifiedEvent } from '../../types/schema';
import ThreatPostureInstrument from '../intelligence/ThreatPostureInstrument';
import SituationBriefingCard from '../intelligence/SituationBriefingCard';
import SignalHorizonStream from '../intelligence/SignalHorizonStream';
import VerifiedNewsHub from '../VerifiedNewsHub';
import EventReconMedia from '../EventReconMedia';
import { Globe, Newspaper, Radio, Camera, ShieldAlert, Sparkles, Activity, Layers, Play } from 'lucide-react';

interface OverviewCanvasProps {
  situation: any;
  events: UnifiedEvent[];
  selectedEventId?: string;
  onSelectEvent: (event: UnifiedEvent) => void;
  onSelectEventId: (eventId: string) => void;
  easyMode: boolean;
  onNavigateToTab?: (tab: any) => void;
}

export default function OverviewCanvas({
  situation,
  events,
  selectedEventId,
  onSelectEvent,
  onSelectEventId,
  easyMode,
  onNavigateToTab
}: OverviewCanvasProps) {
  const [activeCenterView, setActiveCenterView] = useState<'NEWS' | 'RECON' | 'STREAM'>('NEWS');

  const activeEvent = events.find((e) => e.id === selectedEventId) || events[0] || {
    id: 'EVT-001',
    sourceType: 'radar',
    title: 'Surveillance Telemetry Contact',
    description: 'Active multi-source intelligence contact',
    severity: 'high',
    confidence: 88,
    location: { lat: 23.0225, lng: 72.5714 },
    timestamp: new Date().toISOString(),
    corroboratedBy: [],
    isAnomaly: false,
    raw: {}
  };

  const criticalEvents = events.filter((e) => e.severity === 'critical');
  const anomalyEvents = events.filter((e) => e.isAnomaly);

  return (
    <div className="space-y-4 select-none font-mono">
      {/* 1. PRIMARY OPERATIONAL HORIZON */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT / CENTER (7 COLS): MULTI-LAYER TACTICAL WORKSPACE (NEWS / RECON / STREAM) */}
        <div className="lg:col-span-7 flex flex-col space-y-2">
          {/* WORKSPACE VIEW SWITCHER TABS */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded bg-[#070b10] border border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase text-[10px]">PRIMARY INSTRUMENT:</span>
              <div className="flex items-center gap-1">
                {[
                  { id: 'NEWS', label: 'Verified News Hub', icon: Newspaper },
                  { id: 'RECON', label: 'Satellite Recon Media', icon: Camera },
                  { id: 'STREAM', label: 'Signal Horizon Stream', icon: Radio },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeCenterView === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveCenterView(tab.id as any)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 shadow-hud-glow'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 hidden sm:inline">
                LIVE FEEDS ACTIVE
              </span>
              {onNavigateToTab && (
                <button
                  onClick={() =>
                    onNavigateToTab(activeCenterView === 'NEWS' ? 'news' : activeCenterView === 'RECON' ? 'recon' : 'events')
                  }
                  className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-[10px] text-cyan-300 hover:bg-cyan-900/60 font-semibold transition-all"
                  title="Expand to Full Dedicated View"
                >
                  EXPAND [{activeCenterView === 'NEWS' ? 'N' : activeCenterView === 'RECON' ? 'R' : 'E'}] ↗
                </button>
              )}
            </div>
          </div>

          {/* ACTIVE PRIMARY VIEW */}
          <div className="h-[540px] flex flex-col">
            {activeCenterView === 'NEWS' && (
              <div className="h-full overflow-y-auto">
                <VerifiedNewsHub event={activeEvent} isStandaloneTab={false} />
              </div>
            )}

            {activeCenterView === 'RECON' && (
              <div className="h-full overflow-y-auto">
                <EventReconMedia event={activeEvent} />
              </div>
            )}

            {activeCenterView === 'STREAM' && (
              <div className="h-full overflow-y-auto">
                <SignalHorizonStream
                  events={events}
                  selectedEventId={selectedEventId}
                  onSelectEvent={onSelectEvent}
                  easyMode={easyMode}
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT (5 COLS): THREAT POSTURE INSTRUMENT & GROUNDED BRIEFING */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <ThreatPostureInstrument
            situation={situation}
            eventsCount={events.length}
            criticalCount={criticalEvents.length}
            anomalyCount={anomalyEvents.length}
          />

          <SituationBriefingCard
            situation={situation}
            onSelectEventId={onSelectEventId}
            easyMode={easyMode}
          />
        </div>
      </div>

      {/* 2. LOWER MULTI-DISCIPLINE INTELLIGENCE SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* SIGNAL HORIZON STREAM (7 COLS) */}
        <div className="lg:col-span-7">
          <SignalHorizonStream
            events={events}
            selectedEventId={selectedEventId}
            onSelectEvent={onSelectEvent}
            easyMode={easyMode}
          />
        </div>

        {/* EMBEDDED VERIFIED DEFENSE NEWS STREAM (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col h-[460px] overflow-hidden">
          <div className="instrument-panel rounded-sm p-4 border border-white/10 corner-brackets space-y-3 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-cyan-400" />
                <span className="font-heading font-bold text-sm tracking-wider text-slate-100 uppercase">
                  VERIFIED DEFENSE NEWS & SIGNALS
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 hidden sm:inline">REUTERS / AP / BBC</span>
                {onNavigateToTab && (
                  <button
                    onClick={() => onNavigateToTab('news')}
                    className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-[10px] text-cyan-300 hover:bg-cyan-900/60 font-semibold transition-all"
                    title="Open Full Verified News Hub"
                  >
                    EXPAND [N] ↗
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              <VerifiedNewsHub event={activeEvent} isStandaloneTab={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
