"use client";

import { useEffect, useMemo } from "react";
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

const COUNT = 12;
const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * "CMA로 모으기" 시 포인트 코인들이 수집 잔돈 블록에서 CMA 카드로 모여드는 연출.
 * 화면 전체를 덮는 pointer-events-none 오버레이. 부모가 key 로 매 실행마다 리마운트한다.
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
      const ex = tx + rand(-20, 20);
      const ey = ty + rand(-12, 12);
      return {
        i,
        sx,
        sy,
        ex,
        ey,
        mx: (sx + ex) / 2 + rand(-12, 12),
        my: (sy + ey) / 2 - rand(10, 26), // 경로 중간에서 살짝 떠올랐다 버튼으로 모이는 완만한 호
        size: rand(22, 30),
        delay: i * 0.03,
      };
    });
  }, [active, origin, target]);

  // 모션 비활성/대상 없음이면 즉시 종료. 그 외엔 전체 지속시간 뒤 종료.
  useEffect(() => {
    if (!active) return;
    if (reduceMotion || coins.length === 0) {
      onComplete();
      return;
    }
    const total = 1000 + COUNT * 50 + 200;
    const t = window.setTimeout(onComplete, total);
    return () => window.clearTimeout(t);
  }, [active, reduceMotion, coins.length, onComplete]);

  if (!active || reduceMotion || coins.length === 0) return null;

  const tx = (target?.left ?? 0) + (target?.width ?? 0) / 2;
  const ty = (target?.top ?? 0) + (target?.height ?? 0) / 2;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {coins.map((c) => (
        <motion.span
          key={c.i}
          initial={{ x: c.sx, y: c.sy, scale: 0.5, opacity: 0 }}
          animate={{
            x: [c.sx, c.mx, c.ex],
            y: [c.sy, c.my, c.ey],
            scale: [0.5, 1, 0.55],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 0.75,
            delay: c.delay,
            ease: [0.33, 0.0, 0.2, 1], // 부드럽게 가속·감속 (한 곡선으로 정점 멈칫 제거)
            opacity: {
              duration: 0.75,
              delay: c.delay,
              times: [0, 0.16, 0.82, 1],
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
            // 파란 글로시 "P" 포인트 코인 (이미지 참고 · CSS 구현)
            background:
              "radial-gradient(circle at 35% 28%, #9cc6ff 0%, #4a90f5 42%, #2f6bff 76%, #2257d6 100%)",
            boxShadow:
              "inset 0 1.5px 2.5px rgba(255,255,255,0.6), inset 0 0 0 1.5px rgba(255,255,255,0.3), 0 3px 8px rgba(30,70,180,0.4)",
          }}
          className="flex items-center justify-center rounded-full"
        >
          <span
            className="font-bold italic leading-none text-white"
            style={{ fontSize: c.size * 0.5 }}
          >
            P
          </span>
        </motion.span>
      ))}

      {/* 착지 펄스 */}
      <motion.span
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.45, 0], scale: [0.5, 1.4, 1.8] }}
        transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
        style={{
          position: "absolute",
          left: tx,
          top: ty,
          width: 64,
          height: 64,
          marginLeft: -32,
          marginTop: -32,
        }}
        className="rounded-full bg-primary/25"
      />
    </div>
  );
}
