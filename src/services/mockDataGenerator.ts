import type { AISummary, CourseOfAction, RadarTarget, RafaleState, SourceHealth, UnifiedEvent } from '../types/vanguard';
import { computeConfidence } from './fusionEngine';

// Center of Strategic Frontier Operational Theater
export const THEATER_CENTER = {
  lat: 34.1526,
  lng: 77.5771,
  name: 'SECTOR-7 NORTHERN FRONTIER COMMAND'
};

// Seed baseline events
export function generateInitialEvents(): UnifiedEvent[] {
  const now = Date.now();
  const rawEvents: Array<Omit<UnifiedEvent, 'confidence' | 'confidenceBreakdown' | 'corroboratedBy'>> = [
    {
      id: 'EV-4091',
      sourceType: 'radar',
      timestamp: new Date(now - 3 * 60 * 1000).toISOString(),
      location: { lat: 34.385, lng: 77.892, altitudeMeters: 11200, headingDegrees: 224, speedKnots: 640 },
      severity: 'critical',
      title: 'Hostile Kinematic Track #HK-709',
      description: 'High-speed stealth profile contact detected ingress towards Red Line boundary at Mach 1.15. Non-responsive to IFF challenge.',
      isAnomaly: true,
      affiliation: 'hostile',
      callsign: 'BOGEY-RED-01',
      classification: '5th Gen Air Superiority Asset',
      raw: { rcs_m2: 0.05, prf_khz: 14.2, doppler_radial_mps: -310 }
    },
    {
      id: 'EV-4092',
      sourceType: 'log',
      timestamp: new Date(now - 5 * 60 * 1000).toISOString(),
      location: { lat: 34.340, lng: 77.820, altitudeMeters: 4100 },
      severity: 'high',
      title: 'Forward Tripwire EW Interference',
      description: 'Sensor node Bravo-4 reported localized broadband RF jamming across X-band frequencies (8.5 - 10.2 GHz).',
      isAnomaly: true,
      raw: { jammer_power_dbm: 78, azimuth_deg: 44, confidence_rssi: -42 }
    },
    {
      id: 'EV-4093',
      sourceType: 'incident',
      timestamp: new Date(now - 7 * 60 * 1000).toISOString(),
      location: { lat: 34.310, lng: 77.750, altitudeMeters: 3800 },
      severity: 'high',
      title: 'Tactical Recon Dispatch #TR-12',
      description: 'Ground observer unit Bravo-Echo visual confirmation of twin-engine delta-canard fighter contrail heading south-west.',
      isAnomaly: false,
      raw: { observer_unit: '7th Ladakh Scouts', optics: 'Thermal Flir-90', visual_bearing: 220 }
    },
    {
      id: 'EV-4094',
      sourceType: 'weather',
      timestamp: new Date(now - 12 * 60 * 1000).toISOString(),
      location: { lat: 34.220, lng: 77.610, altitudeMeters: 0 },
      severity: 'medium',
      title: 'High Altitude Mountain Turbulence & Jet Stream',
      description: 'Open-Meteo telemetry indicates severe wind sheer at FL350 (68 kts from 310°) with cloud ceiling dropping to 2,200m.',
      isAnomaly: false,
      raw: { wind_speed_kmh: 126, visibility_km: 4.2, temp_c: -22, baro_hpa: 610 }
    },
    {
      id: 'EV-4095',
      sourceType: 'personnel',
      timestamp: new Date(now - 15 * 60 * 1000).toISOString(),
      location: { lat: 34.080, lng: 77.490, altitudeMeters: 3600 },
      severity: 'low',
      title: 'S-400 Triumf Battery SAM-Alpha Alert',
      description: 'Air defense missile brigade 14 radar in active tracking mode. 9M96E2 missiles prepped in launcher canisters.',
      isAnomaly: false,
      affiliation: 'friendly',
      callsign: 'IRON-DOME-NORTH',
      classification: 'Surface-to-Air Missile System',
      raw: { ready_missiles: 16, radar_lock_target: 'BOGEY-RED-01', engagement_envelope_km: 250 }
    },
    {
      id: 'EV-4096',
      sourceType: 'radar',
      timestamp: new Date(now - 2 * 60 * 1000).toISOString(),
      location: { lat: 33.950, lng: 77.380, altitudeMeters: 13500, headingDegrees: 35, speedKnots: 780 },
      severity: 'low',
      title: 'Friendly Combat Air Patrol #CAP-VANGUARD',
      description: 'Rafale F4 Multirole Jet (Callsign: VANGUARD-LEADER) maintaining orbit at FL440 armed with ASMP-A and Meteor BVRAAM.',
      isAnomaly: false,
      affiliation: 'friendly',
      callsign: 'VANGUARD-01 (RAFALE F4)',
      classification: 'Omnirole Strategic Air Dominance',
      raw: { fuel_lbs: 9400, data_link_16: 'ACTIVE_LOCKED', weapon_status: 'ASMP-A NUCLEAR CRUISE ARMED' }
    },
    {
      id: 'EV-4097',
      sourceType: 'incident',
      timestamp: new Date(now - 22 * 60 * 1000).toISOString(),
      location: { lat: 34.450, lng: 78.100, altitudeMeters: 5200 },
      severity: 'critical',
      title: 'Hostile Command Bunker Complex #ALPHA-ZERO',
      description: 'Deep underground fortified C4I command facility identified orchestrating synchronized border air and cyber incursions.',
      isAnomaly: true,
      affiliation: 'hostile',
      callsign: 'HQ-BUNKER-OMEGA',
      classification: 'Strategic Hardened Target',
      raw: { depth_m: 65, hardening_concrete_psi: 8000, importance: 'PRIORITY_ALPHA_STRIKE' }
    },
    {
      id: 'EV-4098',
      sourceType: 'radar',
      timestamp: new Date(now - 8 * 60 * 1000).toISOString(),
      location: { lat: 34.020, lng: 78.220, altitudeMeters: 8900, headingDegrees: 280, speedKnots: 420 },
      severity: 'medium',
      title: 'Unidentified Medium-Altitude Drone Contact',
      description: 'High endurance reconnaissance UAV loitering near eastern ridgeline. Emitting encrypted synthetic aperture radar pulses.',
      isAnomaly: false,
      affiliation: 'unknown',
      callsign: 'UNKNOWN-UAV-44',
      classification: 'MALE Surveillance UAV',
      raw: { rcs_m2: 0.8, downlink_ghz: 14.5 }
    }
  ];

  // Corroborate and score
  return rawEvents.map((evt) => {
    // Determine corroboration IDs
    const corroborations: string[] = [];
    if (evt.id === 'EV-4091') corroborations.push('EV-4092', 'EV-4093');
    if (evt.id === 'EV-4092') corroborations.push('EV-4091');
    if (evt.id === 'EV-4093') corroborations.push('EV-4091');

    const { overall, breakdown } = computeConfidence(evt.sourceType, evt.timestamp, corroborations.length);

    return {
      ...evt,
      confidence: overall,
      confidenceBreakdown: breakdown,
      corroboratedBy: corroborations
    };
  });
}

