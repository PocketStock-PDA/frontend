"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/common/AppHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StockListItem } from "@/components/common/StockListItem";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { useStockSearch } from "@/hooks/queries/useStockSearch";
import { cn } from "@/lib/utils";

/** T1. 종목 검색·탐색 — 검색 후 종목 선택 시 매수/매도 화면으로 이동 */
export default function TradingSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data, isLoading, isFetching, isPlaceholderData } =
    useStockSearch(query);
  const stocks = data ?? [];
  // keepPreviousData로 이전 결과가 보이는 동안(검색 중) 흐리게 → stale 구분
  const showingStale = isFetching && isPlaceholderData;

  return (
    <>
      <AppHeader variant="sub" title="종목 탐색" />
      <div className="space-y-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="종목명 또는 코드 검색"
        />

        {/* TODO: 테마 필터 칩(40대 여성 상위·나스닥 우량주 등) — 후순위(별도 이슈) */}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} lines={1} className="h-12 border-0 p-0" />
            ))}
          </div>
        ) : stocks.length === 0 ? (
          <EmptyState
            title="검색 결과가 없어요"
            description="종목명 또는 코드를 다시 확인해 주세요."
            className="py-10"
          />
        ) : (
          <div
            className={cn(
              "divide-y divide-border transition-opacity",
              showingStale && "opacity-60",
            )}
          >
            {stocks.map((s) => (
              <StockListItem
                key={s.stockCode}
                name={s.stockName}
                ticker={s.stockCode}
                {...(s.logoUrl ? { logoUrl: s.logoUrl } : {})}
                price={s.currentPrice}
                changePercent={s.changeRate}
                onClick={() => router.push(`/trading/${s.stockCode}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
