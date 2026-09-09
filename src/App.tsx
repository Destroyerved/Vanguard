import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { UnifiedEvent, AISummary, CorrelationCluster, BriefingLatestResponse, VisionSummary } from './types/schema';
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
  getVisionSummary,
} from './data/apiClient';
import { LiveStreamClient } from './data/wsClient';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import OperatorAuthModal from './components/auth/OperatorAuthModal';
import { DEMO_DATASET } from './data/demoDataset';
import { runLocalNlQuery } from './data/localNlQuery';

/**
 * Ceiling on the live working set. The fusion core keeps every event it has
 * ever ingested (thousands within minutes); the console only renders a recent
 * window, so holding more than this costs render time and buys nothing.
 */
const MAX_LIVE_EVENTS = 400;

/**
 * Demo mode: run the console entirely off the seeded Sector 04 dataset — no
 * polling, no WebSocket, no backend required. This is the default so the app
 * is presentable from a clean checkout; set VITE_LIVE_BACKEND=true to attach
 * to a running fusion server instead.
 */
const DEMO_MODE = import.meta.env.VITE_LIVE_BACKEND !== 'true';

// Components
import TopTacticalHeader, { NavSection } from './components/command/TopTacticalHeader';
import CommandPalette from './components/command/CommandPalette';
import NlQueryBar from './components/command/NlQueryBar';
import OverviewCanvas from './components/views/OverviewCanvas';
import SignalHorizonStream from './components/intelligence/SignalHorizonStream';
import TemporalIntelligenceTimeline from './components/timeline/TemporalIntelligenceTimeline';
import VerifiedNewsHub from './components/VerifiedNewsHub';
import OsintAuthenticityVerifier from './components/OsintAuthenticityVerifier';
import VisualIntelligenceDashboard from './components/intelligence/VisualIntelligenceDashboard';
import SourceTopologyMatrix from './components/sources/SourceTopologyMatrix';
import ScenarioSimulationController from './components/system/ScenarioSimulationController';
import ApiConsoleDiagnostics from './components/system/ApiConsoleDiagnostics';
import EventInvestigationDrawer from './components/intelligence/EventInvestigationDrawer';
import EventReconMedia from './components/EventReconMedia';
import VanguardLandingPage from './components/landing/VanguardLandingPage';

