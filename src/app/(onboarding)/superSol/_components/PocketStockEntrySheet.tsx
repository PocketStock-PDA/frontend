"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

// 마이신한포인트 카드와 동일한 그라데이션
const POINT_GRADIENT = "linear-gradient(120deg, #4a7dff 0%, #6f9bff 100%)";

interface PocketStockEntrySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "시작하기" — 포켓스톡(메인 홈)으로 진입 */
  onStart: () => void;
  /** "오늘 보지 않기" — 닫고 오늘 하루 자동 노출 안 함 */
  onHideToday: () => void;
}

/**
 * 부모 서비스(슈퍼쏠)에서 포켓스톡으로 넘어오는 진입 팝업 — 파란 그라데이션 바텀시트.
 */
export function PocketStockEntrySheet({
  open,
  onOpenChange,
  onStart,
  onHideToday,
}: PocketStockEntrySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-w-[430px] gap-0 overflow-hidden rounded-t-[28px] border-0 px-6 pb-8 pt-3 text-white"
        style={{ backgroundImage: POINT_GRADIENT }}
      >
        {/* 장식용 소프트 글로우 */}
        <span
          aria-hidden
          className="pointer-events-none absolute -left-12 -top-14 size-36 rounded-full bg-white/15 blur-2xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -right-10 size-40 rounded-full bg-white/10 blur-2xl"
        />

        <div className="relative flex flex-col items-center">
          {/* 그랩 핸들 */}
          <span className="mb-6 h-1.5 w-10 rounded-full bg-white/40" />

          {/* 로고 */}
          <div className="flex size-[68px] items-center justify-center rounded-[20px] bg-white p-2.5 shadow-[0_10px_24px_rgba(20,40,120,0.25)] ring-1 ring-white/60">
            <Image
              src="/images/PocketStock-logo.png"
              alt="포켓스톡"
              width={52}
              height={52}
              className="size-full object-contain"
            />
          </div>

          {/* 카피 */}
          <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium text-white">
            <Star className="size-3 fill-white stroke-none" />
            잔돈으로 주식 자동 모으기
          </span>
          <SheetTitle className="mt-2.5 text-center text-[19px] font-bold leading-snug text-white">
            포인트로 소수점 주식
            <br />
            자동으로 모아보세요!
          </SheetTitle>
          <SheetDescription className="mt-2 text-center text-[13px] leading-relaxed text-white/80">
            남는 포인트와 잔돈이 자동으로
            <br />
            주식 한 조각이 됩니다
          </SheetDescription>

          {/* CTA */}
          <button
            type="button"
            onClick={onStart}
            className="mt-6 w-full rounded-2xl bg-white py-4 text-center text-[15px] font-bold text-[#2f6bff] shadow-[0_8px_18px_rgba(20,40,120,0.18)] transition active:scale-[0.99]"
          >
            시작하기
          </button>

          {/* 보조 링크 */}
          <div className="mt-4 flex items-center gap-4 text-xs font-medium text-white/80">
            <button type="button" onClick={onHideToday}>
              오늘 보지 않기
            </button>
            <span className="h-3 w-px bg-white/30" />
            <button type="button" onClick={() => onOpenChange(false)}>
              닫기
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
