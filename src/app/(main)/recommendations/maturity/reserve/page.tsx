"use client";

import { useState, useMemo, useRef } from "react";
import Decimal from "decimal.js";
import { Info, Minus, Plus, Landmark, TrendingUp, ArrowDown, ArrowRightLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ApiError } from "@/lib/api/client";
import { useMaturityRecommendation } from "@/hooks/queries/useMaturityRecommendation";
import { parseAccountId } from "@/lib/utils/params";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import { useCreateMaturityReservation } from "@/hooks/mutations/useCreateMaturityReservation";
import { useExchangeAutoSettings } from "@/hooks/queries/useExchangeAutoSettings";
import { useUpdateAutoSettings } from "@/hooks/mutations/useUpdateAutoSettings";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

const STEP = 10_000;
const MIN_AMOUNT = 1_000;

export default function MaturityReservePage() {
  const router = useRouter();
  const params = useSearchParams();
  // 선택 화면에서 이어온 예적금(유효한 양의 정수만) — 추천·triggerAccount를 같은 계좌로 맞춘다.
  const accountId = parseAccountId(params.get("accountId"));
  const { data } = useMaturityRecommendation(accountId);
  const createReservation = useCreateMaturityReservation();
  const { data: fxSettings } = useExchangeAutoSettings();
  const updateAutoSettings = useUpdateAutoSettings();
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

  const totalDividend = useMemo(() =>
    codes.reduce((sum, c) => {
      const stock = stockMap[c];
      if (!stock) return sum;
      return sum + new Decimal(amounts[c] ?? 0)
        .times(new Decimal(stock.dividendYield).dividedBy(100))
        .toDecimalPlaces(0)
        .toNumber();
    }, 0),
    [codes, amounts, stockMap],
  );

  // 해외(US) 배당주가 담겨 있으면 집행 시 자동환전(KRW→USD)이 필요하다.
  const hasOverseas = codes.some((c) => stockMap[c]?.market === "US");
  // 설정 조회가 끝난 뒤에만 판단한다 — 로딩/실패 중엔 막지도, 기본값으로 덮어쓰지도 않는다.
  const needAutoFx = hasOverseas && fxSettings !== undefined && !fxSettings.autoEnabled;

  const enableAutoFx = () => {
    if (!fxSettings) return; // 설정 미조회 시 기존 값 덮어쓰기 방지
    updateAutoSettings.mutate(
      {
        autoEnabled: true,
        useDollarFirst: fxSettings.useDollarFirst,
        maxAmountPerTx: fxSettings.maxAmountPerTx,
        residualHandling: fxSettings.residualHandling,
      },
      {
        onError: () =>
          toast.error("자동환전을 켜지 못했어요. 잠시 후 다시 시도해 주세요."),
      },
    );
  };

  const adjust = (code: string, delta: number) => {
    setAmounts((prev) => ({
      ...prev,
      [code]: Math.max(MIN_AMOUNT, (prev[code] ?? 0) + delta),
    }));
  };

  const handleConfirm = async () => {
    // 따닥 클릭/리렌더 전 연속 호출로 같은 배치가 두 번 나가지 않게 가드.
    if (submittingRef.current) return;
    if (!account || codes.length === 0) return;
    // 해외 종목이 있는데 자동환전이 꺼져 있으면 서버가 거부한다 — 먼저 켜도록 막는다.
    if (needAutoFx) {
      toast.error("해외 배당주는 자동환전을 먼저 켜야 예약할 수 있어요.");
      return;
    }
    submittingRef.current = true;

    try {
      const results = await Promise.allSettled(
        codes.map((code) =>
          createReservation.mutateAsync({
            linkedBankAccountId: account.accountId,
            stockCode: code,
            buyAmount: amounts[code] ?? 0,
          }),
        ),
      );

      const rejected = results.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      );
      // 409(이미 예약됨)만 "건너뜀"으로 처리하고, 네트워크/5xx/검증 실패는 장애로 본다.
      const isConflict = (reason: unknown) =>
        reason instanceof ApiError && reason.status === 409;
      const conflicts = rejected.filter((r) => isConflict(r.reason));
      const realErrors = rejected.filter((r) => !isConflict(r.reason));
      const succeeded = results.length - rejected.length;

      if (realErrors.length > 0) {
        toast.error("예약 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
        return; // 이동하지 않고 재시도 가능하게 둔다
      }
      if (conflicts.length > 0 && succeeded === 0) {
        toast.error("이미 예약된 종목이에요. 기존 예약을 취소 후 다시 시도해 주세요.");
        return;
      }
      if (conflicts.length > 0) {
        toast.info(`${conflicts.length}종목은 이미 예약돼 있어 건너뛰었어요.`);
      }

      router.replace("/recommendations/maturity/drip");
    } finally {
      submittingRef.current = false;
    }
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
  const toName =
    codes.length > 1
      ? `${codes.length}종목 · ${codes
          .map((c) => stockMap[c]?.stockName ?? c)
          .slice(0, 2)
          .join(", ")}${codes.length > 2 ? " 외" : ""}`
      : (stockMap[codes[0] ?? ""]?.stockName ?? codes[0]);

  return (
    <>
      <AppHeader variant="sub" title="매수 예약 확인" />

      <div className="space-y-4 pb-40">
        {/* ── 예적금 → 배당주 전환 흐름 ─────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-border">
          {/* FROM: 예적금 (중립 muted) */}
          <div className="bg-muted px-4 py-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <Landmark className="size-3.5" />
              예금·적금
            </div>
            <p className="mt-1.5 text-sm font-bold text-foreground">{account.accountName}</p>
            <p className="mt-0.5 font-numeric text-[22px] font-bold tabular-nums text-foreground">
              {formatKRW(totalAmount)}{" "}
              <span className="text-xs font-medium text-muted-foreground">배당주로</span>
            </p>
          </div>

          {/* 커넥터: 만기일 자동 전환 */}
          <div className="relative flex items-center justify-center bg-card py-3.5">
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
            <div className="relative flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 shadow-sm">
              <ArrowDown className="size-3 text-primary" />
              <span className="font-numeric text-[11px] font-bold tabular-nums text-primary">
                {maturityShort} 만기일 자동 전환
              </span>
            </div>
          </div>

          {/* TO: 배당주 (brand-surface) */}
          <div className="bg-brand-surface px-4 py-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <TrendingUp className="size-3.5" />
              배당주
            </div>
            <p className="mt-1.5 text-sm font-bold text-foreground">{toName}</p>
            <p className="mt-0.5 font-numeric text-[22px] font-bold tabular-nums text-primary">
              연 {formatKRW(totalDividend)} 배당 예상
            </p>
          </div>
        </div>

        {/* ── 담는 종목 (divide-y 행 + 스테퍼) ─────────────────────────── */}
        <section>
          <p className="mb-2.5 px-0.5 text-sm font-bold text-muted-foreground">
            담는 종목{codes.length > 1 ? ` ${codes.length}개` : ""}
          </p>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {codes.map((code) => {
              const stock = stockMap[code];
              const amount = amounts[code] ?? 0;
              const logo = logoByCode.get(code) ?? null;
              const currentPrice = priceMap[code] ?? null;
              const estimatedShares = currentPrice && currentPrice > 0
                ? new Decimal(amount).dividedBy(currentPrice).toDecimalPlaces(4).toNumber()
                : null;
              const estimatedDividend = stock
                ? new Decimal(amount)
                    .times(new Decimal(stock.dividendYield).dividedBy(100))
                    .toDecimalPlaces(0)
                    .toNumber()
                : 0;

              return (
                <li key={code} className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 shrink-0 rounded-xl">
                      {logo && <AvatarImage src={logo} alt="" />}
                      <AvatarFallback className="rounded-xl bg-muted text-[11px] font-semibold text-muted-foreground">
                        {(stock?.stockName ?? code).trim().charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">
                        {stock?.stockName ?? code}
                        <span className="ml-1.5 font-numeric text-xs font-normal text-muted-foreground">
                          {code}
                        </span>
                      </p>
                      {stock && (
                        <p className="font-numeric text-xs tabular-nums text-muted-foreground">
                          연 {new Decimal(stock.dividendYield).toFixed(2)}%
                          {currentPrice !== null && (
                            <span className="ml-2">· 현재가 {formatKRW(currentPrice)}</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-numeric text-sm font-bold tabular-nums text-primary">
                        {formatKRW(estimatedDividend)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">예상 배당</p>
                    </div>
                  </div>

                  {/* 금액 스테퍼 + 예상 주수 */}
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <div>
                      <span className="text-xs text-muted-foreground">매수금액</span>
                      {estimatedShares !== null && (
                        <p className="font-numeric mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                          약 {estimatedShares < 1
                            ? `${estimatedShares.toFixed(4)}주`
                            : `${new Decimal(estimatedShares).toDecimalPlaces(2).toNumber()}주`} 예상
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjust(code, -STEP)}
                        disabled={amount <= MIN_AMOUNT}
                        className="flex size-[30px] items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-30"
                        aria-label={`${stock?.stockName ?? code} 금액 감소`}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="min-w-[96px] text-center font-numeric text-sm font-bold tabular-nums">
                        {formatKRW(amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjust(code, STEP)}
                        className="flex size-[30px] items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted"
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
          <div className="rounded-2xl border border-[#dbe7fb] bg-brand-surface p-3.5">
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
              onClick={enableAutoFx}
              disabled={updateAutoSettings.isPending}
              className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-[13px] font-bold text-white transition-opacity active:opacity-80 disabled:opacity-50"
            >
              <ArrowRightLeft className="size-3.5" />
              {updateAutoSettings.isPending ? "켜는 중…" : "자동환전 켜기"}
            </button>
          </div>
        )}

        {/* 자동환전이 이미 켜져 있으면 결제 방식만 안내 */}
        {hasOverseas && fxSettings?.autoEnabled && (
          <div className="flex items-start gap-2 rounded-xl bg-brand-surface px-3 py-2.5 text-xs text-[#3c5170]">
            <ArrowRightLeft className="mt-px size-3 shrink-0 text-primary" />
            <span>해외 배당주는 만기일에 원화를 달러로 자동환전해 결제돼요.</span>
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
          onClick={() => void handleConfirm()}
          disabled={createReservation.isPending || needAutoFx}
          className={cn(
            "flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white transition-opacity",
            "disabled:opacity-50 active:opacity-80",
          )}
        >
          {createReservation.isPending
            ? "예약 중…"
            : needAutoFx
              ? "자동환전을 켜주세요"
              : codes.length > 1
                ? `${codes.length}종목 예약하기`
                : "예약하기"}
        </button>
      </div>
    </>
  );
}
