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
  /** CTA → 진입(계좌 개설 또는 종목 선택) */
  onProceed: () => void;
  /** 메인 버튼 라벨 (기본: 종목 선택하러 가기) */
  ctaLabel?: string;
}

/** 첫 가입 기념 — 소수점 주식 무료 지급 이벤트 팝업 (issue #34·#36) */
export function WelcomeEventDialog({
  open,
  onOpenChange,
  onProceed,
  ctaLabel = "종목 선택하러 가기",
}: WelcomeEventDialogProps) {
  // 예상 지급 금액용 대표 종목 (삼성전자 우선, 없으면 1순위)
  const candidatesQ = useWelcomeRewardCandidates(open);
  const rep =
    candidatesQ.data?.find((c) => c.stockCode === "005930") ??
    candidatesQ.data?.[0];
  const repDetailQ = useStockDetail(rep?.stockCode ?? "");
  const estimate =
    rep && repDetailQ.data?.price
      ? new Decimal(repDetailQ.data.price.currentPrice).times(REWARD_QTY)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 px-6 pb-6 pt-8 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Plus className="size-7" />
        </div>
        <p className="text-sm font-bold text-primary">첫 가입 이벤트</p>
        <DialogTitle className="mt-1 text-xl font-bold leading-snug text-foreground">
          포켓스톡으로
          <br />
          주식을 모아보세요!
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-muted-foreground">
          잔돈이 쌓일 때마다 자동으로
          <br />
          내가 고른 주식을 조금씩 담아드려요
          <br />
          지금 종목을 골라보세요
        </DialogDescription>

        <div className="mt-5 rounded-xl bg-primary/5 px-4 py-3">
          <p className="text-sm font-bold text-primary">
            가입 기념 · 첫 주식 {REWARD_QTY}주 무료 지급
          </p>
          {estimate && rep && (
            <p className="font-numeric mt-0.5 text-xs text-muted-foreground">
              {rep.stockName} 기준 약{" "}
              {formatKRW(estimate.toDecimalPlaces(0).toString())} 상당
            </p>
          )}
        </div>

        <Button
          onClick={onProceed}
          className="mt-5 h-12 w-full text-base font-bold"
        >
          {ctaLabel}
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
