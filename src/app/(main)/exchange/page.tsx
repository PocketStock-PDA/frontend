"use client";

import { useState } from "react";
import { ArrowLeftRight, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/common/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PinKeypad } from "@/components/common/PinKeypad";
import { ApiError } from "@/lib/api/client";
import { useExchangeRate } from "@/hooks/queries/useExchangeRate";
import { useKrwToUsd } from "@/hooks/mutations/useKrwToUsd";
import { useUsdToKrw } from "@/hooks/mutations/useUsdToKrw";
import { useTxnAuth } from "@/hooks/mutations/useTxnAuth";
import { useCmaHome } from "@/hooks/queries/useCmaHome";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtRate(v: number) {
  return v.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtUSD(v: number) {
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtKRW(v: number) {
  return v.toLocaleString("ko-KR");
}

function parseTime(updatedAt: string) {
  try {
    const d = new Date(updatedAt);
    if (!isNaN(d.getTime()))
      return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
    return updatedAt.slice(0, 5);
  } catch {
    return updatedAt;
  }
}

type Direction = "krw-to-usd" | "usd-to-krw";
type Step = "direction" | Direction | "pin";

// ── 방향 선택 단계 ────────────────────────────────────────────────────────────

function DirectionStep({
  krwBalance,
  usdBalance,
  buyRate,
  sellRate,
  onSelect,
}: {
  krwBalance: number;
  usdBalance: number;
  buyRate: number;
  sellRate: number;
  onSelect: (dir: Direction) => void;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onSelect("krw-to-usd")}
        className="group flex w-full items-center justify-between rounded-2xl border-2 border-border bg-card px-4 py-4 transition-colors hover:border-primary/40 hover:bg-primary/5 active:bg-primary/10"
      >
        <div className="text-left">
          <p className="mb-0.5 text-[11px] font-semibold text-muted-foreground">원화 → 달러</p>
          <p className="text-xl font-bold text-foreground">{fmtKRW(krwBalance)}원</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            살 때 {fmtRate(buyRate)}원 / $1
          </p>
        </div>
        <ChevronRight className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
      </button>

      <button
        type="button"
        onClick={() => onSelect("usd-to-krw")}
        className="group flex w-full items-center justify-between rounded-2xl border-2 border-border bg-card px-4 py-4 transition-colors hover:border-primary/40 hover:bg-primary/5 active:bg-primary/10"
      >
        <div className="text-left">
          <p className="mb-0.5 text-[11px] font-semibold text-muted-foreground">달러 → 원화</p>
          <p className="text-xl font-bold text-foreground">{fmtUSD(usdBalance)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            팔 때 {fmtRate(sellRate)}원 / $1
          </p>
        </div>
        <ChevronRight className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
      </button>
    </div>
  );
}

// ── 원화→달러 금액 입력 ───────────────────────────────────────────────────────

function KrwToUsdStep({
  buyRate,
  krwBalance,
  onBack,
  onConfirm,
}: {
  buyRate: number;
  krwBalance: number;
  onBack: () => void;
  onConfirm: (amount: number) => void;
}) {
  const [inputRaw, setInputRaw] = useState("");

  const inputAmount = Number(inputRaw.replace(/,/g, "")) || 0;
  const estimatedUsd = inputAmount > 0 ? inputAmount / buyRate : null;

  function setAmount(v: number) {
    setInputRaw(v > 0 ? v.toLocaleString("ko-KR") : "");
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
    const n = Number(raw);
    setInputRaw(n > 0 ? n.toLocaleString("ko-KR") : "");
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        ← 방향 다시 선택
      </button>

      <div className="mb-3 rounded-2xl border-2 border-border bg-muted/30 px-4 pb-4 pt-3 transition-colors focus-within:border-primary">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          보낼 금액
        </p>
        <div className="flex items-center gap-2">
          <Input
            inputMode="numeric"
            placeholder="0"
            value={inputRaw}
            onChange={handleInput}
            className="h-12 border-0 bg-transparent p-0 text-3xl font-bold shadow-none focus-visible:ring-0"
          />
          <span className="shrink-0 text-xl font-bold text-muted-foreground">원</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">보유 {fmtKRW(krwBalance)}원</p>
      </div>

      <div className="mb-4 flex gap-2">
        {[10_000, 50_000, 100_000].map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => setAmount(Math.min(amt, krwBalance))}
            className="flex-1 rounded-xl border border-border bg-background py-2.5 text-xs font-bold text-foreground transition-colors active:bg-muted"
          >
            {amt / 10_000}만원
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAmount(krwBalance)}
          className="flex-1 rounded-xl border border-primary/30 bg-primary/5 py-2.5 text-xs font-bold text-primary"
        >
          전액
        </button>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-4">
        <div>
          <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">보내는 금액</p>
          <p className="text-xl font-bold text-foreground">
            {inputAmount > 0 ? `${fmtKRW(inputAmount)}원` : "—"}
          </p>
        </div>
        <ArrowLeftRight className="size-4 shrink-0 text-muted-foreground/40" />
        <div className="text-right">
          <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">받을 금액</p>
          <p className="text-xl font-bold text-primary">
            {estimatedUsd !== null ? fmtUSD(estimatedUsd) : "—"}
          </p>
        </div>
      </div>

      <Button
        className="h-14 w-full rounded-2xl text-base font-bold"
        disabled={inputAmount <= 0 || inputAmount > krwBalance}
        onClick={() => onConfirm(inputAmount)}
      >
        다음
      </Button>
    </div>
  );
}

// ── 달러→원화 금액 입력 ───────────────────────────────────────────────────────

function UsdToKrwStep({
  sellRate,
  usdBalance,
  onBack,
  onConfirm,
}: {
  sellRate: number;
  usdBalance: number;
  onBack: () => void;
  onConfirm: (amount: number) => void;
}) {
  const [inputRaw, setInputRaw] = useState("");

  const inputAmount = Number(inputRaw.replace(/[^0-9.]/g, "")) || 0;
  const estimatedKrw = inputAmount > 0 ? inputAmount * sellRate : null;

  function setAmount(v: number) {
    setInputRaw(v > 0 ? v.toFixed(2) : "");
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setInputRaw(e.target.value.replace(/[^0-9.]/g, ""));
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        ← 방향 다시 선택
      </button>

      <div className="mb-3 rounded-2xl border-2 border-border bg-muted/30 px-4 pb-4 pt-3 transition-colors focus-within:border-primary">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          보낼 금액
        </p>
        <div className="flex items-center gap-2">
          <Input
            inputMode="decimal"
            placeholder="0.00"
            value={inputRaw}
            onChange={handleInput}
            className="h-12 border-0 bg-transparent p-0 text-3xl font-bold shadow-none focus-visible:ring-0"
          />
          <span className="shrink-0 text-xl font-bold text-muted-foreground">USD</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">보유 {fmtUSD(usdBalance)}</p>
      </div>

      <div className="mb-4 flex gap-2">
        {[10, 50, 100].map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => setAmount(Math.min(amt, usdBalance))}
            className="flex-1 rounded-xl border border-border bg-background py-2.5 text-xs font-bold text-foreground transition-colors active:bg-muted"
          >
            ${amt}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAmount(usdBalance)}
          className="flex-1 rounded-xl border border-primary/30 bg-primary/5 py-2.5 text-xs font-bold text-primary"
        >
          전액
        </button>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-4">
        <div>
          <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">보내는 금액</p>
          <p className="text-xl font-bold text-foreground">
            {inputAmount > 0 ? fmtUSD(inputAmount) : "—"}
          </p>
        </div>
        <ArrowLeftRight className="size-4 shrink-0 text-muted-foreground/40" />
        <div className="text-right">
          <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">받을 금액</p>
          <p className="text-xl font-bold text-primary">
            {estimatedKrw !== null ? `${fmtKRW(Math.round(estimatedKrw))}원` : "—"}
          </p>
        </div>
      </div>

      <Button
        className="h-14 w-full rounded-2xl text-base font-bold"
        disabled={inputAmount <= 0 || inputAmount > usdBalance}
        onClick={() => onConfirm(inputAmount)}
      >
        다음
      </Button>
    </div>
  );
}

