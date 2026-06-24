"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { AppHeader } from "@/components/common/AppHeader";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { Stepper } from "@/components/common/Stepper";
import { WeekdayPicker } from "@/components/common/WeekdayPicker";
import { AmountInput } from "@/components/common/AmountInput";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  ConditionBuySheet,
  ConditionSellSheet,
} from "@/components/features/trading/ConditionSheets";
import { useStockDetail } from "@/hooks/queries/useStockDetail";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useCmaHome } from "@/hooks/queries/useCmaHome";
import { useAutoInvest } from "@/hooks/queries/useAutoInvest";
import { useSaveAutoInvest } from "@/hooks/mutations/useSaveAutoInvest";
import { formatKRW } from "@/lib/utils/currency";
import { toDecimal } from "@/lib/utils/decimal";
import { cn } from "@/lib/utils";
import type {
  AmountMode,
  AutoInvestFrequency,
  AutoInvestSetting,
  BuyCondition,
  OrderMethod,
  SellCondition,
} from "@/types/domain/autoInvest";

const FREQ_OPTIONS: { label: string; value: AutoInvestFrequency }[] = [
  { label: "매일", value: "DAILY" },
  { label: "주1회", value: "WEEKLY" },
  { label: "월1회", value: "MONTHLY" },
];
const FREQ_LABEL: Record<AutoInvestFrequency, string> = {
  DAILY: "매일",
  WEEKLY: "주1회",
  MONTHLY: "월1회",
};
const AMOUNT_CHIPS = [1000, 5000, 10000];
const QTY_CHIPS = [1, 5, 10];

function defaultSetting(stockCode: string): AutoInvestSetting {
  return {
    stockCode,
    enabled: true,
    frequency: "DAILY",
    weekdays: ["MON"],
    dayOfMonth: 1,
    method: "FRACTION",
    amountMode: "AMOUNT",
    amount: 10000,
    quantity: 1,
    autoCharge: true,
    executeTime: "08:00",
    buyCondition: { enabled: false, dropRate: 5, mode: "AMOUNT", amount: 10000, quantity: 1 },
    sellCondition: { enabled: false, riseRate: 15, mode: "RATIO", ratioPct: 50, quantity: 1 },
  };
}

