"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import Decimal from "decimal.js";
import { ChevronRight, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/common/AppHeader";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { HoldingCard } from "@/components/features/portfolio/HoldingCard";
import { PiecesCard } from "@/components/features/portfolio/PiecesCard";
import {
  portfolioDetailPath,
  tradingDetailPath,
} from "@/lib/navigation/routes";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import { useAutoInvestSummary } from "@/hooks/queries/useAutoInvest";
import { useExchangeRate } from "@/hooks/queries/useExchangeRate";
import { toDecimal } from "@/lib/utils/decimal";
import { toPieceParts } from "@/lib/utils/pieces";
import { queryKeys } from "@/lib/utils/queryKeys";

type Lens = "all" | "auto" | "pieces";

const LENS_OPTIONS: { label: string; value: Lens }[] = [
  { label: "전체", value: "all" },
  { label: "모으기", value: "auto" },
  { label: "조각", value: "pieces" },
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
  const queryClient = useQueryClient();
  const [lens, setLens] = useState<Lens>("all");
  const [scope, setScope] = useState<Scope>("all");
  const reduce = useReducedMotion();

  const holdingsQ = useHoldings();
  const holdings = holdingsQ.data ?? [];
  const codes = holdings.map((h) => h.stockCode);
  const details = useStockDetails(codes);
  const autoSummaryQ = useAutoInvestSummary();
  const exchangeRateQ = useExchangeRate();

  // 자동모으기 활성 종목코드 집합 (모으기 렌즈·배지용)
  const autoCodes = new Set(
    (autoSummaryQ.data?.stocks ?? [])
      .filter((s) => s.isActive)
      .map((s) => s.stockCode),
  );

  const detailsLoading = codes.length > 0 && details.some((d) => d.isLoading);
  const detailsError = codes.length > 0 && details.some((d) => d.isError);

  if (holdingsQ.isLoading || detailsLoading) {
    return (
      <div className="space-y-5">
        <SkeletonCard lines={2} className="h-36" />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  // 보유 조회 실패 또는 일부 종목 시세 실패(평가 0 오인 방지) 시 에러 노출
  if (holdingsQ.isError || detailsError) {
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

  // 금액·수량 계산은 decimal.js 필수. API 값은 toDecimal로 안전 변환(null→0)
  // TODO: 혼합 통화(USD) 보유 시 환율 환산 — 현재는 KRW 기준
  const rows = holdings.map((h, i) => {
    const detail = details[i]?.data;
    const qty = toDecimal(h.quantity);
    const price = toDecimal(detail?.price?.currentPrice);
    const evalAmount = qty.times(price);
    const invested = qty.times(toDecimal(h.avgBuyPrice));
    const profit = evalAmount.minus(invested);
    const rate = invested.gt(0)
      ? profit.div(invested).times(100)
      : new Decimal(0);
    const parts = toPieceParts(h.quantity);
    return {
      h,
      name: detail?.stockName ?? h.stockCode,
      logoUrl: detail?.logoUrl ?? null,
      evalAmount: evalAmount.toNumber(),
      invested,
      profit: profit.toNumber(),
      rate: rate.toNumber(),
      parts,
      isAuto: autoCodes.has(h.stockCode),
    };
  });

  // scope별 평가 집계 — 국내(KRW)/해외(USD) 분리, 전체는 환율로 KRW 환산 합산.
  // TODO: 백엔드 portfolio/summary 나오면 이 클라이언트 합성을 교체(환율·원금 서버 단일소스).
  const sumEval = (arr: typeof rows) =>
    arr.reduce((s, r) => s.plus(r.evalAmount), new Decimal(0));
  const sumInvested = (arr: typeof rows) =>
    arr.reduce((s, r) => s.plus(r.invested), new Decimal(0));

  const domRows = rows.filter((r) => r.h.currency !== "USD");
  const ovsRows = rows.filter((r) => r.h.currency === "USD");
  const hasOverseas = ovsRows.length > 0;
  const domEval = sumEval(domRows);
  const domInvested = sumInvested(domRows);
  const ovsEval = sumEval(ovsRows); // USD native
  const ovsInvested = sumInvested(ovsRows); // USD native
  const fx = exchangeRateQ.data?.baseRate
    ? new Decimal(exchangeRateQ.data.baseRate)
    : null;
  // 전체: 해외(USD)×환율 + 국내(KRW). 환율 없으면 native 합 폴백(기존 동작).
  const allEval = fx ? domEval.plus(ovsEval.times(fx)) : domEval.plus(ovsEval);
  const allInvested = fx
    ? domInvested.plus(ovsInvested.times(fx))
    : domInvested.plus(ovsInvested);

  const scopeView = {
    all: { eval: allEval, invested: allInvested, currency: "KRW" as const, label: "총 평가금액" },
    domestic: { eval: domEval, invested: domInvested, currency: "KRW" as const, label: "국내 평가금액" },
    overseas: { eval: ovsEval, invested: ovsInvested, currency: "USD" as const, label: "해외 평가금액" },
  }[scope];
  const scopeProfit = scopeView.eval.minus(scopeView.invested);
  const scopeRate = scopeView.invested.gt(0)
    ? scopeProfit.div(scopeView.invested).times(100)
    : new Decimal(0);

  const autoRows = rows.filter((r) => r.isAuto);
  const pieceRows = rows.filter((r) => r.parts.hasFraction);
  // 주식투자(매수매도) 바로가기 — 최다 보유 종목으로(없으면 종목 목록)
  const topCode =
    rows.length > 0
      ? rows.reduce((a, b) => (b.evalAmount > a.evalAmount ? b : a)).h.stockCode
      : null;

  // 전체 렌즈 → 종목 현황(기본) / 모으기·조각 렌즈 → 퍼즐(?view=pieces)
  const goDetail = (code: string) => router.push(portfolioDetailPath(code));
  const goPieces = (code: string) =>
    router.push(portfolioDetailPath(code, { view: "pieces" }));

  return (
    <>
      <AppHeader
        variant="sub"
        title="포트폴리오"
        right={
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => router.push("/trading")}
          >
            <Plus />
            종목 추가
          </Button>
        }
      />

      <div className="space-y-6">
        {/* 개요: 평가금액(전체/국내/해외 토글) + 동선 스트립을 하나의 카드로 */}
        <section className="overflow-hidden rounded-2xl bg-brand-surface">
          <div className="p-5">
            {/* 해외 보유가 있을 때만 범위 토글 노출 */}
            {hasOverseas && (
              <SegmentedControl
                options={SCOPE_OPTIONS}
                value={scope}
                onChange={setScope}
                className="mb-4"
              />
            )}
            <p className="text-sm font-medium text-primary">{scopeView.label}</p>
            <AmountDisplay
              value={scopeView.eval.toString()}
              currency={scopeView.currency}
              size="xl"
              className="mt-1 block text-foreground"
            />
            <div className="mt-1.5 flex items-center gap-1.5">
              <ChangeIndicator
                value={scopeProfit.toNumber()}
                suffix={scopeView.currency === "KRW" ? "원" : ""}
                prefix={scopeView.currency === "USD" ? "$" : ""}
                size="md"
                showArrow={false}
              />
              <ChangeIndicator value={scopeRate.toNumber()} percent size="md" />
            </div>
          </div>

          {/* 동선 스트립 — 카드 하단에 통합 */}
          {rows.length > 0 && (
            <div className="flex items-stretch border-t border-primary/10">
              <StripItem
                label="주식투자"
                value="매수매도"
                chevron
                accent
                onClick={() =>
                  router.push(topCode ? tradingDetailPath(topCode) : "/trading")
                }
              />
              <StripItem
                label="모으는 중"
                value={`${autoRows.length}종목`}
                onClick={() => router.push("/trading")}
                divider
              />
              <StripItem
                label="증권 캘린더"
                value="보기"
                chevron
                onClick={() => router.push("/budget?tab=stock")}
                divider
              />
              <StripItem
                label="주문내역"
                value="보기"
                chevron
                onClick={() => router.push("/history")}
                divider
              />
            </div>
          )}
        </section>

        {/* 보유 — 렌즈 칩 + 렌즈별 리스트 */}
        {rows.length === 0 ? (
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
              value={lens}
              onChange={setLens}
            />

            <motion.div
              key={lens}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="space-y-3"
            >
              {lens === "pieces" ? (
                pieceRows.length === 0 ? (
                  <EmptyState
                    title="1주 미만 조각이 없어요"
                    description="보유 종목이 모두 온주예요."
                    className="py-8"
                  />
                ) : (
                  pieceRows.map((r) => (
                    <PiecesCard
                      key={r.h.stockCode}
                      name={r.name}
                      ticker={r.h.stockCode}
                      logoUrl={r.logoUrl}
                      quantity={r.h.quantity}
                      pieces={r.parts.pieces}
                      onClick={() => goPieces(r.h.stockCode)}
                    />
                  ))
                )
              ) : lens === "auto" ? (
                <>
                  {/* 모으기 설정 진입 — 주식 모으기 설정(/trading/auto) */}
                  <button
                    type="button"
                    onClick={() => router.push("/trading/auto")}
                    className="flex w-full items-center justify-between rounded-xl bg-brand-surface px-4 py-3 transition-colors hover:bg-brand-surface/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Settings className="size-4" />
                      모으기 설정
                    </span>
                    <ChevronRight className="size-4 text-primary" />
                  </button>
                  {autoRows.length === 0 ? (
                    <EmptyState
                      title="모으는 중인 종목이 없어요"
                      description="모으기 설정에서 종목을 추가해 보세요."
                      className="py-8"
                    />
                  ) : (
                    autoRows.map((r) => (
                      <HoldingCard
                        key={r.h.stockCode}
                        name={r.name}
                        ticker={r.h.stockCode}
                        logoUrl={r.logoUrl}
                        quantity={r.h.quantity}
                        evalAmount={r.evalAmount}
                        profit={r.profit}
                        rate={r.rate}
                        isAuto={r.isAuto}
                        onClick={() => goPieces(r.h.stockCode)}
                      />
                    ))
                  )}
                </>
              ) : (
                rows.map((r) => (
                  <HoldingCard
                    key={r.h.stockCode}
                    name={r.name}
                    ticker={r.h.stockCode}
                    logoUrl={r.logoUrl}
                    quantity={r.h.quantity}
                    evalAmount={r.evalAmount}
                    profit={r.profit}
                    rate={r.rate}
                    isAuto={r.isAuto}
                    onClick={() => goDetail(r.h.stockCode)}
                  />
                ))
              )}
            </motion.div>
          </section>
        )}
      </div>
    </>
  );
}

function StripItem({
  label,
  value,
  onClick,
  chevron = false,
  divider = false,
  accent = false,
}: {
  label: string;
  value: string;
  onClick: () => void;
  chevron?: boolean;
  divider?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 px-2 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${
        divider ? "border-l border-border" : ""
      }`}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`flex items-center gap-0.5 font-numeric text-sm font-bold ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
        {chevron && <ChevronRight className="size-3.5 text-muted-foreground" />}
      </span>
    </button>
  );
}
