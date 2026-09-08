import React, { useEffect, useRef } from 'react';

export const CosmicBackground: React.FC = () => {
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

    // Starfield particles
    const stars: Array<{ x: number; y: number; size: number; alpha: number; speed: number }> = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.2,
        speed: Math.random() * 0.02 + 0.005
      });
    }

    let angle = 0;
    const tracks = [
      { x: 0.22, y: 0.38, vx: 0.00025, vy: -0.0001, id: 'TK-409', label: 'BOGEY-01' },
      { x: 0.68, y: 0.24, vx: -0.0002, vy: 0.00015, id: 'TK-104', label: 'RAFALE-01' },
      { x: 0.85, y: 0.58, vx: -0.0003, vy: -0.0002, id: 'TK-882', label: 'UAV-44' },
      { x: 0.35, y: 0.75, vx: 0.00018, vy: 0.00025, id: 'TK-019', label: 'SAM-ALPHA' }
    ];

    let animId: number;

    const render = () => {
      angle = (angle + 0.006) % (Math.PI * 2);

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Starfield
      stars.forEach((s) => {
        s.alpha += Math.sin(Date.now() * s.speed) * 0.01;
        ctx.fillStyle = `rgba(200, 240, 255, ${Math.max(0.1, Math.min(0.8, s.alpha))})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });

      const cx = width * 0.5;
      const cy = height * 0.52;
      const maxR = Math.min(width, height) * 0.44;

      ctx.save();

      // 2. Concentric Range Rings (Opaque tactical cyan)
      const ringSteps = [0.2, 0.4, 0.6, 0.8, 1.0];
      ctx.lineWidth = 1;
      ringSteps.forEach((step, idx) => {
        ctx.strokeStyle = idx === 4 ? 'rgba(0, 240, 255, 0.16)' : 'rgba(0, 240, 255, 0.06)';
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * step, 0, Math.PI * 2);
        ctx.stroke();

        // Distance range labels
        ctx.fillStyle = 'rgba(0, 240, 255, 0.22)';
        ctx.font = '8.5px "JetBrains Mono", monospace';
        ctx.fillText(`${Math.round(step * 150)}NM`, cx + 8, cy - maxR * step + 12);
      });

      // 3. Azimuth Radials
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
      ctx.setLineDash([3, 6]);
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 4. Subtle Rotating Sweep Cone
      const sweepGrad = ctx.createConicGradient(angle - Math.PI / 2, cx, cy);
      sweepGrad.addColorStop(0, 'rgba(0, 240, 255, 0.12)');
      sweepGrad.addColorStop(0.06, 'rgba(0, 240, 255, 0.02)');
      sweepGrad.addColorStop(0.18, 'rgba(0, 240, 255, 0.0)');
      sweepGrad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.fill();

      // Main sweep line
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.28)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
      ctx.stroke();

      // 5. Radar Target Blips
      tracks.forEach((t) => {
        t.x = (t.x + t.vx + 1) % 1;
        t.y = (t.y + t.vy + 1) % 1;
        const px = t.x * width;
        const py = t.y * height;

        ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.strokeRect(px - 4, py - 4, 8, 8);

        ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
        ctx.font = '7.5px "JetBrains Mono", monospace';
        ctx.fillText(t.label, px + 7, py - 1);
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
      className="fixed inset-0 pointer-events-none z-10 opacity-70"
    />
  );
};
