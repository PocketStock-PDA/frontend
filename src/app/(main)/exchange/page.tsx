"use client";

import { useState } from "react";
import { ArrowDown, ChevronRight, RefreshCw, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { useExchangeAutoSettings } from "@/hooks/queries/useExchangeAutoSettings";
import { useExchangeHistory } from "@/hooks/queries/useExchangeHistory";
import { useUpdateAutoSettings } from "@/hooks/mutations/useUpdateAutoSettings";
import type { FxHistoryItem } from "@/types/domain/exchange";
import { toast } from "sonner";
import { AppHeader } from "@/components/common/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
type View = "main" | Direction | "pin";

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

function fmtDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return dateStr.slice(5, 10).replace("-", ".");
  }
}

function HistoryRow({ item }: { item: FxHistoryItem }) {
  const isBuy = item.type === "KRW_TO_USD";
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-base">
        {isBuy ? "🇺🇸" : "🇰🇷"}
      </div>
      <div className="flex-1 min-w-0">
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
      <div className="text-right shrink-0">
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
  isLoading,
  onSelect,
}: {
  krwBalance: number;
  usdBalance: number;
  buyRate: number;
  sellRate: number;
  change: number;
  updatedAt?: string;
  isLoading: boolean;
  onSelect: (dir: Direction) => void;
}) {
  const changePositive = change >= 0;

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* 환율 카드 */}
      <div className="rounded-3xl px-5 py-6" style={{ background: "linear-gradient(135deg, #0046FF 0%, #6B3FF5 100%)" }}>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[11px] font-medium text-white/50">USD/KRW</span>
          {updatedAt && (
            <span className="text-[11px] text-white/30">· {parseTime(updatedAt)} 기준</span>
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
            <span
              className={`ml-1 text-sm font-bold ${changePositive ? "text-red-300" : "text-blue-300"}`}
            >
              {changePositive ? "+" : "-"}{Math.abs(change).toFixed(2)}
            </span>
          </div>
        )}

        {/* 보유 잔액 */}
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

      {/* 살 때 / 팔 때 */}
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

      {/* 방향 선택 */}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => onSelect("krw-to-usd")}
          className="flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm transition-shadow active:shadow-none"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <span className="text-xl">🇺🇸</span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-[15px] font-bold text-foreground">외화사기</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              원화로 달러 구매 · 살 때 {fmtRate(buyRate)}원
            </p>
          </div>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
            <ArrowDown className="size-3.5 -rotate-90 text-muted-foreground" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("usd-to-krw")}
          className="flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm transition-shadow active:shadow-none"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <span className="text-xl">🇰🇷</span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-[15px] font-bold text-foreground">외화팔기</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              달러를 원화로 전환 · 팔 때 {fmtRate(sellRate)}원
            </p>
          </div>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
            <ArrowDown className="size-3.5 -rotate-90 text-muted-foreground" />
          </div>
        </button>
      </div>

      <AutoSettingCard />
      <HistorySection />
    </div>
  );
}

// ── 원화→달러 입력 화면 ───────────────────────────────────────────────────────

