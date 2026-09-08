import React, { useState } from 'react';
import { UnifiedEvent } from '../types/schema';
import { evaluateMediaAuthenticity } from '../data/authenticityEngine';
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, Cpu, Mic, FileCode, Satellite, Sparkles, Filter, ExternalLink, RefreshCw, Play } from 'lucide-react';

interface OsintAuthenticityVerifierProps {
  events: UnifiedEvent[];
  onSelectEvent?: (evt: UnifiedEvent) => void;
}

export default function OsintAuthenticityVerifier({ events, onSelectEvent }: OsintAuthenticityVerifierProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [filterType, setFilterType] = useState<string>('ALL');

  const osintEvents = events.filter((e) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'SOCIAL') return e.sourceType === 'social_media' || e.raw?.platform;
    if (filterType === 'AUDIO') return e.sourceType === 'audio_recording' || e.raw?.audioStream;
    if (filterType === 'HYBRID') {
      const audit = evaluateMediaAuthenticity(e);
      return audit.veracityClassification === 'HYBRID_AI_AUTHENTIC_FACT';
    }
    if (filterType === 'DEEPFAKE') {
      const audit = evaluateMediaAuthenticity(e);
      return audit.veracityClassification === 'SYNTHETIC_DISINFORMATION' || audit.aiSyntheticScore > 70;
    }
    return true;
  });

  const activeEvent = events.find((e) => e.id === selectedEventId) || events[0];
  const audit = activeEvent ? evaluateMediaAuthenticity(activeEvent) : null;

  return (
    <div className="space-y-6 font-mono">
      {/* HEADER BANNER */}
      <div className="hud-card p-6 rounded-2xl border border-cyan-500/40 bg-slate-900/90 shadow-2xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] bg-cyan-950 border border-cyan-700 text-cyan-400 font-bold px-2.5 py-0.5 rounded tracking-widest uppercase flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> VANGUARD OSINT & AI MEDIA VERIFIER ENGINE
              </span>
              <span className="text-xs text-slate-400 font-mono">Multi-Parameter Signal Corroboration</span>
            </div>
            <h2 className="font-hud font-bold text-2xl text-slate-100">
              Social Media OSINT, Acoustic Audio & AI Deepfake Audit Center
            </h2>
            <p className="text-xs text-slate-300 font-sans mt-1 max-w-3xl">
              Integrates multi-source feeds from Instagram, X, acoustic hydrophones, and drone feeds. Evaluates media for AI deepfakes while extracting authentic physical facts corroborated by orbital satellites and primary radar.
            </p>
          </div>
        </div>

        {/* FILTER BUTTONS */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 overflow-x-auto text-xs">
          <span className="text-slate-400 font-bold mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-amber-400" /> FEED FILTER:
          </span>
          {[
            { id: 'ALL', label: '🌍 ALL OSINT STREAMS' },
            { id: 'SOCIAL', label: '📱 INSTAGRAM / SOCIAL MEDIA' },
            { id: 'AUDIO', label: '🎙️ ACOUSTIC HYDROPHONE' },
            { id: 'HYBRID', label: '🟡 HYBRID AI (FACT VERIFIED)' },
            { id: 'DEEPFAKE', label: '🚨 DEEPFAKE WARNINGS' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id)}
              className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
                filterType === btn.id
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950/50'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN TWO-COLUMN INSPECTION LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: OSINT & MEDIA FEED LIST (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
            INGESTED OSINT & MULTI-MEDIA STREAMS ({osintEvents.length})
          </h3>

          <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
            {osintEvents.map((evt) => {
              const evtAudit = evaluateMediaAuthenticity(evt);
              const isSelected = evt.id === activeEvent?.id;

              const badgeColor =
                evtAudit.veracityClassification === 'VERIFIED_AUTHENTIC'
                  ? 'bg-emerald-950/90 border-emerald-700 text-emerald-400'
                  : evtAudit.veracityClassification === 'HYBRID_AI_AUTHENTIC_FACT'
                  ? 'bg-amber-950/90 border-amber-600 text-amber-300'
                  : 'bg-rose-950/90 border-rose-700 text-rose-400';

              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`hud-card p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-cyan-400 bg-slate-900/90 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500'
                      : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] bg-slate-900 border border-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase font-bold">
                      {evt.sourceType.toUpperCase()}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${badgeColor}`}>
                      {evtAudit.veracityClassification.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h4 className="font-hud font-bold text-sm text-slate-100 mb-1 leading-snug">
                    {evt.title}
                  </h4>
                  <p className="text-xs text-slate-400 font-sans line-clamp-2 mb-3">
                    {evt.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-900 p-2 rounded border border-slate-800">
                    <div>
                      <span className="text-slate-500 block">AI SYNTHETIC</span>
                      <span className={evtAudit.aiSyntheticScore > 60 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {evtAudit.aiSyntheticScore}% AI DETECTED
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">SATELLITE MATCH</span>
                      <span className="text-cyan-300 font-bold">
                        {evtAudit.crossSensorCorroborationScore}% MATCH
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED AUTHENTICITY AUDIT PANEL (7 Cols) */}
        {activeEvent && audit && (
          <div className="lg:col-span-7 space-y-4">
            <div className="hud-card p-6 rounded-2xl border border-cyan-500/40 bg-slate-900/95 shadow-2xl space-y-6">
              {/* ITEM TITLE & VERACITY BANNER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] text-cyan-400 bg-cyan-950 px-2.5 py-0.5 rounded border border-cyan-800 font-bold uppercase mb-1 inline-block">
                    EVENT ID: {activeEvent.id} • {activeEvent.sourceType.toUpperCase()}
                  </span>
                  <h3 className="font-hud font-bold text-xl text-slate-100">
                    {activeEvent.title}
                  </h3>
                </div>

                <div className={`px-4 py-2 rounded-xl border text-center font-bold ${
                  audit.veracityClassification === 'VERIFIED_AUTHENTIC'
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/50'
                    : audit.veracityClassification === 'HYBRID_AI_AUTHENTIC_FACT'
                    ? 'bg-amber-950 border-amber-500 text-amber-300 shadow-md shadow-amber-950/50'
                    : 'bg-rose-950 border-rose-500 text-rose-300 shadow-md shadow-rose-950/50'
                }`}>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest">VERACITY STATUS</div>
                  <div className="text-xs font-hud font-bold tracking-wider mt-0.5">
                    {audit.veracityClassification.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              {/* EXTRACTED GROUND TRUTH SIGNAL PANEL */}
              <div className={`p-4 rounded-xl border space-y-2 ${
                audit.veracityClassification === 'HYBRID_AI_AUTHENTIC_FACT'
                  ? 'bg-amber-950/60 border-amber-500/60 text-amber-200'
                  : audit.veracityClassification === 'VERIFIED_AUTHENTIC'
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/60 text-rose-200'
              }`}>
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>EXTRACTED GROUND TRUTH SIGNAL (VANGUARD AI SORTING ENGINE)</span>
                </div>
                <p className="text-xs font-sans leading-relaxed text-slate-100">
                  {audit.factualCoreExtracted}
                </p>
              </div>

              {/* 4-PARAMETER VERIFICATION GAUGES */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" /> MULTI-PARAMETER VERIFICATION SCORE BREAKDOWN
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Gauge 1: AI / Deepfake Score */}
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                        <Cpu className="w-3.5 h-3.5 text-amber-400" /> AI / Deepfake Detection
                      </span>
                      <span className={audit.aiSyntheticScore > 60 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {audit.aiSyntheticScore}% AI Confidence
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-500 ${audit.aiSyntheticScore > 60 ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${audit.aiSyntheticScore}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans">
                      {audit.aiSyntheticScore > 60 ? 'Synthetic voiceover / deepfake video artifacts detected.' : 'Human natural optical / vocal characteristics verified.'}
                    </p>
                  </div>

                  {/* Gauge 2: Acoustic & Audio Spectrum */}
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                        <Mic className="w-3.5 h-3.5 text-cyan-400" /> Acoustic Spectrum Audit
                      </span>
                      <span className="text-cyan-300 font-bold">{audit.acousticSpectrumScore}% Match</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${audit.acousticSpectrumScore}%` }}></div>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans">
                      Hydrophone / microphone ambient noise floor & physical acoustics analysis.
                    </p>
                  </div>

                  {/* Gauge 3: Provenance EXIF Audit */}
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                        <FileCode className="w-3.5 h-3.5 text-emerald-400" /> Metadata & C2PA EXIF
                      </span>
                      <span className="text-emerald-300 font-bold">{audit.provenanceScore}% Intact</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div className="h-full bg-emerald-500" style={{ width: `${audit.provenanceScore}%` }}></div>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans">
                      Device camera fingerprinting & cryptographic timestamp validation.
                    </p>
                  </div>

                  {/* Gauge 4: Cross-Sensor Satellite/Radar Corroboration */}
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                        <Satellite className="w-3.5 h-3.5 text-purple-400" /> Satellite & Radar Correlation
                      </span>
                      <span className="text-purple-300 font-bold">{audit.crossSensorCorroborationScore}% Corroborated</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500" style={{ width: `${audit.crossSensorCorroborationScore}%` }}></div>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans">
                      Physical occurrence match with orbital ESRI satellites & primary radar.
                    </p>
                  </div>
                </div>
              </div>

              {/* DEEPFAKE ARTIFACT LIST (IF DETECTED) */}
              {audit.deepfakeArtifacts && audit.deepfakeArtifacts.length > 0 && (
                <div className="p-4 bg-slate-950 rounded-xl border border-amber-800/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-amber-400 font-bold">
                    <AlertTriangle className="w-4 h-4" /> AI SYNTHETIC ARTIFACT AUDIT TRAIL ({audit.deepfakeArtifacts.length})
                  </div>
                  <ul className="space-y-1 text-xs text-slate-300 font-sans list-disc list-inside">
                    {audit.deepfakeArtifacts.map((art, idx) => (
                      <li key={idx} className="text-amber-200">{art}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ACTION FOOTER */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  Coordinates: {activeEvent.location.lat.toFixed(4)}°N, {activeEvent.location.lng.toFixed(4)}°E
                </span>
                {onSelectEvent && (
                  <button
                    onClick={() => onSelectEvent(activeEvent)}
                    className="px-4 py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-600 text-cyan-300 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all"
                  >
                    <span>OPEN FULL TACTICAL EXPLAINER</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
