import React from 'react';
import { Radio, Square, Play, Volume2 } from 'lucide-react';
import { useEventStore } from '../../store/useEventStore';

export const VoiceBriefingWidget: React.FC = () => {
  const isVoiceReading = useEventStore((s) => s.isVoiceReading);
  const triggerVoiceBriefing = useEventStore((s) => s.triggerVoiceBriefing);
  const stopVoiceBriefing = useEventStore((s) => s.stopVoiceBriefing);

  return (
    <div className="bg-[#070e17] border border-cyan-500/25 rounded p-2.5 mb-3 flex items-center justify-between">
      <div className="flex items-center space-x-2.5">
        <div className={`p-1.5 rounded border ${isVoiceReading ? 'bg-cyan-500 text-black border-cyan-300 animate-pulse' : 'bg-cyan-950 border-cyan-500/30 text-cyan-400'}`}>
          <Radio className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-cyan-400">
            TACTICAL VOICE SYNTHESIS
          </div>
          <div className="text-[11px] font-medium text-slate-300">
            {isVoiceReading ? 'Broadcasting SITREP Audio Stream...' : 'Ready for Audio SITREP Readout'}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Equalizer Waveform animation */}
        {isVoiceReading && (
          <div className="flex items-end space-x-0.5 h-4 px-2">
            <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-3"></span>
            <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-4"></span>
            <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.3s_ease-in-out_infinite] h-2"></span>
            <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-4"></span>
          </div>
        )}

        {isVoiceReading ? (
          <button
            onClick={stopVoiceBriefing}
            className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-500/60 rounded text-[10px] font-bold text-red-300 flex items-center space-x-1 uppercase transition"
          >
            <Square className="w-3 h-3" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            onClick={triggerVoiceBriefing}
            className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 rounded text-[10px] font-bold text-cyan-300 flex items-center space-x-1 uppercase transition"
          >
            <Play className="w-3 h-3 text-cyan-400" />
            <span>Play Readout</span>
          </button>
        )}
      </div>
    </div>
  );
};
