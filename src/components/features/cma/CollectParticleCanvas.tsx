"use client";

import { useEffect, useRef } from "react";

const FRAME_SRCS = Array.from({ length: 8 }, (_, i) => `/coins/${i + 1}-removebg-preview.png`);
const SPIN_MS = 75; // ms per frame

// 이미지를 모듈 로드 시점에 미리 캐시 — 첫 드래그에서 complete=false 방지
const PRELOADED: HTMLImageElement[] = [];
if (typeof window !== "undefined") {
  FRAME_SRCS.forEach((src) => {
    const img = new Image();
    img.src = src;
    PRELOADED.push(img);
  });
}

function rand(a: number, b: number) { return a + Math.random() * (b - a); }

interface Particle {
  sx: number; sy: number;
  mx: number; my: number;
  ex: number; ey: number;
  t: number;
  duration: number;
  size: number;
  frame: number;
  frameElapsed: number;
}

interface CollectParticleCanvasProps {
  /** 드래그 중이면 true, 손을 놓으면 false — 파티클 방출 제어 */
  emitting: boolean;
  /** 드래그 진행률(0–1) — re-render 없이 읽기 위해 ref로 전달 */
  pctRef: React.RefObject<number>;
  origin: DOMRect | null;
  target: DOMRect | null;
}

export function CollectParticleCanvas({
  emitting,
  pctRef,
  origin,
  target,
}: CollectParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stateRef = useRef({
    particles: [] as Particle[],
    emitting: false,
    raf: undefined as number | undefined,
    lastTime: 0,
    emitAccum: 0,
  });

  // Match canvas to viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Sync emitting flag and manage rAF loop
  useEffect(() => {
    const state = stateRef.current;
    state.emitting = emitting;

    if (!origin || !target) return;

    const tx = target.left + target.width / 2;
    const ty = target.top + target.height / 2;

    function spawn() {
      const pct = pctRef.current ?? 0;
      if (pct < 0.03) return;
      const sx = rand(origin!.left + 8, origin!.right - 8);
      const sy = rand(origin!.top + 8, origin!.bottom - 8);
      const ex = tx + rand(-14, 14);
      const ey = ty + rand(-10, 10);
      state.particles.push({
        sx, sy, ex, ey,
        mx: (sx + ex) / 2 + rand(-36, 36),
        my: (sy + ey) / 2 - rand(18, 55),
        t: 0,
        duration: rand(480, 700),
        size: rand(28, 42),
        frame: Math.floor(rand(0, 8)),
        frameElapsed: 0,
      });
    }

    function tick(ts: number) {
      const dt = state.lastTime ? Math.min(ts - state.lastTime, 50) : 16;
      state.lastTime = ts;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) {
        state.raf = requestAnimationFrame(tick);
        return;
      }

      // Emit new particles proportional to drag pct
      if (state.emitting) {
        const pct = pctRef.current ?? 0;
        // interval: 180ms at pct=0 → 55ms at pct=1
        const emitInterval = Math.max(55, 180 - pct * 125);
        state.emitAccum += dt;
        while (state.emitAccum >= emitInterval) {
          spawn();
          state.emitAccum -= emitInterval;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      state.particles = state.particles.filter((p) => {
        p.t += dt / p.duration;
        if (p.t >= 1) return false;

        p.frameElapsed += dt;
        if (p.frameElapsed >= SPIN_MS) {
          p.frame = (p.frame + 1) % 8;
          p.frameElapsed -= SPIN_MS;
        }

        const t = p.t;
        const it = 1 - t;
        const x = it * it * p.sx + 2 * it * t * p.mx + t * t * p.ex;
        const y = it * it * p.sy + 2 * it * t * p.my + t * t * p.ey;

        // Scale: 0→1 during first 15%, hold, 0.5 at end
        const scale =
          t < 0.15 ? t / 0.15 :
          t < 0.8  ? 1 :
          1 - (t - 0.8) / 0.2 * 0.5;

        // Opacity: fade in, hold, fade out
        const opacity =
          t < 0.12 ? t / 0.12 :
          t < 0.82 ? 1 :
          1 - (t - 0.82) / 0.18;

        const img = PRELOADED[p.frame];
        if (!img?.complete) return true;

        const sz = p.size * scale;
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, x - sz / 2, y - sz / 2, sz, sz);
        return true;
      });

      ctx.globalAlpha = 1;

      // Keep loop alive while emitting or particles still in flight
      if (state.emitting || state.particles.length > 0) {
        state.raf = requestAnimationFrame(tick);
      } else {
        state.raf = undefined;
      }
    }

    // Boot loop if not already running
    if (!state.raf) {
      state.lastTime = 0;
      state.emitAccum = 9999; // 첫 tick에서 즉시 spawn
      state.raf = requestAnimationFrame(tick);
    }
  }, [emitting, origin, target, pctRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const state = stateRef.current;
      if (state.raf !== undefined) cancelAnimationFrame(state.raf);
    };
  }, []);

  if (!origin || !target) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60]"
    />
  );
}
