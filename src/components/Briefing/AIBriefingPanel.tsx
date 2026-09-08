import React from 'react';
import { useEventStore } from '../../store/useEventStore';
import { COACard } from './COACard';
import { VoiceBriefingWidget } from './VoiceBriefingWidget';
import { Sparkles, ShieldCheck, AlertCircle, ArrowUpRight, Activity } from 'lucide-react';

export const AIBriefingPanel: React.FC = () => {
  const aiBriefing = useEventStore((s) => s.aiBriefing);
  const selectEvent = useEventStore((s) => s.selectEvent);
  const selectedEventId = useEventStore((s) => s.selectedEventId);

  return (
    <div className="flex flex-col h-full bg-[#050910] border border-cyan-500/30 rounded overflow-hidden tactical-box">
      {/* Header */}
      <div className="px-3 py-2 bg-[#09121d] border-b border-cyan-500/30 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-display text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-cyan-400" />
            AI SITUATION BRIEFING &amp; COA
          </span>
        </div>
        <div className="text-[9px] text-slate-400 font-mono flex items-center space-x-1">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>GEMINI 2.0 FLASH • GROUNDED (100%)</span>
        </div>
      </div>

      {/* Body Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 custom-scrollbar">
        {/* Voice Readout Widget */}
        <VoiceBriefingWidget />

        {/* Executive Threat Assessment Headline */}
        <div className="p-2.5 bg-gradient-to-r from-red-950/40 via-slate-900/50 to-amber-950/30 border-l-4 border-red-500 rounded-r text-xs">
          <div className="text-[9px] font-bold tracking-wider text-red-400 uppercase mb-0.5">
            OPERATIONAL ASSESSMENT // SECTOR-7
          </div>
          <div className="font-bold text-white text-xs leading-snug">
            {aiBriefing.headline}
          </div>
        </div>

        {/* Grounded Executive Summary */}
        <div className="bg-[#070e17] border border-cyan-500/20 rounded p-2.5">
          <div className="text-[9px] font-bold tracking-wider uppercase text-cyan-400 mb-1.5 flex items-center justify-between">
            <span>EXECUTIVE SUMMARY</span>
            <span className="text-[8px] text-slate-400">CITATIONS CLICKABLE</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {aiBriefing.executiveSummary}
          </p>
        </div>

        {/* Key Grounded Developments with Clickable Evidence Links */}
        <div className="bg-[#070e17] border border-cyan-500/20 rounded p-2.5">
          <div className="text-[9px] font-bold tracking-wider uppercase text-cyan-400 mb-2">
            KEY CORROBORATED DEVELOPMENTS
          </div>
          <div className="space-y-2">
            {aiBriefing.keyDevelopments.map((dev, idx) => (
              <div key={idx} className="text-xs text-slate-300 pl-2 border-l-2 border-cyan-400/40">
                <p className="leading-snug font-sans mb-1">{dev.point}</p>
                <div className="flex flex-wrap gap-1">
                  {dev.supportingEventIds.map((eid) => (
                    <button
                      key={eid}
                      onClick={() => selectEvent(eid)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition flex items-center space-x-0.5 ${
                        selectedEventId === eid
                          ? 'bg-cyan-400 text-black border border-white'
                          : 'bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300'
                      }`}
                      title={`Focus Event ${eid} on Tactical Map`}
                    >
                      <span>#{eid}</span>
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prioritized Tactical Directives */}
        <div className="bg-[#070e17] border border-cyan-500/20 rounded p-2.5">
          <div className="text-[9px] font-bold tracking-wider uppercase text-cyan-400 mb-2 flex items-center justify-between">
            <span>PRIORITIZED ACTION DIRECTIVES</span>
            <span className="text-[8px] text-amber-400 font-bold">RANKED BY URGENCY</span>
          </div>
          <div className="space-y-1.5">
            {aiBriefing.prioritizedActions.map((act, i) => (
              <div key={i} className="flex items-start justify-between bg-[#0b1320] border border-slate-700/50 rounded p-1.5 text-xs">
                <div className="flex items-start space-x-2">
                  <span className="px-1.5 py-0.5 bg-red-950 border border-red-500 text-red-300 rounded text-[9px] font-bold">
                    P{act.urgency}
                  </span>
                  <div>
                    <div className="text-slate-200 font-medium leading-snug">{act.action}</div>
                    <div className="text-[9px] text-cyan-400 mt-0.5 font-mono">{act.department}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ranked Courses of Action (COAs) with Tradeoffs */}
        <div>
          <div className="text-[10px] font-bold tracking-wider uppercase text-cyan-400 mb-2 flex items-center justify-between">
            <span>COURSES OF ACTION (COA MATRIX)</span>
            <span className="text-[9px] text-emerald-400">3 STRATEGIES SYNTHESIZED</span>
          </div>
          {aiBriefing.coursesOfAction.map((coa, idx) => (
            <COACard key={coa.id} coa={coa} index={idx} />
          ))}
        </div>
      </div>
    </div>
  );
};
