import React, { useState } from 'react';
import {
  ShieldAlert,
  Radio,
  Crosshair,
  Flame,
  Zap,
  Activity,
  Layers,
  ChevronRight,
  Terminal,
  FileDown,
  Cpu,
  Navigation,
  Sparkles,
  ArrowUpRight,
  RotateCcw
} from 'lucide-react';
import { soundFx } from '../../services/soundFx';
import { Rafale3D } from './Rafale3D';
import { RadarDish3D } from './RadarDish3D';
import { useEventStore } from '../../store/useEventStore';

interface LandingPageProps {
  onEnterCommandRoom: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterCommandRoom }) => {
  const [screenNukeFlash, setScreenNukeFlash] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [nukeActive, setNukeActive] = useState(false);

  const executeDetonation = useEventStore((s) => s.executeDetonation);

  const handleNukeTriggered = () => {
    setScreenNukeFlash(true);
    setScreenShake(true);
    setNukeActive(true);
    executeDetonation();

    setTimeout(() => {
      setScreenNukeFlash(false);
      setScreenShake(false);
    }, 3500);
  };

  const handleLaunch = () => {
    soundFx.playTargetLock();
    onEnterCommandRoom();
  };

  return (
    <div
      className={`relative min-h-screen w-full bg-[#020509] text-[#c9d8e6] font-mono selection:bg-cyan-500 selection:text-black overflow-x-hidden ${
        screenShake ? 'animate-screen-shake' : ''
      }`}
    >
      {/* Nuclear Detonation Blinding Flash */}
      {screenNukeFlash && (
        <div className="fixed inset-0 z-50 bg-white pointer-events-none animate-nuke-flash" />
      )}

      {/* Extracted Cosmic Galaxy Space Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
        style={{
          backgroundImage: `url('/assets/clean_galaxy.jpg')`,
          filter: nukeActive ? 'brightness(1.4) saturate(1.8) hue-rotate(-20deg)' : 'brightness(0.95)'
        }}
      />

      {/* Ambient Cosmic Vignette & Scanlines */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none z-10" />
      <div className="fixed inset-0 scanlines opacity-30 pointer-events-none z-10" />

      {/* TOP HEADER / CORNER NAVIGATION (Matching Image 3 GALAXY Layout) */}
      <header className="relative z-30 px-6 sm:px-12 py-5 flex items-center justify-between text-xs tracking-wider uppercase">
        {/* Top Left Link / Profile */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleLaunch}
            className="text-cyan-300 hover:text-white transition font-bold flex items-center space-x-1.5 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]"
          >
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span>SITUATIONAL COP // D-05</span>
          </button>
        </div>

        {/* Center Tag / Handle */}
        <div className="text-[10px] sm:text-xs font-mono font-bold text-cyan-200/80 tracking-widest border border-cyan-500/30 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.2)]">
          @DESTROYER_OF_WORLDS // DEFCON 3
        </div>

        {/* Top Right Action Button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleLaunch}
            className="px-4 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/60 rounded text-cyan-300 font-bold uppercase tracking-wider transition shadow-[0_0_15px_rgba(0,240,255,0.4)] flex items-center space-x-1.5 hover:scale-105"
          >
            <span>LAUNCH COP</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* MAIN HERO STAGE (Matching Wireframe: Rafale at Top-Left, Radar at Bottom-Right, Grand Title Center) */}
      <main className="relative z-20 min-h-[calc(100vh-140px)] flex flex-col justify-between px-6 sm:px-12 py-4">
        {/* TOP ROW: TOP-LEFT 3D RAFALE FIGHTER JET */}
        <div className="flex justify-start pt-2 sm:pt-4">
          <div className="w-full max-w-sm sm:max-w-md">
            <Rafale3D onNukeScreen={handleNukeTriggered} interactive={true} />
          </div>
        </div>

        {/* CENTER STAGE: LUXURY COSMIC TYPOGRAPHY "VANGUARD" & MOON SPHERE */}
        <div className="my-auto text-center relative py-6">
          {/* Main Title "VANGUARD" (Matching GALAXY Typography Style) */}
          <div className="relative inline-block select-none">
            <h1
              className="font-galaxy font-black text-6xl sm:text-8xl md:text-9xl lg:text-[11rem] tracking-wider leading-none text-transparent bg-clip-text bg-gradient-to-r from-[#8ef5e8] via-[#a3d8f8] to-[#9bbdf9] drop-shadow-[0_0_35px_rgba(0,240,255,0.6)]"
              style={{
                letterSpacing: '0.08em',
                textShadow: nukeActive ? '0 0 60px #ff2a4b, 0 0 100px #ffaa00' : undefined
              }}
            >
              VANGUARD
            </h1>

            {/* Glowing Laser / Nuke Impact Point on Center Title */}
            {nukeActive && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                <div className="w-32 h-32 rounded-full bg-red-600/40 border-4 border-yellow-300 animate-ping"></div>
                <div className="w-48 h-48 rounded-full border-2 border-red-500 animate-ping delay-100"></div>
              </div>
            )}
          </div>

          {/* Glowing Moon Sphere & Sleek Horizontal Accent Line (Matching Image 3 Reference) */}
          <div className="relative flex items-center justify-center max-w-xl mx-auto my-4">
            {/* Left glowing gradient line & cyan endpoint */}
            <div className="flex-1 flex items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#00ff66]" />
              <div className="flex-1 h-[1.5px] bg-gradient-to-r from-emerald-400 via-cyan-400 to-transparent shadow-[0_0_8px_#00f0ff]" />
            </div>

            {/* Center Glowing Moon Orb */}
            <div className="relative mx-3 cursor-pointer group" onClick={handleLaunch}>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-cyan-300/60 shadow-[0_0_30px_rgba(0,240,255,0.7)] overflow-hidden transition-transform duration-500 group-hover:scale-110">
                <img
                  src="/assets/clean_galaxy.jpg"
                  alt="Vanguard Celestial Moon"
                  className="w-full h-full object-cover transform scale-150 group-hover:rotate-12 transition-transform duration-700"
                />
              </div>
              <div className="absolute inset-0 rounded-full bg-cyan-400/20 group-hover:bg-cyan-400/40 transition-colors" />
            </div>

            {/* Right glowing gradient line & purple endpoint */}
            <div className="flex-1 flex items-center">
              <div className="flex-1 h-[1.5px] bg-gradient-to-l from-purple-400 via-cyan-400 to-transparent shadow-[0_0_8px_#00f0ff]" />
              <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_10px_#a855f7]" />
            </div>
          </div>

          {/* Subtitle & Enter Command Room Button */}
          <div className="space-y-4 mt-2">
            <p className="text-xs sm:text-sm text-cyan-200/90 font-mono tracking-widest max-w-2xl mx-auto uppercase">
              MULTI-SOURCE DEFENSE SITUATIONAL AWARENESS // COMMON OPERATING PICTURE
            </p>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={handleLaunch}
                className="px-8 py-3.5 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-black text-xs sm:text-sm uppercase tracking-widest rounded-md shadow-[0_0_35px_rgba(0,240,255,0.8)] transition transform hover:scale-105 active:scale-95 flex items-center space-x-2"
              >
                <Activity className="w-4 h-4" />
                <span>ENTER TACTICAL COMMAND CENTER »</span>
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: BOTTOM-RIGHT 3D MILITARY RADAR DISH */}
        <div className="flex justify-end pb-2 sm:pb-4">
          <div className="w-full max-w-sm sm:max-w-md">
            <RadarDish3D interactive={true} />
          </div>
        </div>
      </main>

      {/* BOTTOM FOOTER NAVIGATION (Matching Image 3 Reference) */}
      <footer className="relative z-30 px-6 sm:px-12 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 font-mono border-t border-cyan-500/20 bg-black/40 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <span className="text-cyan-400">🌐</span>
          <a href="https://github.com/Destroyerved/Vanguard" target="_blank" rel="noreferrer" className="hover:text-cyan-300 transition">
            www.vanguard-defense.mil
          </a>
        </div>

        <div className="text-[10px] text-slate-500 my-1 sm:my-0">
          TEAM DESTROYER OF WORLDS • HACKHERTZ 2026 • PROBLEM ID: D-05
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-cyan-400">✉️</span>
          <a href="mailto:ops@vanguard-defense.mil" className="hover:text-cyan-300 transition">
            ops@vanguard-defense.mil
          </a>
        </div>
      </footer>
    </div>
  );
};
