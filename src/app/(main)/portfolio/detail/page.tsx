"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { AppHeader } from "@/components/common/AppHeader";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { CurrencyToggle } from "@/components/common/CurrencyToggle";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { JigsawPuzzle } from "@/components/features/portfolio/JigsawPuzzle";
import { WholeShareConvertModal } from "@/components/features/portfolio/WholeShareConvertModal";
import { CollectStatus } from "@/components/features/portfolio/CollectStatus";
import { FacetCard, MiniPuzzle } from "@/components/features/portfolio/FacetCard";
import { CollectIcon } from "@/components/features/portfolio/ActionIcons";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { usePortfolioSummary } from "@/hooks/queries/usePortfolioSummary";
import { useStockDetail } from "@/hooks/queries/useStockDetail";
import { useExchangeRate } from "@/hooks/queries/useExchangeRate";
import { useOrders } from "@/hooks/queries/useOrders";
import { useWelcomeRewards } from "@/hooks/queries/useWelcomeRewards";
import {
  useAutoInvest,
  useAutoInvestExecutions,
} from "@/hooks/queries/useAutoInvest";
import {
  useWholeShareHistory,
  useConvertWholeShares,
} from "@/hooks/queries/useWholeShares";
import { useCancelOrder } from "@/hooks/mutations/useCancelOrder";
import { useStockTradeSocket } from "@/hooks/useStockTradeSocket";
import { useOrderNotification, type OrderNotification } from "@/hooks/useOrderNotification";
import { useTradingStore, EMPTY_PENDING } from "@/store/tradingStore";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { parseUTC } from "@/lib/utils/date";
import { toDecimal } from "@/lib/utils/decimal";
import {
  portfolioDetailPath,
  tradingAutoDetailPath,
  tradingDetailPath,
} from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";
import type {
  AutoInvestExecStatus,
  AutoInvestTriggerSource,
} from "@/types/domain/autoInvest";

const PIECES_PER_SHARE = 100; // 1주 = 100조각

const FREQ_LABEL = { DAILY: "매일", WEEKLY: "주1회", MONTHLY: "월1회" } as const;
const EXEC_SOURCE_LABEL: Record<AutoInvestTriggerSource, string> = {
  PERIODIC: "정기",
  BUY: "물타기",
  SELL: "익절",
};
const EXEC_STATUS: Record<AutoInvestExecStatus, { label: string; tone: string }> = {
  FILLED: { label: "체결", tone: "bg-brand-surface text-primary" },
  QUEUED: { label: "대기", tone: "bg-muted text-muted-foreground" },
  CANCELLED: { label: "취소", tone: "bg-muted text-muted-foreground" },
  REJECTED: { label: "실패", tone: "bg-destructive/10 text-destructive" },
  FAILED: { label: "실패", tone: "bg-destructive/10 text-destructive" },
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  RECEIVED: "접수됨",
  QUEUED: "체결 대기",
  SENT: "처리 중",
  PENDING: "미체결",
  CANCELLED: "취소됨",
  REJECTED: "실패",
};

function formatShares(q: Decimal) {
  return q.toDecimalPlaces(6).toString();
}

export default function StockDetailPage() {
  const searchParams = useSearchParams();
  const stockCode = searchParams.get("stockCode");
  const isPieces = searchParams.get("view") === "pieces";
  const isCollect = searchParams.get("view") === "collect";

  if (!stockCode) {
    return <MissingStockCodeState />;
  }

  return (
    <StockDetailContent
      key={stockCode}
      stockCode={stockCode}
      isPieces={isPieces}
      isCollect={isCollect}
    />
  );
}

function MissingStockCodeState() {
  const router = useRouter();

  return (
    <>
      <AppHeader variant="sub" title="내 조각" />
      <EmptyState
        title="종목 정보가 없어요"
        description="보유 종목을 다시 선택해 주세요."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/portfolio")}
          >
            보유 종목 보기
          </Button>
        }
        className="mt-8"
      />
    </>
  );
}

