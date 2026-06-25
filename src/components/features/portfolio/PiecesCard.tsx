"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/common/ProgressBar";
import { formatPieces, PIECES_PER_SHARE } from "@/lib/utils/pieces";

export interface PiecesCardProps {
  name: string;
  ticker?: string;
  logoUrl?: string | null;
  /** 보유 수량(소수 주) — "보유 N주" 병기용 */
  quantity: number;
  /** 소수 잔여분 조각(0~100) */
  pieces: number;
  onClick?: () => void;
}

/**
 * 조각 렌즈 카드(퍼즐 전면). 소수 잔여분을 "다음 1주까지" 퍼즐로 보여주는 시그니처 모멘트.
 * "보유 N주"를 작게 병기해 온주가 사라져 보이지 않게 한다(정직한 숫자).
 */
export function PiecesCard({
  name,
  ticker,
  logoUrl,
  quantity,
  pieces,
  onClick,
}: PiecesCardProps) {
  const initial = (ticker ?? name).trim().charAt(0).toUpperCase();
  const remaining = Math.max(0, PIECES_PER_SHARE - pieces);
  const shares = quantity.toLocaleString("ko-KR", { maximumFractionDigits: 4 });

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="flex items-center gap-3">
        <Avatar className="shrink-0">
          {logoUrl && <AvatarImage src={logoUrl} alt="" />}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
          {name}
        </span>
        <span className="shrink-0 font-numeric text-xs text-muted-foreground">
          보유 {shares}주
        </span>
      </div>

      <div className="mt-3">
        <ProgressBar
          value={pieces}
          aria-label={`${name} 조각 ${formatPieces(pieces)}/${PIECES_PER_SHARE}`}
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="font-numeric text-xs font-semibold text-primary">
            {formatPieces(pieces)} / {PIECES_PER_SHARE} 조각
          </span>
          <span className="text-xs text-muted-foreground">
            다음 1주까지 {formatPieces(remaining)}조각
          </span>
        </div>
      </div>
    </button>
  );
}
