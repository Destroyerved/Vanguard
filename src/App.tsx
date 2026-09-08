import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Radio,
  CloudSun,
  Activity,
  Layers,
  Search,
  Code,
  Clock,
  RefreshCw,
  Zap,
  Globe,
  AlertTriangle,
  FileText,
  Server,
  Play,
  Terminal,
  ChevronRight,
  TrendingUp,
  X
} from 'lucide-react';

import { explainEvent } from './data/eventExplainer';
import { UnifiedEvent } from './types/schema';
import TacticalMap from './components/TacticalMap';

const BACKEND_URL = 'http://localhost:3001/api/v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'events' | 'timeline' | 'sources' | 'api_tester'>('overview');
  const [loading, setLoading] = useState(true);
  const [serverOnline, setServerOnline] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toUTCString());

  // Backend Data State
  const [situation, setSituation] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [sourceHealth, setSourceHealth] = useState<any[]>([]);
  const [selectedRawJson, setSelectedRawJson] = useState<{ title: string; data: any } | null>(null);
  const [selectedEventExplanation, setSelectedEventExplanation] = useState<UnifiedEvent | null>(null);

  // Search & API tester state
  const [searchQuery, setSearchQuery] = useState('');
  const [testEndpoint, setTestEndpoint] = useState('/situation/current');
  const [testResponse, setTestResponse] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Fetch live backend server data from http://localhost:3001/api/v1
  const fetchBackendData = async () => {
    setLoading(true);
    try {
      // 1. Situation Current
      const sitRes = await fetch(`${BACKEND_URL}/situation/current`);
      if (sitRes.ok) {
        const sitData = await sitRes.json();
        setSituation(sitData.situation);
        setSourceHealth(sitData.sources || []);
        setServerOnline(true);
      }

      // 2. Timeline
      const timeRes = await fetch(`${BACKEND_URL}/situation/timeline`);
      if (timeRes.ok) {
        const timeData = await timeRes.json();
        setTimeline(Array.isArray(timeData) ? timeData : (timeData.timeline || []));
      }

      // 3. Events
      const evtRes = await fetch(`${BACKEND_URL}/events`);
      if (evtRes.ok) {
        const evtData = await evtRes.json();
        setEvents(evtData.events || evtData || []);
      }
    } catch (err) {
      console.warn('[Frontend] Server unreachable at localhost:3001, utilizing resilient fallback:', err);
      setServerOnline(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackendData();
    const timer = setInterval(() => setCurrentTime(new Date().toUTCString()), 1000);
    // Polling server state every 5 seconds
    const pollTimer = setInterval(() => fetchBackendData(), 5000);
    return () => {
      clearInterval(timer);
      clearInterval(pollTimer);
    };
  }, []);

  // Run Custom API Test
  const handleRunApiTest = async (ep: string) => {
    setTestLoading(true);
    setTestEndpoint(ep);
    try {
      const res = await fetch(`${BACKEND_URL}${ep}`);
      const data = await res.json();
      setTestResponse(data);
    } catch (e: any) {
      setTestResponse({ error: e.message, hint: 'Ensure server is running on http://localhost:3001' });
    } finally {
      setTestLoading(false);
    }
  };

  const threatColor = situation?.threatLevel === 'red' ? 'rose' :
                      situation?.threatLevel === 'orange' ? 'amber' :
                      situation?.threatLevel === 'yellow' ? 'yellow' : 'emerald';

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
                  <Server className="w-3 h-3 inline mr-1" /> LIVE BACKEND COMMAND CENTER
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-mono font-normal">Express / NestJS Server • Ingestion & Fusion Pipeline • WebSocket Gateway</p>
          </div>
        </div>

        {/* System Status Ticker */}
        <div className="flex items-center gap-4 font-mono text-xs">
          <button
            onClick={fetchBackendData}
            disabled={loading}
            className="flex items-center gap-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>SYNC SERVER</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-md border border-slate-800">
            <span className={`w-2.5 h-2.5 rounded-full ${serverOnline ? 'bg-emerald-500 pulse-green' : 'bg-rose-500'}`}></span>
            <span className="text-slate-300">SERVER:</span>
            <span className={serverOnline ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {serverOnline ? 'localhost:3001 ONLINE' : 'OFFLINE'}
            </span>
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

        {/* OVERVIEW HERO BANNER */}
        <div className="hud-card p-5 rounded-xl border border-cyan-500/30 bg-slate-900/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-xl bg-slate-950 border ${
              threatColor === 'rose' ? 'border-rose-800 text-rose-400' :
              threatColor === 'amber' ? 'border-amber-800 text-amber-400' : 'border-emerald-800 text-emerald-400'
            }`}>
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border uppercase ${
                  threatColor === 'rose' ? 'bg-rose-950 border-rose-800 text-rose-400 pulse-red' :
                  threatColor === 'amber' ? 'bg-amber-950 border-amber-800 text-amber-400' : 'bg-emerald-950 border-emerald-800 text-emerald-400'
                }`}>
                  THREAT LEVEL: {situation?.threatLevel || 'ORANGE'} (SCORE: {situation?.threatScore || 64.47})
                </span>
                <span className="text-xs font-mono text-slate-400">Mean Confidence: {situation?.meanConfidence || 94}%</span>
              </div>
              <h2 className="font-hud font-bold text-xl text-slate-100 mb-1">
                {situation?.headline || 'Multi-Source Fusion Pipeline Active — 3 Critical Events Detected'}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Active Alerts: <span className="text-rose-400 font-bold">{situation?.activeAlertsCount || 5}</span> | Critical: <span className="text-rose-400 font-bold">{situation?.criticalCount || 2}</span> | Total Ingested: <span className="text-cyan-300 font-bold">{situation?.totalEvents || 38}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('api_tester')}
              className="px-4 py-2 bg-cyan-950 border border-cyan-700 hover:bg-cyan-900 text-cyan-300 font-mono text-xs rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-cyan-950/50"
            >
              <Terminal className="w-4 h-4" /> TEST LIVE API ENDPOINTS
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 overflow-x-auto">
          <TabBtn id="overview" label="SITUATION OVERVIEW" icon={<Activity className="w-4 h-4" />} active={activeTab} onClick={setActiveTab} />
          <TabBtn id="map" label={`TACTICAL MAP (${events.length})`} icon={<Globe className="w-4 h-4 text-cyan-400" />} active={activeTab} onClick={setActiveTab} />
          <TabBtn id="events" label={`INGESTED EVENTS (${events.length})`} icon={<Layers className="w-4 h-4" />} active={activeTab} onClick={setActiveTab} />
          <TabBtn id="timeline" label={`THREAT TIMELINE (${Array.isArray(timeline) ? timeline.length : 0})`} icon={<TrendingUp className="w-4 h-4" />} active={activeTab} onClick={setActiveTab} />
          <TabBtn id="sources" label={`SOURCE HEALTH (${sourceHealth.length})`} icon={<Radio className="w-4 h-4" />} active={activeTab} onClick={setActiveTab} />
          <TabBtn id="api_tester" label="LIVE API TESTER" icon={<Terminal className="w-4 h-4" />} active={activeTab} onClick={setActiveTab} />
        </div>

        {/* TAB 2: TACTICAL GEOSPATIAL MAP */}
        {activeTab === 'map' && (
          <TacticalMap events={events} onSelectEvent={setSelectedEventExplanation} />
        )}

        {/* TAB 1: SITUATION OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sourceHealth.map((src, idx) => (
              <div key={idx} className="hud-card p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 uppercase">
                      {src.sourceType} STREAM
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> {src.status?.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="font-hud font-bold text-base text-slate-100 mb-1">{src.sourceName}</h3>
                  <p className="text-xs text-slate-400 font-mono mb-3">Last Ingestion: {new Date(src.lastUpdate).toLocaleTimeString()}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px]">RELIABILITY WEIGHT</span>
                      <span className="text-cyan-300 font-bold">{Math.round(src.reliabilityScore * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">ACTIVE INGESTED</span>
                      <span className="text-slate-200 font-bold">{src.activeCount} contacts</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Latency: {src.meanLatencyMs || 0}ms</span>
                  <button
                    onClick={() => setSelectedRawJson({ title: `Source Stream — ${src.sourceName}`, data: src })}
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <Code className="w-3.5 h-3.5" /> RAW JSON
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: INGESTED EVENTS */}
        {activeTab === 'events' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((evt, idx) => (
              <div key={idx} className={`hud-card p-4 rounded-xl border-l-4 ${
                evt.severity === 'critical' ? 'border-l-rose-500' :
                evt.severity === 'high' ? 'border-l-amber-500' : 'border-l-cyan-500'
              } flex flex-col justify-between`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                      evt.severity === 'critical' ? 'bg-rose-950 border-rose-800 text-rose-400' : 'bg-cyan-950 border-cyan-800 text-cyan-400'
                    }`}>
                      {evt.sourceType} • {evt.severity}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{evt.id}</span>
                  </div>

                  <h3 className="font-hud font-bold text-base text-slate-100 mb-1">{evt.title}</h3>
                  <p className="text-xs text-slate-300 font-mono mb-3 leading-relaxed">{evt.description}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px]">LOCATION</span>
                      <span className="text-slate-200 font-bold">{evt.location?.lat}, {evt.location?.lng}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">CONFIDENCE</span>
                      <span className="text-emerald-400 font-bold">{evt.confidence}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">CORROBORATIONS</span>
                      <span className="text-cyan-300 font-bold">{evt.corroboratedBy?.length || 0} sources</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">ANOMALY</span>
                      <span className={evt.isAnomaly ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                        {evt.isAnomaly ? 'ANOMALY DETECTED' : 'NORMAL'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedEventExplanation(evt)}
                      className="text-amber-400 hover:text-amber-300 font-bold hover:underline flex items-center gap-1 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80 text-[11px]"
                    >
                      <FileText className="w-3 h-3" /> EXPLAIN
                    </button>
                    <button
                      onClick={() => setSelectedRawJson({ title: `Event Payload — ${evt.title}`, data: evt })}
                      className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <Code className="w-3 h-3" /> RAW JSON
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: THREAT TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="hud-card p-6 rounded-xl border border-slate-800 bg-slate-900/60">
            <h3 className="font-hud font-bold text-lg text-slate-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" /> THREAT LEVEL ESCALATION AUDIT TIMELINE
            </h3>

            <div className="space-y-4 font-mono">
              {Array.isArray(timeline) && timeline.length > 0 ? (
                timeline.map((item, idx) => (
                  <div key={idx} className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-950 border border-amber-800 text-amber-400 text-xs font-bold uppercase min-w-[120px] text-center">
                        {(item.from || 'GREEN')} ➔ {(item.to || item.threatLevel || 'YELLOW')}
                      </div>
                      <div>
                        <h4 className="font-hud font-bold text-sm text-slate-200 mb-1">{item.reason || item.headline || 'Escalation Record'}</h4>
                        <p className="text-xs text-slate-400">
                          Trigger Events: {Array.isArray(item.triggerEventIds) ? item.triggerEventIds.join(', ') : (item.triggerEventIds || item.triggerEventId || 'N/A')}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 text-right min-w-[140px]">
                      <div>Score: <span className="text-amber-300 font-bold">{item.score ?? item.threatScore ?? 'N/A'}</span></div>
                      <div>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'N/A'}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-500 font-mono">
                  <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                  No threat level escalations recorded yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SOURCE HEALTH */}
        {activeTab === 'sources' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
            {sourceHealth.map((src, idx) => (
              <div key={idx} className="hud-card p-5 rounded-xl border border-slate-800 bg-slate-900/80">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-cyan-400 uppercase">{src.sourceType}</span>
                  <span className="text-xs text-emerald-400 font-bold">{src.status?.toUpperCase()}</span>
                </div>
                <h3 className="font-hud font-bold text-base text-slate-100 mb-2">{src.sourceName}</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-slate-500">Reliability Score:</span>
                    <span className="text-cyan-300 font-bold">{Math.round(src.reliabilityScore * 100)}%</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-slate-500">Active Contacts:</span>
                    <span className="text-slate-200 font-bold">{src.activeCount}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-slate-500">Total Ingested:</span>
                    <span className="text-slate-200 font-bold">{src.totalIngested || src.activeCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 5: LIVE API TESTER */}
        {activeTab === 'api_tester' && (
          <div className="hud-card p-6 rounded-xl border border-cyan-500/30 bg-slate-900/80 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h3 className="font-hud font-bold text-lg text-slate-100">LIVE BACKEND REST API TESTER</h3>
            </div>
            <p className="text-xs font-mono text-slate-400">Select any REST endpoint below to fetch real-time payloads from http://localhost:3001/api/v1</p>

            <div className="flex flex-wrap gap-2">
              <ApiBtn path="/situation/current" label="GET /situation/current" onClick={handleRunApiTest} active={testEndpoint === '/situation/current'} />
              <ApiBtn path="/situation/timeline" label="GET /situation/timeline" onClick={handleRunApiTest} active={testEndpoint === '/situation/timeline'} />
              <ApiBtn path="/events" label="GET /events" onClick={handleRunApiTest} active={testEndpoint === '/events'} />
              <ApiBtn path="/map/alerts" label="GET /map/alerts" onClick={handleRunApiTest} active={testEndpoint === '/map/alerts'} />
              <ApiBtn path="/map/assets" label="GET /map/assets" onClick={handleRunApiTest} active={testEndpoint === '/map/assets'} />
              <ApiBtn path="/intelligence/source-health" label="GET /intelligence/source-health" onClick={handleRunApiTest} active={testEndpoint === '/intelligence/source-health'} />
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-mono text-slate-400 mb-3">
                <span>REQUEST: <span className="text-cyan-400">GET {BACKEND_URL}{testEndpoint}</span></span>
                {testLoading && <span className="text-cyan-400 animate-pulse">FETCHING...</span>}
              </div>

              <pre className="text-xs font-mono text-cyan-300 leading-relaxed overflow-x-auto max-h-[400px]">
                {testResponse ? JSON.stringify(testResponse, null, 2) : '// Click an API endpoint button above to run request'}
              </pre>
            </div>
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
              <button onClick={() => setSelectedRawJson(null)} className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
              <pre className="text-xs font-mono text-cyan-300 leading-relaxed overflow-x-auto">
                {JSON.stringify(selectedRawJson.data, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setSelectedRawJson(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 rounded-lg transition-colors">
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED EVENT EXPLANATION MODAL */}
      {selectedEventExplanation && (() => {
        const explanation = explainEvent(selectedEventExplanation);
        const evt = selectedEventExplanation;
        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] font-mono">
              
              {/* MODAL HEADER */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                      evt.severity === 'critical' ? 'bg-rose-950 border-rose-800 text-rose-400' :
                      evt.severity === 'high' ? 'bg-amber-950 border-amber-800 text-amber-400' : 'bg-cyan-950 border-cyan-800 text-cyan-400'
                    }`}>
                      {evt.sourceType} • {evt.severity}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">{evt.id}</span>
                    {evt.isAnomaly && (
                      <span className="text-[10px] bg-rose-950 border border-rose-700 text-rose-300 font-bold px-2 py-0.5 rounded animate-pulse">
                        ANOMALY
                      </span>
                    )}
                  </div>
                  <h3 className="font-hud font-bold text-xl text-slate-100">{evt.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedEventExplanation(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* MODAL BODY */}
              <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
                {/* 1. Executive Overview */}
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> Tactical Event Overview
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed">{explanation.summary}</p>
                </div>

                {/* 2. Tactical Impact & Operational Risk */}
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-amber-900/40">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Operational Assessment & Impact
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{explanation.tacticalImpact}</p>
                </div>

                {/* 3. Verification & Sensor Agreement */}
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4" /> Fusion Confidence & Sensor Corroboration
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{explanation.verificationAnalysis}</p>

                  {/* Confidence breakdown progress bars */}
                  {evt.confidenceBreakdown && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-900 text-[11px]">
                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Source Agreement</span>
                          <span className="text-cyan-300 font-bold">{evt.confidenceBreakdown.sourceAgreement}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${evt.confidenceBreakdown.sourceAgreement}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Spatial Agreement</span>
                          <span className="text-cyan-300 font-bold">{evt.confidenceBreakdown.spatialAgreement}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${evt.confidenceBreakdown.spatialAgreement}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Temporal Agreement</span>
                          <span className="text-cyan-300 font-bold">{evt.confidenceBreakdown.temporalAgreement}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${evt.confidenceBreakdown.temporalAgreement}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Data Freshness</span>
                          <span className="text-cyan-300 font-bold">{evt.confidenceBreakdown.dataFreshness}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${evt.confidenceBreakdown.dataFreshness}%` }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Kinematics & Geo Telemetry */}
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-cyan-400" /> Sensor Kinematics & Coordinates
                  </h4>
                  <p className="text-xs text-slate-300 font-mono">{explanation.telemetryBreakdown}</p>
                </div>

                {/* 5. Recommended Action Protocol */}
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-rose-900/50">
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" /> Recommended Defense Protocol
                  </h4>
                  <p className="text-xs text-slate-200 font-bold leading-relaxed">{explanation.recommendedAction}</p>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="flex flex-wrap items-center justify-between border-t border-slate-800 pt-4 text-xs gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const payload = evt;
                      setSelectedEventExplanation(null);
                      setSelectedRawJson({ title: `Event Payload — ${payload.title}`, data: payload });
                    }}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-cyan-700 text-cyan-400 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Code className="w-4 h-4" /> Inspect Raw Payload JSON
                  </button>

                  <a
                    href={`https://www.openstreetmap.org/?mlat=${evt.location?.lat}&mlon=${evt.location?.lng}#map=13/${evt.location?.lat}/${evt.location?.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-cyan-500 text-cyan-300 rounded-lg flex items-center gap-1.5 transition-colors font-bold"
                  >
                    <Globe className="w-4 h-4 text-cyan-400" /> Open Coordinates in OpenStreetMap
                  </a>
                </div>

                <button
                  onClick={() => setSelectedEventExplanation(null)}
                  className="px-4 py-1.5 bg-cyan-950 border border-cyan-700 hover:bg-cyan-900 text-cyan-300 font-bold rounded-lg transition-colors"
                >
                  Close Explanation
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}

function ApiBtn({ path, label, onClick, active }: { path: string; label: string; onClick: (path: string) => void; active: boolean }) {
  return (
    <button
      onClick={() => onClick(path)}
      className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1 border transition-all ${
        active ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
      }`}
    >
      <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
      <span>{label}</span>
    </button>
  );
}

function TabBtn({ id, label, icon, active, onClick }: { id: any; label: string; icon: React.ReactNode; active: any; onClick: (id: any) => void }) {
  const isSelected = active === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-all ${
        isSelected ? 'bg-cyan-950 border border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-500/20 font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