// Generate Live AI Briefing
export function generateInitialBriefing(): AISummary {
  const coursesOfAction: CourseOfAction[] = [
    {
      id: 'COA-1',
      codename: 'OPERATION LIGHTNING INTERCEPT',
      title: 'Forward Combat Air Patrol (CAP) Interception',
      description: 'Vector Rafale F4 (VANGUARD-01) to intercept Hostile Track #HK-709 using Beyond Visual Range (BVR) Meteor missiles under active radar guidance from S-400 SAM-Alpha.',
      pros: [
        'Neutralizes hostile intruder prior to airspace boundary violation',
        'Zero collateral damage risk in high altitude corridor',
        'Demonstrates immediate defensive readiness'
      ],
      tradeoffs: [
        'Exposes Rafale fighter radar emissions to enemy SIGINT collectors',
        'Risk of rapid escalation to kinetic engagement'
      ],
      recommendedUrgency: 4,
      successProbability: 92,
      collateralRisk: 'LOW'
    },
    {
      id: 'COA-2',
      codename: 'SHIELD PERIMETER CONTAINMENT',
      title: 'SAM-Alpha Tracking Lock & Electronic Warfare Counter',
      description: 'Engage S-400 target acquisition radar in hard lock mode while deploying ground-based EW jamming against incoming telemetry and UAV-44 datalinks.',
      pros: [
        'Leaves airborne strike assets in reserve',
        'Low risk of airframe loss',
        'Suppresses hostile reconnaissance downlinks'
      ],
      tradeoffs: [
        'Does not destroy penetrating airframe',
        'Relies heavily on ground radar survivability'
      ],
      recommendedUrgency: 3,
      successProbability: 84,
      collateralRisk: 'LOW'
    },
    {
      id: 'COA-3',
      codename: 'OPERATION VANGUARD WRATH (TACTICAL RETALIATION)',
      title: 'Rafale ASMP-A Precision Tactical Nuclear Strike on HQ-BUNKER-OMEGA',
      description: 'Authorize two-man PAL code sequence for Rafale F4 to deliver 300 kT ASMP-A stand-off ramjet missile against deep underground command complex HQ-BUNKER-OMEGA.',
      pros: [
        'Decapitates hostile C4I node in a single hypersonic strike',
        'Guaranteed penetration through hardened bunker structures',
        'Absolute strategic deterrence message'
      ],
      tradeoffs: [
        'DEFCON 1 strategic nuclear threshold crossing',
        'Atmospheric radioactive fallout dispersion over eastern valleys',
        'Requires National Command Authority Permissive Action Link code authorization'
      ],
      recommendedUrgency: 5,
      successProbability: 99,
      collateralRisk: 'EXTREME'
    }
  ];

  return {
    generatedAt: new Date().toISOString(),
    threatLevel: 'orange',
    headline: 'CRITICAL INGRESS DETECTED IN SECTOR-7: MULTI-DOMAIN CORROBORATION CONFIRMED',
    executiveSummary: 'Multiple intelligence streams (Primary Radar #R-709, Forward EW Sensor #B-4, and Tactical Recon #TR-12) have corroborated a 5th-generation hostile air incursion heading south-west at Mach 1.15. Concurrently, hostile underground command node HQ-BUNKER-OMEGA has initiated encrypted high-gain datalink transmissions.',
    keyDevelopments: [
      {
        point: 'Hostile contact #HK-709 entered designated restricted airspace sector at 36,700 ft with zero transponder response.',
        supportingEventIds: ['EV-4091', 'EV-4093']
      },
      {
        point: 'Forward tripwire reported synchronized broadband X-band radar jamming to mask the ingress trajectory.',
        supportingEventIds: ['EV-4092']
      },
      {
        point: 'Rafale F4 (VANGUARD-01) is on combat air patrol armed with ASMP-A tactical stand-off weapon systems.',
        supportingEventIds: ['EV-4096']
      },
      {
        point: 'Hostile Command Bunker #ALPHA-ZERO identified as coordinating command node for regional incursions.',
        supportingEventIds: ['EV-4097']
      }
    ],
    prioritizedActions: [
      {
        action: 'Authorize Rafale F4 engagement vector and arm BVR / Tactical stand-off stations',
        urgency: 5,
        supportingEventIds: ['EV-4091', 'EV-4096'],
        department: 'Tactical Air Command'
      },
      {
        action: 'Activate S-400 SAM Battery tracking radar into auto-defense engagement mode',
        urgency: 4,
        supportingEventIds: ['EV-4095', 'EV-4091'],
        department: 'Air Defense Division'
      },
      {
        action: 'Deploy counter-EW frequency hopping on ground-to-air radio channels',
        urgency: 3,
        supportingEventIds: ['EV-4092'],
        department: 'Cyber & Electronic Warfare'
      }
    ],
    coursesOfAction
  };
}

