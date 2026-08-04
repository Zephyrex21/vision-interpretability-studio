import { useEffect, useRef } from 'react';
import styles from './BackgroundAtmosphere.module.css';

interface Blob {
  baseX: number;
  baseY: number;
  radius: number;
  colorVar: '--atmosphere-a' | '--atmosphere-b' | '--atmosphere-c';
  driftX: number;
  driftY: number;
  speed: number;
  phase: number;
}

const BLOBS: Blob[] = [
  {
    baseX: 0.18,
    baseY: 0.16,
    radius: 0.42,
    colorVar: '--atmosphere-a',
    driftX: 0.06,
    driftY: 0.04,
    speed: 0.00018,
    phase: 0,
  },
  {
    baseX: 0.82,
    baseY: 0.22,
    radius: 0.36,
    colorVar: '--atmosphere-c',
    driftX: 0.05,
    driftY: 0.05,
    speed: 0.00014,
    phase: 2.1,
  },
  {
    baseX: 0.5,
    baseY: 0.85,
    radius: 0.46,
    colorVar: '--atmosphere-b',
    driftX: 0.04,
    driftY: 0.03,
    speed: 0.00011,
    phase: 4.2,
  },
];

/**
 * Mounted once in App.tsx, behind everything (fixed, pointer-events: none,
 * negative z-index). Purely decorative — gives the shell real atmospheric
 * depth instead of a flat canvas color, matching the rest of the
 * portfolio's canvas-particle signature, without touching the actual
 * accent/heat palette (colors come straight from --atmosphere-* tokens,
 * which are themselves derived from the existing --accent/--heat-* values
 * per theme).
 */
export function BackgroundAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    let width = 0;
    let height = 0;
    let frameId = 0;

    function resize() {
      const c = canvasRef.current;
      if (!c) return;
      width = window.innerWidth;
      height = window.innerHeight;
      c.width = width * dpr;
      c.height = height * dpr;
      c.style.width = `${width}px`;
      c.style.height = `${height}px`;
    }

    function colorAt(varName: string): string {
      return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }

    function draw(time: number) {
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      for (const blob of BLOBS) {
        const t = prefersReducedMotion ? 0 : time * blob.speed + blob.phase;
        const cx = (blob.baseX + Math.sin(t) * blob.driftX) * width;
        const cy = (blob.baseY + Math.cos(t * 0.8) * blob.driftY) * height;
        const r = blob.radius * Math.max(width, height);

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, colorAt(blob.colorVar));
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      if (!prefersReducedMotion) {
        frameId = requestAnimationFrame(draw);
      }
    }

    resize();
    draw(0);

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
