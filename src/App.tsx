import React, { useState, useEffect } from 'react';
import { UnifiedEvent } from './types/schema';
import { getScenarioDataset, DemoScenarioMode } from './data/scenarioEngine';
import { AuthProvider } from './context/AuthContext';
import OperatorAuthModal from './components/auth/OperatorAuthModal';

// Components
import TopTacticalHeader, { NavSection } from './components/command/TopTacticalHeader';
import CommandPalette from './components/command/CommandPalette';
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

const BACKEND_URL = 'http://localhost:3001/api/v1';

function AppContent() {
  const [viewMode, setViewMode] = useState<'landing' | 'console'>('landing');
  const [activeTab, setActiveTab] = useState<NavSection>('overview');
  const [loading, setLoading] = useState(true);
  const [serverOnline, setServerOnline] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toUTCString());
  const [refreshing, setRefreshing] = useState(false);

  // Core Data States
  const [situation, setSituation] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [sourcesHealth, setSourcesHealth] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<UnifiedEvent | null>(null);
  const [easyMode, setEasyMode] = useState<boolean>(true);
  const [activeScenario, setActiveScenario] = useState<DemoScenarioMode | null>(null);
  const [isDegradedComms, setIsDegradedComms] = useState<boolean>(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Fetch live backend data from REST server
  const fetchBackendData = async (isManualSync = false) => {
    if (isManualSync) {
      setRefreshing(true);
      setActiveScenario(null);
    }
    // Only set full loading indicator on initial first load or manual sync
    if (events.length === 0 || isManualSync) {
      setLoading(true);
    }
    try {
      // 1. Situation Current
      const sitRes = await fetch(`${BACKEND_URL}/situation/current`);
      if (sitRes.ok) {
        const sitData = await sitRes.json();
        setServerOnline(true);
        if (!activeScenario || isManualSync) {
          setSituation(sitData.situation);
          setSourcesHealth(sitData.sources || []);
        }
      }

      // 2. Timeline
      const timeRes = await fetch(`${BACKEND_URL}/situation/timeline`);
      if (timeRes.ok) {
        const timeData = await timeRes.json();
        setTimeline(Array.isArray(timeData) ? timeData : timeData.timeline || []);
      }

      // 3. Events (Fetch all unconstrained in-memory events)
      const evtRes = await fetch(`${BACKEND_URL}/events?limit=5000`);
      if (evtRes.ok) {
        const evtData = await evtRes.json();
        if (!activeScenario || isManualSync) {
          setEvents(evtData.events || evtData || []);
        }
      }
    } catch (err) {
      console.warn('[Frontend] Server unreachable at localhost:3001, utilizing resilient fallback:', err);
      setServerOnline(false);
    } finally {
      setLoading(false);
      if (isManualSync) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBackendData();
    const timer = setInterval(() => setCurrentTime(new Date().toUTCString()), 1000);
    const pollTimer = setInterval(() => fetchBackendData(false), 5000);
    return () => {
      clearInterval(timer);
      clearInterval(pollTimer);
    };
  }, [activeScenario]);

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
      await fetch(`${BACKEND_URL}/simulation/degraded`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      fetchBackendData(false);
    } catch (e) {
      console.warn('Degraded comms simulation fallback');
    }
  };

  const anomalyCount = events.filter((e) => e.isAnomaly).length;

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#05070a] text-slate-200 font-sans">
      {/* 1. TOP TACTICAL COMMAND HEADER */}
      <TopTacticalHeader
        currentTime={currentTime}
        situation={situation}
        serverOnline={serverOnline}
        easyMode={easyMode}
        onToggleEasyMode={() => setEasyMode(!easyMode)}
        activeScenario={activeScenario}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onManualRefresh={() => fetchBackendData(true)}
        refreshing={refreshing}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        eventCount={events.length}
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
              events={events}
              selectedEventId={selectedEvent?.id}
              onSelectEvent={(evt) => setSelectedEvent(evt)}
              onSelectEventId={handleSelectEventId}
              easyMode={easyMode}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'events' && (
            <SignalHorizonStream
              events={events}
              selectedEventId={selectedEvent?.id}
              onSelectEvent={(evt) => setSelectedEvent(evt)}
              easyMode={easyMode}
            />
          )}

          {activeTab === 'timeline' && (
            <TemporalIntelligenceTimeline
              timeline={timeline}
              events={events}
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
