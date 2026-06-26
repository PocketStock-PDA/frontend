"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { AppHeader } from "@/components/common/AppHeader";
import { Stepper } from "@/components/common/Stepper";
import { WheelPickerSheet } from "@/components/common/WheelPickerSheet";
import type { WheelPickerOption } from "@/components/common/WheelPicker";
import { AmountInput } from "@/components/common/AmountInput";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ConditionBuySheet,
  ConditionSellSheet,
} from "@/components/features/trading/ConditionSheets";
import { useStockDetail } from "@/hooks/queries/useStockDetail";
import { useHoldings } from "@/hooks/queries/useHoldings";
import { useCmaHome } from "@/hooks/queries/useCmaHome";
import { useAutoInvest } from "@/hooks/queries/useAutoInvest";
import {
  useRemoveAutoInvest,
  useSaveAutoInvest,
} from "@/hooks/mutations/useSaveAutoInvest";
import { formatKRW } from "@/lib/utils/currency";
import { toDecimal } from "@/lib/utils/decimal";
import { cn } from "@/lib/utils";
import {
  defaultSetting,
  type AmountMode,
  type AutoInvestFrequency,
  type AutoInvestSetting,
  type BuyCondition,
  type SellCondition,
  type Weekday,
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
const AMOUNT_MODE_OPTIONS: { label: string; value: AmountMode }[] = [
  { label: "금액으로", value: "AMOUNT" },
  { label: "수량으로", value: "QTY" },
];
// 휠 피커 옵션 — 요일(월~금)·날짜(1~31일)
const WEEKDAY_OPTIONS: WheelPickerOption<Weekday>[] = [
  { label: "월요일", value: "MON" },
  { label: "화요일", value: "TUE" },
  { label: "수요일", value: "WED" },
  { label: "목요일", value: "THU" },
  { label: "금요일", value: "FRI" },
];
const DAY_OPTIONS: WheelPickerOption<number>[] = Array.from(
  { length: 31 },
  (_, i) => ({ label: `${i + 1}일`, value: i + 1 }),
);

export default function AutoInvestPage() {
  const searchParams = useSearchParams();
  const stockCode = searchParams.get("stockCode");

  if (!stockCode) {
    return <MissingStockCodeState />;
  }

  return <AutoInvestContent stockCode={stockCode} />;
}

function MissingStockCodeState() {
  const router = useRouter();

  return (
    <>
      <AppHeader variant="sub" title="자동모으기" />
      <EmptyState
        title="종목 정보가 없어요"
        description="자동모으기를 설정할 종목을 다시 선택해 주세요."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/trading/search")}
          >
            종목 선택
          </Button>
        }
        className="mt-8"
      />
    </>
  );
}

function AutoInvestContent({ stockCode }: { stockCode: string }) {
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
      currency={detailQ.data.currency}
      currentPrice={detailQ.data.price?.currentPrice ?? 0}
      initial={autoQ.setting ?? defaultSetting(stockCode)}
      settingId={autoQ.id}
      buyTriggerId={autoQ.buyTriggerId}
      sellTriggerId={autoQ.sellTriggerId}
    />
  );
}

