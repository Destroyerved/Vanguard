import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Radio,
  Volume2,
  VolumeX,
  FileDown,
  AlertTriangle,
  Zap,
  RotateCcw,
  WifiOff,
  Crosshair,
  Volume1
} from 'lucide-react';
import { useEventStore } from '../../store/useEventStore';
import { OmniSearchBar } from './OmniSearchBar';
import { downloadSitrepText } from '../../services/sitrepGenerator';

interface CommandHeaderProps {
  onBackToLanding?: () => void;
}

export const CommandHeader: React.FC<CommandHeaderProps> = ({ onBackToLanding }) => {
  const [timeUtc, setTimeUtc] = useState('');
  const [timeLocal, setTimeLocal] = useState('');

  const threatLevel = useEventStore((s) => s.threatLevel);
  const setThreatLevel = useEventStore((s) => s.setThreatLevel);
  const isAudioMuted = useEventStore((s) => s.isAudioMuted);
  const toggleAudioMute = useEventStore((s) => s.toggleAudioMute);
  const isDegradedMode = useEventStore((s) => s.isDegradedMode);
  const injectScenario = useEventStore((s) => s.injectScenario);
  const aiBriefing = useEventStore((s) => s.aiBriefing);
  const events = useEventStore((s) => s.events);
  const isVoiceReading = useEventStore((s) => s.isVoiceReading);
  const triggerVoiceBriefing = useEventStore((s) => s.triggerVoiceBriefing);
  const stopVoiceBriefing = useEventStore((s) => s.stopVoiceBriefing);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeUtc(now.toISOString().slice(11, 19) + ' Z');
      setTimeLocal(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getThreatBadge = () => {
    switch (threatLevel) {
      case 'red':
        return {
          label: 'DEFCON 1 // RED CRITICAL',
          classes: 'bg-red-950/80 border-red-500 text-red-400 shadow-[0_0_15px_rgba(255,42,75,0.6)] animate-pulse'
        };
      case 'orange':
        return {
          label: 'DEFCON 3 // ORANGE ELEVATED',
          classes: 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(255,170,0,0.4)]'
        };
      case 'yellow':
        return {
          label: 'DEFCON 4 // YELLOW GUARDED',
          classes: 'bg-yellow-950/80 border-yellow-500 text-yellow-300'
        };
      default:
        return {
          label: 'DEFCON 5 // GREEN NORMAL',
          classes: 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
        };
    }
  };

  const threatBadge = getThreatBadge();

  return (
    <header className="relative z-40 bg-[#060a10]/95 border-b border-cyan-500/30 px-3 py-2 flex items-center justify-between backdrop-blur-md">
      {/* Top Left: Logo & Theater Sector */}
      <div className="flex items-center space-x-3">
        <div className="relative flex items-center justify-center w-9 h-9 bg-cyan-950/70 border border-cyan-400/60 rounded tactical-box">
          <Crosshair className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '18s' }} />
          <div className="absolute w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <span className="font-display font-black tracking-widest text-base text-cyan-300 drop-shadow-[0_0_8px_rgba(0,240,255,0.7)]">
              VANGUARD
            </span>
            <span className="px-1.5 py-0.2 bg-cyan-900/60 border border-cyan-400/30 rounded text-[9px] text-cyan-300 font-bold uppercase tracking-wider">
              C4ISR COP v1.1
            </span>
            {onBackToLanding && (
              <button
                onClick={onBackToLanding}
                className="px-2 py-0.5 bg-slate-850 hover:bg-cyan-950 border border-cyan-500/40 rounded text-[9px] text-cyan-300 font-bold uppercase tracking-wider transition hover:border-cyan-300"
                title="Return to Landing Page Overview"
              >
                « LANDING PAGE
              </button>
            )}
            {isDegradedMode && (
              <span className="px-1.5 py-0.2 bg-amber-900/80 border border-amber-400 rounded text-[9px] text-amber-300 font-bold animate-pulse flex items-center space-x-1">
                <WifiOff className="w-2.5 h-2.5 mr-1" />
                CACHED COP MODE
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-2">
            <span className="text-cyan-400 font-semibold">SECTOR-7</span>
            <span>•</span>
            <span>NORTHERN FRONTIER COMMAND</span>
            <span>•</span>
            <span className="text-emerald-400">FUSION ACTIVE (5 FEEDS)</span>
          </div>
        </div>
      </div>

      {/* Middle: Natural Language OmniBar */}
      <OmniSearchBar />

      {/* Right: Threat Posture, Clock, Scenarios, Audio Controls */}
      <div className="flex items-center space-x-3">
        {/* Threat Level Badge */}
        <div className={`px-2.5 py-1 rounded border text-[10px] font-bold tracking-wider uppercase flex items-center space-x-1.5 ${threatBadge.classes}`}>
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>{threatBadge.label}</span>
        </div>

        {/* Quick Scenario Injector */}
        <div className="hidden lg:flex items-center space-x-1 bg-[#09111c] border border-slate-700/60 rounded p-0.5">
          <button
            onClick={() => injectScenario('incursion')}
            className="px-2 py-1 bg-red-950/50 hover:bg-red-900/80 border border-red-500/40 rounded text-[10px] text-red-300 font-semibold flex items-center space-x-1 transition"
            title="Simulate Border Incursion Spike"
          >
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span>+Incursion</span>
          </button>
          <button
            onClick={() => injectScenario('jamming')}
            className="px-2 py-1 bg-amber-950/50 hover:bg-amber-900/80 border border-amber-500/40 rounded text-[10px] text-amber-300 font-semibold flex items-center space-x-1 transition"
            title="Simulate Radar Jamming Interference"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>+EW Jam</span>
          </button>
          <button
            onClick={() => injectScenario('degraded')}
            className={`px-2 py-1 border rounded text-[10px] font-semibold flex items-center space-x-1 transition ${
              isDegradedMode
                ? 'bg-amber-600 text-black border-amber-300 font-bold'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-600 text-slate-300'
            }`}
            title="Toggle Degraded Comms"
          >
            <WifiOff className="w-3 h-3" />
            <span>{isDegradedMode ? 'Online' : 'Degraded'}</span>
          </button>
          <button
            onClick={() => injectScenario('reset')}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded transition"
            title="Reset Scenario State"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tactical Voice Readout */}
        <button
          onClick={isVoiceReading ? stopVoiceBriefing : triggerVoiceBriefing}
          className={`px-2 py-1 rounded border text-[10px] font-bold tracking-wider uppercase flex items-center space-x-1 transition ${
            isVoiceReading
              ? 'bg-cyan-500 text-black border-cyan-300 animate-pulse shadow-[0_0_10px_rgba(0,240,255,0.7)]'
              : 'bg-cyan-950/50 hover:bg-cyan-900/80 border-cyan-500/40 text-cyan-300'
          }`}
          title="Tactical Audio SITREP Speech Synthesis"
        >
          <Radio className="w-3.5 h-3.5" />
          <span>{isVoiceReading ? 'READING...' : 'VOICE'}</span>
        </button>

        {/* Audio Mute */}
        <button
          onClick={toggleAudioMute}
          className={`p-1.5 rounded border transition ${
            isAudioMuted
              ? 'bg-red-950/40 border-red-500/40 text-red-400'
              : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60'
          }`}
          title={isAudioMuted ? 'Unmute Tactical Audio FX' : 'Mute Tactical Audio FX'}
        >
          {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        {/* SITREP PDF/TXT Export */}
        <button
          onClick={() => downloadSitrepText(aiBriefing, events, threatLevel)}
          className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/50 rounded text-[10px] text-emerald-300 font-bold uppercase tracking-wider flex items-center space-x-1 transition"
          title="Download Official Military Situation Report"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>SITREP</span>
        </button>

        {/* Clocks */}
        <div className="text-right border-l border-cyan-500/30 pl-3">
          <div className="text-xs font-bold text-cyan-300 tracking-wider">{timeUtc}</div>
          <div className="text-[9px] text-slate-400">{timeLocal} LOC</div>
        </div>
      </div>
    </header>
  );
};
