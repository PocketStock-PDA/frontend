"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, ChevronRight, RefreshCw, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppHeader } from "@/components/common/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PinKeypad } from "@/components/common/PinKeypad";
import { AccountPasswordUnlock } from "@/components/common/AccountPasswordUnlock";
import { ApiError } from "@/lib/api/client";
import { useExchangeRate } from "@/hooks/queries/useExchangeRate";
import { useExchangeAutoSettings } from "@/hooks/queries/useExchangeAutoSettings";
import { useExchangeHistory } from "@/hooks/queries/useExchangeHistory";
import { useKrwToUsd } from "@/hooks/mutations/useKrwToUsd";
import { useUsdToKrw } from "@/hooks/mutations/useUsdToKrw";
import { useTxnAuth } from "@/hooks/mutations/useTxnAuth";
import { useUpdateAutoSettings } from "@/hooks/mutations/useUpdateAutoSettings";
import { useCmaHome } from "@/hooks/queries/useCmaHome";
import type { FxHistoryItem } from "@/types/domain/exchange";

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
function fmtDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return dateStr.slice(5, 10).replace("-", ".");
  }
}

type Direction = "krw-to-usd" | "usd-to-krw";
type View = "main" | "input" | "pin";

// ── 자동환전 카드 ─────────────────────────────────────────────────────────────

function AutoSettingCard() {
  const { data: settings } = useExchangeAutoSettings();
  const update = useUpdateAutoSettings();
  const router = useRouter();

  function handleToggle(checked: boolean) {
    if (!settings) return;
    update.mutate({
      autoEnabled: checked,
      useDollarFirst: settings.useDollarFirst,
      maxAmountPerTx: settings.maxAmountPerTx,
      residualHandling: settings.residualHandling,
    });
  }

  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-[14px] font-bold text-foreground">자동환전</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {settings
              ? settings.autoEnabled
                ? `${settings.useDollarFirst ? "달러 우선" : "원화 우선"} · 자동으로 환전 중`
                : "현재 꺼져 있어요"
              : "설정을 불러오는 중..."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/exchange/auto-settings")}
            className="flex size-8 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors active:bg-muted/70"
          >
            <Settings2 className="size-4" />
          </button>
          <Switch
            checked={settings?.autoEnabled ?? false}
            onCheckedChange={handleToggle}
            disabled={!settings || update.isPending}
          />
        </div>
      </div>
    </div>
  );
}

// ── 거래내역 섹션 ─────────────────────────────────────────────────────────────

