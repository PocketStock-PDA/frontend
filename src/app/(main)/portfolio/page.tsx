"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppHeader } from "@/components/common/AppHeader";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { CurrencyToggle } from "@/components/common/CurrencyToggle";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { HoldingCard } from "@/components/features/portfolio/HoldingCard";
import { PiecesCard } from "@/components/features/portfolio/PiecesCard";
import {
  StockIcon,
  CollectIcon,
  CalendarIcon,
  OrdersIcon,
} from "@/components/features/portfolio/ActionIcons";
import { usePortfolioSummary } from "@/hooks/queries/usePortfolioSummary";
import { useSecuritiesAccounts } from "@/hooks/queries/useSecuritiesAccounts";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import { useAutoInvestSummary } from "@/hooks/queries/useAutoInvest";
import {
  portfolioDetailPath,
  tradingDetailPath,
} from "@/lib/navigation/routes";
import type { AutoInvestStock } from "@/types/domain/autoInvest";
import { toPieceParts } from "@/lib/utils/pieces";
import { toDecimal } from "@/lib/utils/decimal";
import { queryKeys } from "@/lib/utils/queryKeys";
import Decimal from "decimal.js";

type Lens = "all" | "auto" | "pieces";

/**
 * 해외 원화토글의 환산 KRW 수익률(%) — 백엔드 segment.profitRate는 USD 기준(환차 제외)이라
 * 원화 보기엔 환산 KRW 손익/원금으로 직접 계산한다(백엔드 KRW 환산수익률 필드 없음).
 * 백엔드 rate() 규약과 동일하게 원금≤0이면 0, 소수 2자리 HALF_UP.
 */
