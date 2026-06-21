"use client";

import Decimal from "decimal.js";
import { Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { ProgressBar } from "@/components/common/ProgressBar";

export interface HoldingCardProps {
  name: string;
  ticker?: string;
  logoUrl?: string | null;
  /** 채운 조각 수 */
  pieces: number;
  total?: number;
  quantity: number;
  evalAmount: number;
  /** 평가손익 */
  profit: number;
  /** 수익률(%) */
  rate: number;
  onClick?: () => void;
  onSettings?: () => void;
}

/** 포트폴리오 보드 종목 카드: 로고/이름 + 조각·주수 + 평가/손익 + 진행바 */
export function HoldingCard({
  name,
  ticker,
  logoUrl,
  pieces,
  total = 100,
  quantity,
  evalAmount,
  profit,
  rate,
  onClick,
  onSettings,
}: HoldingCardProps) {
  const initial = (ticker ?? name).trim().charAt(0).toUpperCase();
  const shares = new Decimal(quantity).toDecimalPlaces(4).toString();

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="cursor-pointer rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <Avatar>
          {logoUrl && <AvatarImage src={logoUrl} alt={name} />}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{name}</p>
          <p className="font-numeric text-xs text-muted-foreground">
            {pieces}조각 · {shares}주
          </p>
        </div>

        <div className="shrink-0 text-right">
          <AmountDisplay value={evalAmount} size="md" className="font-bold" />
          <div className="flex items-center justify-end gap-1">
            <ChangeIndicator
              value={profit}
              suffix="원"
              size="sm"
              showArrow={false}
            />
            <ChangeIndicator value={rate} percent size="sm" />
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSettings?.();
          }}
          aria-label="모으기 설정"
          className="-mr-1 -mt-1 shrink-0 p-1 text-muted-foreground"
        >
          <Settings className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <ProgressBar value={(pieces / total) * 100} className="flex-1" />
        <span className="font-numeric text-xs text-muted-foreground">
          {pieces}/{total}
        </span>
      </div>
    </div>
  );
}
