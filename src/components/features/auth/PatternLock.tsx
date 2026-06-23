"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface PatternLockProps {
  /** 패턴 완성(최소 길이 이상) 시 노드 시퀀스("0-1-2-5") 전달 */
  onComplete: (sequence: string) => void;
  /** 최소 노드 수, 기본 4 */
  minLength?: number;
  /** 입력 잠금 */
  disabled?: boolean;
  className?: string;
}

const NODES = Array.from({ length: 9 }, (_, i) => i); // 0~8 (row=i/3, col=i%3)

/** 3×3 패턴 잠금 입력. 포인터로 점을 이어 패턴을 그린다. */
export function PatternLock({
  onComplete,
  minLength = 4,
  disabled = false,
  className,
}: PatternLockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const [path, setPath] = useState<number[]>([]);
  // 최신 path를 동기 보관(이벤트 핸들러에서 stale 없이 읽기 위함)
  const pathRef = useRef<number[]>([]);
  // 포인터는 viewBox(0~100) 좌표로 저장 → 렌더 중 ref 접근 불필요
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  const apply = (next: number[]) => {
    pathRef.current = next;
    setPath(next);
  };

  const center = (i: number, size: number) => {
    const cell = size / 3;
    return { x: cell * ((i % 3) + 0.5), y: cell * (Math.floor(i / 3) + 0.5) };
  };

  const localXY = (e: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, size: rect.width };
  };

  const hit = (x: number, y: number, size: number) => {
    const cell = size / 3;
    for (const i of NODES) {
      const c = center(i, size);
      if (Math.hypot(x - c.x, y - c.y) < cell * 0.32) return i;
    }
    return -1;
  };

  const start = (e: React.PointerEvent) => {
    if (disabled) return;
    const p = localXY(e);
    if (!p) return;
    drawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const i = hit(p.x, p.y, p.size);
    apply(i >= 0 ? [i] : []);
    setPointer({ x: (p.x / p.size) * 100, y: (p.y / p.size) * 100 });
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = localXY(e);
    if (!p) return;
    setPointer({ x: (p.x / p.size) * 100, y: (p.y / p.size) * 100 });
    const i = hit(p.x, p.y, p.size);
    if (i >= 0 && !pathRef.current.includes(i)) {
      apply([...pathRef.current, i]);
    }
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setPointer(null);
    const result = pathRef.current;
    apply([]); // 항상 초기화 (다음 입력/확인 단계용)
    // onComplete는 setState 업데이터 밖(이벤트 핸들러)에서 호출 — 렌더 중 부모 setState 방지
    if (result.length >= minLength) onComplete(result.join("-"));
  };

  // SVG 좌표는 100×100 viewBox 기준(컨테이너 정사각형). pointer는 이미 viewBox 좌표.
  const vc = (i: number) => center(i, 100);
  const segments = path
    .slice(1)
    .map((node, idx) => ({ from: path[idx], to: node }))
    .filter((s): s is { from: number; to: number } => s.from !== undefined);
  const lastNode = path.length > 0 ? path[path.length - 1] : undefined;

  return (
    <div
      ref={ref}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      className={cn(
        "relative mx-auto aspect-square w-64 touch-none select-none",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      >
        {segments.map((s) => {
          const a = vc(s.from);
          const b = vc(s.to);
          return (
            <line
              key={`${s.from}-${s.to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className="stroke-primary"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })}
        {pointer && lastNode !== undefined && (
          <line
            x1={vc(lastNode).x}
            y1={vc(lastNode).y}
            x2={pointer.x}
            y2={pointer.y}
            className="stroke-primary/60"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="grid h-full w-full grid-cols-3 place-items-center">
        {NODES.map((i) => {
          const on = path.includes(i);
          return (
            <span
              key={i}
              className={cn(
                "flex size-4 items-center justify-center rounded-full transition-colors",
                on ? "bg-primary ring-4 ring-primary/20" : "bg-muted",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