function AppContent() {
  useTheme();
  const [viewMode, setViewMode] = useState<'landing' | 'console'>('landing');
  const [activeTab, setActiveTab] = useState<NavSection>('overview');
  const [loading, setLoading] = useState(true);
  const [serverOnline, setServerOnline] = useState(false);
  const [wsLive, setWsLive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Core Data States
  const [situation, setSituation] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [sourcesHealth, setSourcesHealth] = useState<any[]>([]);
  const [clusters, setClusters] = useState<CorrelationCluster[]>([]);
  const [visionSummary, setVisionSummary] = useState<VisionSummary | null>(null);
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

  // Live values the fetch/socket effects need to read without being torn down
  // and rebuilt when they change. Reading these through refs is what keeps
  // `fetchBackendData` referentially stable — see the note on the poll effect.
  const activeScenarioRef = useRef<DemoScenarioMode | null>(null);
  const hasEventsRef = useRef(false);
  activeScenarioRef.current = activeScenario;
  hasEventsRef.current = events.length > 0;

  /** Load the seeded picture. Synchronous, so the console paints immediately. */
  const loadDemoData = useCallback(() => {
    setNlQuery('');
    setNlResult(null);
    setSituation(DEMO_DATASET.situation);
    setSourcesHealth(DEMO_DATASET.sources);
    setTimeline(DEMO_DATASET.timeline);
    setEvents(DEMO_DATASET.events);
    setClusters(DEMO_DATASET.clusters);
    setBriefing(DEMO_DATASET.briefing);
    setBriefingMeta({ ageMs: 10_000, generating: false, groundingVerified: true });
    setVisionSummary(DEMO_DATASET.visionSummary);
    setLoading(false);
  }, []);

  // Fetch live backend data from the fusion REST server
  const fetchBackendData = useCallback(async (isManualSync = false) => {
    const activeScenario = activeScenarioRef.current;
    if (isManualSync) {
      setRefreshing(true);
      setActiveScenario(null);
    }
    if (!hasEventsRef.current || isManualSync) {
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
      const evtRes = await getEvents(MAX_LIVE_EVENTS);
      if (!activeScenario || isManualSync) {
        setEvents(evtRes.events || []);
      }

      // 4. Correlation clusters (map clustering + topology)
      const cluRes = await getClusters();
      setClusters((cluRes.clusters ?? []).map(({ events: _e, ...cluster }) => cluster));

      // 4b. Visual intelligence rollup — degrades to null when the endpoint
      // is absent so an older core still renders the event-driven dashboard.
      try {
        setVisionSummary(await getVisionSummary());
      } catch {
        /* older core — dashboard stays event-driven */
      }

      // 5. Cached AI briefing (never blocks).
      await refreshBriefing();
    } catch (err) {
      console.warn('[Frontend] Backend unreachable at localhost:3001, utilizing resilient fallback:', err);
      setServerOnline(false);
    } finally {
      setLoading(false);
      if (isManualSync) setRefreshing(false);
    }
    // Deliberately empty: every changing value this reads comes from a ref.
    // Depending on `events.length` here used to give the callback a new
    // identity on every incoming frame, which re-ran the poll and socket
    // effects below — tearing down and reopening the WebSocket several times
    // a second in a self-sustaining loop.
  }, []);

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

  // Seed the console. In demo mode this is the whole data layer — one
  // synchronous load, no timers. Against a live server the REST poll is a
  // safety net under the WebSocket, so it runs on a slow interval.
  useEffect(() => {
    if (DEMO_MODE) {
      loadDemoData();
      return;
    }
    fetchBackendData();
    const pollTimer = setInterval(() => fetchBackendData(false), 15000);
    return () => clearInterval(pollTimer);
  }, [fetchBackendData, loadDemoData]);

  // WebSocket live pump. Mounts exactly once: every value the handlers read
  // comes from a ref, so the socket survives for the life of the console
  // instead of being rebuilt on each incoming frame.
  useEffect(() => {
    if (DEMO_MODE) return;

    // Frames that arrive while a scripted scenario is driving the COP are
    // dropped — the scenario owns the picture until the operator resets.
    const liveOnly =
      <T,>(apply: (frame: T) => void) =>
      (frame: T) => {
        if (activeScenarioRef.current) return;
        apply(frame);
      };

    const mergeEvents = (incoming: UnifiedEvent[]) =>
      setEvents((prev) => {
        const byId = new Map(prev.map((e) => [e.id, e]));
        for (const evt of incoming) byId.set(evt.id, evt);
        // Keep the working set bounded. The fusion core accumulates events
        // indefinitely; the console only ever shows the most recent window,
        // and an unbounded array is what made the map and stream crawl.
        const merged = [...byId.values()];
        return merged.length > MAX_LIVE_EVENTS
          ? merged
              .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
              .slice(0, MAX_LIVE_EVENTS)
          : merged;
      });

    const client = new LiveStreamClient(undefined, {
      state: (state) => setWsLive(state === 'open'),
      situationUpdate: liveOnly((frame) => setSituation(frame.payload.situation)),
      healthStatus: liveOnly((frame) => setSourcesHealth(frame.payload.sources)),
      briefingUpdate: liveOnly((frame) => {
        setBriefing(frame.payload.summary);
        setBriefingMeta((m) => ({ ...m, groundingVerified: true }));
}),
      eventStream: liveOnly((frame) => mergeEvents(frame.payload.events)),
      clusterUpdate: liveOnly((frame) => setClusters(frame.payload.clusters)),
      escalation: liveOnly((frame) =>
        setTimeline((prev) => [frame.payload.record, ...prev].slice(0, 200))
      ),
      degradedMode: liveOnly((frame) => setIsDegradedComms(frame.payload.enabled)),
      visionUpdate: liveOnly((frame) => setVisionSummary(frame.payload.summary)),
      alertTrigger: liveOnly((frame) => mergeEvents([frame.payload.event])),
      resync: () => fetchBackendData(false),
    });
    client.connect();
    return () => client.close();
  }, [fetchBackendData]);

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
      } else if (e.key === 'w' || e.key === 'W') {
        setActiveTab('vision');
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
    // The active NL filter was matched against the previous event set.
    clearNlFilter();
    const scenario = getScenarioDataset(mode);

    // Scenarios carry only their own handful of scripted contacts. Dropping the
    // baseline picture to show them would leave a near-empty map, so the
    // injected events are laid over the seeded background traffic — the
    // scenario stands out against routine activity, which is how it would
    // actually arrive on a watch floor.
    const merged = [...scenario.events, ...DEMO_DATASET.events];
    const criticalCount = merged.filter((e) => e.severity === 'critical').length;

    setSituation({
      threatLevel: scenario.threatLevel,
      threatScore: merged.reduce(
        (acc, e) => acc + (e.severity === 'critical' ? 250 : e.severity === 'high' ? 100 : 25),
        0
      ),
      activeAlertsCount: scenario.events.length,
      criticalCount,
      highCount: merged.filter((e) => e.severity === 'high').length,
      anomalyCount: merged.filter((e) => e.isAnomaly).length,
      totalEvents: merged.length,
      correlatedClusters: DEMO_DATASET.clusters.length,
      meanConfidence: Math.round(
        merged.reduce((acc, e) => acc + e.confidence, 0) / (merged.length || 1)
      ),
      headline: `${scenario.name} — ${scenario.description}`,
    });
    setEvents(merged);
    setSourcesHealth(scenario.sourcesHealth);
  };

  const handleClearScenario = () => {
    setActiveScenario(null);
    if (DEMO_MODE) {
      loadDemoData();
      return;
    }
    fetchBackendData(true);
  };

  /** Manual resync: re-seed in demo mode, refetch against a live server. */
  const handleManualRefresh = () => {
    clearNlFilter();
    if (DEMO_MODE) {
      setRefreshing(true);
      setActiveScenario(null);
      loadDemoData();
      // A brief spinner so the control visibly acknowledges the click; the
      // seeded load itself is instantaneous.
      setTimeout(() => setRefreshing(false), 350);
      return;
    }
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

    // Degrading comms drops every feed's reliability weight, which is exactly
    // what the confidence function consumes — so the effect is visible on the
    // topology screen and in every track's confidence, backend or not.
    setSourcesHealth((prev) =>
      prev.map((feed) => ({
        ...feed,
        status: enabled ? 'degraded' : feed.nominalReliability >= 0.5 ? 'live' : feed.status,
        reliabilityScore: enabled
          ? Math.round(feed.nominalReliability * 0.55 * 100) / 100
          : feed.nominalReliability,
        manuallyDegraded: enabled,
        note: enabled ? 'Manually degraded — reliability weight reduced across the feed.' : undefined,
      }))
    );

    if (DEMO_MODE) return;
    try {
      await postDegraded(enabled);
      fetchBackendData(false);
    } catch (e) {
      console.warn('Degraded comms simulation fallback');
    }
  };

  const handleRunNlQuery = async (query: string) => {
    setNlQuery(query);

    if (DEMO_MODE) {
      setNlResult(runLocalNlQuery(query, events));
      return;
    }
    try {
      const res = await postQuery(query);
      setNlResult({
        interpretation: res.interpretation,
        parser: res.parser,
        latencyMs: res.latencyMs,
        matchedEventIds: res.matchedEventIds,
      });
    } catch {
      // Server unreachable — fall back to the in-browser parser rather than
      // silently doing nothing.
      setNlResult(runLocalNlQuery(query, events));
    }
  };

  const clearNlFilter = () => {
    setNlQuery('');
    setNlResult(null);
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
        serverOnline={DEMO_MODE || serverOnline}
        eventCount={events.length}
        threatLevel={situation?.threatLevel}
      />
    );
  }

  return (
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-black text-slate-200 font-sans selection:bg-[#a4c639] selection:text-black">
      {/* 0. CONSOLE BACKDROP — hairline tactical grid under every screen */}
      <div className="pointer-events-none fixed inset-0 vg-console-bg opacity-70" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(82,106,39,0.12), transparent 60%), radial-gradient(ellipse 70% 50% at 50% 100%, rgba(0,0,0,0.9), transparent 70%)',
        }}
      />

      {/* 1. TOP TACTICAL COMMAND HEADER */}
      <TopTacticalHeader
        situation={situation}
        serverOnline={DEMO_MODE || (serverOnline && wsLive)}
        wsLive={DEMO_MODE || wsLive}
        demoMode={DEMO_MODE}
        easyMode={easyMode}
        onToggleEasyMode={() => setEasyMode(!easyMode)}
        activeScenario={activeScenario}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onManualRefresh={handleManualRefresh}
        refreshing={refreshing}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        eventCount={viewEvents.length}
        anomalyCount={anomalyCount}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onNavigateToLanding={() => setViewMode('landing')}
      />

      {/* 2. PRIMARY FULL-WIDTH OPERATIONAL WORKSPACE */}
      <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto relative">
          {/* DEGRADED COMMS AMBER SCANLINE OVERLAY */}
          {isDegradedComms && (
            <>
              <div className="fixed inset-0 degraded-scanlines z-10 pointer-events-none" />
              <div className="fixed top-[104px] left-1/2 -translate-x-1/2 z-30 pointer-events-none vg-chip border-amber-500/60 bg-amber-950/90 text-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.35)]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Degraded comms — reduced feed fidelity
              </div>
            </>
          )}

          {/* VIEW ROUTING — each screen fades in so tab switches read as a
              deliberate instrument change rather than a hard cut. */}
          <div key={activeTab} className="mx-auto w-full max-w-[1600px] px-5 py-6 md:px-8 md:py-8">
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

          {activeTab === 'vision' && (
            <div className="h-[calc(100vh-140px)] flex flex-col overflow-y-auto">
              <VisualIntelligenceDashboard
                events={viewEvents}
                summary={visionSummary}
                selectedEventId={selectedEvent?.id}
                onSelectEvent={(evt) => setSelectedEvent(evt)}
              />
            </div>
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
          </div>
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