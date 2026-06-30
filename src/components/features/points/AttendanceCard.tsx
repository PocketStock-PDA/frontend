"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import {
  addDays,
  isAfter,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { useAttendance } from "@/hooks/queries/useAttendance";
import { useCheckAttendance } from "@/hooks/mutations/useCheckAttendance";
import { cn } from "@/lib/utils";

const WEEK_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;

// BE 미연동/조회 실패 시에도 카드는 기본 상태(미출석)로 노출 — 출석은 비필수 UI.
const FALLBACK = {
  checkedToday: false,
  streak: 0,
  lastCheckedDate: null as string | null,
  dailyReward: 10,
};

type DayStatus = "done" | "today" | "future" | "missed";

/**
 * 출석체크 카드 — 포인트 화면 최상단(히어로 카드 아래) 고정.
 * 매일 출석 시 마이신한포인트 적립. 시각 토큰은 히어로 카드와 동일(bg-brand-surface).
 */
export function AttendanceCard() {
  const { data } = useAttendance();
  const check = useCheckAttendance();

  const { checkedToday, streak, lastCheckedDate, dailyReward } = data ?? FALLBACK;

  // 이번 주(월~일) 각 칸 상태 — streak + 마지막 출석일로 '완료' 구간 산출.
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const lastChecked = lastCheckedDate ? startOfDay(parseISO(lastCheckedDate)) : null;
  const doneStart =
    lastChecked && streak > 0 ? subDays(lastChecked, streak - 1) : null;

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const done =
      doneStart && lastChecked
        ? isWithinInterval(date, { start: doneStart, end: lastChecked })
        : false;
    const status: DayStatus = done
      ? "done"
      : isSameDay(date, today)
        ? "today"
        : isAfter(date, today)
          ? "future"
          : "missed";
    return { date, status };
  });

  const handleCheck = () => {
    if (checkedToday || check.isPending) return;
    check.mutate(undefined, {
      onSuccess: (res) =>
        toast.success(`출석 완료! +${res.awarded}P 적립됐어요`),
      onError: () => toast.error("출석에 실패했어요. 잠시 후 다시 시도해 주세요."),
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl mb-6 p-5 bg-brand-surface">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">출석체크</p>
          <p className="mt-0.5 text-[13px] text-foreground/70">
            {streak > 0 && `연속 ${streak}일째 · `}
            매일 출석하고 마이신한포인트 {dailyReward}P
          </p>
        </div>
        <span className="shrink-0 text-2xl">🗓️</span>
      </div>

      {/* 주간 7일 스탬프 */}
      <div className="mt-4 flex justify-between gap-1">
        {days.map(({ date, status }, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">
              {WEEK_LABELS[i]}
            </span>
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-full text-xs font-bold",
                status === "done" && "bg-primary text-primary-foreground",
                status === "today" &&
                  "border-2 border-primary bg-card text-primary",
                status === "future" &&
                  "border border-border bg-card text-muted-foreground",
                status === "missed" && "bg-muted text-muted-foreground",
              )}
            >
              {status === "done" ? (
                <Check className="size-4" />
              ) : (
                date.getDate()
              )}
            </span>
          </div>
        ))}
      </div>

      <Button
        onClick={handleCheck}
        disabled={checkedToday || check.isPending}
        className="mt-4 h-12 w-full text-base font-bold"
      >
        {checkedToday
          ? "오늘 출석 완료"
          : check.isPending
            ? "출석 중..."
            : `출석하고 ${dailyReward}P 받기`}
      </Button>
    </div>
  );
}
