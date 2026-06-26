"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ChevronRight, Layers } from "lucide-react";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { AppHeader } from "@/components/common/AppHeader";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { JigsawPuzzle } from "@/components/features/portfolio/JigsawPuzzle";
import { PuzzleOrderSheet } from "@/components/features/portfolio/PuzzleOrderSheet";
import { CollectStatus } from "@/components/features/portfolio/CollectStatus";
import {
  FacetCard,
  MiniPuzzle,
  MiniCoins,
} from "@/components/features/portfolio/FacetCard";
import { TxnAuthDialog } from "@/components/common/TxnAuthDialog";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useStockDetail } from "@/hooks/queries/useStockDetail";
import { useOrders } from "@/hooks/queries/useOrders";
import {
  useAutoInvest,
  useAutoInvestExecutions,
} from "@/hooks/queries/useAutoInvest";
import {
  useWholeShareHistory,
  useConvertWholeShares,
} from "@/hooks/queries/useWholeShares";
import { useBuyOrder } from "@/hooks/mutations/useBuyOrder";
import { useSellOrder } from "@/hooks/mutations/useSellOrder";
import { useCancelOrder } from "@/hooks/mutations/useCancelOrder";
import { useStockTradeSocket } from "@/hooks/useStockTradeSocket";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { toDecimal } from "@/lib/utils/decimal";
import { genClientOrderId } from "@/lib/utils/idempotency";
import { splitOrderToast } from "@/lib/utils/orderResult";
import {
  portfolioDetailPath,
  tradingAutoDetailPath,
  tradingDetailPath,
} from "@/lib/navigation/routes";
import type { SplitOrderResponse } from "@/types/domain/order";
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
// 회차 상태 칩 — 실패 계열만 destructive, 나머지는 muted/brand
const EXEC_STATUS: Record<AutoInvestExecStatus, { label: string; tone: string }> = {
  FILLED: { label: "체결", tone: "bg-brand-surface text-primary" },
  QUEUED: { label: "대기", tone: "bg-muted text-muted-foreground" },
  CANCELLED: { label: "취소", tone: "bg-muted text-muted-foreground" },
  REJECTED: { label: "실패", tone: "bg-destructive/10 text-destructive" },
  FAILED: { label: "실패", tone: "bg-destructive/10 text-destructive" },
};

// 미체결/종결 상태 라벨 (FILLED는 칩 미표시). 취소 가능 = QUEUED(소수점)·PENDING(온주).
const ORDER_STATUS_LABEL: Record<string, string> = {
  RECEIVED: "접수됨",
  QUEUED: "체결 대기",
  SENT: "처리 중",
  PENDING: "미체결",
  CANCELLED: "취소됨",
  REJECTED: "실패",
};

function formatShares(q: Decimal) {
  return q.toDecimalPlaces(4).toString();
}

interface Selection {
  mode: "buy" | "sell";
  indexes: number[];
  /** 이 주문 시도의 멱등키 — 재확인/재시도 시 동일 값 재사용 (issue #4) */
  clientOrderId: string;
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
  const detailQ = useStockDetail(stockCode);
  const ordersQ = useOrders();
  // 자동모으기 종목인지 + 회차 내역 (모으기 종목일 때만 의미)
  const auto = useAutoInvest(stockCode);
  const execQ = useAutoInvestExecutions(auto.id);
  // 현황 뷰: 온주전환 내역
  const wholeQ = useWholeShareHistory();
  const convert = useConvertWholeShares();
  const buyOrder = useBuyOrder();
  const sellOrder = useSellOrder();
  const cancelOrder = useCancelOrder();
  // 실시간 시세(체결) → 현재가 갱신 (issue #10)
  useStockTradeSocket(stockCode, {
    overseas: detailQ.data?.currency === "USD",
    enabled: !!detailQ.data,
  });
  const [sel, setSel] = useState<Selection | null>(null);
  // 드래그 중 라이브 선택(조각 수·금액 실시간 HUD용). 손 떼면 null
  const [live, setLive] = useState<{
    mode: "buy" | "sell";
    indexes: number[];
  } | null>(null);
  // 거래 인증 필요 시 계좌 비밀번호를 받기 위한 시트 — 인증 후 동일 키로 재시도
  const [authOpen, setAuthOpen] = useState(false);
  // 접수(체결 대기) 주문들 — 확정 즉시 애니메이션. 동시 다건 누적, 각자 실제 FILLED 시 개별 해제.
  const [pendingOrders, setPendingOrders] = useState<
    { orderId: number; mode: "buy" | "sell"; count: number }[]
  >([]);
  const hasPending = pendingOrders.length > 0;
  const ordersRefetch = ordersQ.refetch;
  const holdingsRefetch = holdingsQ.refetch;
  // 폴링 콜백에서 최신 pending을 읽기 위한 ref(이펙트 내부 동기 setState 회피)
  const pendingRef = useRef(pendingOrders);
  useEffect(() => {
    pendingRef.current = pendingOrders;
  }, [pendingOrders]);

