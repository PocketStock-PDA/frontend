"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import {
  CollectIcon,
  PieceIcon,
} from "@/components/features/portfolio/ActionIcons";
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");

  const marketParam = searchParams.get("market");
  const investMode = searchParams.get("invest") === "1";
  const [market, setMarket] = useState<StockMarket>(
    marketParam === "overseas" ? "overseas" : "domestic",
  );

  const goStock = (code: string) => router.push(tradingDetailPath(code));
  const goCollect = (code: string) => router.push(tradingAutoDetailPath(code));
  const handleMarketChange = (v: StockMarket) => {
    setMarket(v);
    const p = new URLSearchParams(searchParams.toString());
    if (v === "domestic") p.delete("market");
    else p.set("market", v);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <>
      <AppHeader variant="sub" title="종목 탐색" />
      {/* 헤더(h-14+mb-4=4.5rem) + PageContainer pt(safe-top+1.5rem) + pb(1.5rem) + nav offset */}
      <div className="flex h-[calc(100dvh-env(safe-area-inset-top)-7.5rem-var(--bottom-nav-offset))] flex-col gap-5">
        <div className="relative shrink-0">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="종목명 또는 코드 검색"
          />
          {query.trim().length > 0 && (
            <SearchDropdown
              query={query}
              onPick={goStock}
              onCollect={goCollect}
              showCollect={!investMode}
            />
          )}
        </div>

        <Rankings
          market={market}
          onMarketChange={handleMarketChange}
          onPick={goStock}
          showCollect={!investMode}
        />
      </div>
    </>
  );
}

