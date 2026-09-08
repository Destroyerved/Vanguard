/**
 * Vanguard Interactive Scenario Injector Engine
 * Allows 1-click injection of custom operational scenarios during live judging demonstrations.
 */

import { ScenarioDefinition, UnifiedEvent } from '../types/schema';
import { fuseMultiSourceEvents, calculateGlobalThreatLevel } from './fusionEngine';
import { getInitialAssets } from './sources/personnelSource';

export type DemoScenarioMode = 'NORMAL_OPS' | 'SEVERE_WEATHER' | 'COORDINATED_ATTACK' | 'AIR_COMBAT_INTERCEPT' | 'NAVAL_WARFARE_STRIKE' | 'SUBMARINE_ASW_HUNT' | 'GROUND_ARMY_COMBAT' | 'OSINT_AI_VERIFICATION';

export function getScenarioDataset(mode: DemoScenarioMode): ScenarioDefinition {
  const now = new Date();
  const assets = getInitialAssets();

  if (mode === 'OSINT_AI_VERIFICATION') {
    const rawEvents: UnifiedEvent[] = [
      {
        id: 'OSINT-INSTA-01',
        sourceType: 'social_media',
        timestamp: now.toISOString(),
        location: { lat: 28.6910, lng: 77.3110 },
        severity: 'high',
        title: 'INSTAGRAM OSINT — Low-Altitude Supersonic Jet Flyby (AI Voice + Real Satellite Corroboration)',
        description: 'Viral Instagram Reel posted by @aero_watcher. Video uses AI-cloned narrator voiceover, BUT satellite orbital passes & radar tracks 100% CORROBORATE the physical aircraft flyby.',
        confidence: 92,
        corroboratedBy: ['RAD-FIGHTER-01'],
        isAnomaly: false,
        raw: { platform: 'Instagram', handle: '@aero_watcher', aiVoiceover: true, syntheticVideo: false, mediaType: 'VIDEO_REEL' },
        authenticityAudit: {
          overallAuthenticityScore: 72,
          veracityClassification: 'HYBRID_AI_AUTHENTIC_FACT',
          aiSyntheticScore: 75,
          deepfakeArtifacts: ['Neural Text-to-Speech (TTS) Voice Model Harmonics Detected'],
          acousticSpectrumScore: 40,
          provenanceScore: 78,
          crossSensorCorroborationScore: 95,
          factualCoreExtracted: 'VERIFIED GROUND TRUTH: While video voiceover is AI synthetic, physical jet trajectory is 100% CORROBORATED by primary radar and satellite sensors.',
        }
      },
      {
        id: 'OSINT-AUDIO-02',
        sourceType: 'audio_recording',
        timestamp: new Date(now.getTime() - 15000).toISOString(),
        location: { lat: 18.9100, lng: 72.7800 },
        severity: 'critical',
        title: 'ACOUSTIC HYDROPHONE STREAM — Deep Ocean Submarine Cavitation (100% Authentic Natural Sound)',
        description: 'Sub-surface acoustic array recorded 120Hz acoustic spectrum match. Zero synthetic audio generation signatures. Natural physical sound floor verified.',
        confidence: 96,
        corroboratedBy: ['SUB-ASW-01'],
        isAnomaly: true,
        raw: { audioStream: 'HYDROPHONE_CH_4', acousticFreqHz: '120Hz Cavitation', syntheticWaveform: false },
        authenticityAudit: {
          overallAuthenticityScore: 94,
          veracityClassification: 'VERIFIED_AUTHENTIC',
          aiSyntheticScore: 10,
          deepfakeArtifacts: [],
          acousticSpectrumScore: 98,
          provenanceScore: 92,
          crossSensorCorroborationScore: 96,
          factualCoreExtracted: 'AUTHENTIC ACOUSTIC SIGNAL: Intact hydrophone sound spectrum, physical oceanic reverberation, and multi-sensor sonar correlation.',
        }
      },
      {
        id: 'OSINT-FAKE-03',
        sourceType: 'social_media',
        timestamp: new Date(now.getTime() - 40000).toISOString(),
        location: { lat: 18.9600, lng: 72.7700 },
        severity: 'critical',
        title: 'X/TWITTER DEEPFAKE WARNING — Fabricated Coastal Explosion Claim (Zero Satellite Match)',
        description: 'Viral video clip on X claiming coastal explosion. Neural render boundaries and generative video noise detected. Zero satellite, radar, or seismic corroboration.',
        confidence: 25,
        corroboratedBy: [],
        isAnomaly: true,
        raw: { platform: 'X_Twitter', deepfakeVideo: true, syntheticAudio: true },
        authenticityAudit: {
          overallAuthenticityScore: 18,
          veracityClassification: 'SYNTHETIC_DISINFORMATION',
          aiSyntheticScore: 94,
          deepfakeArtifacts: [
            'Generative AI Video Artifact (Inter-frame warping at 30fps)',
            'Synthetic Facial Mask / Neural Render Boundary Unnatural Blur',
            'Zero Background Ambient Noise Floor (AI Sound Generator)'
          ],
          acousticSpectrumScore: 20,
          provenanceScore: 15,
          crossSensorCorroborationScore: 10,
          factualCoreExtracted: 'FABRICATED MEDIA: Zero physical sensor corroboration. Complete AI deepfake generation.',
        }
      }
    ];

    const events = fuseMultiSourceEvents(rawEvents);
    return {
      id: 'SCENARIO-8',
      name: 'Multi-Source OSINT Social Media & AI Authenticity Audit',
      description: 'AI MEDIA & OSINT VERIFICATION. Demonstrates AI deepfake detection, hydrophone acoustic sound spectrum audit, and hybrid AI-fact sorting.',
      threatLevel: calculateGlobalThreatLevel(events),
      events,
      assets,
      sourcesHealth: [
        { sourceType: 'social_media', sourceName: 'Instagram / X OSINT Stream', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.70, activeCount: 2 },
        { sourceType: 'audio_recording', sourceName: 'Hydrophone Sound Array', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.95, activeCount: 1 },
      ]
    };
  }

  if (mode === 'NORMAL_OPS') {
    const rawEvents: UnifiedEvent[] = [
      {
        id: 'WX-NORM-01',
        sourceType: 'weather',
        timestamp: now.toISOString(),
        location: { lat: 28.6139, lng: 77.2090 },
        severity: 'low',
        title: 'Clear Meteorological Conditions',
        description: 'Standard atmospheric pressure 1012 hPa, temperature 25°C, wind speed 12 km/h from 180°.',
        confidence: 90,
        corroboratedBy: [],
        isAnomaly: false,
        raw: { status: 'NORMAL' },
      },
      {
        id: 'RAD-NORM-02',
        sourceType: 'radar',
        timestamp: new Date(now.getTime() - 30000).toISOString(),
        location: { lat: 28.5900, lng: 77.1700, altitudeMeters: 3500, speedKnots: 250, headingDegrees: 45 },
        severity: 'low',
        title: 'Scheduled Commercial Flight AIC-405',
        description: 'Verified IFF tag FRIENDLY, squawk 1200, maintaining assigned corridor.',
        confidence: 98,
        corroboratedBy: [],
        isAnomaly: false,
        raw: { iffTag: 'FRIENDLY' },
      }
    ];

    const events = fuseMultiSourceEvents(rawEvents);
    return {
      id: 'SCENARIO-1',
      name: 'Peacetime Patrol (Normal Operations)',
      description: 'All sectors nominal. Clear airspace, routine unit beacons, zero perimeter anomalies.',
      threatLevel: calculateGlobalThreatLevel(events),
      events,
      assets,
      sourcesHealth: [
        { sourceType: 'weather', sourceName: 'Open-Meteo Weather', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.85, activeCount: 1 },
        { sourceType: 'radar', sourceName: 'Primary Radar', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.95, activeCount: 1 },
        { sourceType: 'personnel', sourceName: 'Unit Telemetry', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.90, activeCount: 4 },
      ]
    };
  }

  if (mode === 'SEVERE_WEATHER') {
    const rawEvents: UnifiedEvent[] = [
      {
        id: 'WX-STORM-01',
        sourceType: 'weather',
        timestamp: now.toISOString(),
        location: { lat: 28.6139, lng: 77.2090 },
        severity: 'critical',
        title: 'SEVERE WEATHER FRONT — Gale Wind & Heavy Rain',
        description: 'Wind speed 75 km/h from 240°, precipitation 35mm/h. Optical sensors and drone flights restricted.',
        confidence: 85,
        corroboratedBy: [],
        isAnomaly: true,
        raw: { status: 'STORM_WARNING' },
      },
      {
        id: 'LOG-COMMS-02',
        sourceType: 'log',
        timestamp: new Date(now.getTime() - 60000).toISOString(),
        location: { lat: 28.6300, lng: 77.2200 },
        severity: 'high',
        title: 'Comms Degradation Warning',
        description: 'Atmospheric interference registered on UHF radio channels. Signal integrity degraded to 65%.',
        confidence: 80,
        corroboratedBy: [],
        isAnomaly: true,
        raw: { status: 'ATMOSPHERIC_DEGRADATION' },
      }
    ];

    const events = fuseMultiSourceEvents(rawEvents);
    return {
      id: 'SCENARIO-2',
      name: 'Severe Storm & Comms Degradation',
      description: 'Storm front restricting airborne assets. Increased uncertainty tags and degraded signal notices.',
      threatLevel: calculateGlobalThreatLevel(events),
      events,
      assets: assets.map(a => ({ ...a, commIntegrity: 65 })),
      sourcesHealth: [
        { sourceType: 'weather', sourceName: 'Open-Meteo Weather', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.85, activeCount: 1 },
        { sourceType: 'radar', sourceName: 'Primary Radar', status: 'degraded', lastUpdate: now.toISOString(), reliabilityScore: 0.70, activeCount: 1 },
        { sourceType: 'personnel', sourceName: 'Unit Telemetry', status: 'degraded', lastUpdate: now.toISOString(), reliabilityScore: 0.65, activeCount: 4 },
      ]
    };
  }

  if (mode === 'COORDINATED_ATTACK') {
    const rawEvents: UnifiedEvent[] = [
      {
        id: 'RAD-HOSTILE-01',
        sourceType: 'radar',
        timestamp: now.toISOString(),
        location: { lat: 28.6410, lng: 77.2410, altitudeMeters: 220, speedKnots: 450, headingDegrees: 185 },
        severity: 'critical',
        title: 'UNIDENTIFIED LOW-ALTITUDE RADAR CONTACT RAD-7041',
        description: 'High-speed contact flying below radar horizon. Squawk 7700 emergency override. RCS: 0.4m² (Stealth trajectory).',
        confidence: 95,
        corroboratedBy: [],
        isAnomaly: true,
        raw: { iffTag: 'HOSTILE', squawk: '7700' },
      },
      {
        id: 'LOG-BREACH-02',
        sourceType: 'log',
        timestamp: new Date(now.getTime() - 45000).toISOString(),
        location: { lat: 28.6425, lng: 77.2430 },
        severity: 'critical',
        title: 'OPTICAL TRIPWIRE BREACH — Sector 4 Perimeter',
        description: 'Fiber-optic fence vibration sensor triggered at Sector 4-B North Perimeter. Physical invasion breach suspected.',
        confidence: 90,
        corroboratedBy: [],
        isAnomaly: true,
        raw: { sensorId: 'OPTIC-SEC4-B', breachConfirmed: true },
      },
      {
        id: 'LOG-JAMMING-03',
        sourceType: 'log',
        timestamp: new Date(now.getTime() - 120000).toISOString(),
        location: { lat: 28.6810, lng: 77.2900 },
        severity: 'high',
        title: 'RF FREQUENCY JAMMING DETECTED',
        description: 'Wideband RF noise spike on 142MHz - 156MHz band. Frequency hopping protocol engaged.',
        confidence: 85,
        corroboratedBy: [],
        isAnomaly: true,
        raw: { band: 'VHF', noiseFloorDbm: -45 },
      },
      {
        id: 'INC-SALUTE-04',
        sourceType: 'incident',
        timestamp: new Date(now.getTime() - 90000).toISOString(),
        location: { lat: 28.6418, lng: 77.2420 },
        severity: 'critical',
        title: 'SALUTE SPOT REPORT — Unmanned Aerial Vehicle Intrusion',
        description: 'Alpha Patrol spot report: Low-flying rotary UAV over Sector 4-B. Corroborates radar contact & optical tripwire.',
        confidence: 88,
        corroboratedBy: [],
        isAnomaly: true,
        raw: { format: 'SALUTE', reportingUnit: 'Alpha Patrol 1' },
      }
    ];

    const events = fuseMultiSourceEvents(rawEvents);
    return {
      id: 'SCENARIO-3',
      name: 'Coordinated Perimeter Breach & RF Jamming Spike',
      description: 'CRITICAL SECTOR RED ALERT. Multi-source corroboration confirms low-altitude stealth contact + optical perimeter breach.',
      threatLevel: calculateGlobalThreatLevel(events),
      events,
      assets: assets.map(a => a.id === 'AST-ALPHA-1' ? { ...a, status: 'ENGAGED' } : a),
      sourcesHealth: [
        { sourceType: 'weather', sourceName: 'Open-Meteo Weather', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.85, activeCount: 1 },
        { sourceType: 'radar', sourceName: 'Primary Radar', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.95, activeCount: 1 },
        { sourceType: 'personnel', sourceName: 'Unit Telemetry', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.90, activeCount: 4 },
        { sourceType: 'log', sourceName: 'Perimeter Sensors', status: 'degraded', lastUpdate: now.toISOString(), reliabilityScore: 0.80, activeCount: 3 },
        { sourceType: 'incident', sourceName: 'Spot Reports', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.75, activeCount: 2 },
      ]
    };
  }

  if (mode === 'AIR_COMBAT_INTERCEPT') {
    const rawEvents: UnifiedEvent[] = [
      {
        id: 'RAD-FIGHTER-01',
        sourceType: 'radar',
        timestamp: now.toISOString(),
        location: { lat: 28.6910, lng: 77.3110, altitudeMeters: 12500, speedKnots: 1150, headingDegrees: 210 },
        severity: 'critical',
        title: 'HOSTILE SUPERSONIC INTERCEPTOR — Su-35 Flanker Track',
        description: 'Hostile fighter jet detected at Mach 1.7 vectoring towards defense sector. Active fire-control radar lock warning triggered.',
        confidence: 96,
        corroboratedBy: ['RAD-FIGHTER-02'],
        isAnomaly: true,
        raw: { iffTag: 'HOSTILE', callsign: 'VIPER-LEAD', machSpeed: 1.7, radarLock: true, weaponsState: 'ACTIVE_LOCK_R37M' },
      },
      {
        id: 'RAD-FIGHTER-02',
        sourceType: 'radar',
        timestamp: new Date(now.getTime() - 15000).toISOString(),
        location: { lat: 28.6100, lng: 77.2100, altitudeMeters: 11800, speedKnots: 950, headingDegrees: 30 },
        severity: 'high',
        title: 'FRIENDLY CAP INTERCEPTOR — Rafale / F-16 Falcon Lead',
        description: 'Friendly combat air patrol fighter jet scrambling to intercept hostile contact. Weapons free authorization pending.',
        confidence: 99,
        corroboratedBy: ['RAD-FIGHTER-01'],
        isAnomaly: false,
        raw: { iffTag: 'FRIENDLY', callsign: 'FALCON-LEAD', machSpeed: 1.4, weaponsState: 'FOX_3_ARMED' },
      },
      {
        id: 'LOG-MISSILE-03',
        sourceType: 'log',
        timestamp: new Date(now.getTime() - 25000).toISOString(),
        location: { lat: 28.6750, lng: 77.2800, altitudeMeters: 13000, speedKnots: 2400, headingDegrees: 215 },
        severity: 'critical',
        title: 'BVR AIR-TO-AIR MISSILE TRAJECTORY — Active Radar Homing',
        description: 'Radar warning receiver (RWR) registered active missile launch signal. Mach 3.5 BVR missile track in bound.',
        confidence: 92,
        corroboratedBy: [],
        isAnomaly: true,
        raw: { missileType: 'R-37M_HYPERSONIC', trackingMode: 'ACTIVE_RADAR' },
      }
    ];

    const events = fuseMultiSourceEvents(rawEvents);
    return {
      id: 'SCENARIO-4',
      name: 'Air Combat Dogfight & Supersonic Missile Intercept',
      description: 'HIGH-ALTITUDE AIR DOGFIGHT. Hostile Mach 1.7 interceptor tracking towards sector airspace with active RWR missile lock warnings.',
      threatLevel: calculateGlobalThreatLevel(events),
      events,
      assets: assets.map(a => ({ ...a, status: 'ENGAGED' })),
      sourcesHealth: [
        { sourceType: 'radar', sourceName: 'Air Defence Radar Grid', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.98, activeCount: 3 },
        { sourceType: 'weather', sourceName: 'High-Altitude Meteorological', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.90, activeCount: 1 },
        { sourceType: 'log', sourceName: 'RWR & EW Sensor Suite', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.95, activeCount: 2 },
      ]
    };
  }

  if (mode === 'SUBMARINE_ASW_HUNT') {
    const rawEvents: UnifiedEvent[] = [
      {
        id: 'SUB-ASW-01',
        sourceType: 'submarine',
        timestamp: now.toISOString(),
        location: { lat: 18.9100, lng: 72.7800, altitudeMeters: -180, speedKnots: 22, headingDegrees: 120 },
        severity: 'critical',
        title: 'HOSTILE ATTACK SUBMARINE CONTACT — Akula-class Sub-Surface Track',
        description: 'Passive hydrophone towed array locked onto 120Hz acoustic cavitation signature at depth 180m. Speed 22 kts.',
        confidence: 94,
        corroboratedBy: ['SUB-PATROL-03'],
        isAnomaly: true,
        raw: { depthMeters: 180, acousticFreqHz: '120Hz Cavitation', contactClass: 'AKULA_SSN', sonarType: 'PASSIVE_TOWED_ARRAY', iffTag: 'HOSTILE' },
      },
      {
        id: 'SUB-TORP-02',
        sourceType: 'submarine',
        timestamp: new Date(now.getTime() - 20000).toISOString(),
        location: { lat: 18.9300, lng: 72.8000, altitudeMeters: -45, speedKnots: 48, headingDegrees: 110 },
        severity: 'critical',
        title: 'ACOUSTIC TORPEDO LAUNCH TRACK — Active Homing Sonar Ping',
        description: 'High-frequency active sonar ping detected 533mm heavy acoustic homing torpedo on intercept trajectory towards naval asset.',
        confidence: 96,
        corroboratedBy: ['SUB-ASW-01'],
        isAnomaly: true,
        raw: { depthMeters: 45, speedKnots: 48, torpedoType: '533mm_HEAVY_ACOUSTIC', homingMode: 'ACTIVE_PING', iffTag: 'HOSTILE' },
      },
      {
        id: 'SUB-PATROL-03',
        sourceType: 'personnel',
        timestamp: new Date(now.getTime() - 45000).toISOString(),
        location: { lat: 18.9500, lng: 72.8200, altitudeMeters: 150, speedKnots: 110, headingDegrees: 180 },
        severity: 'high',
        title: 'ASW HELICOPTER SONOBUOY PATROL — P-8I / Sea King ASW-1',
        description: 'Anti-Submarine Airborne Patrol deployed active acoustic sonobuoy grid across Sector Bravo.',
        confidence: 91,
        corroboratedBy: ['SUB-ASW-01'],
        isAnomaly: false,
        raw: { unitCallsign: 'ASW-HELO-01', sonobuoysActive: 12, status: 'SEARCH_LOCK' },
      }
    ];

    const events = fuseMultiSourceEvents(rawEvents);
    return {
      id: 'SCENARIO-6',
      name: 'Submarine ASW Sonar Hunt & Torpedo Tracking',
      description: 'SUB-SURFACE ANTI-SUBMARINE WARFARE. Towed array hydrophones tracking hostile submarine at 180m depth with acoustic torpedo launch detection.',
      threatLevel: calculateGlobalThreatLevel(events),
      events,
      assets: assets.map(a => ({ ...a, branch: 'NAVY', status: 'ENGAGED' })),
      sourcesHealth: [
        { sourceType: 'submarine', sourceName: 'Towed Hydrophone Sonar Array', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.95, activeCount: 2 },
        { sourceType: 'personnel', sourceName: 'ASW Sonobuoy Airborne Grid', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.90, activeCount: 3 },
      ]
    };
  }

  if (mode === 'GROUND_ARMY_COMBAT') {
    const rawEvents: UnifiedEvent[] = [
      {
        id: 'GND-ARMOR-01',
        sourceType: 'ground_conflict',
        timestamp: now.toISOString(),
        location: { lat: 28.6500, lng: 77.2500, altitudeMeters: 0, speedKnots: 20, headingDegrees: 180 },
        severity: 'critical',
        title: 'ARMORED TANK COLUMN ADVANCE — T-90 / Leopard Heavy Main Battle Tanks',
        description: 'Ground Surveillance Radar (GSR) detected armored column of 14 MBTs advancing along Axis Alpha at 35 km/h.',
        confidence: 93,
        corroboratedBy: ['GND-INFANTRY-03'],
        isAnomaly: true,
        raw: { unitType: 'Main Battle Tank Column', vehicleCount: 14, radarCrossSection: 'HEAVY_ARMOR', saluteCode: 'S-ARMOR-014', iffTag: 'HOSTILE' },
      },
      {
        id: 'GND-ARTY-02',
        sourceType: 'ground_conflict',
        timestamp: new Date(now.getTime() - 15000).toISOString(),
        location: { lat: 28.6750, lng: 77.2600, altitudeMeters: 0, speedKnots: 0, headingDegrees: 0 },
        severity: 'critical',
        title: 'COUNTER-BATTERY RADAR LOCK — 155mm Heavy Artillery Barrage',
        description: 'Weapon Locating Radar (WLR) tracked 6 incoming 155mm artillery shell trajectories. Impact sector calculated within 45 seconds.',
        confidence: 97,
        corroboratedBy: ['GND-ARMOR-01'],
        isAnomaly: true,
        raw: { artilleryCaliber: '155mm High Explosive', roundTrajectoryCount: 6, batteryOrigin: '28.6750°N, 77.2600°E', impactEtaSeconds: 45, iffTag: 'HOSTILE' },
      },
      {
        id: 'GND-INFANTRY-03',
        sourceType: 'personnel',
        timestamp: new Date(now.getTime() - 30000).toISOString(),
        location: { lat: 28.6350, lng: 77.2400, altitudeMeters: 0, speedKnots: 0, headingDegrees: 90 },
        severity: 'high',
        title: 'FORWARD INFANTRY BATTALION ENGAGEMENT — Bravo Company QRF',
        description: 'Forward defense infantry company engaged in heavy fire exchange at Sector 4 Outpost. Requesting counter-battery support.',
        confidence: 90,
        corroboratedBy: ['GND-ARMOR-01'],
        isAnomaly: false,
        raw: { unitCallsign: 'BRAVO-CO-QRF', readiness: 'ENGAGED', ammoCapacityPct: 65, status: 'ENGAGED' },
      }
    ];

    const events = fuseMultiSourceEvents(rawEvents);
    return {
      id: 'SCENARIO-7',
      name: 'Ground Army Conflict & Counter-Battery Artillery combat',
      description: 'GROUND COMBAT ZONE. Heavy main battle tank column invasion push supported by 155mm counter-battery artillery radar tracking.',
      threatLevel: calculateGlobalThreatLevel(events),
      events,
      assets: assets.map(a => ({ ...a, branch: 'ARMY', status: 'ENGAGED' })),
      sourcesHealth: [
        { sourceType: 'ground_conflict', sourceName: 'Ground Surveillance Radar (GSR)', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.94, activeCount: 2 },
        { sourceType: 'ground_conflict', sourceName: 'Weapon Locating Radar (WLR)', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.97, activeCount: 1 },
        { sourceType: 'personnel', sourceName: 'Infantry Field Telemetry', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.90, activeCount: 4 },
      ]
    };
  }

  // NAVAL_WARFARE_STRIKE Scenario (default fallback)
  const rawEvents: UnifiedEvent[] = [
    {
      id: 'RAD-WARSHIP-01',
      sourceType: 'radar',
      timestamp: now.toISOString(),
      location: { lat: 18.9200, lng: 72.8300, altitudeMeters: 0, speedKnots: 28, headingDegrees: 270 },
      severity: 'high',
      title: 'AIRCRAFT CARRIER STRIKE GROUP — INS Vikrant / CSG Alpha',
      description: 'Naval carrier fleet flagship executing high-speed tactical evasion maneuver. Aegis radar scanning 360° perimeter.',
      confidence: 98,
      corroboratedBy: ['RAD-WARSHIP-02'],
      isAnomaly: false,
      raw: { vesselType: 'AIRCRAFT_CARRIER', hullNumber: 'R11', aegisStatus: 'ACTIVE_360_SCAN', iffTag: 'FRIENDLY' },
    },
    {
      id: 'RAD-MISSILE-02',
      sourceType: 'radar',
      timestamp: new Date(now.getTime() - 10000).toISOString(),
      location: { lat: 18.9600, lng: 72.7700, altitudeMeters: 12, speedKnots: 620, headingDegrees: 135 },
      severity: 'critical',
      title: 'SEA-SKIMMING ANTI-SHIP CRUISE MISSILE — Inbound Strike Vector',
      description: 'High-subsonic anti-ship cruise missile flying 12m above sea surface towards carrier strike group. CIWS automated engagement active.',
      confidence: 95,
      corroboratedBy: ['RAD-WARSHIP-01'],
      isAnomaly: true,
      raw: { missileType: 'ANTI_SHIP_CRUISE_MISSILE', seaSkimmerAltMeters: 12, targetHull: 'CSG_FLAGSHIP', iffTag: 'HOSTILE' },
    },
    {
      id: 'INC-NAVAL-03',
      sourceType: 'incident',
      timestamp: new Date(now.getTime() - 40000).toISOString(),
      location: { lat: 18.8900, lng: 72.8100, altitudeMeters: 0, speedKnots: 35, headingDegrees: 90 },
      severity: 'critical',
      title: 'SUB-SURFACE ACOUSTIC ANOMALY — Unidentified Submarine Contact',
      description: 'Sonar array picked up high-speed cavitating propeller acoustic signature 15nm SW of fleet flagship.',
      confidence: 89,
      corroboratedBy: [],
      isAnomaly: true,
      raw: { sonarType: 'TOWED_ARRAY_PASSIVE', contactDepthMeters: 120, iffTag: 'UNKNOWN' },
    }
  ];

  const events = fuseMultiSourceEvents(rawEvents);
  return {
    id: 'SCENARIO-5',
    name: 'Naval Carrier Strike Group Warfare & Sea-Skimmer Defense',
    description: 'MARITIME WARFARE COMBAT ZONE. Carrier strike group engaged in sea-skimming anti-ship missile defense & sub-surface contact tracking.',
    threatLevel: calculateGlobalThreatLevel(events),
    events,
    assets: assets.map(a => ({ ...a, status: 'ENGAGED' })),
    sourcesHealth: [
      { sourceType: 'radar', sourceName: 'Naval Aegis Air-Defence Radar', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.99, activeCount: 2 },
      { sourceType: 'incident', sourceName: 'Sonar Towed Array', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.90, activeCount: 2 },
      { sourceType: 'log', sourceName: 'CIWS Automated Countermeasures', status: 'live', lastUpdate: now.toISOString(), reliabilityScore: 0.95, activeCount: 3 },
    ]
  };
}
