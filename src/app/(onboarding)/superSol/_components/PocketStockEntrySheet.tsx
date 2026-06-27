"use client";

import Image from "next/image";
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
}

/**
 * 부모 서비스(슈퍼쏠)에서 포켓스톡으로 넘어오는 진입 팝업 — 파란 그라데이션 바텀시트.
 * superSol 은 진입점이라 닫기·오늘 보지 않기 없이 "시작하기"로만 빠져나간다(무조건 노출).
 */
export function PocketStockEntrySheet({
  open,
  onOpenChange,
  onStart,
}: PocketStockEntrySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        // 진입점 팝업 — 외부 클릭/ESC 로 닫히지 않도록(시작하기로만 이동)
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
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
          <div className="flex size-[68px] items-center justify-center rounded-[8px] bg-white p-px shadow-[0_10px_24px_rgba(20,40,120,0.25)] ring-1 ring-white/60">
            <Image
              src="/images/PocketStock-logo-clean.png"
              alt="포켓스톡"
              width={62}
              height={62}
              className="size-full object-contain"
            />
          </div>

          {/* 카피 */}
          <SheetTitle className="mt-5 text-center text-[20px] font-bold leading-snug text-white">
            포인트로 소수점 주식을
            <br />
            자동으로 모아보세요!
          </SheetTitle>
          <SheetDescription className="mt-2 text-center text-[13px] leading-relaxed text-white/80">
            신한계열사의 흩어진 잔돈과 포인트가 주식 한 조각이 됩니다
          </SheetDescription>

          {/* CTA */}
          <button
            type="button"
            onClick={onStart}
            className="mt-6 w-full rounded-2xl bg-white py-4 text-center text-[15px] font-bold text-[#2f6bff] shadow-[0_8px_18px_rgba(20,40,120,0.18)] transition active:scale-[0.99]"
          >
            시작하기
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
