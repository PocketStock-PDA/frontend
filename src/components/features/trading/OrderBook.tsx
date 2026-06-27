"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { OrderBookEntry } from "@/types/domain/orderbook";

/** 지정가는 number, 시장가는 "MARKET" */
export type OrderPrice = number | "MARKET";

export interface OrderBookProps {
  /** 매도호가 (rank1=최저가, 오름차순) */
  asks: OrderBookEntry[];
  /** 매수호가 (rank1=최고가, 내림차순) */
  bids: OrderBookEntry[];
  /** 하이라이트할 현재가(시장가 행) */
  currentPrice: number;
  /** 전일종가 — 가격별 등락률 계산용. 없으면 등락률 미표시 */
  prevClose?: number;
  /** 한쪽당 표시 호가 단계 수 (예: 5 또는 10) */
  count?: number;
  /** 가격 포맷 (통화별). 미지정 시 ko-KR 천단위 */
  formatPrice?: (price: number) => string;
  /** 통합 총매도 잔량 — 압력바용. 없으면 표시 호가 합으로 대체 */
  totalAskVolume?: number;
  /** 통합 총매수 잔량 — 압력바용. 없으면 표시 호가 합으로 대체 */
  totalBidVolume?: number;
  onSell: (price: OrderPrice) => void;
  onBuy: (price: OrderPrice) => void;
  disabled?: boolean;
  className?: string;
}

const GRID = "grid grid-cols-[1fr_1.4fr_1fr]";

// 잔량 깊이막대 — 틱마다 폭이 흐르되 오버슈트 없는 임계감쇠 스프링(통통 튐 금지)
const DEPTH_SPRING = { type: "spring", stiffness: 300, damping: 34, mass: 0.9 } as const;
// 압력바 분기점 — 잔량 불균형이 '움직이는' 게 보이도록 조금 더 느긋하게
const PRESSURE_SPRING = { type: "spring", stiffness: 210, damping: 30, mass: 0.9 } as const;

/**
 * 매도↔매수 잔량 압력바. 두 잔량 비율로 분기점이 실시간으로 이동한다.
 * 색(매도=blue/down · 매수=red/up) + 퍼센트 라벨로 Two-Signal 충족.
 */
function PressureBar({
  askVol,
  bidVol,
  reduce,
}: {
  askVol: number;
  bidVol: number;
  reduce: boolean;
}) {
  const total = Math.max(1, askVol + bidVol);
  const askPct = (askVol / total) * 100;
  const bidPct = 100 - askPct;

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center text-[11px]">
        <span className="font-numeric font-bold text-down">
          매도 {askPct.toFixed(0)}%
        </span>
        <span className="px-2 text-center text-[10px] font-medium text-muted-foreground">
          실시간 잔량
        </span>
        <span className="text-right font-numeric font-bold text-up">
          매수 {bidPct.toFixed(0)}%
        </span>
      </div>
      <div className="flex h-2 w-full items-stretch gap-1">
        <motion.span
          className="shrink-0 rounded-full bg-down/80"
          initial={false}
          animate={{ width: `${askPct}%` }}
          transition={reduce ? { duration: 0 } : PRESSURE_SPRING}
        />
        <span className="flex-1 rounded-full bg-up/80" />
      </div>
    </div>
  );
}

