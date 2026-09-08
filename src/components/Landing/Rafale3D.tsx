import React, { useState, useEffect, useRef } from 'react';
import { Flame, Zap, ShieldAlert, Crosshair, Radio, RotateCcw } from 'lucide-react';
import { soundFx } from '../../services/soundFx';
import confetti from 'canvas-confetti';

interface Rafale3DProps {
  onNukeScreen?: () => void;
  interactive?: boolean;
}

export const Rafale3D: React.FC<Rafale3DProps> = ({ onNukeScreen, interactive = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isFiring, setIsFiring] = useState(false);
  const [isNuked, setIsNuked] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Mouse Parallax Effect for 3D Tilt
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 28; // -14 to +14 deg
      const y = (e.clientY / innerHeight - 0.5) * -22; // -11 to +11 deg
      setTilt({ x: Number(y.toFixed(2)), y: Number(x.toFixed(2)) });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLaunchNuke = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundFx.playTargetLock();
    setCountdown(3);
    soundFx.playCountdownBeep(false);

    let count = 3;
    const timer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        soundFx.playCountdownBeep(false);
        setCountdown(count);
      } else {
        clearInterval(timer);
        setCountdown(null);
        fireNuclearMissile();
      }
    }, 1000);
  };

  const fireNuclearMissile = () => {
    soundFx.playCountdownBeep(true);
    soundFx.playMissileLaunch();
    setIsFiring(true);

    // Missile in-flight duration
    setTimeout(() => {
      soundFx.playDetonationRumble();
      soundFx.playAlarmKlaxon();
      setIsFiring(false);
      setIsNuked(true);

      if (onNukeScreen) {
        onNukeScreen();
      }

      // Radioactive fallout ash particle burst
      try {
        confetti({
          particleCount: 160,
          spread: 140,
          origin: { y: 0.45, x: 0.5 },
          colors: ['#ff2a4b', '#ffaa00', '#ffffff', '#00f0ff', '#a855f7'],
          ticks: 350,
          gravity: 0.9
        });
      } catch {
        // confetti fallback
      }
    }, 1100);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundFx.playClick(1000);
    setIsFiring(false);
    setIsNuked(false);
    setCountdown(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative group select-none transition-transform duration-200 ease-out"
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d'
      }}
    >
      {/* 3D Fighter Jet Outer Shell */}
      <div
        className="relative flex flex-col items-center cursor-pointer transition-transform duration-300 ease-out"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(30px)`
        }}
      >
        {/* Targeting HUD Box over Jet */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-2 bg-black/80 border border-cyan-400/60 rounded px-2.5 py-0.5 text-[9px] font-mono whitespace-nowrap shadow-[0_0_15px_rgba(0,240,255,0.4)] backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="font-bold text-cyan-300">RAFALE F4 // VANGUARD-01</span>
          <span className="text-slate-500">|</span>
          <span className="text-amber-300 font-bold">MACH 2.25</span>
          <span className="text-slate-500">|</span>
          <span className="text-red-400 font-bold">ASMP-A NUCLEAR ARMED</span>
        </div>

        {/* HUD Target Reticle */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <div className="w-48 h-48 border border-cyan-400/25 rounded-full flex items-center justify-center animate-spin" style={{ animationDuration: '30s' }}>
            <div className="w-40 h-40 border border-dashed border-cyan-400/20 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-red-400 rounded-full animate-ping" />
            </div>
          </div>
        </div>

        {/* Twin Jet Engine Afterburner Plumes */}
        <div className="absolute top-[48%] left-[22%] z-0 flex space-x-6 pointer-events-none">
          <div className="w-3 h-10 bg-gradient-to-t from-cyan-400 via-amber-400 to-transparent rounded-full blur-[2px] animate-pulse opacity-90 rotate-[-15deg]"></div>
          <div className="w-3 h-10 bg-gradient-to-t from-cyan-400 via-amber-400 to-transparent rounded-full blur-[2px] animate-pulse opacity-90 rotate-[-15deg]"></div>
        </div>

        {/* 3D High-Res Fighter Jet Image */}
        <div className="relative z-10 filter drop-shadow-[0_15px_30px_rgba(0,240,255,0.35)] hover:drop-shadow-[0_20px_40px_rgba(255,42,75,0.6)] transition-all duration-300">
          <img
            src="/assets/fighter.png"
            alt="Rafale F4 Stealth Air Superiority Fighter"
            className="w-72 sm:w-80 md:w-96 h-auto object-contain pointer-events-none transform -rotate-6 hover:rotate-0 transition-transform duration-500"
          />

          {/* Firing Missile Particle Beam (Nuking the UI) */}
          {isFiring && (
            <div className="absolute top-[60%] left-[50%] z-30 pointer-events-none">
              {/* ASMP-A Missile Glowing Streak */}
              <div className="w-3 h-24 bg-gradient-to-b from-yellow-300 via-red-500 to-transparent rounded-full shadow-[0_0_30px_#ff2a4b] animate-ping transform rotate-[45deg]"></div>
              {/* Shockwave ripple */}
              <div className="w-20 h-20 -translate-x-10 -translate-y-10 border-2 border-yellow-300 rounded-full animate-ping"></div>
            </div>
          )}
        </div>

        {/* Targeting Laser Beam pointing towards UI Center */}
        <div className="w-0.5 h-16 bg-gradient-to-b from-red-500/80 to-transparent shadow-[0_0_10px_#ff0000] -mt-2 animate-pulse pointer-events-none"></div>

        {/* Quick Action Trigger Button ("NUKE THE UI") */}
        {interactive && (
          <div className="relative z-30 mt-2">
            {countdown !== null ? (
              <div className="px-4 py-1.5 bg-red-950/90 border border-red-500 rounded text-yellow-300 font-mono font-black text-xs animate-pulse tracking-widest shadow-[0_0_20px_rgba(255,42,75,0.8)]">
                ASMP-A RELEASE IN T - 00:0{countdown}s
              </div>
            ) : isNuked ? (
              <button
                onClick={handleReset}
                className="px-3 py-1 bg-slate-900/90 hover:bg-slate-800 border border-slate-600 rounded text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>RESTORE UI // RE-ARM</span>
              </button>
            ) : (
              <button
                onClick={handleLaunchNuke}
                className="px-4 py-1.5 bg-gradient-to-r from-red-900 via-amber-900 to-red-900 hover:from-red-800 hover:to-amber-800 border border-amber-400/80 rounded text-[11px] font-mono font-black text-yellow-300 uppercase tracking-wider flex items-center space-x-1.5 shadow-[0_0_20px_rgba(255,170,0,0.6)] transition transform hover:scale-105 active:scale-95"
                title="Authorize Rafale F4 Tactical Nuclear Strike on the UI"
              >
                <Flame className="w-3.5 h-3.5 text-yellow-400 animate-bounce" />
                <span>NUKE THE UI (ASMP-A 300kT) »</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
