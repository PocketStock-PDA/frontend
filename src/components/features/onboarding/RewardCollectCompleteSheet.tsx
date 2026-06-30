"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const GRADIENT = "linear-gradient(120deg, #4a7dff 0%, #6f9bff 100%)";
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

interface RewardCollectCompleteSheetProps {
  open: boolean;
  onConfirm: () => void;
}

export function RewardCollectCompleteSheet({
  open,
  onConfirm,
}: RewardCollectCompleteSheetProps) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.99 }}
          transition={{ duration: 0.38, ease: EASE_OUT }}
          className="overflow-hidden rounded-2xl p-4 text-white"
          style={{ backgroundImage: GRADIENT }}
          role="status"
          aria-live="polite"
        >
          {/* 타이틀 */}
          <h2 className="mb-1 text-[17px] font-bold tracking-[-0.015em] text-white">
            잔돈이 CMA로 모였어요!
          </h2>

          {/* 설명 */}
          <p className="mb-4 text-[13px] leading-snug text-white/75">
            이제 소수점 주식에 투자해볼까요?
          </p>

          {/* CTA */}
          <motion.button
            type="button"
            onClick={onConfirm}
            {...(!reduce && { whileTap: { scale: 0.98 } })}
            className="h-[46px] w-full rounded-[10px] bg-white text-[14px] font-bold text-[#2563eb] shadow-[0_6px_16px_rgba(20,50,180,0.2)] transition-opacity hover:opacity-90 active:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            지금 바로 투자하기
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
