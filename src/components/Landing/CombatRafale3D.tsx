import React, { useState, useEffect } from 'react';
import { soundFx } from '../../services/soundFx';
import { Crosshair, Zap, Flame, ShieldAlert } from 'lucide-react';

interface CombatRafale3DProps {
  onNukeScreen?: () => void;
}

export const CombatRafale3D: React.FC<CombatRafale3DProps> = ({ onNukeScreen }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isFiring, setIsFiring] = useState(false);

  // Smooth mouse parallax for 3D depth
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 16;
      const y = (e.clientY / innerHeight - 0.5) * -12;
      setTilt({ x: Number(y.toFixed(2)), y: Number(x.toFixed(2)) });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleStrike = () => {
    if (isFiring) return;
    soundFx.playTargetLock();
    soundFx.playMissileLaunch();
    setIsFiring(true);

    setTimeout(() => {
      soundFx.playDetonationRumble();
      if (onNukeScreen) {
        onNukeScreen();
      }
      setTimeout(() => setIsFiring(false), 800);
    }, 850);
  };

  return (
    <div
      onClick={handleStrike}
      className="relative select-none cursor-pointer group"
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d'
      }}
      title="Rafale F4 Multirole Strike Fighter (Click to Launch ASMP-A Hypersonic Nuclear Strike)"
    >
      {/* 3D Fighter Jet Container */}
      <div
        className="relative transition-transform duration-300 ease-out flex flex-col items-end"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(35px)`
        }}
      >
        {/* Tactical HUD Lock-On Telemetry Badge above the Jet */}
        <div className="mb-2 px-3 py-1 bg-[#090f18]/85 backdrop-blur-md border border-cyan-500/40 rounded shadow-[0_0_15px_rgba(0,240,255,0.25)] flex items-center space-x-2 text-[10px] font-mono tracking-wider text-cyan-300 pointer-events-none group-hover:border-red-500 group-hover:shadow-[0_0_20px_rgba(255,42,75,0.5)] transition-all">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400 group-hover:text-red-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="font-bold text-white">RAFALE F4</span>
          <span className="text-slate-400">|</span>
          <span className="text-amber-400 font-bold">MACH 2.25</span>
          <span className="text-slate-400">|</span>
          <span className="text-red-400 font-bold flex items-center">
            <Flame className="w-3 h-3 mr-0.5 text-red-400 inline" />
            ASMP-A ARMED
          </span>
        </div>

        {/* Fighter Jet Imagery & Afterburners */}
        <div className="relative">
          {/* Twin Supersonic Mach Afterburner Plumes with Mach Diamonds */}
          <div className="absolute top-[42%] left-[12%] z-0 flex space-x-7 pointer-events-none">
            {/* Engine 1 Afterburner */}
            <div className="relative">
              <div className="w-4 h-24 bg-gradient-to-t from-cyan-400 via-amber-400 to-transparent rounded-full blur-[1px] animate-pulse opacity-95 -rotate-[24deg]" />
              <div className="absolute top-5 left-1 w-2.5 h-2.5 rounded-full bg-white blur-[1px] animate-ping" />
            </div>
            {/* Engine 2 Afterburner */}
            <div className="relative">
              <div className="w-4 h-24 bg-gradient-to-t from-cyan-400 via-amber-400 to-transparent rounded-full blur-[1px] animate-pulse opacity-95 -rotate-[24deg]" />
              <div className="absolute top-5 left-1 w-2.5 h-2.5 rounded-full bg-white blur-[1px] animate-ping" />
            </div>
          </div>

          {/* Wingtip Condensation Vapor Streams */}
          <div className="absolute top-[68%] left-[6%] w-1 h-28 bg-gradient-to-t from-white/40 via-cyan-400/20 to-transparent blur-[1px] -rotate-[16deg] pointer-events-none" />
          <div className="absolute top-[30%] right-[8%] w-1 h-28 bg-gradient-to-t from-white/40 via-cyan-400/20 to-transparent blur-[1px] -rotate-[16deg] pointer-events-none" />

          {/* 3D Combat-Ready High-Definition Stealth Jet */}
          <div className="relative z-10 filter drop-shadow-[0_20px_45px_rgba(0,240,255,0.4)] group-hover:drop-shadow-[0_25px_65px_rgba(255,42,75,0.85)] transition-all duration-300">
            <img
              src="/assets/fighter.png"
              alt="Combat-Ready Rafale F4"
              className="w-[280px] sm:w-[360px] md:w-[440px] lg:w-[500px] max-w-none h-auto object-contain pointer-events-none transform -rotate-6 group-hover:scale-105 transition-transform duration-500"
              style={{
                filter: 'contrast(1.15) brightness(0.95)'
              }}
            />

            {/* Hypersonic ASMP-A Missile Streak when Fired */}
            {isFiring && (
              <div className="absolute top-[52%] left-[48%] z-30 pointer-events-none">
                <div className="w-5 h-48 bg-gradient-to-b from-white via-yellow-300 to-red-600 rounded-full shadow-[0_0_50px_#ff0000] animate-ping transform rotate-[46deg]" />
                <div className="w-44 h-44 -translate-x-22 -translate-y-22 border-2 border-orange-400 rounded-full animate-ping" />
              </div>
            )}
          </div>

          {/* Red Tactical Laser Targeting Beam */}
          <div className="absolute bottom-0 right-1/4 w-0.5 h-28 bg-gradient-to-b from-red-500 via-red-400/80 to-transparent shadow-[0_0_12px_#ff0000] pointer-events-none animate-pulse" />
        </div>

        {/* Action Trigger Prompt */}
        <div className="mt-1 px-3 py-1 bg-[#060b12]/80 backdrop-blur-sm border-t border-red-500/30 rounded-b flex items-center space-x-2 text-[9px] font-mono text-red-300 group-hover:border-red-500 group-hover:text-red-200 transition-colors">
          <Zap className="w-3 h-3 text-red-400 animate-pulse" />
          <span className="font-bold tracking-wider uppercase">CLICK JET TO EXECUTE NUCLEAR STRIKE</span>
        </div>
      </div>
    </div>
  );
};
