import React, { useState, useEffect } from 'react';
import { soundFx } from '../../services/soundFx';
import { Radio, Disc, Shield, Activity } from 'lucide-react';

interface RealisticRadar3DProps {
  onPing?: () => void;
}

export const RealisticRadar3D: React.FC<RealisticRadar3DProps> = ({ onPing }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [azimuthAngle, setAzimuthAngle] = useState(42.8);
  const [isPinging, setIsPinging] = useState(false);

  // Smooth 3D mouse parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 14;
      const y = (e.clientY / innerHeight - 0.5) * -10;
      setTilt({ x: Number(y.toFixed(2)), y: Number(x.toFixed(2)) });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Continuous realistic mechanical azimuth rotation oscillation
  useEffect(() => {
    let animId: number;
    const startTime = Date.now();

    const animateRotation = () => {
      const elapsed = Date.now() - startTime;
      // Oscillate realistic azimuth tracking between 24° and 68°
      const angle = 45 + Math.sin(elapsed / 1600) * 22;
      setAzimuthAngle(Number(angle.toFixed(1)));
      animId = requestAnimationFrame(animateRotation);
    };

    animId = requestAnimationFrame(animateRotation);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleRadarClick = () => {
    soundFx.playRadarPing(880);
    setIsPinging(true);
    if (onPing) onPing();
    setTimeout(() => setIsPinging(false), 1400);
  };

  // Rotation offset derived from azimuth angle
  const mechanicalRotation = (azimuthAngle - 45) * 0.45;

  return (
    <div
      onClick={handleRadarClick}
      className="relative select-none cursor-pointer group"
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d'
      }}
      title="AN/FPS-117 3D Tactical Surveillance Radar (Click to Ping Airspace)"
    >
      {/* 3D Container with smooth parallax tilt */}
      <div
        className="relative transition-transform duration-300 ease-out flex flex-col items-start"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(30px)`
        }}
      >
        {/* Tactical Telemetry HUD Badge above the Radar */}
        <div className="mb-2 px-2.5 py-1 bg-[#090f18]/85 backdrop-blur-md border border-cyan-500/40 rounded shadow-[0_0_15px_rgba(0,240,255,0.25)] flex items-center space-x-2 text-[10px] font-mono tracking-wider text-cyan-300 pointer-events-none group-hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-bold text-white">PSR-3D RADAR</span>
          <span className="text-slate-400">|</span>
          <span className="text-emerald-400">AZ: {azimuthAngle.toFixed(1)}°</span>
          <span className="text-slate-400">|</span>
          <span className="text-cyan-200">EL: +22.4°</span>
          <span className="text-slate-400">|</span>
          <span className="text-amber-400">9.42 GHz</span>
        </div>

        {/* Main Radar Assembly */}
        <div className="relative">
          {/* Pulsing Electromagnetic Microwave Radiation Rings (Radiating from feedhorn into sky) */}
          <div className="absolute top-[12%] left-[32%] z-20 pointer-events-none">
            <div className="w-16 h-16 border-2 border-cyan-400/80 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] -translate-x-8 -translate-y-8" />
            <div className="w-28 h-28 border border-cyan-300/50 rounded-full animate-[ping_2.8s_cubic-bezier(0,0,0.2,1)_infinite] -translate-x-14 -translate-y-14" />
            <div className="w-44 h-44 border border-cyan-400/30 rounded-full animate-[ping_3.6s_cubic-bezier(0,0,0.2,1)_infinite] -translate-x-22 -translate-y-22" />
            {isPinging && (
              <div className="w-64 h-64 border-4 border-emerald-400/90 rounded-full animate-ping -translate-x-32 -translate-y-32" />
            )}
          </div>

          {/* High-Definition Photographic Radar Dish with Mechanical Oscillation */}
          <div
            className="relative z-10 transition-transform duration-100 filter drop-shadow-[0_20px_40px_rgba(0,240,255,0.35)] group-hover:drop-shadow-[0_25px_60px_rgba(0,240,255,0.7)]"
            style={{
              transform: `rotate(${mechanicalRotation}deg) scale(1.0)`
            }}
          >
            <img
              src="/assets/radar_dish.png"
              alt="3D Primary Surveillance Radar"
              className="w-[280px] sm:w-[340px] md:w-[400px] lg:w-[460px] max-w-none h-auto object-contain pointer-events-none transition-transform duration-500 group-hover:scale-[1.03]"
              style={{
                filter: 'contrast(1.18) brightness(0.92) saturate(1.1)'
              }}
            />

            {/* Glowing Emitter Waveguide Tip on Dish Feedhorn */}
            <div className="absolute top-[16%] left-[34%] w-3 h-3 rounded-full bg-cyan-300 shadow-[0_0_14px_#00f0ff] animate-ping pointer-events-none" />

            {/* Motorized Turntable Gear LED Indicators */}
            <div className="absolute bottom-[10%] right-[22%] flex items-center space-x-1 pointer-events-none bg-black/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#00ff66]" />
              <span className="text-[8px] font-mono text-emerald-300 font-bold">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Bottom Platform Telemetry Bar */}
        <div className="mt-1 px-3 py-1 bg-[#060b12]/80 backdrop-blur-sm border-t border-cyan-500/30 rounded-b flex items-center space-x-3 text-[9px] font-mono text-slate-400">
          <span className="text-cyan-400 font-semibold">STATUS: NOMINAL</span>
          <span>•</span>
          <span>4 ACTIVE TRACKS</span>
          <span>•</span>
          <span className="text-emerald-400 font-bold">CLICK TO PING</span>
        </div>
      </div>
    </div>
  );
};