function AutoInvestForm({
  stockCode,
  stockName,
  currency,
  currentPrice,
  initial,
  settingId,
  buyTriggerId,
  sellTriggerId,
}: {
  stockCode: string;
  stockName: string;
  currency: string;
  currentPrice: number;
  initial: AutoInvestSetting;
  settingId: number | null;
  buyTriggerId: number | null;
  sellTriggerId: number | null;
}) {
  const router = useRouter();
  const holdingsQ = useHoldings();
  const cmaQ = useCmaHome();
  const save = useSaveAutoInvest(stockCode);
  const remove = useRemoveAutoInvest();

  const [showRemove, setShowRemove] = useState(false);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [frequency, setFrequency] = useState(initial.frequency);
  const [weekdays, setWeekdays] = useState(initial.weekdays);
  const [dayOfMonth, setDayOfMonth] = useState(initial.dayOfMonth);
  const [amountMode, setAmountMode] = useState<AmountMode>(initial.amountMode);
  const [amount, setAmount] = useState(initial.amount);
  const [quantity, setQuantity] = useState(initial.quantity);
  const [buyCondition, setBuyCondition] = useState<BuyCondition>(initial.buyCondition);
  const [sellCondition, setSellCondition] = useState<SellCondition>(initial.sellCondition);
  const [showBuy, setShowBuy] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [showWeekday, setShowWeekday] = useState(false);
  const [showDay, setShowDay] = useState(false);

  const isUSD = currency === "USD";
  // 모으기도 일반 주문과 동일한 최소주문금액(국내 1,000원 / 해외 $1)
  const minOrder = isUSD ? 1 : 1000;
  const minOrderText = isUSD ? `$${minOrder}` : `${minOrder.toLocaleString("ko-KR")}원`;
  // 신규(모으기 시작) vs 기존(관리) — CTA·헤딩·토글 분기
  const isNew = settingId === null;
  const hasAmount = amountMode === "AMOUNT" ? amount > 0 : quantity > 0;
  const price = toDecimal(currentPrice);
  const holding = holdingsQ.data?.find((h) => h.stockCode === stockCode);
  const avgPrice = holding ? holding.avgBuyPrice : currentPrice;
  const buyingPower = cmaQ.data?.cmaBalance?.KRW ?? 0;
  const maxBuyQty = price.gt(0)
    ? new Decimal(buyingPower).div(price).floor().toNumber()
    : 0;

  const summary =
    amountMode === "QTY"
      ? `${FREQ_LABEL[frequency]} ${quantity}주씩`
      : `${FREQ_LABEL[frequency]} ${formatKRW(amount)}씩`;

  const handleSave = () => {
    if (save.isPending) return;
    // 모으기 최소금액 검증 — 백엔드와 동일 기준(금액 모드만, 국내 1,000원 / 해외 $1)
    if (amountMode === "AMOUNT" && amount < minOrder) {
      toast.warning(`모으기 금액은 최소 ${minOrderText} 이상이에요`);
      return;
    }
    if (amountMode === "QTY" && quantity <= 0) {
      toast.warning("모으기 수량을 입력해 주세요");
      return;
    }
    const form: AutoInvestSetting = {
      stockCode,
      enabled: isNew ? true : enabled, // 신규는 "모으기" = 시작이므로 활성
      frequency,
      weekdays,
      dayOfMonth,
      amountMode,
      amount,
      quantity,
      buyCondition,
      sellCondition,
    };
    save.mutate(
      { form, id: settingId, buyTriggerId, sellTriggerId },
      {
        onSuccess: () => {
          toast.success(isNew ? "모으기를 시작했어요" : "설정을 저장했어요");
          if (isNew) router.back();
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError
              ? err.message
              : "저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
          ),
      },
    );
  };

  const handleRemove = () => {
    if (settingId === null || remove.isPending) return;
    remove.mutate(settingId, {
      onSuccess: () => {
        setShowRemove(false);
        toast.success("자동모으기를 해제했어요");
        router.back();
      },
      onError: (err) =>
        toast.error(
          err instanceof ApiError
            ? err.message
            : "해제에 실패했어요. 잠시 후 다시 시도해 주세요.",
        ),
    });
  };

  return (
    <>
      <AppHeader variant="sub" title={stockName} />

      <div className="space-y-6 pb-4">
        {/* 헤딩 — 시작(모을까요?) vs 관리(모으는 중) */}
        <div className="space-y-1">
          {hasAmount && (
            <p className="text-base font-bold text-primary">{summary}</p>
          )}
          <p className="text-xl font-bold text-foreground">
            {isNew ? "모을까요?" : "모으는 중이에요"}
          </p>
        </div>

        {/* 기존 설정만: 일시중지/재개 토글 */}
        {!isNew && (
          <label className="flex items-center justify-between rounded-xl border border-border px-4 py-3.5">
            <span className="text-base font-bold text-foreground">자동모으기</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </label>
        )}

        <div
          className={cn(
            "space-y-6",
            !isNew && !enabled && "pointer-events-none opacity-50",
          )}
        >
          {/* 주기 */}
          <SegmentedControl
            options={FREQ_OPTIONS}
            value={frequency}
            onChange={(v) => {
              setFrequency(v);
              // 주1회 전환 시 요일을 1개로 정규화(중복 방지)
              if (v === "WEEKLY" && weekdays.length !== 1) {
                setWeekdays([weekdays[0] ?? "MON"]);
              }
            }}
          />

          {/* 요일 선택 (주1회일 때만 · 백엔드 지원 = 월~금) */}
          {frequency === "WEEKLY" && (
            <button
              type="button"
              onClick={() => setShowWeekday(true)}
              className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3.5 text-left"
            >
              <span className="text-sm font-bold text-foreground">
                매주{" "}
                {WEEKDAY_OPTIONS.find((o) => o.value === weekdays[0])?.label ??
                  "월요일"}
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          )}

          {/* 날짜 선택 (월1회일 때만) */}
          {frequency === "MONTHLY" && (
            <button
              type="button"
              onClick={() => setShowDay(true)}
              className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3.5 text-left"
            >
              <span className="text-sm font-bold text-foreground">
                매월 {dayOfMonth}일
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          )}

          {/* 매수 금액/수량 (정기적립은 소수점 배치) */}
          <section className="space-y-3">
            <SegmentedControl
              options={AMOUNT_MODE_OPTIONS}
              value={amountMode}
              onChange={setAmountMode}
            />
            <div className="rounded-2xl bg-muted/50 p-4">
              {amountMode === "AMOUNT" ? (
                <AmountInput
                  value={amount}
                  onChange={setAmount}
                  suffix={isUSD ? "$" : "원"}
                  placeholder="모으기 금액"
                />
              ) : (
                <Stepper
                  value={quantity}
                  onChange={setQuantity}
                  step={0.1}
                  min={0}
                  precision={4}
                  suffix="주"
                  editable
                />
              )}
            </div>

            {amountMode === "AMOUNT" && (
              <p className="px-1 text-xs text-muted-foreground">
                최소 {minOrderText}부터 모을 수 있어요
              </p>
            )}

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

          {/* 조건 카드 (물타기/익절 → 트리거) */}
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

        <div className="space-y-2">
          <Button
            onClick={handleSave}
            disabled={save.isPending}
            className="h-12 w-full text-base font-bold"
          >
            {save.isPending
              ? isNew
                ? "시작하는 중…"
                : "저장 중…"
              : isNew
                ? "모으기"
                : "변경 저장"}
          </Button>
          {isNew && (
            <p className="text-center text-xs text-muted-foreground">
              부족한 금액은 충전계좌에서 자동으로 충전돼요
            </p>
          )}
        </div>

        {/* 완전 해제 — 등록된 종목만. 일시중지(토글)와 분리한 파괴적 동작 */}
        {settingId !== null && (
          <button
            type="button"
            onClick={() => setShowRemove(true)}
            className="mx-auto block px-4 py-2 text-sm font-medium text-destructive"
          >
            자동모으기 해제
          </button>
        )}
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

      {/* 모을 요일/날짜 — 휠 피커 바텀시트 */}
      <WheelPickerSheet
        open={showWeekday}
        onOpenChange={setShowWeekday}
        title="모을 요일을 선택해주세요"
        options={WEEKDAY_OPTIONS}
        value={weekdays[0] ?? "MON"}
        onConfirm={(v) => setWeekdays([v])}
      />
      <WheelPickerSheet
        open={showDay}
        onOpenChange={setShowDay}
        title="모을 날짜를 선택해주세요"
        options={DAY_OPTIONS}
        value={dayOfMonth}
        onConfirm={setDayOfMonth}
      />

      {/* 해제 확인 — pause(토글)와 명확히 구분하는 마이크로카피 */}
      <Sheet open={showRemove} onOpenChange={setShowRemove}>
        <SheetContent side="bottom" className="gap-0 rounded-t-2xl px-5 pb-8 pt-3">
          <SheetHeader className="p-0 pb-2 text-left">
            <SheetTitle className="text-lg font-bold">
              자동모으기를 해제할까요?
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {stockName} 설정과 조건(물타기·익절), 모으기 내역이 모두 삭제돼요.
              잠시 멈추려는 거라면 해제 대신 모으기를 꺼두세요.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-5 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRemove(false)}
              className="h-12 flex-1 text-base font-bold"
            >
              취소
            </Button>
            <Button
              onClick={handleRemove}
              disabled={remove.isPending}
              className="h-12 flex-1 bg-destructive text-base font-bold text-white hover:bg-destructive/90"
            >
              {remove.isPending ? "해제 중…" : "해제"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
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
