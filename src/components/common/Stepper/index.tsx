"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  /** 소수 자리수 (0.5주 등). 기본 0 */
  precision?: number;
  suffix?: string;
  /** ±증감 빠른 칩 (예: [1, 10] → ±1주 ±10주) */
  quickSteps?: number[];
  className?: string;
}

function round(n: number, precision: number) {
  const f = 10 ** precision;
  return Math.round(n * f) / f;
}

/** 수량 증감 (- [값] +) + 빠른 증감 칩 */
export function Stepper({
  value,
  onChange,
  step = 1,
  min,
  max,
  precision = 0,
  suffix = "",
  quickSteps,
  className,
}: StepperProps) {
  const clamp = (n: number) => {
    let next = n;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    return round(next, precision);
  };

  const apply = (delta: number) => onChange(clamp(value + delta));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between rounded-xl border border-border px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => apply(-step)}
          disabled={min !== undefined && value <= min}
          aria-label="감소"
        >
          <Minus />
        </Button>
        <span className="font-numeric text-lg font-bold tabular-nums">
          {value.toLocaleString("ko-KR", { maximumFractionDigits: precision })}
          {suffix && (
            <span className="ml-0.5 text-sm font-medium text-muted-foreground">
              {suffix}
            </span>
          )}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => apply(step)}
          disabled={max !== undefined && value >= max}
          aria-label="증가"
        >
          <Plus />
        </Button>
      </div>

      {quickSteps && quickSteps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickSteps.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => apply(q)}
              className="rounded-lg border border-border bg-background px-3 py-1 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              +{q}
              {suffix}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
