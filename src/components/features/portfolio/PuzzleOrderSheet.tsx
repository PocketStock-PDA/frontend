"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
  /** 1조각당 금액 (= 현재가 / 100) */
  perPieceAmount: number;
  /** 통화별 금액 포맷터 (부모가 종목 통화에 맞춰 주입: KRW/USD) */
  formatAmount: (amount: number) => string;
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
  amount,
  perPieceAmount,
  formatAmount,
  onConfirm,
  pending = false,
}: PuzzleOrderSheetProps) {
  const isBuy = mode === "buy";
  const after = isBuy ? currentFilled + pieces : currentFilled - pieces;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="gap-0 rounded-t-2xl px-5 pb-7 pt-3">
        <SheetHeader className="p-0">
          <div className="flex items-baseline gap-2 pr-8">
            <SheetTitle className="text-lg font-bold">{stockName}</SheetTitle>
            <span className="font-numeric text-xs text-muted-foreground">
              1조각 {formatAmount(perPieceAmount)}
            </span>
          </div>
          {/* 시각 정보는 아래 요약이 담당 — 설명은 스크린리더용 */}
          <SheetDescription className="sr-only">
            {isBuy ? "매수" : "매도"} {pieces}조각, {isBuy ? "예상 결제" : "예상 수령"}{" "}
            금액 {formatAmount(amount)}
          </SheetDescription>
        </SheetHeader>

        {/* 요약 — 낼/받을 금액을 히어로로, 조각·진행은 보조 한 줄 */}
        <div className="mt-3 rounded-2xl bg-muted p-4">
          <p className="text-xs font-medium text-muted-foreground">
            {isBuy ? "예상 결제 금액" : "예상 수령 금액"}
          </p>
          <p className="mt-0.5 font-numeric text-3xl font-bold tracking-tight text-foreground">
            {formatAmount(amount)}
          </p>
          <p className="mt-2 font-numeric text-[13px] text-muted-foreground">
            <span className={cn("font-bold", isBuy ? "text-up" : "text-down")}>
              {isBuy ? "매수" : "매도"} {pieces}조각
            </span>
            {" · "}
            {currentFilled} → {after}조각
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
