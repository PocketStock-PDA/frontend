"use client";

import { cn } from "@/lib/utils";

export interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  /** 최대값(잔액) 제한 — 초과 입력 시 max로 클램프 */
  max?: number;
  /** 입력란 뒤 단위, 기본 "원" */
  suffix?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const withCommas = (n: number) => n.toLocaleString("ko-KR");

/**
 * 금액 입력. 숫자만 허용, 천 단위 콤마 자동 표기.
 * 빈 값은 0으로 전달하며, max 지정 시 초과분은 max로 클램프된다.
 */
export function AmountInput({
  value,
  onChange,
  max,
  suffix = "원",
  placeholder = "0",
  disabled = false,
  className,
}: AmountInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^\d]/g, "");
    if (digits === "") {
      onChange(0);
      return;
    }
    let next = Number(digits);
    if (max !== undefined && next > max) next = max;
    onChange(next);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b-2 border-border focus-within:border-primary transition-colors",
        disabled && "opacity-50",
        className,
      )}
    >
      <input
        type="text"
        inputMode="numeric"
        value={value > 0 ? withCommas(value) : ""}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className="min-w-0 flex-1 bg-transparent text-right font-numeric text-2xl font-bold tabular-nums outline-none placeholder:text-muted-foreground/50"
      />
      <span className="shrink-0 text-lg font-medium text-muted-foreground">
        {suffix}
      </span>
    </div>
  );
}
