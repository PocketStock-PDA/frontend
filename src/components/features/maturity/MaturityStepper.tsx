import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["배당담기", "예약확인", "재투자설정", "예금재예치", "완료"] as const;

/**
 * 만기 자금 굴리기 플로우 진행 단계(상단 바 아래).
 * 1 배당담기 → 2 예약확인 → 3 재투자설정 → 4 예금재예치 → 5 완료.
 * 원 + 연결선은 가운데, 짧은 라벨은 원 아래에 정렬한다.
 */
export function MaturityStepper({ current }: { current: number }) {
  return (
    <ol className="mb-4 flex">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center">
            {/* 다음 단계로 잇는 연결선 — 원 중심 높이(top-2.5)에 깔고 원이 위를 덮는다 */}
            {n < STEPS.length && (
              <span
                className={cn(
                  "absolute left-1/2 top-2.5 h-0.5 w-full -translate-y-1/2",
                  done ? "bg-primary/40" : "bg-border",
                )}
              />
            )}
            <div
              className={cn(
                "relative z-10 flex size-5 items-center justify-center rounded-full font-numeric text-[11px] font-bold tabular-nums",
                active
                  ? "bg-primary text-white"
                  : done
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3" strokeWidth={3} /> : n}
            </div>
            <span
              className={cn(
                "mt-1.5 whitespace-nowrap text-[10.5px] font-semibold",
                active
                  ? "text-primary"
                  : done
                    ? "text-primary/70"
                    : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
