import React, { useState } from 'react';
import { UnifiedEvent } from '../../types/schema';
import { explainEvent } from '../../data/eventExplainer';
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
  Info
} from 'lucide-react';

interface EventInvestigationDrawerProps {
  event: UnifiedEvent | null;
  onClose: () => void;
  onSelectCorrelatedEvent?: (eventId: string) => void;
  onOpenRawJson?: (event: UnifiedEvent) => void;
}

export default function EventInvestigationDrawer({
  event,
  onClose,
  onSelectCorrelatedEvent,
  onOpenRawJson
}: EventInvestigationDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'EXPLAIN' | 'MATH' | 'CORRELATIONS' | 'RAW'>('EXPLAIN');

  if (!event) return null;

  const explanation = explainEvent(event);
  const bd = event.confidenceBreakdown || {
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
      <div className="flex items-center border-b border-white/10 px-4 bg-[#05070a]">
        {[
          { id: 'EXPLAIN', label: 'Summary & Assessment' },
          { id: 'MATH', label: 'Confidence Math (Rs × Dt × Bc)' },
          { id: 'CORRELATIONS', label: `Corroborators (${event.corroboratedBy?.length || 0})` },
          { id: 'RAW', label: 'Raw Payload' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2.5 text-[11px] font-semibold border-b-2 transition-all ${
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
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* KEY TELEMETRY STRIP */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded bg-[#0a0f15] border border-white/10 text-slate-300">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Source Type</div>
            <div className="font-semibold text-cyan-300">{event.sourceType.toUpperCase()}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Coordinates</div>
            <div className="font-semibold">{event.location.lat.toFixed(4)}°N, {event.location.lng.toFixed(4)}°E</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Overall Confidence</div>
            <div className="font-bold text-emerald-400 text-sm">{event.confidence}%</div>
          </div>
        </div>

        {/* TAB 1: PLAIN ENGLISH & REASONING */}
        {activeTab === 'EXPLAIN' && (
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

            {/* ANOMALY INDICATOR */}
            {event.isAnomaly && (
              <div className="p-3 rounded bg-rose-950/40 border border-rose-500/40 space-y-1">
                <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  STATISTICAL ANOMALY DETECTED
                </div>
                <p className="text-rose-200/90 text-xs">
                  Kinematic speed or spatial density variance exceeds 2.5 sigma from normal baseline.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DETAILED CONFIDENCE MATH */}
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
            <div className="p-3 rounded bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1">
              <span className="font-bold text-emerald-300">COUNTERFACTUAL VERDICT:</span>
              <p className="text-slate-300">
                Without cross-source corroboration, this single observation would yield only{' '}
                <strong className="text-white">{bd.sourceReliability}% confidence</strong>. Multi-sensor corroboration boosted overall certainty by{' '}
                <strong className="text-emerald-400">+{Math.max(0, bd.overall - bd.sourceReliability)}%</strong>.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: CORRELATIONS LIST */}
        {activeTab === 'CORRELATIONS' && (
          <div className="space-y-2">
            <div className="text-xs text-slate-400 pb-1">
              Corroborating observation IDs clustered via Union-Find (Spatial horizon: ≤ 5.0 km, Time: ≤ 600s):
            </div>
            {event.corroboratedBy && event.corroboratedBy.length > 0 ? (
              event.corroboratedBy.map((corrId) => (
                <div
                  key={corrId}
                  className="flex items-center justify-between p-2.5 rounded bg-[#0a0f15] border border-white/10 hover:border-cyan-500/40"
                >
                  <span className="font-bold text-cyan-300">[{corrId}]</span>
                  <button
                    onClick={() => onSelectCorrelatedEvent && onSelectCorrelatedEvent(corrId)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-300"
                  >
                    Inspect Contact <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-4 rounded bg-[#0a0f15] border border-white/10 text-slate-500 italic text-center">
                Isolated contact: No secondary sensors currently within spatial-temporal correlation horizon.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: RAW JSON PAYLOAD */}
        {activeTab === 'RAW' && (
          <pre className="p-3 rounded bg-[#05070a] border border-white/10 text-[11px] font-mono text-cyan-300/90 overflow-x-auto">
            {JSON.stringify(event, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
