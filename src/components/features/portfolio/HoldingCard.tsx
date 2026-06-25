"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { formatHoldingShort } from "@/lib/utils/pieces";

export interface HoldingCardProps {
  name: string;
  ticker?: string;
  logoUrl?: string | null;
  /** 보유 수량(소수 주) */
  quantity: number;
  evalAmount: number;
  /** 평가손익 */
  profit: number;
  /** 수익률(%) */
  rate: number;
  /** 자동모으기 진행 중 — 배지 노출 */
  isAuto?: boolean;
  /** 보조 라인 대체 텍스트 — 모으기 렌즈에서 일정("매일 10,000원씩")을 보유량 대신 노출 */
  subtitle?: string;
  currency?: "KRW" | "USD";
  onClick?: () => void;
}

/**
 * 보유 종목 카드(전체·모으기 렌즈). 위계: 평가액이 1차, 보유량/손익이 2차.
 * 보유량은 "N주 M조각"으로 정직하게 — 온주가 사라져 보이지 않게 한다.
 */
export function HoldingCard({
  name,
  ticker,
  logoUrl,
  quantity,
  evalAmount,
  profit,
  rate,
  isAuto = false,
  subtitle,
  currency = "KRW",
  onClick,
}: HoldingCardProps) {
  const initial = (ticker ?? name).trim().charAt(0).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Avatar className="shrink-0">
        {logoUrl && <AvatarImage src={logoUrl} alt="" />}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-foreground">
            {name}
          </span>
          {isAuto && (
            <span className="shrink-0 rounded-full bg-brand-surface px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              모으는 중
            </span>
          )}
        </div>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        ) : (
          <p className="mt-0.5 font-numeric text-xs text-muted-foreground">
            {formatHoldingShort(quantity)}
          </p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <AmountDisplay
          value={evalAmount}
          currency={currency}
          size="md"
          className="block font-bold"
        />
        <div className="mt-0.5 flex justify-end">
          <ChangeIndicator
            value={profit}
            suffix={currency === "USD" ? "$" : "원"}
            subPercent={rate}
            size="sm"
          />
        </div>
      </div>
    </button>
  );
}
