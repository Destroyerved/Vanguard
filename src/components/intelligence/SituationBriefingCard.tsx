import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  Layers,
  Volume2,
  VolumeX,
  Zap,
  Activity,
  Gauge,
  Radio,
  ShieldAlert,
} from 'lucide-react';
import { AISummary, UnifiedEvent } from '../../types/schema';
import { renderTextWithCitations, stripCitations } from '../../utils/citations';
import { useVoiceBriefing } from '../../hooks/useVoiceBriefing';

interface BriefingMeta {
  ageMs: number;
  generating: boolean;
  groundingVerified: boolean;
}

interface SituationBriefingCardProps {
  situation: any;
  briefing?: AISummary | null;
  briefingMeta?: BriefingMeta;
  onSelectEventId?: (eventId: string) => void;
  easyMode: boolean;
}

export default function SituationBriefingCard({
  situation,
  briefing,
  briefingMeta,
  onSelectEventId,
  easyMode,
}: SituationBriefingCardProps) {
  const [viewMode, setViewMode] = useState<'SIMPLE' | 'TACTICAL'>(easyMode ? 'SIMPLE' : 'TACTICAL');
  const voice = useVoiceBriefing();

  const isSimple = viewMode === 'SIMPLE' || easyMode;

  // Real AISummary from GET /ai/briefing/latest when available.
  const summary = briefing;
  const hasBriefing = Boolean(summary);

  const executiveProse =
    summary?.executiveSummary ||
    situation?.executiveSummary ||
    'Multiple concurrent radar contacts observed entering Sector 4 without active transponder responses. Corroborated by infrared perimeter tripwires and personnel telemetry with 92% confidence.';

  const prioritizedActions = summary?.prioritizedActions;
  const coursesOfAction = summary?.coursesOfAction;
  const provenance = summary?.provenance;

  const simpleSummary = (summary?.keyDevelopments ?? [])
    .map((c) => c.point)
    .join(' ')
    .trim() ||
    situation?.easySummary ||
    'Several unidentified aircraft and perimeter sensors detected motion near Sector 4. The planes have not answered routine radio signals. Our automated defense system is 92% certain this is a real situation that requires immediate attention.';

  const simpleWhyItMatters =
    'Unidentified planes entering defended airspace without identification could mean an unauthorized flight, potential airspace breach, or malfunction. Checking quickly protects lives and territory.';

  const simpleActions = (summary?.prioritizedActions ?? [])
    .map((a) => `${a.action}${a.supportingEventIds.length ? ` [${a.supportingEventIds[0]}]` : ''}`)
    .concat([
      'Notify the local base security patrol team to inspect the boundary fence.',
      'Double-check weather sensors to rule out clouds or storm interference.',
    ])
    .slice(0, 3);

  const urgencyMeta = (urgency: number) =>
    urgency >= 5
      ? { color: 'text-rose-300 bg-rose-950/70 border-rose-500/50', label: 'IMMEDIATE' }
      : urgency >= 4
      ? { color: 'text-orange-300 bg-orange-950/70 border-orange-500/50', label: 'URGENT' }
      : urgency >= 3
      ? { color: 'text-amber-300 bg-amber-950/70 border-amber-500/50', label: 'PRIORITY' }
      : { color: 'text-slate-300 bg-[#070b10] border-white/10', label: 'ROUTINE' };

  const buildVoiceScript = (): string => {
    if (!summary) return executiveProse;
    return stripCitations(
      [
        summary.headline,
        summary.executiveSummary,
        `Recommended actions.`,
        ...(summary.prioritizedActions ?? []).map((a) => a.action),
        `Courses of action considered.`,
        ...(summary.coursesOfAction ?? []).map((c) => c.title),
      ].join('. '),
    );
  };

  return (
    <div className="instrument-panel rounded-sm p-4 border border-white/10 corner-brackets space-y-3 select-none font-mono text-xs">
      {/* HEADER WITH VIEW TOGGLE + VOICE */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span className="font-heading font-bold text-sm tracking-wider text-slate-100 uppercase">
            {isSimple ? 'SITUATION SUMMARY (SIMPLE WORDS)' : 'SITUATION BRIEFING & COA'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {voice.supported && (
            <button
              onClick={() => voice.toggle(buildVoiceScript())}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                voice.playing
                  ? 'bg-rose-950/70 border-rose-500/60 text-rose-300 animate-pulse'
                  : 'bg-[#05070a] border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/70'
              }`}
              title={voice.playing ? 'Stop voice briefing' : 'Read briefing aloud'}
            >
              {voice.playing ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              <span>{voice.playing ? 'STOP' : 'VOICE BRIEF'}</span>
            </button>
          )}

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
      </div>

      {isSimple ? (
        /* SIMPLE WORDS SUMMARY VIEW */
        <div className="space-y-3">
          <div className="p-3 rounded bg-amber-950/20 border border-amber-500/30 space-y-1.5">
            <div className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              WHAT IS HAPPENING (IN PLAIN ENGLISH)
            </div>
            <p className="text-amber-100 text-xs leading-relaxed font-sans">
              {renderTextWithCitations(simpleSummary, onSelectEventId)}
            </p>
          </div>

          <div className="p-2.5 rounded bg-[#05070a] border border-white/5 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              WHY IT MATTERS:
            </div>
            <p className="text-slate-300 text-xs leading-relaxed font-sans">{simpleWhyItMatters}</p>
          </div>

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
                    {renderTextWithCitations(action, onSelectEventId)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* TACTICAL BRIEFING VIEW — REAL GROUNDED AISummary */
        <div className="space-y-3">
          {/* HEADLINE */}
          {summary?.headline && (
            <div className="p-2.5 rounded bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-2">
              <Zap className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest">
                  {hasBriefing ? 'BRIEFING HEADLINE' : 'OPERATIONAL HEADLINE'}
                </div>
                <p className="text-slate-100 text-sm font-bold leading-snug mt-0.5">{summary.headline}</p>
              </div>
            </div>
          )}

          {/* EXECUTIVE PROSE */}
          <div className="p-3 rounded bg-[#05070a]/80 border border-white/5 space-y-2">
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              GROUNDED OPERATIONAL ASSESSMENT
            </div>
            <p className="text-slate-200 leading-relaxed text-xs">
              {renderTextWithCitations(executiveProse, onSelectEventId)}
            </p>
            {extractKeys(summary)} 
          </div>

          {/* KEY DEVELOPMENTS (grounded claims with citations) */}
          {summary?.keyDevelopments && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                KEY DEVELOPMENTS (GROUNDED)
              </div>
              <div className="space-y-1.5">
                {summary.keyDevelopments.map((claim, idx) => (
                  <div key={idx} className="p-2 rounded bg-[#070b10] border border-white/5 hover:border-cyan-500/30 transition-colors">
                    <p className="text-slate-300 text-[11px] leading-snug">
                      {renderTextWithCitations(claim.point, onSelectEventId)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PRIORITIZED ACTIONS with urgency */}
          {prioritizedActions && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                PRIORITIZED ACTIONS
              </div>
              <div className="space-y-1.5">
                {prioritizedActions.map((action, idx) => {
                  const meta = urgencyMeta(action.urgency);
                  return (
                    <div key={idx} className="flex items-start gap-2.5 p-2 rounded bg-[#070b10] border border-white/5 hover:border-emerald-500/30 transition-colors group">
                      <span className="font-bold text-emerald-400 text-xs mt-0.5">0{idx + 1}</span>
                      <p className="text-slate-300 text-xs flex-1 leading-snug">
                        {renderTextWithCitations(action.action, onSelectEventId)}
                      </p>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* COURSES OF ACTION */}
          {coursesOfAction && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                COURSES OF ACTION (COA)
              </div>
              <div className="space-y-1.5">
                {coursesOfAction.map((coa) => (
                  <div key={coa.id} className="p-2 rounded bg-[#05070a]/80 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-cyan-300 text-[11px]">{coa.title}</span>
                      <span className="text-[9px] text-slate-500">{coa.recommendedUrgency}/5</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-snug">{coa.description}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px]">
                      <div className="text-emerald-300/90">
                        <span className="uppercase text-emerald-500 font-bold">+ </span>
                        {coa.pros.join('; ')}
                      </div>
                      <div className="text-rose-300/90">
                        <span className="uppercase text-rose-500 font-bold">− </span>
                        {coa.tradeoffs.join('; ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROVENANCE STRIP */}
          {(provenance || briefingMeta) && (
            <div
              className={`px-2 py-1.5 rounded flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] border ${
                briefingMeta?.groundingVerified
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
              }`}
            >
              <span className="flex items-center gap-1 font-bold uppercase">
                <Activity className="w-3 h-3" />
                {provenance?.engine === 'gemini'
                  ? `Synthetic Briefing · ${provenance.model ?? 'gemini'}`
                  : 'Deterministic Replay Briefing'}
              </span>
              {briefingMeta?.groundingVerified && <span className="font-bold uppercase">Grounding: VERIFIED</span>}
              {provenance?.eventsConsidered !== undefined && (
                <span>Events: <b>{provenance.eventsConsidered}</b></span>
              )}
              {provenance?.citationsStripped !== undefined && (
                <span>Citations stripped: <b>{provenance.citationsStripped}</b></span>
              )}
              {provenance?.claimsDiscarded !== undefined && (
                <span>Claims discarded: <b>{provenance.claimsDiscarded}</b></span>
              )}
              {provenance?.latencyMs !== undefined && (
                <span>Latency: <b>{provenance.latencyMs}ms</b></span>
              )}
              {briefingMeta?.generating && <span className="animate-pulse">GENERATING…</span>}
            </div>
          )}
        </div>
      )}

      {!hasBriefing && (
        <div className="px-2 py-1.5 rounded bg-[#070b10] border border-white/10 text-[10px] text-slate-500 flex items-center gap-1.5">
          <Gauge className="w-3 h-3 text-slate-500" />
          No synthesized briefing yet — backends without GEMINI_API_KEY use the deterministic replay engine.
        </div>
      )}
    </div>
  );
}

// Render the summary's overall confidence + threat level as compact HUD chips.
function extractKeys(summary: AISummary | undefined) {
  if (!summary) return null;
  const levelColor =
    summary.threatLevel === 'red'
      ? 'bg-rose-950/70 text-rose-300 border-rose-500/40'
      : summary.threatLevel === 'orange'
      ? 'bg-orange-950/70 text-orange-300 border-orange-500/40'
      : summary.threatLevel === 'yellow'
      ? 'bg-yellow-950/70 text-yellow-300 border-yellow-500/40'
      : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40';
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border flex items-center gap-1 ${levelColor}`}>
        <ShieldAlert className="w-2.5 h-2.5" /> {summary.threatLevel.toUpperCase()}
      </span>
      <span className="px-1.5 py-0.2 rounded bg-[#05070a] border border-white/10 text-[9px] text-slate-400">
        CONF: <b className="text-slate-200">{summary.overallConfidence}%</b>
      </span>
    </div>
  );
}