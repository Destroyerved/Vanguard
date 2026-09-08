import { create } from 'zustand';
import type {
  AISummary,
  NuclearBlastEffect,
  RadarTarget,
  RafaleState,
  SeverityLevel,
  SourceHealth,
  SourceType,
  ThreatLevel,
  UnifiedEvent
} from '../types/vanguard';
import {
  generateInitialBriefing,
  generateInitialEvents,
  generateInitialRadarTargets,
  generateInitialRafaleState,
  generateInitialSourceHealth,
  THEATER_CENTER
} from '../services/mockDataGenerator';
import { soundFx } from '../services/soundFx';
import { voiceSynthesizer } from '../services/aiBriefingService';

export interface EventStoreState {
  // Events & Intelligence
  events: UnifiedEvent[];
  selectedEventId: string | null;
  hoveredEventId: string | null;
  
  // Filtering
  filters: {
    sourceTypes: SourceType[];
    severities: SeverityLevel[];
    minConfidence: number;
    searchQuery: string;
    showAnomaliesOnly: boolean;
  };
  
  // Map Layers
  layers: {
    assets: boolean;
    alerts: boolean;
    weather: boolean;
    zones: boolean;
    heatmap: boolean;
    fallout: boolean;
    mgrsGrid: boolean;
  };

  // Strategic State
  threatLevel: ThreatLevel;
  aiBriefing: AISummary;
  sourceHealth: SourceHealth[];
  isDegradedMode: boolean;
  timeScrubberMinute: number; // 0 = live, -60 = past
  
  // Radar Widget State
  radarTargets: RadarTarget[];
  selectedRadarTargetId: string | null;
  radarRangeNm: number;
  radarSweepSpeedRpm: number;

  // Rafale F4 & Nuclear Strike
  rafaleState: RafaleState;
  nukeBlast: NuclearBlastEffect | null;
  isNukeModalOpen: boolean;
  screenShake: boolean;
  screenNukeFlash: boolean;

  // Explainability Modal
  explainabilityEventId: string | null;

  // Audio & Voice
  isAudioMuted: boolean;
  isVoiceReading: boolean;

  // Actions
  selectEvent: (id: string | null) => void;
  hoverEvent: (id: string | null) => void;
  setFilterSourceTypes: (sources: SourceType[]) => void;
  setFilterSeverities: (severities: SeverityLevel[]) => void;
  setMinConfidence: (min: number) => void;
  setSearchQuery: (q: string) => void;
  setShowAnomaliesOnly: (show: boolean) => void;
  toggleLayer: (layer: keyof EventStoreState['layers']) => void;
  setThreatLevel: (level: ThreatLevel) => void;
  setDegradedMode: (degraded: boolean) => void;
  setTimeScrubber: (minute: number) => void;
  
  // Radar Actions
  selectRadarTarget: (id: string | null) => void;
  setRadarRangeNm: (range: number) => void;
  setRadarSweepSpeedRpm: (rpm: number) => void;

  // Rafale & Nuke Actions
  updateRafale: (partial: Partial<RafaleState>) => void;
  setNukeModalOpen: (open: boolean) => void;
  setPalCodeEntered: (code: string) => void;
  startNukeLaunchSequence: () => void;
  executeDetonation: () => void;
  resetNukeStrike: () => void;

  // Explainability Actions
  openExplainability: (eventId: string) => void;
  closeExplainability: () => void;

  // Audio & Briefing Actions
  toggleAudioMute: () => void;
  triggerVoiceBriefing: () => void;
  stopVoiceBriefing: () => void;

  // Simulation Actions
  injectScenario: (scenario: 'incursion' | 'jamming' | 'degraded' | 'reset') => void;
  kinematicTick: () => void;
}

