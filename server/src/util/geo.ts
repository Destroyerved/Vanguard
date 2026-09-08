/**
 * VANGUARD — geospatial primitives.
 *
 * All distances are metres, all bearings are degrees clockwise from true north,
 * all coordinates are WGS-84 decimal degrees in { lat, lng } form. GeoJSON's
 * [lng, lat] ordering is confined to the serialization helpers at the bottom.
 */

/** Mean Earth radius, metres (IUGG). */
export const EARTH_RADIUS_M = 6_371_008.8;

export interface LatLng {
  lat: number;
  lng: number;
}

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/**
 * Great-circle distance between two points, metres, via the haversine formula.
 *
 * Haversine is used rather than the flat-earth approximation because the
 * correlation radius (5 km) and the AO span (90 km) are large enough that
 * planar error would bias clustering near the AO edges.
 */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from `a` to `b`, degrees 0-360 clockwise from true north. */
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Project a point `distanceMeters` along `bearingDeg` from `origin`.
 * Used by the kinematic simulators to advance contacts along their heading.
 */
export function destinationPoint(
  origin: LatLng,
  bearingDeg: number,
  distanceMeters: number,
): LatLng {
  const angular = distanceMeters / EARTH_RADIUS_M;
  const bearing = toRad(bearingDeg);
  const lat1 = toRad(origin.lat);
  const lng1 = toRad(origin.lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    lat: toDeg(lat2),
    // Normalize longitude into -180..180.
    lng: ((toDeg(lng2) + 540) % 360) - 180,
  };
}

/**
 * Centroid of a set of points, computed in 3-D Cartesian space then projected
 * back to spherical coordinates. This is correct across the antimeridian and at
 * high latitudes, where naive averaging of degrees is not.
 */
export function centroid(points: LatLng[]): LatLng {
  if (points.length === 0) return { lat: 0, lng: 0 };
  if (points.length === 1) return { lat: points[0]!.lat, lng: points[0]!.lng };

  let x = 0;
  let y = 0;
  let z = 0;

  for (const p of points) {
    const lat = toRad(p.lat);
    const lng = toRad(p.lng);
    x += Math.cos(lat) * Math.cos(lng);
    y += Math.cos(lat) * Math.sin(lng);
    z += Math.sin(lat);
  }

  x /= points.length;
  y /= points.length;
  z /= points.length;

  const hyp = Math.sqrt(x * x + y * y);
  if (hyp < 1e-12 && Math.abs(z) < 1e-12) return { lat: 0, lng: 0 };

  return { lat: toDeg(Math.atan2(z, hyp)), lng: toDeg(Math.atan2(y, x)) };
}

/** Axis-aligned bounding box of a point set, as [west, south, east, north]. */
export function boundingBox(points: LatLng[]): [number, number, number, number] {
  if (points.length === 0) return [0, 0, 0, 0];
  let west = 180;
  let south = 90;
  let east = -180;
  let north = -90;
  for (const p of points) {
    if (p.lng < west) west = p.lng;
    if (p.lng > east) east = p.lng;
    if (p.lat < south) south = p.lat;
    if (p.lat > north) north = p.lat;
  }
  return [west, south, east, north];
}

/** True when `point` lies within `radiusMeters` of `center`. */
export function withinRadius(point: LatLng, center: LatLng, radiusMeters: number): boolean {
  return haversineMeters(point, center) <= radiusMeters;
}

/**
 * Ray-casting point-in-polygon test.
 * `polygon` is a closed or open ring in GeoJSON [lng, lat] order.
 */
export function pointInPolygon(point: LatLng, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i]!;
    const pj = polygon[j]!;
    const [xi, yi] = pi;
    const [xj, yj] = pj;
    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Approximate a circle as a closed polygon ring in GeoJSON [lng, lat] order.
 * Used to render patrol perimeters and danger radii as Zone polygons.
 */
export function circlePolygon(
  center: LatLng,
  radiusMeters: number,
  segments = 48,
): [number, number][] {
  const ring: [number, number][] = [];
  for (let i = 0; i < segments; i++) {
    const p = destinationPoint(center, (360 / segments) * i, radiusMeters);
    ring.push([p.lng, p.lat]);
  }
  // Close the ring explicitly so consumers do not have to.
  ring.push([ring[0]![0], ring[0]![1]]);
  return ring;
}

/** Convert knots to metres per second. */
export const knotsToMps = (knots: number): number => knots * 0.514444;

/** Convert metres per second to knots. */
export const mpsToKnots = (mps: number): number => mps / 0.514444;
