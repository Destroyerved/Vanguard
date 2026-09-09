import React from 'react';

interface HeroLandingPageProps {
  onEnterApp?: () => void;
}

export default function HeroLandingPage({ onEnterApp }: HeroLandingPageProps) {
  return (
    <div
      onClick={onEnterApp}
      className="relative w-screen h-screen min-h-[640px] max-h-screen bg-[#000000] text-white overflow-hidden select-none font-sans cursor-pointer flex flex-col justify-between"
      title="Click anywhere to enter Vanguard Operations Center"
    >
      {/* BACKGROUND: TACTICAL OPERATORS WITH OPACITY */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-75 bg-cover bg-center bg-no-repeat filter contrast-125 brightness-85"
        style={{ backgroundImage: "url('/assets/vanguard_hero_tactical.png')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/60" />
      </div>

      {/* MINUTE TACTICAL & AEROSPACE BACKGROUND DOODLES */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <svg
          className="w-full h-full animate-doodles"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="doodleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#526a27" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#526a27" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* 1. Top Left Flight Corridor Vectors */}
          <g stroke="rgba(82, 106, 39, 0.35)" strokeWidth="1" fill="none">
            <path d="M 60 120 L 260 120 L 320 160" strokeDasharray="4 4" />
            <circle cx="60" cy="120" r="2.5" fill="#526a27" />
            <circle cx="320" cy="160" r="2" fill="#38bdf8" />
            <text x="70" y="112" fill="#526a27" fontSize="9" fontFamily="monospace" letterSpacing="1">
              CORRIDOR_ALPHA // ALT 34.2K
            </text>
          </g>

          {/* 2. Top Right Telemetry Pitch Ladder */}
          <g stroke="rgba(255, 255, 255, 0.18)" strokeWidth="1" fill="none">
            <line x1="1480" y1="80" x2="1540" y2="80" />
            <line x1="1480" y1="80" x2="1480" y2="90" />
            <line x1="1540" y1="80" x2="1540" y2="90" />
            <text x="1548" y="84" fill="rgba(255, 255, 255, 0.3)" fontSize="8" fontFamily="monospace">
              +15°
            </text>

            <line x1="1490" y1="120" x2="1530" y2="120" strokeDasharray="3 3" />
            <text x="1538" y="124" fill="rgba(255, 255, 255, 0.2)" fontSize="8" fontFamily="monospace">
              00° HORIZON
            </text>

            <line x1="1480" y1="160" x2="1540" y2="160" />
            <line x1="1480" y1="160" x2="1480" y2="150" />
            <line x1="1540" y1="160" x2="1540" y2="150" />
            <text x="1548" y="164" fill="rgba(255, 255, 255, 0.3)" fontSize="8" fontFamily="monospace">
              -15°
            </text>
          </g>

          {/* 3. Tactical Reticles and Coordinate Ticks */}
          <g stroke="rgba(82, 106, 39, 0.28)" strokeWidth="1" fill="none">
            {/* Upper Center Coordinate Tick */}
            <path d="M 940 70 L 980 70 M 960 50 L 960 90" strokeDasharray="2 2" />
            <circle cx="960" cy="70" r="14" stroke="rgba(82, 106, 39, 0.2)" strokeDasharray="3 3" />
            <text x="986" y="73" fill="rgba(82, 106, 39, 0.4)" fontSize="8" fontFamily="monospace">
              LAT 48°51&apos;N // LNG 02°20&apos;E
            </text>

            {/* Left Mid Target Node */}
            <circle cx="180" cy="540" r="18" stroke="rgba(56, 189, 248, 0.18)" />
            <circle cx="180" cy="540" r="4" fill="rgba(56, 189, 248, 0.25)" />
            <path d="M 155 540 L 170 540 M 190 540 L 205 540 M 180 515 L 180 530 M 180 550 L 180 565" />
            <text x="150" y="580" fill="rgba(56, 189, 248, 0.3)" fontSize="8" fontFamily="monospace">
              TARGET_TRACK [LOCK_ACQ]
            </text>
          </g>

          {/* 4. Orbital Curved Splines & Azimuth Compass Arc */}
          <g stroke="url(#doodleGrad)" strokeWidth="1" fill="none">
            <path d="M 1200 180 C 1380 260, 1540 400, 1680 620" strokeDasharray="6 6" />
            <path d="M 1220 195 C 1390 270, 1530 395, 1660 590" opacity="0.5" />
            <text x="1340" y="240" fill="rgba(82, 106, 39, 0.35)" fontSize="8" fontFamily="monospace">
              AZIMUTH_SWEEP: 042° -&gt; 098°
            </text>
          </g>

          {/* 5. Bottom Left Micro Grid Crosshairs */}
          <g fill="rgba(255, 255, 255, 0.15)">
            <text x="80" y="980" fontSize="9" fontFamily="monospace">
              + + + +
            </text>
            <text x="80" y="1005" fontSize="8" fontFamily="monospace" fill="rgba(82, 106, 39, 0.35)">
              VGD-C2 // ARCH_V4.8.2 // READY
            </text>
          </g>

          {/* 6. Subtle Velocity Vector Lines */}
          <g stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.75" strokeDasharray="3 6">
            <line x1="380" y1="280" x2="480" y2="240" />
            <line x1="420" y1="360" x2="540" y2="310" />
            <line x1="300" y1="420" x2="450" y2="370" />
          </g>
        </svg>
      </div>

      {/* 1. TOP NAVIGATION BAR */}
      <header className="relative z-40 px-8 sm:px-12 lg:px-16 pt-7 pb-2 flex items-center justify-between">
        {/* Left: Brand / Company Name */}
        <div className="font-sans font-normal text-slate-100 text-sm tracking-normal">
          Technologies Co
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center space-x-12 lg:space-x-16">
          <span className="text-[#a4c639] font-bold text-sm tracking-normal">
            Home
          </span>
          <span className="text-[#767676] hover:text-white text-sm tracking-normal transition-colors">
            Products
          </span>
          <span className="text-[#767676] hover:text-white text-sm tracking-normal transition-colors">
            Resources
          </span>
          <span className="text-[#767676] hover:text-white text-sm tracking-normal transition-colors">
            Support
          </span>
        </nav>

        {/* Right: Contact Button */}
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEnterApp?.();
            }}
            className="border border-white/40 hover:border-white text-white text-xs px-6 py-2 rounded-none transition-colors font-sans tracking-wide"
          >
            Contact
          </button>
        </div>
      </header>

      {/* 2. MAIN HERO STAGE */}
      <div className="relative flex-1 flex flex-col justify-end items-center w-full max-w-[1580px] mx-auto px-6 sm:px-10 lg:px-14 pb-8">

        {/* HORIZONTAL TACTICAL GREEN STRIP BEHIND VANGUARD - LOWERED BETWEEN JET & RADAR */}
        <div className="relative w-full flex items-center justify-center z-20 mb-2 mt-auto pt-24 sm:pt-28 md:pt-32">
          {/* Tactical Olive Green Bar (#33401c) */}
          <div className="absolute inset-x-0 h-11 sm:h-13 md:h-14 bg-[#33401c] flex items-center justify-between z-0 border-y border-[#4a5c27]/40 shadow-[0_0_20px_rgba(51,64,28,0.6)]">
            {/* Left Vertical Accent (#33401c with highlight) */}
            <div className="w-2.5 sm:w-3.5 h-full bg-[#526a27] shadow-[0_0_12px_#33401c]" />
            {/* Right Horizontal Accent Tab */}
            <div className="w-8 sm:w-10 h-2 sm:h-2.5 bg-[#526a27] mr-24 sm:mr-36 md:mr-44 shadow-[0_0_12px_#33401c]" />
          </div>

          {/* VANGUARD GIANT HEADLINE WITH TACTICAL SHADE GLOW */}
          <h1
            className="relative z-10 font-vanguard font-black uppercase text-white tracking-[0.035em] text-[13.5vw] sm:text-[12.5vw] md:text-[11.2vw] lg:text-[10.5vw] leading-none select-none"
            style={{
              filter:
                'drop-shadow(0 0 14px rgba(82, 106, 39, 0.95)) drop-shadow(0 0 32px rgba(51, 64, 28, 0.9)) drop-shadow(0 0 65px rgba(51, 64, 28, 0.6))',
            }}
          >
            VANGUARD
          </h1>
        </div>

        {/* BOTTOM BEVELED TACTICAL FRAME CONTAINER */}
        <div className="relative w-full z-10">
          <div className="relative w-full min-h-[190px] sm:min-h-[220px] md:min-h-[240px] p-6 sm:p-8 flex flex-col justify-between">
            {/* SVG Crisp Chamfered Border & Black Background */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              preserveAspectRatio="none"
              viewBox="0 0 1000 400"
            >
              <path
                d="M 38 0 L 1000 0 L 1000 400 L 0 400 L 0 38 Z"
                fill="#000000"
                stroke="rgba(255, 255, 255, 0.28)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* Top Frame Accents (Marker Pills) */}
            <div className="relative z-10 flex items-center justify-between w-full pt-1">
              {/* Top-Left Accent Pill */}
              <div className="w-8 sm:w-10 h-2 bg-[#526a27] ml-6 sm:ml-8 shadow-[0_0_8px_#33401c]" />
              {/* Right Accent Pill */}
              <div className="w-8 sm:w-10 h-2 bg-[#526a27] mr-56 sm:mr-72 md:mr-88 shadow-[0_0_8px_#33401c]" />
            </div>

            {/* Bottom Content Area (Split Text) */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-4 items-end pb-4 pt-12 sm:pt-14">
              {/* Left Text: "Exploring the Skies & Beyond" */}
              <div className="md:col-span-6 pl-2 sm:pl-8">
                <p className="text-[#a4c639] font-sans font-bold text-sm sm:text-base md:text-lg lg:text-xl leading-tight tracking-tight drop-shadow-[0_0_8px_rgba(51,64,28,0.7)]">
                  Exploring the<br />
                  Skies &amp; Beyond
                </p>
              </div>

              {/* Right Text: "Science, Technology, and the Future of Flight" */}
              <div className="md:col-span-6 pr-44 sm:pr-56 md:pr-68 lg:pr-76">
                <p className="text-[#a4c639] font-sans font-bold text-xs sm:text-sm md:text-base leading-tight tracking-tight drop-shadow-[0_0_8px_rgba(51,64,28,0.7)]">
                  Science, Technology, and<br />
                  the Future of Flight
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM PADDING */}
      <div className="h-2 sm:h-3" />
    </div>
  );
}
