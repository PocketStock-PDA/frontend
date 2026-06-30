"use client";

import { useEffect, useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// ── SVG 직소 경로 (JigsawPuzzle과 동일 로직) ─────────────────
const S     = 40;
const THICK = 5.5;
const A = 0.4, E = 0.6, R = 0.14;

function edgeSign(kind: "h" | "v", i: number, j: number): 1 | -1 {
  return ((i * 928371 + j * 1299721 + (kind === "h" ? 17 : 91)) % 2) === 0 ? 1 : -1;
}
function hEdge(x0: number, x1: number, y: number, b: number): string {
  if (b === 0) return `L ${x1} ${y} `;
  const len = Math.abs(x1 - x0), dir = Math.sign(x1 - x0);
  const a = x0 + dir * len * A, e = x0 + dir * len * E, r = len * R;
  const sweep = b > 0 ? (dir > 0 ? 1 : 0) : (dir > 0 ? 0 : 1);
  return `L ${a} ${y} A ${r} ${r} 0 1 ${sweep} ${e} ${y} L ${x1} ${y} `;
}
function vEdge(x: number, y0: number, y1: number, b: number): string {
  if (b === 0) return `L ${x} ${y1} `;
  const len = Math.abs(y1 - y0), dir = Math.sign(y1 - y0);
  const a = y0 + dir * len * A, e = y0 + dir * len * E, r = len * R;
  const sweep = b > 0 ? (dir > 0 ? 0 : 1) : (dir > 0 ? 1 : 0);
  return `L ${x} ${a} A ${r} ${r} 0 1 ${sweep} ${x} ${e} L ${x} ${y1} `;
}
function piecePath(r: number, c: number, rows: number, cols: number): string {
  const x0 = c*S, y0 = r*S, x1 = (c+1)*S, y1 = (r+1)*S;
  return (
    `M ${x0} ${y0} ` +
    hEdge(x0, x1, y0, r === 0        ? 0 : edgeSign("h", r,   c)) +
    vEdge(x1, y0, y1, c === cols - 1 ? 0 : edgeSign("v", r,   c+1)) +
    hEdge(x1, x0, y1, r === rows - 1 ? 0 : edgeSign("h", r+1, c)) +
    vEdge(x0, y1, y0, c === 0        ? 0 : edgeSign("v", r,   c)) +
    "Z"
  );
}

// ── 모듈 레벨 상수 (한 번만 계산) ────────────────────────────
const TOTAL = 100, COLS = 10, ROWS = 10;

const PATHS = Array.from({ length: TOTAL }, (_, i) =>
  piecePath(Math.floor(i / COLS), i % COLS, ROWS, COLS),
);

// 황금각 배치 — 100개 방향이 균등하게 분산
const GOLDEN = 2.399963229728653;

function pieceEntry(i: number) {
  const angle = i * GOLDEN;
  const dist  = 310 + ((i * 37 + 13) % 11) * 11; // 310~430 SVG 단위
  return {
    dx:  Math.cos(angle) * dist,
    dy:  Math.sin(angle) * dist,
    rot: (((i * 73 + 29) % 360) - 180) * 0.35, // ±63° 초기 회전
  };
}

// 결정론적 셔플 — 조각이 0→99 순서로 도착하지 않게
function makeShuffleOrder(n: number): number[] {
  const arr: number[] = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = ((i * 1299721 + 491) % (i + 1) + (i + 1)) % (i + 1);
    const tmp = arr[i]!; arr[i] = arr[j]!; arr[j] = tmp;
  }
  return arr;
}
const SHUFFLE = makeShuffleOrder(TOTAL);       // SHUFFLE[rank] = pieceIndex
const RANK_OF = new Array<number>(TOTAL).fill(0);
SHUFFLE.forEach((pi, rank) => { RANK_OF[pi] = rank; });

// ── 타이밍 ────────────────────────────────────────────────────
const STAGGER  = 1.5;   // 첫 조각 ~ 마지막 조각 사이 (초)
const FLIGHT   = 0.55;  // 비행 시간 근사
const DISSOLVE_AT   = STAGGER + FLIGHT + 0.35; // 마지막 조각 착지 후 여유
const DISSOLVE_DUR  = 1.1;  // 조각 fade-out 시간
const LOGO_DELAY    = 0.2;  // 조각이 먼저 빠지고 로고가 따라옴
const LOGO_DUR      = 0.9;

// ── 컴포넌트 ─────────────────────────────────────────────────
export interface PuzzleAssemblyProps {
  logoUrl?: string | null | undefined;
  /** 팝업 등장 후 조립 시작까지 대기 시간(초). 기본 0. */
  startDelay?: number;
  className?: string;
}

