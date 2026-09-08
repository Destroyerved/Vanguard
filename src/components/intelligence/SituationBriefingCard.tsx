import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
  Zap,
  CheckCircle2,
  HelpCircle,
  Eye,
  Info,
  Layers,
  MessageSquare
} from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'SIMPLE' | 'TACTICAL'>(easyMode ? 'SIMPLE' : 'TACTICAL');
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

  // Plain English / Simple Words translations
  const simpleSummary =
    situation?.easySummary ||
    'Several unidentified aircraft and perimeter sensors detected motion near Sector 4. The planes have not answered routine radio signals. Our automated defense system is 92% certain this is a real situation that requires immediate attention.';

  const simpleWhyItMatters =
    'Unidentified planes entering defended airspace without identification could mean an unauthorized flight, potential airspace breach, or malfunction. Checking quickly protects lives and territory.';

  const simpleSources = [
    { source: 'Air Radar', detail: 'Spotted unannounced aerial tracks with high speed' },
    { source: 'Perimeter Sensors', detail: 'Triggered tripwires along outer boundary fence' },
    { source: 'Verified News Wires', detail: 'Reuters & AP reports confirm regional alerts' }
  ];

  const simpleActions = [
    'Send a camera drone to Sector 4 to get live photos of the aircraft [RADAR-01].',
    'Notify the local base security patrol team to inspect the boundary fence [PERIM-04].',
    'Double-check weather sensors to rule out clouds or storm interference.'
  ];

  const isSimple = viewMode === 'SIMPLE' || easyMode;

  return (
    <div className="instrument-panel rounded-sm p-4 border border-white/10 corner-brackets space-y-3 select-none font-mono text-xs">
      {/* HEADER WITH VIEW TOGGLE */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span className="font-heading font-bold text-sm tracking-wider text-slate-100 uppercase">
            {isSimple ? 'SITUATION SUMMARY (SIMPLE WORDS)' : 'SITUATION BRIEFING & COA'}
          </span>
        </div>

        {/* TOGGLE BUTTONS: SIMPLE WORDS VS TACTICAL */}
        <div className="flex items-center gap-1 bg-[#05070a] p-0.5 rounded border border-white/10">
          <button
            onClick={() => setViewMode('SIMPLE')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
              isSimple
                ? 'bg-amber-950/80 border border-amber-500/50 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Switch to Simple Plain-English Summary"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>SIMPLE WORDS</span>
          </button>
          <button
            onClick={() => setViewMode('TACTICAL')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
              !isSimple
                ? 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Switch to Tactical Military Briefing"
          >
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>TACTICAL</span>
          </button>
        </div>
      </div>

      {isSimple ? (
        /* SIMPLE WORDS SUMMARY VIEW */
        <div className="space-y-3">
          {/* WHAT IS HAPPENING */}
          <div className="p-3 rounded bg-amber-950/20 border border-amber-500/30 space-y-1.5">
            <div className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              WHAT IS HAPPENING (IN PLAIN ENGLISH)
            </div>
            <p className="text-amber-100 text-xs leading-relaxed font-sans">
              {renderTextWithCitations(simpleSummary)}
            </p>
          </div>

          {/* WHY IT MATTERS */}
          <div className="p-2.5 rounded bg-[#05070a] border border-white/5 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              WHY IT MATTERS:
            </div>
            <p className="text-slate-300 text-xs leading-relaxed font-sans">
              {simpleWhyItMatters}
            </p>
          </div>

          {/* WHAT WE SHOULD DO NEXT */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              RECOMMENDED NEXT STEPS (1-2-3):
            </div>
            <div className="space-y-1.5">
              {simpleActions.map((action, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 rounded bg-[#070b10] border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
                >
                  <span className="font-bold text-emerald-400 text-xs mt-0.5">Step {idx + 1}:</span>
                  <p className="text-slate-200 text-xs flex-1 leading-snug font-sans">
                    {renderTextWithCitations(action)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* TACTICAL BRIEFING VIEW */
        <div className="space-y-3">
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
      )}
    </div>
  );
}

