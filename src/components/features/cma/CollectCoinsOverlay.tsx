"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface CollectCoinsOverlayProps {
  active: boolean;
  /** 코인이 출발하는 영역(수집 잔돈 블록) */
  origin: DOMRect | null;
  /** 코인이 모이는 목표(CMA 잔액 카드) */
  target: DOMRect | null;
  /** 애니메이션 종료 콜백 */
  onComplete: () => void;
}

const COUNT = 34;
const COIN_DURATION = 0.92;   // 코인 1개 비행 시간(s)
const COIN_DELAY_STEP = 0.06; // 코인 간 딜레이(s)
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 0.999));

const COIN_FRAMES = Array.from({ length: 8 }, (_, i) => `/coins/${i + 1}-yellow.png`);
const SPIN_MS = 75; // ms per frame → ~13fps

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
    // eslint-disable-next-line @next/next/no-img-element
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

/**
 * "CMA로 모으기" 시 P코인들이 수집 잔돈 블록에서 CMA 카드로 날아드는 연출.
 * 화면 전체를 덮는 pointer-events-none 오버레이. 부모가 key로 매 실행마다 리마운트한다.
 */
export function CollectCoinsOverlay({
  active,
  origin,
  target,
  onComplete,
}: CollectCoinsOverlayProps) {
  const reduceMotion = useReducedMotion();

  const coins = useMemo(() => {
    if (!active || !origin || !target) return [];
    const tx = target.left + target.width / 2;
    const ty = target.top + target.height / 2;
    return Array.from({ length: COUNT }, (_, i) => {
      const sx = rand(origin.left + 12, origin.right - 12);
      const sy = rand(origin.top + 12, origin.bottom - 12);
      const ex = tx + rand(-16, 16);
      const ey = ty + rand(-10, 10);
      return {
        i,
        sx,
        sy,
        ex,
        ey,
        mx: (sx + ex) / 2 + rand(-24, 24),
        my: (sy + ey) / 2 - rand(20, 52),
        size: rand(30, 44),
        delay: i * COIN_DELAY_STEP,
        startFrame: randInt(0, 7),
      };
    });
  }, [active, origin, target]);

  useEffect(() => {
    if (!active) return;
    if (reduceMotion || coins.length === 0) {
      onComplete();
      return;
    }
    const total = Math.round(COIN_DURATION * 1000 + (COUNT - 1) * COIN_DELAY_STEP * 1000 + 300);
    const t = window.setTimeout(onComplete, total);
    return () => window.clearTimeout(t);
  }, [active, reduceMotion, coins.length, onComplete]);

  if (!active || reduceMotion || coins.length === 0) return null;

  const tx = (target?.left ?? 0) + (target?.width ?? 0) / 2;
  const ty = (target?.top ?? 0) + (target?.height ?? 0) / 2;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {coins.map((c) => (
        <motion.div
          key={c.i}
          initial={{ x: c.sx, y: c.sy, scale: 0.35, opacity: 0 }}
          animate={{
            x: [c.sx, c.mx, c.ex],
            y: [c.sy, c.my, c.ey],
            scale: [0.35, 1, 0.45],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: COIN_DURATION,
            delay: c.delay,
            ease: [0.33, 0.0, 0.2, 1],
            opacity: {
              duration: COIN_DURATION,
              delay: c.delay,
              times: [0, 0.14, 0.82, 1],
            },
          }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: c.size,
            height: c.size,
            marginLeft: -c.size / 2,
            marginTop: -c.size / 2,
            willChange: "transform, opacity",
          }}
        >
          <CoinSpinner size={c.size} startFrame={c.startFrame} />
        </motion.div>
      ))}

      {/* 착지 펄스 */}
      <motion.span
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 0.38, 0], scale: [0.4, 1.6, 2.2] }}
        transition={{ duration: 0.55, delay: 0.72, ease: "easeOut" }}
        style={{
          position: "absolute",
          left: tx,
          top: ty,
          width: 60,
          height: 60,
          marginLeft: -30,
          marginTop: -30,
        }}
        className="rounded-full bg-primary/20"
      />
    </div>
  );
}