export function PuzzleAssembly({ logoUrl, startDelay = 0, className }: PuzzleAssemblyProps) {
  const uid    = useId();
  const reduce = useReducedMotion();

  const [dissolving, setDissolving] = useState(false);

  useEffect(() => {
    const t = setTimeout(
      () => setDissolving(true),
      reduce ? 0 : (startDelay + DISSOLVE_AT) * 1000,
    );
    return () => clearTimeout(t);
  }, [reduce, startDelay]);

  const glassId  = `pa-gl-${uid}`;
  const grooveId = `pa-gr-${uid}`;
  const liftId   = `pa-li-${uid}`;

  return (
    <svg
      viewBox={`-3 -3 ${COLS * S + 8} ${ROWS * S + 14}`}
      className={cn("w-full", className)}
      style={{ overflow: "hidden" }}
      role="img"
      aria-label="퍼즐 조립 중"
    >
      <defs>
        {/* 유리 광택 */}
        <filter id={glassId} x="-40%" y="-40%" width="180%" height="200%"
          colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="blur" />
          <feSpecularLighting in="blur" surfaceScale="6" specularConstant="1.1"
            specularExponent="30" lightingColor="#ffffff" result="spec">
            <fePointLight x="62" y="42" z="150" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="sc" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="sc" /></feMerge>
          <feDropShadow dx="0" dy="4.5" stdDeviation="3"
            floodColor="#1e3a8a" floodOpacity="0.45" />
        </filter>

        {/* 빈 슬롯 음각 */}
        <filter id={grooveId} x="-20%" y="-20%" width="140%" height="140%"
          colorInterpolationFilters="sRGB">
          <feComponentTransfer in="SourceAlpha" result="inv">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feGaussianBlur in="inv" stdDeviation="1.6" result="iblur" />
          <feOffset in="iblur" dx="0" dy="1.1" result="ioff" />
          <feFlood floodColor="#94a3c8" floodOpacity="0.3" result="icol" />
          <feComposite in="icol" in2="ioff" operator="in" result="ishadow" />
          <feComposite in="ishadow" in2="SourceAlpha" operator="in" result="isc" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="isc" />
          </feMerge>
        </filter>

        {/* 로고 조각 lift */}
        <filter id={liftId} x="-20%" y="-20%" width="140%" height="160%"
          colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="3" stdDeviation="2.4"
            floodColor="#0b1733" floodOpacity="0.28" />
        </filter>

        {/* 조각별 클립 경로
            clipPathUnits="userSpaceOnUse" → 참조 요소의 좌표계 기준.
            motion.g 안에서 참조 시 CSS transform된 로컬 좌표계가 적용되므로
            이미지를 (0,0)에 두면 비행 중에도 정확한 logo 조각이 잘림. */}
        {PATHS.map((d, i) => (
          <clipPath key={i} id={`${uid}-c${i}`} clipPathUnits="userSpaceOnUse">
            <path d={d} />
          </clipPath>
        ))}
      </defs>

      {/* ① 빈 슬롯 (배경) */}
      {PATHS.map((d, i) => (
        <path
          key={`slot-${i}`}
          d={d}
          fill="#f4f6fb"
          fillOpacity={0.7}
          stroke="#e9edf4"
          strokeWidth={0.75}
          strokeLinejoin="round"
          filter={`url(#${grooveId})`}
        />
      ))}

      {/* ② 날아오는 logo 조각들 — dissolve 시 전체 fade-out */}
      <motion.g
        animate={{ opacity: dissolving ? 0 : 1 }}
        transition={{ duration: DISSOLVE_DUR, ease: [0.4, 0, 0.6, 1] }}
      >
      {PATHS.map((_, i) => {
        const rank  = RANK_OF[i] ?? i;
        const delay = reduce ? 0 : startDelay + (rank / (TOTAL - 1)) * STAGGER;
        const { dx, dy, rot } = pieceEntry(i);

        return (
          <motion.g
            key={`piece-${i}`}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
            initial={reduce ? false : { x: dx, y: dy, rotate: rot, opacity: 0 }}
            animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            transition={
              reduce
                ? { duration: 0 }
                : {
                    x:       { type: "spring", stiffness: 200, damping: 26, delay },
                    y:       { type: "spring", stiffness: 200, damping: 26, delay },
                    rotate:  { type: "spring", stiffness: 260, damping: 22, delay },
                    opacity: { duration: 0.08, delay },
                  }
            }
          >
            {logoUrl ? (
              <>
                {/* 그림자 (살짝 띄워주는 효과) */}
                <g filter={`url(#${liftId})`}>
                  {/*
                    이미지를 (0,0)에 두는 것이 핵심:
                    CSS translate(dx,dy) 상태의 로컬 좌표계에서 clipPath가 계산되므로
                    이미지(0,0)가 로컬 원점에 고정 → 클립이 항상 정확한 logo 조각을 잘라냄.
                  */}
                  <image
                    href={logoUrl}
                    x={0}
                    y={0}
                    width={COLS * S}
                    height={ROWS * S}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#${uid}-c${i})`}
                  />
                </g>
                {/* 조각 경계선 — dissolve 시 사라짐 */}
                <motion.path
                  d={PATHS[i]}
                  fill="none"
                  strokeLinejoin="round"
                  strokeWidth={0.9}
                  animate={{ stroke: dissolving ? "rgba(255,255,255,0)" : "rgba(255,255,255,0.55)" }}
                  transition={{ duration: DISSOLVE_DUR, ease: "easeInOut" }}
                />
              </>
            ) : (
              /* 로고 없을 때: 블루 유리 조각 */
              <>
                <path d={PATHS[i]} transform={`translate(0 ${THICK})`}
                  fill="#1e3a8a" fillOpacity={0.15} />
                <path
                  d={PATHS[i]}
                  fill="#3b82f6"
                  fillOpacity={0.92}
                  stroke="rgba(255,255,255,0.75)"
                  strokeWidth={0.75}
                  strokeLinejoin="round"
                  filter={`url(#${glassId})`}
                />
              </>
            )}
          </motion.g>
        );
      })}
      </motion.g>

      {/* ③ 풀 로고 — dissolve 시 fade-in. 외곽이 직선이라 clip 불필요 */}
      {logoUrl && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: dissolving ? 1 : 0 }}
          transition={{ duration: LOGO_DUR, delay: dissolving ? LOGO_DELAY : 0, ease: [0.16, 1, 0.3, 1] }}
        >
          <image
            href={logoUrl}
            x={0}
            y={0}
            width={COLS * S}
            height={ROWS * S}
            preserveAspectRatio="xMidYMid slice"
          />
        </motion.g>
      )}
    </svg>
  );
}
