"use client";

import { useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
  /** 비대화형 모드에서 드래그·탭 시도 시 호출 — 거래 버튼으로 유도하는 용도 */
  onDragAttempt?: () => void;
  /** 드래그 중 라이브 선택 변화(조각 수·금액 실시간 표시용). 종료/취소 시 null */
  onSelectionChange?: (
    selection: { mode: "buy" | "sell"; indexes: number[] } | null,
  ) => void;
  /** 확정된(하이라이트) 조각 인덱스 */
  selectedIndexes?: number[];
  /**
   * 종목 로고 URL. 지정 시 "로고 직소" 모드 — 채운 조각으로 로고가 드러나고,
   * 빈 영역엔 전체 로고가 희미하게(고스트) 미리보임. null/미지정 시 블루 유리 모드.
   */
  logoUrl?: string | null;
  /**
   * 접수(체결 대기) 조각 수 — 수량 기반 캐논 채움(위치 미저장).
   * buy=다음 N칸 채워짐(팝인+펄스) / sell=마지막 N칸 날아감. 동시 다건은 부모가 합산해 전달.
   * 실제 체결되면 부모가 filled 갱신 + 카운트 감소.
   */
  pendingBuy?: number;
  pendingSell?: number;
  /**
   * 미리보기(썸네일) 모드 — 정적. 무거운 SVG 필터(광택·홈·리프트)·접수 애니메이션·인터랙션을
   * 모두 끄고 조각 모양과 로고 드러남만 남긴다. 리스트에 여러 개 띄울 때 사용(필터 ID 중복·성능 회피).
   */
  preview?: boolean;
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
  onSelectionChange,
  onDragAttempt,
  selectedIndexes,
  logoUrl,
  pendingBuy = 0,
  pendingSell = 0,
  preview = false,
  className,
}: JigsawPuzzleProps) {
  const cols = columns;
  const rows = Math.ceil(total / cols);
  const recent = recentIndex ?? filled - 1;
  const interactive = !!onSelectionCommit && !preview;
  const useLogo = !!logoUrl;
  // 미리보기에선 필터를 참조하지 않는다(필터 def도 미출력 → 다중 인스턴스 ID 중복·성능 회피).
  const flt = (id: string) => (preview ? undefined : `url(#${id})`);
  const uid = useId();
  const filledClipId = `jp-fill-${uid}`;
  const ghostClipId = `jp-ghost-${uid}`;
  const buyPrevClipId = `jp-buy-${uid}`;
  const pendingClipId = `jp-pend-${uid}`;
  const reduce = useReducedMotion();
  // 조각 path는 두 모드 공용 — 한 번만 만들어 재사용
  const paths = Array.from({ length: total }, (_, idx) =>
    piecePath(Math.floor(idx / cols), idx % cols, rows, cols),
  );

  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ start: number; cur: number } | null>(null);

  // 선택 가능 경계 — 접수 대기(pending) 구간은 reserved로 제외(중복 주문 방지).
  // 매수=다음 빈칸(filled+pendingBuy 이상) / 매도=보유칸 중 미대기분(filled-pendingSell 미만).
  const buyStart = filled + pendingBuy;
  const sellEnd = filled - pendingSell;
  const modeOf = (idx: number): "buy" | "sell" | null =>
    idx >= buyStart ? "buy" : idx < sellEnd ? "sell" : null;

  // 시작~현재의 사각 범위 내, 모드에 맞는 조각(매수=빈칸 / 매도=보유칸). reserved 칸 제외.
  const rectSelection = (start: number, cur: number) => {
    const mode = modeOf(start);
    if (mode === null) return { mode: "buy" as const, indexes: [] as number[] };
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
        const match = mode === "buy" ? i >= buyStart : i < sellEnd;
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
    if (!interactive) {
      onDragAttempt?.();
      return;
    }
    const idx = pieceAt(e.clientX, e.clientY);
    if (idx === null || modeOf(idx) === null) return; // reserved(대기) 칸은 선택 불가
    svgRef.current?.setPointerCapture(e.pointerId);
    setDrag({ start: idx, cur: idx });
    onSelectionChange?.(rectSelection(idx, idx));
  };

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || !drag) return;
    const idx = pieceAt(e.clientX, e.clientY);
    if (idx !== null && idx !== drag.cur) {
      setDrag({ start: drag.start, cur: idx });
      onSelectionChange?.(rectSelection(drag.start, idx));
    }
  };

  // 드래그/탭 종료 시점에 선택 확정 → 팝업
  const handleUp = () => {
    if (!drag) return;
    const sel = rectSelection(drag.start, drag.cur);
    onSelectionCommit?.(sel.indexes.length ? sel : null);
    setDrag(null);
    onSelectionChange?.(null);
  };

  const handleCancel = () => {
    setDrag(null);
    onSelectionChange?.(null);
  };

  // 한 조각의 "채워진 모습"(로고 클립 또는 블루 유리) — 접수 애니메이션 공용 렌더
  const renderFilled = (i: number) =>
    useLogo ? (
      <g filter="url(#jp-lift)">
        <clipPath id={`${pendingClipId}-${i}`}>
          <path d={paths[i]} />
        </clipPath>
        <image
          href={logoUrl ?? undefined}
          x={0}
          y={0}
          width={cols * S}
          height={rows * S}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${pendingClipId}-${i})`}
        />
        <path
          d={paths[i]}
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={0.9}
          strokeLinejoin="round"
        />
      </g>
    ) : (
      <>
        <path
          d={paths[i]}
          transform={`translate(0 ${THICK})`}
          fill="#1e3a8a"
          fillOpacity={0.15}
        />
        <path
          d={paths[i]}
          fill="#3b82f6"
          fillOpacity={0.92}
          stroke="rgba(255,255,255,0.75)"
          strokeWidth={0.75}
          strokeLinejoin="round"
          filter="url(#jp-glass)"
        />
      </>
    );

  return (
    <svg
      ref={svgRef}
      viewBox={`-3 -3 ${cols * S + 8} ${rows * S + 14}`}
      className={cn(
        "w-full",
        interactive && "cursor-pointer select-none",
        className,
      )}
      style={(interactive || !!onDragAttempt) ? { touchAction: "none" } : undefined}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleCancel}
      role="img"
      aria-label={`${filled}/${total} 조각 완성`}
    >
      <defs>
        {!preview && (
          <>
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

        {/* 로고 모드: 맞춰진 조각 무리를 살짝 띄우는 부드러운 그림자 */}
        <filter
          id="jp-lift"
          x="-20%"
          y="-20%"
          width="140%"
          height="160%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="2.4"
            floodColor="#0b1733"
            floodOpacity="0.28"
          />
        </filter>
          </>
        )}
      </defs>

      {useLogo ? (
        <>
          {/* 빈 슬롯 — 흰 표면에 파인 음각 홈 */}
          {paths.map((d, idx) =>
            idx >= filled ? (
              <path
                key={`empty-${idx}`}
                d={d}
                fill="#f4f6fb"
                fillOpacity={0.7}
                stroke="#e9edf4"
                strokeWidth={0.75}
                strokeLinejoin="round"
                filter={flt("jp-groove")}
              />
            ) : null,
          )}

          {/* 미완성 영역에 전체 로고를 희미하게(고스트) — 완성될 그림 미리보기 */}
          {filled < total && (
            <>
              <clipPath id={ghostClipId}>
                {paths.map((d, idx) =>
                  idx >= filled ? <path key={`gc-${idx}`} d={d} /> : null,
                )}
              </clipPath>
              <image
                href={logoUrl ?? undefined}
                x={0}
                y={0}
                width={cols * S}
                height={rows * S}
                preserveAspectRatio="xMidYMid slice"
                opacity={preview ? 0.16 : 0.1}
                clipPath={`url(#${ghostClipId})`}
              />
            </>
          )}

          {/* 채운 조각 = 로고 노출 + 직소 컷선 (살짝 떠 보이는 그림자) */}
          {filled > 0 && (
            <>
              <clipPath id={filledClipId}>
                {paths.map((d, idx) =>
                  idx < filled ? <path key={`fc-${idx}`} d={d} /> : null,
                )}
              </clipPath>
              <g filter={flt("jp-lift")}>
                <image
                  href={logoUrl ?? undefined}
                  x={0}
                  y={0}
                  width={cols * S}
                  height={rows * S}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${filledClipId})`}
                />
                {paths.map((d, idx) =>
                  idx < filled ? (
                    <path
                      key={`line-${idx}`}
                      d={d}
                      fill="none"
                      stroke="rgba(255,255,255,0.55)"
                      strokeWidth={0.9}
                      strokeLinejoin="round"
                    />
                  ) : null,
                )}
              </g>
            </>
          )}

          {/* 선택 = 라이브 프리뷰(색 비의존). 매수=로고로 채워 보임 / 매도=빈 슬롯으로 비워 보임 */}
          {(() => {
            const selArr = paths.map((_, i) => i).filter((i) => highlight.has(i));
            if (selArr.length === 0) return null;
            const selEmpty = selArr.filter((i) => i >= filled);
            const selFilled = selArr.filter((i) => i < filled);
            return (
              <>
                {/* 매수 프리뷰 — 고른 빈칸을 로고로 채워 보임 */}
                {selEmpty.length > 0 && (
                  <>
                    <clipPath id={buyPrevClipId}>
                      {selEmpty.map((i) => (
                        <path key={`bp-${i}`} d={paths[i]} />
                      ))}
                    </clipPath>
                    <g filter="url(#jp-lift)">
                      <image
                        href={logoUrl ?? undefined}
                        x={0}
                        y={0}
                        width={cols * S}
                        height={rows * S}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#${buyPrevClipId})`}
                      />
                    </g>
                  </>
                )}
                {/* 매도 프리뷰 — 고른 채운칸을 빈 슬롯으로 비워 보임 */}
                {selFilled.map((i) => (
                  <path
                    key={`sp-${i}`}
                    d={paths[i]}
                    fill="#f4f6fb"
                    fillOpacity={0.95}
                    stroke="#e9edf4"
                    strokeWidth={0.75}
                    strokeLinejoin="round"
                    filter="url(#jp-groove)"
                  />
                ))}
                {/* 중립 이중 테두리 — 흰색 위 어두운 외곽(어떤 로고색에서도 읽힘) */}
                {selArr.map((i) => (
                  <g key={`ring-${i}`}>
                    <path
                      d={paths[i]}
                      fill="none"
                      stroke="#0b1733"
                      strokeOpacity={0.45}
                      strokeWidth={3.4}
                      strokeLinejoin="round"
                    />
                    <path
                      d={paths[i]}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth={2}
                      strokeLinejoin="round"
                    />
                  </g>
                ))}
              </>
            );
          })()}
        </>
      ) : (
        paths.map((d, idx) => {
          const state =
            idx < filled ? (idx === recent ? "recent" : "filled") : "empty";
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
                  filter={flt("jp-groove")}
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
                filter={flt("jp-glass")}
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
        })
      )}

      {/* 접수 대기 — 캐스케이드 입장 애니메이션은 유지하되 65% 불투명도로 표시.
          실제 체결 시 filled 증가로 자연스럽게 100%가 되므로 "두 번 추가된" 이중 표시가 없다.
          글린트·펄스는 제거 — 입장 애니메이션만으로 손맛이 충분하고 체결 후 사라지는 타이밍이 깔끔하다. */}
      {pendingBuy > 0 &&
        Array.from({ length: pendingBuy }, (_, k) => filled + k)
          .filter((i) => i < total)
          .map((i, k) => (
            <motion.g
              key={`pi-${i}`}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
              initial={reduce ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.65 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : {
                      delay: k * 0.04,
                      type: "spring",
                      stiffness: 520,
                      damping: 17,
                      mass: 0.6,
                    }
              }
            >
              {renderFilled(i)}
            </motion.g>
          ))}

      {pendingSell > 0 && (
        <>
          {/* 매도 — 마지막 N칸: 빈 슬롯 드러나고 조각이 회전·확산하며 날아감 */}
          {Array.from({ length: pendingSell }, (_, k) => filled - 1 - k)
            .filter((i) => i >= 0)
            .map((i) => (
              <path
                key={`pg-${i}`}
                d={paths[i]}
                fill="#f4f6fb"
                fillOpacity={0.95}
                stroke="#e9edf4"
                strokeWidth={0.75}
                strokeLinejoin="round"
                filter="url(#jp-groove)"
              />
            ))}
          {Array.from({ length: pendingSell }, (_, k) => filled - 1 - k)
            .filter((i) => i >= 0)
            .map((i, k) => {
              const cx = ((i % cols) + 0.5) * S;
              const cy = (Math.floor(i / cols) + 0.5) * S;
              const vx = cx - (cols * S) / 2;
              const vy = cy - (rows * S) / 2;
              const len = Math.hypot(vx, vy) || 1;
              const dist = 30;
              const dx = (vx / len) * dist;
              const dy = (vy / len) * dist - 10;
              const rot = (i % 2 ? 1 : -1) * (14 + (i % 3) * 7);
              return (
                <motion.g
                  key={`sf-${i}`}
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  initial={
                    reduce ? false : { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }
                  }
                  animate={
                    reduce
                      ? { opacity: 0 }
                      : { x: dx, y: dy, rotate: rot, scale: 0.55, opacity: 0 }
                  }
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { delay: k * 0.03, duration: 0.5, ease: [0.4, 0, 1, 1] }
                  }
                >
                  {renderFilled(i)}
                </motion.g>
              );
            })}
        </>
      )}
    </svg>
  );
}
