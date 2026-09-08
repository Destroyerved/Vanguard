import React, { useEffect, useRef } from 'react';

interface NukeEffectProps {
  active: boolean;
  onComplete?: () => void;
}

export const NukeEffect: React.FC<NukeEffectProps> = ({ active, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const startTime = Date.now();
    const duration = 4000; // 4 seconds total effect

    // Glowing ember particles & smoke puffs
    const embers: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
      life: number;
      maxLife: number;
    }> = [];

    const groundZero = { x: width * 0.5, y: height * 0.48 };

    // Spawn 200 glowing embers & dark smoke particles
    for (let i = 0; i < 220; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 2;
      const isSmoke = Math.random() > 0.6;
      embers.push({
        x: groundZero.x + (Math.random() - 0.5) * 40,
        y: groundZero.y + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed * (isSmoke ? 0.4 : 1.2),
        vy: Math.sin(angle) * speed * 0.8 - Math.random() * 3, // Drift upwards
        size: isSmoke ? Math.random() * 25 + 15 : Math.random() * 4 + 1.5,
        alpha: isSmoke ? 0.4 : 1.0,
        color: isSmoke
          ? `rgba(20, 25, 35, `
          : Math.random() > 0.5
          ? `rgba(255, 180, 50, `
          : `rgba(255, 60, 30, `,
        life: 0,
        maxLife: Math.random() * 120 + 80
      });
    }

    let animId: number;

    const render = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      ctx.clearRect(0, 0, width, height);

      // 1. Initial Blinding Nuclear Flash (0 - 800ms)
      if (elapsed < 900) {
        const flashAlpha = Math.max(0, 1 - elapsed / 850);
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.95})`;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = `rgba(255, 200, 120, ${flashAlpha * 0.5})`;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Expanding Nuclear Fireball Core (100ms - 2500ms)
      if (elapsed > 100 && elapsed < 3000) {
        const fireballProgress = (elapsed - 100) / 2900;
        const fireballRadius = Math.sin(fireballProgress * Math.PI * 0.85) * (width * 0.32);
        const fireballAlpha = Math.max(0, 1 - fireballProgress);

        if (fireballRadius > 0) {
          const grad = ctx.createRadialGradient(
            groundZero.x,
            groundZero.y,
            0,
            groundZero.x,
            groundZero.y,
            fireballRadius
          );
          grad.addColorStop(0, `rgba(255, 255, 255, ${fireballAlpha * 0.95})`);
          grad.addColorStop(0.2, `rgba(255, 210, 80, ${fireballAlpha * 0.9})`);
          grad.addColorStop(0.5, `rgba(255, 80, 20, ${fireballAlpha * 0.75})`);
          grad.addColorStop(0.8, `rgba(180, 20, 10, ${fireballAlpha * 0.4})`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(groundZero.x, groundZero.y, fireballRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // 3. Expanding Supersonic Shockwave Ring
        const shockRadius = fireballProgress * (width * 0.8);
        const shockAlpha = Math.max(0, 1 - fireballProgress * 1.2);
        ctx.strokeStyle = `rgba(255, 240, 200, ${shockAlpha * 0.8})`;
        ctx.lineWidth = Math.max(1, 8 * (1 - fireballProgress));
        ctx.beginPath();
        ctx.arc(groundZero.x, groundZero.y, shockRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 80, 30, ${shockAlpha * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(groundZero.x, groundZero.y, shockRadius * 0.85, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. Update and Render Burning Embers & Radioactive Smoke Particles
      embers.forEach((p) => {
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.05; // Gravity/thermal lift
        p.vx *= 0.98;

        const particleFade = Math.max(0, 1 - p.life / p.maxLife);
        ctx.fillStyle = `${p.color}${p.alpha * particleFade})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + (p.life / p.maxLife) * 0.5), 0, Math.PI * 2);
        ctx.fill();
      });

      if (progress < 1) {
        animId = requestAnimationFrame(render);
      } else {
        if (onComplete) onComplete();
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 pointer-events-none"
    />
  );
};
