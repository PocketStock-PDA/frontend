"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** 범용 세그먼트 컨트롤 (전체/매수/매도, 일·주·월 등). 활성 = 브랜드 블루.
 *  활성 썸은 layoutId로 선택지 사이를 미끄러진다(상태 전환을 손에 잡히게). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  // 인스턴스마다 고유 썸 — 한 화면에 여러 컨트롤이 있어도 썸끼리 섞이지 않게.
  const thumbId = useId();
  const reduce = useReducedMotion();
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex w-full items-center gap-1 rounded-lg bg-muted p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-thumb-${thumbId}`}
                aria-hidden
                transition={
                  reduce
                    ? { duration: 0 }
                    : { type: "tween", duration: 0.2, ease: [0.22, 1, 0.36, 1] }
                }
                className="absolute inset-0 rounded-md bg-background shadow-sm"
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
