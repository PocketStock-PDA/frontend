"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

export interface PuzzleOrderSheetProps {
  open: boolean;
  onClose: () => void;
  mode: "buy" | "sell";
  stockName: string;
  /** 선택한 조각 수 */
  pieces: number;
  /** 현재 채워진 조각 수 */
  currentFilled: number;
  total: number;
  /** ≈ 주문 금액 (부모가 decimal.js로 계산해 전달) */
  amount: number;
  onConfirm: () => void;
  pending?: boolean;
}

/** 퍼즐 조각 매수/매도 바텀시트 (16-A/B) */
export function PuzzleOrderSheet({
  open,
  onClose,
  mode,
  stockName,
  pieces,
  currentFilled,
  total,
  amount,
  onConfirm,
  pending = false,
}: PuzzleOrderSheetProps) {
  const isBuy = mode === "buy";
  const after = isBuy ? currentFilled + pieces : currentFilled - pieces;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="gap-0 rounded-t-2xl px-5 pb-7 pt-3">
        <SheetHeader className="p-0 pb-1">
          <SheetTitle className="text-base font-bold">{stockName}</SheetTitle>
          <SheetDescription className="text-xs">
            {isBuy ? "빈" : "채운"} 조각 {pieces}개 선택됨
          </SheetDescription>
        </SheetHeader>

        <div
          className={cn(
            "mt-2 space-y-2 rounded-xl p-4",
            isBuy ? "bg-up/5" : "bg-down/5",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {isBuy ? "매수" : "매도"} 조각
            </span>
            <span
              className={cn(
                "font-numeric text-lg font-bold",
                isBuy ? "text-up" : "text-down",
              )}
            >
              {pieces}조각
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">금액</span>
            <span className="font-numeric text-lg font-bold text-foreground">
              ≈ {formatKRW(amount)}
            </span>
          </div>
          <p className="text-right font-numeric text-xs text-muted-foreground">
            {currentFilled}/{total} → {after}/{total}조각
          </p>
        </div>

        <Button
          onClick={onConfirm}
          disabled={pending || pieces <= 0}
          className={cn(
            "mt-4 h-12 w-full text-base font-bold text-white",
            isBuy ? "bg-up hover:bg-up/90" : "bg-down hover:bg-down/90",
          )}
        >
          {pieces}조각 {isBuy ? "매수하기" : "매도하기"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
