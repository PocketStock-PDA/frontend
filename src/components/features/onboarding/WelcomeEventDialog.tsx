"use client";

import { Puzzle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 px-6 pb-6 pt-8 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Puzzle className="size-7" aria-hidden />
        </div>
        <p className="text-sm font-bold text-primary">첫 가입 이벤트</p>
        <DialogTitle className="mt-1 text-xl font-bold leading-snug text-foreground">
          포켓스톡으로
          <br />
          주식을 모아보세요!
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-muted-foreground">
          잔돈이 쌓이면 고른 주식을 자동으로 담아드려요
        </DialogDescription>

        <div className="mt-5 rounded-xl bg-primary/5 px-4 py-3">
          <p className="text-sm font-bold text-primary">첫 주식 무료 지급</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            1,000원 상당 소수점 주식을 드려요
          </p>
        </div>

        <Button
          onClick={onProceed}
          className="mt-5 h-12 w-full text-base font-bold"
        >
          {ctaLabel}
        </Button>
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="mt-2 h-11 w-full font-normal text-muted-foreground"
        >
          나중에
        </Button>
      </DialogContent>
    </Dialog>
  );
}
