"use client";

import { JigsawPuzzle } from "@/components/features/portfolio/JigsawPuzzle";
import { ChangeIndicator } from "@/components/common/ChangeIndicator";
import { formatPieces, PIECES_PER_SHARE } from "@/lib/utils/pieces";

export interface PiecesCardProps {
  name: string;
  ticker?: string;
  logoUrl?: string | null;
  /** 보유 수량(소수 주) — "보유 N주" 병기용 */
  quantity: number;
  /** 소수 잔여분 조각(0~100) */
  pieces: number;
  /** 평가손익 */
  profit: number;
  /** 수익률(%) — 등락 표시 */
  rate: number;
  currency?: "KRW" | "USD";
  onClick?: () => void;
}

/**
 * 조각 렌즈 카드. 상세(?view=pieces)의 "퍼즐 현황"을 정적 썸네일로 미리 보여준다 —
 * 채운 조각으로 로고가 드러나는 시그니처 그림이 리스트에서 바로 읽히게.
 * 로고가 곧 종목 표식이라 별도 아바타는 두지 않는다. "보유 N주"를 병기해 온주가 사라져 보이지 않게 한다.
 */
export function PiecesCard({
  name,
  logoUrl,
  quantity,
  pieces,
  profit,
  rate,
  currency = "KRW",
  onClick,
}: PiecesCardProps) {
  const shares = quantity.toLocaleString("ko-KR", { maximumFractionDigits: 4 });

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-[background-color,transform] duration-150 ease-out hover:bg-muted/40 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {/* 퍼즐 미리보기 — 상세 "퍼즐 현황"과 같은 조각 그림(정적). 채운 만큼 로고가 드러난다. */}
      <div className="w-[76px] shrink-0">
        <JigsawPuzzle
          preview
          total={PIECES_PER_SHARE}
          filled={pieces}
          logoUrl={logoUrl ?? null}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-bold text-foreground">{name}</p>
          <ChangeIndicator
            value={profit}
            suffix={currency === "USD" ? "" : "원"}
            prefix={currency === "USD" ? "$" : ""}
            subPercent={rate}
            size="sm"
            className="shrink-0"
          />
        </div>
        <p className="mt-0.5 font-numeric text-xs text-muted-foreground">
          보유 {shares}주
        </p>
        <p className="mt-2 flex items-baseline gap-1">
          <span className="font-numeric text-lg font-bold leading-none text-primary">
            {formatPieces(pieces)}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            / {PIECES_PER_SHARE}조각
          </span>
        </p>
      </div>
    </button>
  );
}
