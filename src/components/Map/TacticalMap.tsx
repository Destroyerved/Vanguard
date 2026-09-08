import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useEventStore } from '../../store/useEventStore';
import { THEATER_CENTER } from '../../services/mockDataGenerator';
import { Layers, Shield, Eye, Flame, AlertCircle, Wind, Radio, Navigation } from 'lucide-react';

export const TacticalMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const nukeLayerRef = useRef<L.LayerGroup | null>(null);

  const events = useEventStore((s) => s.events);
  const selectedEventId = useEventStore((s) => s.selectedEventId);
  const selectEvent = useEventStore((s) => s.selectEvent);
  const openExplainability = useEventStore((s) => s.openExplainability);
  const layers = useEventStore((s) => s.layers);
  const toggleLayer = useEventStore((s) => s.toggleLayer);
  const timeScrubberMinute = useEventStore((s) => s.timeScrubberMinute);
  const setTimeScrubber = useEventStore((s) => s.setTimeScrubber);
  const rafaleState = useEventStore((s) => s.rafaleState);
  const nukeBlast = useEventStore((s) => s.nukeBlast);
  const filters = useEventStore((s) => s.filters);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [THEATER_CENTER.lat, THEATER_CENTER.lng],
      zoom: 9,
      zoomControl: false,
      attributionControl: false,
      minZoom: 6,
      maxZoom: 14
    });

    // Dark military tactical basemap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    // Add layer group for markers and vector overlays
    const layerGroup = L.layerGroup().addTo(map);
    const nukeGroup = L.layerGroup().addTo(map);

    layerGroupRef.current = layerGroup;
    nukeLayerRef.current = nukeGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Map Elements & Layers
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;

    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    group.clearLayers();

    // 1. RENDER RESTRICTED AIRSPACE & COMBAT PATROL ZONES
    if (layers.zones) {
      // Red Line Restricted Airspace Polygon
      const restrictedZone = L.polygon(
        [
          [34.55, 77.60],
          [34.60, 78.10],
          [34.35, 78.35],
          [34.10, 78.00],
          [34.25, 77.50]
        ],
        {
          color: '#ff2a4b',
          weight: 1.5,
          dashArray: '5, 5',
          fillColor: '#ff2a4b',
          fillOpacity: 0.08
        }
      ).bindTooltip('RESTRICTED AIRSPACE SECTOR RED-7', { permanent: true, direction: 'center', className: 'tactical-tooltip' });
      group.addLayer(restrictedZone);

      // Friendly Patrol Buffer Zone
      const friendlyZone = L.polygon(
        [
          [33.80, 77.10],
          [34.15, 77.15],
          [34.20, 77.60],
          [33.75, 77.55]
        ],
        {
          color: '#00f0ff',
          weight: 1,
          dashArray: '4, 4',
          fillColor: '#00f0ff',
          fillOpacity: 0.04
        }
      ).bindTooltip('SECTOR-BLUE PATROL CORRIDOR', { direction: 'center', className: 'tactical-tooltip' });
      group.addLayer(friendlyZone);
    }

    // 2. RENDER WEATHER OVERLAY
    if (layers.weather) {
      const weatherCircle = L.circle([34.220, 77.610], {
        radius: 22000,
        color: '#00f0ff',
        weight: 1,
        dashArray: '2, 6',
        fillColor: '#00f0ff',
        fillOpacity: 0.07
      }).bindPopup('<b style="color:#00f0ff">METEOROLOGICAL RADAR</b><br/>High Altitude Jet Stream Shear: 68 kts<br/>Ceiling: 2200m');
      group.addLayer(weatherCircle);
    }

    // 3. RENDER RAFALE VANGUARD-01 POSITION & FLIGHT VECTOR
    if (layers.assets && rafaleState.currentLocation) {
      const rafaleIcon = L.divIcon({
        className: 'custom-jet-marker',
        html: `
          <div style="transform: rotate(${rafaleState.headingDeg}deg);" class="relative flex items-center justify-center">
            <div class="w-8 h-8 rounded-full border border-cyan-400/80 bg-cyan-950/80 flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.8)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#00f0ff">
                <path d="M12 2L9 9H3L7 13L5 22L12 17L19 22L17 13L21 9H15L12 2Z"/>
              </svg>
            </div>
            <div class="absolute -top-4 text-[9px] font-bold text-cyan-300 whitespace-nowrap bg-black/80 px-1 border border-cyan-500/40 rounded">
              VANGUARD-01 [M ${rafaleState.speedMach}]
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const rafaleMarker = L.marker([rafaleState.currentLocation.lat, rafaleState.currentLocation.lng], {
        icon: rafaleIcon
      });
      group.addLayer(rafaleMarker);

      // Trajectory vector line if target is acquired
      if (rafaleState.targetLocation) {
        const flightLine = L.polyline(
          [
            [rafaleState.currentLocation.lat, rafaleState.currentLocation.lng],
            [rafaleState.targetLocation.lat, rafaleState.targetLocation.lng]
          ],
          {
            color: rafaleState.strikePhase === 'HYPERSONIC_CRUISE' ? '#ffaa00' : '#00f0ff',
            weight: 2,
            dashArray: rafaleState.strikePhase === 'HYPERSONIC_CRUISE' ? undefined : '6, 6'
          }
        );
        group.addLayer(flightLine);

        // If missile is in flight, draw hypersonic missile projectile icon
        if (rafaleState.strikePhase === 'HYPERSONIC_CRUISE') {
          const latInterp =
            rafaleState.currentLocation.lat +
            (rafaleState.targetLocation.lat - rafaleState.currentLocation.lat) * (rafaleState.hypersonicProgress / 100);
          const lngInterp =
            rafaleState.currentLocation.lng +
            (rafaleState.targetLocation.lng - rafaleState.currentLocation.lng) * (rafaleState.hypersonicProgress / 100);

          const missileIcon = L.divIcon({
            className: 'missile-marker',
            html: `
              <div class="flex items-center justify-center">
                <div class="w-5 h-5 rounded-full bg-amber-500 border border-white animate-ping"></div>
                <div class="absolute text-[9px] font-black text-amber-300 bg-black/90 px-1 border border-amber-400 rounded">
                  ASMP-A MACH 3.5 [${rafaleState.hypersonicProgress}%]
                </div>
              </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          group.addLayer(L.marker([latInterp, lngInterp], { icon: missileIcon }));
        }
      }
    }

    // 4. RENDER STRATEGIC BUNKER & ACTIVE EVENTS
    events.forEach((evt) => {
      // Filter check
      if (!filters.sourceTypes.includes(evt.sourceType)) return;
      if (!filters.severities.includes(evt.severity)) return;
      if (evt.confidence < filters.minConfidence) return;
      if (filters.showAnomaliesOnly && !evt.isAnomaly) return;

      const isSelected = evt.id === selectedEventId;
      const isHostile = evt.affiliation === 'hostile' || evt.severity === 'critical';
      const color = isHostile ? '#ff2a4b' : evt.affiliation === 'friendly' ? '#00f0ff' : '#ffaa00';

      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <div class="w-6 h-6 rounded-full border ${isSelected ? 'border-white scale-125 shadow-[0_0_15px_#fff]' : `border-[${color}]`} flex items-center justify-center" style="background: rgba(10, 16, 26, 0.9); border-color: ${color};">
            <div class="w-2.5 h-2.5 rounded-full" style="background: ${color}; ${isHostile ? 'animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;' : ''}"></div>
          </div>
          <div class="absolute -bottom-5 text-[8px] font-mono font-bold px-1 rounded whitespace-nowrap bg-black/85 border" style="color: ${color}; border-color: ${color}40;">
            ${evt.callsign || evt.id} (${evt.confidence}%)
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'event-marker',
        html: iconHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([evt.location.lat, evt.location.lng], { icon: markerIcon });

      // Click handler
      marker.on('click', () => {
        selectEvent(evt.id);
      });

      // Popup Content
      const popupHtml = `
        <div style="font-family: 'JetBrains Mono', monospace; min-width: 220px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(0,240,255,0.3); padding-bottom: 4px; margin-bottom: 6px;">
            <span style="color: ${color}; font-weight: bold; font-size: 11px;">[${evt.sourceType.toUpperCase()}] ${evt.id}</span>
            <span style="font-size: 10px; background: rgba(0,240,255,0.15); color: #00f0ff; padding: 1px 4px; border-radius: 2px;">${evt.confidence}% CONF</span>
          </div>
          <div style="font-weight: bold; font-size: 12px; color: #fff; margin-bottom: 4px;">${evt.title}</div>
          <div style="font-size: 10px; color: #94a3b8; margin-bottom: 8px; line-height: 1.3;">${evt.description}</div>
          <div style="font-size: 9px; color: #cbd5e1; margin-bottom: 6px; border-top: 1px dashed rgba(255,255,255,0.15); padding-top: 4px;">
            <b>Coordinates:</b> ${evt.location.lat.toFixed(3)}°N, ${evt.location.lng.toFixed(3)}°E<br/>
            ${evt.location.altitudeMeters ? `<b>Altitude:</b> ${evt.location.altitudeMeters}m | ` : ''}
            ${evt.location.speedKnots ? `<b>Speed:</b> ${evt.location.speedKnots} kts` : ''}
          </div>
          ${evt.corroboratedBy.length > 0 ? `<div style="font-size: 9px; color: #38bdf8; margin-bottom: 6px;">🔗 Corroborated by: ${evt.corroboratedBy.join(', ')}</div>` : ''}
          <button id="btn-explain-${evt.id}" style="width: 100%; background: #082f49; border: 1px solid #00f0ff; color: #00f0ff; font-size: 10px; padding: 3px 6px; border-radius: 3px; cursor: pointer; font-weight: bold;">
            INSPECT CONFIDENCE MATH &raquo;
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-explain-${evt.id}`);
        if (btn) {
          btn.onclick = () => openExplainability(evt.id);
        }
      });

      group.addLayer(marker);
    });

  }, [events, layers, selectedEventId, rafaleState, filters]);

  // 5. RENDER NUCLEAR BLAST & FALLOUT OVERLAY WHEN STRIKE OCCURS
  useEffect(() => {
    if (!nukeLayerRef.current) return;
    const nukeGroup = nukeLayerRef.current;
    nukeGroup.clearLayers();

    if (nukeBlast && layers.fallout) {
      const gz = [nukeBlast.groundZero.lat, nukeBlast.groundZero.lng] as [number, number];

      // Ground Zero Marker
      const gzIcon = L.divIcon({
        className: 'gz-marker',
        html: `
          <div class="flex items-center justify-center">
            <div class="w-8 h-8 rounded-full bg-red-600 border-2 border-yellow-300 animate-ping"></div>
            <div class="absolute text-[10px] font-black text-yellow-300 bg-red-950 px-1 border border-yellow-400 rounded">
              ☢ GROUND ZERO 300kT
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      nukeGroup.addLayer(L.marker(gz, { icon: gzIcon }));

      // Fireball zone (1.2 km)
      const fireball = L.circle(gz, {
        radius: nukeBlast.fireballRadiusM,
        color: '#ffcc00',
        weight: 2,
        fillColor: '#ffffff',
        fillOpacity: 0.65
      }).bindTooltip('FIREBALL ZONE: 1.2 KM (TOTAL VAPORIZATION)', { permanent: true, direction: 'top', className: 'nuke-tooltip' });
      nukeGroup.addLayer(fireball);

      // Heavy 5 PSI Blast Overpressure (7.8 km)
      const overpressure = L.circle(gz, {
        radius: nukeBlast.heavyBlast5PsiRadiusM,
        color: '#ff2a4b',
        weight: 2,
        dashArray: '4, 4',
        fillColor: '#ff2a4b',
        fillOpacity: 0.25
      }).bindTooltip('5 PSI BLAST WAVE: 7.8 KM (STRUCTURAL COLLAPSE)', { direction: 'center', className: 'nuke-tooltip' });
      nukeGroup.addLayer(overpressure);

      // Thermal Radiation 3rd Degree Burns (14.5 km)
      const thermal = L.circle(gz, {
        radius: nukeBlast.thermalRadiationRadiusM,
        color: '#ffaa00',
        weight: 1.5,
        dashArray: '8, 8',
        fillColor: '#ffaa00',
        fillOpacity: 0.12
      }).bindTooltip('THERMAL BURNS ZONE: 14.5 KM', { direction: 'bottom', className: 'nuke-tooltip' });
      nukeGroup.addLayer(thermal);

      // Fallout Dispersion Cone (East-Southeast Downwind)
      const falloutPolygon = L.polygon(
        [
          gz,
          [gz[0] - 0.15, gz[1] + 0.45],
          [gz[0] - 0.25, gz[1] + 0.55],
          [gz[0] - 0.35, gz[1] + 0.35],
          gz
        ],
        {
          color: '#a855f7',
          weight: 1.5,
          dashArray: '5, 5',
          fillColor: '#a855f7',
          fillOpacity: 0.28
        }
      ).bindTooltip('RADIOACTIVE FALLOUT PLUME (DOWNWIND SECTOR)', { direction: 'right', className: 'nuke-tooltip' });
      nukeGroup.addLayer(falloutPolygon);

      // Pan smoothly to Ground Zero
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo(gz, 10, { duration: 1.5 });
      }
    }
  }, [nukeBlast, layers.fallout]);

  return (
    <div className="relative flex-1 h-full min-h-[420px] bg-[#05080c] border border-cyan-500/30 rounded overflow-hidden tactical-box">
      {/* Map Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Military HUD Reticle & Crosshair Overlay */}
      <div className="absolute inset-0 pointer-events-none z-20">
        <div className="absolute top-2 left-3 text-[9px] text-cyan-500 font-mono tracking-wider flex items-center space-x-2 bg-black/60 px-2 py-0.5 border border-cyan-500/20 rounded">
          <Navigation className="w-3 h-3 text-cyan-400" />
          <span>MGRS: 43S ED 4821 7291</span>
          <span>•</span>
          <span>GRID: WGS-84</span>
          <span>•</span>
          <span>FOV: 120°</span>
        </div>

        {/* Center reticle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
          <div className="w-16 h-16 border border-cyan-400 rounded-full flex items-center justify-center">
            <div className="w-1 h-1 bg-cyan-400"></div>
          </div>
        </div>
      </div>

      {/* Top Right Floating Layer Controls */}
      <div className="absolute top-2 right-2 z-30 flex items-center space-x-1 bg-[#070e17]/90 border border-cyan-500/40 rounded p-1 backdrop-blur-md">
        <button
          onClick={() => toggleLayer('assets')}
          className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase flex items-center space-x-1 transition ${
            layers.assets ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/60' : 'text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle Asset Kinematic Positions"
        >
          <Shield className="w-3 h-3" />
          <span>Assets</span>
        </button>
        <button
          onClick={() => toggleLayer('alerts')}
          className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase flex items-center space-x-1 transition ${
            layers.alerts ? 'bg-red-950 text-red-300 border border-red-500/60' : 'text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle Threat Alerts"
        >
          <AlertCircle className="w-3 h-3" />
          <span>Alerts</span>
        </button>
        <button
          onClick={() => toggleLayer('weather')}
          className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase flex items-center space-x-1 transition ${
            layers.weather ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/60' : 'text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle Weather Radar Overlays"
        >
          <Wind className="w-3 h-3" />
          <span>Weather</span>
        </button>
        <button
          onClick={() => toggleLayer('zones')}
          className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase flex items-center space-x-1 transition ${
            layers.zones ? 'bg-purple-950 text-purple-300 border border-purple-500/60' : 'text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle Red Line & Patrol Corridors"
        >
          <Layers className="w-3 h-3" />
          <span>Zones</span>
        </button>
        <button
          onClick={() => toggleLayer('fallout')}
          className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase flex items-center space-x-1 transition ${
            layers.fallout ? 'bg-amber-950 text-amber-300 border border-amber-500/60' : 'text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle Nuclear Blast & Fallout Plume"
        >
          <Flame className="w-3 h-3" />
          <span>Fallout</span>
        </button>
      </div>

      {/* Bottom 4D Time-Scrubber Controls */}
      <div className="absolute bottom-2 left-2 right-2 z-30 bg-[#070e17]/90 border border-cyan-500/40 rounded px-3 py-1.5 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center">
            <Radio className="w-3 h-3 mr-1 text-cyan-400 animate-pulse" />
            4D TIME SCRUBBER:
          </span>
          <span className="text-xs font-mono font-bold text-white">
            {timeScrubberMinute === 0 ? 'LIVE STREAMING' : `T - ${Math.abs(timeScrubberMinute)} MINS REPLAY`}
          </span>
        </div>

        <div className="flex items-center space-x-3 flex-1 max-w-xs mx-4">
          <span className="text-[9px] text-slate-500">-60m</span>
          <input
            type="range"
            min="-60"
            max="0"
            step="1"
            value={timeScrubberMinute}
            onChange={(e) => setTimeScrubber(Number(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <span className="text-[9px] text-emerald-400 font-bold">LIVE</span>
        </div>

        <button
          onClick={() => setTimeScrubber(0)}
          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition ${
            timeScrubberMinute === 0
              ? 'bg-emerald-900/60 border border-emerald-400 text-emerald-300'
              : 'bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900'
          }`}
        >
          {timeScrubberMinute === 0 ? '● SYNCED' : 'SNAP TO LIVE'}
        </button>
      </div>
    </div>
  );
};
