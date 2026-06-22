"use client";

import { useState } from "react";
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
  /** 값 직접 입력 허용 (숫자 타이핑). 기본 false */
  editable?: boolean;
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
  editable = false,
  className,
}: StepperProps) {
  // 입력 중 임시 문자열(예: "0." 같은 중간 상태 허용). null이면 value를 표시.
  const [draft, setDraft] = useState<string | null>(null);

  const clamp = (n: number) => {
    let next = n;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    return round(next, precision);
  };

  const apply = (delta: number) => onChange(clamp(value + delta));

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    if (precision === 0) {
      raw = raw.replace(/[^\d]/g, "");
    } else {
      raw = raw.replace(/[^\d.]/g, "");
      const dot = raw.indexOf(".");
      if (dot !== -1) {
        raw = raw.slice(0, dot + 1) + raw.slice(dot + 1).replace(/\./g, "");
      }
    }
    setDraft(raw);
    if (raw === "" || raw === ".") {
      onChange(clamp(0));
      return;
    }
    const n = Number(raw);
    if (!Number.isNaN(n)) onChange(clamp(n));
  };

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
        {editable ? (
          <div className="flex min-w-0 flex-1 items-baseline justify-center">
            <input
              type="text"
              inputMode={precision === 0 ? "numeric" : "decimal"}
              value={draft ?? String(value)}
              onChange={handleInput}
              onFocus={(e) => e.target.select()}
              onBlur={() => setDraft(null)}
              aria-label="수량"
              className="w-full min-w-0 rounded bg-transparent text-center font-numeric text-lg font-bold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            {suffix && (
              <span className="ml-0.5 shrink-0 text-sm font-medium text-muted-foreground">
                {suffix}
              </span>
            )}
          </div>
        ) : (
          <span className="font-numeric text-lg font-bold tabular-nums">
            {value.toLocaleString("ko-KR", { maximumFractionDigits: precision })}
            {suffix && (
              <span className="ml-0.5 text-sm font-medium text-muted-foreground">
                {suffix}
              </span>
            )}
          </span>
        )}
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
