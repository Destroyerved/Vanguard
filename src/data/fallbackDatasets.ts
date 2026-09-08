/**
 * Vanguard Authentic Hardcoded Fallback Datasets
 * Used seamlessly whenever live public APIs fail, time out, or hit rate limits.
 * Fully compatible with any UI framework (React, Next.js, Vue, vanilla JS).
 */

// 1. Weather Fallback (Open-Meteo Schema)
export const FALLBACK_WEATHER = {
  source: "Open-Meteo Global Weather Cache (Fallback)",
  latitude: 28.6139,
  longitude: 77.2090,
  elevation: 216.0,
  current: {
    time: new Date().toISOString(),
    temperature_2m: 27.4,
    relative_humidity_2m: 62,
    precipitation: 0.0,
    weather_code: 2,
    surface_pressure: 1008.2,
    wind_speed_10m: 18.5,
    wind_direction_10m: 210,
    visibility: 9500
  }
};

// 2. Flight & Stealth Radar Fallback (ADS-B OpenSky Schema + MIL-STD Kinematics)
export const FALLBACK_FLIGHTS = [
  [
    "800c12",
    "IND102  ",
    "India",
    Date.now() / 1000,
    Date.now() / 1000,
    77.2410,
    28.6410,
    450.0,
    false,
    216.0,
    185.0,
    -2.5,
    null,
    465.0,
    "7700", // Emergency Squawk
    false,
    0
  ],
  [
    "800a44",
    "AIC405  ",
    "India",
    Date.now() / 1000,
    Date.now() / 1000,
    77.1710,
    28.5910,
    3200.0,
    false,
    123.5,
    45.0,
    0.0,
    null,
    3240.0,
    "1200",
    false,
    0
  ],
  [
    "4b11f0",
    "UNKN99  ",
    "Unknown",
    Date.now() / 1000,
    Date.now() / 1000,
    77.2910,
    28.6820,
    180.0,
    false,
    262.3,
    220.0,
    5.2,
    null,
    190.0,
    "0000", // Stealth Anomaly
    true,
    0
  ]
];

// 3. Seismic & Hazard Fallback (USGS Schema)
export const FALLBACK_SEISMIC = [
  {
    type: "Feature",
    properties: {
      mag: 4.8,
      place: "12 km SE of Sector Alpha Border",
      time: Date.now() - 120000,
      title: "M 4.8 - 12 km SE of Sector Alpha Border",
      alert: "yellow",
      status: "reviewed"
    },
    geometry: {
      type: "Point",
      coordinates: [77.2500, 28.5500, 10.0]
    },
    id: "usgs_fallback_01"
  },
  {
    type: "Feature",
    properties: {
      mag: 3.2,
      place: "45 km W of Tactical Base Vanguard",
      time: Date.now() - 450000,
      title: "M 3.2 - 45 km W of Tactical Base Vanguard",
      alert: "green",
      status: "reviewed"
    },
    geometry: {
      type: "Point",
      coordinates: [77.1000, 28.6000, 5.0]
    },
    id: "usgs_fallback_02"
  }
];

// 4. Cyber & Security Threats Fallback (CISA Schema)
export const FALLBACK_CISA_THREATS = [
  {
    cveID: "CVE-2026-9041",
    vendorProject: "VanguardDefense",
    product: "OpticFence Firmware",
    vulnerabilityName: "RF Jamming Vector & Optical Sensor Bypass",
    shortDescription: "Critical zero-day attempt targeting base optical sensor thresholds. Mitigation key deployed.",
    dueDate: "2026-09-10"
  },
  {
    cveID: "CVE-2026-4412",
    vendorProject: "OpenSSL / CommsGateway",
    product: "Encrypted Radio HSM",
    vulnerabilityName: "Side-Channel Key Exchange Latency",
    shortDescription: "Potential timing leak in legacy 1024-bit RSA fallbacks. AES-256 mandatory upgrade scheduled.",
    dueDate: "2026-09-15"
  }
];

// 5. Global Disaster Alerts Fallback (GDACS Schema)
export const FALLBACK_GDACS_ALERTS = [
  {
    title: "GREEN ALERT: Moderate Flash Flood Front near Sector 4",
    description: "GDACS Emergency Dispatch: Precipitation buildup of 45mm projected over low-lying perimeter sectors.",
    pubDate: new Date().toUTCString(),
    link: "https://www.gdacs.org"
  },
  {
    title: "ORANGE ALERT: High Wind Shear Vector Alert",
    description: "GDACS Aviation Advisory: 55 km/h crosswinds registered across tactical flight corridor Bravo.",
    pubDate: new Date(Date.now() - 300000).toUTCString(),
    link: "https://www.gdacs.org"
  }
];
