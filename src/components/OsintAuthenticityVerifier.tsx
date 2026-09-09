import React, { useState } from 'react';
import { UnifiedEvent } from '../types/schema';
import { evaluateMediaAuthenticity } from '../data/authenticityEngine';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Mic,
  FileCode,
  Satellite,
  Sparkles,
  Filter,
  ExternalLink,
  RefreshCw,
  Play,
  Film,
  Activity,
  Layers,
  Camera,
  Binary,
  Volume2,
  Check,
  Clock,
  Radio,
} from 'lucide-react';

interface OsintAuthenticityVerifierProps {
  events: UnifiedEvent[];
  onSelectEvent?: (evt: UnifiedEvent) => void;
}

export default function OsintAuthenticityVerifier({ events, onSelectEvent }: OsintAuthenticityVerifierProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'METADATA' | 'VISION_TEMPORAL' | 'ACOUSTIC' | 'SENSOR_PRNU' | 'ENSEMBLE'>('OVERVIEW');

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
    <div className="space-y-6 font-mono select-none">
      {/* HEADER BANNER */}
      <div className="vg-panel p-6 rounded-2xl border border-[#526a27]/40 bg-white/[0.05] backdrop-blur-md shadow-2xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] bg-[#a4c639]/10 backdrop-blur-md border border-[#3f5220] text-[#a4c639] font-bold px-2.5 py-0.5 rounded-lg tracking-widest uppercase flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-[#a4c639]" /> VANGUARD MULTI-PARAMETER FORENSIC & OSINT ENGINE
              </span>
              <span className="text-xs text-slate-400 font-mono">Full Bitstream, Vision, Acoustic & Sensor Corroboration</span>
            </div>
            <h2 className="font-heading font-bold text-2xl text-slate-100">
              Multi-Source Media, Metadata & Deepfake Forensic Intelligence Center
            </h2>
            <p className="text-xs text-slate-300 font-sans mt-1 max-w-3xl">
              Extracts 8 forensic layers across incoming feeds: bitstream container metadata, frame-level boundary blur, temporal consistency, acoustic FFT spectrum, camera PRNU noise, and multi-model detector ensemble fused with orbital satellites.
            </p>
          </div>
        </div>

        {/* FEED FILTER BUTTONS */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10 overflow-x-auto text-xs">
          <span className="text-slate-400 font-bold mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-amber-400" /> STREAM FILTER:
          </span>
          {[
            { id: 'ALL', label: '🌍 ALL FEEDS' },
            { id: 'SOCIAL', label: '📱 INSTAGRAM / SOCIAL' },
            { id: 'AUDIO', label: '🎙️ HYDROPHONE / AUDIO' },
            { id: 'HYBRID', label: '🟡 HYBRID AI (FACT VERIFIED)' },
            { id: 'DEEPFAKE', label: '🚨 DEEPFAKE DISINFO' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id)}
              className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
                filterType === btn.id
                  ? 'bg-[#a4c639]/10 backdrop-blur-md border-[#526a27] text-[#bcd94f] shadow-md shadow-[#16200d]/50'
                  : 'bg-white/[0.035] backdrop-blur-md border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN TWO-COLUMN INSPECTION LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: OSINT & MEDIA FEED LIST (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
            INGESTED MEDIA & SENSOR FEEDS ({osintEvents.length})
          </h3>

          <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
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
                  className={`vg-panel p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#a4c639] bg-white/[0.05] backdrop-blur-md shadow-lg shadow-[#16200d]/40 ring-1 ring-[#a4c639]'
                      : 'border-white/10 bg-white/[0.035] backdrop-blur-md hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] bg-white/[0.05] backdrop-blur-md border border-white/15 text-slate-300 px-2 py-0.5 rounded-lg uppercase font-bold">
                      {evt.sourceType.toUpperCase()}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold ${badgeColor}`}>
                      {evtAudit.veracityClassification.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h4 className="font-heading font-bold text-sm text-slate-100 mb-1 leading-snug">
                    {evt.title}
                  </h4>
                  <p className="text-xs text-slate-400 font-sans line-clamp-2 mb-3">
                    {evt.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] bg-white/[0.05] backdrop-blur-md p-2 rounded-lg border border-white/10">
                    <div>
                      <span className="text-slate-500 block">AI SYNTHETIC</span>
                      <span className={evtAudit.aiSyntheticScore > 60 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {evtAudit.aiSyntheticScore}% AI DETECTED
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">SATELLITE MATCH</span>
                      <span className="text-[#bcd94f] font-bold">
                        {evtAudit.crossSensorCorroborationScore}% MATCH
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: MULTI-TAB FORENSIC INSPECTION CONSOLE (8 Cols) */}
        {activeEvent && audit && (
          <div className="lg:col-span-8 space-y-4">
            <div className="vg-panel p-6 rounded-2xl border border-[#526a27]/40 bg-white/[0.05] backdrop-blur-md shadow-2xl space-y-5">
              {/* ITEM TITLE & VERACITY BANNER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] text-[#a4c639] bg-[#a4c639]/10 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-[#33401c] font-bold uppercase mb-1 inline-block">
                    EVENT ID: {activeEvent.id} • {activeEvent.sourceType.toUpperCase()}
                  </span>
                  <h3 className="font-heading font-bold text-xl text-slate-100">
                    {activeEvent.title}
                  </h3>
                </div>

                <div className={`px-4 py-2 rounded-xl border text-center font-bold ${
                  audit.veracityClassification === 'VERIFIED_AUTHENTIC'
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/50'
                    : audit.veracityClassification === 'HYBRID_AI_AUTHENTIC_FACT'
                    ? 'bg-amber-500/12 backdrop-blur-md border-amber-500 text-amber-300 shadow-md shadow-amber-950/50'
                    : 'bg-rose-950 border-rose-500 text-rose-300 shadow-md shadow-rose-950/50'
                }`}>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest">VERACITY CLASSIFICATION</div>
                  <div className="text-xs font-heading font-bold tracking-wider mt-0.5">
                    {audit.veracityClassification.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              {/* EXTRACTED GROUND TRUTH SIGNAL */}
              <div className={`p-4 rounded-xl border space-y-1.5 ${
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

              {/* TAB NAVIGATION */}
              <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 overflow-x-auto text-xs">
                {[
                  { id: 'OVERVIEW', label: '📊 SUMMARY GAUGES', icon: Activity },
                  { id: 'METADATA', label: '📁 METADATA & CODEC', icon: FileCode },
                  { id: 'VISION_TEMPORAL', label: '👁️ FRAME ARTIFACTS', icon: Film },
                  { id: 'ACOUSTIC', label: '🎙️ ACOUSTIC SPECTRUM', icon: Mic },
                  { id: 'SENSOR_PRNU', label: '📷 CAMERA SENSOR', icon: Camera },
                  { id: 'ENSEMBLE', label: '🧠 MULTI-MODEL MATRIX', icon: Layers },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-[#a4c639]/10 backdrop-blur-md border border-[#526a27] text-[#bcd94f] shadow-md'
                          : 'bg-white/[0.035] backdrop-blur-md border border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: OVERVIEW GAUGES */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Gauge 1: AI / Deepfake Score */}
                    <div className="p-3.5 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                          <Cpu className="w-3.5 h-3.5 text-amber-400" /> AI / Deepfake Detection
                        </span>
                        <span className={audit.aiSyntheticScore > 60 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {audit.aiSyntheticScore}% AI Confidence
                        </span>
                      </div>
                      <div className="w-full bg-white/[0.05] backdrop-blur-md rounded-full h-2 overflow-hidden border border-white/10">
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
                    <div className="p-3.5 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                          <Mic className="w-3.5 h-3.5 text-[#a4c639]" /> Acoustic Spectrum Audit
                        </span>
                        <span className="text-[#bcd94f] font-bold">{audit.acousticSpectrumScore}% Match</span>
                      </div>
                      <div className="w-full bg-white/[0.05] backdrop-blur-md rounded-full h-2 overflow-hidden border border-white/10">
                        <div className="h-full bg-gradient-to-r from-[#a4c639] to-[#526a27]" style={{ width: `${audit.acousticSpectrumScore}%` }}></div>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans">
                        Hydrophone / microphone ambient noise floor & physical acoustics analysis.
                      </p>
                    </div>

                    {/* Gauge 3: Provenance EXIF Audit */}
                    <div className="p-3.5 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                          <FileCode className="w-3.5 h-3.5 text-emerald-400" /> Metadata & C2PA Provenance
                        </span>
                        <span className="text-emerald-300 font-bold">{audit.provenanceScore}% Intact</span>
                      </div>
                      <div className="w-full bg-white/[0.05] backdrop-blur-md rounded-full h-2 overflow-hidden border border-white/10">
                        <div className="h-full bg-emerald-500" style={{ width: `${audit.provenanceScore}%` }}></div>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans">
                        Device camera fingerprinting & cryptographic timestamp validation.
                      </p>
                    </div>

                    {/* Gauge 4: Cross-Sensor Satellite/Radar Corroboration */}
                    <div className="p-3.5 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                          <Satellite className="w-3.5 h-3.5 text-emerald-400" /> Satellite & Radar Correlation
                        </span>
                        <span className="text-emerald-300 font-bold">{audit.crossSensorCorroborationScore}% Corroborated</span>
                      </div>
                      <div className="w-full bg-white/[0.05] backdrop-blur-md rounded-full h-2 overflow-hidden border border-white/10">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-[#526a27]" style={{ width: `${audit.crossSensorCorroborationScore}%` }}></div>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans">
                        Physical occurrence match with orbital ESRI satellites & primary radar.
                      </p>
                    </div>
                  </div>

                  {/* DEEPFAKE ARTIFACT LIST */}
                  {audit.deepfakeArtifacts && audit.deepfakeArtifacts.length > 0 && (
                    <div className="p-4 bg-white/[0.035] backdrop-blur-md rounded-xl border border-amber-800/60 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-amber-400 font-bold">
                        <AlertTriangle className="w-4 h-4" /> EXTRACTED AI SYNTHETIC ARTIFACTS ({audit.deepfakeArtifacts.length})
                      </div>
                      <ul className="space-y-1 text-xs text-slate-300 font-sans list-disc list-inside">
                        {audit.deepfakeArtifacts.map((art, idx) => (
                          <li key={idx} className="text-amber-200">{art}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: METADATA & CODEC BITSTREAM */}
              {activeTab === 'METADATA' && audit.metadata && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10 space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">CONTAINER & CODECS</span>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between border-b border-white/10 pb-1">
                          <span className="text-slate-400">Container Format:</span>
                          <span className="text-[#bcd94f] font-bold">{audit.metadata.container}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/10 pb-1">
                          <span className="text-slate-400">Video Codec:</span>
                          <span className="text-emerald-300 font-bold">{audit.metadata.videoCodec}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/10 pb-1">
                          <span className="text-slate-400">Audio Codec:</span>
                          <span className="text-[#bcd94f] font-bold">{audit.metadata.audioCodec}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Resolution & FPS:</span>
                          <span className="text-slate-200 font-bold">{audit.metadata.resolution} @ {audit.metadata.frameRateFps} fps</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10 space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">STREAM TELEMETRY & C2PA</span>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between border-b border-white/10 pb-1">
                          <span className="text-slate-400">Average Bitrate:</span>
                          <span className="text-amber-300 font-bold">{audit.metadata.bitrateKbps} kbps</span>
                        </div>
                        <div className="flex justify-between border-b border-white/10 pb-1">
                          <span className="text-slate-400">C2PA Content Credentials:</span>
                          <span className={audit.metadata.c2paManifestIntact ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {audit.metadata.c2paManifestIntact ? '✓ CRYPTOGRAPHICALLY VALID' : '✗ STRIPPED / INTACT SIGNATURE MISSING'}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-white/10 pb-1">
                          <span className="text-slate-400">Software Muxer:</span>
                          <span className="text-emerald-300 font-bold">{audit.metadata.softwareMuxer}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Creation Timestamp:</span>
                          <span className="text-slate-300 text-[11px]">{audit.metadata.creationTimestamp}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RE-ENCODING & TRANSCODE HISTORY TIMELINE */}
                  <div className="p-4 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10 space-y-2.5">
                    <span className="text-xs text-slate-300 font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#a4c639]" /> DETECTED RE-ENCODING & TRANSCODE CHAIN ({audit.metadata.reEncodingHistory.length} STAGES)
                    </span>
                    <div className="space-y-2 border-l-2 border-[#33401c]/60 ml-2 pl-3 py-1">
                      {audit.metadata.reEncodingHistory.map((step, idx) => (
                        <div key={idx} className="relative text-xs text-slate-300">
                          <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-[#a4c639] border-2 border-white/10"></div>
                          <span className="font-bold text-[#bcd94f] mr-2">Stage {idx + 1}:</span>
                          <span className="font-sans">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: VISION & TEMPORAL CONSISTENCY */}
              {activeTab === 'VISION_TEMPORAL' && audit.visualFrames && audit.temporalConsistency && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10">
                      <span className="text-[10px] text-slate-500 block">FACE CONSISTENCY</span>
                      <span className={`text-lg font-bold font-heading ${audit.visualFrames.faceConsistencyScore > 70 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {audit.visualFrames.faceConsistencyScore}%
                      </span>
                    </div>
                    <div className="p-3 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10">
                      <span className="text-[10px] text-slate-500 block">EDGE BOUNDARY</span>
                      <span className={`text-lg font-bold font-heading ${audit.visualFrames.edgeBoundaryBlurScore > 70 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {audit.visualFrames.edgeBoundaryBlurScore}%
                      </span>
                    </div>
                    <div className="p-3 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10">
                      <span className="text-[10px] text-slate-500 block">LIGHTING VECTORS</span>
                      <span className={`text-lg font-bold font-heading ${audit.visualFrames.lightingShadowScore > 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {audit.visualFrames.lightingShadowScore}%
                      </span>
                    </div>
                    <div className="p-3 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10">
                      <span className="text-[10px] text-slate-500 block">INTER-FRAME WARP</span>
                      <span className={`text-lg font-bold font-heading ${audit.temporalConsistency.interFrameWarpingScore < 30 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {audit.temporalConsistency.interFrameWarpingScore}%
                      </span>
                    </div>
                  </div>

                  {/* KEYFRAME ANOMALY LOG */}
                  <div className="p-4 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10 space-y-2">
                    <span className="text-xs text-slate-300 font-bold flex items-center gap-2">
                      <Film className="w-4 h-4 text-emerald-400" /> KEYFRAME-LEVEL ARTIFACT EXTRACTION
                    </span>
                    {audit.visualFrames.keyframeArtifacts.length > 0 ? (
                      <div className="space-y-2">
                        {audit.visualFrames.keyframeArtifacts.map((kf, idx) => (
                          <div key={idx} className="p-2.5 bg-white/[0.05] backdrop-blur-md rounded-lg border border-white/10 flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <span className="text-rose-400 font-bold">Frame #{kf.frameIndex} (T+{kf.timestampSec}s): {kf.anomalyType}</span>
                              <div className="text-[10px] text-slate-500">Region: {kf.boundingRegion}</div>
                            </div>
                            <span className="text-[10px] bg-rose-950 border border-rose-700 text-rose-300 font-bold px-2 py-0.5 rounded-lg">
                              {kf.confidence}% CONF
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-400 py-3 text-center bg-white/[0.05] backdrop-blur-md rounded-lg border border-emerald-950">
                        ✓ All sampled keyframes exhibit natural optical consistency across spatial coordinates.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: ACOUSTIC SPECTRUM & AV-SYNC */}
              {activeTab === 'ACOUSTIC' && audit.acousticSpectrum && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10 space-y-1">
                      <span className="text-[10px] text-slate-500 block">AMBIENT NOISE FLOOR</span>
                      <span className="text-lg font-bold font-heading text-[#bcd94f]">{audit.acousticSpectrum.noiseFloorDbfs} dBFS</span>
                      <p className="text-[10px] text-slate-400 font-sans">
                        {audit.acousticSpectrum.noiseFloorDbfs < -80 ? '⚠️ Synthetic zero ambient noise floor' : '✓ Natural physical environment floor'}
                      </p>
                    </div>

                    <div className="p-3.5 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10 space-y-1">
                      <span className="text-[10px] text-slate-500 block">AUDIO / VIDEO SYNC OFFSET</span>
                      <span className={`text-lg font-bold font-heading ${audit.acousticSpectrum.avSyncOffsetMs < 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        +{audit.acousticSpectrum.avSyncOffsetMs} ms
                      </span>
                      <p className="text-[10px] text-slate-400 font-sans">
                        {audit.acousticSpectrum.avSyncOffsetMs < 50 ? '✓ Tight optical/acoustic sync' : '⚠️ Audio narration offset detected'}
                      </p>
                    </div>

                    <div className="p-3.5 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10 space-y-1">
                      <span className="text-[10px] text-slate-500 block">VOICE CLONING / TTS RISK</span>
                      <span className={`text-lg font-bold font-heading ${audit.acousticSpectrum.voiceCloningProbability > 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {audit.acousticSpectrum.voiceCloningProbability}%
                      </span>
                      <p className="text-[10px] text-slate-400 font-sans">
                        {audit.acousticSpectrum.voiceCloningProbability > 50 ? '⚠️ High neural vocoder confidence' : '✓ Organic vocal harmonics'}
                      </p>
                    </div>
                  </div>

                  {/* FFT SPECTRUM VISUALIZER */}
                  <div className="p-4 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-bold flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-[#a4c639]" /> 16-BAND ACOUSTIC FFT FREQUENCY SPECTRUM (60 Hz - 22 kHz)
                      </span>
                      <span className="text-slate-400 text-[10px]">High Cutoff: {audit.acousticSpectrum.highFrequencyCutoffKhz} kHz</span>
                    </div>

                    <div className="h-28 bg-white/[0.05] backdrop-blur-md rounded-lg p-3 border border-white/10 flex items-end justify-between gap-1.5">
                      {(audit.acousticSpectrum.frequencySpectrumBins || []).map((val, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t transition-all duration-500 bg-gradient-to-t from-[#526a27] to-emerald-400 hover:from-amber-500 hover:to-rose-500"
                            style={{ height: `${val}%` }}
                          ></div>
                          <span className="text-[8px] text-slate-500">{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: CAMERA SENSOR & PRNU NOISE */}
              {activeTab === 'SENSOR_PRNU' && audit.cameraCharacteristics && (
                <div className="space-y-4">
                  <div className="p-4 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10 space-y-3">
                    <span className="text-xs text-slate-300 font-bold flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#a4c639]" /> ESTIMATED CAMERA & SENSOR HARDWARE CHARACTERISTICS
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-white/[0.05] backdrop-blur-md rounded-lg border border-white/10 space-y-1">
                        <span className="text-slate-500 text-[10px]">SENSOR ARCHITECTURE</span>
                        <div className="text-slate-200 font-bold">{audit.cameraCharacteristics.estimatedSensorType}</div>
                      </div>
                      <div className="p-3 bg-white/[0.05] backdrop-blur-md rounded-lg border border-white/10 space-y-1">
                        <span className="text-slate-500 text-[10px]">PRNU SENSOR NOISE MATCH</span>
                        <div className={`font-bold ${audit.cameraCharacteristics.prnuSensorFingerprintMatch > 70 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {audit.cameraCharacteristics.prnuSensorFingerprintMatch}% Hardware Correlation
                        </div>
                      </div>
                      <div className="p-3 bg-white/[0.05] backdrop-blur-md rounded-lg border border-white/10 space-y-1">
                        <span className="text-slate-500 text-[10px]">CHROMATIC ABERRATION</span>
                        <div className="text-[#bcd94f] font-bold">{audit.cameraCharacteristics.chromaticAberrationConsistency}% Optical Consistency</div>
                      </div>
                      <div className="p-3 bg-white/[0.05] backdrop-blur-md rounded-lg border border-white/10 space-y-1">
                        <span className="text-slate-500 text-[10px]">COMPRESSION QUANTIZATION</span>
                        <div className="text-emerald-300 font-bold text-[11px]">{audit.cameraCharacteristics.compressionPattern}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: MULTI-MODEL ENSEMBLE DECISION MATRIX */}
              {activeTab === 'ENSEMBLE' && (
                <div className="space-y-4">
                  <div className="p-4 bg-white/[0.035] backdrop-blur-md rounded-xl border border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-bold flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#a4c639]" /> INDEPENDENT MULTI-DETECTOR DECISION MATRIX
                      </span>
                      <span className="text-[10px] bg-[#a4c639]/10 backdrop-blur-md text-[#bcd94f] px-2 py-0.5 rounded-lg border border-[#33401c]">
                        5 INDEPENDENT AGENTS
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {[
                        {
                          name: '1. Optical & Neural Facial Artifact Classifier',
                          score: 100 - audit.aiSyntheticScore,
                          status: audit.aiSyntheticScore > 60 ? 'ANOMALY DETECTED' : 'CLEAN',
                          weight: '35% Fusion Weight',
                        },
                        {
                          name: '2. Acoustic Spectrum & Voice Clone Detector',
                          score: audit.acousticSpectrumScore,
                          status: audit.acousticSpectrumScore > 70 ? 'AUTHENTIC' : 'SYNTHETIC VOICE',
                          weight: '20% Fusion Weight',
                        },
                        {
                          name: '3. Container Bitstream & C2PA Provenance Engine',
                          score: audit.provenanceScore,
                          status: audit.provenanceScore > 70 ? 'VERIFIED' : 'STRIPPED',
                          weight: '25% Fusion Weight',
                        },
                        {
                          name: '4. Temporal Consistency & Warping Model',
                          score: 100 - (audit.temporalConsistency?.interFrameWarpingScore || 10),
                          status: (audit.temporalConsistency?.interFrameWarpingScore || 0) > 50 ? 'WARPING WARN' : 'STABLE',
                          weight: 'Cross-Verification',
                        },
                        {
                          name: '5. Orbital Satellite & Primary Radar Corroborator',
                          score: audit.crossSensorCorroborationScore,
                          status: audit.crossSensorCorroborationScore > 70 ? 'PHYSICALLY CONFIRMED' : 'UNCONFIRMED',
                          weight: '20% Ground Truth Weight',
                        },
                      ].map((det, idx) => (
                        <div key={idx} className="p-3 bg-white/[0.05] backdrop-blur-md rounded-lg border border-white/10 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-200">{det.name}</div>
                            <div className="text-[10px] text-slate-500">{det.weight} • Verdict: {det.status}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-heading font-bold text-[#bcd94f]">{det.score}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION FOOTER */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  Coordinates:{' '}
                  {typeof activeEvent.location?.lat === 'number' && typeof activeEvent.location?.lng === 'number'
                    ? `${activeEvent.location.lat.toFixed(4)}°N, ${activeEvent.location.lng.toFixed(4)}°E`
                    : 'Sector Grid MGRS'}
                </span>
                {onSelectEvent && (
                  <button
                    onClick={() => onSelectEvent(activeEvent)}
                    className="px-4 py-2 bg-[#a4c639]/10 backdrop-blur-md hover:bg-[#a4c639]/14 border border-[#526a27] text-[#bcd94f] font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all"
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
