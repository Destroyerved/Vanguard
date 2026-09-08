import React from 'react';
import { useEventStore } from '../../store/useEventStore';
import { ShieldAlert, Crosshair, Zap, Navigation, Flame, Radio } from 'lucide-react';
import { soundFx } from '../../services/soundFx';

export const RafaleStrikeHUD: React.FC = () => {
  const rafaleState = useEventStore((s) => s.rafaleState);
  const setNukeModalOpen = useEventStore((s) => s.setNukeModalOpen);
  const updateRafale = useEventStore((s) => s.updateRafale);

  const toggleMasterArm = () => {
    soundFx.playClick(1500);
    updateRafale({ masterArm: !rafaleState.masterArm });
  };

  const isNukingActive = rafaleState.strikePhase !== 'IDLE';

  return (
    <div className="flex flex-col h-full bg-[#050910] border border-cyan-500/30 rounded overflow-hidden tactical-box">
      {/* HUD Header */}
      <div className="px-2.5 py-1.5 bg-[#09121d] border-b border-cyan-500/30 flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-display text-[11px] font-bold uppercase tracking-wider text-cyan-300">
            AIR SUPERIORITY HUD // RAFALE F4 (VANGUARD-01)
          </span>
        </div>

        {/* Master Arm Switch Toggle */}
        <button
          onClick={toggleMasterArm}
          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition flex items-center space-x-1 ${
            rafaleState.masterArm
              ? 'bg-red-950 border border-red-500 text-red-300 shadow-[0_0_8px_rgba(255,42,75,0.5)]'
              : 'bg-slate-900 border border-slate-700 text-slate-400'
          }`}
        >
          <Zap className="w-3 h-3 text-red-400" />
          <span>MASTER ARM: {rafaleState.masterArm ? 'HOT' : 'SAFE'}</span>
        </button>
      </div>

      {/* Main HUD Viewport (Realistic Fighter Jet Cockpit Display) */}
      <div className="relative flex-1 bg-[#020508] p-2 flex flex-col justify-between overflow-hidden">
        {/* Top Heading Tape */}
        <div className="flex items-center justify-center space-x-2 text-[10px] font-mono text-emerald-400 border-b border-emerald-500/20 pb-1">
          <span className="opacity-40">020</span>
          <span className="opacity-60">030</span>
          <span className="font-bold text-white border-b-2 border-emerald-400 px-1 bg-emerald-950/40">
            {rafaleState.headingDeg.toString().padStart(3, '0')}°
          </span>
          <span className="opacity-60">050</span>
          <span className="opacity-40">060</span>
        </div>

        {/* Center Pitch Ladder & Artificial Horizon */}
        <div className="relative flex-1 flex items-center justify-center">
          {/* Flight Path Marker Reticle (Green HUD Symbology) */}
          <div
            className="absolute flex items-center justify-center transition-transform duration-300 pointer-events-none"
            style={{
              transform: `rotate(${rafaleState.rollDeg}deg) translateY(${-rafaleState.pitchDeg * 2}px)`
            }}
          >
            {/* Horizon bar */}
            <div className="w-24 h-0.5 bg-emerald-400/80 shadow-[0_0_6px_#00ff66]"></div>
            <div className="absolute w-3 h-3 border border-emerald-400 rounded-full flex items-center justify-center">
              <div className="w-0.5 h-0.5 bg-emerald-400"></div>
            </div>

            {/* Pitch ladder ticks */}
            <div className="absolute -top-6 w-16 border-t border-dashed border-emerald-400/60 flex justify-between text-[7px] text-emerald-400">
              <span>+10</span>
              <span>+10</span>
            </div>
            <div className="absolute top-6 w-16 border-b border-dashed border-emerald-400/60 flex justify-between text-[7px] text-emerald-400">
              <span>-10</span>
              <span>-10</span>
            </div>
          </div>

          {/* Left HUD Column: Speed / Mach / G */}
          <div className="absolute left-2 top-2 space-y-1 text-left font-mono">
            <div>
              <span className="text-[8px] text-slate-500 block">MACH</span>
              <span className="text-sm font-black text-emerald-300 crt-glow">M {rafaleState.speedMach}</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-500 block">IAS</span>
              <span className="text-xs font-bold text-emerald-400">620 KTS</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-500 block">G-LOAD</span>
              <span className="text-xs font-bold text-amber-400">{rafaleState.gLoad} G</span>
            </div>
          </div>

          {/* Right HUD Column: Altitude / Radar Mode */}
          <div className="absolute right-2 top-2 space-y-1 text-right font-mono">
            <div>
              <span className="text-[8px] text-slate-500 block">ALTITUDE</span>
              <span className="text-sm font-black text-emerald-300 crt-glow">
                {rafaleState.altitudeFt.toLocaleString()} FT
              </span>
            </div>
            <div>
              <span className="text-[8px] text-slate-500 block">RADAR</span>
              <span className="text-[10px] font-bold text-cyan-400">{rafaleState.radarMode}</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-500 block">FUEL</span>
              <span className="text-xs font-bold text-emerald-400">{rafaleState.fuelPercent}%</span>
            </div>
          </div>
        </div>

        {/* Center Target Acquisition & Weapon Rail Status */}
        <div className="bg-[#070e17]/90 border border-emerald-500/30 rounded p-1.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-[9px] font-mono mb-1">
            <span className="text-slate-400 flex items-center">
              <Crosshair className="w-3 h-3 mr-1 text-red-400 animate-spin" />
              LOCKED: <b className="text-white ml-1">{rafaleState.targetCallsign?.slice(0, 18)}</b>
            </span>
            <span className="text-red-400 font-bold bg-red-950/70 px-1 rounded border border-red-500/40">
              ASMP-A NUCLEAR CRUISE (300 kT)
            </span>
          </div>

          {/* Nuclear Strike Trigger CTA Button */}
          <button
            onClick={() => setNukeModalOpen(true)}
            className={`w-full py-1.5 rounded text-[11px] font-black tracking-widest uppercase flex items-center justify-center space-x-2 transition shadow-lg ${
              isNukingActive
                ? 'bg-amber-500 text-black border border-yellow-200 animate-pulse'
                : 'bg-gradient-to-r from-red-900 via-amber-900 to-red-900 hover:from-red-800 hover:to-amber-800 border border-amber-400/80 text-yellow-300 shadow-[0_0_15px_rgba(255,170,0,0.5)]'
            }`}
          >
            <Flame className="w-4 h-4 text-yellow-300 animate-bounce" />
            <span>
              {isNukingActive
                ? `MISSION STATUS: ${rafaleState.strikePhase}`
                : 'AUTHORIZE RAFALE NUCLEAR STRIKE »'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