// Initial Source Health Telemetry
export function generateInitialSourceHealth(): SourceHealth[] {
  return [
    {
      sourceType: 'radar',
      sourceName: '3D PESA/AESA Primary Radar Grid',
      status: 'live',
      lastUpdate: 'Just now',
      reliabilityScore: 0.94,
      activeCount: 14,
      latencyMs: 38
    },
    {
      sourceType: 'weather',
      sourceName: 'Open-Meteo Global Atmospheric Feed',
      status: 'live',
      lastUpdate: '2m ago',
      reliabilityScore: 0.98,
      activeCount: 8,
      latencyMs: 110
    },
    {
      sourceType: 'personnel',
      sourceName: 'Blue Force Tracker & Asset C2',
      status: 'live',
      lastUpdate: '1m ago',
      reliabilityScore: 0.91,
      activeCount: 22,
      latencyMs: 65
    },
    {
      sourceType: 'log',
      sourceName: 'Automated Tripwire & Perimeter Telemetry',
      status: 'degraded',
      lastUpdate: '4m ago',
      reliabilityScore: 0.88,
      activeCount: 36,
      latencyMs: 240
    },
    {
      sourceType: 'incident',
      sourceName: 'Tactical Recon Dispatches & HUMINT',
      status: 'live',
      lastUpdate: '3m ago',
      reliabilityScore: 0.82,
      activeCount: 6,
      latencyMs: 180
    }
  ];
}