function KrwToUsdView({
  buyRate,
  krwBalance,
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
  const isOver = inputAmount > krwBalance;

  function setAmount(v: number) {
    setInputRaw(v > 0 ? v.toLocaleString("ko-KR") : "");
  }
  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
    const n = Number(raw);
    setInputRaw(n > 0 ? n.toLocaleString("ko-KR") : "");
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* 재원 */}
      <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-[11px] text-muted-foreground">보유 원화 (재원)</p>
          <p className="mt-1 text-[17px] font-bold text-foreground">{fmtKRW(krwBalance)}원</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">적용 환율</p>
          <p className="mt-1 text-[13px] font-semibold text-primary">{fmtRate(buyRate)}원</p>
        </div>
      </div>

      {/* 금액 입력 — 중앙 큰 숫자 */}
      <div className="rounded-2xl bg-white px-5 py-6 shadow-sm">
        <p className="mb-4 text-[11px] font-medium text-muted-foreground">원화 금액 입력</p>
        <div className="flex items-baseline gap-2">
          <Input
            inputMode="numeric"
            placeholder="0"
            value={inputRaw}
            onChange={handleInput}
            className={`h-auto border-0 bg-transparent p-0 text-[38px] font-bold leading-none shadow-none focus-visible:ring-0 ${
              isOver ? "text-destructive" : "text-foreground"
            }`}
          />
          <span className={`shrink-0 text-2xl font-bold ${isOver ? "text-destructive" : "text-muted-foreground"}`}>
            원
          </span>
        </div>
        {isOver && (
          <p className="mt-2 text-[11px] font-medium text-destructive">보유 원화를 초과했어요</p>
        )}

        {/* 빠른 금액 */}
        <div className="mt-5 flex gap-2">
          {[10_000, 50_000, 100_000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setAmount(Math.min(amt, krwBalance))}
              className="flex-1 rounded-xl bg-muted py-2 text-[12px] font-bold text-foreground transition-colors active:bg-muted/70"
            >
              {amt / 10_000}만원
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAmount(krwBalance)}
            className="flex-1 rounded-xl bg-primary/10 py-2 text-[12px] font-bold text-primary transition-colors active:bg-primary/20"
          >
            전액
          </button>
        </div>
      </div>

      {/* 받을 금액 */}
      <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
        <p className="mb-3 text-[11px] text-muted-foreground">예상 수령액</p>
        <p className={`text-[26px] font-bold ${estimatedUsd !== null ? "text-primary" : "text-muted-foreground/30"}`}>
          {estimatedUsd !== null ? fmtUSD(estimatedUsd) : "$0.00"}
        </p>
      </div>

      <Button
        className="h-14 w-full rounded-2xl text-base font-bold"
        disabled={inputAmount <= 0 || isOver}
        onClick={() => onConfirm(inputAmount)}
      >
        환전하기
      </Button>
    </div>
  );
}

// ── 달러→원화 입력 화면 ───────────────────────────────────────────────────────

function UsdToKrwView({
  sellRate,
  usdBalance,
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
  const isOver = inputAmount > usdBalance;

  function setAmount(v: number) {
    setInputRaw(v > 0 ? v.toFixed(2) : "");
  }
  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setInputRaw(e.target.value.replace(/[^0-9.]/g, ""));
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* 재원 */}
      <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-[11px] text-muted-foreground">보유 달러 (재원)</p>
          <p className="mt-1 text-[17px] font-bold text-foreground">{fmtUSD(usdBalance)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">적용 환율</p>
          <p className="mt-1 text-[13px] font-semibold text-primary">{fmtRate(sellRate)}원</p>
        </div>
      </div>

      {/* 금액 입력 */}
      <div className="rounded-2xl bg-white px-5 py-6 shadow-sm">
        <p className="mb-4 text-[11px] font-medium text-muted-foreground">달러 금액 입력</p>
        <div className="flex items-baseline gap-2">
          <Input
            inputMode="decimal"
            placeholder="0.00"
            value={inputRaw}
            onChange={handleInput}
            className={`h-auto border-0 bg-transparent p-0 text-[38px] font-bold leading-none shadow-none focus-visible:ring-0 ${
              isOver ? "text-destructive" : "text-foreground"
            }`}
          />
          <span className={`shrink-0 text-2xl font-bold ${isOver ? "text-destructive" : "text-muted-foreground"}`}>
            USD
          </span>
        </div>
        {isOver && (
          <p className="mt-2 text-[11px] font-medium text-destructive">보유 달러를 초과했어요</p>
        )}

        {/* 빠른 금액 */}
        <div className="mt-5 flex gap-2">
          {[10, 50, 100].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setAmount(Math.min(amt, usdBalance))}
              className="flex-1 rounded-xl bg-muted py-2 text-[12px] font-bold text-foreground transition-colors active:bg-muted/70"
            >
              ${amt}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAmount(usdBalance)}
            className="flex-1 rounded-xl bg-primary/10 py-2 text-[12px] font-bold text-primary transition-colors active:bg-primary/20"
          >
            전액
          </button>
        </div>
      </div>

      {/* 받을 금액 */}
      <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
        <p className="mb-3 text-[11px] text-muted-foreground">예상 수령액</p>
        <p className={`text-[26px] font-bold ${estimatedKrw !== null ? "text-primary" : "text-muted-foreground/30"}`}>
          {estimatedKrw !== null ? `${fmtKRW(Math.round(estimatedKrw))}원` : "0원"}
        </p>
      </div>

      <Button
        className="h-14 w-full rounded-2xl text-base font-bold"
        disabled={inputAmount <= 0 || isOver}
        onClick={() => onConfirm(inputAmount)}
      >
        환전하기
      </Button>
    </div>
  );
}

