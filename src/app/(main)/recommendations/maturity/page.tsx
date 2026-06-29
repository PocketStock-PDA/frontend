"use client";

import { useState, useMemo } from "react";
import Decimal from "decimal.js";
import { Info, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { InstitutionLogo } from "@/components/common/InstitutionLogo";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { MaturityStepper } from "@/components/features/maturity/MaturityStepper";
import { useMaturityRecommendation } from "@/hooks/queries/useMaturityRecommendation";
import { useBankAccounts } from "@/hooks/queries/useBankAccounts";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import { useExchangeRate } from "@/hooks/queries/useExchangeRate";
import { annualWholeShareDividendKrw } from "@/lib/utils/dividend";
import { formatKRW } from "@/lib/utils/currency";
import { parseAccountId } from "@/lib/utils/params";
import { cn } from "@/lib/utils";
import type { DividendStockItem } from "@/types/domain/asset";

// 매수 예약 최소 금액(reserve 단계와 동일)
const MIN_AMOUNT = 1_000;

export default function MaturityPage() {
  const router = useRouter();
  const params = useSearchParams();
  // 선택 화면에서 고른 예적금(유효한 양의 정수만). 없으면 서버가 가장 가까운 만기를 자동 선택.
  const accountId = parseAccountId(params.get("accountId"));
  const { data, isLoading, isError } = useMaturityRecommendation(accountId);
  const { data: fxRate } = useExchangeRate();
  const { data: bankAccounts = [] } = useBankAccounts();
  const [depositRatio, setDepositRatio] = useState(75);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  const account = data?.triggerAccount ?? null;
  const stocks = useMemo(() => data?.recommendations ?? [], [data]);

  const stockCodes = useMemo(() => stocks.map((s) => s.stockCode), [stocks]);
  const stockDetailQueries = useStockDetails(stockCodes);
  const logoByCode = useMemo(() => {
    const m = new Map<string, string | null>();
    stockCodes.forEach((code, i) => m.set(code, stockDetailQueries[i]?.data?.logoUrl ?? null));
    return m;
  }, [stockCodes, stockDetailQueries]);
  // 온주 배당 계산용 현재가(native 통화).
  const priceByCode = useMemo(() => {
    const m = new Map<string, number | null>();
    stockCodes.forEach((code, i) =>
      m.set(code, stockDetailQueries[i]?.data?.price?.currentPrice ?? null),
    );
    return m;
  }, [stockCodes, stockDetailQueries]);

  // 배분 기준은 총 수령액(원금+만기이자) — 만기일에 이자가 입금된 뒤 이 금액으로 집행된다.
  const { depositAmount, dividendAmount } = useMemo(() => {
    if (!account) return { depositAmount: 0, dividendAmount: 0 };
    const total = new Decimal(account.maturityAmount);
    const dAmt = total
      .times(new Decimal(depositRatio).dividedBy(100))
      .toDecimalPlaces(0);
    const vAmt = total.minus(dAmt).toDecimalPlaces(0);
    return { depositAmount: dAmt.toNumber(), dividendAmount: vAmt.toNumber() };
  }, [account, depositRatio]);

  // 선택된 종목별 매수금액 (균등 분배)
  const perStockAmount = useMemo(() => {
    const n = selectedCodes.size;
    if (n === 0 || dividendAmount === 0) return 0;
    return Math.floor(dividendAmount / n);
  }, [selectedCodes.size, dividendAmount]);

  // 중복 차단은 '예적금(계좌)' 단위 — 이미 자금 굴리기로 예약한 계좌는 서버가 추천 후보에서 제외한다.
  // 배당주(종목)는 다른 예적금에서 또 담을 수 있으므로 여기서 막지 않는다.
  const toggleStock = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  // 종목당 매수금액이 최소 주문금액 미만이면 0원 예약이 만들어지므로 진행을 막는다.
  const belowMin = perStockAmount < MIN_AMOUNT;
  const hasSelection = selectedCodes.size > 0;

  const handleGoToReserve = () => {
    if (!account?.accountId || selectedCodes.size === 0 || belowMin) return;
    const items = [...selectedCodes].map((code) => `${code}:${perStockAmount}`).join(",");
    // 선택한 예적금(accountId)을 reserve까지 이어 같은 계좌 기준으로 예약하게 한다.
    const accountQuery = accountId ? `&accountId=${accountId}` : "";
    // 예금 재예치분(슬라이더의 예금 몫)을 함께 넘겨 예약 후 재예치 단계로 잇는다.
    const depositQuery = depositAmount > 0 ? `&deposit=${depositAmount}` : "";
    router.push(`/recommendations/maturity/reserve?items=${items}${accountQuery}${depositQuery}`);
  };

  if (isLoading) {
    return (
      <>
        <AppHeader variant="sub" title="만기 자금 굴리기" />
        <div className="space-y-4">
          <SkeletonCard lines={1} className="h-20" />
          <SkeletonCard lines={3} className="h-32" />
          <SkeletonCard lines={4} className="h-48" />
        </div>
      </>
    );
  }

  if (isError || !data || !account) {
    return (
      <>
        <AppHeader variant="sub" title="만기 자금 굴리기" />
        <EmptyState
          title="만기 예정 계좌가 없어요"
          description="30일 이내 만기 도래 예금·적금이 있을 때 표시됩니다."
        />
      </>
    );
  }

  const [, mm, dd] = account.maturityDate.split("-");
  const formattedMaturity = `${parseInt(mm ?? "0")}/${parseInt(dd ?? "0")}`;
  // 기관 로고 — 보유 계좌 목록과 accountId 조인으로 은행 정보 확보. (#171)
  const bank = bankAccounts.find((a) => a.accountId === account.accountId);

  return (
    <>
      <AppHeader variant="sub" title="만기 자금 굴리기" />
      <MaturityStepper current={1} />

      <div className={cn("space-y-4", hasSelection && "pb-40")}>
        {/* ── 히어로: 만기 자금 (brand-surface) ────────────────────────── */}
        <section className="rounded-2xl bg-brand-surface p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <InstitutionLogo
                code={bank?.bankCode}
                name={bank?.bankName ?? account.accountName}
                className="size-7"
              />
              <p className="text-sm font-semibold text-primary">만기 수령액</p>
            </div>
            <span className="font-numeric text-[18px] font-bold tabular-nums text-primary">
              D-{account.daysUntilMaturity}
            </span>
          </div>
          <p className="mt-1 font-numeric text-[30px] font-semibold leading-tight tabular-nums text-foreground">
            {formatKRW(account.maturityAmount)}
          </p>
          <p className="mt-1.5 font-numeric text-[12.5px] tabular-nums text-[#3c5170]">
            원금 {formatKRW(account.principalAmount)} + 만기 이자 포함 · 연 {account.interestRate}%
          </p>
          <p className="mt-0.5 font-numeric text-[11.5px] tabular-nums text-[#3c5170]">
            {account.accountName} · {formattedMaturity} 만기
          </p>
        </section>

        {/* ── 배분 슬라이더 ────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold text-foreground">얼마나 나눠 담을까요?</p>
          <div className="mt-3.5 flex items-end justify-between">
            <div>
              <p className="text-[11.5px] font-semibold text-muted-foreground">예금 재예치</p>
              <p className="mt-0.5 font-numeric text-[18px] font-bold tabular-nums text-foreground">
                {formatKRW(depositAmount)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11.5px] font-semibold text-primary">배당주 투자</p>
              <p className="mt-0.5 font-numeric text-[18px] font-bold tabular-nums text-primary">
                {formatKRW(dividendAmount)}
              </p>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={depositRatio}
            onChange={(e) => setDepositRatio(Number(e.target.value))}
            aria-label="예금·배당주 배분 비율"
            className="mt-3.5 w-full cursor-pointer appearance-none"
            style={{
              height: "6px",
              borderRadius: "9999px",
              outline: "none",
              background: `linear-gradient(to right, #cfd6df 0%, #cfd6df ${depositRatio}%, #2563eb ${depositRatio}%, #2563eb 100%)`,
            }}
          />
          <div className="mt-2.5 flex items-center justify-between font-numeric text-[11px] tabular-nums">
            <span className="text-muted-foreground">
              예금 <b className="font-bold text-muted-foreground">{depositRatio}%</b>
            </span>
            <span className="text-muted-foreground">
              배당주 <b className="font-bold text-primary">{100 - depositRatio}%</b>
            </span>
          </div>
          <div className="mt-3.5 flex items-start gap-1.5 rounded-xl bg-muted px-3 py-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
            <Info className="mt-px size-3 shrink-0" />
            <span>
              예금은 원금이 보장(예금자보호)되지만, 배당주는 원금·배당이 변동할 수 있어요.
            </span>
          </div>
        </section>

        {/* ── 배당주 고르기 (divide-y 행) ──────────────────────────────── */}
        {dividendAmount > 0 && (
          <section>
            <div className="mb-2.5 flex items-center justify-between px-0.5">
              <h2 className="text-base font-bold text-foreground">배당주 고르기</h2>
              <span className="font-numeric text-xs tabular-nums text-muted-foreground">
                연 {account.interestRate}% 이상
              </span>
            </div>
            {stocks.length === 0 ? (
              <EmptyState
                title="추천 배당주가 없어요"
                description="만기 계좌의 이율보다 높은 배당주가 없어요."
              />
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {stocks.map((stock) => (
                  <li key={stock.stockCode}>
                    <DividendStockRow
                      stock={stock}
                      logoUrl={logoByCode.get(stock.stockCode) ?? null}
                      depositRate={account.interestRate}
                      selected={selectedCodes.has(stock.stockCode)}
                      annualDividend={
                        selectedCodes.has(stock.stockCode)
                          ? annualWholeShareDividendKrw({
                              buyAmountKrw: perStockAmount,
                              currentPrice: priceByCode.get(stock.stockCode) ?? null,
                              perShareDividend: stock.perShareDividend,
                              isUS: stock.market === "US",
                              usdKrwRate: fxRate?.baseRate ?? null,
                            })
                          : null
                      }
                      onSelect={() => toggleStock(stock.stockCode)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {/* ── 하단 고정 요약바 (선택 시) — 네비바 바로 위에 붙임(덮지 않고 간격 없이) ── */}
      {hasSelection && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)/2+4.5rem)] left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-background px-5 pb-3 pt-3">
          {belowMin && (
            <p className="mb-2 text-center text-[11.5px] font-semibold text-red-600">
              종목당 최소 {formatKRW(MIN_AMOUNT)}부터 예약할 수 있어요. 종목 수를 줄이거나
              배당주 비중을 높여주세요.
            </p>
          )}
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground">
              {selectedCodes.size}종목 선택
            </span>
            <span className="text-muted-foreground">
              종목당{" "}
              <b className="font-numeric font-bold tabular-nums text-foreground">
                {formatKRW(perStockAmount)}
              </b>
              씩
            </span>
          </div>
          <button
            type="button"
            onClick={handleGoToReserve}
            disabled={belowMin}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white transition-opacity active:opacity-80 disabled:opacity-50"
          >
            {selectedCodes.size}종목 예약 확인하기
          </button>
        </div>
      )}
    </>
  );
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

// "YYYY-MM-DD" → "M/D"
function formatMonthDay(dateStr: string): string {
  const [, mm, dd] = dateStr.split("-");
  return `${parseInt(mm ?? "0")}/${parseInt(dd ?? "0")}`;
}

interface DividendStockRowProps {
  stock: DividendStockItem;
  logoUrl: string | null;
  depositRate: number;
  selected: boolean;
  /** 선택 종목의 연 배당액(온주 기준, 원). 1주당 배당금·현재가 없으면 null, 미선택이면 무시. */
  annualDividend: number | null;
  onSelect: () => void;
}

function DividendStockRow({
  stock,
  logoUrl,
  depositRate,
  selected,
  annualDividend,
  onSelect,
}: DividendStockRowProps) {
  const yieldStr = new Decimal(stock.dividendYield).toFixed(2);
  const deltaPp = new Decimal(stock.dividendYield).minus(depositRate).toDecimalPlaces(1);
  const initial = stock.stockName.trim().charAt(0).toUpperCase();

  // 1주당 배당금은 시장 무관 원화(KRW).
  const metaParts: string[] = [];
  if (stock.perShareDividend !== null) {
    metaParts.push(`1주당 ${formatKRW(stock.perShareDividend)}`);
  }
  if (stock.payDate) metaParts.push(`지급 ${formatMonthDay(stock.payDate)}`);
  else if (stock.exDividendDate) metaParts.push(`배당락 ${formatMonthDay(stock.exDividendDate)}`);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150",
        selected
          ? "bg-brand-surface hover:bg-brand-surface/70"
          : "bg-card hover:bg-muted/40",
      )}
    >
      <Avatar className="size-9 shrink-0 rounded-xl">
        {logoUrl && <AvatarImage src={logoUrl} alt="" />}
        <AvatarFallback className="rounded-xl bg-muted text-[11px] font-semibold text-muted-foreground">
          {initial}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-foreground">
          {stock.stockName}
        </p>
        <p className="mt-0.5 font-numeric text-[11.5px] tabular-nums text-muted-foreground">
          {metaParts.join(" · ")}
          {metaParts.length > 0 && " · "}
          <span className="font-bold text-up">+{deltaPp.toString()}%p</span>
        </p>
        {selected && (
          <p
            className={cn(
              "mt-0.5 font-numeric text-[11.5px] font-bold tabular-nums",
              annualDividend === null ? "text-muted-foreground" : "text-primary",
            )}
          >
            {annualDividend === null
              ? "배당 정보 없음"
              : `연 ${formatKRW(annualDividend)} 배당 예상`}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <span className="font-numeric text-[17px] font-bold tabular-nums text-foreground">
          {yieldStr}%
        </span>
        <span
          className={cn(
            "grid size-[22px] place-items-center rounded-full border-2 transition-colors",
            selected
              ? "border-primary bg-primary text-white"
              : "border-border bg-card text-transparent",
          )}
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
      </div>
    </button>
  );
}