function HistoryRow({ item }: { item: FxHistoryItem }) {
  const isBuy = item.type === "KRW_TO_USD";
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-base">
        {isBuy ? "🇺🇸" : "🇰🇷"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground">
          {isBuy ? "외화사기" : "외화팔기"}
          {item.triggerType === "AUTO" && (
            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
              <RefreshCw className="size-2" />
              자동
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {fmtDate(item.exchangedAt)} · {fmtRate(item.rate)}원
        </p>
      </div>
      <div className="shrink-0 text-right">
        {isBuy ? (
          <>
            <p className="text-[13px] font-bold text-primary">+{fmtUSD(item.usdAmount)}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">-{fmtKRW(item.krwAmount)}원</p>
          </>
        ) : (
          <>
            <p className="text-[13px] font-bold text-primary">+{fmtKRW(item.krwAmount)}원</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">-{fmtUSD(item.usdAmount)}</p>
          </>
        )}
      </div>
    </div>
  );
}

function HistorySection() {
  const { data, isLoading } = useExchangeHistory(0, 3);
  const router = useRouter();
  const items = data?.history ?? [];

  return (
    <div className="rounded-2xl bg-white px-5 shadow-sm">
      <div className="flex items-center justify-between py-4">
        <p className="text-[14px] font-bold text-foreground">환전 내역</p>
        <button
          type="button"
          onClick={() => router.push("/exchange/history")}
          className="flex items-center gap-0.5 text-[12px] font-medium text-muted-foreground"
        >
          전체보기 <ChevronRight className="size-3.5" />
        </button>
      </div>
      {isLoading ? (
        <div className="space-y-3 pb-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="size-9 animate-pulse rounded-xl bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="pb-6 text-center text-[13px] text-muted-foreground">환전 내역이 없어요</p>
      ) : (
        <div className="divide-y divide-border pb-2">
          {items.map((item, i) => (
            <HistoryRow key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 메인 화면 ─────────────────────────────────────────────────────────────────

function MainView({
  krwBalance,
  usdBalance,
  buyRate,
  sellRate,
  change,
  updatedAt,
  cmaAccountNo,
  isLoading,
  onSelect,
}: {
  krwBalance: number;
  usdBalance: number;
  buyRate: number;
  sellRate: number;
  change: number;
  updatedAt?: string | undefined;
  cmaAccountNo?: string | undefined;
  isLoading: boolean;
  onSelect: (dir: Direction) => void;
}) {
  const changePositive = change >= 0;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="rounded-3xl px-5 py-6" style={{ background: "linear-gradient(135deg, #0046FF 0%, #6B3FF5 100%)" }}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-white/50">USD/KRW</span>
            {updatedAt && <span className="text-[11px] text-white/30">· {parseTime(updatedAt)} 기준</span>}
          </div>
          {cmaAccountNo && (
            <span className="text-[11px] text-white/40">포켓스톡 CMA {cmaAccountNo}</span>
          )}
        </div>
        {isLoading ? (
          <div className="h-9 w-40 animate-pulse rounded-xl bg-white/20" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-[32px] font-bold leading-none tracking-tight text-white">
              {fmtRate(buyRate)}
            </span>
            <span className="text-sm font-medium text-white/50">원</span>
            <span className={`ml-1 text-sm font-bold ${changePositive ? "text-red-300" : "text-blue-300"}`}>
              {changePositive ? "+" : "-"}{Math.abs(change).toFixed(2)}
            </span>
          </div>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-[10px] font-medium text-white/40">보유 원화</p>
            <p className="mt-1.5 text-[15px] font-bold text-white">{fmtKRW(krwBalance)}원</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <p className="text-[10px] font-medium text-white/40">보유 달러</p>
            <p className="mt-1.5 text-[15px] font-bold text-white">{fmtUSD(usdBalance)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">살 때 (원화→달러)</p>
            <p className="mt-1 text-[15px] font-bold text-foreground">{fmtRate(buyRate)}원</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">팔 때 (달러→원화)</p>
            <p className="mt-1 text-[15px] font-bold text-foreground">{fmtRate(sellRate)}원</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect("krw-to-usd")}
        className="h-14 w-full rounded-2xl text-base font-bold"
        style={{ background: "linear-gradient(135deg, #0046FF 0%, #6B3FF5 100%)", color: "white" }}
      >
        환전하기
      </button>

      <AutoSettingCard />
      <HistorySection />
    </div>
  );
}

// ── 환전 입력 화면 ────────────────────────────────────────────────────────────

function ExchangeInputView({
  direction,
  buyRate,
  sellRate,
  krwBalance,
  usdBalance,
  isPending,
  onSwap,
  onConfirm,
}: {
  direction: Direction;
  buyRate: number;
  sellRate: number;
  krwBalance: number;
  usdBalance: number;
  isPending: boolean;
  onSwap: () => void;
  onConfirm: (amount: number) => void;
}) {
  const [inputRaw, setInputRaw] = useState("");

  const isBuy = direction === "krw-to-usd";
  const rate = isBuy ? buyRate : sellRate;
  const fromBalance = isBuy ? krwBalance : usdBalance;
  const inputAmount = isBuy
    ? Number(inputRaw.replace(/,/g, "")) || 0
    : Number(inputRaw.replace(/[^0-9.]/g, "")) || 0;
  const isOver = inputAmount > fromBalance;

  const estimated =
    inputAmount > 0 ? (isBuy ? inputAmount / buyRate : inputAmount * sellRate) : null;

  function handleFullAmount() {
    if (isBuy) setInputRaw(fmtKRW(krwBalance));
    else setInputRaw(usdBalance.toFixed(2));
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (isBuy) {
      const raw = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
      const n = Number(raw);
      setInputRaw(n > 0 ? fmtKRW(n) : "");
    } else {
      setInputRaw(e.target.value.replace(/[^0-9.]/g, ""));
    }
  }

  const fromFlag = isBuy ? "🇰🇷" : "🇺🇸";
  const fromCountry = isBuy ? "한국" : "미국";
  const fromCurrency = isBuy ? "KRW" : "USD";
  const fromBalanceStr = isBuy ? `${fmtKRW(krwBalance)}원` : fmtUSD(usdBalance);
  const fromUnit = isBuy ? "원" : "달러";
  const fromPlaceholder = isBuy ? "환전할 KRW 금액을 입력해주세요" : "환전할 USD 금액을 입력해주세요";

  const toFlag = isBuy ? "🇺🇸" : "🇰🇷";
  const toCountry = isBuy ? "미국" : "한국";
  const toCurrency = isBuy ? "USD" : "KRW";
  const toBalanceStr = isBuy ? fmtUSD(usdBalance) : `${fmtKRW(krwBalance)}원`;
  const toUnit = isBuy ? "달러" : "원";
  const estimatedStr =
    estimated !== null
      ? isBuy
        ? fmtUSD(estimated)
        : fmtKRW(Math.round(estimated))
      : null;

  return (
    <div className="flex flex-col pb-8">
      {/* FROM */}
      <div className="py-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{fromFlag}</span>
            <span className="text-[20px] font-bold">{fromCountry} {fromCurrency}</span>
          </div>
          <span className="text-[14px] text-muted-foreground">을</span>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <span className="text-[13px] text-muted-foreground">
            환전가능금액 {fromBalanceStr}
          </span>
          <button
            type="button"
            onClick={handleFullAmount}
            className="text-[13px] font-bold text-primary"
          >
            전액입력
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-border pb-4">
          <Input
            autoFocus
            inputMode={isBuy ? "numeric" : "decimal"}
            placeholder={fromPlaceholder}
            value={inputRaw}
            onChange={handleInput}
            className={`h-auto flex-1 border-0 bg-transparent p-0 text-[17px] shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0 ${
              isOver ? "text-destructive" : "text-foreground"
            }`}
          />
          <span className={`shrink-0 text-[15px] ${isOver ? "text-destructive" : "text-muted-foreground"}`}>
            {fromUnit}
          </span>
        </div>

        {isOver && (
          <p className="mt-2 text-[11px] text-destructive">환전 가능 금액을 초과했어요</p>
        )}
      </div>

      {/* 스왑 버튼 */}
      <div className="flex justify-center py-1">
        <button
          type="button"
          onClick={onSwap}
          disabled={isPending}
          className="flex items-center gap-0.5 rounded-2xl bg-muted px-6 py-3.5 transition-colors active:bg-muted/70 disabled:opacity-40"
        >
          <ArrowUp className="size-4 text-foreground" />
          <ArrowDown className="size-4 text-foreground" />
        </button>
      </div>

      {/* TO */}
      <div className="py-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{toFlag}</span>
            <span className="text-[20px] font-bold">{toCountry} {toCurrency}</span>
          </div>
          <span className="text-[14px] text-muted-foreground">로 바꿀게요</span>
        </div>

        <p className="mb-4 text-[13px] text-muted-foreground">잔고 {toBalanceStr}</p>

        <div className="flex items-center gap-3 border-b border-border pb-4">
          <span className="shrink-0 text-[17px] text-muted-foreground">≒</span>
          <span
            className={`flex-1 text-[17px] font-bold ${
              estimatedStr ? "text-foreground" : "text-muted-foreground/30"
            }`}
          >
            {estimatedStr ?? "0"}
          </span>
          <span className="shrink-0 text-[15px] text-muted-foreground">{toUnit}</span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-primary">우대환율 적용</span>
          <span className="text-[12px] text-muted-foreground">적용환율: {fmtRate(rate)}원</span>
        </div>
      </div>

      <Button
        className="h-14 w-full rounded-2xl text-base font-bold"
        disabled={inputAmount <= 0 || isOver || isPending}
        onClick={() => onConfirm(inputAmount)}
      >
        {isPending ? "처리 중..." : "환전하기"}
      </Button>
    </div>
  );
}

// ── PIN 인증 화면 ─────────────────────────────────────────────────────────────

function PinView({ onVerified }: { onBack: () => void; onVerified: () => void }) {
  const [pin, setPin] = useState("");
  const [locked, setLocked] = useState(false);
  const txnAuth = useTxnAuth();

  async function handlePin(value: string) {
    setPin(value);
    if (value.length < 4) return;
    try {
      await txnAuth.mutateAsync({ accountPassword: value, keepAuth: true });
      onVerified();
    } catch (err) {
      setPin("");
      if (err instanceof ApiError && err.code === "ACCOUNT_PASSWORD_LOCKED") {
        setLocked(true);
        return;
      }
      toast.error(
        err instanceof ApiError
          ? err.message
          : "비밀번호가 틀렸어요. 다시 입력해 주세요.",
      );
    }
  }

  if (locked) {
    return (
      <div className="pb-6">
        <AccountPasswordUnlock onUnlocked={() => setLocked(false)} />
      </div>
    );
  }

  return (
    <div className="pb-6">
      <p className="mb-1 text-center text-base font-bold text-foreground">계좌 비밀번호 입력</p>
      <p className="mb-8 text-center text-sm text-muted-foreground">4자리 숫자를 입력해 주세요</p>
      <PinKeypad value={pin} onChange={handlePin} length={4} disabled={txnAuth.isPending} secure />
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function ExchangePage() {
  const [view, setView] = useState<View>("main");
  const [direction, setDirection] = useState<Direction>("krw-to-usd");
  const [pendingAmount, setPendingAmount] = useState(0);
  const [pendingKey, setPendingKey] = useState("");
  const [pendingDir, setPendingDir] = useState<Direction>("krw-to-usd");

  const { data: rate, isLoading } = useExchangeRate();
  const { data: cma } = useCmaHome();
  const krwToUsd = useKrwToUsd();
  const usdToKrw = useUsdToKrw();

  const usdBalance = cma?.cmaBalance.USD ?? 0;
  const krwBalance = cma?.cmaBalance.KRW ?? 0;

  const headerTitle = view === "pin" ? "계좌 비밀번호" : "환전";

  const isPending = krwToUsd.isPending || usdToKrw.isPending;

  async function executeExchange(dir: Direction, amount: number, idempotencyKey: string) {
    try {
      if (dir === "krw-to-usd") {
        const result = await krwToUsd.mutateAsync({ krwAmount: amount, idempotencyKey });
        toast.success(`환전 완료! ${fmtUSD(result.exchangedUsd)} 받았어요`);
      } else {
        const result = await usdToKrw.mutateAsync({ usdAmount: amount, idempotencyKey });
        toast.success(`환전 완료! ${fmtKRW(Math.round(result.exchangedKrw))}원 받았어요`);
      }
      setView("main");
    } catch (err) {
      if (err instanceof ApiError && err.code === "TXN_AUTH_REQUIRED") {
        setView("pin");
      } else {
        toast.error("환전에 실패했어요. 다시 시도해 주세요.");
      }
    }
  }

  function handleConfirm(amount: number) {
    const key = crypto.randomUUID();
    setPendingAmount(amount);
    setPendingKey(key);
    setPendingDir(direction);
    executeExchange(direction, amount, key);
  }

  function handleSwap() {
    setDirection((d) => (d === "krw-to-usd" ? "usd-to-krw" : "krw-to-usd"));
  }

  function handleSelect(dir: Direction) {
    setDirection(dir);
    setView("input");
  }

  return (
    <>
      <AppHeader
        variant="sub"
        title={headerTitle}
        {...(view !== "main" && {
          onBack: () => setView(view === "pin" ? "input" : "main"),
        })}
      />

      {view === "main" && (
        <MainView
          krwBalance={krwBalance}
          usdBalance={usdBalance}
          buyRate={rate?.buyRate ?? 0}
          sellRate={rate?.sellRate ?? 0}
          change={rate?.change ?? 0}
          updatedAt={rate?.updatedAt}
          cmaAccountNo={cma?.cmaAccountNo}
          isLoading={isLoading}
          onSelect={handleSelect}
        />
      )}

      {view === "input" && rate && (
        <ExchangeInputView
          key={direction}
          direction={direction}
          buyRate={rate.buyRate}
          sellRate={rate.sellRate}
          krwBalance={krwBalance}
          usdBalance={usdBalance}
          isPending={isPending}
          onSwap={handleSwap}
          onConfirm={handleConfirm}
        />
      )}

      {view === "pin" && (
        <PinView
          onBack={() => setView("input")}
          onVerified={() => executeExchange(pendingDir, pendingAmount, pendingKey)}
        />
      )}
    </>
  );
}
