import React, { useEffect, useRef, useState } from 'react';
import { useEventStore } from '../../store/useEventStore';
import type { RadarTarget } from '../../types/vanguard';
import { soundFx } from '../../services/soundFx';
import { Crosshair, Radio, Shield, Target, Volume2 } from 'lucide-react';

export const PhosphorRadar: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const angleRef = useRef<number>(0);
  const lastPingAnglesRef = useRef<Record<string, boolean>>({});

  const radarTargets = useEventStore((s) => s.radarTargets);
  const selectedRadarTargetId = useEventStore((s) => s.selectedRadarTargetId);
  const selectRadarTarget = useEventStore((s) => s.selectRadarTarget);
  const radarRangeNm = useEventStore((s) => s.radarRangeNm);
  const setRadarRangeNm = useEventStore((s) => s.setRadarRangeNm);
  const isAudioMuted = useEventStore((s) => s.isAudioMuted);

  const selectedTarget = radarTargets.find((t) => t.id === selectedRadarTargetId) || radarTargets[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 320);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 320);
    const size = Math.min(width, height);
    const center = { x: width / 2, y: height / 2 };
    const radius = size * 0.44;

    const render = () => {
      // Rotate sweep angle (e.g. 0.03 rad per frame)
      angleRef.current = (angleRef.current + 0.025) % (Math.PI * 2);
      const sweepAngle = angleRef.current;

      // 1. Semi-transparent clear for phosphor persistence fade
      ctx.fillStyle = 'rgba(4, 8, 14, 0.18)';
      ctx.fillRect(0, 0, width, height);

      // 2. Outer Radar Bezel & Compass Degrees
      ctx.save();
      ctx.translate(center.x, center.y);

      // Outer bezel ring
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Concentric Range Rings (25%, 50%, 75%, 100%)
      const rings = [0.25, 0.5, 0.75, 1.0];
      ctx.lineWidth = 0.8;
      rings.forEach((r) => {
        ctx.strokeStyle = r === 1.0 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(0, 240, 255, 0.18)';
        ctx.beginPath();
        ctx.arc(0, 0, radius * r, 0, Math.PI * 2);
        ctx.stroke();

        // Range text
        ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillText(`${Math.round(radarRangeNm * r)}nm`, 4, -radius * r + 10);
      });

      // Azimuth Crosshair Axes (N-S, E-W, 45-degree radials)
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.setLineDash([2, 4]);
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Cardinal direction ticks
      const cardinalLabels = [
        { text: '000° N', x: 0, y: -radius - 6 },
        { text: '090° E', x: radius + 14, y: 3 },
        { text: '180° S', x: 0, y: radius + 12 },
        { text: '270° W', x: -radius - 14, y: 3 }
      ];
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      cardinalLabels.forEach((c) => ctx.fillText(c.text, c.x, c.y));

      // 3. Rotating Radar Sweep Beam (Gradient Cone)
      const sweepGradient = ctx.createConicGradient(sweepAngle - Math.PI / 2, 0, 0);
      sweepGradient.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
      sweepGradient.addColorStop(0.08, 'rgba(0, 240, 255, 0.08)');
      sweepGradient.addColorStop(0.18, 'rgba(0, 240, 255, 0.0)');
      sweepGradient.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

      ctx.fillStyle = sweepGradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // Main Sweep Line
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(sweepAngle) * radius, Math.sin(sweepAngle) * radius);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // 4. Render Radar Target Blips with Phosphor Persistence
      radarTargets.forEach((target) => {
        // Convert bearing and distance to canvas coords
        const bearingRad = ((target.bearingDeg - 90) * Math.PI) / 180;
        const normalizedDist = Math.min(1.0, target.distanceNm / radarRangeNm);
        const bx = Math.cos(bearingRad) * (radius * normalizedDist);
        const by = Math.sin(bearingRad) * (radius * normalizedDist);

        // Check if sweep line is close to this target (trigger audio ping)
        let angleDiff = Math.abs(sweepAngle - ((bearingRad + Math.PI * 2) % (Math.PI * 2)));
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        if (angleDiff < 0.05 && !lastPingAnglesRef.current[target.id]) {
          lastPingAnglesRef.current[target.id] = true;
          if (!isAudioMuted) {
            soundFx.playRadarPing(target.affiliation === 'hostile' ? 980 : 740);
          }
        } else if (angleDiff >= 0.15) {
          lastPingAnglesRef.current[target.id] = false;
        }

        // Color based on affiliation
        const isHostile = target.affiliation === 'hostile';
        const isFriendly = target.affiliation === 'friendly';
        const color = isHostile ? '#ff2a4b' : isFriendly ? '#00f0ff' : '#ffaa00';
        const isSelected = target.id === selectedRadarTargetId;

        // Draw Blip
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isSelected ? 12 : 6;
        ctx.beginPath();
        ctx.arc(bx, by, isSelected ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Velocity vector leader line
        const headingRad = ((target.headingDeg - 90) * Math.PI) / 180;
        const vecLen = (target.speedKnots / 1000) * 16;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(headingRad) * vecLen, by + Math.sin(headingRad) * vecLen);
        ctx.stroke();

        // Selected Target Reticle Lock Box
        if (isSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx - 7, by - 7, 14, 14);

          // Callsign label
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px "JetBrains Mono", monospace';
          ctx.fillText(target.callsign, bx + 10, by - 4);
        }

        ctx.shadowBlur = 0; // reset
      });

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [radarTargets, selectedRadarTargetId, radarRangeNm, isAudioMuted]);

  // Handle canvas click to acquire contact
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = canvas.width;
    const height = canvas.height;
    const center = { x: width / 2, y: height / 2 };
    const radius = Math.min(width, height) * 0.44;

    const dx = x - center.x;
    const dy = y - center.y;
    const clickDistNm = (Math.sqrt(dx * dx + dy * dy) / radius) * radarRangeNm;
    let clickBearingDeg = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;

    // Find closest target within tolerance
    let closestTarget: RadarTarget | null = null;
    let minDist = 25; // nm tolerance

    radarTargets.forEach((t) => {
      const distDiff = Math.abs(t.distanceNm - clickDistNm);
      const bearingDiff = Math.abs(t.bearingDeg - clickBearingDeg);
      const combined = distDiff + bearingDiff * 0.5;
      if (combined < minDist) {
        minDist = combined;
        closestTarget = t;
      }
    });

    if (closestTarget) {
      selectRadarTarget((closestTarget as RadarTarget).id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050910] border border-cyan-500/30 rounded overflow-hidden tactical-box">
      {/* Top Header */}
      <div className="px-2.5 py-1.5 bg-[#09121d] border-b border-cyan-500/30 flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
          <span className="font-display text-[11px] font-bold uppercase tracking-wider text-cyan-300">
            PRIMARY SURVEILLANCE RADAR (PSR-3D)
          </span>
        </div>

        {/* Range Selector */}
        <div className="flex items-center space-x-1">
          {[50, 100, 150].map((rng) => (
            <button
              key={rng}
              onClick={() => setRadarRangeNm(rng)}
              className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase transition ${
                radarRangeNm === rng
                  ? 'bg-cyan-500 text-black border border-cyan-300'
                  : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-cyan-300'
              }`}
            >
              {rng}NM
            </button>
          ))}
        </div>
      </div>

      {/* Main Radar Screen */}
      <div className="relative flex-1 flex items-center justify-center p-1 bg-[#03060a] overflow-hidden">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-crosshair"
        />

        {/* Radar Center HUD badge */}
        <div className="absolute top-2 left-2 pointer-events-none text-[8px] text-cyan-400/80 font-mono space-y-0.5 bg-black/60 p-1 border border-cyan-500/20 rounded">
          <div>ANTENNA: 3D AESA S-BAND</div>
          <div>SWEEP: 15 RPM // ACTIVE</div>
          <div>IFF MODE: 4/5 INTERROGATE</div>
        </div>
      </div>

      {/* Bottom Tracked Contact Telemetry Readout */}
      {selectedTarget && (
        <div className="p-2 bg-[#08101a] border-t border-cyan-500/30 text-xs font-mono">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="font-bold text-white text-[11px]">{selectedTarget.callsign}</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.2 bg-red-950 border border-red-500 text-red-300 rounded font-bold uppercase">
              {selectedTarget.affiliation}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1 text-[9.5px] text-slate-300 border-t border-cyan-500/15 pt-1">
            <div>
              <span className="text-slate-500 block text-[8px]">RANGE</span>
              <span className="text-cyan-300 font-bold">{selectedTarget.distanceNm} nm</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[8px]">BRG/HDG</span>
              <span className="text-cyan-300 font-bold">
                {selectedTarget.bearingDeg.toString().padStart(3, '0')}° / {selectedTarget.headingDeg.toString().padStart(3, '0')}°
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[8px]">ALTITUDE</span>
              <span className="text-cyan-300 font-bold">{selectedTarget.altitudeFt.toLocaleString()} ft</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[8px]">SPEED</span>
              <span className="text-cyan-300 font-bold">{selectedTarget.speedKnots} kts</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
