"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PinKeypadProps {
  value: string;
  onChange: (value: string) => void;
  /** 자리수, 기본 6 */
  length?: number;
  className?: string;
}

/** 숫자 키패드 (점 표시 + 0~9·지우기). 계좌/간편 비밀번호 입력용 */
export function PinKeypad({
  value,
  onChange,
  length = 6,
  className,
}: PinKeypadProps) {
  const press = (d: string) => {
    if (value.length < length) onChange(value + d);
  };
  const back = () => onChange(value.slice(0, -1));

  return (
    <div className={cn("space-y-10", className)}>
      {/* 입력 점 */}
      <div className="flex justify-center gap-3.5">
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-full transition-colors",
              i < value.length ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>

      {/* 키패드 */}
      <div className="grid grid-cols-3 gap-x-8 gap-y-5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => press(d)}
            className="py-2 text-2xl font-semibold text-foreground transition-colors active:text-primary"
          >
            {d}
          </button>
        ))}
        <span />
        <button
          type="button"
          onClick={() => press("0")}
          className="py-2 text-2xl font-semibold text-foreground transition-colors active:text-primary"
        >
          0
        </button>
        <button
          type="button"
          onClick={back}
          aria-label="지우기"
          className="flex items-center justify-center py-2 text-muted-foreground"
        >
          <Delete className="size-6" />
        </button>
      </div>
    </div>
  );
}
