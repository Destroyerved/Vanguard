/**
 * Vanguard Live Kinematic Track Movement Simulator
 * Updates positional vectors (lat, lng, heading, altitude) in real-time
 * so radar contacts dynamically move across the tactical map display.
 */

import { UnifiedEvent } from '../types/schema';

/**
 * Updates event coordinates based on velocity (speedKnots) and heading (headingDegrees)
 * @param event Existing UnifiedEvent
 * @param deltaSeconds Time elapsed in seconds (default: 1 sec)
 */
export function updateKinematicPosition(event: UnifiedEvent, deltaSeconds = 1): UnifiedEvent {
  if (event.sourceType !== 'radar' && event.sourceType !== 'personnel') {
    return event;
  }

  const loc = { ...event.location };
  const speedKnots = loc.speedKnots || 100;
  const headingDeg = loc.headingDegrees || 0;

  // Convert knots to km/s: 1 knot = 0.000514444 km/s
  const speedKmPerSec = speedKnots * 0.000514444;
  const distKm = speedKmPerSec * deltaSeconds;

  // Convert heading to radians (0 deg = North, 90 deg = East)
  const headingRad = (headingDeg * Math.PI) / 180;

  // 1 degree latitude ~= 111 km
  const deltaLat = (distKm * Math.cos(headingRad)) / 111;
  // 1 degree longitude ~= 111 km * cos(lat)
  const deltaLng = (distKm * Math.sin(headingRad)) / (111 * Math.cos((loc.lat * Math.PI) / 180));

  const updatedLat = Number((loc.lat + deltaLat).toFixed(6));
  const updatedLng = Number((loc.lng + deltaLng).toFixed(6));

  return {
    ...event,
    timestamp: new Date().toISOString(),
    location: {
      ...loc,
      lat: updatedLat,
      lng: updatedLng,
    }
  };
}

/**
 * Updates an array of events with continuous kinematic movement
 */
export function stepKinematicSimulation(events: UnifiedEvent[], deltaSeconds = 1): UnifiedEvent[] {
  return events.map(e => updateKinematicPosition(e, deltaSeconds));
}
