import React, { useState, useEffect, useRef } from 'react';
import { Radio, Crosshair, Zap, Activity } from 'lucide-react';
import { soundFx } from '../../services/soundFx';

interface RadarDish3DProps {
  interactive?: boolean;
}

export const RadarDish3D: React.FC<RadarDish3DProps> = ({ interactive = true }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [azimuth, setAzimuth] = useState(44.8);
  const [elevation, setElevation] = useState(62.4);

  // Mouse Parallax for 3D Tilt
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 24; // -12 to +12 deg
      const y = (e.clientY / innerHeight - 0.5) * -18; // -9 to +9 deg
      setTilt({ x: Number(y.toFixed(2)), y: Number(x.toFixed(2)) });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Continuous subtle tracking angle drift
  useEffect(() => {
    const interval = setInterval(() => {
      setAzimuth((prev) => Number(((prev + 0.3) % 360).toFixed(1)));
      setElevation((prev) => Number((60 + Math.sin(Date.now() / 4000) * 8).toFixed(1)));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePing = () => {
    soundFx.playRadarPing(880);
  };

  return (
    <div
      onClick={handlePing}
      className="relative group select-none transition-transform duration-200 ease-out cursor-crosshair"
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d'
      }}
    >
      {/* 3D Dish Container */}
      <div
        className="relative flex flex-col items-center transition-transform duration-300 ease-out"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(25px)`
        }}
      >
        {/* Radar Telemetry Header Badge */}
        <div className="absolute -top-7 right-0 z-30 flex items-center space-x-2 bg-black/80 border border-cyan-400/60 rounded px-2.5 py-0.5 text-[9px] font-mono whitespace-nowrap shadow-[0_0_15px_rgba(0,240,255,0.4)] backdrop-blur-md">
          <Crosshair className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="font-bold text-cyan-300">PSR-3D SURVEILLANCE RADAR</span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-400 font-bold">AZ: {azimuth.toString().padStart(5, '0')}°</span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-300 font-bold">EL: {elevation}°</span>
        </div>

        {/* Electromagnetic Emission Waves Radiating from Feedhorn */}
        <div className="absolute top-[18%] left-[30%] z-20 pointer-events-none">
          <div className="w-16 h-16 border-2 border-cyan-400/60 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] -translate-x-8 -translate-y-8"></div>
          <div className="w-24 h-24 border border-cyan-300/40 rounded-full animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] -translate-x-12 -translate-y-12"></div>
          <div className="w-32 h-32 border border-cyan-400/20 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] -translate-x-16 -translate-y-16"></div>
        </div>

        {/* 3D High-Res Radar Dish Cutout */}
        <div className="relative z-10 filter drop-shadow-[0_15px_35px_rgba(0,240,255,0.3)] hover:drop-shadow-[0_20px_45px_rgba(0,240,255,0.6)] transition-all duration-300">
          <img
            src="/assets/radar_dish.png"
            alt="3D Primary Surveillance Radar Dish"
            className="w-72 sm:w-80 md:w-96 h-auto object-contain pointer-events-none transform hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Ground Mount Status Bar */}
        <div className="relative z-30 -mt-3 flex items-center space-x-2 bg-black/85 border border-cyan-500/40 px-3 py-1 rounded text-[9px] font-mono text-slate-300 shadow-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></div>
          <span>FREQ: 9.4 GHz (X-BAND)</span>
          <span>•</span>
          <span className="text-cyan-300 font-bold">SWEEP: 15 RPM ACTIVE</span>
        </div>
      </div>
    </div>
  );
};