export default function AutoInvestPage() {
  const { stockCode } = useParams<{ stockCode: string }>();
  const detailQ = useStockDetail(stockCode);
  const autoQ = useAutoInvest(stockCode);

  if (detailQ.isLoading || autoQ.isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={1} className="h-10 border-0 bg-transparent p-0" />
        <SkeletonCard lines={2} className="h-20" />
        <SkeletonCard lines={5} className="h-72" />
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

  return (
    <AutoInvestForm
      stockCode={stockCode}
      stockName={detailQ.data.stockName}
      currentPrice={detailQ.data.price?.currentPrice ?? 0}
      initial={autoQ.data ?? defaultSetting(stockCode)}
    />
  );
}

function AutoInvestForm({
  stockCode,
  stockName,
  currentPrice,
  initial,
}: {
  stockCode: string;
  stockName: string;
  currentPrice: number;
  initial: AutoInvestSetting;
}) {
  const holdingsQ = useHoldings();
  const cmaQ = useCmaHome();
  const save = useSaveAutoInvest(stockCode);

  const [enabled, setEnabled] = useState(initial.enabled);
  const [frequency, setFrequency] = useState(initial.frequency);
  const [weekdays, setWeekdays] = useState(initial.weekdays);
  const [dayOfMonth, setDayOfMonth] = useState(initial.dayOfMonth);
  const [method, setMethod] = useState<OrderMethod>(initial.method);
  const [amountMode, setAmountMode] = useState<AmountMode>(initial.amountMode);
  const [amount, setAmount] = useState(initial.amount);
  const [quantity, setQuantity] = useState(initial.quantity);
  const [autoCharge, setAutoCharge] = useState(initial.autoCharge);
  const [executeTime, setExecuteTime] = useState(initial.executeTime);
  const [buyCondition, setBuyCondition] = useState<BuyCondition>(initial.buyCondition);
  const [sellCondition, setSellCondition] = useState<SellCondition>(initial.sellCondition);
  const [showBuy, setShowBuy] = useState(false);
  const [showSell, setShowSell] = useState(false);

  const price = toDecimal(currentPrice);
  const holding = holdingsQ.data?.find((h) => h.stockCode === stockCode);
  const avgPrice = holding ? holding.avgBuyPrice : currentPrice;
  const buyingPower = cmaQ.data?.cmaBalance?.KRW ?? 0;
  const maxBuyQty = price.gt(0)
    ? new Decimal(buyingPower).div(price).floor().toNumber()
    : 0;

  // 온주는 수량만 가능 → 금액 선택 시 소수점으로 전환
  const changeMethod = (m: OrderMethod) => {
    setMethod(m);
    if (m === "WHOLE") setAmountMode("QTY");
  };
  const changeAmountMode = (im: AmountMode) => {
    if (im === "AMOUNT" && method === "WHOLE") setMethod("FRACTION");
    setAmountMode(im);
  };

  const summary =
    amountMode === "QTY"
      ? `${FREQ_LABEL[frequency]} ${quantity}주씩`
      : `${FREQ_LABEL[frequency]} ${formatKRW(amount)}씩`;

  const handleSave = () => {
    if (save.isPending) return;
    save.mutate(
      {
        enabled,
        frequency,
        weekdays,
        dayOfMonth,
        method,
        amountMode,
        amount,
        quantity,
        autoCharge,
        executeTime,
        buyCondition,
        sellCondition,
      },
      {
        onSuccess: () => toast.success("자동모으기 설정을 저장했어요"),
        onError: (err) =>
          toast.error(
            err instanceof ApiError
              ? err.message
              : "저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
          ),
      },
    );
  };

  return (
    <>
      <AppHeader
        variant="sub"
        title={
          <span className="flex flex-col leading-tight">
            <span className="text-xs text-muted-foreground">{stockName}</span>
            <span className="text-[18px] font-bold text-foreground">{summary}</span>
          </span>
        }
      />

      <div className="space-y-6 pb-4">
        {/* 자동모으기 마스터 토글 */}
        <label className="flex items-center justify-between rounded-xl border border-border px-4 py-3.5">
          <span className="text-base font-bold text-foreground">자동모으기</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </label>

        <div className={cn("space-y-6", !enabled && "pointer-events-none opacity-50")}>
          {/* 주기 (파랑/회색 pill) */}
          <div className="flex gap-2">
            {FREQ_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setFrequency(o.value);
                  // 주1회 전환 시 요일을 1개로 정규화(중복 방지)
                  if (o.value === "WEEKLY" && weekdays.length !== 1) {
                    setWeekdays([weekdays[0] ?? "MON"]);
                  }
                }}
                className={cn(
                  "h-11 flex-1 rounded-lg text-sm font-bold transition-colors",
                  frequency === o.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* 요일 선택 (주1회일 때만) */}
          {frequency === "WEEKLY" && (
            <section className="space-y-2">
              <p className="text-sm text-muted-foreground">요일 선택</p>
              <WeekdayPicker value={weekdays} onChange={setWeekdays} single />
            </section>
          )}

          {/* 날짜 선택 (월1회일 때만) */}
          {frequency === "MONTHLY" && (
            <section className="space-y-2">
              <p className="text-sm text-muted-foreground">날짜 선택</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">매월</span>
                <select
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  aria-label="실행 일자"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-foreground">일</span>
              </div>
            </section>
          )}

          {/* 매수 방식·금액/수량 */}
          <section className="space-y-3">
            {/* 소수점/온주 — 수량으로일 때만 */}
            {amountMode === "QTY" && (
              <SegmentedControl<OrderMethod>
                options={[
                  { label: "소수점", value: "FRACTION" },
                  { label: "온주", value: "WHOLE" },
                ]}
                value={method}
                onChange={changeMethod}
              />
            )}

            <div className="space-y-3 rounded-2xl bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <button
                  type="button"
                  onClick={() => changeAmountMode("QTY")}
                  className={amountMode === "QTY" ? "text-foreground" : "text-muted-foreground"}
                >
                  수량으로
                </button>
                <span className="text-border">|</span>
                <button
                  type="button"
                  onClick={() => changeAmountMode("AMOUNT")}
                  className={amountMode === "AMOUNT" ? "text-foreground" : "text-muted-foreground"}
                >
                  금액으로
                </button>
              </div>
              {amountMode === "AMOUNT" ? (
                <AmountInput value={amount} onChange={setAmount} placeholder="모으기 금액" />
              ) : (
                <Stepper
                  value={quantity}
                  onChange={setQuantity}
                  step={method === "WHOLE" ? 1 : 0.1}
                  min={method === "WHOLE" ? 1 : 0}
                  precision={method === "WHOLE" ? 0 : 4}
                  suffix="주"
                  editable
                />
              )}
            </div>

            {/* 빠른 칩 (카드 밖) */}
            {amountMode === "AMOUNT" ? (
              <div className="flex gap-2">
                {AMOUNT_CHIPS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAmount((a) => a + n)}
                    className="flex-1 rounded-lg border border-border bg-background py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    +{n.toLocaleString("ko-KR")}원
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmount(buyingPower)}
                  className="flex-1 rounded-lg border border-border bg-background py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  최대
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                {QTY_CHIPS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQuantity((q) => q + n)}
                    className="flex-1 rounded-lg border border-border bg-background py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    +{n}주
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setQuantity(maxBuyQty)}
                  className="flex-1 rounded-lg border border-border bg-background py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  최대
                </button>
              </div>
            )}
          </section>

          {/* 실행 시간 */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm font-medium text-foreground">실행 시간</span>
            <input
              type="time"
              value={executeTime}
              onChange={(e) => setExecuteTime(e.target.value)}
              aria-label="실행 시간"
              className="rounded-md bg-transparent text-right font-numeric text-sm font-bold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>

          {/* 부족금액 자동충전 */}
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">부족금액 자동충전</span>
            <Switch checked={autoCharge} onCheckedChange={setAutoCharge} />
          </label>

          {/* 조건 카드 */}
          <div className="space-y-2">
            <ConditionCard
              title="평단가 낮추면서 원할때만"
              subtitle={
                buyCondition.enabled
                  ? `수익률 -${buyCondition.dropRate}% 이하 매수`
                  : "수익률 하락 시 매수"
              }
              action="조건 모으기"
              active={buyCondition.enabled}
              onClick={() => setShowBuy(true)}
            />
            <ConditionCard
              title="목표 수익률에 팔고 돈 벌기"
              subtitle={
                sellCondition.enabled
                  ? `수익률 +${sellCondition.riseRate}% 이상 매도`
                  : "수익률 상승 시 매도"
              }
              action="조건 팔기"
              active={sellCondition.enabled}
              onClick={() => setShowSell(true)}
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={save.isPending}
          className="h-12 w-full text-base font-bold"
        >
          {save.isPending ? "저장 중..." : "설정 저장"}
        </Button>
      </div>

      <ConditionBuySheet
        open={showBuy}
        onOpenChange={setShowBuy}
        stockName={stockName}
        currentPrice={currentPrice}
        avgPrice={avgPrice}
        value={buyCondition}
        onApply={setBuyCondition}
      />
      <ConditionSellSheet
        open={showSell}
        onOpenChange={setShowSell}
        stockName={stockName}
        currentPrice={currentPrice}
        avgPrice={avgPrice}
        value={sellCondition}
        onApply={setSellCondition}
      />
    </>
  );
}

function ConditionCard({
  title,
  subtitle,
  action,
  active,
  onClick,
}: {
  title: string;
  subtitle: string;
  action: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-primary">
        {action}
        <ChevronRight className="size-4" />
      </span>
    </button>
  );
}
