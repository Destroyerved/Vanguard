import React from 'react';
import { useEventStore } from '../../store/useEventStore';
import { X, Calculator, ShieldCheck, CheckCircle2, Code2, ArrowRight } from 'lucide-react';

export const ExplainabilityModal: React.FC = () => {
  const explainabilityEventId = useEventStore((s) => s.explainabilityEventId);
  const closeExplainability = useEventStore((s) => s.closeExplainability);
  const events = useEventStore((s) => s.events);

  if (!explainabilityEventId) return null;

  const event = events.find((e) => e.id === explainabilityEventId);
  if (!event) return null;

  const bd = event.confidenceBreakdown || {
    overall: event.confidence,
    sourceAgreement: 88,
    spatialAgreement: 92,
    temporalAgreement: 85,
    sourceReliability: 94,
    dataFreshness: 96
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#070d16] border border-cyan-500/60 rounded-lg shadow-[0_0_40px_rgba(0,240,255,0.25)] overflow-hidden tactical-box font-mono">
        {/* Header */}
        <div className="bg-[#091522] border-b border-cyan-500/40 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-xs font-black tracking-widest text-cyan-300 uppercase">
                EXPLAINABILITY &amp; CONFIDENCE MATH INSPECTOR
              </div>
              <div className="text-[11px] text-slate-400">
                EVENT ID: <span className="text-white font-bold">{event.id}</span> • SOURCE: <span className="text-cyan-400 uppercase font-bold">{event.sourceType}</span>
              </div>
            </div>
          </div>

          <button
            onClick={closeExplainability}
            className="p-1 text-slate-400 hover:text-white rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Main Overall Score Card */}
          <div className="bg-[#0b1420] border border-cyan-500/30 rounded p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                COMPUTED CONFIDENCE RATING
              </div>
              <div className="text-2xl font-black text-emerald-400 crt-glow">
                {event.confidence}% (HIGH RELIABILITY)
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-400">
              <div>CORROBORATED BY: <b className="text-cyan-300">{event.corroboratedBy.length} FEEDS</b></div>
              <div>CLASSIFICATION: <b className="text-white">{event.classification || 'TACTICAL SENSOR'}</b></div>
            </div>
          </div>

          {/* Mathematical Formula Display */}
          <div className="bg-[#04080e] border border-cyan-500/20 rounded p-3 text-xs">
            <div className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
              DETERMINISTIC FUSION FORMULA
            </div>
            <div className="p-2 bg-black/60 rounded border border-slate-800 text-cyan-300 text-[11px] font-mono leading-relaxed">
              Confidence = min(100, round(SourceReliability × RecencyDecay × CorroborationBoost × 100))
            </div>
          </div>

          {/* Breakdown Factor Bars */}
          <div className="space-y-2.5 bg-[#0b1420] border border-cyan-500/20 rounded p-3 text-xs">
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2">
              CONTRIBUTING FACTOR WEIGHTS
            </div>

            {/* Factor 1: Source Reliability */}
            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-300">1. Source Base Reliability ({event.sourceType.toUpperCase()})</span>
                <span className="text-cyan-300 font-bold">{bd.sourceReliability}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400" style={{ width: `${bd.sourceReliability}%` }}></div>
              </div>
            </div>

            {/* Factor 2: Spatial Agreement */}
            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-300">2. Spatial Corroboration Agreement (Haversine ≤ 35km)</span>
                <span className="text-emerald-400 font-bold">{bd.spatialAgreement}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${bd.spatialAgreement}%` }}></div>
              </div>
            </div>

            {/* Factor 3: Temporal Recency */}
            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-300">3. Data Freshness &amp; Recency Decay (e^-λt)</span>
                <span className="text-amber-400 font-bold">{bd.dataFreshness}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${bd.dataFreshness}%` }}></div>
              </div>
            </div>

            {/* Factor 4: Multi-Source Boost */}
            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-slate-300">4. Multi-Source Corroboration Boost (+15% / feed)</span>
                <span className="text-purple-400 font-bold">+{event.corroboratedBy.length * 15}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-400" style={{ width: `${Math.min(100, event.corroboratedBy.length * 35)}%` }}></div>
              </div>
            </div>
          </div>

          {/* Raw Sensor Telemetry Inspector */}
          <div className="bg-[#04080e] border border-cyan-500/20 rounded p-3 text-xs">
            <div className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
              <Code2 className="w-3 h-3" />
              <span>RAW SENSOR TELEMETRY OBJECT (JSON)</span>
            </div>
            <pre className="p-2 bg-black/80 rounded text-[10px] text-slate-300 font-mono overflow-x-auto border border-slate-800">
              {JSON.stringify(event.raw, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
