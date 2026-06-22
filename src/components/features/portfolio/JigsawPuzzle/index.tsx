"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface JigsawPuzzleProps {
  /** 전체 조각 수, 기본 100 */
  total?: number;
  /** 채워진 조각 수 */
  filled: number;
  /** 열 수, 기본 10 */
  columns?: number;
  /** 최근 채워진(하이라이트) 조각 인덱스. 기본 filled-1 */
  recentIndex?: number;
  /** 선택 확정(탭/드래그 종료 시). 지정 시 인터랙티브 */
  onSelectionCommit?: (
    selection: { mode: "buy" | "sell"; indexes: number[] } | null,
  ) => void;
  /** 확정된(하이라이트) 조각 인덱스 */
  selectedIndexes?: number[];
  className?: string;
}

const S = 40; // viewBox 단위 조각 크기
const THICK = 5.5; // 유리 두께(아래 side 면 오프셋)

// 직소 탭: 목 시작/끝(A~E)과 반경(R). R이 작을수록 홈이 얕음
const A = 0.4;
const E = 0.6;
const R = 0.14;

/** 내부 경계 탭 부호(결정적) — 같은 경계는 양쪽 조각이 같은 부호를 공유해 맞물림 */
function edgeSign(kind: "h" | "v", i: number, j: number): 1 | -1 {
  const n = (i * 928371 + j * 1299721 + (kind === "h" ? 17 : 91)) % 2;
  return n === 0 ? 1 : -1;
}

/** 가로 경계 (x0,y)→(x1,y). b: 돌출 방향(+1 아래 / -1 위 / 0 직선). 직소 탭(목+혹) */
function hEdge(x0: number, x1: number, y: number, b: number): string {
  if (b === 0) return `L ${x1} ${y} `;
  const len = Math.abs(x1 - x0);
  const dir = Math.sign(x1 - x0);
  const a = x0 + dir * len * A;
  const e = x0 + dir * len * E;
  const r = len * R;
  const sweep = b > 0 ? (dir > 0 ? 1 : 0) : dir > 0 ? 0 : 1;
  return `L ${a} ${y} A ${r} ${r} 0 1 ${sweep} ${e} ${y} L ${x1} ${y} `;
}

/** 세로 경계 (x,y0)→(x,y1). b: 돌출 방향(+1 오른쪽 / -1 왼쪽 / 0 직선). 직소 탭(목+혹) */
function vEdge(x: number, y0: number, y1: number, b: number): string {
  if (b === 0) return `L ${x} ${y1} `;
  const len = Math.abs(y1 - y0);
  const dir = Math.sign(y1 - y0);
  const a = y0 + dir * len * A;
  const e = y0 + dir * len * E;
  const r = len * R;
  const sweep = b > 0 ? (dir > 0 ? 0 : 1) : dir > 0 ? 1 : 0;
  return `L ${x} ${a} A ${r} ${r} 0 1 ${sweep} ${x} ${e} L ${x} ${y1} `;
}

function piecePath(r: number, c: number, rows: number, cols: number): string {
  const x0 = c * S;
  const y0 = r * S;
  const x1 = (c + 1) * S;
  const y1 = (r + 1) * S;
  const top = r === 0 ? 0 : edgeSign("h", r, c);
  const right = c === cols - 1 ? 0 : edgeSign("v", r, c + 1);
  const bottom = r === rows - 1 ? 0 : edgeSign("h", r + 1, c);
  const left = c === 0 ? 0 : edgeSign("v", r, c);
  return (
    `M ${x0} ${y0} ` +
    hEdge(x0, x1, y0, top) +
    vEdge(x1, y0, y1, right) +
    hEdge(x1, x0, y1, bottom) +
    vEdge(x0, y1, y0, left) +
    "Z"
  );
}

/**
 * 유리질감 직소 퍼즐. 인접 조각이 탭/홈으로 맞물리는 인터로킹 SVG.
 * filled(블루 글로시) / recent(하이라이트) / empty(회색) 3상태.
 */
