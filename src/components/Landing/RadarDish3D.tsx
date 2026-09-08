import React, { useState, useEffect, useRef } from 'react';
import { soundFx } from '../../services/soundFx';

export const RadarDish3D: React.FC = () => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Smooth mouse parallax for 3D depth
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 18; // -9 to +9 deg
      const y = (e.clientY / innerHeight - 0.5) * -14; // -7 to +7 deg
      setTilt({ x: Number(y.toFixed(2)), y: Number(x.toFixed(2)) });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handlePing = () => {
    soundFx.playRadarPing(880);
  };

  return (
    <div
      onClick={handlePing}
      className="relative select-none cursor-pointer group"
      style={{
        perspective: '1400px',
        transformStyle: 'preserve-3d'
      }}
      title="3D Primary Surveillance Radar"
    >
      {/* 3D Dish Container */}
      <div
        className="relative transition-transform duration-300 ease-out flex items-center justify-center"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(35px)`
        }}
      >
        {/* Electromagnetic Emission Wave Rings Radiating into Space */}
        <div className="absolute top-[22%] left-[28%] z-20 pointer-events-none">
          <div className="w-20 h-20 border-2 border-cyan-400/60 rounded-full animate-[ping_2.2s_cubic-bezier(0,0,0.2,1)_infinite] -translate-x-10 -translate-y-10"></div>
          <div className="w-32 h-32 border border-cyan-300/40 rounded-full animate-[ping_2.8s_cubic-bezier(0,0,0.2,1)_infinite] -translate-x-16 -translate-y-16"></div>
          <div className="w-44 h-44 border border-cyan-400/20 rounded-full animate-[ping_3.4s_cubic-bezier(0,0,0.2,1)_infinite] -translate-x-22 -translate-y-22"></div>
        </div>

        {/* Huge 3D Radar Dish Cut-Out */}
        <div className="relative z-10 filter drop-shadow-[0_25px_45px_rgba(0,240,255,0.35)] group-hover:drop-shadow-[0_30px_60px_rgba(0,240,255,0.65)] transition-all duration-300">
          <img
            src="/assets/radar_dish.png"
            alt="3D Surveillance Radar Dish"
            className="w-[300px] sm:w-[400px] md:w-[480px] lg:w-[560px] max-w-none h-auto object-contain pointer-events-none transform group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </div>
    </div>
  );
};
