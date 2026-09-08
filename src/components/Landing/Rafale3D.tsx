import React, { useState, useEffect } from 'react';
import { soundFx } from '../../services/soundFx';

interface Rafale3DProps {
  onNukeScreen?: () => void;
}

export const Rafale3D: React.FC<Rafale3DProps> = ({ onNukeScreen }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isFiring, setIsFiring] = useState(false);

  // Smooth mouse parallax for 3D depth
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 18;
      const y = (e.clientY / innerHeight - 0.5) * -14;
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
      setTimeout(() => setIsFiring(false), 900);
    }, 850);
  };

  return (
    <div
      onClick={handleStrike}
      className="relative select-none cursor-pointer group"
      style={{
        perspective: '1400px',
        transformStyle: 'preserve-3d'
      }}
      title="Click Rafale F4 to Launch ASMP-A Hypersonic Nuclear Strike on UI"
    >
      {/* 3D Fighter Jet Container (Flipped to face top-right -> center-left) */}
      <div
        className="relative transition-transform duration-300 ease-out flex items-center justify-center"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(40px) scaleX(-1)`
        }}
      >
        {/* Twin Supersonic Mach Afterburner Plumes with Mach Diamonds */}
        <div className="absolute top-[42%] left-[16%] z-0 flex space-x-8 pointer-events-none">
          {/* Engine 1 Exhaust */}
          <div className="relative">
            <div className="w-4 h-20 bg-gradient-to-t from-cyan-400 via-amber-400 to-transparent rounded-full blur-[2px] animate-pulse opacity-95 -rotate-[22deg]"></div>
            <div className="absolute top-4 left-1 w-2 h-2 rounded-full bg-white blur-[1px] animate-ping"></div>
          </div>
          {/* Engine 2 Exhaust */}
          <div className="relative">
            <div className="w-4 h-20 bg-gradient-to-t from-cyan-400 via-amber-400 to-transparent rounded-full blur-[2px] animate-pulse opacity-95 -rotate-[22deg]"></div>
            <div className="absolute top-4 left-1 w-2 h-2 rounded-full bg-white blur-[1px] animate-ping"></div>
          </div>
        </div>

        {/* Wingtip Condensation Vapor Streams */}
        <div className="absolute top-[70%] left-[8%] w-1.5 h-24 bg-gradient-to-t from-white/40 via-cyan-400/20 to-transparent blur-[1px] -rotate-[15deg] pointer-events-none"></div>
        <div className="absolute top-[30%] right-[10%] w-1.5 h-24 bg-gradient-to-t from-white/40 via-cyan-400/20 to-transparent blur-[1px] -rotate-[15deg] pointer-events-none"></div>

        {/* 3D Combat-Ready HD Fighter Jet Image */}
        <div className="relative z-10 filter drop-shadow-[0_25px_50px_rgba(0,240,255,0.45)] group-hover:drop-shadow-[0_30px_70px_rgba(255,42,75,0.85)] transition-all duration-300">
          <img
            src="/assets/fighter.png"
            alt="Combat-Ready Rafale F4"
            className="w-[340px] sm:w-[440px] md:w-[520px] lg:w-[600px] max-w-none h-auto object-contain pointer-events-none transform -rotate-6 group-hover:scale-105 transition-transform duration-500"
          />

          {/* Hypersonic ASMP-A Nuclear Missile In-Flight Streak */}
          {isFiring && (
            <div className="absolute top-[52%] left-[48%] z-30 pointer-events-none">
              {/* Glowing Ramjet Missile Core & Shock Plasma */}
              <div className="w-5 h-44 bg-gradient-to-b from-white via-yellow-300 to-red-600 rounded-full shadow-[0_0_45px_#ff0000] animate-ping transform rotate-[46deg]"></div>
              {/* Trailing Smoke & Ionization Ring */}
              <div className="w-40 h-40 -translate-x-20 -translate-y-20 border-2 border-orange-400 rounded-full animate-ping"></div>
            </div>
          )}
        </div>

        {/* Tactical Laser Designator Beam targeting the Center UI */}
        <div className="w-1 h-20 bg-gradient-to-b from-red-500 via-red-400 to-transparent shadow-[0_0_12px_#ff0000] -mt-3 animate-pulse pointer-events-none"></div>

        {/* Combat HUD Reticle */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
          <div className="w-48 h-48 border border-red-500/50 rounded-full flex items-center justify-center animate-spin" style={{ animationDuration: '15s' }}>
            <div className="w-36 h-36 border border-dashed border-red-400/60 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