export function JigsawPuzzle({
  total = 100,
  filled,
  columns = 10,
  recentIndex,
  onSelectionCommit,
  selectedIndexes,
  className,
}: JigsawPuzzleProps) {
  const cols = columns;
  const rows = Math.ceil(total / cols);
  const recent = recentIndex ?? filled - 1;
  const interactive = !!onSelectionCommit;

  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ start: number; cur: number } | null>(null);

  const stateOf = (idx: number): "filled" | "recent" | "empty" =>
    idx < filled ? (idx === recent ? "recent" : "filled") : "empty";

  // 시작 조각이 빈칸이면 매수, 채워진 칸이면 매도
  const modeOf = (idx: number): "buy" | "sell" =>
    stateOf(idx) === "empty" ? "buy" : "sell";

  // 시작~현재의 사각 범위 내, 모드에 맞는 조각(매수=빈칸 / 매도=채운칸)
  const rectSelection = (start: number, cur: number) => {
    const mode = modeOf(start);
    const sr = Math.floor(start / cols);
    const sc = start % cols;
    const cr = Math.floor(cur / cols);
    const cc = cur % cols;
    const r0 = Math.min(sr, cr);
    const r1 = Math.max(sr, cr);
    const c0 = Math.min(sc, cc);
    const c1 = Math.max(sc, cc);
    const indexes: number[] = [];
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const i = r * cols + c;
        if (i >= total) continue;
        const match =
          mode === "buy" ? stateOf(i) === "empty" : stateOf(i) !== "empty";
        if (match) indexes.push(i);
      }
    }
    return { mode, indexes };
  };

  const liveSel = drag ? rectSelection(drag.start, drag.cur) : null;
  const highlight = new Set(
    liveSel ? liveSel.indexes : (selectedIndexes ?? []),
  );

  // 포인터 좌표 → 조각 인덱스 (마우스·터치 공통, getScreenCTM 기반)
  const pieceAt = (clientX: number, clientY: number): number | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(ctm.inverse());
    const col = Math.floor(p.x / S);
    const row = Math.floor(p.y / S);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
    const idx = row * cols + col;
    return idx < total ? idx : null;
  };

  const handleDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const idx = pieceAt(e.clientX, e.clientY);
    if (idx === null) return;
    svgRef.current?.setPointerCapture(e.pointerId);
    setDrag({ start: idx, cur: idx });
  };

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || !drag) return;
    const idx = pieceAt(e.clientX, e.clientY);
    if (idx !== null && idx !== drag.cur) {
      setDrag({ start: drag.start, cur: idx });
    }
  };

  // 드래그/탭 종료 시점에 선택 확정 → 팝업
  const handleUp = () => {
    if (!drag) return;
    const sel = rectSelection(drag.start, drag.cur);
    onSelectionCommit?.(sel.indexes.length ? sel : null);
    setDrag(null);
  };

  const handleCancel = () => setDrag(null);

  return (
    <svg
      ref={svgRef}
      viewBox={`-3 -3 ${cols * S + 8} ${rows * S + 14}`}
      className={cn(
        "w-full",
        interactive && "cursor-pointer select-none",
        className,
      )}
      style={interactive ? { touchAction: "none" } : undefined}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleCancel}
      role="img"
      aria-label={`${filled}/${total} 조각 완성`}
    >
      <defs>
        {/* 떠 있는 유리 조각: 부드러운 음영(diffuse) + 날카로운 광택(specular) + 드롭섀도 */}
        <filter
          id="jp-glass"
          x="-40%"
          y="-40%"
          width="180%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="blur" />
          {/* 완전 투명 유리: 광택(스펙큘러) + 드롭섀도로만 입체 표현 */}
          <feSpecularLighting
            in="blur"
            surfaceScale="6"
            specularConstant="1.1"
            specularExponent="30"
            lightingColor="#ffffff"
            result="spec"
          >
            <fePointLight x="62" y="42" z="150" />
          </feSpecularLighting>
          <feComposite
            in="spec"
            in2="SourceAlpha"
            operator="in"
            result="specClip"
          />
          <feMerge result="lit">
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="specClip" />
          </feMerge>
          <feDropShadow
            dx="0"
            dy="4.5"
            stdDeviation="3"
            floodColor="#1e3a8a"
            floodOpacity="0.45"
          />
        </filter>

        {/* 음각으로 파인 빈 슬롯: 인디고 inner-shadow (홈에 파인 느낌) */}
        <filter
          id="jp-groove"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feComponentTransfer in="SourceAlpha" result="inv">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feGaussianBlur in="inv" stdDeviation="1.6" result="iblur" />
          <feOffset in="iblur" dx="0" dy="1.1" result="ioff" />
          <feFlood floodColor="#94a3c8" floodOpacity="0.3" result="icol" />
          <feComposite in="icol" in2="ioff" operator="in" result="ishadow" />
          <feComposite
            in="ishadow"
            in2="SourceAlpha"
            operator="in"
            result="ishadowClip"
          />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="ishadowClip" />
          </feMerge>
        </filter>
      </defs>

      {Array.from({ length: total }).map((_, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        const state =
          idx < filled ? (idx === recent ? "recent" : "filled") : "empty";
        const d = piecePath(r, c, rows, cols);
        const isSelected = highlight.has(idx);

        if (state === "empty") {
          // 흰 표면에 파인 음각 홈 (인디고 그루브)
          return (
            <g key={idx}>
              <path
                d={d}
                fill="#f4f6fb"
                fillOpacity={0.7}
                stroke="#e9edf4"
                strokeWidth={0.75}
                strokeLinejoin="round"
                filter="url(#jp-groove)"
              />
              {isSelected && (
                <path
                  d={d}
                  fill="#2563eb"
                  fillOpacity={0.18}
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              )}
            </g>
          );
        }

        // 두꺼운 투명 유리 블록: 아래 side 면(두께) + 위 클리어 유리
        return (
          <g key={idx}>
            <path
              d={d}
              transform={`translate(0 ${THICK})`}
              fill="#1e3a8a"
              fillOpacity={0.15}
            />
            <path
              d={d}
              fill={state === "recent" ? "#3b82f6" : "#7dd3fc"}
              fillOpacity={state === "recent" ? 0.2 : 0.1}
              stroke="rgba(255,255,255,0.75)"
              strokeWidth={0.75}
              strokeLinejoin="round"
              filter="url(#jp-glass)"
            />
            {isSelected && (
              <path
                d={d}
                fill="none"
                stroke="#1d4ed8"
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