// ── 검색 드롭다운 (검색창 아래 오버레이) ──────────────────────────────
function SearchDropdown({
  query,
  onPick,
  onCollect,
  showCollect,
}: {
  query: string;
  onPick: (code: string) => void;
  onCollect: (code: string) => void;
  showCollect: boolean;
}) {
  const { data, isLoading } = useStockSearch(query);
  // 백엔드가 드물게 data:null을 주면 api 클라가 {}를 반환 → 배열 가드로 크래시 방지
  const stocks = Array.isArray(data) ? data : [];

  return (
    <div className="scrollbar-thin absolute inset-x-0 top-full z-20 mt-1 max-h-[60vh] overflow-auto rounded-xl border border-border bg-background py-1 shadow-lg">
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
              <SearchRow
                item={s}
                onClick={() => onPick(s.stockCode)}
                onCollect={() => onCollect(s.stockCode)}
                showCollect={showCollect}
              />
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
  onCollect,
  showCollect,
}: {
  item: StockSearchItem;
  onClick: () => void;
  onCollect: () => void;
  showCollect: boolean;
}) {
  const body = (
    <>
      <Avatar className="size-8">
        {item.logoUrl && (
          <AvatarImage src={item.logoUrl} alt={item.stockName} />
        )}
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
    </>
  );

  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2.5 transition-colors",
        // 버튼 노출 시 행 본문은 비클릭 — 퍼즐/모으기 버튼으로만 진입
        !showCollect && "hover:bg-muted",
      )}
    >
      {showCollect ? (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {body}
        </button>
      )}
      {showCollect && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onClick}
            aria-label={`${item.stockName} 퍼즐`}
            className="group flex w-14 flex-col items-center gap-0.5 rounded-2xl bg-card py-1.5 shadow-sm ring-1 ring-border transition-all hover:ring-primary/30 active:scale-95"
          >
            <PieceIcon className="size-5" />
            <span className="whitespace-nowrap text-[10px] font-medium text-primary">
              퍼즐
            </span>
          </button>
          <button
            type="button"
            onClick={onCollect}
            aria-label={`${item.stockName} 모으기 설정`}
            className="group flex w-14 flex-col items-center gap-0.5 rounded-2xl bg-card py-1.5 shadow-sm ring-1 ring-border transition-all hover:ring-primary/30 active:scale-95"
          >
            <CollectIcon className="size-5" />
            <span className="whitespace-nowrap text-[10px] font-medium text-primary">
              모으기
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── 실시간 순위 (국내/해외 × 거래대금/시총) ───────────────────────────
function Rankings({
  market,
  onMarketChange,
  onPick,
  showCollect,
}: {
  market: StockMarket;
  onMarketChange: (v: StockMarket) => void;
  onPick: (code: string) => void;
  showCollect: boolean;
}) {
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
  const fx =
    market === "overseas" ? (exchangeRateQ.data?.baseRate ?? null) : null;
  const showKrw = ovsKrw && fx !== null;
  // 순위 가격 포맷 — 원화 보기면 USD가를 환율로 환산, 아니면 종목 통화 그대로.
  const fmtPrice = (price: number, currency: string) =>
    showKrw && currency === "USD"
      ? formatKRW(toDecimal(price).times(fx).toNumber())
      : currency === "USD"
        ? formatUSD(price)
        : formatKRW(price);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <SegmentedControl
        options={MARKET_TABS}
        value={market}
        onChange={onMarketChange}
        className="shrink-0"
      />

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border px-4 pt-4 pb-4">
        {/* 헤더 */}
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
          <h2 className="text-base font-bold text-foreground">실시간 순위</h2>
          {market === "overseas" && fx !== null && (
            <CurrencyToggle checked={ovsKrw} onChange={setOvsKrw} />
          )}
        </div>

        {/* 정렬 탭 */}
        <div className="mb-3 flex shrink-0 gap-2">
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

        {/* 스크롤 영역 */}
        {isLoading ? (
          <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-border">
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
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <EmptyState
              title="순위를 불러오지 못했어요"
              description="잠시 후 다시 시도해 주세요."
              action={
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  다시 시도
                </Button>
              }
            />
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <EmptyState title="순위가 없어요" />
          </div>
        ) : (
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto divide-y divide-border pr-3">
            {items.map((it) => (
              <RankingRow
                key={it.stockCode}
                item={it}
                live={live[it.stockCode]}
                fmtPrice={fmtPrice}
                onClick={() => onPick(it.stockCode)}
                showCollect={showCollect}
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
  showCollect,
}: {
  item: StockRankingItem;
  live?: LiveQuote | undefined;
  fmtPrice: (price: number, currency: string) => string;
  onClick: () => void;
  showCollect: boolean;
}) {
  const router = useRouter();
  // WS 라이브 값 우선, 없으면 REST 스냅샷
  const price = live?.currentPrice ?? item.price;
  const changeRate = live?.changeRate ?? item.changeRate;
  const priceText = fmtPrice(price, item.currency);
  const body = (
    <>
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
        <span className="block truncate font-numeric tabular-nums text-xs font-medium text-foreground">
          {priceText}
        </span>
        <ChangeIndicator value={changeRate} percent size="sm" />
      </div>
    </>
  );

  return (
    // 버튼 노출 시 행 본문은 비클릭 — 퍼즐/모으기 버튼으로만 진입(중첩 금지)
    <div className="flex w-full items-center gap-2 py-3">
      {showCollect ? (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          {body}
        </button>
      )}
      {showCollect && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onClick}
            aria-label={`${item.stockName} 퍼즐`}
            className="group flex w-14 flex-col items-center gap-0.5 rounded-2xl bg-card py-1.5 shadow-sm ring-1 ring-border transition-all hover:ring-primary/30 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <PieceIcon className="size-5" />
            <span className="whitespace-nowrap text-[10px] font-medium text-primary">
              퍼즐
            </span>
          </button>
          <button
            type="button"
            onClick={() => router.push(tradingAutoDetailPath(item.stockCode))}
            aria-label={`${item.stockName} 모으기 설정`}
            className="group flex w-14 flex-col items-center gap-0.5 rounded-2xl bg-card py-1.5 shadow-sm ring-1 ring-border transition-all hover:ring-primary/30 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <CollectIcon className="size-5" />
            <span className="whitespace-nowrap text-[10px] font-medium text-primary">
              모으기
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