  // 접수 중이면 주문내역을 폴링(차수배치 ~1분)하며 reconcile.
  // FILLED → 보유 갱신 후 해제(확정 스냅) / 실패 → 해제(롤백). 5분 안전망.
  useEffect(() => {
    if (!hasPending) return;
    const tick = async () => {
      const res = await ordersRefetch();
      const list = res.data ?? [];
      const resolved = new Set<number>();
      let anyFilled = false;
      let anyFailed = false;
      for (const p of pendingRef.current) {
        const o = list.find((x) => x.orderId === p.orderId);
        if (!o) continue;
        if (o.status === "FILLED") {
          resolved.add(p.orderId);
          anyFilled = true;
        } else if (o.status === "REJECTED" || o.status === "CANCELLED") {
          resolved.add(p.orderId);
          anyFailed = true;
        }
      }
      if (resolved.size === 0) return;
      if (anyFilled) void holdingsRefetch();
      if (anyFailed) toast.error("체결되지 못한 주문이 있어요.");
      setPendingOrders((prev) => prev.filter((p) => !resolved.has(p.orderId)));
    };
    const iv = setInterval(() => void tick(), 4000);
    const stop = setTimeout(() => setPendingOrders([]), 300_000);
    return () => {
      clearInterval(iv);
      clearTimeout(stop);
    };
  }, [hasPending, ordersRefetch, holdingsRefetch]);

  const pendingBuy = pendingOrders.reduce(
    (s, p) => s + (p.mode === "buy" ? p.count : 0),
    0,
  );
  const pendingSell = pendingOrders.reduce(
    (s, p) => s + (p.mode === "sell" ? p.count : 0),
    0,
  );

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

  // 금액·수량 계산은 decimal.js 필수 (README 가이드라인). API 값은 toDecimal로 안전 변환(null→0)
  const qty = toDecimal(holding?.quantity);
  const price = toDecimal(detail.price?.currentPrice);
  const frac = qty.minus(qty.floor());
  const pieces = frac
    .times(PIECES_PER_SHARE)
    .toDecimalPlaces(0, Decimal.ROUND_DOWN)
    .toNumber(); // 0~100, 버림(정수 조각)
  const evalAmount = qty.times(price);
  const remainAmount = new Decimal(1).minus(frac).times(price);

  // 현황: 평가손익 + 온주/소수 분리(FRAC-010)
  const invested = qty.times(toDecimal(holding?.avgBuyPrice));
  const profit = evalAmount.minus(invested);
  const rate = invested.gt(0) ? profit.div(invested).times(100) : new Decimal(0);
  const fractionalQtyD = toDecimal(holding?.fractionalQty);
  const canConvert = fractionalQtyD.gte(1); // 신탁 소수가 1주 이상이면 온주 전환 가능
  const convHistory = (wholeQ.data ?? []).filter(
    (c) => c.stockCode === stockCode,
  );

  // 주문 (틀): 조각당 금액 = 현재가 / 100
  const isUSD = detail.currency === "USD";
  const market = isUSD ? "OVERSEAS" : "DOMESTIC";
  const fmtAmount = (v: number | string) => (isUSD ? formatUSD(v) : formatKRW(v));
  const selPieces = sel?.indexes.length ?? 0;
  const orderAmount = price.div(PIECES_PER_SHARE).times(selPieces);
  const ordering = buyOrder.isPending || sellOrder.isPending;

  // 백엔드 최소 주문금액(국내 1,000원 / 해외 $0.01)을 충족하는 최소 조각 수.
  const perPiece = price.div(PIECES_PER_SHARE);
  const minOrder = isUSD ? 1 : 1000; // 국내 1,000원 / 해외 $1
  const minPieces = perPiece.gt(0)
    ? new Decimal(minOrder).div(perPiece).ceil().toNumber()
    : 1;

