"use client";

import { cn } from "@/lib/utils";
import type { OrderBookEntry } from "@/types/domain/orderbook";

/** 지정가는 number, 시장가는 "MARKET" */
export type OrderPrice = number | "MARKET";

/** 시장가 기준 색: 위(매도)=빨강 / 아래(매수)=파랑 / 시장가=검정 */
type Tone = "up" | "down" | "neutral";

export interface OrderBookProps {
  /** 매도호가 (rank1=최저가, 오름차순) */
  asks: OrderBookEntry[];
  /** 매수호가 (rank1=최고가, 내림차순) */
  bids: OrderBookEntry[];
  /** 하이라이트할 현재가 */
  currentPrice: number;
  /** 한쪽당 표시 호가 단계 수 (예: 5 또는 10) */
  count?: number;
  /** 가격 포맷 (통화별). 미지정 시 ko-KR 천단위 */
  formatPrice?: (price: number) => string;
  onSell: (price: OrderPrice) => void;
  onBuy: (price: OrderPrice) => void;
  disabled?: boolean;
  className?: string;
}

function ActionRow({
  center,
  badge,
  tone,
  isCurrent,
  isMarket,
  onSell,
  onBuy,
  disabled,
}: {
  center: React.ReactNode;
  badge: React.ReactNode;
  tone: Tone;
  isCurrent?: boolean;
  isMarket?: boolean;
  onSell: () => void;
  onBuy: () => void;
  disabled?: boolean;
}) {
  const priceColor =
    tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-foreground";
  return (
    <div
      className={cn(
        "grid grid-cols-4 items-center py-2.5",
        isMarket && "rounded-lg bg-muted",
        isCurrent && !isMarket && "bg-muted/40",
      )}
    >
      <button
        type="button"
        onClick={onSell}
        disabled={disabled}
        className="text-sm font-medium text-down disabled:opacity-40"
      >
        판매
      </button>
      <span
        className={cn(
          "text-center font-numeric text-sm font-medium",
          priceColor,
        )}
      >
        {center}
      </span>
      <span
        className={cn(
          "mx-auto flex min-w-[64px] flex-col items-center rounded-md px-3 py-1.5 font-numeric text-sm leading-tight text-foreground",
          tone === "up"
            ? "bg-up/10"
            : tone === "down"
              ? "bg-down/10"
              : "text-muted-foreground",
        )}
      >
        {badge}
      </span>
      <button
        type="button"
        onClick={onBuy}
        disabled={disabled}
        className="text-sm font-medium text-up disabled:opacity-40"
      >
        구매
      </button>
    </div>
  );
}

/**
 * 호가 사다리. 매도호가(높은가 위) → 시장가 → 매수호가(낮은가 아래) 순.
 * 시장가보다 높으면 빨강(매도)·낮으면 파랑(매수)·시장가는 검정.
 * 각 행의 판매(매도)·구매(매수) 탭 시 해당 가격으로 주문.
 */
export function OrderBook({
  asks,
  bids,
  currentPrice,
  count,
  formatPrice,
  onSell,
  onBuy,
  disabled,
  className,
}: OrderBookProps) {
  const fmtPrice = formatPrice ?? ((n: number) => n.toLocaleString("ko-KR"));
  const n = count ?? Math.max(asks.length, bids.length);
  // 매도호가: 최우선(rank1) n개를 높은가가 위로 오도록 역순
  const askRows = asks.slice(0, n).reverse();
  const bidRows = bids.slice(0, n);

  const row = (e: OrderBookEntry, tone: Tone, keyPrefix: string) => (
    <ActionRow
      key={`${keyPrefix}-${e.price}`}
      center={fmtPrice(e.price)}
      tone={tone}
      isCurrent={e.price === currentPrice}
      badge={<span>{e.volume.toLocaleString("ko-KR")}</span>}
      onSell={() => onSell(e.price)}
      onBuy={() => onBuy(e.price)}
      disabled={!!disabled}
    />
  );

  return (
    <div className={cn("divide-y divide-border/60", className)}>
      {askRows.map((e) => row(e, "up", "ask"))}
      <ActionRow
        isMarket
        tone="neutral"
        center="시장가"
        badge="-"
        onSell={() => onSell("MARKET")}
        onBuy={() => onBuy("MARKET")}
        disabled={!!disabled}
      />
      {bidRows.map((e) => row(e, "down", "bid"))}
    </div>
  );
}
