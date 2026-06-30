"use client";

import { useState, useMemo, useRef } from "react";
import Decimal from "decimal.js";
import { Info, Minus, Plus, ArrowDown, ArrowRightLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { useMaturityRecommendation } from "@/hooks/queries/useMaturityRecommendation";
import { parseAccountId } from "@/lib/utils/params";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  FxAutoSettingsForm,
  DEFAULT_FX_AUTO_SETTINGS,
} from "@/components/features/exchange/FxAutoSettingsForm";
import { MaturityStepper } from "@/components/features/maturity/MaturityStepper";
import { ExitGuardDialog, ExitFlowButton } from "@/components/features/maturity/ExitGuardDialog";
import { useExchangeAutoSettings } from "@/hooks/queries/useExchangeAutoSettings";
import { useExchangeRate } from "@/hooks/queries/useExchangeRate";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { annualWholeShareDividendKrw } from "@/lib/utils/dividend";
import { cn } from "@/lib/utils";

const STEP = 10_000;
const MIN_AMOUNT = 1_000;

export default function MaturityReservePage() {
  const router = useRouter();
  const params = useSearchParams();
  // 선택 화면에서 이어온 예적금(유효한 양의 정수만) — 추천·triggerAccount를 같은 계좌로 맞춘다.
  const accountId = parseAccountId(params.get("accountId"));
  // 예금 재예치분 — 예약 후 배당 재투자(drip) → 예금 재예치 단계로 그대로 잇는다.
  const depositAmount = Math.floor(Number(params.get("deposit")) || 0);
  const { data } = useMaturityRecommendation(accountId);
  const { data: fxSettings } = useExchangeAutoSettings();
  const { data: fxRate } = useExchangeRate();
  const [fxSheetOpen, setFxSheetOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const submittingRef = useRef(false);

  // URL 파라미터 파싱: items=017800:250000,030000:150000
  // 제출 계좌는 URL이 아니라 추천 응답의 triggerAccount를 신뢰원으로 쓴다(쿼리 변조 방지).
  const rawItems = params.get("items") ?? "";

  // URL 입력 방어 — 중복 종목 제거, 비정상 금액(NaN) 제외, 최소 금액 미만은 끌어올림.
  const parsedItems = useMemo(() => {
    if (!rawItems) return [];
    const seen = new Set<string>();
    const out: { code: string; amount: number }[] = [];
    for (const seg of rawItems.split(",")) {
      const [code, amt] = seg.split(":");
      if (!code || seen.has(code)) continue;
      const n = Math.floor(Number(amt));
      if (!Number.isFinite(n)) continue;
      seen.add(code);
      out.push({ code, amount: Math.max(MIN_AMOUNT, n) });
    }
    return out;
  }, [rawItems]);

  // 종목별 금액 — 스테퍼로 조절 가능
  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(parsedItems.map(({ code, amount }) => [code, amount])),
  );

  const account = data?.triggerAccount ?? null;
  const stocks = useMemo(() => data?.recommendations ?? [], [data]);

  const stockMap = useMemo(
    () => Object.fromEntries(stocks.map((s) => [s.stockCode, s])),
    [stocks],
  );

  const codes = parsedItems.map((i) => i.code).filter((c) => c in amounts);

  // 현재가 — REST 스냅샷 (WS가 이미 stockDetail 캐시 업데이트 중이면 자동 반영)
  const stockDetailResults = useStockDetails(codes);
  const priceMap = useMemo(() => {
    const m: Record<string, number | null> = {};
    codes.forEach((code, i) => {
      m[code] = stockDetailResults[i]?.data?.price?.currentPrice ?? null;
    });
    return m;
  }, [codes, stockDetailResults]);

  const logoByCode = useMemo(() => {
    const m = new Map<string, string | null>();
    codes.forEach((code, i) => m.set(code, stockDetailResults[i]?.data?.logoUrl ?? null));
    return m;
  }, [codes, stockDetailResults]);

  const totalAmount = codes.reduce((sum, c) => sum + (amounts[c] ?? 0), 0);

  // 온주(정수 주식) 기준 연 배당 합계 — 매수금액으로 살 수 있는 온주 × 1주당 배당금.
  const totalDividend = useMemo(
    () =>
      codes.reduce((sum, c) => {
        const stock = stockMap[c];
        if (!stock) return sum;
        const d = annualWholeShareDividendKrw({
          buyAmountKrw: amounts[c] ?? 0,
          currentPrice: priceMap[c] ?? null,
          perShareDividend: stock.perShareDividend,
          isUS: stock.market === "US",
          usdKrwRate: fxRate?.baseRate ?? null,
        });
        return sum + (d ?? 0);
      }, 0),
    [codes, amounts, stockMap, priceMap, fxRate],
  );

  // 해외(US) 배당주가 담겨 있으면 집행 시 자동환전(KRW→USD)이 필요하다.
  const hasOverseas = codes.some((c) => stockMap[c]?.market === "US");
  // 설정 조회가 끝난 뒤에만 판단한다 — 로딩/실패 중엔 막지도, 기본값으로 덮어쓰지도 않는다.
  const needAutoFx = hasOverseas && fxSettings !== undefined && !fxSettings.autoEnabled;

  const adjust = (code: string, delta: number) => {
    setAmounts((prev) => ({
      ...prev,
      [code]: Math.max(MIN_AMOUNT, (prev[code] ?? 0) + delta),
    }));
  };

  const handleConfirm = () => {
    if (submittingRef.current) return;
    if (!account || codes.length === 0) return;
    if (needAutoFx) {
      toast.error("해외 배당주는 자동환전을 먼저 켜야 예약할 수 있어요.");
      return;
    }
    // 스테퍼로 조정한 금액을 그대로 items 파라미터에 담아 다음 단계로 넘긴다.
    // 실제 예약 API는 step 5(완료)에서 한 번에 호출한다.
    const itemsParam = codes.map((c) => `${c}:${amounts[c] ?? 0}`).join(",");
    const dq = depositAmount > 0 ? `&deposit=${depositAmount}` : "";
    router.push(
      `/recommendations/maturity/drip?items=${itemsParam}&accountId=${account.accountId}${dq}`,
    );
  };

  if (!rawItems || codes.length === 0 || !account) {
    return (
      <>
        <AppHeader variant="sub" title="매수 예약 확인" />
        <EmptyState title="예약할 종목이 없어요" description="다시 종목을 선택해 주세요." />
      </>
    );
  }

  const [, mm, dd] = account.maturityDate.split("-");
  const maturityShort = `${parseInt(mm ?? "0")}/${parseInt(dd ?? "0")}`;

  return (
    <>
      <AppHeader
        variant="sub"
        title="매수 예약 확인"
        showMenu={false}
        right={<ExitFlowButton onClick={() => setExitOpen(true)} />}
      />
      <MaturityStepper current={2} />

      <div className="space-y-5 pb-40">
        {/* ── 요약: 배당주로 굴릴 금액 → 연 배당 예상 ───────────────────── */}
        <section className="rounded-2xl bg-brand-surface p-5">
          <p className="text-sm font-semibold text-primary">배당주로 굴릴 금액</p>
          <p className="mt-1 font-numeric text-[30px] font-semibold leading-tight tabular-nums text-foreground">
            {formatKRW(totalAmount)}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2 font-numeric text-[12.5px] tabular-nums">
            <span className="truncate text-[#3c5170]">{account.accountName}</span>
            <span className="shrink-0 font-bold text-primary">
              연 {formatKRW(totalDividend)} 배당 예상
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-primary/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-primary">
            <ArrowDown className="size-3 shrink-0" />
            <span className="font-numeric tabular-nums">{maturityShort}</span> 만기일에 자동으로 전환돼요
          </div>
        </section>

        {/* ── 담는 종목 (divide-y 행 + 스테퍼) ─────────────────────────── */}
        <section>
          <p className="mb-2.5 px-0.5 text-sm font-bold text-foreground">
            담는 종목{codes.length > 1 ? ` ${codes.length}개` : ""}
          </p>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {codes.map((code) => {
              const stock = stockMap[code];
              const amount = amounts[code] ?? 0;
              const logo = logoByCode.get(code) ?? null;
              const currentPrice = priceMap[code] ?? null;
              // 해외(US)는 현재가가 달러 원본 — 원으로 찍지 않도록 시장별 분기.
              const isUS = stock?.market === "US";
              // 해외는 현재가가 달러 — 매수금액(원)을 매매기준율로 달러 환산한 뒤 나눠야 주수가 맞다.
              const fxRateValue = fxRate?.baseRate ?? null;
              const estimatedShares =
                !currentPrice || currentPrice <= 0
                  ? null
                  : isUS
                    ? fxRateValue && fxRateValue > 0
                      ? new Decimal(amount)
                          .dividedBy(fxRateValue)
                          .dividedBy(currentPrice)
                          .toDecimalPlaces(6)
                          .toNumber()
                      : null
                    : new Decimal(amount)
                        .dividedBy(currentPrice)
                        .toDecimalPlaces(6)
                        .toNumber();
              const sharesLabel =
                estimatedShares === null
                  ? null
                  : estimatedShares < 1
                    ? `약 ${estimatedShares.toFixed(6)}주`
                    : `약 ${new Decimal(estimatedShares).toDecimalPlaces(2).toNumber()}주`;

              return (
                <li key={code} className="space-y-2.5 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 shrink-0 rounded-xl">
                      {logo && <AvatarImage src={logo} alt="" />}
                      <AvatarFallback className="rounded-xl bg-muted text-[11px] font-semibold text-muted-foreground">
                        {(stock?.stockName ?? code).trim().charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        {stock?.stockName ?? code}
                      </p>
                      {stock && (
                        <p className="font-numeric text-[11.5px] tabular-nums text-muted-foreground">
                          연 {new Decimal(stock.dividendYield).toFixed(2)}%
                          {currentPrice !== null && (
                            <span> · 현재가 {isUS ? formatUSD(currentPrice) : formatKRW(currentPrice)}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 매수금액 스테퍼 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground">매수금액</span>
                      {sharesLabel && (
                        <p className="font-numeric text-[11px] tabular-nums text-muted-foreground">
                          {sharesLabel} 예상
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjust(code, -STEP)}
                        disabled={amount <= MIN_AMOUNT}
                        className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors duration-150 hover:bg-muted active:scale-95 disabled:opacity-30"
                        aria-label={`${stock?.stockName ?? code} 금액 감소`}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="min-w-[88px] text-center font-numeric text-sm font-bold tabular-nums">
                        {formatKRW(amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjust(code, STEP)}
                        className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors duration-150 hover:bg-muted active:scale-95"
                        aria-label={`${stock?.stockName ?? code} 금액 증가`}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── 해외 배당주: 자동환전 안내 (설정 조회 완료 후에만) ──────────── */}
        {needAutoFx && (
          <div className="rounded-2xl border border-primary/20 bg-brand-surface p-3.5">
            <div className="flex items-start gap-2">
              <ArrowRightLeft className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-foreground">
                  해외 배당주는 자동환전이 필요해요
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#3c5170]">
                  만기일에 원화를 달러로 자동환전(원화 → 달러)해 매수해요. 자동환전을 켜야
                  예약할 수 있어요.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFxSheetOpen(true)}
              className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-[13px] font-bold text-white transition-[opacity,transform] duration-150 active:scale-[0.98] active:opacity-80"
            >
              <ArrowRightLeft className="size-3.5" />
              자동환전 설정하기
            </button>
          </div>
        )}

        {/* 자동환전이 이미 켜져 있으면 결제 방식 안내 + 설정 변경 진입 */}
        {hasOverseas && fxSettings?.autoEnabled && (
          <div className="flex items-start gap-2 rounded-xl bg-brand-surface px-3 py-2.5 text-xs text-[#3c5170]">
            <ArrowRightLeft className="mt-px size-3 shrink-0 text-primary" />
            <span className="flex-1">
              해외 배당주는 만기일에 원화를 달러로 자동환전해 결제돼요.
            </span>
            <button
              type="button"
              onClick={() => setFxSheetOpen(true)}
              className="shrink-0 font-bold text-primary underline-offset-2 hover:underline"
            >
              설정 변경
            </button>
          </div>
        )}

        {/* ── 안내 ──────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-px size-3 shrink-0" />
          <span>
            {maturityShort} 만기일 시세로 체결돼요. 원금·배당은 변동할 수 있고, 만기 전엔
            취소 가능해요.
          </span>
        </div>
      </div>

      {/* ── 하단 고정 버튼 ────────────────────────────────────────────────── */}
      <div className="fixed bottom-[var(--bottom-nav-offset)] left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-background px-5 pb-4 pt-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={needAutoFx}
          className={cn(
            "flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white transition-[opacity,transform] duration-150",
            "disabled:opacity-50 active:scale-[0.98] active:opacity-80",
          )}
        >
          {needAutoFx
            ? "자동환전을 켜주세요"
            : codes.length > 1
              ? `${codes.length}종목 담기`
              : "다음"}
        </button>
      </div>

      <Sheet open={fxSheetOpen} onOpenChange={setFxSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[90vh] overflow-y-auto rounded-t-3xl px-5 pb-8 pt-6"
        >
          <SheetHeader className="mb-4 text-left">
            <SheetTitle>자동환전 설정</SheetTitle>
          </SheetHeader>
          <FxAutoSettingsForm
            initialSettings={fxSettings ?? DEFAULT_FX_AUTO_SETTINGS}
            requireEnabled
            submitLabel="자동환전 켜고 저장"
            onSaved={() => setFxSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <ExitGuardDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        onConfirm={() => router.push("/recommendations/maturity/select")}
      />
    </>
  );
}
