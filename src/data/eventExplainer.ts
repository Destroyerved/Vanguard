/**
 * Vanguard Event Explainer Engine
 * Generates comprehensive tactical & plain-English simple explanations
 * for any UnifiedEvent ingested across radar, weather, personnel, log, or incident streams.
 */

import { UnifiedEvent } from '../types/schema';
import { evaluateMediaAuthenticity } from './authenticityEngine';

export interface EasyExplanation {
  simpleHeadline: string;
  simpleDescription: string;
  simpleSeverityLabel: string;
  simpleActionStep: string;
  simpleTelemetry: string;
  simpleCertainty: string;
}

export interface EventExplanation {
  summary: string;
  tacticalImpact: string;
  verificationAnalysis: string;
  telemetryBreakdown: string;
  recommendedAction: string;
  easy: EasyExplanation;
}

export function explainEvent(evt: UnifiedEvent): EventExplanation {
  const { id, sourceType, severity, title, description, confidence, confidenceBreakdown, corroboratedBy, isAnomaly, location, raw } = evt;
  const lat = typeof location?.lat === 'number' ? location.lat : 23.0225;
  const lng = typeof location?.lng === 'number' ? location.lng : 72.5714;
  const latLngStr = `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
  const mediaAudit = evaluateMediaAuthenticity(evt);

  // --- 1. TECHNICAL DETAILED EXPLANATION ---
  let summary = `Event ${id} is a ${severity.toUpperCase()}-severity ${sourceType.toUpperCase()} signal detected at ${latLngStr}. `;
  if (isAnomaly) {
    summary += `[ANOMALY FLAG ACTIVE] This event exhibits anomalous parameters deviating significantly from standard operational baselines.`;
  } else {
    summary += `Operating within baseline parameters with ${confidence}% overall fusion confidence.`;
  }

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
    case 'submarine': {
      const subDepth = raw?.depthMeters ?? Math.abs(location.altitudeMeters ?? 180);
      const frequency = raw?.acousticFreqHz ?? '120Hz cavitation';
      tacticalImpact = `Subsurface sonar contact detected at depth ${subDepth}m (Acoustic Signature: ${frequency}). Passive hydrophone towed-array tracking active anti-submarine warfare (ASW) engagement sequence.`;
      break;
    }
    case 'ground_conflict': {
      const unitType = (raw?.unitType as string) || 'Armored Column';
      const caliber = (raw?.artilleryCaliber as string) || '155mm Counter-Battery';
      tacticalImpact = `Ground combat engagement involving ${unitType}. Counter-battery radar detected active ${caliber} shell trajectory near ${latLngStr}. SALUTE spot report logged.`;
      break;
    }
    case 'social_media': {
      const platform = (raw?.platform as string) || 'Social Media OSINT';
      tacticalImpact = `Open-source social media feed ingested from ${platform}. ${mediaAudit.factualCoreExtracted}`;
      break;
    }
    case 'audio_recording': {
      const freq = raw?.acousticFreqHz || 'Acoustic Band';
      tacticalImpact = `Acoustic hydrophone / microphone recording captured near ${latLngStr} (${freq}). Acoustic spectrum match score: ${mediaAudit.acousticSpectrumScore}%. ${mediaAudit.factualCoreExtracted}`;
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

  const countCorroborated = corroboratedBy?.length || 0;
  let verificationAnalysis = `Data fusion confidence stands at ${confidence}%. Media Veracity Classification: [${mediaAudit.veracityClassification.replace(/_/g, ' ')}] (${mediaAudit.overallAuthenticityScore}% Overall Authenticity Rating). `;
  if (countCorroborated > 0) {
    verificationAnalysis += `Cross-verified by ${countCorroborated} independent sensor stream(s) [${corroboratedBy.join(', ')}], significantly reducing false-alarm probability.`;
  } else {
    verificationAnalysis += `Single-source detection — awaiting cross-sensor corroboration from adjacent radar or seismic nodes.`;
  }

  if (confidenceBreakdown) {
    verificationAnalysis += ` [Breakdown — Source Agreement: ${confidenceBreakdown.sourceAgreement}%, Spatial: ${confidenceBreakdown.spatialAgreement}%, Data Freshness: ${confidenceBreakdown.dataFreshness}%]`;
  }

  const alt = location.altitudeMeters !== undefined ? `${location.altitudeMeters}m` : 'Ground Level';
  const hdg = location.headingDegrees !== undefined ? `${location.headingDegrees}°` : 'N/A';
  const spd = location.speedKnots !== undefined ? `${location.speedKnots} kts` : 'N/A';
  const telemetryBreakdown = `Coordinates: ${latLngStr} | Altitude: ${alt} | Heading: ${hdg} | Speed: ${spd}`;

  let recommendedAction = '';
  switch (sourceType) {
    case 'weather':
      if (severity === 'critical') {
        recommendedAction = `[RED METEOROLOGICAL PROTOCOL] Ground all UAV/airborne reconnaissance assets, alert National Disaster Response Force (NDRF/FEMA), switch radar arrays to storm-penetration mode, and enforce flood/gale evacuation for field outposts.`;
      } else if (severity === 'high') {
        recommendedAction = `[ORANGE WEATHER PROTOCOL] Restrict low-altitude flight paths, elevate atmospheric sensor sampling to 500ms, and re-route optical UAV patrols around heavy rain cells.`;
      } else if (severity === 'medium') {
        recommendedAction = `[YELLOW WEATHER PROTOCOL] Log barometric trend data, notify airfield duty controllers, and verify drone weather limits.`;
      } else {
        recommendedAction = `[GREEN METEOROLOGICAL PROTOCOL] Standard weather monitoring active. Atmospheric conditions clear for routine flight corridors.`;
      }
      break;

    case 'submarine':
      if (severity === 'critical') {
        recommendedAction = `[RED ASW SONAR PROTOCOL] Scramble Airborne Anti-Submarine Warfare (ASW) P-8I / Sea King helicopters, deploy towed-array active sonar decoys (Nixie/LEAD), execute fleet evasion vector, and authorize active sonar pings.`;
      } else if (severity === 'high') {
        recommendedAction = `[ORANGE ASW PROTOCOL] Maintain passive hydrophone array tracking on sub-surface contact, elevate sonobuoy sampling rate, and notify naval duty fleet commander.`;
      } else if (severity === 'medium') {
        recommendedAction = `[YELLOW ASW PROTOCOL] Corroborate acoustic signature with thermal satellite sea-surface temp, log depth bearing.`;
      } else {
        recommendedAction = `[GREEN ASW PROTOCOL] Passive hydrophone sweep nominal. Zero cavitating propulsion anomalies detected.`;
      }
      break;

    case 'ground_conflict':
      if (severity === 'critical') {
        recommendedAction = `[RED GROUND COMBAT PROTOCOL] Scramble Counter-Battery 155mm Artillery Barrage, deploy Anti-Tank Guided Missile (ATGM) teams to Axis Alpha, order infantry units to hardened bunker positions, and request Close Air Support (CAS).`;
      } else if (severity === 'high') {
        recommendedAction = `[ORANGE GROUND COMBAT PROTOCOL] Elevate Weapon Locating Radar (WLR) sensitivity, dispatch Quick Reaction Force (QRF) to fortified perimeter, and lock track on ground column.`;
      } else if (severity === 'medium') {
        recommendedAction = `[YELLOW GROUND COMBAT PROTOCOL] Increase Ground Surveillance Radar (GSR) sampling, dispatch reconnaissance drone to sector.`;
      } else {
        recommendedAction = `[GREEN GROUND COMBAT PROTOCOL] Ground Surveillance Radar (GSR) perimeter clear. Routine troop rotation active.`;
      }
      break;

    case 'radar':
      if (severity === 'critical') {
        recommendedAction = `[RED AIR DEFENCE PROTOCOL] Scramble Combat Air Patrol (CAP) fighter interceptors, arm S-400 / Patriot Surface-to-Air Missile (SAM) batteries, broadcast emergency Guard frequency IFF challenge, and authorize weapons-free intercept protocol.`;
      } else if (severity === 'high') {
        recommendedAction = `[ORANGE AIR DEFENCE PROTOCOL] Elevate primary radar lock-on rate to 500ms, alert regional air sector commander, and initiate secondary optical tracker correlation.`;
      } else if (severity === 'medium') {
        recommendedAction = `[YELLOW AIR DEFENCE PROTOCOL] Request civil ATC transponder confirmation and maintain passive radar vector tracking.`;
      } else {
        recommendedAction = `[GREEN AIR DEFENCE PROTOCOL] Airspace corridor clear. All tracks matched against scheduled civil flight plans.`;
      }
      break;

    case 'log':
      if (severity === 'critical') {
        recommendedAction = `[RED CYBER / EW PROTOCOL] Isolate infected server subnet, switch command communications to frequency-hopping ECCM channels, initiate emergency cryptokey rotation, and trigger SOC threat-hunting protocol.`;
      } else if (severity === 'high') {
        recommendedAction = `[ORANGE CYBER PROTOCOL] Flag IP range on firewall perimeter, enable deep packet inspection, and alert cyber defence duty engineer.`;
      } else if (severity === 'medium') {
        recommendedAction = `[YELLOW CYBER PROTOCOL] Audit system authentication logs and elevate SOC monitoring sensitivity.`;
      } else {
        recommendedAction = `[GREEN CYBER PROTOCOL] Perimeter firewall logs nominal. Routine zero-trust audit active.`;
      }
      break;

    case 'personnel':
      if (severity === 'critical') {
        recommendedAction = `[RED FORCE PROTECTION PROTOCOL] Dispatch Quick Reaction Force (QRF) backup squad, establish 360° perimeter cordon, request emergency MEDEVAC chopper standby, and lock down Outpost.`;
      } else if (severity === 'high') {
        recommendedAction = `[ORANGE FORCE PROTECTION PROTOCOL] Reinforce perimeter watch posts, elevate squad comms check to 15-minute intervals, and prepare reserve unit standby.`;
      } else if (severity === 'medium') {
        recommendedAction = `[YELLOW FORCE PROTECTION PROTOCOL] Verify team GPS beacon sync and request routine squad status update.`;
      } else {
        recommendedAction = `[GREEN FORCE PROTECTION PROTOCOL] All patrol squads reporting nominal position beacons and full operational readiness.`;
      }
      break;

    case 'incident':
    default:
      if (severity === 'critical') {
        recommendedAction = `[RED INCIDENT PROTOCOL] Dispatch local field tactical unit, establish Incident Command Post (ICP), notify regional defense headquarters, and initiate live UAV video sweep.`;
      } else if (severity === 'high') {
        recommendedAction = `[ORANGE INCIDENT PROTOCOL] Assign duty officer investigation, log sensor timestamps, and request secondary reconnaissance verification.`;
      } else if (severity === 'medium') {
        recommendedAction = `[YELLOW INCIDENT PROTOCOL] Log incident details into tactical ledger and continue passive surveillance.`;
      } else {
        recommendedAction = `[GREEN INCIDENT PROTOCOL] Incident resolved and logged in central database. No further operational dispatch required.`;
      }
      break;
  }

  // --- 2. EASY PLAIN-ENGLISH SIMPLE EXPLANATION ---
  let simpleHeadline = '';
  let simpleDescription = '';

  switch (sourceType) {
    case 'radar':
      if (isAnomaly || severity === 'critical' || severity === 'high') {
        simpleHeadline = `⚠️ Unidentified Aircraft Flying Near Boundary`;
        simpleDescription = `An unidentified aircraft or drone was spotted flying at high speed. It is not broadcasting a standard civilian flight code, so it needs to be checked.`;
      } else {
        simpleHeadline = `✈️ Regular Aircraft Flight In Progress`;
        simpleDescription = `A standard registered aircraft is flying normally along its assigned flight path. Everything looks routine and safe.`;
      }
      break;
    case 'weather':
      simpleHeadline = `🌧️ Bad Weather Warning (High Winds / Rain)`;
      simpleDescription = `Sensors detected strong winds or heavy rain in the area. This can make drone flying unsafe and disrupt clear visibility.`;
      break;
    case 'log':
      simpleHeadline = `🔒 Security System Alert`;
      simpleDescription = `The computer security system noticed suspicious login activity or a network glitch. The system is protecting against unauthorized access.`;
      break;
    case 'personnel':
      simpleHeadline = `👮 Patrol Team Status Update`;
      simpleDescription = `Ground security team update: Units are on duty and monitoring their assigned security patrol zone.`;
      break;
    case 'submarine':
      simpleHeadline = `🌊 Underwater Submarine Contact Detected`;
      simpleDescription = `Sonar sensors underwater detected acoustic signatures from a submarine operating at depth (~180m). Anti-submarine sonar tracking systems are monitoring its position.`;
      break;
    case 'ground_conflict':
      simpleHeadline = `🪖 Ground Army Combat & Artillery Activity`;
      simpleDescription = `Counter-battery radar and field spotters detected armored combat units or artillery engagement on the ground. Defense monitoring units are actively tracking movement.`;
      break;
    case 'social_media':
      if (mediaAudit.veracityClassification === 'HYBRID_AI_AUTHENTIC_FACT') {
        simpleHeadline = `🟡 Social Media Video Post (AI Voice/Edit + Authentic Satellite Verified Fact)`;
        simpleDescription = `An Instagram/X post uses AI voice or video editing, BUT satellite and radar sensors confirm the core physical event actually happened at these coordinates.`;
      } else if (mediaAudit.veracityClassification === 'SYNTHETIC_DISINFORMATION') {
        simpleHeadline = `🚨 Fake News / Deepfake Social Media Post Warning`;
        simpleDescription = `AI deepfake media detected on social media. Zero satellite or radar sensors match this claim. Treat as synthetic disinformation.`;
      } else {
        simpleHeadline = `📱 Social Media OSINT Event Report`;
        simpleDescription = `An open-source social media video or post was filed. System checked EXIF metadata and sensor alignment.`;
      }
      break;
    case 'audio_recording':
      simpleHeadline = `🎙️ Acoustic Sound Recording & Spectral Signature`;
      simpleDescription = `Microphone / hydrophone acoustic sensors recorded audio frequency signatures. Audio waveform audit: ${mediaAudit.acousticSpectrumScore}% natural match.`;
      break;
    case 'incident':
      simpleHeadline = `🚨 Field Incident: ${title}`;
      if (title.toLowerCase().includes('medical')) {
        simpleDescription = `Medical assistance requested: A field unit urgently requires emergency medical support, first aid, or medical evacuation at these coordinates.`;
      } else if (title.toLowerCase().includes('fire') || title.toLowerCase().includes('smoke')) {
        simpleDescription = `Fire or heat hazard reported: Thermal or smoke sensors detected an active fire hazard requiring immediate containment.`;
      } else if (title.toLowerCase().includes('breach') || title.toLowerCase().includes('fence')) {
        simpleDescription = `Perimeter fence alert: Sensors or patrol units detected potential movement across the boundary line.`;
      } else {
        simpleDescription = `Field incident logged: "${title}". ${description ? description : 'Local responders or duty officers need to verify the situation.'}`;
      }
      break;
    default:
      simpleHeadline = `📌 ${title}`;
      simpleDescription = description || `Event '${title}' was recorded for operational monitoring.`;
      break;
  }

  let simpleSeverityLabel = '';
  let simpleActionStep = '';

  switch (severity) {
    case 'critical':
      simpleSeverityLabel = '🚨 High Priority Alert (Requires Immediate Attention)';
      break;
    case 'high':
      simpleSeverityLabel = '⚠️ Important Warning (Keep Watching)';
      break;
    case 'medium':
      simpleSeverityLabel = '🟡 Caution (General Monitoring)';
      break;
    default:
      simpleSeverityLabel = '🟢 Normal / All Clear';
      break;
  }

  // Domain-Specific Simple Action Steps
  switch (sourceType) {
    case 'weather':
      if (severity === 'critical') {
        simpleActionStep = 'What to do: Emergency storm alert! Ground all drones immediately, send disaster response teams to secure field outposts, and move personnel away from flood or gale zones.';
      } else if (severity === 'high') {
        simpleActionStep = 'What to do: Weather hazard warning. Keep drones on standby, monitor storm movement on radar, and reroute patrol teams.';
      } else {
        simpleActionStep = 'What to do: Clear weather. Continue normal patrol and flight operations.';
      }
      break;

    case 'submarine':
      if (severity === 'critical') {
        simpleActionStep = "What to do: Critical underwater submarine threat! Launch anti-submarine helicopters, fire acoustic torpedo decoys, and direct ships to maneuver away from the target's sonar lock.";
      } else if (severity === 'high') {
        simpleActionStep = 'What to do: Submarine contact detected. Keep listening with underwater sonar sensors and alert naval fleet command.';
      } else {
        simpleActionStep = 'What to do: All underwater quiet. Passive ocean sonar is tracking normally.';
      }
      break;

    case 'ground_conflict':
      if (severity === 'critical') {
        simpleActionStep = 'What to do: Heavy ground battle alert! Move troops into armored bunkers, dispatch anti-tank missile squads, and order counter-artillery support fire.';
      } else if (severity === 'high') {
        simpleActionStep = 'What to do: Ground threat active. Send backup infantry patrols to the perimeter fence and keep radar locked on moving armored vehicles.';
      } else {
        simpleActionStep = 'What to do: Ground perimeter secure. Routine guard patrols active.';
      }
      break;

    case 'radar':
      if (severity === 'critical') {
        simpleActionStep = 'What to do: Unidentified hostile aircraft alert! Launch fighter jets to intercept immediately, prepare air defense missiles, and issue warning broadcasts on emergency channels.';
      } else if (severity === 'high') {
        simpleActionStep = 'What to do: Airspace warning. Keep radar locked on the aircraft, alert flight controllers, and verify its flight path.';
      } else {
        simpleActionStep = 'What to do: Civilian flight corridor normal. Everything is safe.';
      }
      break;

    case 'log':
      if (severity === 'critical') {
        simpleActionStep = 'What to do: Severe cyber attack or radio jamming detected! Isolate compromised network servers immediately, change security keys, and switch radios to jamming-resistant channels.';
      } else if (severity === 'high') {
        simpleActionStep = 'What to do: Suspicious computer activity detected. Block the IP address and monitor network traffic closely.';
      } else {
        simpleActionStep = 'What to do: Computer systems safe. Routine security check passed.';
      }
      break;

    case 'personnel':
      if (severity === 'critical') {
        simpleActionStep = 'What to do: Emergency squad help request! Send a Quick Reaction Backup Team immediately, lock down the base perimeter, and prepare medical helicopter evacuation.';
      } else if (severity === 'high') {
        simpleActionStep = 'What to do: Patrol squad needs backup monitoring. Check in with ground teams every 15 minutes.';
      } else {
        simpleActionStep = 'What to do: All patrol teams safe and reporting in on schedule.';
      }
      break;

    case 'incident':
    default:
      if (severity === 'critical') {
        simpleActionStep = 'What to do: Major field incident reported! Send an emergency response team immediately and establish a field command station.';
      } else if (severity === 'high') {
        simpleActionStep = 'What to do: Field incident logged. Send a supervisor to inspect the location and verify the situation.';
      } else {
        simpleActionStep = 'What to do: Routine notice resolved. No special action needed.';
      }
      break;
  }

  const speedKmh = location?.speedKnots ? Math.round(location.speedKnots * 1.852) : null;
  const altFt = location?.altitudeMeters ? Math.round(location.altitudeMeters * 3.28084) : null;

  let simpleTelemetry = location && typeof location.lat === 'number' && typeof location.lng === 'number'
    ? `Location: Sector near (${location.lat.toFixed(2)}°, ${location.lng.toFixed(2)}°)`
    : 'Location: Tactical Grid AO';
  if (speedKmh) simpleTelemetry += ` | Speed: ~${speedKmh} km/h`;
  if (altFt) simpleTelemetry += ` | Height: ~${altFt} feet above ground`;

  let simpleCertainty = '';
  if (confidence >= 85) {
    simpleCertainty = `✅ Highly Certain (${confidence}% accuracy confirmed by multiple sensors)`;
  } else if (confidence >= 60) {
    simpleCertainty = `🟡 Moderately Certain (${confidence}% accuracy confirmed by 1 sensor)`;
  } else {
    simpleCertainty = `❓ Unconfirmed (${confidence}% confidence — waiting for extra sensor confirmation)`;
  }

  const easy: EasyExplanation = {
    simpleHeadline,
    simpleDescription,
    simpleSeverityLabel,
    simpleActionStep,
    simpleTelemetry,
    simpleCertainty,
  };

  return {
    summary,
    tacticalImpact,
    verificationAnalysis,
    telemetryBreakdown,
    recommendedAction,
    easy,
  };
}
