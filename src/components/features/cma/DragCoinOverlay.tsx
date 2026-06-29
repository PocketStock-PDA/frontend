"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

// ── 코인 스피너 ─────────────────────────────────────────────
const COIN_FRAMES = Array.from({ length: 8 }, (_, i) => `/coins/${i + 1}-yellow.png`);
const SPIN_MS = 58; // ~17fps — 빠를수록 회전감 생생

// 모듈 로드 시 이미지 프리로드
if (typeof window !== "undefined") {
  COIN_FRAMES.forEach((src) => { const img = new Image(); img.src = src; });
}

function CoinSpinner({ size, startFrame }: { size: number; startFrame: number }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef(startFrame % 8);
  useEffect(() => {
    const id = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % 8;
      if (imgRef.current) imgRef.current.src = COIN_FRAMES[frameRef.current] ?? "";
    }, SPIN_MS);
    return () => clearInterval(id);
  }, []);
  return (
    <img
      ref={imgRef}
      src={COIN_FRAMES[startFrame % 8]}
      width={size}
      height={size}
      style={{ objectFit: "contain", display: "block" }}
      alt=""
    />
  );
}

// ── 파티클 타입 ─────────────────────────────────────────────
interface Particle {
  id: number;
  sx: number; sy: number;
  mx: number; my: number;
  ex: number; ey: number;
  size: number;
  startFrame: number;
  duration: number;
}

function rand(a: number, b: number) { return a + Math.random() * (b - a); }
function randInt(a: number, b: number) { return Math.floor(rand(a, b + 0.999)); }

// CollectSlider 내부 상수와 맞춤
const THUMB_W = 36;
const THUMB_PAD = 6;

function thumbCenter(sliderRect: DOMRect, pct: number) {
  const maxTravel = sliderRect.width - THUMB_W - THUMB_PAD * 2;
  return {
    x: sliderRect.left + THUMB_PAD + pct * maxTravel + THUMB_W / 2,
    y: sliderRect.top + sliderRect.height / 2,
  };
}

let _id = 0;

function makeParticle(
  origins: DOMRect[],
  sliderRect: DOMRect,
  pct: number,
  reverse: boolean,
): Particle {
  const origin = origins[Math.floor(Math.random() * origins.length)]!;
  const thumb = thumbCenter(sliderRect, pct);
  const ox = rand(origin.left + 10, origin.right - 10);
  const oy = rand(origin.top + 10, origin.bottom - 10);

  // 정방향: origin → 썸 위치 / 역방향: 썸 위치 → origin
  const sx = reverse ? thumb.x + rand(-10, 10) : ox;
  const sy = reverse ? thumb.y + rand(-8, 8)   : oy;
  const ex = reverse ? ox : thumb.x + rand(-10, 10);
  const ey = reverse ? oy : thumb.y + rand(-8, 8);

  const mx = (sx + ex) / 2 + rand(-28, 28);
  const my = (sy + ey) / 2 - rand(22, 52);

  return {
    id: _id++,
    sx, sy, mx, my, ex, ey,
    size: rand(30, 46),
    startFrame: randInt(0, 7),
    duration: rand(0.48, 0.72),
  };
}

// ── 단일 코인 motion ────────────────────────────────────────
function MotionCoin({
  p,
  onDone,
}: {
  p: Particle;
  onDone: (id: number) => void;
}) {
  return (
    <motion.div
      initial={{ x: p.sx, y: p.sy, scale: 0.3, opacity: 0 }}
      animate={{
        x: [p.sx, p.mx, p.ex],
        y: [p.sy, p.my, p.ey],
        scale: [0.3, 1, 0.38],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: p.duration,
        ease: [0.33, 0, 0.2, 1],
        opacity: { duration: p.duration, times: [0, 0.14, 0.82, 1] },
      }}
      onAnimationComplete={() => onDone(p.id)}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: p.size,
        height: p.size,
        marginLeft: -p.size / 2,
        marginTop: -p.size / 2,
        pointerEvents: "none",
        willChange: "transform, opacity",
      }}
    >
      <CoinSpinner size={p.size} startFrame={p.startFrame} />
    </motion.div>
  );
}

// ── 메인 오버레이 ───────────────────────────────────────────
interface DragCoinOverlayProps {
  /** 드래그 중이면 true — false가 되면 방출 중단, 기존 파티클은 마저 날아감 */
  emitting: boolean;
  /** onProgress로 업데이트되는 진행률 ref — React re-render 없이 읽음 */
  pctRef: React.RefObject<number>;
  /** 코인이 출발하는 타일들 — 각 파티클이 랜덤하게 하나를 선택 */
  origins: DOMRect[];
  target: DOMRect | null;
}

export function DragCoinOverlay({
  emitting,
  pctRef,
  origins,
  target,
}: DragCoinOverlayProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const prevPctRef = useRef(0);

  const remove = useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    if (!emitting || origins.length === 0 || !target) {
      prevPctRef.current = pctRef.current ?? 0;
      return;
    }

    prevPctRef.current = pctRef.current ?? 0;

    const id = setInterval(() => {
      const pct = pctRef.current ?? 0;
      const prev = prevPctRef.current;
      const delta = pct - prev;
      prevPctRef.current = pct;

      if (Math.abs(delta) < 0.006) return;

      const reverse = delta < 0;
      // 빠른 드래그일수록 delta가 크고 코인을 더 많이 방출
      const count = Math.max(1, Math.min(4, Math.round(Math.abs(delta) * 18)));

      setParticles((prev) => [
        ...prev,
        ...Array.from({ length: count }, () => makeParticle(origins, target!, pct, reverse)),
      ]);
    }, 60);

    return () => clearInterval(id);
  }, [emitting, origins, target, pctRef]);

  if (particles.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 9998 }}
    >
      {particles.map((p) => (
        <MotionCoin key={p.id} p={p} onDone={remove} />
      ))}
    </div>
  );
}
