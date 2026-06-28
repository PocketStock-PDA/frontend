"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { toDecimal } from "@/lib/utils/decimal";
import { cn } from "@/lib/utils";

export interface CmaBalanceCardProps {
  /** CMA 계좌번호 */
  accountNo?: string;
  /** 원화 잔액 */
  krwBalance: number;
  /** 달러 잔액(USD) */
  usdBalance: number;
  /** 연이율 (0.035 = 3.5%) */
  interestRate: number;
  /** 오늘 발생 이자(원) */
  todayInterest: number;
  /** 1 USD = ?원 (펼침 시 환율 기준 표기). 미지정 시 환율 줄 숨김 */
  usdToKrwRate?: number;
  className?: string;
}

function BalanceRow({
  symbol,
  label,
  value,
}: {
  symbol: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-white/20 text-xs font-bold">
          {symbol}
        </span>
        <span className="text-sm text-white/80">{label}</span>
      </div>
      <span className="font-numeric text-sm font-bold">{value}</span>
    </div>
  );
}

/** 홈 포켓스톡 CMA 잔액 카드. '상세보기'로 원화/달러 잔액을 펼친다. */
export function CmaBalanceCard({
  accountNo,
  krwBalance,
  usdBalance,
  interestRate,
  todayInterest,
  usdToKrwRate,
  className,
}: CmaBalanceCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  // 백엔드 숫자 필드 null 가능 → toDecimal/formatKRW로 방어
  const ratePct = toDecimal(interestRate).times(100).toDecimalPlaces(2).toNumber();
  const todayInterestText = formatKRW(todayInterest); // "1,234원"

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0046FF 0%, #6B3FF5 100%)",
      }}
      className={cn("rounded-xl p-5 text-white", className)}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/90">
          포켓스톡 CMA{accountNo ? ` - ${accountNo}` : ""}
        </p>
        <button
          type="button"
          onClick={() => router.push("/cma")}
          className="flex items-center gap-0.5 text-sm text-white/90"
        >
          거래내역
          <ChevronRight className="size-4" />
        </button>
      </div>
      <AmountDisplay
        value={krwBalance}
        currency="KRW"
        size="lg"
        className="mt-1 text-white"
      />
      <p className="mt-1 text-sm text-white/80">
        연 {ratePct}% · 오늘 이자 +{todayInterestText}
      </p>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mt-3 flex w-full items-center justify-end gap-0.5 text-sm text-white/90"
      >
        {expanded ? "접기" : "상세보기"}
        {expanded ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-white/20 pt-3">
          <BalanceRow
            symbol="₩"
            label="원화 잔액"
            value={formatKRW(krwBalance)}
          />
          <BalanceRow
            symbol="$"
            label="달러 잔액"
            value={formatUSD(usdBalance)}
          />
          {usdToKrwRate !== undefined && (
            <p className="text-right text-xs text-white/60">
              1 USD = {formatKRW(usdToKrwRate)} 기준
            </p>
          )}
        </div>
      )}
    </div>
  );
}
