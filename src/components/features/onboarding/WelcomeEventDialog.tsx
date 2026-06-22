"use client";

import { Plus } from "lucide-react";
import Decimal from "decimal.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWelcomeRewardCandidates } from "@/hooks/queries/useWelcomeRewards";
import { useStockDetail } from "@/hooks/queries/useStockDetail";
import { formatKRW } from "@/lib/utils/currency";

const REWARD_QTY = 0.01; // 소수점 0.01주 (시안 기준)

export interface WelcomeEventDialogProps {
  open: boolean;
  /** X·오버레이·Esc·"나중에" → 닫기 */
  onOpenChange: (open: boolean) => void;
  /** "다음으로" → 계좌 개설로 진입 */
  onProceed: () => void;
}

/** 첫 가입 기념 — 소수점 주식 무료 지급 이벤트 팝업 (issue #34) */
export function WelcomeEventDialog({
  open,
  onOpenChange,
  onProceed,
}: WelcomeEventDialogProps) {
  // 예상 지급 금액용 대표 종목 (삼성전자 우선, 없으면 1순위)
  const candidatesQ = useWelcomeRewardCandidates(open);
  const rep =
    candidatesQ.data?.find((c) => c.stockCode === "005930") ??
    candidatesQ.data?.[0];
  const repDetailQ = useStockDetail(rep?.stockCode ?? "");
  const estimate =
    rep && repDetailQ.data
      ? new Decimal(repDetailQ.data.price.currentPrice).times(REWARD_QTY)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 px-6 pb-6 pt-8 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Plus className="size-7" />
        </div>
        <p className="text-sm font-bold text-primary">첫 가입 기념 이벤트</p>
        <DialogTitle className="mt-1 text-xl font-bold leading-snug text-foreground">
          소수점 주식 {REWARD_QTY}주를
          <br />
          무료로 드려요
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-muted-foreground">
          종목을 고르면 바로 지급돼요
          <br />
          다음 화면에서 선택하세요
        </DialogDescription>

        {estimate && rep && (
          <div className="mt-5 rounded-xl bg-primary/5 px-4 py-3 text-left">
            <p className="text-xs text-muted-foreground">예상 지급 금액</p>
            <p className="font-numeric text-sm font-bold text-primary">
              {rep.stockName} 기준 약{" "}
              {formatKRW(estimate.toDecimalPlaces(0).toString())} 상당
            </p>
          </div>
        )}

        <Button
          onClick={onProceed}
          className="mt-5 h-12 w-full text-base font-bold"
        >
          다음으로
        </Button>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-2 py-1 text-sm text-muted-foreground"
        >
          나중에
        </button>
      </DialogContent>
    </Dialog>
  );
}
