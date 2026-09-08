import React, { useState, useEffect, useRef } from 'react';
import { soundFx } from '../../services/soundFx';

interface RadarDish3DProps {
  onPing?: () => void;
}

export const RadarDish3D: React.FC<RadarDish3DProps> = ({ onPing }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [rotationAngle, setRotationAngle] = useState(0);

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

  // Continuous mechanical radar rotation oscillation
  useEffect(() => {
    let animId: number;
    const startTime = Date.now();

    const animateRotation = () => {
      const elapsed = Date.now() - startTime;
      // Smooth sinusoidal rotation between -18deg and +24deg simulating azimuth tracking
      const angle = Math.sin(elapsed / 1800) * 16;
      setRotationAngle(angle);
      animId = requestAnimationFrame(animateRotation);
    };

    animId = requestAnimationFrame(animateRotation);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handlePing = () => {
    soundFx.playRadarPing(880);
    if (onPing) onPing();
  };

  return (
    <div
      onClick={handlePing}
      className="relative select-none cursor-pointer group"
      style={{
        perspective: '1400px',
        transformStyle: 'preserve-3d'
      }}
      title="3D Primary Surveillance Radar (Click to Ping)"
    >
      {/* 3D Dish Container */}
      <div
        className="relative transition-transform duration-300 ease-out flex items-center justify-center"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y + rotationAngle * 0.5}deg) translateZ(35px)`
        }}
      >
        {/* Pulsing Electromagnetic Microwave Radiation Rings (Radiating up into space) */}
        <div className="absolute top-[18%] left-[28%] z-20 pointer-events-none">
          <div className="w-20 h-20 border-2 border-cyan-400/80 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] -translate-x-10 -translate-y-10"></div>
          <div className="w-32 h-32 border border-cyan-300/50 rounded-full animate-[ping_2.6s_cubic-bezier(0,0,0.2,1)_infinite] -translate-x-16 -translate-y-16"></div>
          <div className="w-48 h-48 border border-cyan-400/30 rounded-full animate-[ping_3.2s_cubic-bezier(0,0,0.2,1)_infinite] -translate-x-24 -translate-y-24"></div>
        </div>

        {/* 3D High-Definition Rotating Radar Dish */}
        <div
          className="relative z-10 filter drop-shadow-[0_20px_45px_rgba(0,240,255,0.4)] group-hover:drop-shadow-[0_25px_60px_rgba(0,240,255,0.75)] transition-all duration-300"
          style={{
            transform: `rotate(${rotationAngle * 0.4}deg)`
          }}
        >
          <img
            src="/assets/radar_dish.png"
            alt="3D Surveillance Radar Dish"
            className="w-[260px] sm:w-[320px] md:w-[380px] lg:w-[440px] max-w-none h-auto object-contain pointer-events-none transform group-hover:scale-105 transition-transform duration-500"
          />

          {/* Glowing Status LED on Turntable */}
          <div className="absolute bottom-8 right-16 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#00ff66] animate-ping pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
};