// ── PIN 인증 단계 ─────────────────────────────────────────────────────────────

function PinStep({
  onBack,
  onVerified,
}: {
  onBack: () => void;
  onVerified: () => void;
}) {
  const [pin, setPin] = useState("");
  const txnAuth = useTxnAuth();

  async function handlePin(value: string) {
    setPin(value);
    if (value.length < 4) return;

    try {
      await txnAuth.mutateAsync({ accountPassword: value, keepAuth: true });
      onVerified();
    } catch {
      toast.error("비밀번호가 틀렸어요. 다시 입력해 주세요.");
      setPin("");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        ← 금액 다시 입력
      </button>

      <p className="mb-1 text-center text-base font-bold text-foreground">계좌 비밀번호 입력</p>
      <p className="mb-8 text-center text-sm text-muted-foreground">4자리 숫자를 입력해 주세요</p>

      <PinKeypad
        value={pin}
        onChange={handlePin}
        length={4}
        disabled={txnAuth.isPending}
      />
    </div>
  );
}

// ── 환전 시트 ─────────────────────────────────────────────────────────────────

function ExchangeSheet({
  open,
  onClose,
  buyRate,
  sellRate,
  krwBalance,
  usdBalance,
}: {
  open: boolean;
  onClose: () => void;
  buyRate: number;
  sellRate: number;
  krwBalance: number;
  usdBalance: number;
}) {
  const [step, setStep] = useState<Step>("direction");
  const [pendingDirection, setPendingDirection] = useState<Direction | null>(null);
  const [pendingAmount, setPendingAmount] = useState<number>(0);

  const krwToUsd = useKrwToUsd();
  const usdToKrw = useUsdToKrw();

  function handleClose() {
    setStep("direction");
    setPendingDirection(null);
    setPendingAmount(0);
    onClose();
  }

  function handleConfirm(dir: Direction, amount: number) {
    setPendingDirection(dir);
    setPendingAmount(amount);
    setStep("pin");
  }

  async function executeExchange(dir: Direction, amount: number) {
    try {
      if (dir === "krw-to-usd") {
        const result = await krwToUsd.mutateAsync({
          krwAmount: amount,
          idempotencyKey: crypto.randomUUID(),
        });
        toast.success(`환전 완료! ${fmtUSD(result.exchangedUsd)} 받았어요`);
      } else {
        const result = await usdToKrw.mutateAsync({
          usdAmount: amount,
          idempotencyKey: crypto.randomUUID(),
        });
        toast.success(`환전 완료! ${fmtKRW(Math.round(result.exchangedKrw))}원 받았어요`);
      }
      handleClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === "TXN_AUTH_REQUIRED") {
        setStep("pin");
      } else {
        toast.error("환전에 실패했어요. 다시 시도해 주세요.");
        setStep(dir);
      }
    }
  }

  async function handleVerified() {
    await executeExchange(pendingDirection ?? "krw-to-usd", pendingAmount);
  }

  const isExecuting = krwToUsd.isPending || usdToKrw.isPending;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-10 pt-6">
        <SheetHeader className="mb-6 text-left">
          <SheetTitle className="text-xl font-bold">환전</SheetTitle>
          {step === "direction" && (
            <p className="text-sm text-muted-foreground">어떤 방향으로 환전할까요?</p>
          )}
          {step === "krw-to-usd" && (
            <p className="text-sm text-muted-foreground">
              살 때 <span className="font-semibold text-foreground">{fmtRate(buyRate)}원</span> / $1
            </p>
          )}
          {step === "usd-to-krw" && (
            <p className="text-sm text-muted-foreground">
              팔 때 <span className="font-semibold text-foreground">{fmtRate(sellRate)}원</span> / $1
            </p>
          )}
        </SheetHeader>

        {step === "direction" && (
          <DirectionStep
            krwBalance={krwBalance}
            usdBalance={usdBalance}
            buyRate={buyRate}
            sellRate={sellRate}
            onSelect={(dir) => setStep(dir)}
          />
        )}

        {step === "krw-to-usd" && (
          <KrwToUsdStep
            buyRate={buyRate}
            krwBalance={krwBalance}
            onBack={() => setStep("direction")}
            onConfirm={(amount) => {
              setPendingDirection("krw-to-usd");
              setPendingAmount(amount);
              executeExchange("krw-to-usd", amount);
            }}
          />
        )}

        {step === "usd-to-krw" && (
          <UsdToKrwStep
            sellRate={sellRate}
            usdBalance={usdBalance}
            onBack={() => setStep("direction")}
            onConfirm={(amount) => {
              setPendingDirection("usd-to-krw");
              setPendingAmount(amount);
              executeExchange("usd-to-krw", amount);
            }}
          />
        )}

        {step === "pin" && (
          <PinStep
            onBack={() => setStep(pendingDirection ?? "direction")}
            onVerified={isExecuting ? () => {} : handleVerified}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function ExchangePage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data: rate, isLoading } = useExchangeRate();
  const { data: cma } = useCmaHome();

  const usdBalance = cma?.cmaBalance.USD ?? 0;
  const krwBalance = cma?.cmaBalance.KRW ?? 0;

  const changePositive = (rate?.change ?? 0) >= 0;

  return (
    <>
      <AppHeader variant="sub" title="환전" />

      <div className="flex flex-col gap-3 pb-6">
        {/* 환율 + 내 잔액 카드 */}
        <div className="relative overflow-hidden rounded-3xl bg-primary px-5 py-6">

          <div className="relative mb-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-medium text-white/60">현재 적용 환율</p>
              {rate?.updatedAt && (
                <p className="text-[11px] text-white/40">{parseTime(rate.updatedAt)} 기준</p>
              )}
            </div>
            {isLoading ? (
              <div className="h-10 w-44 animate-pulse rounded-xl bg-white/20" />
            ) : (
              <div className="flex items-end gap-2">
                <span className="text-[34px] font-bold leading-none text-white">
                  {rate ? fmtRate(rate.buyRate) : "—"}원
                </span>
                <span className="mb-0.5 text-base text-white/50">/ $1</span>
                {rate && (
                  <span
                    className={`mb-1 flex items-center gap-0.5 text-xs font-bold ${
                      changePositive ? "text-red-300" : "text-blue-300"
                    }`}
                  >
                    {changePositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {Math.abs(rate.change).toFixed(2)}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="relative grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-white/15 px-4 py-3.5">
              <p className="mb-2 text-[10px] font-semibold text-white/50">보유 원화</p>
              <p className="text-lg font-bold leading-none text-white">{fmtKRW(krwBalance)}</p>
              <p className="mt-0.5 text-[10px] text-white/40">원</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3.5">
              <p className="mb-2 text-[10px] font-semibold text-white/50">보유 달러</p>
              <p className="text-lg font-bold leading-none text-white">{fmtUSD(usdBalance)}</p>
              <p className="mt-0.5 text-[10px] text-white/40">CMA 달러풀</p>
            </div>
          </div>
        </div>

        {/* 살 때 / 팔 때 환율 타일 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card px-4 py-4">
            <p className="mb-1 text-[11px] font-semibold text-muted-foreground">살 때</p>
            <p className="mb-1 text-[10px] text-muted-foreground/60">원화 → 달러</p>
            <p className="text-[17px] font-bold text-foreground">
              {rate ? fmtRate(rate.buyRate) : "—"}원
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-4">
            <p className="mb-1 text-[11px] font-semibold text-muted-foreground">팔 때</p>
            <p className="mb-1 text-[10px] text-muted-foreground/60">달러 → 원화</p>
            <p className="text-[17px] font-bold text-foreground">
              {rate ? fmtRate(rate.sellRate) : "—"}원
            </p>
          </div>
        </div>

        {/* CTA */}
        <Button
          className="mt-1 h-14 w-full rounded-2xl text-base font-bold"
          onClick={() => setSheetOpen(true)}
        >
          <ArrowLeftRight className="size-5" />
          환전하기
        </Button>
      </div>

      {rate && (
        <ExchangeSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          buyRate={rate.buyRate}
          sellRate={rate.sellRate}
          krwBalance={krwBalance}
          usdBalance={usdBalance}
        />
      )}
    </>
  );
}
