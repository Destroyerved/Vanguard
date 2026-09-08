import React, { useState } from 'react';
import { Flame, ShieldAlert, Zap, Radio, Crosshair, AlertTriangle, RotateCcw } from 'lucide-react';
import { soundFx } from '../../services/soundFx';
import confetti from 'canvas-confetti';

interface RafaleTopRightNukeProps {
  onNukeTriggered?: () => void;
  variant?: 'floating' | 'embedded';
}

export const RafaleTopRightNuke: React.FC<RafaleTopRightNukeProps> = ({
  onNukeTriggered,
  variant = 'embedded'
}) => {
  const [isArming, setIsArming] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFiring, setIsFiring] = useState(false);
  const [isNuked, setIsNuked] = useState(false);

  const handleLaunchNuke = () => {
    soundFx.playTargetLock();
    setIsArming(true);
    setCountdown(3);

    soundFx.playCountdownBeep(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          executeNuke();
          return null;
        }
        soundFx.playCountdownBeep(false);
        return prev - 1;
      });
    }, 1000);
  };

  const executeNuke = () => {
    soundFx.playCountdownBeep(true);
    soundFx.playMissileLaunch();
    setIsFiring(true);

    // Missile flight duration before screen detonation
    setTimeout(() => {
      soundFx.playDetonationRumble();
      soundFx.playAlarmKlaxon();
      setIsFiring(false);
      setIsNuked(true);

      if (onNukeTriggered) {
        onNukeTriggered();
      }

      // Radioactive fallout ash particle burst
      try {
        confetti({
          particleCount: 150,
          spread: 120,
          origin: { y: 0.4, x: 0.5 },
          colors: ['#ff2a4b', '#ffaa00', '#ffffff', '#a855f7', '#00f0ff'],
          ticks: 400,
          gravity: 0.8,
          shapes: ['circle', 'square']
        });
      } catch {
        // confetti fallback
      }
    }, 1200);
  };

  const handleReset = () => {
    soundFx.playClick(1000);
    setIsArming(false);
    setCountdown(null);
    setIsFiring(false);
    setIsNuked(false);
  };

  return (
    <div
      className={`relative bg-[#070c14] border border-cyan-500/40 rounded tactical-box overflow-hidden font-mono ${
        isNuked ? 'tactical-box-red border-red-500 shadow-[0_0_25px_rgba(255,42,75,0.6)]' : ''
      } ${variant === 'floating' ? 'shadow-[0_0_30px_rgba(0,240,255,0.4)]' : 'h-full flex flex-col'}`}
    >
      {/* Top Header */}
      <div className="px-2.5 py-1.5 bg-[#091422] border-b border-cyan-500/30 flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="font-display text-[10.5px] font-black uppercase tracking-wider text-cyan-300 flex items-center">
            RAFALE F4 // STRATEGIC STRIKE WING
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <span className="text-[8px] font-bold px-1.5 py-0.2 bg-red-950 border border-red-500 text-red-300 rounded uppercase animate-pulse">
            ASMP-A 300kT
          </span>
        </div>
      </div>

      {/* Main Rafale Visual & HUD Telemetry */}
      <div className="relative flex-1 p-2 bg-[#03060a] flex flex-col justify-between overflow-hidden">
        {/* Animated Rafale Jet SVG Graphic */}
        <div className="relative h-24 flex items-center justify-center">
          {/* Afterburner Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-4 flex space-x-3">
            <div className="w-2 h-6 bg-gradient-to-b from-cyan-300 via-amber-500 to-transparent rounded-full animate-pulse blur-[1px]"></div>
            <div className="w-2 h-6 bg-gradient-to-b from-cyan-300 via-amber-500 to-transparent rounded-full animate-pulse blur-[1px]"></div>
          </div>

          {/* Dassault Rafale Top-Down Silhouette */}
          <svg
            className="w-28 h-28 text-slate-300 drop-shadow-[0_0_12px_rgba(0,240,255,0.7)] transition-transform duration-500 hover:scale-105"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Fuselage & Nose */}
            <path
              d="M50 8 L54 32 L58 45 L58 78 L53 88 L47 88 L42 78 L42 45 L46 32 Z"
              fill="#1e293b"
              stroke="#00f0ff"
              strokeWidth="1.2"
            />
            {/* Canards */}
            <path d="M42 36 L26 42 L42 45 Z" fill="#0f172a" stroke="#00f0ff" strokeWidth="1" />
            <path d="M58 36 L74 42 L58 45 Z" fill="#0f172a" stroke="#00f0ff" strokeWidth="1" />
            {/* Main Delta Wings */}
            <path
              d="M42 46 L12 74 L14 78 L42 72 Z"
              fill="#0f172a"
              stroke="#00f0ff"
              strokeWidth="1.2"
            />
            <path
              d="M58 46 L88 74 L86 78 L58 72 Z"
              fill="#0f172a"
              stroke="#00f0ff"
              strokeWidth="1.2"
            />
            {/* Vertical Stabilizer Tail */}
            <path d="M50 56 L50 86" stroke="#00f0ff" strokeWidth="2.2" strokeLinecap="round" />
            {/* Cockpit Canopy */}
            <ellipse cx="50" cy="30" rx="3" ry="8" fill="#00f0ff" fillOpacity="0.8" />
            {/* Centerline ASMP-A Nuclear Missile */}
            <rect
              x="48.5"
              y="44"
              width="3"
              height="20"
              rx="1.5"
              fill="#ff2a4b"
              stroke="#ffffff"
              strokeWidth="0.8"
            />
          </svg>

          {/* HUD Crosshairs */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-20 h-20 border border-emerald-400/30 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-emerald-400"></div>
            </div>
          </div>

          {/* In-Flight Missile Animation if Firing */}
          {isFiring && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[ping_0.6s_ease-out_infinite]">
              <div className="w-8 h-8 rounded-full bg-red-500 border-2 border-yellow-300 shadow-[0_0_20px_#ff0000]"></div>
            </div>
          )}
        </div>

        {/* Live Flight Telemetry Readout */}
        <div className="grid grid-cols-4 gap-1 text-[8.5px] text-slate-300 bg-[#070e17]/80 border border-cyan-500/20 rounded p-1.5 mb-2 font-mono">
          <div>
            <span className="text-slate-500 block text-[7.5px]">SPEED</span>
            <span className="text-emerald-300 font-bold">MACH 2.05</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[7.5px]">ALTITUDE</span>
            <span className="text-emerald-300 font-bold">50,000 FT</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[7.5px]">G-FORCE</span>
            <span className="text-amber-300 font-bold">5.8 G</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[7.5px]">PAYLOAD</span>
            <span className="text-red-400 font-bold">ASMP-A 300kT</span>
          </div>
        </div>

        {/* Action Controls: Nuke UI Button */}
        <div>
          {countdown !== null ? (
            <div className="py-2 bg-red-950 border border-red-500 rounded text-center text-yellow-300 font-black text-xs animate-pulse">
              MISSILE RELEASE IN: T - 00:0{countdown} SEC
            </div>
          ) : isNuked ? (
            <div className="space-y-1">
              <div className="py-1.5 bg-red-600 text-white rounded text-center text-[10px] font-black uppercase tracking-wider animate-pulse">
                ☢ UI DETONATION EXECUTED // 300 kT GROUND ZERO
              </div>
              <button
                onClick={handleReset}
                className="w-full py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[9px] text-slate-200 font-bold uppercase flex items-center justify-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>RE-ARM RAFALE &amp; RESTORE UI</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLaunchNuke}
              className="w-full py-2 bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 rounded text-[11px] font-black text-white uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-[0_0_15px_rgba(255,42,75,0.7)] transition transform hover:scale-[1.02]"
            >
              <Flame className="w-3.5 h-3.5 text-yellow-300 animate-bounce" />
              <span>NUKE THE UI (ASMP-A LAUNCH) »</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