export const useEventStore = create<EventStoreState>((set, get) => ({
  events: generateInitialEvents(),
  selectedEventId: 'EV-4091',
  hoveredEventId: null,

  filters: {
    sourceTypes: ['radar', 'weather', 'personnel', 'log', 'incident'],
    severities: ['low', 'medium', 'high', 'critical'],
    minConfidence: 0,
    searchQuery: '',
    showAnomaliesOnly: false
  },

  layers: {
    assets: true,
    alerts: true,
    weather: true,
    zones: true,
    heatmap: false,
    fallout: true,
    mgrsGrid: true
  },

  threatLevel: 'orange',
  aiBriefing: generateInitialBriefing(),
  sourceHealth: generateInitialSourceHealth(),
  isDegradedMode: false,
  timeScrubberMinute: 0,

  radarTargets: generateInitialRadarTargets(),
  selectedRadarTargetId: 'RT-101',
  radarRangeNm: 100,
  radarSweepSpeedRpm: 15,

  rafaleState: generateInitialRafaleState(),
  nukeBlast: null,
  isNukeModalOpen: false,
  screenShake: false,
  screenNukeFlash: false,

  explainabilityEventId: null,
  isAudioMuted: false,
  isVoiceReading: false,

  selectEvent: (id) => {
    soundFx.playClick(1400);
    set({ selectedEventId: id });
  },

  hoverEvent: (id) => set({ hoveredEventId: id }),

  setFilterSourceTypes: (sources) => set((s) => ({ filters: { ...s.filters, sourceTypes: sources } })),
  setFilterSeverities: (severities) => set((s) => ({ filters: { ...s.filters, severities: severities } })),
  setMinConfidence: (min) => set((s) => ({ filters: { ...s.filters, minConfidence: min } })),
  setSearchQuery: (q) => set((s) => ({ filters: { ...s.filters, searchQuery: q } })),
  setShowAnomaliesOnly: (show) => set((s) => ({ filters: { ...s.filters, showAnomaliesOnly: show } })),

  toggleLayer: (layer) => {
    soundFx.playClick(900);
    set((s) => ({
      layers: { ...s.layers, [layer]: !s.layers[layer] }
    }));
  },

  setThreatLevel: (threatLevel) => {
    if (threatLevel === 'red') soundFx.playAlarmKlaxon();
    set({ threatLevel });
  },

  setDegradedMode: (isDegradedMode) => {
    soundFx.playClick(600);
    set({ isDegradedMode });
  },

  setTimeScrubber: (minute) => set({ timeScrubberMinute: minute }),

  selectRadarTarget: (id) => {
    soundFx.playTargetLock();
    set({ selectedRadarTargetId: id });
  },

  setRadarRangeNm: (radarRangeNm) => {
    soundFx.playClick(1100);
    set({ radarRangeNm });
  },

  setRadarSweepSpeedRpm: (radarSweepSpeedRpm) => set({ radarSweepSpeedRpm }),

  updateRafale: (partial) => set((s) => ({ rafaleState: { ...s.rafaleState, ...partial } })),

  setNukeModalOpen: (isNukeModalOpen) => {
    soundFx.playClick(1000);
    set({ isNukeModalOpen });
  },

  setPalCodeEntered: (palCodeEntered) => {
    set((s) => ({
      rafaleState: { ...s.rafaleState, palCodeEntered }
    }));
  },

  startNukeLaunchSequence: () => {
    soundFx.playTargetLock();
    set((s) => ({
      rafaleState: {
        ...s.rafaleState,
        strikePhase: 'COUNTDOWN',
        countdownSeconds: 5
      }
    }));

    // Start 5-second countdown timer
    let count = 5;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        soundFx.playCountdownBeep(false);
        set((s) => ({
          rafaleState: { ...s.rafaleState, countdownSeconds: count }
        }));
      } else {
        clearInterval(interval);
        soundFx.playCountdownBeep(true);
        soundFx.playMissileLaunch();

        // Transition to Hypersonic Cruise
        set((s) => ({
          rafaleState: {
            ...s.rafaleState,
            strikePhase: 'HYPERSONIC_CRUISE',
            countdownSeconds: 0,
            hypersonicProgress: 0,
            weaponStations: s.rafaleState.weaponStations.map((st) =>
              st.station.includes('CENTERLINE') ? { ...st, status: 'EXPENDED' } : st
            )
          }
        }));

        // Animate hypersonic progress
        let progress = 0;
        const cruiseInterval = setInterval(() => {
          progress += 5;
          if (progress <= 100) {
            set((s) => ({
              rafaleState: { ...s.rafaleState, hypersonicProgress: progress }
            }));
          } else {
            clearInterval(cruiseInterval);
            get().executeDetonation();
          }
        }, 150);
      }
    }, 1000);
  },

  executeDetonation: () => {
    soundFx.playDetonationRumble();

    const targetLoc = get().rafaleState.targetLocation || {
      lat: 34.450,
      lng: 78.100
    };

    const blastEffect: NuclearBlastEffect = {
      groundZero: targetLoc,
      yieldKt: 300,
      fireballRadiusM: 1200,
      promptRadiationRadiusM: 3500,
      heavyBlast5PsiRadiusM: 7800,
      thermalRadiationRadiusM: 14500,
      falloutPlumeBearingDeg: 110, // East-southeast drift
      falloutPlumeLengthKm: 42,
      estimatedCasualties: 120,
      electromagneticPulseRadiusKm: 65
    };

    // Trigger visual screen flash & screen shake
    set({
      nukeBlast: blastEffect,
      screenShake: true,
      screenNukeFlash: true,
      threatLevel: 'red',
      rafaleState: {
        ...get().rafaleState,
        strikePhase: 'DETONATION'
      }
    });

    // Add nuclear strike incident event to feed
    const nukeEvent: UnifiedEvent = {
      id: `EV-NUKE-${Date.now().toString().slice(-4)}`,
      sourceType: 'incident',
      timestamp: new Date().toISOString(),
      location: targetLoc,
      severity: 'critical',
      title: 'TACTICAL DETONATION CONFIRMED: 300 kT ASMP-A GROUND ZERO',
      description: 'Rafale VANGUARD-01 hypersonic stand-off strike successfully neutralized strategic command node HQ-BUNKER-OMEGA. Seismic signature 4.8 magnitude recorded.',
      confidence: 99,
      isAnomaly: true,
      corroboratedBy: ['EV-4091', 'EV-4096', 'EV-4097'],
      raw: {
        weapon: 'ASMP-A TN-81',
        overpressure_psi: 50,
        prompt_ionization_detected: true,
        emp_coverage_km: 65
      }
    };

    set((s) => ({
      events: [nukeEvent, ...s.events]
    }));

    // Stop screen shake after 4s
    setTimeout(() => {
      set({
        screenShake: false,
        screenNukeFlash: false,
        rafaleState: {
          ...get().rafaleState,
          strikePhase: 'BDA_ASSESSMENT'
        }
      });
    }, 4000);
  },

  resetNukeStrike: () => {
    soundFx.playClick(1200);
    set({
      nukeBlast: null,
      screenShake: false,
      screenNukeFlash: false,
      rafaleState: {
        ...generateInitialRafaleState(),
        strikePhase: 'IDLE'
      }
    });
  },

  openExplainability: (eventId) => {
    soundFx.playClick(1100);
    set({ explainabilityEventId: eventId });
  },

  closeExplainability: () => set({ explainabilityEventId: null }),

  toggleAudioMute: () => {
    const nextMute = !get().isAudioMuted;
    soundFx.setMuted(nextMute);
    if (nextMute) {
      voiceSynthesizer.stop();
      set({ isAudioMuted: true, isVoiceReading: false });
    } else {
      soundFx.playClick(1000);
      set({ isAudioMuted: false });
    }
  },

  triggerVoiceBriefing: () => {
    const summary = get().aiBriefing.executiveSummary;
    soundFx.playClick(1400);
    voiceSynthesizer.speak(
      summary,
      () => set({ isVoiceReading: true }),
      () => set({ isVoiceReading: false })
    );
  },

  stopVoiceBriefing: () => {
    voiceSynthesizer.stop();
    set({ isVoiceReading: false });
  },

  injectScenario: (scenario) => {
    soundFx.playClick(1300);
    if (scenario === 'incursion') {
      soundFx.playAlarmKlaxon();
      const incursionEvent: UnifiedEvent = {
        id: `EV-INCUR-${Date.now().toString().slice(-4)}`,
        sourceType: 'radar',
        timestamp: new Date().toISOString(),
        location: { lat: 34.420, lng: 77.720, altitudeMeters: 10400, headingDegrees: 195, speedKnots: 820 },
        severity: 'critical',
        title: 'HOSTILE FORMATION PENETRATION #SWARM-4',
        description: 'Multi-axis supersonic penetration detected. 3x Hostile contacts engaging radar active jamming.',
        confidence: 96,
        isAnomaly: true,
        affiliation: 'hostile',
        callsign: 'HOSTILE-ALPHA-FLIGHT',
        classification: 'Supersonic Ingress Flight',
        corroboratedBy: ['EV-4091', 'EV-4092'],
        raw: { formation_count: 3, mach: 1.4, altitude_fl: 340 }
      };

      set((s) => ({
        threatLevel: 'red',
        events: [incursionEvent, ...s.events],
        selectedEventId: incursionEvent.id
      }));
    } else if (scenario === 'jamming') {
      soundFx.playAlarmKlaxon();
      set((s) => ({
        threatLevel: 'orange',
        sourceHealth: s.sourceHealth.map((sh) =>
          sh.sourceType === 'radar' || sh.sourceType === 'log'
            ? { ...sh, status: 'degraded', reliabilityScore: 0.62 }
            : sh
        )
      }));
    } else if (scenario === 'degraded') {
      set((s) => ({ isDegradedMode: !s.isDegradedMode }));
    } else if (scenario === 'reset') {
      set({
        events: generateInitialEvents(),
        threatLevel: 'orange',
        isDegradedMode: false,
        sourceHealth: generateInitialSourceHealth(),
        nukeBlast: null,
        rafaleState: generateInitialRafaleState()
      });
    }
  },

  kinematicTick: () => {
    // Smooth kinematic position drift for live radar contacts
    set((state) => {
      const updatedTargets = state.radarTargets.map((t) => {
        const rad = (t.headingDeg * Math.PI) / 180;
        const speedFactor = (t.speedKnots / 3600) * 0.008; // Small delta
        const dLat = Math.cos(rad) * speedFactor;
        const dLng = Math.sin(rad) * speedFactor;

        return {
          ...t,
          lat: t.lat + dLat,
          lng: t.lng + dLng,
          lastPingMs: (t.lastPingMs + 1000) % 4000
        };
      });

      // Also gently oscillate Rafale pitch/roll/mach for hyper-realism
      const rafale = state.rafaleState;
      const pitchNoise = (Math.random() - 0.5) * 0.4;
      const rollNoise = (Math.random() - 0.5) * 0.6;
      const speedNoise = (Math.random() - 0.5) * 0.01;

      return {
        radarTargets: updatedTargets,
        rafaleState: {
          ...rafale,
          pitchDeg: Number((rafale.pitchDeg + pitchNoise).toFixed(1)),
          rollDeg: Number((rafale.rollDeg + rollNoise).toFixed(1)),
          speedMach: Number(Math.max(1.2, Math.min(2.0, rafale.speedMach + speedNoise)).toFixed(2))
        }
      };
    });
  }
}));
