"use client";

import { cn } from "@/lib/utils";

export interface QuickAmountChipsProps {
  options: { label: string; value: number | "max" }[];
  onSelect: (value: number | "max") => void;
  className?: string;
}

/** 빠른 금액 선택 칩 (+1만원, +5만원, 전액 등). 값만 emit */
export function QuickAmountChips({
  options,
  onSelect,
  className,
}: QuickAmountChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((opt) => (
        <button
          key={opt.label}
          type="button"
          onClick={() => onSelect(opt.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