// Initial Rafale F4 fighter jet state
export function generateInitialRafaleState(): RafaleState {
  return {
    callsign: 'VANGUARD-01',
    tailNumber: 'RAF-F4-409',
    squadron: '17th Golden Arrows / Strategic Air Forces',
    speedMach: 1.84,
    altitudeFt: 45200,
    gLoad: 4.8,
    headingDeg: 42,
    pitchDeg: 4.5,
    rollDeg: -2.0,
    fuelPercent: 84,
    masterArm: true,
    radarMode: 'RBE2-AESA TWS',
    weaponStations: [
      { station: 'STA-1 (PORT WINGTIP)', weapon: 'MICA-EM BVRAAM', status: 'READY' },
      { station: 'STA-2 (PORT UNDERWING)', weapon: 'METEOR RAMJET BVRAAM', status: 'READY' },
      { station: 'STA-3 (CENTERLINE FUSELAGE)', weapon: 'ASMP-A TACTICAL NUCLEAR CRUISE', status: 'ARMED', yieldKt: 300 },
      { station: 'STA-4 (STBD UNDERWING)', weapon: 'METEOR RAMJET BVRAAM', status: 'READY' },
      { station: 'STA-5 (STBD WINGTIP)', weapon: 'MICA-IR HEATSEEKER', status: 'READY' }
    ],
    currentLocation: {
      lat: 33.950,
      lng: 77.380,
      altitudeMeters: 13770,
      headingDegrees: 42,
      speedKnots: 1100
    },
    targetLocation: {
      lat: 34.450,
      lng: 78.100,
      altitudeMeters: 5200
    },
    targetCallsign: 'HQ-BUNKER-OMEGA (HOSTILE STRATEGIC NODE)',
    strikePhase: 'IDLE',
    countdownSeconds: 5,
    hypersonicProgress: 0,
    palCodeEntered: '',
    palCodeRequired: 'OMEGA-774-ALPHA'
  };
}

// Radar Targets around the radar center
export function generateInitialRadarTargets(): RadarTarget[] {
  return [
    {
      id: 'RT-101',
      callsign: 'BOGEY-RED-01 (J-20)',
      distanceNm: 48.2,
      bearingDeg: 38,
      headingDeg: 224,
      speedKnots: 640,
      altitudeFt: 36700,
      affiliation: 'hostile',
      dopplerShiftKhz: -14.8,
      lat: 34.385,
      lng: 77.892,
      lastPingMs: 120
    },
    {
      id: 'RT-102',
      callsign: 'VANGUARD-01 (RAFALE F4)',
      distanceNm: 22.4,
      bearingDeg: 215,
      headingDeg: 42,
      speedKnots: 1100,
      altitudeFt: 45200,
      affiliation: 'friendly',
      dopplerShiftKhz: 22.4,
      lat: 33.950,
      lng: 77.380,
      lastPingMs: 45
    },
    {
      id: 'RT-103',
      callsign: 'UNKNOWN-UAV-44',
      distanceNm: 62.1,
      bearingDeg: 78,
      headingDeg: 280,
      speedKnots: 180,
      altitudeFt: 29000,
      affiliation: 'unknown',
      dopplerShiftKhz: -4.2,
      lat: 34.020,
      lng: 78.220,
      lastPingMs: 340
    },
    {
      id: 'RT-104',
      callsign: 'AWACS-NETRA-02',
      distanceNm: 78.5,
      bearingDeg: 195,
      headingDeg: 350,
      speedKnots: 450,
      altitudeFt: 38000,
      affiliation: 'friendly',
      dopplerShiftKhz: 11.0,
      lat: 33.620,
      lng: 77.150,
      lastPingMs: 80
    },
    {
      id: 'RT-105',
      callsign: 'HOSTILE-FLANKER-02',
      distanceNm: 85.0,
      bearingDeg: 28,
      headingDeg: 210,
      speedKnots: 590,
      altitudeFt: 32000,
      affiliation: 'hostile',
      dopplerShiftKhz: -12.6,
      lat: 34.620,
      lng: 77.950,
      lastPingMs: 210
    }
  ];
}
