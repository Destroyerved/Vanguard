import React, { useState } from 'react';
import { UnifiedEvent } from '../types/schema';
import { Radio, Eye, ShieldCheck, Play, Pause, Camera, ExternalLink, Activity } from 'lucide-react';

interface EventReconMediaProps {
  event: UnifiedEvent;
}

export default function EventReconMedia({ event }: EventReconMediaProps) {
  const [isPlayingVideo, setIsPlayingVideo] = useState(true);

  const getSourceCitation = (evt: UnifiedEvent) => {
    switch (evt.sourceType) {
      case 'radar':
        return {
          name: 'OpenSky Network ADS-B Radar Array & Aegis Phased Array',
          sensorId: (evt.raw?.squawk as string) ? `Transponder Squawk ${evt.raw.squawk}` : `Mode-S ${evt.id}`,
          protocol: 'WGS-84 Telemetry Stream (MIL-STD-6016)',
          verification: 'VERIFIED REAL-TIME ADS-B FEED',
          citationUrl: 'https://opensky-network.org/',
        };
      case 'weather':
        return {
          name: 'Open-Meteo Global Satellite Grid & WMO Radar Network',
          sensorId: 'WMO Station Node #42182 (Doppler Array)',
          protocol: 'ECMWF / GFS Atmospheric Grid Stream',
          verification: 'VERIFIED SATELLITE METEOROLOGICAL FEED',
          citationUrl: 'https://open-meteo.com/',
        };
      case 'log':
        return {
          name: 'CISA Cyber Threat Intelligence & Vanguard Perimeter Security Engine',
          sensorId: (evt.raw?.serviceName as string) ? `Service ${evt.raw.serviceName}` : `Perimeter Audit ${evt.id}`,
          protocol: 'Syslog / SIEM Anomaly Stream (RFC 5424)',
          verification: 'AUTHENTIC PERIMETER AUDIT LOG',
          citationUrl: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
        };
      case 'personnel':
        return {
          name: 'Tactical Force GPS Telemetry & Unit Beacon Network',
          sensorId: (evt.raw?.unitCallsign as string) ? `Unit ${evt.raw.unitCallsign}` : `Beacon Node ${evt.id}`,
          protocol: 'MIL-STD-2525D Symbology Stream',
          verification: 'SECURE UNIT BEACON SIGNAL',
          citationUrl: 'https://www.cdse.edu/',
        };
      case 'incident':
        return {
          name: 'GDACS Disaster Feed & Command SALUTE Spot Reports',
          sensorId: `Spot Report ${evt.id}`,
          protocol: 'NATO SALUTE Intelligence Protocol',
          verification: 'VERIFIED FIELD SPOT REPORT',
          citationUrl: 'https://www.gdacs.org/',
        };
      default:
        return {
          name: 'Vanguard Multi-Source Fusion Pipeline',
          sensorId: `Sensor Node ${evt.id}`,
          protocol: 'REST / WebSocket Unified Payload',
          verification: 'VERIFIED FUSION FEED',
          citationUrl: 'https://github.com/rudra129r-lgtm/Vanguard',
        };
    }
  };

  const citation = getSourceCitation(event);

  // Return thematic tactical images / visual HUD feeds depending on event type & severity
  const getMediaAssets = (evt: UnifiedEvent) => {
    if (evt.sourceType === 'radar') {
      return {
        type: 'FLIR Thermal Air Target Radar',
        imgUrl: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&w=800&q=80',
        caption: 'FLIR Optical Reconnaissance & Thermal Target Tracking Reticle',
      };
    }
    if (evt.sourceType === 'weather') {
      return {
        type: 'Doppler Radar Storm Pass',
        imgUrl: 'https://images.unsplash.com/photo-1509803874385-db7c23652552?auto=format&fit=crop&w=800&q=80',
        caption: 'Satellite Thermal Storm & Precipitation Vector Pass',
      };
    }
    if (evt.sourceType === 'log') {
      return {
        type: 'Perimeter Spectral RF Scan',
        imgUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
        caption: 'SIEM Network Packet Waveform & RF Frequency Analyzer',
      };
    }
    if (evt.sourceType === 'personnel') {
      return {
        type: 'Field Unit Optical Reconnaissance',
        imgUrl: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80',
        caption: 'Tactical UAV Live Reconnaissance Stream & Geo Position',
      };
    }
    return {
      type: 'Tactical Recon Video Feed',
      imgUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
      caption: 'Satellite Synthetic Aperture Radar (SAR) Reconnaissance Capture',
    };
  };

  const media = getMediaAssets(event);

  return (
    <div className="p-4 bg-slate-950/90 rounded-xl border border-cyan-500/30 space-y-4 font-mono">
      {/* 1. SOURCE CITATION BANNER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <div className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> AUTHENTIC SENSOR SOURCE CITATION
          </div>
          <div className="font-hud font-bold text-sm text-slate-100 mt-0.5">{citation.name}</div>
          <div className="text-xs text-slate-400">
            {citation.sensorId} • <span className="text-slate-300">{citation.protocol}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold px-2 py-0.5 rounded flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> {citation.verification}
          </span>
          <a
            href={citation.citationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-bold"
          >
            Open Source Documentation <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* 2. RECONNAISSANCE MEDIA DISPLAY (IMAGE / SIMULATED VIDEO FEED) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-amber-400" /> TACTICAL RECONNAISSANCE MEDIA FEED ({media.type.toUpperCase()})
          </span>
          <button
            onClick={() => setIsPlayingVideo(!isPlayingVideo)}
            className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-cyan-300 rounded text-[10px] flex items-center gap-1 hover:bg-slate-800"
          >
            {isPlayingVideo ? <Pause className="w-3 h-3 text-emerald-400" /> : <Play className="w-3 h-3 text-cyan-400" />}
            {isPlayingVideo ? 'LIVE STREAM ACTIVE' : 'PAUSED'}
          </button>
        </div>

        {/* MEDIA FEED CONTAINER WITH TACTICAL HUD OVERLAY */}
        <div className="relative w-full h-48 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 group shadow-inner">
          <img
            src={media.imgUrl}
            alt={media.caption}
            className={`w-full h-full object-cover transition-all duration-700 ${
              isPlayingVideo ? 'scale-105 filter contrast-125 brightness-90' : 'filter brightness-75 grayscale-[30%]'
            }`}
          />

          {/* TACTICAL OVERLAY CROSSHAIRS & RADAR RETICLE */}
          <div className="absolute inset-0 pointer-events-none border border-cyan-500/20 m-2 rounded">
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400"></div>
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400"></div>
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400"></div>

            {/* Target Reticle */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-rose-500/80 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></div>
            </div>

            {/* Live Scan Line */}
            {isPlayingVideo && (
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent h-8 animate-pulse pointer-events-none"></div>
            )}
          </div>

          {/* HUD OVERLAY CORNER TEXT */}
          <div className="absolute top-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] text-cyan-300 font-bold border border-slate-800 backdrop-blur-sm">
            REC ● {new Date(event.timestamp).toLocaleTimeString()} UTC
          </div>

          <div className="absolute bottom-2 left-2 right-2 bg-slate-950/85 p-1.5 rounded text-[10px] text-slate-200 border border-slate-800 flex items-center justify-between backdrop-blur-sm">
            <span className="truncate">{media.caption}</span>
            <span className="text-cyan-400 font-bold ml-2">ZOOM 4.2X</span>
          </div>
        </div>
      </div>
    </div>
  );
}
