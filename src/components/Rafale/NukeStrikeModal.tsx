import React, { useState } from 'react';
import { useEventStore } from '../../store/useEventStore';
import {
  ShieldAlert,
  AlertTriangle,
  KeyRound,
  Flame,
  Radio,
  X,
  Crosshair,
  CheckCircle2,
  Lock,
  Unlock,
  RotateCcw
} from 'lucide-react';
import { soundFx } from '../../services/soundFx';

export const NukeStrikeModal: React.FC = () => {
  const isNukeModalOpen = useEventStore((s) => s.isNukeModalOpen);
  const setNukeModalOpen = useEventStore((s) => s.setNukeModalOpen);
  const rafaleState = useEventStore((s) => s.rafaleState);
  const setPalCodeEntered = useEventStore((s) => s.setPalCodeEntered);
  const startNukeLaunchSequence = useEventStore((s) => s.startNukeLaunchSequence);
  const resetNukeStrike = useEventStore((s) => s.resetNukeStrike);

  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isNukeModalOpen) return null;

  const isCodeCorrect = inputCode.trim().toUpperCase() === rafaleState.palCodeRequired;

  const handleAuthorize = () => {
    if (isCodeCorrect) {
      soundFx.playTargetLock();
      setPalCodeEntered(inputCode);
      startNukeLaunchSequence();
      setErrorMsg(null);
    } else {
      soundFx.playAlarmKlaxon();
      setErrorMsg('INVALID PAL AUTHENTICATION CODE — NCA VERIFICATION FAILED');
    }
  };

  const handleQuickAutofill = () => {
    soundFx.playClick(1100);
    setInputCode(rafaleState.palCodeRequired);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#070c14] border-2 border-red-500/80 rounded-lg shadow-[0_0_50px_rgba(255,42,75,0.4)] overflow-hidden tactical-box tactical-box-red font-mono">
        {/* Top Header Warning Banner */}
        <div className="bg-gradient-to-r from-red-950 via-red-900 to-red-950 border-b border-red-500/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-red-600 rounded text-black font-black animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black tracking-widest text-red-100 uppercase">
                NATIONAL COMMAND AUTHORITY // DEFCON 1
              </div>
              <div className="text-sm font-black text-white">
                RAFALE F4 TACTICAL NUCLEAR STRIKE PROTOCOL (ASMP-A 300 kT)
              </div>
            </div>
          </div>

          <button
            onClick={() => setNukeModalOpen(false)}
            className="p-1 text-red-300 hover:text-white rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Status Progression Bar */}
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
            <div
              className={`p-2 rounded border ${
                rafaleState.strikePhase === 'IDLE'
                  ? 'bg-amber-950 border-amber-400 text-amber-300'
                  : 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
              }`}
            >
              1. TARGET DESIGNATED
            </div>
            <div
              className={`p-2 rounded border ${
                rafaleState.strikePhase === 'COUNTDOWN'
                  ? 'bg-amber-500 text-black border-yellow-300 animate-pulse font-black'
                  : isCodeCorrect
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                  : 'bg-slate-900 border-slate-700 text-slate-500'
              }`}
            >
              2. PAL AUTHENTICATED
            </div>
            <div
              className={`p-2 rounded border ${
                rafaleState.strikePhase === 'HYPERSONIC_CRUISE'
                  ? 'bg-amber-500 text-black border-yellow-300 animate-pulse font-black'
                  : rafaleState.strikePhase === 'DETONATION' || rafaleState.strikePhase === 'BDA_ASSESSMENT'
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                  : 'bg-slate-900 border-slate-700 text-slate-500'
              }`}
            >
              3. HYPERSONIC CRUISE
            </div>
            <div
              className={`p-2 rounded border ${
                rafaleState.strikePhase === 'DETONATION' || rafaleState.strikePhase === 'BDA_ASSESSMENT'
                  ? 'bg-red-600 text-white border-yellow-300 font-black animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-slate-500'
              }`}
            >
              4. DETONATION &amp; BDA
            </div>
          </div>

          {/* Mission Parameters Card */}
          <div className="bg-[#0b1320] border border-cyan-500/30 rounded p-3 text-xs space-y-2">
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center justify-between">
              <span>DELIVERY PLATFORM &amp; WARHEAD SPECIFICATIONS</span>
              <span className="text-red-400 font-bold">TOP SECRET // SIOP</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 text-[9px] block">AIR ASSET</span>
                <span className="text-white font-bold">{rafaleState.callsign} ({rafaleState.tailNumber})</span>
              </div>
              <div>
                <span className="text-slate-500 text-[9px] block">WEAPON SYSTEM</span>
                <span className="text-amber-300 font-bold">ASMP-A RAMJET CRUISE</span>
              </div>
              <div>
                <span className="text-slate-500 text-[9px] block">WARHEAD YIELD</span>
                <span className="text-red-400 font-bold">300 KILOTONS (TN-81)</span>
              </div>
              <div>
                <span className="text-slate-500 text-[9px] block">CRUISE SPEED</span>
                <span className="text-cyan-300 font-bold">MACH 3.5+ (HYPERSONIC)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[9px] block">DESIGNATED GROUND ZERO</span>
                <span className="text-white font-bold">{rafaleState.targetCallsign}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-[9px] block">EST. BLAST OVERPRESSURE</span>
                <span className="text-red-400 font-bold">50 PSI / 7.8 KM RADIUS</span>
              </div>
            </div>
          </div>

          {/* Dynamic Interactive Phase Content */}
          {rafaleState.strikePhase === 'IDLE' && (
            <div className="bg-[#0e1624] border border-amber-500/40 rounded p-4 space-y-3">
              <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs uppercase">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>PERMISSIVE ACTION LINK (PAL) AUTHORIZATION REQUIRED</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase">Enter Two-Man Launch Authentication Key:</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE (e.g. OMEGA-774-ALPHA)"
                    className="flex-1 bg-[#060a10] border border-red-500/50 rounded px-3 py-2 text-sm text-red-300 font-mono tracking-widest placeholder-slate-600 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
                  />
                  <button
                    onClick={handleQuickAutofill}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[10px] text-slate-300 font-bold uppercase"
                    title="Autofill Verified NCA Key for Demonstration"
                  >
                    Auto-Fill
                  </button>
                </div>
                {errorMsg && (
                  <div className="text-red-400 text-[10px] font-bold mt-1 animate-pulse">{errorMsg}</div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={handleAuthorize}
                  disabled={!inputCode}
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:opacity-40 rounded text-sm font-black text-white tracking-widest uppercase flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(255,42,75,0.6)] transition"
                >
                  <Flame className="w-5 h-5 text-yellow-300 animate-bounce" />
                  <span>CONFIRM LAUNCH AUTHORIZATION &amp; RELEASE ASMP-A</span>
                </button>
              </div>
            </div>
          )}

          {/* Phase: Countdown */}
          {rafaleState.strikePhase === 'COUNTDOWN' && (
            <div className="bg-red-950/80 border-2 border-red-500 rounded p-6 text-center space-y-3 animate-pulse">
              <div className="text-xs font-black text-red-300 uppercase tracking-widest">
                ASMP-A WEAPON BAY DOORS OPEN // IGNITION SPOOLING
              </div>
              <div className="font-display text-6xl font-black text-yellow-300 drop-shadow-[0_0_20px_rgba(255,200,0,0.8)]">
                T - 00:0{rafaleState.countdownSeconds}
              </div>
              <div className="text-[11px] text-red-200">
                Ramjet solid booster pressurizing. Stand by for weapon separation.
              </div>
            </div>
          )}

          {/* Phase: Hypersonic Cruise */}
          {rafaleState.strikePhase === 'HYPERSONIC_CRUISE' && (
            <div className="bg-[#091522] border border-amber-400 rounded p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                <span className="flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>MISSILE SEPARATED // HYPERSONIC CRUISE ACTIVE</span>
                </span>
                <span>MACH 3.52 • FL620</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 bg-slate-900 border border-amber-400/50 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full transition-all duration-150"
                  style={{ width: `${rafaleState.hypersonicProgress}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-300">
                <span>RELEASE POINT (VANGUARD-01)</span>
                <span className="text-yellow-300 font-bold">{rafaleState.hypersonicProgress}% TRAJECTORY COMPLETED</span>
                <span>GROUND ZERO (HQ-BUNKER)</span>
              </div>
            </div>
          )}

          {/* Phase: Detonation & BDA Assessment */}
          {(rafaleState.strikePhase === 'DETONATION' || rafaleState.strikePhase === 'BDA_ASSESSMENT') && (
            <div className="bg-gradient-to-r from-red-950 via-black to-red-950 border-2 border-yellow-400 rounded p-5 space-y-3 text-center">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-yellow-400 text-black font-black text-xs rounded uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>300 kT SURFACE DETONATION CONFIRMED</span>
              </div>

              <div className="text-sm font-bold text-white font-sans">
                Hostile Strategic Command Node HQ-BUNKER-OMEGA has been completely neutralized. Overpressure blast wave and prompt ionization recorded.
              </div>

              <div className="grid grid-cols-3 gap-2 text-left bg-black/60 p-3 rounded border border-red-500/40 text-xs">
                <div>
                  <span className="text-slate-500 text-[9px] block">FIREBALL RADIUS</span>
                  <span className="text-yellow-300 font-bold">1.2 km (Vaporized)</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[9px] block">5 PSI BLAST WAVE</span>
                  <span className="text-red-400 font-bold">7.8 km (Collapsed)</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[9px] block">FALLOUT PLUME</span>
                  <span className="text-purple-300 font-bold">42 km Downwind</span>
                </div>
              </div>

              <button
                onClick={resetNukeStrike}
                className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs font-bold text-slate-200 uppercase flex items-center justify-center space-x-1.5 mx-auto transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET COMBAT READINESS &amp; AIRSPACE POSTURE</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
