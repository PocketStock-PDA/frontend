"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const GRADIENT = "linear-gradient(120deg, #4a7dff 0%, #6f9bff 100%)";
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const PUZZLE_PATH =
  "M 10,10 L 42,10 Q 42,-8 60,-8 Q 78,-8 78,10 L 110,10 " +
  "L 110,42 Q 128,42 128,60 Q 128,78 110,78 L 110,110 " +
  "L 78,110 Q 78,92 60,92 Q 42,92 42,110 L 10,110 " +
  "L 10,78 Q 30,78 30,60 Q 30,42 10,42 Z";

type Stock = {
  src: string;
  name: string;
  bg: string;
  imgX?: number;
  imgY?: number;
  imgW?: number;
  imgH?: number;
};

const STOCKS: Stock[] = [
  { src: "/KOSPI-logo/055550_clean.jpg", name: "신한지주",  bg: "#0046FF", imgX: 22, imgY: 6, imgW: 96, imgH: 96 },
  { src: "/KOSPI-logo/000660.png",       name: "SK하이닉스", bg: "#ffffff" },
  { src: "/us-logo/NVDA.png",            name: "NVIDIA",    bg: "#ffffff" },
  { src: "/us-logo/MU.png",             name: "마이크론",   bg: "#ffffff" },
];

export interface WelcomeEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed: () => void;
  ctaLabel?: string;
}

/** 첫 가입 기념 — 소수점 주식 무료 지급 이벤트 팝업 */
export function WelcomeEventDialog({
  open,
  onOpenChange,
  onProceed,
  ctaLabel = "지금 받기",
}: WelcomeEventDialogProps) {
  const reduce = useReducedMotion();
  const [stockIdx, setStockIdx] = useState(0);

  // 열릴 때 첫 종목으로 리셋 후 2.5s 간격 순환. 닫히면 정지.
  useEffect(() => {
    if (!open || reduce) return;
    setStockIdx(0);
    const id = setInterval(
      () => setStockIdx((i) => (i + 1) % STOCKS.length),
      2500,
    );
    return () => clearInterval(id);
  }, [open, reduce]);

  const container = {
    hidden: {},
    show: {
      transition: reduce
        ? { staggerChildren: 0 }
        : { delayChildren: 0.1, staggerChildren: 0.07 },
    },
  };

  const item = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } }
    : { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.48, ease: EASE_OUT } } };

  // 칩 — scale pop으로 "이벤트!" 강조
  const popItem = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } }
    : { hidden: { opacity: 0, scale: 0.8 }, show: { opacity: 1, scale: 1, transition: { duration: 0.42, ease: EASE_OUT } } };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-w-[430px] gap-0 overflow-hidden rounded-t-[28px] border-0 data-[side=bottom]:border-t-0 px-6 pt-3 text-white"
        style={{
          backgroundImage: GRADIENT,
          paddingBottom: "max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))",
        }}
      >
        <motion.div
          className="flex flex-col"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* 드래그 핸들 */}
          <motion.div
            variants={item}
            aria-hidden
            className="mx-auto mb-5 h-1 w-9 rounded-full bg-white/35"
          />

          {/* 이벤트 칩 */}
          <motion.div variants={popItem} className="mb-3">
            <span className="inline-flex items-center rounded-full bg-white px-3 py-[5px] text-[11px] font-bold leading-none text-[#2f6bff]">
              첫 가입 이벤트
            </span>
          </motion.div>

          {/* 히어로 행: 카피(좌) + 퍼즐 피스(우) */}
          <motion.div variants={item} className="mb-8 flex items-center gap-4">
            {/* 카피 */}
            <div className="min-w-0 flex-1 pl-[6px]">
              <SheetTitle className="mb-3 text-[30px] font-bold leading-[1.18] tracking-[-0.025em] text-white">
                첫 주식
                <br />
                무료 지급!
              </SheetTitle>
              <SheetDescription className="text-[14px] leading-relaxed text-white/75">
                <span className="font-numeric font-bold tabular-nums text-white">
                  1,000원
                </span>{" "}
                상당의 소수점 주식을
                <br />
                바로 드려요
              </SheetDescription>
            </div>

            {/* 퍼즐 피스 — 종목 로고 crossfade, 독립 입장 애니 */}
            <motion.div
              className="flex-shrink-0"
              role="img"
              aria-label={`${STOCKS[stockIdx].name} 주식 퍼즐 조각`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.55, rotate: -18 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={reduce ? { duration: 0.15 } : { delay: 0.9, duration: 0.85, ease: EASE_OUT }}
              style={{ transformOrigin: "center" }}
            >
              <div className="-translate-x-[6px] -translate-y-[6px]">
              <svg
                width="156"
                height="144"
                viewBox="-10 -12 140 132"
                fill="none"
                aria-hidden="true"
                style={{
                  filter:
                    "drop-shadow(0 10px 24px rgba(10,30,120,0.30)) drop-shadow(0 2px 5px rgba(10,30,120,0.16))",
                  overflow: "visible",
                }}
              >
                <defs>
                  <clipPath id="wePuzzleClip">
                    <path d={PUZZLE_PATH} />
                  </clipPath>
                </defs>

                <g clipPath="url(#wePuzzleClip)">
                  {STOCKS.map((stock, i) => (
                    <g
                      key={stock.src}
                      style={{
                        opacity: i === stockIdx ? 1 : 0,
                        transform: i === stockIdx ? "scale(1)" : "scale(0.88)",
                        transformOrigin: "60px 49px",
                        transition: reduce
                          ? "none"
                          : "opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)",
                      }}
                    >
                      <rect x="-10" y="-12" width="140" height="132" fill={stock.bg} />
                      <image
                        href={stock.src}
                        x={stock.imgX ?? 0}
                        y={stock.imgY ?? -12}
                        width={stock.imgW ?? 140}
                        height={stock.imgH ?? 132}
                        preserveAspectRatio={stock.imgW != null ? "xMidYMid meet" : "xMidYMid slice"}
                      />
                    </g>
                  ))}
                </g>

                <path
                  d={PUZZLE_PATH}
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
              </svg>
              </div>
            </motion.div>
          </motion.div>

          {/* CTA */}
          <motion.button
            variants={item}
            type="button"
            onClick={onProceed}
            whileTap={reduce ? undefined : { scale: 0.98 }}
            className="mb-3 h-[52px] w-full rounded-[10px] bg-white text-base font-bold text-[#2f6bff] shadow-[0_8px_20px_rgba(20,50,180,0.22)] transition-opacity hover:opacity-90 active:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            {ctaLabel}
          </motion.button>

          {/* 나중에 */}
          <motion.button
            variants={item}
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded py-1.5 text-[13px] text-white/45 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-1"
          >
            다음에 할게요
          </motion.button>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
