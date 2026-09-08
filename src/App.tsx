import React, { useState, useEffect, useCallback } from 'react';
import { UnifiedEvent, AISummary, CorrelationCluster, BriefingLatestResponse } from './types/schema';
import { getScenarioDataset, DemoScenarioMode } from './data/scenarioEngine';
import {
  getSituation,
  getTimeline,
  getEvents,
  getClusters,
  getBriefingLatest,
  postBriefing,
  postQuery,
  postDegraded,
} from './data/apiClient';
import { LiveStreamClient } from './data/wsClient';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import OperatorAuthModal from './components/auth/OperatorAuthModal';

// Components
import TopTacticalHeader, { NavSection } from './components/command/TopTacticalHeader';
import CommandPalette from './components/command/CommandPalette';
import NlQueryBar from './components/command/NlQueryBar';
import OverviewCanvas from './components/views/OverviewCanvas';
import SignalHorizonStream from './components/intelligence/SignalHorizonStream';
import TemporalIntelligenceTimeline from './components/timeline/TemporalIntelligenceTimeline';
import VerifiedNewsHub from './components/VerifiedNewsHub';
import OsintAuthenticityVerifier from './components/OsintAuthenticityVerifier';
import SourceTopologyMatrix from './components/sources/SourceTopologyMatrix';
import ScenarioSimulationController from './components/system/ScenarioSimulationController';
import ApiConsoleDiagnostics from './components/system/ApiConsoleDiagnostics';
import EventInvestigationDrawer from './components/intelligence/EventInvestigationDrawer';
import EventReconMedia from './components/EventReconMedia';
import VanguardLandingPage from './components/landing/VanguardLandingPage';

