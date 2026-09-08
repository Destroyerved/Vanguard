import React from 'react';
import { FileText, ShieldCheck, Sparkles, ExternalLink, AlertTriangle, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { UnifiedEvent } from '../../types/schema';

interface SituationBriefingCardProps {
  situation: any;
  onSelectEventId?: (eventId: string) => void;
  easyMode: boolean;
}

export default function SituationBriefingCard({
  situation,
  onSelectEventId,
  easyMode
}: SituationBriefingCardProps) {
  const provenanceEngine = situation?.provenance?.engine || 'deterministic';
  const isGrounded = situation?.provenance?.grounded !== false;

  // Custom regex to parse and make event citations like [EVT-101] or [RADAR-01] clickable
  const renderTextWithCitations = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\[[A-Za-z0-9\-_]+\])/g);

    return parts.map((part, idx) => {
      const match = part.match(/^\[([A-Za-z0-9\-_]+)\]$/);
      if (match) {
        const eventId = match[1];
        return (
          <button
            key={idx}
            onClick={() => onSelectEventId && onSelectEventId(eventId)}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 mx-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-900/90 font-mono text-[11px] font-bold transition-all shadow-sm"
            title={`Inspect Grounded Event ${eventId}`}
          >
            {part}
          </button>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const defaultSummary =
    situation?.executiveSummary ||
    'Multiple concurrent radar contacts observed entering Sector 4 without active transponder responses. Corroborated by infrared perimeter tripwires and personnel telemetry with 92% confidence.';

  const defaultActions = situation?.prioritizedActions || [
    'Vector UAV Recon to Sector 4 intercept coordinates [RADAR-01].',
    'Alert Perimeter Quick Reaction Force (QRF) along Sector 4 perimeter [PERIM-04].',
    'Cross-reference optical thermal telemetry with meteorological visibility models.'
  ];

  return (
    <div className="instrument-panel rounded-sm p-4 border border-white/10 corner-brackets space-y-3 select-none font-mono text-xs">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span className="font-heading font-bold text-sm tracking-wider text-slate-100 uppercase">
            SITUATION BRIEFING & COURSES OF ACTION
          </span>
        </div>

        {/* PROVENANCE BADGE */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#05070a] border border-white/10 text-[10px]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isGrounded ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span className="text-slate-400">ENGINE:</span>
          <span className="font-bold text-cyan-300 uppercase">{provenanceEngine}</span>
        </div>
      </div>

      {/* EXECUTIVE PROSE */}
      <div className="p-3 rounded bg-[#05070a]/80 border border-white/5 space-y-2">
        <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          GROUNDED OPERATIONAL ASSESSMENT
        </div>
        <p className="text-slate-200 leading-relaxed text-xs">
          {renderTextWithCitations(defaultSummary)}
        </p>
      </div>

      {/* RANKED COURSES OF ACTION */}
      <div className="space-y-2 pt-1">
        <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          PRIORITIZED COURSES OF ACTION (COA)
        </div>
        <div className="space-y-1.5">
          {defaultActions.map((action: string, idx: number) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-2 rounded bg-[#070b10] border border-white/5 hover:border-cyan-500/30 transition-colors group"
            >
              <span className="font-bold text-cyan-400 text-xs mt-0.5">0{idx + 1}</span>
              <p className="text-slate-300 text-xs flex-1 leading-snug">
                {renderTextWithCitations(action)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
