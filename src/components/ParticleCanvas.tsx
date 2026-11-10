import React, { useEffect, useRef } from 'react';
import { VFXPreset } from '../types/vn';

interface ParticleCanvasProps {
  preset: VFXPreset;
  triggerKey?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
  color: string;
}

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ preset, triggerKey = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const slashTimerRef = useRef<number>(0);

  useEffect(() => {
    if (preset === 'slash-crimson' || preset === 'slash-cyan') {
      slashTimerRef.current = 1.0;
    }
  }, [preset, triggerKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const count =
      preset === 'none'
        ? 0
        : preset === 'rain' || preset === 'silver-rain'
        ? 110
        : preset === 'crimson-sparks' || preset === 'slash-crimson' || preset === 'slash-cyan'
        ? 75
        : 65;

    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -0.4 - Math.random() * 0.8,
      size: 1.2 + Math.random() * 2.6,
      alpha: 0.25 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      color: '#bae6fd',
    }));

    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      ctx.clearRect(0, 0, width, height);

      if (preset === 'rain' || preset === 'silver-rain') {
        ctx.lineCap = 'round';
        particles.forEach((p, idx) => {
          const speed = preset === 'silver-rain' ? 14 : 11;
          p.x -= speed * 0.24;
          p.y += speed;
          if (p.y > height + 30 || p.x < -30) {
            p.x = Math.random() * (width + 220);
            p.y = -20 - Math.random() * 120;
          }
          if (preset === 'silver-rain' && idx % 6 === 0) {
            ctx.beginPath();
            ctx.fillStyle = `rgba(186, 230, 253, ${0.4 + 0.35 * Math.sin(now * 0.004 + p.phase)})`;
            ctx.arc(p.x, p.y, p.size * 0.9, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.strokeStyle =
              preset === 'silver-rain'
                ? `rgba(186, 230, 253, ${p.alpha * 0.42})`
                : `rgba(148, 163, 184, ${p.alpha * 0.35})`;
            ctx.lineWidth = 1.15;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - 5.5, p.y + 24);
            ctx.stroke();
          }
        });
      } else if (preset === 'stardust' || preset === 'embers' || preset === 'crimson-sparks' || preset === 'slash-crimson' || preset === 'slash-cyan') {
        particles.forEach((p, idx) => {
          const isEmber = preset === 'embers';
          const isSpark = preset === 'crimson-sparks' || preset === 'slash-crimson';
          p.y += isSpark ? (-2.2 - (idx % 4) * 0.8) : (-0.35 - (idx % 3) * 0.22);
          p.x += Math.sin(now * 0.0015 + p.phase) * (isSpark ? 1.8 : 0.45);
          if (p.y < -20) {
            p.y = height + 15;
            p.x = Math.random() * width;
          }
          const twinkle = 0.45 + 0.55 * Math.sin(now * 0.0035 + p.phase);
          const r = p.size * (0.8 + twinkle * 0.5);
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.8);
          if (isSpark) {
            grad.addColorStop(0, `rgba(255, 228, 230, ${p.alpha * twinkle})`);
            grad.addColorStop(0.45, `rgba(251, 113, 133, ${p.alpha * 0.7 * twinkle})`);
            grad.addColorStop(1, 'rgba(225, 29, 72, 0)');
          } else if (isEmber) {
            grad.addColorStop(0, `rgba(254, 243, 199, ${p.alpha * twinkle * 0.85})`);
            grad.addColorStop(0.5, `rgba(251, 191, 36, ${p.alpha * 0.45 * twinkle})`);
            grad.addColorStop(1, 'rgba(180, 83, 9, 0)');
          } else {
            grad.addColorStop(0, `rgba(240, 249, 255, ${p.alpha * twinkle})`);
            grad.addColorStop(0.45, `rgba(125, 211, 252, ${p.alpha * 0.65 * twinkle})`);
            grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          }
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 2.8, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (preset === 'snow-petals') {
        particles.forEach((p) => {
          p.y += 0.85 + p.size * 0.18;
          p.x += 0.65 + Math.sin(now * 0.002 + p.phase) * 0.9;
          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }
          if (p.x > width + 20) p.x = -20;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(now * 0.0015 + p.phase);
          ctx.fillStyle = `rgba(255, 241, 245, ${p.alpha * 0.82})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 2.1, p.size * 1.1, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      } else if (preset === 'memory-glitch') {
        if (Math.random() < 0.35) {
          const bands = 2 + Math.floor(Math.random() * 3);
          for (let i = 0; i < bands; i++) {
            const by = Math.random() * height;
            const bh = 2 + Math.random() * 14;
            ctx.fillStyle = i % 2 === 0 ? 'rgba(125, 211, 252, 0.09)' : 'rgba(251, 113, 133, 0.08)';
            ctx.fillRect(0, by, width, bh);
          }
        }
      }

      // Render dynamic photon sword slash arc when triggered
      if (slashTimerRef.current > 0) {
        const t = slashTimerRef.current;
        slashTimerRef.current = Math.max(0, slashTimerRef.current - dt * 2.6);
        ctx.save();
        const isCrimson = preset === 'slash-crimson';
        ctx.strokeStyle = isCrimson
          ? `rgba(251, 113, 133, ${t})`
          : `rgba(125, 211, 252, ${t})`;
        ctx.shadowColor = isCrimson ? '#e11d48' : '#38bdf8';
        ctx.shadowBlur = 32;
        ctx.lineWidth = 10 * t;
        ctx.beginPath();
        ctx.moveTo(width * 0.12, height * 0.82);
        ctx.quadraticCurveTo(width * 0.48, height * 0.36, width * 0.88, height * 0.14);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${t})`;
        ctx.lineWidth = 3.2 * t;
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, [preset]);

  return (
    <canvas
      ref={canvasRef}
      className="vn-particle-canvas"
      aria-hidden="true"
    />
  );
};
