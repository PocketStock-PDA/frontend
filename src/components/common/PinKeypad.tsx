"use client";

import { useRef, useState } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PinKeypadProps {
  value: string;
  onChange: (value: string) => void;
  /** 자리수, 기본 6 */
  length?: number;
  /** 입력 잠금 (제출 진행 중 등) */
  disabled?: boolean;
  /**
   * 보안 키패드(계좌 비밀번호 전용).
   * - 열 때마다 숫자 배열을 셔플(매번 다른 배치)
   * - 터치 시 누른 칸 + 임의의 다른 숫자 칸도 함께 눌린 것처럼 표시(어깨너머 훔쳐보기 방지)
   */
  secure?: boolean;
  className?: string;
}

const DEL = "del";
// 기본(비보안) 배치 — 기존 레이아웃과 동일(1~9, 빈칸, 0, 지우기)
const FIXED_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", DEL];

/** 0~9 + 빈칸 1개를 셔플하고 지우기는 우하단 고정 → 12칸 배열 */
function shuffledKeys(): string[] {
  const slots = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ""];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = slots[i];
    const b = slots[j];
    if (a !== undefined && b !== undefined) {
      slots[i] = b;
      slots[j] = a;
    }
  }
  return [...slots, DEL];
}

/** 누른 칸(index) 외 임의의 다른 숫자 칸 2~3개를 디코이로 고른다. (모듈 함수 — 렌더 순수성 유지) */
function pickDecoys(keys: string[], index: number): number[] {
  const digitIdx = keys.flatMap((k, i) =>
    k !== "" && k !== DEL && i !== index ? [i] : [],
  );
  const decoys: number[] = [];
  const count = 2 + Math.floor(Math.random() * 2); // 2~3개
  while (decoys.length < count && digitIdx.length > 0) {
    const at = Math.floor(Math.random() * digitIdx.length);
    const pick = digitIdx[at];
    if (pick === undefined) break;
    digitIdx.splice(at, 1);
    decoys.push(pick);
  }
  return decoys;
}

/** 숫자 키패드 (점 표시 + 0~9·지우기). 계좌/간편 비밀번호 입력용 */
export function PinKeypad({
  value,
  onChange,
  length = 6,
  disabled = false,
  secure = false,
  className,
}: PinKeypadProps) {
  // 마운트(= 키패드가 뜰 때)마다 한 번 배치 확정. secure가 아니면 고정 배치.
  const [keys] = useState<string[]>(() => (secure ? shuffledKeys() : FIXED_KEYS));
  // 디코이 효과로 잠깐 '눌림' 표시할 칸 인덱스
  const [flash, setFlash] = useState<Set<number>>(new Set());
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 누른 칸 + 임의의 다른 숫자 칸 2~3개를 잠깐 눌린 것처럼 표시.
  const triggerFlash = (index: number) => {
    setFlash(new Set([index, ...pickDecoys(keys, index)]));
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(new Set()), 180);
  };

  const press = (d: string, index: number) => {
    if (disabled) return;
    if (secure) triggerFlash(index);
    if (value.length < length) onChange(value + d);
  };
  const back = (index: number) => {
    if (disabled) return;
    if (secure) triggerFlash(index);
    onChange(value.slice(0, -1));
  };

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
      {/* 스크린리더용 입력 진행 안내 (PIN 값은 노출하지 않음) */}
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {value.length} / {length}자리 입력됨
      </span>

      {/* 키패드 */}
      <div className="grid grid-cols-3 gap-x-8 gap-y-5">
        {keys.map((k, i) => {
          if (k === "") return <span key={i} />;
          const pressed = flash.has(i);

          if (k === DEL) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => back(i)}
                disabled={disabled}
                aria-label="지우기"
                className={cn(
                  "flex items-center justify-center rounded-xl py-2 text-muted-foreground transition disabled:opacity-40",
                  secure
                    ? pressed && "scale-95 bg-primary/10 text-primary"
                    : "active:text-primary",
                )}
              >
                <Delete className="size-6" />
              </button>
            );
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => press(k, i)}
              disabled={disabled}
              className={cn(
                "rounded-xl py-2 text-2xl font-semibold text-foreground transition disabled:opacity-40",
                secure
                  ? pressed && "scale-95 bg-primary/10 text-primary"
                  : "active:text-primary",
              )}
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}
