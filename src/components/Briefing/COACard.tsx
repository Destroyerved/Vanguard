import React, { useState } from 'react';
import type { CourseOfAction } from '../../types/vanguard';
import { ChevronDown, ChevronUp, ShieldAlert, CheckCircle2, AlertTriangle, Crosshair } from 'lucide-react';
import { useEventStore } from '../../store/useEventStore';

interface COACardProps {
  coa: CourseOfAction;
  index: number;
}

export const COACard: React.FC<COACardProps> = ({ coa, index }) => {
  const [expanded, setExpanded] = useState(index === 2); // Expand tactical nuke COA by default or toggle
  const setNukeModalOpen = useEventStore((s) => s.setNukeModalOpen);
  const rafaleState = useEventStore((s) => s.rafaleState);

  const getUrgencyBadge = (urgency: number) => {
    if (urgency >= 5) return 'bg-red-950/80 border-red-500 text-red-300 font-bold';
    if (urgency >= 4) return 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold';
    return 'bg-cyan-950/80 border-cyan-500 text-cyan-300';
  };

  const isNukeCOA = coa.id === 'COA-3';

  return (
    <div className={`mb-2.5 rounded border ${isNukeCOA ? 'border-amber-500/50 bg-amber-950/20' : 'border-cyan-500/20 bg-[#070e17]/80'} transition-all overflow-hidden`}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-cyan-950/30 transition select-none"
      >
        <div className="flex items-center space-x-2">
          <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-400 text-[10px] font-bold text-cyan-300 flex items-center justify-center">
            {index + 1}
          </span>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-cyan-400">{coa.codename}</div>
            <div className="text-xs font-bold text-white leading-snug">{coa.title}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`px-1.5 py-0.5 rounded border text-[9px] uppercase ${getUrgencyBadge(coa.recommendedUrgency)}`}>
            P-{coa.recommendedUrgency}
          </span>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
            {coa.successProbability}% WIN
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-cyan-500/15 text-[11px] text-slate-300">
          <p className="mb-2.5 text-slate-300 leading-relaxed font-sans">{coa.description}</p>

          {/* Pros */}
          <div className="mb-2">
            <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
              Tactical Advantages
            </div>
            <ul className="space-y-0.5 pl-4 list-disc text-[10.5px] text-emerald-200/90 font-sans">
              {coa.pros.map((pro, i) => (
                <li key={i}>{pro}</li>
              ))}
            </ul>
          </div>

          {/* Tradeoffs */}
          <div className="mb-3">
            <div className="text-[9px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center">
              <AlertTriangle className="w-3 h-3 mr-1 text-amber-400" />
              Operational Tradeoffs & Risks
            </div>
            <ul className="space-y-0.5 pl-4 list-disc text-[10.5px] text-amber-200/90 font-sans">
              {coa.tradeoffs.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>

          {/* Action Execution Button */}
          {isNukeCOA ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNukeModalOpen(true);
              }}
              className="w-full py-1.5 bg-gradient-to-r from-red-950 via-amber-950 to-red-950 hover:from-red-900 hover:to-amber-900 border border-amber-400/80 rounded text-xs font-bold text-yellow-300 tracking-wider uppercase flex items-center justify-center space-x-2 shadow-[0_0_12px_rgba(255,170,0,0.4)] transition"
            >
              <ShieldAlert className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span>
                {rafaleState.strikePhase === 'IDLE'
                  ? 'INITIATE RAFALE TACTICAL NUCLEAR PROTOCOL »'
                  : `MISSION ACTIVE: ${rafaleState.strikePhase}`}
              </span>
            </button>
          ) : (
            <button
              onClick={() => alert(`Directing Tactical Air Command to execute ${coa.codename}`)}
              className="w-full py-1 bg-cyan-950/70 hover:bg-cyan-900/90 border border-cyan-500/40 rounded text-[10px] font-bold text-cyan-300 tracking-wider uppercase flex items-center justify-center space-x-1.5 transition"
            >
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
              <span>AUTHORIZE {coa.codename}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