function krwRate(profitKrw?: number | null, investedKrw?: number | null): number {
  const inv = toDecimal(investedKrw);
  if (inv.lte(0)) return 0;
  return toDecimal(profitKrw).div(inv).times(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

const LENS_OPTIONS: { label: string; value: Lens }[] = [
  { label: "전체", value: "all" },
  { label: "모으기 중", value: "auto" },
  { label: "퍼즐 조각", value: "pieces" },
];

// 평가금액 범위: 전체(환산 KRW) / 국내(KRW) / 해외(USD)
type Scope = "all" | "domestic" | "overseas";
const SCOPE_OPTIONS: { label: string; value: Scope }[] = [
  { label: "전체", value: "all" },
  { label: "국내", value: "domestic" },
  { label: "해외", value: "overseas" },
];

export default function PortfolioPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const lensParam = searchParams.get("lens");
  const scopeParam = searchParams.get("scope");
  const initialLens: Lens =
    lensParam === "auto" || lensParam === "pieces" ? lensParam : "all";
  const initialScope: Scope =
    scopeParam === "domestic" || scopeParam === "overseas" ? scopeParam : "all";
  const [lens, setLens] = useState<Lens>(initialLens);
  const [lensPicked, setLensPicked] = useState(lensParam !== null);
  const [scope, setScope] = useState<Scope>(initialScope);

  const syncParams = (nextLens: Lens, nextScope: Scope) => {
    const p = new URLSearchParams(searchParams.toString());
    if (nextLens !== "all") p.set("lens", nextLens);
    else p.delete("lens");
    if (nextScope !== "all") p.set("scope", nextScope);
    else p.delete("scope");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };
  // 해외 평가금액을 원화로 환산해 볼지 (false=달러 $, true=원화 ₩)
  const [ovsKrw, setOvsKrw] = useState(false);
  const summaryQ = usePortfolioSummary();
  const summary = summaryQ.data;
  const accountsQ = useSecuritiesAccounts();
  const accounts = accountsQ.data ?? [];
  const holdings = summary?.holdings ?? [];
  const codes = holdings.map((h) => h.stockCode);
  const details = useStockDetails(codes);
  const autoSummaryQ = useAutoInvestSummary();

  // 자동모으기 활성 종목코드 집합 (모으기 렌즈·배지용)
  const autoCodes = new Set(
    (autoSummaryQ.data?.stocks ?? [])
      .filter((s) => s.isActive)
      .map((s) => s.stockCode),
  );

  // 모으기 활성 + 미보유(첫 매수 전) 종목 — 로고·이름 위해 시세 상세도 조회(훅은 early return 전에)
  const heldCodes = new Set(codes);
  const pendingAutoStocks = (autoSummaryQ.data?.stocks ?? []).filter(
    (s) => s.isActive && !heldCodes.has(s.stockCode),
  );
  const pendingCodes = pendingAutoStocks.map((s) => s.stockCode);
  const pendingDetails = useStockDetails(pendingCodes);

  // 보유 0인데 모으기 예정만 있으면 기본 렌즈를 '모으기'로(직접 고르기 전까지). 파생값 — effect 불필요
  const effLens: Lens =
    !lensPicked && holdings.length === 0 && pendingAutoStocks.length > 0
      ? "auto"
      : lens;

  const detailsLoading = codes.length > 0 && details.some((d) => d.isLoading);
  const detailsError = codes.length > 0 && details.some((d) => d.isError);

  if (summaryQ.isLoading || detailsLoading) {
    return (
      <div className="space-y-5">
        <SkeletonCard lines={2} className="h-36" />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  // 보유 조회 실패 또는 일부 종목 시세 실패(평가 0 오인 방지) 시 에러 노출
  if (summaryQ.isError || detailsError) {
    return (
      <EmptyState
        title="불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: queryKeys.trading.all })
            }
          >
            다시 시도
          </Button>
        }
      />
    );
  }

  // 평가·수익률은 백엔드 summary 단일소스(native 통화). 이름·로고만 종목 상세에서 보강.
  const rows = holdings.map((h, i) => {
    const detail = details[i]?.data;
    return {
      h,
      name: detail?.stockName ?? h.stockCode,
      logoUrl: detail?.logoUrl ?? null,
      currency: (h.currency === "USD" ? "USD" : "KRW") as "KRW" | "USD",
      evalAmount: h.evalAmount ?? 0, // native(해외=USD)
      evalKrw: h.evalKrw ?? 0, // 환산 KRW(종목 간 비교·정렬용)
      investedKrw: h.investedKrw ?? 0,
      profit: h.profit ?? 0, // native
      profitKrw: h.profitKrw ?? 0, // 환산 KRW 손익
      rate: h.profitRate ?? 0,
      priced: h.priced,
      parts: toPieceParts(h.quantity),
      isAuto: autoCodes.has(h.stockCode),
    };
  });

  // scope별 집계는 백엔드 summary 단일소스. 전체/국내=KRW, 해외=USD(+환산 KRW).
  const fx = summary?.usdKrwRate ?? null;

  // scope에 따라 표시할 증권계좌번호
  const domesticAccountNo = accounts.find((a) => a.type === "DOMESTIC")?.accountNo;
  const overseasAccountNo = accounts.find((a) => a.type === "OVERSEAS")?.accountNo;
  const displayAccountNo =
    scope === "domestic"
      ? domesticAccountNo
      : scope === "overseas"
        ? overseasAccountNo
        : undefined; // 전체는 계좌번호 미표시

  // 표시할 평가/원금/손익/통화 — scope + 해외 원화토글(ovsKrw) 반영.
  let displayEval = 0;
  let displayProfit = 0;
  let displayCurrency: "KRW" | "USD" = "KRW";
  // 수익률(%)도 백엔드 segment.profitRate 단일소스. 예외: 해외 원화토글은 백엔드에 KRW
  // 기준 환산수익률 필드가 없어(overseas.profitRate=USD 기준·환차 제외) 환산 KRW 손익/원금으로 계산.
  let displayRate = 0;
  let scopeLabel = "총 평가금액";
  if (scope === "domestic") {
    const d = summary?.domestic;
    displayEval = d?.evalKrw ?? 0;
    displayProfit = d?.profitKrw ?? 0;
    displayRate = d?.profitRate ?? 0;
    scopeLabel = "국내 평가금액";
  } else if (scope === "overseas") {
    const o = summary?.overseas;
    const showKrw = ovsKrw && fx !== null; // 토글 ON + 환율 보유 시 원화 환산
    displayEval = (showKrw ? o?.evalKrw : o?.evalUsd) ?? 0;
    displayProfit = (showKrw ? o?.profitKrw : o?.profitUsd) ?? 0;
    displayRate = showKrw ? krwRate(o?.profitKrw, o?.investedKrw) : o?.profitRate ?? 0;
    displayCurrency = showKrw ? "KRW" : "USD";
    scopeLabel = "해외 평가금액";
  } else {
    const t = summary?.total;
    displayEval = t?.evalKrw ?? 0;
    displayProfit = t?.profitKrw ?? 0;
    displayRate = t?.profitRate ?? 0;
  }
  const scopeRate = displayRate;

  // scope로 아래 목록도 필터 — 국내(KRW)만 / 해외(USD)만 / 전체.
  const scopedRows =
    scope === "domestic"
      ? rows.filter((r) => r.currency === "KRW")
      : scope === "overseas"
        ? rows.filter((r) => r.currency === "USD")
        : rows;

  // 해외 scope + 원화 토글이면 카드도 원화로 — 그 외엔 종목 native 통화.
  const cardKrw = scope === "overseas" && ovsKrw && fx !== null;
  const cardView = (r: (typeof rows)[number]) =>
    cardKrw
      ? {
          evalAmount: r.evalKrw,
          profit: r.profitKrw,
          rate: krwRate(r.profitKrw, r.investedKrw),
          currency: "KRW" as const,
        }
      : { evalAmount: r.evalAmount, profit: r.profit, rate: r.rate, currency: r.currency };

  const autoRows = scopedRows.filter((r) => r.isAuto);
  // 종목코드 → 모으기 일정 문구("매일 10,000원씩") — 보유/미보유 모으기 카드 공용
  const scheduleByCode = new Map(
    (autoSummaryQ.data?.stocks ?? []).map((s) => [
      s.stockCode,
      autoScheduleText(s),
    ]),
  );
  // 미보유 모으기 종목 표시용 — 상세에서 로고·이름 보강(없으면 요약의 stockName/이니셜). scope 필터 반영.
  const pendingAuto = pendingAutoStocks
    .map((s, i) => ({
      stock: s,
      name: pendingDetails[i]?.data?.stockName ?? s.stockName,
      logoUrl: pendingDetails[i]?.data?.logoUrl ?? null,
    }))
    .filter((p) =>
      scope === "domestic"
        ? p.stock.currency !== "USD"
        : scope === "overseas"
          ? p.stock.currency === "USD"
          : true,
    );
  const pieceRows = scopedRows.filter((r) => r.parts.hasFraction);
  // 주식투자(매수매도) 바로가기 — 최다 보유 종목으로(없으면 종목 목록)
  const topCode =
    rows.length > 0
      ? rows.reduce((a, b) => (b.evalKrw > a.evalKrw ? b : a)).h.stockCode
      : null;

  // 전체 렌즈 → 종목 현황(기본) / 모으기·조각 렌즈 → 퍼즐(?view=pieces)
  const goDetail = (code: string) => router.push(portfolioDetailPath(code));
  const goPieces = (code: string) =>
    router.push(portfolioDetailPath(code, { view: "pieces" }));
  const goCollect = (code: string) =>
    router.push(portfolioDetailPath(code, { view: "collect" }));

  return (
    <>
      <AppHeader variant="sub" title="포트폴리오" />

      <div className="space-y-6">
        {/* 개요: 평가금액(전체/국내/해외 토글) + 동선 스트립을 하나의 카드로 */}
        <section className="overflow-hidden rounded-2xl bg-brand-surface">
          <div className="p-5">
            <SegmentedControl
              options={SCOPE_OPTIONS}
              value={scope}
              onChange={(v) => {
                setScope(v);
                syncParams(lens, v);
              }}
              className="mb-4"
            />
            <div className="mb-1 flex items-baseline gap-1.5">
              <p className="text-sm font-medium text-primary">{scopeLabel}</p>
              {displayAccountNo && (
                <p className="text-xs text-muted-foreground">{displayAccountNo}</p>
              )}
            </div>
            <div className="mt-1 flex items-start justify-between gap-3">
              {/* 범위/통화 토글로 값이 바뀔 때만 스왑 애니메이션(시세 틱엔 반응 안 함) */}
              <div key={`${scope}:${displayCurrency}`} className="ps-amount-swap min-w-0">
                <AmountDisplay
                  value={displayEval}
                  currency={displayCurrency}
                  size="xl"
                  className="text-foreground"
                />
                <div className="mt-1.5">
                  <ChangeIndicator
                    value={displayProfit}
                    suffix={displayCurrency === "KRW" ? "원" : ""}
                    prefix={displayCurrency === "USD" ? "$" : ""}
                    subPercent={scopeRate}
                    size="md"
                  />
                </div>
              </div>
              {/* 해외 + 환율 보유 시: 달러 ↔ 원화 표시 토글 */}
              {scope === "overseas" && fx !== null && (
                <CurrencyToggle checked={ovsKrw} onChange={setOvsKrw} />
              )}
            </div>
          </div>

          {/* 동선 — 기능별 타일(아이콘 + 라벨) */}
          <div className="grid grid-cols-4 gap-2 border-t border-primary/10 p-4">
            <ActionTile
              icon={<StockIcon className="size-8" />}
              label="주식 투자"
              onClick={() =>
                router.push(topCode ? tradingDetailPath(topCode) : "/trading")
              }
            />
            <ActionTile
              icon={<CollectIcon className="size-8" />}
              label="주식 모으기"
              onClick={() => router.push("/trading")}
            />
            <ActionTile
              icon={<CalendarIcon className="size-8" />}
              label="증권 캘린더"
              onClick={() => router.push("/budget?tab=stock")}
            />
            <ActionTile
              icon={<OrdersIcon className="size-8" />}
              label="주문내역"
              onClick={() => router.push("/history")}
            />
          </div>
        </section>

        {/* 보유 — 렌즈 칩 + 렌즈별 리스트. 보유·모으기 둘 다 없을 때만 빈 화면 */}
        {rows.length === 0 && pendingAuto.length === 0 ? (
          <EmptyState
            title="아직 모은 조각이 없어요"
            description="포인트·잔돈으로 첫 조각을 담아보세요."
            action={
              <Button size="sm" onClick={() => router.push("/trading")}>
                첫 조각 담으러 가기
              </Button>
            }
          />
        ) : (
          <section className="space-y-3">
            <SegmentedControl
              options={LENS_OPTIONS}
              value={effLens}
              onChange={(v) => {
                setLensPicked(true);
                setLens(v);
                syncParams(v, scope);
              }}
            />

            {/* 렌즈 전환 시 key 재마운트 → 행들이 살짝 올라오며 스태거 진입.
                CSS 애니메이션이라 숨김 탭에서도 최종 상태로 끝난다(blank 방지). */}
            <div key={effLens} className="space-y-3">
              {effLens === "pieces" ? (
                pieceRows.length === 0 ? (
                  <EmptyState
                    title="1주 미만 조각이 없어요"
                    description="보유 종목이 모두 온주예요."
                    className="py-8"
                  />
                ) : (
                  pieceRows.map((r, i) => {
                    const cv = cardView(r);
                    return (
                      <div
                        key={r.h.stockCode}
                        className="ps-rise-in"
                        style={{ "--i": Math.min(i, 5) } as React.CSSProperties}
                      >
                        <PiecesCard
                          name={r.name}
                          ticker={r.h.stockCode}
                          logoUrl={r.logoUrl}
                          quantity={r.h.quantity}
                          pieces={r.parts.pieces}
                          profit={cv.profit}
                          rate={cv.rate}
                          currency={cv.currency}
                          onClick={() => goPieces(r.h.stockCode)}
                        />
                      </div>
                    );
                  })
                )
              ) : lens === "auto" ? (
                <>
                  {/* 모으기 설정 진입 — 주식 모으기 설정(/trading/auto) */}
                  <button
                    type="button"
                    onClick={() => router.push("/trading/auto")}
                    className="ps-rise-in flex w-full items-center justify-between rounded-xl bg-brand-surface px-4 py-3 transition-[background-color,transform] duration-150 ease-out hover:bg-brand-surface/70 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Settings className="size-4" />
                      모으기 설정
                    </span>
                    <ChevronRight className="size-4 text-primary" />
                  </button>
                  {autoRows.length === 0 && pendingAuto.length === 0 ? (
                    <EmptyState
                      title="모으는 중인 종목이 없어요"
                      description="모으기 설정에서 종목을 추가해 보세요."
                      className="py-8"
                    />
                  ) : (
                    <>
                      {autoRows.map((r, i) => {
                        const cv = cardView(r);
                        return (
                          <div
                            key={r.h.stockCode}
                            className="ps-rise-in"
                            style={
                              { "--i": Math.min(i + 1, 5) } as React.CSSProperties
                            }
                          >
                            <HoldingCard
                              name={r.name}
                              ticker={r.h.stockCode}
                              logoUrl={r.logoUrl}
                              quantity={r.h.quantity}
                              evalAmount={cv.evalAmount}
                              profit={cv.profit}
                              rate={cv.rate}
                              currency={cv.currency}
                              isAuto={r.isAuto}
                              subtitle={scheduleByCode.get(r.h.stockCode) ?? ""}
                              onClick={() => goCollect(r.h.stockCode)}
                            />
                          </div>
                        );
                      })}
                      {/* 설정만 하고 아직 미보유(첫 매수 전) 종목 */}
                      {pendingAuto.map((p, i) => (
                        <div
                          key={p.stock.stockCode}
                          className="ps-rise-in"
                          style={
                            {
                              "--i": Math.min(autoRows.length + i + 1, 5),
                            } as React.CSSProperties
                          }
                        >
                          <AutoPendingCard
                            name={p.name}
                            ticker={p.stock.stockCode}
                            logoUrl={p.logoUrl}
                            stock={p.stock}
                            onClick={() => goCollect(p.stock.stockCode)}
                          />
                        </div>
                      ))}
                    </>
                  )}
                </>
              ) : scopedRows.length === 0 ? (
                <EmptyState
                  title={
                    scope === "domestic"
                      ? "국내 보유 종목이 없어요"
                      : scope === "overseas"
                        ? "해외 보유 종목이 없어요"
                        : "보유 종목이 없어요"
                  }
                  description="모으기 탭에서 예정 종목을 확인해 보세요."
                  className="py-8"
                />
              ) : (
                scopedRows.map((r, i) => {
                  const cv = cardView(r);
                  return (
                    <div
                      key={r.h.stockCode}
                      className="ps-rise-in"
                      style={{ "--i": Math.min(i, 5) } as React.CSSProperties}
                    >
                      <HoldingCard
                        name={r.name}
                        ticker={r.h.stockCode}
                        logoUrl={r.logoUrl}
                        quantity={r.h.quantity}
                        evalAmount={cv.evalAmount}
                        profit={cv.profit}
                        rate={cv.rate}
                        currency={cv.currency}
                        isAuto={r.isAuto}
                        onClick={() => goDetail(r.h.stockCode)}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

const FREQ_TEXT: Record<string, string> = {
  DAILY: "매일",
  WEEKLY: "주1회",
  MONTHLY: "월1회",
};

/** 모으기 주기·금액 한 줄 요약 — "매일 1,000원씩" / "주1회 1주씩" */
function autoScheduleText(s: AutoInvestStock): string {
  const freq = FREQ_TEXT[s.period] ?? "";
  let amt = "";
  if (s.amountType === "AMOUNT" && s.buyAmount !== null) {
    amt =
      s.currency === "USD"
        ? `$${s.buyAmount}`
        : `${s.buyAmount.toLocaleString("ko-KR")}원`;
  } else if (s.buyQuantity !== null) {
    amt = `${s.buyQuantity}주`;
  }
  return amt ? `${freq} ${amt}씩` : freq;
}

/** 모으기 설정만 하고 아직 미보유(첫 매수 전)인 종목 카드 — 보유 카드와 구분(점선·"아직 매수 전"). */
function AutoPendingCard({
  name,
  ticker,
  logoUrl,
  stock,
  onClick,
}: {
  name: string;
  ticker?: string;
  logoUrl?: string | null;
  stock: AutoInvestStock;
  onClick: () => void;
}) {
  const initial = (ticker ?? name).trim().charAt(0).toUpperCase();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4 text-left transition-[background-color,transform] duration-150 ease-out hover:bg-muted/40 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Avatar className="shrink-0">
        {logoUrl && <AvatarImage src={logoUrl} alt="" />}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-foreground">
            {name}
          </span>
          <span className="shrink-0 rounded-full bg-brand-surface px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            모으는 중
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {autoScheduleText(stock)}
        </p>
      </div>
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        모으기 전
      </span>
    </button>
  );
}

function ActionTile({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border border-black/[0.04] bg-card px-1 py-3 transition-[background-color,transform] duration-150 ease-out hover:bg-muted/50 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {icon}
      <span className="break-keep text-center text-xs font-medium leading-tight text-foreground">
        {label}
      </span>
    </button>
  );
}