/** 잔량 깊이막대 + 수치. 틱으로 값이 바뀌면 그 행에 짧은 틴트 플래시. */
function DepthCell({
  volume,
  side,
  depthPct,
  reduce,
}: {
  volume: number;
  side: "ask" | "bid";
  depthPct: number;
  reduce: boolean;
}) {
  // 잔량 변화 감지 → 플래시 1회.
  const prev = useRef(volume);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (prev.current !== volume) {
      prev.current = volume;
      setFlash((f) => f + 1);
    }
  }, [volume]);

  const align = side === "ask" ? "justify-end" : "justify-start";
  const barSide = side === "ask" ? "right-2" : "left-2";
  const barTone = side === "ask" ? "bg-down/12" : "bg-up/12";
  const flashTone = side === "ask" ? "bg-down" : "bg-up";

  return (
    <span className={cn("relative flex h-full items-center px-3", align)}>
      {!reduce && flash > 0 && (
        <motion.span
          key={flash}
          aria-hidden
          className={cn("pointer-events-none absolute inset-x-1 inset-y-1 rounded-md", flashTone)}
          initial={{ opacity: 0.16 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}
      <motion.span
        aria-hidden
        className={cn("absolute h-7 rounded-md", barSide, barTone)}
        initial={false}
        animate={{ width: `${depthPct}%` }}
        transition={reduce ? { duration: 0 } : DEPTH_SPRING}
      />
      <span className="relative font-numeric text-sm text-foreground tabular-nums">
        {volume.toLocaleString("ko-KR")}
      </span>
    </span>
  );
}

/** 펼쳐진 주문 줄 — 판매 | 가격 | 구매. 행 자리에서 가볍게 페이드 인(레이아웃 morph 없음). */
function OrderActions({
  center,
  onSell,
  onBuy,
  disabled,
  reduce,
}: {
  center: React.ReactNode;
  onSell: () => void;
  onBuy: () => void;
  disabled?: boolean;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduce ? { duration: 0 } : { duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="my-1.5 flex items-center gap-2 rounded-2xl bg-background p-1.5 shadow-sm ring-1 ring-border/70"
    >
      <button
        type="button"
        onClick={onSell}
        disabled={!!disabled}
        className="h-11 flex-1 rounded-xl bg-down text-sm font-bold text-white transition-colors hover:bg-down/90 disabled:opacity-50"
      >
        판매
      </button>
      <span className="min-w-[5rem] text-center font-numeric text-base font-bold tabular-nums text-foreground">
        {center}
      </span>
      <button
        type="button"
        onClick={onBuy}
        disabled={!!disabled}
        className="h-11 flex-1 rounded-xl bg-up text-sm font-bold text-white transition-colors hover:bg-up/90 disabled:opacity-50"
      >
        구매
      </button>
    </motion.div>
  );
}

/** 한 호가 단계(잔량 깊이막대 + 가격·등락률). */
function Level({
  price,
  volume,
  side,
  depthPct,
  changePct,
  fmtPrice,
  onClick,
  reduce,
}: {
  price: number;
  volume: number;
  side: "ask" | "bid";
  depthPct: number;
  changePct: number | null;
  fmtPrice: (n: number) => string;
  onClick: () => void;
  reduce: boolean;
}) {
  const tone =
    changePct === null
      ? "text-foreground"
      : changePct > 0
        ? "text-up"
        : changePct < 0
          ? "text-down"
          : "text-muted-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(GRID, "h-12 w-full items-center rounded-md transition-colors hover:bg-muted/50")}
    >
      {/* 좌측 잔량 — 매도호가만 */}
      {side === "ask" ? (
        <DepthCell volume={volume} side="ask" depthPct={depthPct} reduce={reduce} />
      ) : (
        <span aria-hidden />
      )}

      {/* 가격 + 등락률 */}
      <span className="flex flex-col items-center justify-center leading-tight">
        <span className={cn("font-numeric text-sm font-bold tabular-nums", tone)}>
          {fmtPrice(price)}
        </span>
        {changePct !== null && (
          <span className={cn("font-numeric text-[11px] tabular-nums", tone)}>
            {changePct > 0 ? "+" : ""}
            {changePct.toFixed(2)}%
          </span>
        )}
      </span>

      {/* 우측 잔량 — 매수호가만 */}
      {side === "bid" ? (
        <DepthCell volume={volume} side="bid" depthPct={depthPct} reduce={reduce} />
      ) : (
        <span aria-hidden />
      )}
    </button>
  );
}

/**
 * 호가 사다리. 매도호가(높은가 위) → 시장가 → 매수호가(낮은가 아래) 순.
 * 가격은 전일종가 대비 등락(상승=red·하락=blue), 잔량은 실시간 깊이막대로 표시.
 * 행을 누르면 그 자리에 판매하기 / 구매하기 줄이 펼쳐진다.
 */
export function OrderBook({
  asks,
  bids,
  prevClose,
  count,
  formatPrice,
  totalAskVolume,
  totalBidVolume,
  onSell,
  onBuy,
  disabled,
  className,
}: OrderBookProps) {
  const reduce = useReducedMotion() ?? false;
  // 펼친 행(가격) — 한 번에 하나만. 시장가는 "MARKET"
  const [open, setOpen] = useState<OrderPrice | null>(null);
  const fmtPrice = formatPrice ?? ((n: number) => n.toLocaleString("ko-KR"));
  const n = count ?? Math.max(asks.length, bids.length);
  // 매도호가: 최우선(rank1) n개를 높은가가 위로 오도록 역순
  const askRows = asks.slice(0, n).reverse();
  const bidRows = bids.slice(0, n);

  const maxVol = Math.max(
    1,
    ...askRows.map((e) => e.volume),
    ...bidRows.map((e) => e.volume),
  );
  const changePct = (p: number) =>
    prevClose && prevClose > 0 ? ((p - prevClose) / prevClose) * 100 : null;

  const askVol = totalAskVolume ?? asks.reduce((s, e) => s + e.volume, 0);
  const bidVol = totalBidVolume ?? bids.reduce((s, e) => s + e.volume, 0);

  const toggle = (p: OrderPrice) => setOpen((cur) => (cur === p ? null : p));
  const fire = (fn: (p: OrderPrice) => void, p: OrderPrice) => {
    fn(p);
    setOpen(null);
  };

  const renderLevel = (e: OrderBookEntry, side: "ask" | "bid") =>
    open === e.price ? (
      <OrderActions
        key={`${side}-${e.price}`}
        center={fmtPrice(e.price)}
        onSell={() => fire(onSell, e.price)}
        onBuy={() => fire(onBuy, e.price)}
        disabled={!!disabled}
        reduce={reduce}
      />
    ) : (
      <Level
        key={`${side}-${e.price}`}
        price={e.price}
        volume={e.volume}
        side={side}
        depthPct={Math.round((e.volume / maxVol) * 100)}
        changePct={changePct(e.price)}
        fmtPrice={fmtPrice}
        onClick={() => toggle(e.price)}
        reduce={reduce}
      />
    );

  return (
    <div className={className}>
      <PressureBar askVol={askVol} bidVol={bidVol} reduce={reduce} />

      <div className="mt-3">
        {askRows.map((e) => renderLevel(e, "ask"))}

        {/* 시장가 — 위아래 구분선으로 매도/매수 영역을 가른다 */}
        {open === "MARKET" ? (
          <OrderActions
            center="시장가"
            onSell={() => fire(onSell, "MARKET")}
            onBuy={() => fire(onBuy, "MARKET")}
            disabled={!!disabled}
            reduce={reduce}
          />
        ) : (
          <button
            type="button"
            onClick={() => toggle("MARKET")}
            className={cn(
              GRID,
              "h-12 w-full items-center border-y-2 border-border transition-colors hover:bg-muted/40",
            )}
          >
            {/* 양 옆은 비우고 가운데 '시장가' 텍스트만 */}
            <span aria-hidden />
            <span className="text-center text-sm font-bold text-muted-foreground">
              시장가
            </span>
            <span aria-hidden />
          </button>
        )}

        {bidRows.map((e) => renderLevel(e, "bid"))}
      </div>
    </div>
  );
}
