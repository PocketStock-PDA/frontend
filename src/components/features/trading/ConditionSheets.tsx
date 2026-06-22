"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/common/AmountInput";
import { Stepper } from "@/components/common/Stepper";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type {
  AmountMode,
  BuyCondition,
  SellCondition,
} from "@/types/domain/autoInvest";

/** 작은 인라인 정수 스테퍼 (수익률 % 조정) */
function RateStepper({
  value,
  onChange,
  min = 1,
  prefix = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  prefix?: string;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border px-1.5 py-1">
      <button
        type="button"
        aria-label="감소"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex size-6 items-center justify-center text-muted-foreground"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-12 text-center font-numeric text-sm font-bold tabular-nums">
        {prefix}
        {value}%
      </span>
      <button
        type="button"
        aria-label="증가"
        onClick={() => onChange(value + 1)}
        className="flex size-6 items-center justify-center text-muted-foreground"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function ModeToggle<T extends string>({
  left,
  right,
  value,
  onChange,
}: {
  left: { label: string; value: T };
  right: { label: string; value: T };
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg bg-muted p-1">
      {[left, right].map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
            value === o.value
              ? "bg-background text-primary shadow-sm"
              : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── 조건 모으기 (수익률 하락 시 매수) ──────────────────────────────────────────

export interface ConditionBuySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockName: string;
  currentPrice: number;
  /** 평단가 (없으면 현재가) */
  avgPrice: number;
  value: BuyCondition;
  onApply: (c: BuyCondition) => void;
}

export function ConditionBuySheet({
  open,
  onOpenChange,
  stockName,
  currentPrice,
  avgPrice,
  value,
  onApply,
}: ConditionBuySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="gap-0 rounded-t-2xl px-5 pb-8 pt-3"
        aria-describedby={undefined}
      >
        <SheetHeader className="p-0 pb-3">
          <span className="text-xs text-muted-foreground">{stockName}</span>
          <SheetTitle className="text-lg font-bold">어떻게 모을까요?</SheetTitle>
        </SheetHeader>
        {open && (
          <BuyForm
            currentPrice={currentPrice}
            avgPrice={avgPrice}
            value={value}
            onApply={(c) => {
              onApply(c);
              onOpenChange(false);
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function BuyForm({
  currentPrice,
  avgPrice,
  value,
  onApply,
}: {
  currentPrice: number;
  avgPrice: number;
  value: BuyCondition;
  onApply: (c: BuyCondition) => void;
}) {
  const [dropRate, setDropRate] = useState(value.dropRate);
  const [mode, setMode] = useState<AmountMode>(value.mode);
  const [amount, setAmount] = useState(value.amount);
  const [quantity, setQuantity] = useState(value.quantity);

  const profitRate =
    avgPrice > 0 ? ((currentPrice / avgPrice - 1) * 100).toFixed(2) : "0.00";
  const target = Math.round(avgPrice * (1 - dropRate / 100));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        현재가{" "}
        <span className="font-numeric font-bold text-foreground">
          {formatKRW(currentPrice)}
        </span>{" "}
        · 내 수익률{" "}
        <span className="font-numeric font-bold text-up">+{profitRate}%</span>
      </p>

      <div className="space-y-1.5 rounded-xl bg-muted/60 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            내 수익률 -{dropRate}% 이하일 때
          </span>
          <RateStepper value={dropRate} onChange={setDropRate} prefix="-" />
        </div>
        <p className="text-xs text-muted-foreground">
          예상 감지가 {formatKRW(target)} 이하일 때
        </p>
      </div>

      <ModeToggle<AmountMode>
        left={{ label: "금액으로", value: "AMOUNT" }}
        right={{ label: "수량으로", value: "QTY" }}
        value={mode}
        onChange={setMode}
      />
      {mode === "AMOUNT" ? (
        <AmountInput value={amount} onChange={setAmount} placeholder="모으기 금액" />
      ) : (
        <Stepper
          value={quantity}
          onChange={setQuantity}
          step={1}
          min={1}
          suffix="주"
          editable
        />
      )}

      <Button
        onClick={() =>
          onApply({ enabled: true, dropRate, mode, amount, quantity })
        }
        className="h-12 w-full bg-up text-base font-bold text-white hover:bg-up/90"
      >
        모으기
      </Button>
    </div>
  );
}

// ── 조건 팔기 (수익률 상승 시 매도) ────────────────────────────────────────────

const SELL_RATIOS = [10, 25, 50, 100];

export interface ConditionSellSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockName: string;
  currentPrice: number;
  avgPrice: number;
  value: SellCondition;
  onApply: (c: SellCondition) => void;
}

export function ConditionSellSheet({
  open,
  onOpenChange,
  stockName,
  currentPrice,
  avgPrice,
  value,
  onApply,
}: ConditionSellSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="gap-0 rounded-t-2xl px-5 pb-8 pt-3"
        aria-describedby={undefined}
      >
        <SheetHeader className="p-0 pb-3">
          <span className="text-xs text-muted-foreground">{stockName}</span>
          <SheetTitle className="text-lg font-bold">어떻게 팔까요?</SheetTitle>
        </SheetHeader>
        {open && (
          <SellForm
            currentPrice={currentPrice}
            avgPrice={avgPrice}
            value={value}
            onApply={(c) => {
              onApply(c);
              onOpenChange(false);
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function SellForm({
  currentPrice,
  avgPrice,
  value,
  onApply,
}: {
  currentPrice: number;
  avgPrice: number;
  value: SellCondition;
  onApply: (c: SellCondition) => void;
}) {
  const [riseRate, setRiseRate] = useState(value.riseRate);
  const [mode, setMode] = useState<SellCondition["mode"]>(value.mode);
  const [ratioPct, setRatioPct] = useState(value.ratioPct);
  const [quantity, setQuantity] = useState(value.quantity);

  const profitRate =
    avgPrice > 0 ? ((currentPrice / avgPrice - 1) * 100).toFixed(2) : "0.00";
  const target = Math.round(avgPrice * (1 + riseRate / 100));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        현재가{" "}
        <span className="font-numeric font-bold text-foreground">
          {formatKRW(currentPrice)}
        </span>{" "}
        · 내 수익률{" "}
        <span className="font-numeric font-bold text-up">+{profitRate}%</span>
      </p>

      <div className="space-y-1.5 rounded-xl bg-muted/60 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            내 수익률 +{riseRate}% 이상일 때
          </span>
          <RateStepper value={riseRate} onChange={setRiseRate} prefix="+" />
        </div>
        <p className="text-xs text-muted-foreground">
          예상 감지가 {formatKRW(target)} 이상일 때
        </p>
      </div>

      <ModeToggle<SellCondition["mode"]>
        left={{ label: "비율로", value: "RATIO" }}
        right={{ label: "수량으로", value: "QTY" }}
        value={mode}
        onChange={setMode}
      />
      {mode === "RATIO" ? (
        <div className="flex gap-2">
          {SELL_RATIOS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRatioPct(r)}
              className={cn(
                "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
                ratioPct === r
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:bg-muted",
              )}
            >
              {r === 100 ? "전체" : `${r}%`}
            </button>
          ))}
        </div>
      ) : (
        <Stepper
          value={quantity}
          onChange={setQuantity}
          step={1}
          min={1}
          suffix="주"
          editable
        />
      )}

      <Button
        onClick={() =>
          onApply({ enabled: true, riseRate, mode, ratioPct, quantity })
        }
        className="h-12 w-full bg-down text-base font-bold text-white hover:bg-down/90"
      >
        목표 수익률에 팔기
      </Button>
    </div>
  );
}
