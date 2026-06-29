"use client";

import { useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { useExchangeHistoryInfinite } from "@/hooks/queries/useExchangeHistory";
import type { FxHistoryItem } from "@/types/domain/exchange";
import { parseUTC } from "@/lib/utils/date";

const PAGE_SIZE = 15;

function fmtRate(v: number) {
  return v.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtUSD(v: number) {
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtKRW(v: number) {
  return v.toLocaleString("ko-KR");
}
function fmtDate(dateStr: string) {
  const d = parseUTC(dateStr);
  if (isNaN(d.getTime())) return dateStr.slice(0, 10);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function groupByDate(items: FxHistoryItem[]) {
  const map = new Map<string, FxHistoryItem[]>();
  for (const item of items) {
    const date = fmtDate(item.exchangedAt);
    const rows = map.get(date);
    if (rows) rows.push(item);
    else map.set(date, [item]);
  }
  return Array.from(map.entries()).map(([date, rows]) => ({ date, rows }));
}

function HistoryRow({ item }: { item: FxHistoryItem }) {
  const isBuy = item.type === "KRW_TO_USD";
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-lg">
        {isBuy ? "🇺🇸" : "🇰🇷"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground">
          {isBuy ? "외화사기" : "외화팔기"}
          {item.triggerType === "AUTO" && (
            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
              <RefreshCw className="size-2" />
              자동
            </span>
          )}
        </p>
        <p className="mt-0.5 font-numeric text-[11px] text-muted-foreground">
          {fmtDate(item.exchangedAt)} · {fmtRate(item.rate)}원
        </p>
      </div>
      <div className="text-right shrink-0">
        {isBuy ? (
          <>
            <p className="font-numeric text-[13px] font-bold text-primary">+{fmtUSD(item.usdAmount)}</p>
            <p className="mt-0.5 font-numeric text-[11px] text-muted-foreground">-{fmtKRW(item.krwAmount)}원</p>
          </>
        ) : (
          <>
            <p className="font-numeric text-[13px] font-bold text-primary">+{fmtKRW(item.krwAmount)}원</p>
            <p className="mt-0.5 font-numeric text-[11px] text-muted-foreground">-{fmtUSD(item.usdAmount)}</p>
          </>
        )}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="size-10 shrink-0 animate-pulse rounded-xl bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-2 text-right">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-12 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export default function ExchangeHistoryPage() {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useExchangeHistoryInfinite(PAGE_SIZE);

  const items = data?.pages.flatMap((p) => p.history) ?? [];

  // 바닥 근처(rootMargin)에 sentinel이 들어오면 다음 페이지 prefetch.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      <AppHeader variant="sub" title="환전 내역" />

      <div className="flex flex-col gap-3 pb-8">
        {isLoading ? (
          <div className="rounded-2xl bg-card shadow-sm">
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-card py-16 text-center shadow-sm">
            <p className="text-[13px] text-muted-foreground">환전 내역이 없어요</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {groupByDate(items).map(({ date, rows }) => (
                <div key={date}>
                  <p className="mb-1.5 px-1 font-numeric text-[12px] font-semibold tabular-nums text-muted-foreground">{date}</p>
                  <div className="rounded-2xl bg-card shadow-sm">
                    <div className="divide-y divide-border">
                      {rows.map((item, i) => (
                        <HistoryRow key={i} item={item} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {isFetchingNextPage && (
              <div className="rounded-2xl bg-card shadow-sm">
                <div className="divide-y divide-border">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </div>
              </div>
            )}

            <div ref={sentinelRef} className="h-px" />
          </>
        )}
      </div>
    </>
  );
}
