import React, { useState, useEffect } from 'react';
import { fetchAllVanguardStreams, VanguardUnifiedStreams } from './data/dataAdapter';
import { getScenarioDataset, DemoScenarioMode } from './data/scenarioEngine';
import { stepKinematicSimulation } from './data/streamEmitter';
import { UnifiedEvent } from './types/schema';

import {
  CloudSun,
  Radio,
  ShieldAlert,
  FileText,
  Search,
  Code,
  Layers,
  Database,
  Clock,
  X,
  RefreshCw,
  Zap,
  Globe,
  HardDrive,
  Play,
  Pause,
  Sliders,
  ShieldCheck,
  AlertOctagon,
  CloudLightning
} from 'lucide-react';

export type DatasetCategory = 'all' | 'weather' | 'radar' | 'seismic' | 'cisa' | 'gdacs' | 'scenarios';

export default function App() {
  const [activeTab, setActiveTab] = useState<DatasetCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRawJson, setSelectedRawJson] = useState<{ title: string; data: any } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toUTCString());

  // Unified Streams State
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState<VanguardUnifiedStreams | null>(null);

  // Demo Scenario State
  const [selectedScenario, setSelectedScenario] = useState<DemoScenarioMode>('COORDINATED_ATTACK');
  const [scenarioData, setScenarioData] = useState(() => getScenarioDataset('COORDINATED_ATTACK'));
  const [isKinematicMoving, setIsKinematicMoving] = useState(true);

  // Load streams using universal adapter
  const loadStreams = async () => {
    setLoading(true);
    try {
      const res = await fetchAllVanguardStreams();
      setStreams(res);
    } catch (e) {
      console.error('Failed to load streams:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStreams();
    const timer = setInterval(() => setCurrentTime(new Date().toUTCString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1-second Kinematic Movement Loop for active scenario
  useEffect(() => {
    if (!isKinematicMoving) return;
    const interval = setInterval(() => {
      setScenarioData(prev => ({
        ...prev,
        events: stepKinematicSimulation(prev.events, 1)
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [isKinematicMoving]);

  const handleScenarioChange = (mode: DemoScenarioMode) => {
    setSelectedScenario(mode);
    setScenarioData(getScenarioDataset(mode));
  };

  // Counts
  const weatherCount = streams?.weather?.data ? 1 : 0;
  const flightCount = streams?.flights?.data?.length || 0;
  const seismicCount = streams?.seismic?.data?.length || 0;
  const cisaCount = streams?.cisaThreats?.data?.length || 0;
  const gdacsCount = streams?.gdacsAlerts?.data?.length || 0;
  const scenarioEventsCount = scenarioData.events.length;
  const grandTotal = weatherCount + flightCount + seismicCount + cisaCount + gdacsCount + scenarioEventsCount;

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 font-sans flex flex-col">
      {/* 1. TOP COMMAND BAR */}
      <header className="border-b border-slate-800/80 bg-[#0b0f19]/90 backdrop-blur sticky top-0 z-40 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-hud font-bold">
            <span className="relative z-10 text-lg">V</span>
            <div className="absolute inset-0 radar-sweep opacity-40"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-hud font-bold text-lg tracking-wider text-slate-100">
                VANGUARD <span className="text-xs text-cyan-400 font-mono tracking-normal bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800 flex-inline items-center gap-1">
                  <Globe className="w-3 h-3 inline mr-1" /> UNIFIED DATA ADAPTER
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-mono">100% Real Live APIs + Resilient Hardcoded Fallback & Scenario Engine</p>
          </div>
        </div>

        {/* System Status & Actions */}
        <div className="flex items-center gap-4 font-mono text-xs">
          <button
            onClick={loadStreams}
            disabled={loading}
            className="flex items-center gap-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'SYNCING DATA...' : 'REFRESH ALL STREAMS'}</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-md border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-green"></span>
            <span className="text-slate-300">SYNC TIME:</span>
            <span className="text-emerald-400 font-bold">{streams?.fetchedAt || 'CONNECTING...'}</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-md border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300">UTC:</span>
            <span className="text-cyan-300">{currentTime}</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">

        {/* DEMO SCENARIO INJECTOR PANEL */}
        <div className="hud-card p-4 rounded-xl border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-hud font-bold text-base text-slate-100">1-CLICK JUDGING DEMO SCENARIOS</span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                  scenarioData.threatLevel === 'red' ? 'bg-rose-950 border-rose-800 text-rose-400 pulse-red' :
                  scenarioData.threatLevel === 'orange' ? 'bg-amber-950 border-amber-800 text-amber-400' :
                  'bg-emerald-950 border-emerald-800 text-emerald-400'
                }`}>
                  THREAT LEVEL: {scenarioData.threatLevel}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">{scenarioData.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleScenarioChange('NORMAL_OPS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 border transition-all ${
                selectedScenario === 'NORMAL_OPS'
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Peacetime Patrol</span>
            </button>

            <button
              onClick={() => handleScenarioChange('SEVERE_WEATHER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 border transition-all ${
                selectedScenario === 'SEVERE_WEATHER'
                  ? 'bg-amber-950 border-amber-500 text-amber-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <CloudLightning className="w-3.5 h-3.5 text-amber-400" />
              <span>Storm Front</span>
            </button>

            <button
              onClick={() => handleScenarioChange('COORDINATED_ATTACK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 border transition-all ${
                selectedScenario === 'COORDINATED_ATTACK'
                  ? 'bg-rose-950 border-rose-500 text-rose-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              <span>Border Breach</span>
            </button>

            <button
              onClick={() => setIsKinematicMoving(!isKinematicMoving)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 border transition-all ${
                isKinematicMoving ? 'bg-cyan-950 border-cyan-600 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              {isKinematicMoving ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{isKinematicMoving ? 'LIVE TICKING' : 'PAUSED'}</span>
            </button>
          </div>
        </div>

        {/* STATS OVERVIEW BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatBox title="TOTAL TELEMETRY" value={grandTotal} icon={<Database className="w-4 h-4 text-cyan-400" />} color="cyan" />
          <StatBox title="WEATHER OBS" value={weatherCount} icon={<CloudSun className="w-4 h-4 text-amber-400" />} color="amber" />
          <StatBox title="FLIGHT TRACKS" value={flightCount} icon={<Radio className="w-4 h-4 text-blue-400" />} color="blue" />
          <StatBox title="SEISMIC EVENTS" value={seismicCount} icon={<Zap className="w-4 h-4 text-rose-400" />} color="rose" />
          <StatBox title="CYBER THREATS" value={cisaCount} icon={<ShieldAlert className="w-4 h-4 text-purple-400" />} color="purple" />
          <StatBox title="DEMO SCENARIOS" value={scenarioEventsCount} icon={<Sliders className="w-4 h-4 text-emerald-400" />} color="emerald" />
        </div>

        {/* CONTROLS: TABS + SEARCH */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <TabBtn id="all" label="ALL UNIFIED STREAMS" count={grandTotal} icon={<Layers className="w-3.5 h-3.5" />} active={activeTab} onClick={setActiveTab} />
            <TabBtn id="scenarios" label="Active Scenario Events" count={scenarioEventsCount} icon={<Sliders className="w-3.5 h-3.5" />} active={activeTab} onClick={setActiveTab} />
            <TabBtn id="weather" label="Weather" count={weatherCount} icon={<CloudSun className="w-3.5 h-3.5" />} active={activeTab} onClick={setActiveTab} />
            <TabBtn id="radar" label="Flight Radar" count={flightCount} icon={<Radio className="w-3.5 h-3.5" />} active={activeTab} onClick={setActiveTab} />
            <TabBtn id="seismic" label="Seismic" count={seismicCount} icon={<Zap className="w-3.5 h-3.5" />} active={activeTab} onClick={setActiveTab} />
            <TabBtn id="cisa" label="Cyber Threats" count={cisaCount} icon={<ShieldAlert className="w-3.5 h-3.5" />} active={activeTab} onClick={setActiveTab} />
            <TabBtn id="gdacs" label="Disasters" count={gdacsCount} icon={<FileText className="w-3.5 h-3.5" />} active={activeTab} onClick={setActiveTab} />
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search streams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* LOADING INDICATOR */}
        {loading && (
          <div className="p-12 text-center text-slate-400 font-mono flex flex-col items-center justify-center gap-3 bg-slate-900/40 rounded-xl border border-slate-800">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-sm">Fetching streams via Vanguard Unified Data Adapter...</p>
          </div>
        )}

        {/* DATASETS GRID DISPLAY */}
        {!loading && streams && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* 0. ACTIVE SCENARIO EVENTS (LIVE MOVING KINEMATIC TRACKS) */}
            {(activeTab === 'all' || activeTab === 'scenarios') &&
              scenarioData.events.filter(e => matchesSearch(e, searchQuery)).map((evt, idx) => (
                <div key={`scen-evt-${idx}`} className={`hud-card rounded-xl p-4 border-l-4 ${evt.severity === 'critical' ? 'border-l-rose-500' : evt.severity === 'high' ? 'border-l-amber-500' : 'border-l-cyan-500'} flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-mono tracking-widest px-2 py-0.5 rounded border font-bold uppercase flex items-center gap-1 ${
                        evt.severity === 'critical' ? 'bg-rose-950 border-rose-800 text-rose-400' : 'bg-cyan-950 border-cyan-800 text-cyan-400'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span> DEMO SCENARIO • {evt.sourceType.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{evt.id}</span>
                    </div>

                    <h3 className="font-hud font-bold text-base text-slate-100 mb-1">{evt.title}</h3>
                    <p className="text-xs text-slate-300 font-mono mb-3 leading-relaxed">{evt.description}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-slate-500 block text-[10px]">LIVE LAT / LNG</span>
                        <span className="text-cyan-300 font-bold">{evt.location.lat}, {evt.location.lng}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">ALTITUDE / HEADING</span>
                        <span className="text-slate-200 font-bold">{evt.location.altitudeMeters || 0}m @ {evt.location.headingDegrees || 0}°</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">CONFIDENCE MATH</span>
                        <span className="text-emerald-400 font-bold">{evt.confidence}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">ANOMALY FLAG</span>
                        <span className={evt.isAnomaly ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          {evt.isAnomaly ? 'ANOMALY DETECTED' : 'NORMAL'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500">Mode: {scenarioData.name}</span>
                    <button
                      onClick={() => setSelectedRawJson({ title: `Scenario Event — ${evt.title}`, data: evt })}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 hover:underline"
                    >
                      <Code className="w-3.5 h-3.5" /> RAW JSON
                    </button>
                  </div>
                </div>
              ))}

            {/* 1. WEATHER */}
            {(activeTab === 'all' || activeTab === 'weather') && streams.weather?.data && (
              <div className="hud-card rounded-xl p-4 border-l-4 border-l-amber-500 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <StatusBadge isLive={streams.weather.isLive} name={streams.weather.sourceName} color="amber" />
                    <span className="text-xs font-mono text-slate-400">{streams.weather.data.current?.time}</span>
                  </div>

                  <h3 className="font-hud font-bold text-base text-slate-100 mb-1">Sector Weather Station</h3>
                  <p className="text-xs text-slate-400 font-mono mb-3">
                    Lat: {streams.weather.data.latitude}, Lng: {streams.weather.data.longitude} | Elev: {streams.weather.data.elevation}m
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px]">TEMP</span>
                      <span className="text-slate-200 font-bold">{streams.weather.data.current?.temperature_2m} °C</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">WIND VECTOR</span>
                      <span className="text-slate-200 font-bold">{streams.weather.data.current?.wind_speed_10m} km/h @ {streams.weather.data.current?.wind_direction_10m}°</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">PRECIPITATION</span>
                      <span className="text-slate-200 font-bold">{streams.weather.data.current?.precipitation} mm</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">SURFACE PRESSURE</span>
                      <span className="text-slate-200 font-bold">{streams.weather.data.current?.surface_pressure} hPa</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500">{streams.weather.sourceName}</span>
                  <button
                    onClick={() => setSelectedRawJson({ title: `Weather — ${streams.weather.sourceName}`, data: streams.weather.data })}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 hover:underline"
                  >
                    <Code className="w-3.5 h-3.5" /> RAW JSON
                  </button>
                </div>
              </div>
            )}

            {/* 2. FLIGHT RADAR */}
            {(activeTab === 'all' || activeTab === 'radar') &&
              streams.flights?.data?.filter(st => matchesSearch(st, searchQuery)).map((st, idx) => {
                const icao = st[0];
                const callsign = st[1]?.trim() || 'UNKN';
                const country = st[2];
                const lng = st[5];
                const lat = st[6];
                const alt = st[7];
                const speed = st[9];
                const track = st[10];
                const squawk = st[14];

                return (
                  <div key={`radar-${idx}`} className="hud-card rounded-xl p-4 border-l-4 border-l-cyan-500 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <StatusBadge isLive={streams.flights.isLive} name={squawk ? `ADS-B • SQUAWK ${squawk}` : 'ADS-B RADAR'} color="cyan" />
                        <span className="text-xs font-mono text-slate-400">ICAO: {icao}</span>
                      </div>

                      <h3 className="font-hud font-bold text-base text-slate-100 mb-1 flex items-center justify-between">
                        <span>{callsign}</span>
                        <span className="text-xs font-mono font-normal text-slate-400">[{country}]</span>
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mb-3">
                        Lat: {lat}, Lng: {lng}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                        <div>
                          <span className="text-slate-500 block text-[10px]">ALTITUDE</span>
                          <span className="text-slate-200 font-bold">{alt ? `${alt} m` : 'Surface'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">VELOCITY</span>
                          <span className="text-slate-200 font-bold">{speed ? `${Math.round(speed * 1.94384)} kts` : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">TRUE TRACK</span>
                          <span className="text-slate-200 font-bold">{track ? `${track}°` : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">STATUS</span>
                          <span className={streams.flights.isLive ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                            {streams.flights.isLive ? 'LIVE RADAR' : 'HARDCODED FALLBACK'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500">{streams.flights.sourceName}</span>
                      <button
                        onClick={() => setSelectedRawJson({ title: `Flight Radar Track — ${callsign}`, data: st })}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 hover:underline"
                      >
                        <Code className="w-3.5 h-3.5" /> RAW JSON
                      </button>
                    </div>
                  </div>
                );
              })}

            {/* 3. SEISMIC HAZARDS */}
            {(activeTab === 'all' || activeTab === 'seismic') &&
              streams.seismic?.data?.filter(eq => matchesSearch(eq, searchQuery)).map((eq, idx) => {
                const props = eq.properties;
                const geom = eq.geometry;
                const mag = props?.mag || 0;

                return (
                  <div key={`seis-${idx}`} className={`hud-card rounded-xl p-4 border-l-4 ${mag >= 4.0 ? 'border-l-rose-500' : 'border-l-amber-500'} flex flex-col justify-between`}>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <StatusBadge isLive={streams.seismic.isLive} name={`USGS SEISMIC • MAG ${mag}`} color={mag >= 4.0 ? 'rose' : 'amber'} />
                        <span className="text-xs font-mono text-slate-400">{new Date(props.time).toLocaleTimeString()}</span>
                      </div>

                      <h3 className="font-hud font-bold text-base text-slate-100 mb-1">{props.title}</h3>
                      <p className="text-xs text-slate-400 font-mono mb-3">
                        Place: <span className="text-slate-200">{props.place}</span>
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                        <div>
                          <span className="text-slate-500 block text-[10px]">LAT / LNG</span>
                          <span className="text-slate-200 font-bold">{geom?.coordinates[1]?.toFixed(2)}, {geom?.coordinates[0]?.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">DEPTH</span>
                          <span className="text-slate-200 font-bold">{geom?.coordinates[2]} km</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 block text-[10px]">ALERT LEVEL</span>
                          <span className={props.alert === 'yellow' || mag >= 4.0 ? 'text-rose-400 font-bold uppercase' : 'text-emerald-400 font-bold uppercase'}>
                            {props.alert || 'STANDARD TELEMETRY'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500">{streams.seismic.sourceName}</span>
                      <button
                        onClick={() => setSelectedRawJson({ title: `USGS Seismic Event — ${props.title}`, data: eq })}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 hover:underline"
                      >
                        <Code className="w-3.5 h-3.5" /> RAW JSON
                      </button>
                    </div>
                  </div>
                );
              })}

            {/* 4. CISA CYBER THREATS */}
            {(activeTab === 'all' || activeTab === 'cisa') &&
              streams.cisaThreats?.data?.filter(t => matchesSearch(t, searchQuery)).map((thr, idx) => (
                <div key={`cisa-${idx}`} className="hud-card rounded-xl p-4 border-l-4 border-l-purple-500 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <StatusBadge isLive={streams.cisaThreats.isLive} name="CISA THREAT ADVISORY" color="purple" />
                      <span className="text-xs font-mono text-purple-300 font-bold">{thr.cveID}</span>
                    </div>

                    <h3 className="font-hud font-bold text-base text-slate-100 mb-1">{thr.vulnerabilityName}</h3>
                    <p className="text-xs text-slate-400 font-mono mb-3">
                      Vendor: <span className="text-slate-200">{thr.vendorProject}</span> ({thr.product})
                    </p>

                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed">
                      <div className="text-[10px] text-slate-500 uppercase mb-1">THREAT ACTION REQUIRED</div>
                      <div className="line-clamp-3 text-slate-300">{thr.shortDescription}</div>
                      <div className="text-rose-400 mt-2 font-bold">DueDate: {thr.dueDate}</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500">{streams.cisaThreats.sourceName}</span>
                    <button
                      onClick={() => setSelectedRawJson({ title: `CISA Security Advisory — ${thr.cveID}`, data: thr })}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 hover:underline"
                    >
                      <Code className="w-3.5 h-3.5" /> RAW JSON
                    </button>
                  </div>
                </div>
              ))}

            {/* 5. GDACS DISASTER ALERTS */}
            {(activeTab === 'all' || activeTab === 'gdacs') &&
              streams.gdacsAlerts?.data?.filter(g => matchesSearch(g, searchQuery)).map((gd, idx) => (
                <div key={`gdacs-${idx}`} className="hud-card rounded-xl p-4 border-l-4 border-l-emerald-500 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <StatusBadge isLive={streams.gdacsAlerts.isLive} name="GDACS DISASTER ALERT" color="emerald" />
                      <span className="text-xs font-mono text-slate-400">{gd.pubDate ? new Date(gd.pubDate).toLocaleTimeString() : 'RECENT'}</span>
                    </div>

                    <h3 className="font-hud font-bold text-base text-slate-100 mb-1">{gd.title}</h3>
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed mb-3">
                      <div className="line-clamp-3" dangerouslySetInnerHTML={{ __html: gd.description || 'Global emergency alert dispatch.' }} />
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500">{streams.gdacsAlerts.sourceName}</span>
                    <button
                      onClick={() => setSelectedRawJson({ title: `GDACS Alert — ${gd.title}`, data: gd })}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 hover:underline"
                    >
                      <Code className="w-3.5 h-3.5" /> RAW JSON
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>

      {/* RAW JSON INSPECTOR MODAL */}
      {selectedRawJson && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-cyan-500/40 rounded-xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-cyan-400" />
                <h3 className="font-hud font-bold text-lg text-slate-100">{selectedRawJson.title}</h3>
              </div>
              <button
                onClick={() => setSelectedRawJson(null)}
                className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
              <pre className="text-xs font-mono text-cyan-300 leading-relaxed overflow-x-auto">
                {JSON.stringify(selectedRawJson.data, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedRawJson(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 rounded-lg transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ isLive, name, color }: { isLive: boolean; name: string; color: string }) {
  if (isLive) {
    return (
      <span className="text-[10px] font-mono tracking-widest text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-700/80 font-bold uppercase flex items-center gap-1.5">
        <Globe className="w-3 h-3 text-emerald-400 animate-pulse" /> 100% REAL LIVE API
      </span>
    );
  }
  return (
    <span className="text-[10px] font-mono tracking-widest text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-700/80 font-bold uppercase flex items-center gap-1.5">
      <HardDrive className="w-3 h-3 text-amber-400" /> HARDCODED FALLBACK
    </span>
  );
}

function StatBox({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
      <div>
        <span className="text-[10px] font-mono text-slate-500 block tracking-wider">{title}</span>
        <span className="text-lg font-hud font-bold text-slate-100">{value}</span>
      </div>
      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
        {icon}
      </div>
    </div>
  );
}

function TabBtn({ id, label, count, icon, active, onClick }: { id: DatasetCategory; label: string; count: number; icon: React.ReactNode; active: DatasetCategory; onClick: (id: DatasetCategory) => void }) {
  const isSelected = active === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
        isSelected
          ? 'bg-cyan-950 border border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-500/20'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
      }`}
    >
      {icon}
      <span>{label}</span>
      <span className={`px-1.5 py-0.2 text-[10px] rounded ${isSelected ? 'bg-cyan-800/60 text-cyan-200' : 'bg-slate-800 text-slate-400'}`}>
        {count}
      </span>
    </button>
  );
}

function matchesSearch(obj: any, query: string): boolean {
  if (!query) return true;
  return JSON.stringify(obj).toLowerCase().includes(query.toLowerCase());
}