// ── PIN 인증 화면 ─────────────────────────────────────────────────────────────

function PinView({ onVerified }: { onBack: () => void; onVerified: () => void }) {
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
    <div className="pb-6">
      <p className="mb-1 text-center text-base font-bold text-foreground">계좌 비밀번호 입력</p>
      <p className="mb-8 text-center text-sm text-muted-foreground">4자리 숫자를 입력해 주세요</p>
      <PinKeypad value={pin} onChange={handlePin} length={4} disabled={txnAuth.isPending} />
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function ExchangePage() {
  const [view, setView] = useState<View>("main");
  const [pendingDir, setPendingDir] = useState<Direction>("krw-to-usd");
  const [pendingAmount, setPendingAmount] = useState(0);

  const { data: rate, isLoading } = useExchangeRate();
  const { data: cma } = useCmaHome();
  const krwToUsd = useKrwToUsd();
  const usdToKrw = useUsdToKrw();

  const usdBalance = cma?.cmaBalance.USD ?? 0;
  const krwBalance = cma?.cmaBalance.KRW ?? 0;

  const viewTitle: Record<View, string> = {
    main: "환전",
    "krw-to-usd": "외화사기",
    "usd-to-krw": "외화팔기",
    pin: "계좌 비밀번호",
  };

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
      setView("main");
    } catch (err) {
      if (err instanceof ApiError && err.code === "TXN_AUTH_REQUIRED") {
        setView("pin");
      } else {
        toast.error("환전에 실패했어요. 다시 시도해 주세요.");
      }
    }
  }

  function handleConfirm(dir: Direction, amount: number) {
    setPendingDir(dir);
    setPendingAmount(amount);
    executeExchange(dir, amount);
  }

  const backTarget: Record<View, View> = {
    main: "main",
    "krw-to-usd": "main",
    "usd-to-krw": "main",
    pin: pendingDir,
  };

  return (
    <>
      <AppHeader
        variant="sub"
        title={viewTitle[view]}
        {...(view !== "main" && {
          onBack: () => setView(backTarget[view]),
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
          isLoading={isLoading}
          onSelect={(dir) => setView(dir)}
        />
      )}

      {view === "krw-to-usd" && rate && (
        <KrwToUsdView
          buyRate={rate.buyRate}
          krwBalance={krwBalance}
          onBack={() => setView("main")}
          onConfirm={(amount) => handleConfirm("krw-to-usd", amount)}
        />
      )}

      {view === "usd-to-krw" && rate && (
        <UsdToKrwView
          sellRate={rate.sellRate}
          usdBalance={usdBalance}
          onBack={() => setView("main")}
          onConfirm={(amount) => handleConfirm("usd-to-krw", amount)}
        />
      )}

      {view === "pin" && (
        <PinView
          onBack={() => setView(pendingDir)}
          onVerified={() => executeExchange(pendingDir, pendingAmount)}
        />
      )}
    </>
  );
}