  // 선택 확정 = 새 주문 시도 → 멱등키 1개 발급(해제는 null). 재드래그하면 새 키.
  const handleCommit = (
    s: { mode: "buy" | "sell"; indexes: number[] } | null,
  ) => {
    if (!s) {
      setSel(null);
      return;
    }
    let indexes = s.indexes;
    if (indexes.length < minPieces) {
      const candidates =
        s.mode === "buy"
          ? Array.from({ length: PIECES_PER_SHARE - pieces }, (_, i) => pieces + i)
          : Array.from({ length: pieces }, (_, i) => i);
      const chosen = new Set(indexes);
      for (const idx of candidates) {
        if (chosen.size >= minPieces) break;
        chosen.add(idx);
      }
      indexes = Array.from(chosen).sort((a, b) => a - b);
      if (indexes.length < minPieces) {
        toast.warning(
          `최소 주문금액(${fmtAmount(minOrder)})을 채울 조각이 부족해요`,
        );
        setSel(null);
        return;
      }
      if (indexes.length > s.indexes.length) {
        toast.warning(
          `최소 주문금액은 ${fmtAmount(minOrder)} 이상이에요. ${indexes.length}조각으로 맞췄어요`,
        );
      }
    }
    setSel({ mode: s.mode, indexes, clientOrderId: genClientOrderId() });
  };

  const handleConfirm = () => {
    if (!sel || ordering) return;
    const isBuy = sel.mode === "buy";
    const clientOrderId = sel.clientOrderId;
    // 접수 애니메이션용 — 확정 시점의 조각/모드 고정(이후 sel은 null로 닫힘)
    const committedMode = sel.mode;
    const committedIndexes = sel.indexes;
    const opts = {
      onSuccess: (data: SplitOrderResponse) => {
        const t = splitOrderToast(isBuy ? "BUY" : "SELL", data);
        toast.success(
          t.title,
          t.description ? { description: t.description } : undefined,
        );
        // 소수분 접수됨 → 퍼즐에 즉시 손맛 애니메이션(실제 체결 전까지 pending). 동시 다건 누적.
        const fid = data.fractionalOrderId;
        if (fid !== null) {
          setPendingOrders((prev) => [
            ...prev,
            { orderId: fid, mode: committedMode, count: committedIndexes.length },
          ]);
        }
        setSel(null);
      },
      onError: (err: unknown) => {
        if (err instanceof ApiError && err.code === "TXN_AUTH_REQUIRED") {
          setAuthOpen(true);
          return;
        }
        if (err instanceof ApiError && err.status === 409) {
          toast.error("이미 처리 중인 주문이에요. 잠시 후 다시 확인해 주세요.");
          return;
        }
        toast.error(
          err instanceof ApiError
            ? err.message
            : "주문에 실패했어요. 잠시 후 다시 시도해 주세요.",
        );
      },
    };
    const quantity = new Decimal(selPieces).div(PIECES_PER_SHARE).toNumber();
    if (sel.mode === "buy") {
      buyOrder.mutate(
        { clientOrderId, stockCode, market, orderType: "QUANTITY", quantity },
        opts,
      );
    } else {
      sellOrder.mutate(
        { clientOrderId, stockCode, market, orderType: "QUANTITY", quantity },
        opts,
      );
    }
  };

  const recentOrders = (ordersQ.data ?? [])
    .filter((o) => o.stockCode === stockCode && o.status !== "REJECTED")
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