function AppContent() {
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<'landing' | 'console'>('landing');
  const [activeTab, setActiveTab] = useState<NavSection>('overview');
  const [loading, setLoading] = useState(true);
  const [serverOnline, setServerOnline] = useState(false);
  const [wsLive, setWsLive] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toUTCString());
  const [refreshing, setRefreshing] = useState(false);

  // Core Data States
  const [situation, setSituation] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [sourcesHealth, setSourcesHealth] = useState<any[]>([]);
  const [clusters, setClusters] = useState<CorrelationCluster[]>([]);
  const [briefing, setBriefing] = useState<AISummary | null>(null);
  const [briefingMeta, setBriefingMeta] = useState<Pick<BriefingLatestResponse, 'ageMs' | 'generating' | 'groundingVerified'>>({
    ageMs: 0,
    generating: false,
    groundingVerified: false,
  });
  const [selectedEvent, setSelectedEvent] = useState<UnifiedEvent | null>(null);
  const [easyMode, setEasyMode] = useState<boolean>(true);
  const [activeScenario, setActiveScenario] = useState<DemoScenarioMode | null>(null);
  const [isDegradedComms, setIsDegradedComms] = useState<boolean>(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Natural-language omnibar filter (POST /ai/query)
  const [nlQuery, setNlQuery] = useState<string>('');
  const [nlResult, setNlResult] = useState<{ interpretation: string; parser: string; latencyMs: number; matchedEventIds: string[] } | null>(null);

  // Fetch live backend data from the fusion REST server
  const fetchBackendData = useCallback(async (isManualSync = false) => {
    if (isManualSync) {
      setRefreshing(true);
      setActiveScenario(null);
    }
    if (events.length === 0 || isManualSync) {
      setLoading(true);
    }
    try {
      // 1. Situation Current
      const sitRes = await getSituation();
      setServerOnline(true);
      if (!activeScenario || isManualSync) {
        setSituation(sitRes.situation);
        setSourcesHealth(sitRes.sources);
      }

      // 2. Timeline (escalation audit log)
      const timeRes = await getTimeline();
      setTimeline(Array.isArray(timeRes) ? timeRes : timeRes.timeline || []);

      // 3. Events (active in-memory events, capped)
      const evtRes = await getEvents();
      if (!activeScenario || isManualSync) {
        setEvents(evtRes.events || []);
      }

      // 4. Correlation clusters (map clustering + topology)
      const cluRes = await getClusters();
      setClusters((cluRes.clusters ?? []).map(({ events: _e, ...cluster }) => cluster));

      // 5. Cached AI briefing (never blocks).
      await refreshBriefing();
    } catch (err) {
      console.warn('[Frontend] Backend unreachable at localhost:3001, utilizing resilient fallback:', err);
      setServerOnline(false);
    } finally {
      setLoading(false);
      if (isManualSync) setRefreshing(false);
    }
  }, [events.length, activeScenario]);

  const refreshBriefing = useCallback(async () => {
    try {
      const brief = await getBriefingLatest();
      setBriefingMeta({
        ageMs: brief.ageMs,
        generating: brief.generating,
        groundingVerified: brief.groundingVerified,
      });
      if (brief.summary) {
        setBriefing(brief.summary);
      } else if (!brief.generating) {
        // No briefing cached yet and none generating — trigger the first synthesis.
        const forced = await postBriefing();
        setBriefing(forced.summary);
        setBriefingMeta((m) => ({ ...m, groundingVerified: forced.groundingVerified }));
      }
    } catch {
      // Backend down — briefing stays at its last value (or null on first load).
    }
  }, []);

  // Polling + clock
  useEffect(() => {
    fetchBackendData();
    const clockTimer = setInterval(() => setCurrentTime(new Date().toUTCString()), 1000);
    const pollTimer = setInterval(() => fetchBackendData(false), 5000);
    return () => {
      clearInterval(clockTimer);
      clearInterval(pollTimer);
    };
  }, [fetchBackendData]);

  // WebSocket live pump — restructure polling when frames drop.
  useEffect(() => {
    const client = new LiveStreamClient(undefined, {
      state: (state) => setWsLive(state === 'open'),
      situationUpdate: (frame) => {
        if (activeScenario) return;
        setSituation(frame.payload.situation);
      },
      healthStatus: (frame) => {
        if (activeScenario) return;
        setSourcesHealth(frame.payload.sources);
      },
      briefingUpdate: (frame) => {
        if (activeScenario) return;
        setBriefing(frame.payload.summary);
        setBriefingMeta((m) => ({ ...m, groundingVerified: true }));
      },
      eventStream: (frame) => {
        if (activeScenario) return; // scenario mode overrides the live picture
        setEvents((prev) => {
          const byId = new Map(prev.map((e) => [e.id, e]));
          for (const evt of frame.payload.events) byId.set(evt.id, evt);
          return [...byId.values()];
        });
      },
      clusterUpdate: (frame) => {
        if (activeScenario) return;
        setClusters(frame.payload.clusters);
      },
      escalation: (frame) => {
        if (activeScenario) return;
        setTimeline((prev) => [frame.payload.record, ...prev].slice(0, 200));
      },
      degradedMode: (frame) => {
        if (activeScenario) return;
        setIsDegradedComms(frame.payload.enabled);
      },
      alertTrigger: (frame) => {
        if (activeScenario) return;
        const evt = frame.payload.event;
        setEvents((prev) => {
          const byId = new Map(prev.map((e) => [e.id, e]));
          byId.set(evt.id, evt);
          return [...byId.values()];
        });
      },
      resync: () => {
        fetchBackendData(false);
      },
    });
    client.connect();
    return () => client.close();
  }, [fetchBackendData, activeScenario]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (e.key === 'o' || e.key === 'O') {
        setActiveTab('overview');
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTab('events');
      } else if (e.key === 't' || e.key === 'T') {
        setActiveTab('timeline');
      } else if (e.key === 'n' || e.key === 'N') {
        setActiveTab('news');
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTab('osint');
      } else if (e.key === 'r' || e.key === 'R') {
        setActiveTab('recon');
      } else if (e.key === 's' || e.key === 'S') {
        setActiveTab('sources');
      } else if (e.key === 'x' || e.key === 'X') {
        setActiveTab('simulation');
      } else if (e.key === 'd' || e.key === 'D') {
        setActiveTab('api_tester');
      } else if (e.key === 'l' || e.key === 'L') {
        setViewMode((prev) => (prev === 'landing' ? 'console' : 'landing'));
      } else if (e.key === 'Escape') {
        setSelectedEvent(null);
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Scenario Injections
  const handleInjectScenario = (mode: DemoScenarioMode) => {
    setActiveScenario(mode);
    const scenario = getScenarioDataset(mode);
    setSituation({
      threatLevel: scenario.threatLevel,
      threatScore: scenario.events.reduce(
        (acc, e) => acc + (e.severity === 'critical' ? 250 : e.severity === 'high' ? 100 : 25),
        0
      ),
      activeAlertsCount: scenario.events.length,
      criticalCount: scenario.events.filter((e) => e.severity === 'critical').length,
      totalEvents: scenario.events.length,
      meanConfidence: Math.round(
        scenario.events.reduce((acc, e) => acc + e.confidence, 0) / (scenario.events.length || 1)
      ),
      headline: `${scenario.name} — ${scenario.description}`,
    });
    setEvents(scenario.events);
    setSourcesHealth(scenario.sourcesHealth);
  };

  const handleClearScenario = () => {
    setActiveScenario(null);
    fetchBackendData(true);
  };

  const handleSelectEventId = (eventId: string) => {
    const found = events.find((e) => e.id === eventId);
    if (found) {
      setSelectedEvent(found);
    }
  };

  const handleToggleDegradedComms = async (enabled: boolean) => {
    setIsDegradedComms(enabled);
    try {
      await postDegraded(enabled);
      fetchBackendData(false);
    } catch (e) {
      console.warn('Degraded comms simulation fallback');
    }
  };

const handleRunNlQuery = async (query: string) => {
  setNlQuery(query);
  try {
    const res = await postQuery(query);
      setNlResult({
        interpretation: res.interpretation,
        parser: res.parser,
        latencyMs: res.latencyMs,
        matchedEventIds: res.matchedEventIds,
      });
    } catch {
      setNlResult(null);
    }
  };

  const handleClearNlQuery = () => {
    setNlQuery('');
    setNlResult(null);
  };

  const anomalyCount = events.filter((e) => e.isAnomaly).length;
  const viewEvents = nlResult ? events.filter((e) => nlResult.matchedEventIds.includes(e.id)) : events;

  if (viewMode === 'landing') {
    return (
      <VanguardLandingPage
        onLaunchCop={() => setViewMode('console')}
        serverOnline={serverOnline}
        eventCount={events.length}
        threatLevel={situation?.threatLevel}
      />
    );
  }

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden ${
        isDark ? 'bg-[#000000] text-slate-200' : 'bg-[#f8fafc] text-slate-900'
      } font-sans transition-colors duration-200`}
    >
      {/* 1. TOP TACTICAL COMMAND HEADER */}
      <TopTacticalHeader
        currentTime={currentTime}
        situation={situation}
        serverOnline={serverOnline && wsLive}
        wsLive={wsLive}
        easyMode={easyMode}
        onToggleEasyMode={() => setEasyMode(!easyMode)}
        activeScenario={activeScenario}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onManualRefresh={() => fetchBackendData(true)}
        refreshing={refreshing}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        eventCount={viewEvents.length}
        anomalyCount={anomalyCount}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onNavigateToLanding={() => setViewMode('landing')}
      />

      {/* 2. PRIMARY FULL-WIDTH OPERATIONAL WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-5 relative">
          {/* DEGRADED COMMS AMBER SCANLINE OVERLAY */}
          {isDegradedComms && (
            <div className="fixed inset-0 degraded-scanlines z-10 pointer-events-none" />
          )}

          {/* VIEW ROUTING */}
          {activeTab === 'overview' && (
            <OverviewCanvas
              situation={situation}
              events={viewEvents}
              briefing={briefing}
              briefingMeta={briefingMeta}
              clusters={clusters}
              selectedEventId={selectedEvent?.id}
              onSelectEvent={(evt) => setSelectedEvent(evt)}
              onSelectEventId={handleSelectEventId}
              easyMode={easyMode}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'events' && (
            <div className="flex flex-col gap-3 h-full">
              <NlQueryBar
                activeQuery={nlQuery}
                result={nlResult}
                onRun={handleRunNlQuery}
                onClear={handleClearNlQuery}
              />
              <div className="flex-1 min-h-0">
                <SignalHorizonStream
                  events={viewEvents}
                  selectedEventId={selectedEvent?.id}
                  onSelectEvent={(evt) => setSelectedEvent(evt)}
                  easyMode={easyMode}
                />
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <TemporalIntelligenceTimeline
              timeline={timeline}
              events={viewEvents}
              selectedEventId={selectedEvent?.id}
              onSelectEvent={(evt) => setSelectedEvent(evt)}
            />
          )}

          {activeTab === 'news' && (
            <div className="h-[calc(100vh-140px)] flex flex-col overflow-y-auto">
              <VerifiedNewsHub
                event={selectedEvent || events[0]}
                isStandaloneTab={true}
              />
            </div>
          )}

          {activeTab === 'recon' && (
            <div className="h-[calc(100vh-140px)] flex flex-col overflow-y-auto">
              <EventReconMedia
                event={
                  selectedEvent ||
                  events[0] || {
                    id: 'RECON-001',
                    sourceType: 'radar',
                    title: 'Sector 04 Satellite Surveillance & Recon Grid',
                    description: 'High-resolution orbital satellite optical surveillance and multispectral reconnaissance imagery of Sector 04 AO.',
                    location: { lat: 23.0225, lng: 72.5714 },
                    severity: 'high',
                    confidence: 92,
                    timestamp: new Date().toISOString(),
                    corroboratedBy: [],
                    isAnomaly: false,
                    raw: {}
                  }
                }
              />
            </div>
          )}

          {activeTab === 'osint' && (
            <OsintAuthenticityVerifier
              events={events}
              onSelectEvent={(evt) => setSelectedEvent(evt)}
            />
          )}

          {activeTab === 'sources' && (
            <SourceTopologyMatrix
              sourcesHealth={sourcesHealth}
              onToggleDegradedComms={handleToggleDegradedComms}
              isDegradedComms={isDegradedComms}
            />
          )}

          {activeTab === 'simulation' && (
            <ScenarioSimulationController
              activeScenario={activeScenario}
              onInjectScenario={handleInjectScenario}
              onClearScenario={handleClearScenario}
              onToggleDegradedComms={handleToggleDegradedComms}
              isDegradedComms={isDegradedComms}
            />
          )}

          {activeTab === 'api_tester' && <ApiConsoleDiagnostics />}
        </main>
      </div>

      {/* 3. CONTEXTUAL EDGE INVESTIGATION DRAWER */}
      {selectedEvent && (
        <EventInvestigationDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSelectCorrelatedEvent={handleSelectEventId}
          easyMode={easyMode}
        />
      )}

      {/* 4. COMMAND PALETTE (CTRL + K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setCommandPaletteOpen(false);
        }}
        events={events}
        onSelectEvent={(evt) => {
          setSelectedEvent(evt);
          setCommandPaletteOpen(false);
        }}
        onInjectScenario={(sc) => {
          handleInjectScenario(sc);
          setCommandPaletteOpen(false);
        }}
      />

      {/* 5. OPERATOR AUTH MODAL */}
      <OperatorAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}