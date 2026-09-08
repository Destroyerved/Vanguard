import React, { useRef, useEffect, useState } from 'react';
import { UnifiedEvent } from '../../types/schema';
import { Globe, Layers, Eye, RefreshCw, ZoomIn, ZoomOut, Maximize2, ShieldAlert } from 'lucide-react';

interface SpatialThreatField3DProps {
  events: UnifiedEvent[];
  selectedEventId?: string;
  onSelectEvent: (event: UnifiedEvent) => void;
}

export default function SpatialThreatField3D({
  events,
  selectedEventId,
  onSelectEvent
}: SpatialThreatField3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotationX, setRotationX] = useState(45);
  const [rotationZ, setRotationZ] = useState(30);
  const [zoom, setZoom] = useState(1);
  const [hoveredEvent, setHoveredEvent] = useState<UnifiedEvent | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Center coordinate of the AO (e.g. Ahmedabad / Westcom sector: ~23.02°N, 72.57°E)
  const centerLat = 23.0225;
  const centerLng = 72.5714;
  const latSpan = 0.5;
  const lngSpan = 0.5;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      time += 0.02;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw 3D Perspective Tactical Grid
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom * 0.7); // Perspective tilt

      const gridSize = 280;
      const gridSteps = 8;
      const step = (gridSize * 2) / gridSteps;

      // Outer Grid Boundary
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-gridSize, -gridSize, gridSize * 2, gridSize * 2);

      // Inner Grid Lines with scanline glow
      for (let i = -gridSize; i <= gridSize; i += step) {
        ctx.beginPath();
        ctx.moveTo(i, -gridSize);
        ctx.lineTo(i, gridSize);
        ctx.strokeStyle = i === 0 ? 'rgba(6, 182, 212, 0.35)' : 'rgba(255, 255, 255, 0.04)';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-gridSize, i);
        ctx.lineTo(gridSize, i);
        ctx.strokeStyle = i === 0 ? 'rgba(6, 182, 212, 0.35)' : 'rgba(255, 255, 255, 0.04)';
        ctx.stroke();
      }

      // Range Rings on Base Plane
      [80, 160, 240].forEach((r, idx) => {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.font = '9px monospace';
        ctx.fillText(`${(idx + 1) * 15}km`, r + 4, 0);
      });

      // Rotating Radar Sector Sweep on Plane
      ctx.save();
      ctx.rotate(time * 0.5);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 240);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 240, 0, Math.PI / 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 2. Draw 3D Event Pillars & Correlation Vectors
      const projectedNodes: Array<{
        event: UnifiedEvent;
        x: number;
        y: number;
        baseY: number;
        elevation: number;
        color: string;
      }> = [];

      events.forEach((evt) => {
        const lat = typeof evt.location?.lat === 'number' ? evt.location.lat : centerLat;
        const lng = typeof evt.location?.lng === 'number' ? evt.location.lng : centerLng;
        const dx = ((lng - centerLng) / lngSpan) * gridSize;
        const dy = -((lat - centerLat) / latSpan) * gridSize;

        // Elevation based on Severity & Confidence
        const severityWeight =
          evt.severity === 'critical' ? 90 : evt.severity === 'high' ? 60 : evt.severity === 'medium' ? 35 : 15;
        const elevation = severityWeight + (evt.confidence / 100) * 30;

        const color =
          evt.severity === 'critical'
            ? '#ef4444'
            : evt.severity === 'high'
            ? '#f97316'
            : evt.severity === 'medium'
            ? '#eab308'
            : '#06b6d4';

        projectedNodes.push({
          event: evt,
          x: dx,
          y: dy - elevation, // 3D elevated point
          baseY: dy, // Base plane contact
          elevation,
          color
        });
      });

      // 3. Draw Inter-Event Correlation Arcs
      events.forEach((evt) => {
        if (!evt.corroboratedBy || evt.corroboratedBy.length === 0) return;
        const srcNode = projectedNodes.find((n) => n.event.id === evt.id);
        if (!srcNode) return;

        evt.corroboratedBy.forEach((corrId) => {
          const targetNode = projectedNodes.find((n) => n.event.id === corrId);
          if (!targetNode) return;

          // Draw Parabolic 3D Arch
          ctx.beginPath();
          ctx.moveTo(srcNode.x, srcNode.y);
          const midX = (srcNode.x + targetNode.x) / 2;
          const midY = (srcNode.y + targetNode.y) / 2 - 25; // Arc curvature
          ctx.quadraticCurveTo(midX, midY, targetNode.x, targetNode.y);
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      });

      // 4. Draw Ground Shadows & Vertical Telemetry Pillars
      projectedNodes.forEach((node) => {
        const isSelected = selectedEventId === node.event.id;

        // Ground shadow drop
        ctx.beginPath();
        ctx.arc(node.x, node.baseY, isSelected ? 6 : 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();

        // Vertical Laser Pillar
        ctx.beginPath();
        ctx.moveTo(node.x, node.baseY);
        ctx.lineTo(node.x, node.y);
        ctx.strokeStyle = isSelected ? 'rgba(56, 189, 248, 0.8)' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        // Elevated Sphere/Beacon
        ctx.beginPath();
        ctx.arc(node.x, node.y, isSelected ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = isSelected ? 16 : 8;
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Label if selected or critical
        if (isSelected || node.event.severity === 'critical') {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`[${node.event.id}]`, node.x + 10, node.y - 4);
          ctx.fillStyle = node.color;
          ctx.font = '9px monospace';
          ctx.fillText(`${node.event.confidence}% CONF`, node.x + 10, node.y + 8);
        }
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [events, selectedEventId, zoom]);

  // Click on Canvas to select node
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left - canvas.width / 2;
    const clickY = (e.clientY - rect.top - canvas.height / 2) / 0.7;

    const gridSize = 280;

    let closestEvent: UnifiedEvent | null = null;
    let minDist = 30;

    events.forEach((evt) => {
      const lat = typeof evt.location?.lat === 'number' ? evt.location.lat : centerLat;
      const lng = typeof evt.location?.lng === 'number' ? evt.location.lng : centerLng;
      const dx = ((lng - centerLng) / lngSpan) * gridSize;
      const dy = -((lat - centerLat) / latSpan) * gridSize;
      const dist = Math.hypot(dx - clickX, dy - clickY);

      if (dist < minDist) {
        minDist = dist;
        closestEvent = evt;
      }
    });

    if (closestEvent) {
      onSelectEvent(closestEvent);
    }
  };

  return (
    <div className="relative w-full h-[640px] bg-[#05070a] border border-white/10 rounded-sm overflow-hidden corner-brackets select-none flex flex-col">
      {/* 3D FIELD CONTROLS BAR */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#070b10]/90 border border-white/10 backdrop-blur font-mono text-xs">
          <Globe className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-200 font-semibold uppercase tracking-wider">
            3D SPATIAL THREAT & CORRELATION TOPOLOGY
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#070b10]/90 border border-white/10 rounded p-1 backdrop-blur">
          <button
            onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
            }}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300"
            title="Reset Perspective"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CANVAS RENDERING SURFACE */}
      <canvas
        ref={canvasRef}
        width={900}
        height={640}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-crosshair"
      />

      {/* FOOTER LEGEND */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between text-[10px] font-mono text-slate-400 bg-[#070b10]/90 border border-white/10 rounded px-3 py-1.5 backdrop-blur">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-threat-red" />
            <span>Critical (+90m)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>High</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>Medium</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 border-b border-cyan-400 border-dashed" />
            <span>Correlation Arc</span>
          </span>
        </div>
      </div>
    </div>
  );
}
