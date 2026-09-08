import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { soundFx } from '../../services/soundFx';
import { Rafale3D } from './Rafale3D';
import { RadarDish3D } from './RadarDish3D';
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
      {/* Tactical Nuclear Strike Effect (Fireball, Supersonic Shockwave & Embers) */}
      <NukeEffect active={nukeActive} />

      {/* Atmospheric Special Forces Night Tactical Background Image */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 transition-all duration-700"
        style={{
          backgroundImage: `url('/assets/night_soldiers_bg.jpg')`,
          filter: nukeActive ? 'brightness(1.4) contrast(1.3) hue-rotate(-15deg)' : 'brightness(0.95)'
        }}
      />

      {/* Opaque Tactical Radar Tracking System Grid in the Background */}
      <RadarTrackingBackground />

      {/* Ambient Vignette & CRT Scanlines */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/75 pointer-events-none z-10" />
      <div className="fixed inset-0 scanlines opacity-20 pointer-events-none z-10" />

      {/* TOP HEADER NAVIGATION (Minimalist, matching reference image) */}
      <header className="relative z-30 px-8 sm:px-16 pt-7 pb-3 flex items-center justify-between text-xs sm:text-sm font-sans tracking-widest text-slate-300 select-none">
        {/* Top Left */}
        <button
          onClick={handleLaunch}
          className="hover:text-cyan-300 transition uppercase tracking-widest font-medium"
        >
          Profile
        </button>

        {/* Top Center Handle */}
        <div className="text-xs sm:text-sm font-mono tracking-widest text-cyan-200 font-semibold drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]">
          @DESTROYER_OF_WORLDS
        </div>

        {/* Top Right */}
        <button
          onClick={handleLaunch}
          className="hover:text-cyan-300 transition uppercase tracking-widest font-medium flex items-center space-x-1"
        >
          <span>Contact Us</span>
        </button>
      </header>

      {/* TOP-RIGHT COMBAT-READY 3D RAFALE FIGHTER JET */}
      <div className="absolute top-8 right-2 sm:right-10 z-20 pointer-events-auto">
        <Rafale3D onNukeScreen={handleNukeTriggered} />
      </div>

      {/* LEFT-BOTTOM ROTATING 3D RADAR DISH */}
      <div className="absolute bottom-0 left-0 sm:left-6 z-20 pointer-events-auto">
        <RadarDish3D />
      </div>

      {/* MAIN CENTER HERO: SOLID OPAQUE VANGUARD TITLE & MOON */}
      <main className="relative z-20 min-h-[calc(100vh-140px)] flex flex-col items-center justify-center text-center px-4 select-none mt-6 sm:mt-10">
        {/* Crisp, Opaque, Grand Luxury Typography "VANGUARD" */}
        <div className="relative inline-block cursor-pointer group" onClick={handleLaunch}>
          <h1
            className="font-galaxy font-black text-7xl sm:text-9xl md:text-[11rem] lg:text-[13rem] tracking-wider leading-none text-white drop-shadow-[0_8px_35px_rgba(0,240,255,0.6)] transition-transform duration-500 group-hover:scale-105"
            style={{
              letterSpacing: '0.08em',
              background: 'linear-gradient(180deg, #ffffff 20%, #c4efff 65%, #88d4f8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              opacity: 0.96
            }}
          >
            VANGUARD
          </h1>

          {/* Nuclear Strike Scorch on Title when Fired */}
          {nukeActive && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
              <div className="w-56 h-56 rounded-full bg-red-600/40 border-4 border-yellow-300 animate-ping"></div>
              <div className="w-80 h-80 rounded-full border-2 border-orange-500 animate-ping delay-100"></div>
            </div>
          )}
        </div>

        {/* Glowing Tactical Moon Sphere with Sleek Horizontal Gradient Axis Line */}
        <div className="relative flex items-center justify-center w-full max-w-xl mx-auto mt-2 mb-6">
          {/* Left glowing gradient line & green dot endpoint */}
          <div className="flex-1 flex items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#4ade80] shadow-[0_0_12px_#4ade80]" />
            <div className="flex-1 h-[1.5px] bg-gradient-to-r from-[#4ade80] via-[#38bdf8] to-transparent shadow-[0_0_8px_#38bdf8]" />
          </div>

          {/* Center Glowing Moon Orb */}
          <div
            onClick={handleLaunch}
            className="relative mx-4 cursor-pointer group/moon"
            title="Click to Enter Command Center"
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

        {/* Sleek CTA Button */}
        <button
          onClick={handleLaunch}
          className="px-8 py-3.5 bg-gradient-to-r from-cyan-400/90 via-sky-400/90 to-blue-500/90 hover:from-cyan-300 hover:to-blue-400 text-black font-sans font-black text-xs sm:text-sm uppercase tracking-widest rounded shadow-[0_0_35px_rgba(0,240,255,0.7)] transition transform hover:scale-105 active:scale-95 flex items-center space-x-2"
        >
          <span>ENTER COMMAND ROOM</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </main>

      {/* BOTTOM FOOTER (Minimalist, matching reference image) */}
      <footer className="relative z-30 px-8 sm:px-16 pb-7 pt-3 flex items-center justify-between text-xs sm:text-sm font-sans tracking-widest text-slate-400 select-none">
        <a
          href="https://github.com/Destroyerved/Vanguard"
          target="_blank"
          rel="noreferrer"
          className="hover:text-cyan-300 transition lowercase tracking-wider"
        >
          www.reallygreatsite.com
        </a>

        <a
          href="mailto:ops@vanguard-defense.mil"
          className="hover:text-cyan-300 transition lowercase tracking-wider"
        >
          hello@reallygreatsite.com
        </a>
      </footer>
    </div>
  );
};
