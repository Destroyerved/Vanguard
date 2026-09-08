import React, { useState, useEffect, useRef } from 'react';
import { soundFx } from '../../services/soundFx';
import confetti from 'canvas-confetti';

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
      const x = (e.clientX / innerWidth - 0.5) * 20; // -10 to +10 deg
      const y = (e.clientY / innerHeight - 0.5) * -16; // -8 to +8 deg
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

      try {
        confetti({
          particleCount: 120,
          spread: 100,
          origin: { y: 0.45, x: 0.5 },
          colors: ['#00f0ff', '#ffaa00', '#ffffff', '#ff2a4b'],
          ticks: 250,
          gravity: 0.9
        });
      } catch {
        // ignore
      }

      setTimeout(() => setIsFiring(false), 800);
    }, 900);
  };

  return (
    <div
      onClick={handleStrike}
      className="relative select-none cursor-pointer group"
      style={{
        perspective: '1400px',
        transformStyle: 'preserve-3d'
      }}
      title="Click to Launch Tactical Strike on UI"
    >
      {/* 3D Fighter Jet Container */}
      <div
        className="relative transition-transform duration-300 ease-out flex items-center justify-center"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(40px)`
        }}
      >
        {/* Twin Pulsing Afterburner Flame Glows */}
        <div className="absolute top-[42%] left-[16%] z-0 flex space-x-8 pointer-events-none">
          <div className="w-4 h-16 bg-gradient-to-t from-cyan-400 via-amber-400 to-transparent rounded-full blur-[3px] animate-pulse opacity-95 -rotate-[22deg]"></div>
          <div className="w-4 h-16 bg-gradient-to-t from-cyan-400 via-amber-400 to-transparent rounded-full blur-[3px] animate-pulse opacity-95 -rotate-[22deg]"></div>
        </div>

        {/* Huge 3D Fighter Jet Image */}
        <div className="relative z-10 filter drop-shadow-[0_25px_45px_rgba(0,240,255,0.4)] group-hover:drop-shadow-[0_30px_60px_rgba(255,42,75,0.7)] transition-all duration-300">
          <img
            src="/assets/fighter.png"
            alt="Rafale Fighter Jet"
            className="w-[340px] sm:w-[440px] md:w-[540px] lg:w-[620px] max-w-none h-auto object-contain pointer-events-none transform -rotate-6 group-hover:scale-105 transition-transform duration-500"
          />

          {/* Firing Missile Streak (Nuking the UI) */}
          {isFiring && (
            <div className="absolute top-[55%] left-[52%] z-30 pointer-events-none">
              {/* ASMP-A Missile Streak */}
              <div className="w-4 h-32 bg-gradient-to-b from-yellow-200 via-red-500 to-transparent rounded-full shadow-[0_0_35px_#ff2a4b] animate-ping transform rotate-[42deg]"></div>
              {/* Shockwave Rings */}
              <div className="w-32 h-32 -translate-x-16 -translate-y-16 border-2 border-yellow-300 rounded-full animate-ping"></div>
            </div>
          )}
        </div>

        {/* Subtle HUD Reticle on Hover */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
          <div className="w-44 h-44 border border-cyan-400/40 rounded-full flex items-center justify-center animate-spin" style={{ animationDuration: '20s' }}>
            <div className="w-36 h-36 border border-dashed border-red-400/40 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
