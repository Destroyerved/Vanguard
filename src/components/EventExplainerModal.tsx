import React, { useState } from 'react';
import { UnifiedEvent } from '../types/schema';
import { explainEvent } from '../data/eventExplainer';
import { evaluateMediaAuthenticity } from '../data/authenticityEngine';
import EventReconMedia from './EventReconMedia';
import LiveNewsFeed from './LiveNewsFeed';
import { generateEventPdfReport } from '../utils/generatePdfReport';
import {
  X,
  Zap,
  Activity,
  AlertTriangle,
  FileText,
  Globe,
  Newspaper,
  ShieldCheck,
  Cpu,
  ExternalLink,
  Code,
  CheckCircle2,
  Mic,
  Satellite,
  Download
} from 'lucide-react';

interface EventExplainerModalProps {
  event: UnifiedEvent;
  easyMode: boolean;
  onToggleEasyMode: () => void;
  onClose: () => void;
  onInspectJson: (evt: UnifiedEvent) => void;
}

export default function EventExplainerModal({
  event,
  easyMode,
  onToggleEasyMode,
  onClose,
  onInspectJson,
}: EventExplainerModalProps) {
  const [modalTab, setModalTab] = useState<'summary' | 'satellite' | 'news' | 'audit'>('summary');
  const explanation = explainEvent(event);
  const mediaAudit = evaluateMediaAuthenticity(event);

  const severityColor =
    event.severity === 'critical' ? 'bg-rose-950 border-rose-800 text-rose-400' :
    event.severity === 'high' ? 'bg-amber-950 border-amber-800 text-amber-400' : 'bg-cyan-950 border-cyan-800 text-cyan-400';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-cyan-500/40 rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[92vh] font-mono text-slate-100">
        
        {/* 1. MODAL HEADER */}
        <div className="flex flex-col gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${severityColor}`}>
                  {event.sourceType.toUpperCase()} • {event.severity.toUpperCase()}
                </span>
                <span className="text-xs text-cyan-400 font-bold">{event.id}</span>
                {event.isAnomaly && (
                  <span className="text-[10px] bg-rose-950 border border-rose-700 text-rose-300 font-bold px-2 py-0.5 rounded animate-pulse">
                    ANOMALY
                  </span>
                )}
                <span className="text-[10px] text-slate-400">
                  {new Date(event.timestamp).toLocaleTimeString()} UTC
                </span>
              </div>
              <h3 className="font-hud font-bold text-xl text-slate-100">{event.title}</h3>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* TAB NAVIGATION & MODE TOGGLE */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              {[
                { id: 'summary', label: '🎯 SUMMARY & ACTION', icon: <Zap className="w-3.5 h-3.5 text-amber-400" /> },
                { id: 'satellite', label: '📡 SATELLITE & GPS', icon: <Globe className="w-3.5 h-3.5 text-cyan-400" /> },
                { id: 'news', label: '📰 OSINT NEWS WIRES', icon: <Newspaper className="w-3.5 h-3.5 text-emerald-400" /> },
                { id: 'audit', label: '🛡️ AI & FUSION AUDIT', icon: <Cpu className="w-3.5 h-3.5 text-purple-400" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setModalTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${
                    modalTab === tab.id
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={onToggleEasyMode}
              className={`px-3 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 ${
                easyMode ? 'bg-amber-950 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span>{easyMode ? '💡 PLAIN ENGLISH' : '⚡ TACTICAL HUD'}</span>
            </button>
          </div>
        </div>

        {/* 2. MODAL TAB CONTENT AREA */}
        <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
          
          {/* TAB 1: SUMMARY & ACTION */}
          {modalTab === 'summary' && (
            <div className="space-y-4">
              {/* Easy Mode Banner */}
              {easyMode && (
                <div className="p-4 bg-amber-950/40 rounded-xl border border-amber-500/50 space-y-2 font-sans">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-300 uppercase flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" /> EASY SUMMARY
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      {explanation.easy.simpleCertainty}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-100">{explanation.easy.simpleHeadline}</h4>
                  <p className="text-xs text-slate-200 leading-relaxed">{explanation.easy.simpleDescription}</p>

                  <div className="pt-2 border-t border-amber-900/60 text-xs font-mono space-y-1">
                    <div className="text-amber-300 font-bold">{explanation.easy.simpleActionStep}</div>
                    <div className="text-slate-400 text-[11px]">{explanation.easy.simpleTelemetry}</div>
                  </div>
                </div>
              )}

              {/* Recommended Action Protocol Callout */}
              <div className="p-4 bg-rose-950/40 rounded-xl border border-rose-700/60 space-y-1.5">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-rose-400 animate-pulse" /> RECOMMENDED DEFENSE PROTOCOL & ACTION
                </h4>
                <p className="text-xs text-slate-100 font-bold leading-relaxed">{explanation.recommendedAction}</p>
              </div>

              {/* Executive Overview & Tactical Impact Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> Executive Tactical Overview
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{explanation.summary}</p>
                </div>

                <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Operational Risk Assessment
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{explanation.tacticalImpact}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SATELLITE & GPS */}
          {modalTab === 'satellite' && (
            <div className="space-y-4">
              <EventReconMedia event={event} />

              <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-cyan-400" /> Sensor Kinematics & Coordinates
                </h4>
                <p className="text-xs text-slate-200 font-mono">{explanation.telemetryBreakdown}</p>

                <div className="pt-2 border-t border-slate-900 flex justify-end">
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${event.location?.lat}&mlon=${event.location?.lng}#map=13/${event.location?.lat}/${event.location?.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-cyan-950 border border-cyan-700 hover:bg-cyan-900 text-cyan-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    Open Coordinates in OpenStreetMap <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OSINT NEWS WIRES */}
          {modalTab === 'news' && (
            <LiveNewsFeed event={event} />
          )}

          {/* TAB 4: AI & FUSION AUDIT */}
          {modalTab === 'audit' && (
            <div className="space-y-4">
              {/* Media Veracity Banner */}
              <div className={`p-4 rounded-xl border space-y-2 ${
                mediaAudit.veracityClassification === 'VERIFIED_AUTHENTIC'
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                  : mediaAudit.veracityClassification === 'HYBRID_AI_AUTHENTIC_FACT'
                  ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                  : 'bg-rose-950/60 border-rose-500 text-rose-300'
              }`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="uppercase">Media Veracity Classification: {mediaAudit.veracityClassification.replace(/_/g, ' ')}</span>
                  <span>{mediaAudit.overallAuthenticityScore}% Authenticity Rating</span>
                </div>
                <p className="text-xs font-sans text-slate-100">{mediaAudit.factualCoreExtracted}</p>
              </div>

              {/* Fusion Confidence Breakdown Progress Bars */}
              <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4" /> Multi-Sensor Fusion Agreement
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">{explanation.verificationAnalysis}</p>

                {event.confidenceBreakdown && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-900 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1 text-[11px]">
                        <span>Source Agreement</span>
                        <span className="text-cyan-300 font-bold">{event.confidenceBreakdown.sourceAgreement}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${event.confidenceBreakdown.sourceAgreement}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1 text-[11px]">
                        <span>Spatial Agreement</span>
                        <span className="text-cyan-300 font-bold">{event.confidenceBreakdown.spatialAgreement}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${event.confidenceBreakdown.spatialAgreement}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1 text-[11px]">
                        <span>Temporal Agreement</span>
                        <span className="text-cyan-300 font-bold">{event.confidenceBreakdown.temporalAgreement}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${event.confidenceBreakdown.temporalAgreement}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1 text-[11px]">
                        <span>Data Freshness</span>
                        <span className="text-cyan-300 font-bold">{event.confidenceBreakdown.dataFreshness}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${event.confidenceBreakdown.dataFreshness}%` }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* 3. MODAL FOOTER */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => generateEventPdfReport(event)}
              className="px-3.5 py-1.5 bg-cyan-950 border border-cyan-500/60 hover:bg-cyan-900 text-cyan-300 rounded-lg flex items-center gap-1.5 transition-colors font-mono font-bold shadow-hud-glow"
            >
              <Download className="w-4 h-4 text-cyan-400" /> Export PDF Dossier
            </button>
            <button
              onClick={() => onInspectJson(event)}
              className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-cyan-700 text-slate-300 rounded-lg flex items-center gap-1.5 transition-colors font-mono"
            >
              <Code className="w-4 h-4 text-cyan-400" /> Inspect JSON
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition-colors"
          >
            Close Modal
          </button>
        </div>

      </div>
    </div>
  );
}
