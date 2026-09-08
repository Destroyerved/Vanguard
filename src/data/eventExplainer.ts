/**
 * Vanguard Event Explainer Engine
 * Generates comprehensive, plain-English tactical & intelligence explanations
 * for any UnifiedEvent ingested across radar, weather, personnel, log, or incident streams.
 */

import { UnifiedEvent } from '../types/schema';

export interface EventExplanation {
  summary: string;
  tacticalImpact: string;
  verificationAnalysis: string;
  telemetryBreakdown: string;
  recommendedAction: string;
}

export function explainEvent(evt: UnifiedEvent): EventExplanation {
  const { id, sourceType, severity, title, description, confidence, confidenceBreakdown, corroboratedBy, isAnomaly, location, raw } = evt;
  const latLngStr = `${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E`;

  // 1. Executive Summary
  let summary = `Event ${id} is a ${severity.toUpperCase()}-severity ${sourceType.toUpperCase()} signal detected at ${latLngStr}. `;
  if (isAnomaly) {
    summary += `[ANOMALY FLAG ACTIVE] This event exhibits anomalous parameters deviating significantly from standard operational baselines.`;
  } else {
    summary += `Operating within baseline parameters with ${confidence}% overall fusion confidence.`;
  }

  // 2. Tactical Impact Analysis
  let tacticalImpact = '';
  switch (sourceType) {
    case 'radar': {
      const callsign = (raw?.callsign as string) || (raw?.flightNumber as string) || 'UNREGISTERED TARGET';
      const squawk = (raw?.squawk as string) || 'N/A';
      if (isAnomaly || severity === 'critical' || severity === 'high') {
        tacticalImpact = `Airspace track '${callsign}' (Squawk: ${squawk}) presents a potential air defence concern. Unscheduled flight path or non-standard transponder signal detected near key sector boundaries.`;
      } else {
        tacticalImpact = `Routine aerial track '${callsign}' maintaining registered flight corridor with stable kinematic vectors.`;
      }
      break;
    }
    case 'weather': {
      const windSpeed = raw?.wind_speed_10m ?? location.speedKnots ?? 'N/A';
      const temp = raw?.temperature_2m ?? 'N/A';
      tacticalImpact = `Atmospheric hazard near ${latLngStr}. Ambient conditions (Wind: ${windSpeed} kts, Temp: ${temp}°C) directly affect UAV flight stability, radar propagation, and field communications.`;
      break;
    }
    case 'log': {
      const service = (raw?.serviceName as string) || 'Core System';
      const ip = (raw?.ipAddress as string) || 'Internal Subnet';
      tacticalImpact = `Cyber audit alert on ${service} originating from ${ip}. ${description}. Potential unauthorized access or infrastructure anomaly detected in perimeter logs.`;
      break;
    }
    case 'personnel': {
      const unit = (raw?.unitCallsign as string) || 'Tactical Unit';
      tacticalImpact = `Field force update for '${unit}'. Status report indicates ${description}. Critical for maintaining troop readiness and tactical perimeter security.`;
      break;
    }
    case 'incident': {
      const reporter = (raw?.reporter as string) || 'Command Post';
      tacticalImpact = `Ground operational incident reported by ${reporter}. ${title} requires immediate tactical assessment to avoid situational escalation.`;
      break;
    }
    default: {
      tacticalImpact = `Operational alert '${title}' requires active monitoring across defense channels.`;
    }
  }

  // 3. Verification & Sensor Agreement Analysis
  const countCorroborated = corroboratedBy?.length || 0;
  let verificationAnalysis = `Data fusion confidence stands at ${confidence}%. `;
  if (countCorroborated > 0) {
    verificationAnalysis += `Cross-verified by ${countCorroborated} independent sensor stream(s) [${corroboratedBy.join(', ')}], significantly reducing false-alarm probability.`;
  } else {
    verificationAnalysis += `Single-source detection — awaiting cross-sensor corroboration from adjacent radar or seismic nodes.`;
  }

  if (confidenceBreakdown) {
    verificationAnalysis += ` [Breakdown — Source Agreement: ${confidenceBreakdown.sourceAgreement}%, Spatial: ${confidenceBreakdown.spatialAgreement}%, Data Freshness: ${confidenceBreakdown.dataFreshness}%]`;
  }

  // 4. Telemetry Breakdown
  const alt = location.altitudeMeters !== undefined ? `${location.altitudeMeters}m` : 'Ground Level';
  const hdg = location.headingDegrees !== undefined ? `${location.headingDegrees}°` : 'N/A';
  const spd = location.speedKnots !== undefined ? `${location.speedKnots} kts` : 'N/A';
  const telemetryBreakdown = `Coordinates: ${latLngStr} | Altitude: ${alt} | Heading: ${hdg} | Speed: ${spd}`;

  // 5. Recommended Action Protocol
  let recommendedAction = '';
  switch (severity) {
    case 'critical':
      recommendedAction = `[RED PROTOCOL] Dispatch immediate quick-reaction force (QRF), isolate affected network segment, and trigger real-time audio briefing.`;
      break;
    case 'high':
      recommendedAction = `[ORANGE PROTOCOL] Elevate sensor sampling rate to 1000ms, alert duty commander, and maintain lock on track ${id}.`;
      break;
    case 'medium':
      recommendedAction = `[YELLOW PROTOCOL] Assign secondary verification radar and log telemetry for multi-source correlation audit.`;
      break;
    default:
      recommendedAction = `[GREEN PROTOCOL] Continue routine automated logging and passive sensor sweep. No emergency dispatch required.`;
      break;
  }

  return {
    summary,
    tacticalImpact,
    verificationAnalysis,
    telemetryBreakdown,
    recommendedAction,
  };
}