function StockDetailContent({
  stockCode,
  isPieces,
  isCollect,
}: {
  stockCode: string;
  isPieces: boolean;
  isCollect: boolean;
}) {
  const router = useRouter();
  const holdingsQ = useHoldings();
  const summaryQ = usePortfolioSummary();
  const detailQ = useStockDetail(stockCode);
  const exchangeRateQ = useExchangeRate();
  const ordersQ = useOrders();
  const rewardsQ = useWelcomeRewards();
  const auto = useAutoInvest(stockCode);
  const execQ = useAutoInvestExecutions(auto.id);
  const wholeQ = useWholeShareHistory();
  const convert = useConvertWholeShares();
  const cancelOrder = useCancelOrder();

  useStockTradeSocket(stockCode, {
    overseas: detailQ.data?.currency === "USD",
    enabled: !!detailQ.data,
  });

  const [ovsKrw, setOvsKrw] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [nudgeBtns, setNudgeBtns] = useState(false);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const triggerNudge = () => {
    setNudgeBtns(true);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setNudgeBtns(false), 1800);
  };

  // tradingStore에서 이 종목의 pending 조각 주문 읽기
  const removePending = useTradingStore((s) => s.removePending);
  const pendingOrders = useTradingStore((s) => s.pendingByStock[stockCode] ?? EMPTY_PENDING);
  const hasPending = pendingOrders.length > 0;

  // TTL 만료분 즉시 폐기 (마운트 시 1회)
  useEffect(() => {
    const now = Date.now();
    const expired = new Set(
      pendingOrders.filter((p) => p.expiresAt <= now).map((p) => p.orderId),
    );
    if (expired.size > 0) removePending(stockCode, expired);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingRef = useRef(pendingOrders);
  useEffect(() => {
    pendingRef.current = pendingOrders;
  }, [pendingOrders]);

  const holdingsRefetch = holdingsQ.refetch;

  // WS 체결통보 → 이 종목 pending 즉시 resolve
  const handleOrderNotification = useCallback(
    async (n: OrderNotification) => {
      if (n.stockCode !== stockCode) return;
      const matched = pendingRef.current.find((p) => p.orderId === n.orderId);
      if (!matched) return;
      if (n.status === "FILLED") {
        await holdingsRefetch();
        removePending(stockCode, new Set([n.orderId]));
        const verb = matched.mode === "buy" ? "매수" : "매도";
        const qty = n.filledQuantity !== null ? `${n.filledQuantity}주 ` : "";
        toast.success(`${qty}${verb} 체결됐어요`);
      } else if (n.status === "REJECTED" || n.status === "CANCELLED") {
        removePending(stockCode, new Set([n.orderId]));
        toast.error("체결되지 못한 주문이 있어요.");
      }
    },
    [stockCode, holdingsRefetch, removePending],
  );
  useOrderNotification(handleOrderNotification, hasPending);

  if (holdingsQ.isLoading || detailQ.isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={1} className="h-10 border-0 bg-transparent p-0" />
        <SkeletonCard lines={0} className="aspect-square" />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (detailQ.isError || !detailQ.data) {
    return (
      <div>
        <EmptyState
          title="불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button variant="outline" size="sm" onClick={() => detailQ.refetch()}>
              다시 시도
            </Button>
          }
        />
      </div>
    );
  }

  const detail = detailQ.data;
  const holding = holdingsQ.data?.find((h) => h.stockCode === stockCode);

  const qty = toDecimal(holding?.quantity);
  const price = toDecimal(detail.price?.currentPrice);
  const frac = qty.minus(qty.floor());
  const pieces = frac
    .times(PIECES_PER_SHARE)
    .toDecimalPlaces(0, Decimal.ROUND_DOWN)
    .toNumber();

  const pendingBuy = pendingOrders.reduce((s, p) => s + (p.mode === "buy" ? p.count : 0), 0);
  const pendingSell = pendingOrders.reduce((s, p) => s + (p.mode === "sell" ? p.count : 0), 0);

  const hv = summaryQ.data?.holdings.find((h) => h.stockCode === stockCode);
  const evalAmount =
    hv && hv.evalAmount !== null ? toDecimal(hv.evalAmount) : qty.times(price);

  const invested =
    hv && hv.invested !== null
      ? toDecimal(hv.invested)
      : qty.times(toDecimal(holding?.avgBuyPrice));
  const profit =
    hv && hv.profit !== null ? toDecimal(hv.profit) : evalAmount.minus(invested);
  const rate =
    hv && hv.profitRate !== null
      ? toDecimal(hv.profitRate)
      : invested.gt(0)
        ? profit.div(invested).times(100)
        : new Decimal(0);
  const fractionalQtyD = toDecimal(holding?.fractionalQty);
  const canConvert = fractionalQtyD.gte(1);
  const convHistory = (wholeQ.data ?? []).filter(
    (c) => c.stockCode === stockCode,
  );

  const isUSD = detail.currency === "USD";
  const fmtAmount = (v: number | string) => (isUSD ? formatUSD(v) : formatKRW(v));
  const fx = isUSD ? exchangeRateQ.data?.baseRate ?? null : null;
  const showKrw = ovsKrw && fx !== null;
  const viewCurrency: "USD" | "KRW" = isUSD && !showKrw ? "USD" : "KRW";
  const displayRate =
    (!isUSD || showKrw) &&
    hv?.profitKrw !== null && hv?.profitKrw !== undefined &&
    hv?.investedKrw !== null && hv?.investedKrw !== undefined &&
    hv.investedKrw > 0
      ? new Decimal(hv.profitKrw).div(hv.investedKrw).times(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      : rate;
  const toView = (v: Decimal) => (showKrw ? v.times(fx) : v);
  const fmtView = (v: number | string) =>
    showKrw ? formatKRW(toDecimal(v).times(fx).toNumber()) : fmtAmount(v);

  const recentOrders = (ordersQ.data ?? [])
    .filter((o) => o.stockCode === stockCode && o.status !== "REJECTED");

  const recentRewards = (rewardsQ.data ?? []).filter(
    (r) => r.stockCode === stockCode,
  );

  type RecentItem =
    | { kind: "order"; ts: number; data: (typeof recentOrders)[number] }
    | { kind: "reward"; ts: number; data: (typeof recentRewards)[number] };

  const recentItems: RecentItem[] = [
    ...recentOrders.map((o) => ({
      kind: "order" as const,
      ts: new Date(o.createdAt).getTime(),
      data: o,
    })),
    ...recentRewards.map((r) => ({
      kind: "reward" as const,
      ts: new Date(r.grantedAt).getTime(),
      data: r,
    })),
  ]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 5);

  const handleCancel = (orderId: number) => {
    if (cancelOrder.isPending) return;
    cancelOrder.mutate(orderId, {
      onSuccess: () => toast.success("주문을 취소했어요"),
      onError: (err: unknown) =>
        toast.error(
          err instanceof ApiError
            ? err.message
            : "주문 취소에 실패했어요. 잠시 후 다시 시도해 주세요.",
        ),
    });
  };

  const handleConvert = () => {
    if (convert.isPending) return;
    convert.mutate(stockCode, {
      onSuccess: (r) =>
        toast.success(`${r.convertedWholeQty}주를 온주로 전환했어요`),
      onError: (err: unknown) =>
        toast.error(
          err instanceof ApiError
            ? err.message
            : "온주 전환에 실패했어요. 잠시 후 다시 시도해 주세요.",
        ),
    });
  };

  const handleConvertClick = () => {
    if (convert.isPending) return;
    if (canConvert) {
      setShowConvertModal(true);
      return;
    }
    toast("아직 온주 1주가 안 됐어요", {
      description: "조금 더 모으면 온주로 굳힐 수 있어요.",
      action: {
        label: "매매창으로",
        onClick: () => router.push(tradingDetailPath(stockCode)),
      },
    });
  };

  const collectFreqLabel = auto.setting ? FREQ_LABEL[auto.setting.frequency] : "";
  const collectScheduleText = auto.setting
    ? `${collectFreqLabel} ${
        auto.setting.amountMode === "AMOUNT"
          ? fmtView(auto.setting.amount)
          : `${auto.setting.quantity}주`
      }`
    : "";
  const execList = execQ.data ?? [];
  const fills = execList.filter((e) => e.status === "FILLED");
  const collectedAmount = fills
    .reduce((s, e) => s.plus(toDecimal(e.execAmount)), new Decimal(0))
    .toNumber();
  const collectedQtyD = fills.reduce(
    (s, e) => s.plus(toDecimal(e.execQuantity)),
    new Decimal(0),
  );
  const collectStartDate = (() => {
    const dates = execList.map((e) => e.execDate).filter(Boolean);
    if (dates.length === 0) return null;
    const oldest = dates.reduce((a, b) => (a < b ? a : b));
    const d = new Date(oldest);
    return isNaN(d.getTime()) ? oldest : format(d, "yyyy년 M월 d일");
  })();

  const bojuText = qty.gt(0)
    ? `${qty.toDecimalPlaces(6).toString()}주`
    : "0주";
  const anyFacetActive = pieces > 0 || auto.id !== null;

  return (
    <>
      <AppHeader
        variant="sub"
        title={
          isCollect ? detail.stockName : (
            <span className="flex items-center gap-2">
              <Avatar className="size-7 shrink-0">
                {detail.logoUrl && <AvatarImage src={detail.logoUrl} alt="" />}
                <AvatarFallback className="text-[10px]">
                  {(detail.stockCode ?? detail.stockName).trim().charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="flex flex-col text-left leading-tight">
                <span className="text-xs text-muted-foreground">{detail.stockName}</span>
                <span className="flex items-baseline gap-1.5">
                  <AmountDisplay
                    value={toView(price).toString()}
                    currency={viewCurrency}
                    size="md"
                    className="font-bold"
                  />
                  <ChangeIndicator value={detail.price?.changeRate ?? 0} percent size="sm" />
                </span>
              </span>
            </span>
          )
        }
        right={
          isUSD && fx !== null ? (
            <CurrencyToggle checked={ovsKrw} onChange={setOvsKrw} />
          ) : undefined
        }
      />

      <div className={cn("space-y-6", !isCollect && "pb-40")}>
        {isCollect ? (
          <CollectStatus
            freqLabel={collectFreqLabel}
            scheduleText={collectScheduleText}
            startDateText={collectStartDate}
            collectedAmount={toView(toDecimal(collectedAmount)).toNumber()}
            collectedQty={formatShares(collectedQtyD)}
            collectedCount={fills.length}
            profit={toView(profit).toNumber()}
            rate={displayRate.toNumber()}
            currency={viewCurrency}
            showPieces={pieces > 0}
            onEdit={() => router.push(tradingAutoDetailPath(stockCode))}
            onPieces={() =>
              router.push(portfolioDetailPath(stockCode, { view: "pieces" }))
            }
            onStatus={() => router.push(portfolioDetailPath(stockCode))}
            onBuyNow={() => router.push(tradingDetailPath(stockCode))}
          />
        ) : (
          <>
            {isPieces ? (
              <>
                {/* 퍼즐 현황 — 조각 수 확인용 (거래는 /trading/detail에서) */}
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-bold text-foreground">퍼즐 현황</h2>
                    <span className="font-numeric text-sm font-bold text-primary">
                      {pieces}/{PIECES_PER_SHARE} 조각
                    </span>
                  </div>
                  <JigsawPuzzle
                    total={PIECES_PER_SHARE}
                    filled={pieces}
                    pendingBuy={pendingBuy}
                    pendingSell={pendingSell}
                    logoUrl={detail.logoUrl}
                    onDragAttempt={triggerNudge}
                  />
                  <div
                    className={cn(
                      "mt-2 flex items-center justify-center gap-1 text-sm font-semibold text-primary transition-opacity duration-300",
                      nudgeBtns ? "opacity-100" : "pointer-events-none opacity-0",
                    )}
                  >
                    아래 버튼으로 매수·매도해요
                    <ChevronDown className="size-4" />
                  </div>
                  {canConvert && (
                    <div className="mt-3">
                      <FacetCard
                        icon={<Layers className="size-9 text-primary" />}
                        title="온주로 전환"
                        subtitle={`소수점 주식 ${fractionalQtyD.floor().toString()}주를 온주로`}
                        cta={convert.isPending ? "전환 중" : "전환"}
                        onClick={handleConvertClick}
                      />
                    </div>
                  )}
                  {/* 보유 / 1주 완성까지 */}
                  <div className="mt-3 flex flex-col gap-2.5 border-t border-border pt-3">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">내 보유</span>
                      <span className="font-numeric font-bold text-foreground">
                        {formatShares(qty)}주
                        <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                          {fmtView(evalAmount.toString())}
                        </span>
                      </span>
                    </div>
                  </div>
                  {auto.id !== null && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(portfolioDetailPath(stockCode, { view: "collect" }))
                      }
                      className="mt-3 flex items-center gap-0.5 text-sm font-semibold text-primary"
                    >
                      모으기로 모은 주식 보기
                      <ChevronRight className="size-4" />
                    </button>
                  )}
                </section>

              </>
            ) : (
              <>
                {/* 히어로 — 내 평가금액 + 손익 + 보유수량 */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    내 평가금액
                  </p>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <AmountDisplay
                      value={toView(evalAmount).toString()}
                      currency={viewCurrency}
                      size="xl"
                      className="font-bold"
                    />
                    <ChangeIndicator
                      value={toView(profit).toNumber()}
                      suffix={viewCurrency === "KRW" ? "원" : ""}
                      prefix={viewCurrency === "USD" ? "$" : ""}
                      subPercent={displayRate.toNumber()}
                      size="md"
                    />
                  </div>
                  <p className="font-numeric mt-2 text-sm text-muted-foreground">
                    보유 {bojuText}
                  </p>
                </div>

                {/* 이 종목 모으는 법 */}
                <section className="space-y-2.5">
                  <h2 className="text-base font-bold text-foreground">
                    {anyFacetActive
                      ? "이 종목, 이렇게 모아요"
                      : "이 종목, 이렇게도 모아요"}
                  </h2>
                  <FacetCard
                    icon={<MiniPuzzle active={pieces > 0} />}
                    title="퍼즐 조각"
                    active={pieces > 0}
                    subtitle={
                      pieces > 0
                        ? `${pieces} / ${PIECES_PER_SHARE} 조각 · 1주까지 ${PIECES_PER_SHARE - pieces}조각`
                        : "소수점으로 한 조각씩 모아보세요"
                    }
                    cta={pieces > 0 ? null : "모으기"}
                    onClick={() =>
                      router.push(portfolioDetailPath(stockCode, { view: "pieces" }))
                    }
                  />
                  <FacetCard
                    icon={<CollectIcon className="size-9" />}
                    title="자동 모으기"
                    active={auto.id !== null}
                    badge={
                      auto.id !== null
                        ? auto.setting?.enabled
                          ? "진행 중"
                          : "일시중지"
                        : null
                    }
                    subtitle={
                      auto.id !== null
                        ? `${collectScheduleText}${fills.length > 0 ? ` · ${fills.length}회 모음` : ""}`
                        : "매일·매주 알아서 모아드려요"
                    }
                    cta={auto.id !== null ? null : "시작"}
                    onClick={() =>
                      router.push(
                        auto.id !== null
                          ? portfolioDetailPath(stockCode, { view: "collect" })
                          : tradingAutoDetailPath(stockCode),
                      )
                    }
                  />
                </section>

                {convHistory.length > 0 && (
                  <section>
                    <h2 className="mb-3 text-base font-bold text-foreground">
                      온주 전환 내역
                    </h2>
                    <div className="divide-y divide-border">
                      {convHistory.map((c, i) => (
                        <div
                          key={`${c.stockCode}-${c.convertedAt}-${i}`}
                          className="flex items-center justify-between py-3"
                        >
                          <span className="text-xs text-muted-foreground">
                            {format(parseUTC(c.convertedAt), "MM.dd")}
                          </span>
                          <span className="font-numeric text-sm font-bold text-foreground">
                            {c.wholeQty}주 전환
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}

        {/* 모으기 내역 (회차) */}
        {auto.id !== null && !isPieces && (
          <section>
            <h2 className="mb-3 text-base font-bold text-foreground">모으기 내역</h2>
            {execQ.isLoading ? (
              <SkeletonCard lines={2} />
            ) : (execQ.data ?? []).length === 0 ? (
              <EmptyState title="아직 모으기 내역이 없어요" className="py-6" />
            ) : (
              <div className="divide-y divide-border">
                {(execQ.data ?? []).map((e) => {
                  const st = EXEC_STATUS[e.status];
                  const q = toDecimal(e.execQuantity);
                  const a = toDecimal(e.execAmount);
                  return (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          {e.roundNo}회차
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {EXEC_SOURCE_LABEL[e.triggerSource]}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                              st.tone,
                            )}
                          >
                            {st.label}
                          </span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {e.execDate}
                          {e.status === "FAILED" && e.failReason
                            ? ` · ${e.failReason}`
                            : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-numeric text-sm font-bold text-foreground">
                          {q.gt(0) ? `${formatShares(q)}주` : "—"}
                        </p>
                        <p className="font-numeric text-xs text-muted-foreground">
                          {a.gt(0) ? fmtView(a.toString()) : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 최근 내역 */}
        {!isCollect && (
          <section>
            <h2 className="mb-3 text-base font-bold text-foreground">최근 내역</h2>
            {recentItems.length === 0 ? (
              <EmptyState title="최근 내역이 없어요" className="py-6" />
            ) : (
              <div className="divide-y divide-border">
                {recentItems.map((item) => {
                  if (item.kind === "reward") {
                    const r = item.data;
                    return (
                      <div
                        key={`reward-${r.grantedAt}`}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            첫 주식 보상
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(r.grantedAt), "MM.dd HH:mm")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-numeric text-sm font-bold text-foreground">
                            {formatShares(toDecimal(r.quantity))}주
                          </p>
                          <p className="font-numeric text-xs text-muted-foreground">
                            {formatKRW(r.budgetKrw)}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  const o = item.data;
                  const orderQty = toDecimal(o.quantity);
                  const orderPrice = toDecimal(o.price);
                  const amt =
                    typeof o.filledAmount === "number"
                      ? toDecimal(o.filledAmount)
                      : orderPrice.times(orderQty);
                  const cancellable =
                    o.status === "QUEUED" || o.status === "PENDING";
                  const canceling =
                    cancelOrder.isPending && cancelOrder.variables === o.orderId;
                  return (
                    <div
                      key={o.orderId}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          {o.side === "BUY" ? "매수" : "매도"}
                          {o.status !== "FILLED" && ORDER_STATUS_LABEL[o.status] && (
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {ORDER_STATUS_LABEL[o.status]}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseUTC(o.createdAt), "MM.dd HH:mm")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <p className="font-numeric text-sm font-bold text-foreground">
                            {formatShares(orderQty)}주
                          </p>
                          <p className="font-numeric text-xs text-muted-foreground">
                            {amt.gt(0)
                              ? fmtView(amt.toString())
                              : cancellable
                                ? "체결 대기 중"
                                : "—"}
                          </p>
                        </div>
                        {cancellable && (
                          <button
                            type="button"
                            onClick={() => handleCancel(o.orderId)}
                            disabled={cancelOrder.isPending}
                            className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                          >
                            {canceling ? "취소 중..." : "취소"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      <WholeShareConvertModal
        open={showConvertModal}
        logoUrl={detail.logoUrl}
        fractionalQty={fractionalQtyD.floor().toString()}
        isPending={convert.isPending}
        onConfirm={() => { setShowConvertModal(false); handleConvert(); }}
        onClose={() => setShowConvertModal(false)}
      />

      {/* 현황·조각 뷰 — 하단 매수·매도 버튼 */}
      {!isCollect && (
        <div className={cn(
          "fixed bottom-[var(--bottom-nav-offset)] left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t bg-background px-5 pt-3 transition-colors duration-300",
          nudgeBtns ? "border-primary/40" : "border-border",
        )}>
          <div className="flex gap-2.5 pb-3">
            <Button
              onClick={() =>
                router.push(tradingDetailPath(stockCode, { side: "BUY" }))
              }
              className="h-12 flex-1 bg-up text-base font-bold text-white hover:bg-up/90"
            >
              매수
            </Button>
            <Button
              onClick={() =>
                router.push(tradingDetailPath(stockCode, { side: "SELL" }))
              }
              className="h-12 flex-1 bg-down text-base font-bold text-white hover:bg-down/90"
            >
              매도
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
