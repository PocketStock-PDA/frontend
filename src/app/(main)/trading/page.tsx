"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { CurrencyToggle } from "@/components/common/CurrencyToggle";
import { EmptyState } from "@/components/common/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useStockSearch } from "@/hooks/queries/useStockSearch";
import { useStockRankings } from "@/hooks/queries/useStockRankings";
import { useExchangeRate } from "@/hooks/queries/useExchangeRate";
import { useStockTradesLive, type LiveQuote } from "@/hooks/useStockTradesLive";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { toDecimal } from "@/lib/utils/decimal";
import { cn } from "@/lib/utils";
import {
  tradingAutoDetailPath,
  tradingDetailPath,
} from "@/lib/navigation/routes";
import type {
  RankingSort,
  StockMarket,
  StockRankingItem,
  StockSearchItem,
} from "@/types/domain/trading";

const MARKET_TABS: { label: string; value: StockMarket }[] = [
  { label: "국내", value: "domestic" },
  { label: "해외", value: "overseas" },
];
const SORT_TABS: { label: string; value: RankingSort }[] = [
  { label: "거래대금", value: "tradevalue" },
  { label: "시가총액", value: "marketcap" },
];

/** T1. 종목 탐색 — 검색창 + 실시간 순위. 입력 시 연관 결과를 검색창 아래 드롭다운으로. */
export default function TradingExplorePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const goStock = (code: string) => router.push(tradingDetailPath(code));

  return (
    <>
      <AppHeader variant="sub" title="종목 탐색" />
      <div className="space-y-5">
        <div className="relative">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="종목명 또는 코드 검색"
          />
          {query.trim().length > 0 && (
            <SearchDropdown query={query} onPick={goStock} />
          )}
        </div>

        <Rankings onPick={goStock} />
      </div>
    </>
  );
}

// ── 검색 드롭다운 (검색창 아래 오버레이) ──────────────────────────────
function SearchDropdown({
  query,
  onPick,
}: {
  query: string;
  onPick: (code: string) => void;
}) {
  const { data, isLoading } = useStockSearch(query);
  // 백엔드가 드물게 data:null을 주면 api 클라가 {}를 반환 → 배열 가드로 크래시 방지
  const stocks = Array.isArray(data) ? data : [];

  return (
    <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-[60vh] overflow-auto rounded-xl border border-border bg-background py-1 shadow-lg">
      {isLoading ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          검색 중…
        </p>
      ) : stocks.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          검색 결과가 없어요
        </p>
      ) : (
        <ul>
          {stocks.map((s) => (
            <li key={s.stockCode}>
              <SearchRow item={s} onClick={() => onPick(s.stockCode)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SearchRow({
  item,
  onClick,
}: {
  item: StockSearchItem;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted"
    >
      <Avatar className="size-8">
        {item.logoUrl && <AvatarImage src={item.logoUrl} alt={item.stockName} />}
        <AvatarFallback>{item.stockName.trim().charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">
          {item.stockName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item.exchange} · {item.stockCode}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

// ── 실시간 순위 (국내/해외 × 거래대금/시총) ───────────────────────────
function Rankings({ onPick }: { onPick: (code: string) => void }) {
  const [market, setMarket] = useState<StockMarket>("domestic");
  const [sort, setSort] = useState<RankingSort>("tradevalue");
  // 해외 순위 한정: 달러 ↔ 원화 표시 토글
  const [ovsKrw, setOvsKrw] = useState(false);
  const { data, isLoading, isError, refetch } = useStockRankings(market, sort);
  const exchangeRateQ = useExchangeRate();
  const items = Array.isArray(data) ? data : [];
  // REST 스냅샷으로 첫 렌더 후, 목록 종목들에 WS를 붙여 가격·등락률 실시간 갱신
  const live = useStockTradesLive(
    items.map((it) => it.stockCode),
    market === "overseas",
  );

  // 해외 탭 + 환율 보유 시에만 원화 환산. 국내는 항상 원화라 무관.
  const fx = market === "overseas" ? exchangeRateQ.data?.baseRate ?? null : null;
  const showKrw = ovsKrw && fx !== null;
  // 순위 가격 포맷 — 원화 보기면 USD가를 환율로 환산, 아니면 종목 통화 그대로.
  const fmtPrice = (price: number, currency: string) =>
    showKrw && currency === "USD"
      ? formatKRW(toDecimal(price).times(fx).toNumber())
      : currency === "USD"
        ? formatUSD(price)
        : formatKRW(price);

  return (
    <section className="space-y-3">
      <SegmentedControl
        options={MARKET_TABS}
        value={market}
        onChange={setMarket}
      />

      <div className="rounded-2xl border border-border p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-foreground">실시간 순위</h2>
          {/* 해외 순위 + 환율 보유 시: 달러 ↔ 원화 토글 (맨 오른쪽) */}
          {market === "overseas" && fx !== null && (
            <CurrencyToggle checked={ovsKrw} onChange={setOvsKrw} />
          )}
        </div>

        {/* 정렬: 거래대금 / 시가총액 */}
        <div className="mb-1 flex gap-2">
          {SORT_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setSort(t.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold transition-colors",
                sort === t.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-14 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title="순위를 불러오지 못했어요"
            description="잠시 후 다시 시도해 주세요."
            className="py-8"
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                다시 시도
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState title="순위가 없어요" className="py-8" />
        ) : (
          <div className="divide-y divide-border">
            {items.map((it) => (
              <RankingRow
                key={it.stockCode}
                item={it}
                live={live[it.stockCode]}
                fmtPrice={fmtPrice}
                onClick={() => onPick(it.stockCode)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RankingRow({
  item,
  live,
  fmtPrice,
  onClick,
}: {
  item: StockRankingItem;
  live?: LiveQuote | undefined;
  fmtPrice: (price: number, currency: string) => string;
  onClick: () => void;
}) {
  const router = useRouter();
  // WS 라이브 값 우선, 없으면 REST 스냅샷
  const price = live?.currentPrice ?? item.price;
  const changeRate = live?.changeRate ?? item.changeRate;
  const priceText = fmtPrice(price, item.currency);
  return (
    // 행 전체 = 매수매도 진입, '모으기'는 별도 형제 버튼(중첩 금지)
    <div className="flex w-full items-center gap-3 py-3">
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span className="w-5 shrink-0 text-center font-numeric text-sm font-bold text-primary">
          {item.rank}
        </span>
        <Avatar className="size-9">
          {item.logoUrl && (
            <AvatarImage src={item.logoUrl} alt={item.stockName} />
          )}
          <AvatarFallback>{item.stockName.trim().charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">
            {item.stockName}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="font-numeric text-xs font-medium text-foreground">
              {priceText}
            </span>
            <ChangeIndicator value={changeRate} percent size="sm" />
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => router.push(tradingAutoDetailPath(item.stockCode))}
        aria-label={`${item.stockName} 모으기 설정`}
        className="shrink-0 rounded-full bg-brand-surface px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-brand-surface/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        모으기
      </button>
    </div>
  );
}
