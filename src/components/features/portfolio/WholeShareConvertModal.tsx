"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PuzzleAssembly } from "@/components/features/portfolio/PuzzleAssembly";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  logoUrl?: string | null;
  fractionalQty: string;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function WholeShareConvertModal({
  open,
  logoUrl,
  fractionalQty,
  isPending,
  onConfirm,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 배경 dim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />

          {/* 카드 — view=pieces 섹션과 동일한 디자인 언어 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ type: "spring", stiffness: 400, damping: 28, mass: 0.7 }}
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-[340px] -translate-y-1/2 rounded-3xl bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 조립 애니메이션 — 조각들이 날아와 퍼즐을 완성하고 로고로 dissolve */}
            <PuzzleAssembly logoUrl={logoUrl} startDelay={0.35} />

            {/* 설명 */}
            <p className="mt-3 text-center text-sm text-muted-foreground">
              소수점 주식{" "}
              <span className="font-numeric font-bold text-foreground">
                {fractionalQty}주
              </span>
              를 온주로 전환하고
              <br />
              의결권을 가져 보세요!
            </p>

            {/* 액션 */}
            <div className="mt-4">
              <Button
                className="h-12 w-full bg-white text-base font-bold text-primary shadow-none ring-1 ring-border hover:bg-muted/60"
                onClick={onConfirm}
                disabled={isPending}
              >
                {isPending ? "전환 중" : "전환하기"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
