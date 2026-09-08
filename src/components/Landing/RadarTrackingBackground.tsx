import React, { useEffect, useRef } from 'react';

export const RadarTrackingBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let angle = 0;

    // Simulated radar tracks in the background
    const tracks = [
      { x: 0.25, y: 0.35, vx: 0.0003, vy: -0.0001, id: 'TK-409', type: 'HOSTILE', label: 'BOGEY-01' },
      { x: 0.65, y: 0.28, vx: -0.0002, vy: 0.0002, id: 'TK-104', type: 'FRIENDLY', label: 'RAFALE-01' },
      { x: 0.82, y: 0.60, vx: -0.0004, vy: -0.0002, id: 'TK-882', type: 'UNKNOWN', label: 'UAV-44' },
      { x: 0.38, y: 0.72, vx: 0.0002, vy: 0.0003, id: 'TK-019', type: 'FRIENDLY', label: 'SAM-ALPHA' }
    ];

    let animId: number;

    const render = () => {
      angle = (angle + 0.008) % (Math.PI * 2);

      // Clear with slight persistence
      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const maxR = Math.min(width, height) * 0.46;

      ctx.save();

      // 1. Concentric Range Rings (Opaque tactical cyan/emerald)
      const ringSteps = [0.2, 0.4, 0.6, 0.8, 1.0];
      ctx.lineWidth = 1;
      ringSteps.forEach((step, idx) => {
        ctx.strokeStyle = idx === 4 ? 'rgba(0, 240, 255, 0.18)' : 'rgba(0, 240, 255, 0.07)';
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * step, 0, Math.PI * 2);
        ctx.stroke();

        // Distance range labels
        ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(`${Math.round(step * 150)}NM`, cx + 8, cy - maxR * step + 12);
      });

      // 2. Azimuth Radial Lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.setLineDash([3, 6]);
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 3. Coordinate Grid Ticks (MGRS Military Lattice)
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
      const gridSize = 80;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 4. Rotating Radar Sweep Beam (Subtle background scanning cone)
      const sweepGrad = ctx.createConicGradient(angle - Math.PI / 2, cx, cy);
      sweepGrad.addColorStop(0, 'rgba(0, 240, 255, 0.14)');
      sweepGrad.addColorStop(0.06, 'rgba(0, 240, 255, 0.03)');
      sweepGrad.addColorStop(0.18, 'rgba(0, 240, 255, 0.0)');
      sweepGrad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.fill();

      // Main sweep line
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
      ctx.stroke();

      // 5. Radar Target Blips & Flight Vector Trails
      tracks.forEach((t) => {
        t.x = (t.x + t.vx + 1) % 1;
        t.y = (t.y + t.vy + 1) % 1;
        const px = t.x * width;
        const py = t.y * height;

        const isHostile = t.type === 'HOSTILE';
        const color = isHostile ? 'rgba(255, 42, 75, 0.6)' : 'rgba(0, 240, 255, 0.5)';

        // Draw Target Blip
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();

        // Vector line
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + t.vx * 30000, py + t.vy * 30000);
        ctx.stroke();

        // Target Tag Box
        ctx.strokeStyle = color;
        ctx.strokeRect(px - 5, py - 5, 10, 10);

        ctx.fillStyle = color;
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillText(`${t.label}`, px + 8, py - 2);
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10 opacity-75"
    />
  );
};