  // 전환 버튼: 1주 이상이면 바로 전환 / 1주 미만이면 더 모으도록 매매창 안내
  const handleConvertClick = () => {
    if (convert.isPending) return;
    if (canConvert) {
      handleConvert();
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

  // 모으기 현황(view=collect) — 체결분 집계 + 일정/시작일
  const collectFreqLabel = auto.setting ? FREQ_LABEL[auto.setting.frequency] : "";
  const collectScheduleText = auto.setting
    ? `${collectFreqLabel} ${
        auto.setting.amountMode === "AMOUNT"
          ? fmtAmount(auto.setting.amount)
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

  // 전체(현황) 허브 — 보유 표기("5주 73조각"/0조각이면 "5주") + facet 활성 여부
  const wholeShares = qty.floor().toNumber().toLocaleString("ko-KR");
  const bojuText = pieces > 0 ? `${wholeShares}주 ${pieces}조각` : `${wholeShares}주`;
  const anyFacetActive = pieces > 0 || auto.id !== null;

  return (
    <>
      <AppHeader variant="sub" title={detail.stockName} />

      <div
        className={cn("space-y-6", !isPieces && !isCollect && "pb-24")}
      >
        {isCollect ? (
          <CollectStatus
            freqLabel={collectFreqLabel}
            scheduleText={collectScheduleText}
            startDateText={collectStartDate}
            collectedAmount={collectedAmount}
            collectedQty={formatShares(collectedQtyD)}
            collectedCount={fills.length}
            profit={profit.toNumber()}
            rate={rate.toNumber()}
            currency={isUSD ? "USD" : "KRW"}
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
        {/* 현재가 + 등락 — 조각 뷰만(현황은 허브 히어로가 대신) */}
        {isPieces && (
          <div className="flex items-baseline gap-2">
            <AmountDisplay
              value={price.toString()}
              currency={isUSD ? "USD" : "KRW"}
              size="lg"
            />
            <ChangeIndicator
              value={detail.price?.changeRate ?? 0}
              percent
              size="md"
            />
          </div>
        )}

        {/* 모으기 배너 — 조각 뷰에서만. 탭 → 모으기 현황 */}
        {isPieces && auto.id !== null && auto.setting && (
          <button
            type="button"
            onClick={() =>
              router.push(portfolioDetailPath(stockCode, { view: "collect" }))
            }
            className="flex w-full items-center justify-between rounded-xl bg-brand-surface px-4 py-3 text-left"
          >
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <span
                className={cn(
                  "inline-block size-2 shrink-0 rounded-full",
                  auto.setting.enabled ? "bg-primary" : "bg-muted-foreground/40",
                )}
              />
              <span className="shrink-0 font-bold text-primary">
                {auto.setting.enabled ? "모으기 중" : "모으기 일시중지"}
              </span>
              <span className="truncate text-muted-foreground">
                {FREQ_LABEL[auto.setting.frequency]} ·{" "}
                {auto.setting.amountMode === "AMOUNT"
                  ? fmtAmount(auto.setting.amount)
                  : `${auto.setting.quantity}주`}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-primary" />
          </button>
        )}

        {isPieces ? (
          <>
            {/* 퍼즐 현황 (조각 탭 → 매수/매도 선택) */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground">퍼즐 현황</h2>
                <span className="font-numeric text-sm font-bold text-primary">
                  {pieces}/{PIECES_PER_SHARE} 조각
                </span>
              </div>
              <div className="relative">
                <JigsawPuzzle
                  total={PIECES_PER_SHARE}
                  filled={pieces}
                  onSelectionCommit={handleCommit}
                  onSelectionChange={setLive}
                  selectedIndexes={sel?.indexes ?? []}
                  logoUrl={detail.logoUrl}
                  pendingBuy={pendingBuy}
                  pendingSell={pendingSell}
                />
                {/* 드래그 중 실시간 HUD — 중립 다크 칩(로고색 무관). 매수/매도=시맨틱색 단어 */}
                {live && live.indexes.length > 0 && (
                  <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
                    <div className="flex items-center gap-1.5 rounded-full bg-[#0f172a]/90 px-3.5 py-1.5 text-sm font-bold text-white shadow-lg backdrop-blur-sm">
                      <span className={live.mode === "buy" ? "text-up" : "text-down"}>
                        {live.mode === "buy" ? "매수" : "매도"}
                      </span>
                      <span>{live.indexes.length}조각</span>
                      <span className="opacity-40">·</span>
                      <span className="font-numeric">
                        {fmtAmount(perPiece.times(live.indexes.length).toString())}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {/* 보유 / 1주 완성까지 — 퍼즐 바로 아래 캡션(테두리 없음) */}
              <div className="mt-3 flex flex-col gap-2.5 border-t border-border pt-3">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">내 보유</span>
                  <span className="font-numeric font-bold text-foreground">
                    {bojuText}
                    <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                      {fmtAmount(evalAmount.toString())}
                    </span>
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">1주 완성까지</span>
                  <span className="font-numeric font-bold text-foreground">
                    {PIECES_PER_SHARE - pieces}조각
                    <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                      ≈ {fmtAmount(remainAmount.toString())}
                    </span>
                  </span>
                </div>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block size-2 rounded-full bg-primary" />
                빈 조각 탭 → 매수 · 채운 조각 탭 → 매도
              </p>
            </section>

          </>
        ) : (
          <>
            {/* 히어로 — 내 평가금액 + 손익 */}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                내 평가금액
              </p>
              <AmountDisplay
                value={evalAmount.toString()}
                currency={isUSD ? "USD" : "KRW"}
                size="xl"
                className="mt-0.5 block font-bold"
              />
              <ChangeIndicator
                value={profit.toNumber()}
                suffix={isUSD ? "" : "원"}
                prefix={isUSD ? "$" : ""}
                subPercent={rate.toNumber()}
                size="md"
                className="mt-1"
              />
            </div>

            {/* 보유 / 현재가 */}
            <div className="flex flex-col gap-2.5 border-t border-border pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">보유</span>
                <span className="font-numeric font-bold text-foreground">
                  {bojuText}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">현재가</span>
                <span className="flex items-center gap-1.5">
                  <AmountDisplay
                    value={price.toString()}
                    currency={isUSD ? "USD" : "KRW"}
                    size="sm"
                    className="font-bold"
                  />
                  <ChangeIndicator
                    value={detail.price?.changeRate ?? 0}
                    percent
                    size="sm"
                  />
                </span>
              </div>
            </div>

            {/* 이 종목 모으는 법 — 있으면 현황, 없으면 유도 */}
            <section className="space-y-2.5">
              <h2 className="text-base font-bold text-foreground">
                {anyFacetActive
                  ? "이 종목, 이렇게 모아요"
                  : "이 종목, 이렇게도 모아요"}
              </h2>
              <FacetCard
                icon={<MiniPuzzle active={pieces > 0} />}
                title="조각 모으기"
                active={pieces > 0}
                subtitle={
                  pieces > 0
                    ? `${pieces} / ${PIECES_PER_SHARE} 조각 · 1주까지 ${PIECES_PER_SHARE - pieces}조각`
                    : "소수점으로 한 조각씩 담아보세요"
                }
                cta={pieces > 0 ? null : "담기"}
                onClick={() =>
                  router.push(portfolioDetailPath(stockCode, { view: "pieces" }))
                }
              />
              <FacetCard
                icon={<MiniCoins active={auto.id !== null} />}
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
              {canConvert && (
                <FacetCard
                  icon={<Layers className="size-6 text-primary" />}
                  title="온주로 전환"
                  subtitle={`신탁 소수 ${formatShares(fractionalQtyD)}주 중 ${fractionalQtyD
                    .floor()
                    .toString()}주를 온주로`}
                  cta={convert.isPending ? "전환 중" : "전환"}
                  onClick={handleConvertClick}
                />
              )}
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
                        {format(new Date(c.convertedAt), "yyyy.MM.dd")}
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

        {/* 모으기 내역 (회차) — 자동모으기 종목만 노출. 공통 */}
        {auto.id !== null && (
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
                          {a.gt(0) ? fmtAmount(a.toString()) : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 최근 내역 — collect 뷰에선 모으기 내역(회차)이 대신 */}
        {!isCollect && (
        <section>
          <h2 className="mb-3 text-base font-bold text-foreground">최근 내역</h2>
          {recentOrders.length === 0 ? (
            <EmptyState title="최근 내역이 없어요" className="py-6" />
          ) : (
            <div className="divide-y divide-border">
              {recentOrders.map((o) => {
                const orderQty = toDecimal(o.quantity);
                const orderPrice = toDecimal(o.price);
                const estimated = !orderPrice.gt(0);
                const amt = (estimated ? price : orderPrice).times(orderQty);
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
                        {format(new Date(o.createdAt), "yyyy.MM.dd")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="font-numeric text-sm font-bold text-foreground">
                          {formatShares(orderQty)}주
                        </p>
                        <p className="font-numeric text-xs text-muted-foreground">
                          {amt.gt(0) ? fmtAmount(amt.toString()) : "—"}
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

      {/* 전체(현황) 뷰 — 하단 탭바 위 매수·매도 액션바 */}
      {!isPieces && !isCollect && (
        <div className="fixed bottom-16 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-background px-5 pb-[env(safe-area-inset-bottom)] pt-3">
          <div className="flex gap-2.5 pb-3">
            <Button
              onClick={() => router.push(tradingDetailPath(stockCode))}
              className="h-12 flex-1 bg-up text-base font-bold text-white hover:bg-up/90"
            >
              매수
            </Button>
            <Button
              onClick={() => router.push(tradingDetailPath(stockCode))}
              className="h-12 flex-1 bg-down text-base font-bold text-white hover:bg-down/90"
            >
              매도
            </Button>
          </div>
        </div>
      )}

      <PuzzleOrderSheet
        open={!!sel}
        onClose={() => setSel(null)}
        mode={sel?.mode ?? "buy"}
        stockName={detail.stockName}
        pieces={selPieces}
        currentFilled={pieces}
        total={PIECES_PER_SHARE}
        amount={orderAmount.toNumber()}
        perPieceAmount={perPiece.toNumber()}
        formatAmount={fmtAmount}
        onConfirm={handleConfirm}
        pending={ordering}
      />

      <TxnAuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onVerified={handleConfirm}
      />
    </>
  );
}
