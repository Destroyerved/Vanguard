import React, { useState, useEffect } from 'react';
import { UnifiedEvent, CorrelationsResponse, CandidatesResponse } from '../../types/schema';
import { explainEvent } from '../../data/eventExplainer';
import { getCorrelations, getCandidates } from '../../data/apiClient';
import EventReconMedia from '../EventReconMedia';
import LiveNewsFeed from '../LiveNewsFeed';
import { generateEventPdfReport } from '../../utils/generatePdfReport';
import {
  X,
  ShieldCheck,
  Radio,
  Clock,
  MapPin,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Cpu,
  Layers,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Info,
  Camera,
  Newspaper,
  Download
} from 'lucide-react';

interface EventInvestigationDrawerProps {
  event: UnifiedEvent | null;
  onClose: () => void;
  onSelectCorrelatedEvent?: (eventId: string) => void;
  onOpenRawJson?: (event: UnifiedEvent) => void;
  easyMode?: boolean;
}

export default function EventInvestigationDrawer({
  event,
  onClose,
  onSelectCorrelatedEvent,
  onOpenRawJson,
  easyMode = false
}: EventInvestigationDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'EXPLAIN' | 'RECON' | 'NEWS' | 'MATH' | 'CORRELATIONS' | 'RAW'>('EXPLAIN');
  const [summaryViewMode, setSummaryViewMode] = useState<'SIMPLE' | 'TACTICAL'>(easyMode ? 'SIMPLE' : 'SIMPLE');
  const [correlations, setCorrelations] = useState<CorrelationsResponse | null>(null);
  const [candidates, setCandidates] = useState<CandidatesResponse | null>(null);
  const [corrLoading, setCorrLoading] = useState(false);
  const [corrError, setCorrError] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    let cancelled = false;
    setCorrLoading(true);
    setCorrError(null);
    Promise.allSettled([getCorrelations(event.id), getCandidates(event.id)]).then(([c, can]) => {
      if (cancelled) return;
      if (c.status === 'fulfilled') setCorrelations(c.value);
      if (can.status === 'fulfilled') setCandidates(can.value);
      if (c.status === 'rejected' && can.status === 'rejected') {
        setCorrError('Correlation engine unreachable — showing local estimates.');
      }
      setCorrLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [event]);

  if (!event) return null;

  const explanation = explainEvent(event);

  // Real confidence breakdown from the server when the event lives on the
  // backend; a labeled local estimate only for injected scenarios / offline.
  const bd = correlations
    ? {
        ...correlations.confidence.breakdown,
        overall: correlations.confidence.overall,
      }
    : event.confidenceBreakdown || {
        overall: event.confidence,
        sourceReliability: Math.round(event.confidence * 0.9),
        dataFreshness: 98,
        sourceAgreement: event.corroboratedBy && event.corroboratedBy.length > 0 ? 95 : 0,
        spatialAgreement: event.corroboratedBy && event.corroboratedBy.length > 0 ? 80 : 0,
        temporalAgreement: event.corroboratedBy && event.corroboratedBy.length > 0 ? 90 : 0,
      };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const severityBadge =
    event.severity === 'critical'
      ? 'bg-rose-950/80 border-rose-500/60 text-rose-300'
      : event.severity === 'high'
      ? 'bg-orange-950/80 border-orange-500/60 text-orange-300'
      : event.severity === 'medium'
      ? 'bg-yellow-950/80 border-yellow-500/60 text-yellow-300'
      : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300';

  const isSimple = summaryViewMode === 'SIMPLE' || easyMode;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-[#070b10]/98 border-l border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col font-mono text-xs select-none animate-in slide-in-from-right duration-200">
      {/* 1. DRAWER TOP HEADER */}
      <div className="p-4 border-b border-white/10 bg-[#0a0f15] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
            <Radio className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">EVENT [{event.id}]</span>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold border ${severityBadge}`}>
                {event.severity}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 truncate max-w-sm">
              {event.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => generateEventPdfReport(event)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950 border border-cyan-500/60 text-cyan-300 hover:bg-cyan-900 shadow-hud-glow transition-all font-bold text-[10px]"
            title="Generate & Export Detailed Intelligence PDF Dossier"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>EXPORT PDF</span>
          </button>
          <button
            onClick={handleCopyJson}
            className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
            title="Copy Raw Event JSON"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. SUB-TABS */}
      <div className="flex items-center border-b border-white/10 px-3 bg-[#05070a] overflow-x-auto">
        {[
          { id: 'EXPLAIN', label: 'Summary' },
          { id: 'RECON', label: 'Satellite Recon' },
          { id: 'NEWS', label: 'News Wires' },
          { id: 'MATH', label: 'Confidence Math' },
          { id: 'CORRELATIONS', label: `Corroborators (${event.corroboratedBy?.length || 0})` },
          { id: 'RAW', label: 'JSON' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2.5 text-[11px] font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. DRAWER BODY SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* KEY TELEMETRY STRIP */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded bg-[#0a0f15] border border-white/10 text-slate-300">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Source Type</div>
            <div className="font-semibold text-cyan-300">{event.sourceType.toUpperCase()}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Coordinates</div>
            <div className="font-semibold">
              {typeof event.location?.lat === 'number' && typeof event.location?.lng === 'number'
                ? `${event.location.lat.toFixed(4)}°N, ${event.location.lng.toFixed(4)}°E`
                : 'Sector Grid Alpha'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Overall Confidence</div>
            <div className="font-bold text-emerald-400 text-sm">{event.confidence}%</div>
          </div>
        </div>

        {/* TAB 1: PLAIN ENGLISH & REASONING */}
        {activeTab === 'EXPLAIN' && (
          <div className="space-y-4">
            {/* VIEW MODE TOGGLE BUTTONS */}
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <span className="text-[10px] text-slate-400 uppercase font-bold">
                {isSimple ? 'PLAIN-ENGLISH SUMMARY' : 'TACTICAL INTELLIGENCE BREAKDOWN'}
              </span>
              <div className="flex items-center gap-1 bg-[#05070a] p-0.5 rounded border border-white/10">
                <button
                  onClick={() => setSummaryViewMode('SIMPLE')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                    isSimple
                      ? 'bg-amber-950/80 border border-amber-500/50 text-amber-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>SIMPLE WORDS</span>
                </button>
                <button
                  onClick={() => setSummaryViewMode('TACTICAL')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                    !isSimple
                      ? 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3 h-3 text-cyan-400" />
                  <span>TACTICAL</span>
                </button>
              </div>
            </div>

            {isSimple ? (
              /* SIMPLE WORDS SUMMARY CARDS */
              <div className="space-y-3 font-sans">
                {/* 1. WHAT HAPPENED */}
                <div className="p-3.5 rounded bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                  <div className="text-[10px] font-mono text-amber-400 uppercase font-bold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    WHAT HAPPENED (IN SIMPLE WORDS)
                  </div>
                  <p className="text-amber-100 text-sm leading-relaxed font-medium">
                    {explanation.easy.simpleDescription || event.description || event.title}
                  </p>
                </div>

                {/* 2. HOW SERIOUS IS IT */}
                <div className="p-3 rounded bg-[#0a0f15] border border-white/10 space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    HOW SERIOUS IS THIS?
                  </div>
                  <p className="text-slate-200 text-xs leading-relaxed">
                    {explanation.easy.simpleSeverityLabel} — {explanation.easy.simpleCertainty}
                  </p>
                </div>

                {/* 3. WHAT SHOULD WE DO NEXT */}
                <div className="p-3 rounded bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                  <div className="text-[10px] font-mono text-emerald-400 uppercase font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    WHAT WE SHOULD DO (ACTION STEP)
                  </div>
                  <p className="text-emerald-100 text-xs leading-relaxed">
                    {explanation.easy.simpleActionStep}
                  </p>
                </div>

                {/* 4. LOCATION & SENSORS IN SIMPLE WORDS */}
                <div className="p-2.5 rounded bg-[#070b10] border border-white/5 text-[11px] text-slate-400 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{explanation.easy.simpleTelemetry}</span>
                </div>
              </div>
            ) : (
              /* TACTICAL INTELLIGENCE CARDS */
              <div className="space-y-4">
                <div className="p-3 rounded bg-cyan-950/30 border border-cyan-500/30 space-y-2">
                  <div className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    OPERATIONAL SITUATION SUMMARY
                  </div>
                  <p className="text-slate-200 leading-relaxed text-xs">
                    {explanation.summary}
                  </p>
                </div>

                {/* TACTICAL IMPACT */}
                <div className="p-3 rounded bg-[#0a0f15] border border-white/10 space-y-2">
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                    TACTICAL IMPACT ANALYSIS
                  </div>
                  <p className="text-slate-300 text-xs">
                    {explanation.tacticalImpact}
                  </p>
                </div>

                {/* ACTIONABLE RECOMMENDATION */}
                <div className="p-3 rounded bg-[#0a0f15] border border-white/10 space-y-2">
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    TACTICAL COURSE OF ACTION
                  </div>
                  <p className="text-slate-300 text-xs">
                    {explanation.recommendedAction}
                  </p>
                </div>
              </div>
            )}

            {/* ANOMALY INDICATOR */}
            {event.isAnomaly && (
              <div className="p-3 rounded bg-rose-950/40 border border-rose-500/40 space-y-1">
                <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  STATISTICAL ANOMALY DETECTED
                </div>
                <p className="text-rose-200/90 text-xs">
                  {event.anomalyReason ||
                    'Kinematic speed or spatial density variance exceeds 2.5 sigma from normal baseline.'}
                </p>
              </div>
            )}

            {/* MEDIA AUTHENTICITY AUDIT (server forensic pipeline) */}
            {event.mediaAudit && (
              <div className="p-3 rounded bg-[#0a0f15] border border-white/10 space-y-1.5">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  MEDIA AUTHENTICITY AUDIT
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                      event.mediaAudit.manipulationCategory === 'NONE_DETECTED'
                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                        : event.mediaAudit.manipulationCategory === 'EVENT_FABRICATING'
                        ? 'bg-rose-950/70 text-rose-300 border-rose-500/40'
                        : 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {event.mediaAudit.manipulationCategory}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-[#05070a] border border-white/10 text-[9px] text-slate-300">
                    AUTH <b>{event.mediaAudit.authenticityScore}</b>/100
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-[#05070a] border border-white/10 text-[9px] text-slate-300">
                    AI-SYNTH <b>{event.mediaAudit.aiSyntheticScore}%</b>
                  </span>
                  {event.mediaAudit.deepfakeArtifacts?.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-rose-950/50 border border-rose-500/30 text-[9px] text-rose-300">
                      {event.mediaAudit.deepfakeArtifacts.length} artifact(s)
                    </span>
                  )}
                </div>
                {event.mediaAudit.factualCoreExtracted && (
                  <p className="text-slate-400 text-[11px] leading-snug">
                    <span className="uppercase text-[9px] text-slate-500">Extracted factual core: </span>
                    {event.mediaAudit.factualCoreExtracted}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HIGH-RESOLUTION SATELLITE RECON */}
        {activeTab === 'RECON' && (
          <div className="space-y-3">
            <EventReconMedia event={event} />
          </div>
        )}

        {/* TAB 3: VERIFIED NEWS WIRES */}
        {activeTab === 'NEWS' && (
          <div className="space-y-3">
            <LiveNewsFeed event={event} />
          </div>
        )}

        {/* TAB 4: DETAILED CONFIDENCE MATH */}
        {activeTab === 'MATH' && (
          <div className="space-y-4">
            <div className="p-3 rounded bg-[#0a0f15] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase">
                  Confidence Evidence Flow
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  Total: {bd.overall}%
                </span>
              </div>

              {/* FACTOR METERS */}
              <div className="space-y-2.5 pt-1">
                {[
                  { label: 'Source Reliability (Rs)', val: bd.sourceReliability, desc: 'Instrument precision & calibrated weight' },
                  { label: 'Data Freshness (Dt)', val: bd.dataFreshness, desc: '15-min half-life exponential decay' },
                  { label: 'Cross-Source Agreement', val: bd.sourceAgreement, desc: 'Independent sensors diversity scaling' },
                  { label: 'Spatial Proximity Agreement', val: bd.spatialAgreement, desc: 'Clustering within 5.0 km horizon' },
                  { label: 'Temporal Simultaneity', val: bd.temporalAgreement, desc: 'Observation sync within 600s window' },
                ].map((factor) => (
                  <div key={factor.label} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300 font-medium">{factor.label}</span>
                      <span className="font-bold text-cyan-300">{factor.val}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                      <div
                        className="h-full bg-cyan-400"
                        style={{ width: `${Math.min(100, factor.val)}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-slate-500">{factor.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* COUNTERFACTUAL EVIDENCE GAIN */}
            <div className="p-3 rounded bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1.5">
              <span className="font-bold text-emerald-300">COUNTERFACTUAL VERDICT:</span>
              {correlations ? (
                <>
                  <p className="text-slate-300">
                    Without cross-source corroboration, this observation would yield only{' '}
                    <strong className="text-white">{correlations.counterfactual.confidenceWithoutCorroboration}% confidence</strong>.
                    Multi-sensor corroboration boosted overall certainty by{' '}
                    <strong className="text-emerald-400">+{correlations.counterfactual.confidenceGain.toFixed(1)}%</strong>.
                  </p>
                  <p className="text-slate-500 text-[10px]">{correlations.counterfactual.note}</p>
                </>
              ) : (
                <p className="text-slate-300">
                  Without cross-source corroboration, this single observation would yield only{' '}
                  <strong className="text-white">{bd.sourceReliability}% confidence</strong>. Multi-sensor corroboration boosted overall certainty by{' '}
                  <strong className="text-emerald-400">+{Math.max(0, bd.overall - bd.sourceReliability)}%</strong>
                  {corrError ? ' (local estimate)' : ''}.
                </p>
              )}
            </div>

            {/* REAL FORMULA STRIP */}
            {correlations && (
              <div className="p-3 rounded bg-[#0a0f15] border border-white/10 space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  SERVER CONFIDENCE FUNCTION
                </div>
                <code className="block text-[10px] text-cyan-200/80 font-mono leading-relaxed break-words">
                  {correlations.confidence.formula}
                </code>
                <p className="text-slate-500 text-[10px]">{correlations.confidence.explanation}</p>
                {corrLoading && <span className="text-[9px] text-slate-500 animate-pulse">SYNCING FROM FUSION ENGINE…</span>}
              </div>
            )}
          </div>
        )}

{/* TAB 5: CORRELATIONS LIST (SERVER CORRELATION ENGINE) */}
        {activeTab === 'CORRELATIONS' && (
          <div className="space-y-2">
            {correlations && (
              <div className="p-2.5 rounded bg-[#0a0f15] border border-cyan-500/20 text-[11px] space-y-1">
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className="px-1.5 py-0.2 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-bold">
                    {correlations.corroboration.count} CORROBORATORS
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-[#05070a] border border-white/10 text-slate-300">
                    Horizon: ≤ {correlations.correlationWindows.radiusMeters}m / {correlations.correlationWindows.windowSeconds}s
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-[#05070a] border border-white/10 text-slate-300">
                    Sources: {[...correlations.corroboration.distinctSources].join(', ')}
                  </span>
                </div>
                <div className="text-[9px] text-slate-500">
                  {correlations.corroboration.links.length > 0
                    ? 'Links scored by the fusion engine (strength = spatial × temporal × source-diversity agreement).'
                    : 'No secondary sensors currently within spatial-temporal correlation horizon.'}
                </div>
              </div>
            )}

            {corrLoading && (
              <div className="p-3 rounded bg-[#0a0f15] border border-white/10 text-slate-400 animate-pulse text-center text-[10px]">
                QUERYING CORRELATION ENGINE…
              </div>
            )}

            {correlations &&
              correlations.corroboration.links.map((link) => (
                <div
                  key={link.event.id}
                  className="p-2.5 rounded bg-[#0a0f15] border border-white/10 hover:border-cyan-500/40 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-cyan-300 shrink-0">[{link.event.id}]</span>
                      <span className="text-[10px] text-slate-400 truncate">{link.event.title}</span>
                    </div>
                    <span className="shrink-0 px-1.5 py-0.2 rounded bg-[#05070a] border border-white/10 text-[9px] text-emerald-300">
                      {Math.round(link.strength * 100)}% MATCH
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[9px] text-slate-500">
                    <span>Δ {(link.distanceMeters / 1000).toFixed(1)} km</span>
                    <span>Δ {(link.deltaSeconds / 60).toFixed(0)} min</span>
                    <span>{link.event.sourceType.toUpperCase()}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">{link.rationale}</p>
                  <button
                    onClick={() => onSelectCorrelatedEvent && onSelectCorrelatedEvent(link.event.id)}
                    className="flex items-center gap-1 text-[10px] text-cyan-300 hover:text-cyan-100"
                  >
                    Inspect Contact <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              ))}

            {correlations && correlations.corroboration.links.length === 0 && !corrLoading && (
              <div className="p-4 rounded bg-[#0a0f15] border border-white/10 text-slate-500 italic text-center">
                Isolated contact: dynamic correlation had no surviving links.
              </div>
            )}

            {/* REJECTED CANDIDATES — counterfactual links the engine evaluated */}
            {candidates && candidates.candidates.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-amber-400" />
                  REJECTED CANDIDATE LINKS ({candidates.candidates.length} evaluated)
                </div>
                {candidates.candidates.map((cand) => (
                  <div
                    key={cand.eventId}
                    className="p-2 rounded bg-[#070b10] border border-white/5 text-[10px] space-y-0.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-300">[{cand.eventId}]</span>
                      <span className="text-slate-400 truncate">{cand.title}</span>
                      <span className="ml-auto shrink-0 text-slate-500">
                        Δ {(cand.distanceMeters / 1000).toFixed(1)} km · {Math.round(cand.strength * 100)}%
                      </span>
                    </div>
                    <div className="text-rose-300/80">{cand.rejectedBecause}</div>
                  </div>
                ))}
              </div>
            )}

            {corrError && !correlations && (
              <div className="p-3 rounded bg-amber-950/30 border border-amber-500/30 text-[10px] text-amber-200">
                {corrError} Showing event-local corroboration IDs instead.
                {event.corroboratedBy?.map((corrId) => (
                  <button
                    key={corrId}
                    onClick={() => onSelectCorrelatedEvent && onSelectCorrelatedEvent(corrId)}
                    className="mx-1 px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:text-cyan-100"
                  >
                    [{corrId}]
                  </button>
                ))}
              </div>
            )}

            {!correlations && !candidates && !corrLoading && !corrError && (
              <div className="p-4 rounded bg-[#0a0f15] border border-white/10 text-slate-500 italic text-center">
                Isolated contact: No secondary sensors currently within spatial-temporal correlation horizon.
              </div>
            )}
          </div>
        )}

        {/* TAB 6: RAW JSON PAYLOAD */}
        {activeTab === 'RAW' && (
          <pre className="p-3 rounded bg-[#05070a] border border-white/10 text-[11px] font-mono text-cyan-300/90 overflow-x-auto">
            {JSON.stringify(event, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
