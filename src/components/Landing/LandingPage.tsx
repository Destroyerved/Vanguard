import React, { useState } from 'react';
import { ChevronRight, Shield, Activity, Radio, Crosshair } from 'lucide-react';
import { soundFx } from '../../services/soundFx';
import { CombatRafale3D } from './CombatRafale3D';
import { RealisticRadar3D } from './RealisticRadar3D';
import { RadarTrackingBackground } from './RadarTrackingBackground';
import { NukeEffect } from './NukeEffect';
import { useEventStore } from '../../store/useEventStore';

interface LandingPageProps {
  onEnterCommandRoom: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterCommandRoom }) => {
  const [screenShake, setScreenShake] = useState(false);
  const [nukeActive, setNukeActive] = useState(false);

  const executeDetonation = useEventStore((s) => s.executeDetonation);

  const handleNukeTriggered = () => {
    setScreenShake(true);
    setNukeActive(true);
    executeDetonation();

    setTimeout(() => {
      setScreenShake(false);
    }, 3200);

    setTimeout(() => {
      setNukeActive(false);
    }, 4500);
  };

  const handleLaunch = () => {
    soundFx.playTargetLock();
    onEnterCommandRoom();
  };

  return (
    <div
      className={`relative min-h-screen w-full bg-[#020408] text-[#c9d8e6] font-mono selection:bg-cyan-500 selection:text-black overflow-hidden ${
        screenShake ? 'animate-screen-shake' : ''
      }`}
    >
      {/* Tactical Realistic Nuclear Strike FX (Fireball, Supersonic Shockwave, Thermal Flash & Embers) */}
      <NukeEffect active={nukeActive} />

      {/* Atmospheric Darkened Soldiers Silhouette Horizon (Bottom) */}
      <div
        className="fixed inset-x-0 bottom-0 h-[45vh] bg-cover bg-bottom bg-no-repeat pointer-events-none z-0 transition-all duration-700 opacity-55"
        style={{
          backgroundImage: `url('/assets/soldiers_hd.jpg'), url('/assets/night_soldiers_bg.jpg')`,
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0) 100%)',
          filter: nukeActive ? 'brightness(1.5) contrast(1.3) hue-rotate(-20deg)' : 'brightness(0.65) contrast(1.2)'
        }}
      />

      {/* Top Planetary Crescent Rim (Galaxy Reference Aesthetic) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[62%] w-[1000px] sm:w-[1300px] h-[550px] sm:h-[650px] rounded-full border border-cyan-400/15 bg-gradient-to-b from-[#0a1828]/60 via-[#050f1c]/30 to-transparent blur-[0.5px] pointer-events-none z-0 shadow-[0_0_80px_rgba(0,240,255,0.06)]" />

      {/* Opaque Tactical Radar Tracking Grid in the Background */}
      <RadarTrackingBackground />

      {/* Deep Obsidian Atmospheric Gradients & CRT Scanlines */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#020408]/60 via-transparent to-[#020408]/85 pointer-events-none z-10" />
      <div className="fixed inset-0 scanlines opacity-15 pointer-events-none z-10" />

      {/* TOP HEADER NAVIGATION (Matching Reference Aesthetic) */}
      <header className="relative z-30 px-6 sm:px-14 pt-6 pb-2 flex items-center justify-between text-xs sm:text-sm font-sans tracking-widest text-slate-300 select-none">
        {/* Top Left Navigation Link */}
        <button
          onClick={handleLaunch}
          className="hover:text-cyan-300 transition-colors uppercase tracking-widest font-medium flex items-center space-x-1.5 group"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:scale-125 transition-transform" />
          <span>Profile</span>
        </button>

        {/* Top Center User Handle */}
        <div className="text-xs sm:text-sm font-mono tracking-widest text-cyan-200 font-semibold drop-shadow-[0_0_12px_rgba(0,240,255,0.5)]">
          @DESTROYER_OF_WORLDS
        </div>

        {/* Top Right Navigation Link */}
        <button
          onClick={handleLaunch}
          className="hover:text-cyan-300 transition-colors uppercase tracking-widest font-medium flex items-center space-x-1.5 group"
        >
          <span>Contact Us</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:scale-125 transition-transform" />
        </button>
      </header>

      {/* COMBAT-READY 3D RAFALE FIGHTER JET (Top-Right / Top Area) */}
      <div className="absolute top-12 right-2 sm:right-10 z-20 pointer-events-auto">
        <CombatRafale3D onNukeScreen={handleNukeTriggered} />
      </div>

      {/* REALISTIC 3D PRIMARY SURVEILLANCE RADAR (Left-Bottom) */}
      <div className="absolute bottom-2 left-2 sm:left-8 z-20 pointer-events-auto">
        <RealisticRadar3D />
      </div>

      {/* MAIN CENTER HERO: SOLID OPAQUE VANGUARD TITLE & MOON */}
      <main className="relative z-20 min-h-[calc(100vh-140px)] flex flex-col items-center justify-center text-center px-4 select-none my-auto">
        {/* Crisp, Opaque, Grand Luxury Typography "VANGUARD" */}
        <div className="relative inline-block cursor-pointer group" onClick={handleLaunch}>
          <h1
            className="font-galaxy font-black text-6xl sm:text-8xl md:text-[10.5rem] lg:text-[12.5rem] tracking-wider leading-none text-white drop-shadow-[0_4px_30px_rgba(0,240,255,0.4)] transition-transform duration-500 group-hover:scale-105 select-none"
            style={{
              letterSpacing: '0.09em',
              background: 'linear-gradient(180deg, #ffffff 15%, #d5f2fc 50%, #82caf5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              opacity: 0.98
            }}
          >
            VANGUARD
          </h1>

          {/* Nuclear Strike Scorch on Title when Fired */}
          {nukeActive && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
              <div className="w-64 h-64 rounded-full bg-red-600/40 border-4 border-yellow-300 animate-ping" />
              <div className="w-96 h-96 rounded-full border-2 border-orange-500 animate-ping delay-100" />
            </div>
          )}
        </div>

        {/* Glowing Tactical Moon Sphere with Sleek Horizontal Gradient Axis Line */}
        <div className="relative flex items-center justify-center w-full max-w-xl mx-auto mt-2 mb-5">
          {/* Left glowing gradient line & green dot endpoint */}
          <div className="flex-1 flex items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#4ade80] shadow-[0_0_12px_#4ade80]" />
            <div className="flex-1 h-[1.5px] bg-gradient-to-r from-[#4ade80] via-[#38bdf8] to-transparent shadow-[0_0_8px_#38bdf8]" />
          </div>

          {/* Center Glowing Moon Orb */}
          <div
            onClick={handleLaunch}
            className="relative mx-4 cursor-pointer group/moon"
            title="Click to Enter Tactical Command Room"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-cyan-300/60 shadow-[0_0_35px_rgba(0,240,255,0.8)] overflow-hidden transition-transform duration-500 group-hover/moon:scale-115">
              <img
                src="/assets/clean_galaxy.jpg"
                alt="Tactical Moon"
                className="w-full h-full object-cover transform scale-150 group-hover/moon:rotate-12 transition-transform duration-700"
              />
            </div>
            <div className="absolute inset-0 rounded-full bg-cyan-400/20 group-hover/moon:bg-cyan-400/40 transition-colors" />
          </div>

          {/* Right glowing gradient line & purple dot endpoint */}
          <div className="flex-1 flex items-center">
            <div className="flex-1 h-[1.5px] bg-gradient-to-l from-[#c084fc] via-[#38bdf8] to-transparent shadow-[0_0_8px_#38bdf8]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#c084fc] shadow-[0_0_12px_#c084fc]" />
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-[11px] sm:text-xs font-mono tracking-[0.25em] text-slate-400 uppercase mb-5 max-w-xl">
          Multi-Source Defense Situational Awareness & C4ISR Platform
        </p>

        {/* Sleek Luxury CTA Button */}
        <button
          onClick={handleLaunch}
          className="px-8 py-3.5 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-sans font-black text-xs sm:text-sm uppercase tracking-widest rounded shadow-[0_0_35px_rgba(0,240,255,0.7)] transition transform hover:scale-105 active:scale-95 flex items-center space-x-2.5"
        >
          <span>ENTER COMMAND ROOM</span>
          <ChevronRight className="w-4 h-4 text-black font-bold" />
        </button>
      </main>

      {/* BOTTOM FOOTER (Matching Reference Aesthetic) */}
      <footer className="relative z-30 px-6 sm:px-14 pb-6 pt-2 flex items-center justify-between text-xs sm:text-sm font-sans tracking-widest text-slate-400 select-none">
        <a
          href="https://github.com/Destroyerved/Vanguard"
          target="_blank"
          rel="noreferrer"
          className="hover:text-cyan-300 transition-colors lowercase tracking-wider flex items-center space-x-1"
        >
          <span>www.reallygreatsite.com</span>
        </a>

        <a
          href="mailto:ops@vanguard-defense.mil"
          className="hover:text-cyan-300 transition-colors lowercase tracking-wider flex items-center space-x-1"
        >
          <span>hello@reallygreatsite.com</span>
        </a>
      </footer>
    </div>
  );
};
