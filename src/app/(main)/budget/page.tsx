"use client";

import { useState } from "react";
import { format, isSameDay, isAfter, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { RefreshCcw, ChevronLeft, ChevronRight, CheckCircle2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AppHeader } from "@/components/common/AppHeader";
import { FinanceCalendar } from "@/components/common/FinanceCalendar";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  useBudgetGoals,
  useBudgetCalendar,
  useBudgetTransactions,
  useBudgetSavings,
} from "@/hooks/queries/useBudget";
import { getCategoryIcon } from "./_utils/categoryIcon";
import { useSpendingAnalysis } from "@/hooks/queries/useSpendingAnalysis";
import { useBankAccounts } from "@/hooks/queries/useBankAccounts";
import { useAutoBudgetGoals } from "@/hooks/mutations/useAutoBudgetGoals";
import { useSetTransferAccount } from "@/hooks/mutations/useSetTransferAccount";
import { useAgreeCollect } from "@/hooks/mutations/useAgreeCollect";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { budgetMonthPath } from "@/lib/navigation/routes";
import { StockCalendarTab } from "./StockCalendarTab";
import type { BudgetGoalSummary, CalendarDayItem } from "@/types/domain/budget";
import { LiquidFill } from "@/components/features/budget/LiquidFill";

// ── 페이지 진입점 ──────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const goalsQ = useBudgetGoals();

  return (
    <>
      <AppHeader variant="sub" title="가계부" />
      {goalsQ.isLoading ? (
        <div className="space-y-4">
          <SkeletonCard lines={3} className="h-36" />
          <SkeletonCard lines={5} className="h-52" />
        </div>
      ) : goalsQ.isError ? (
        <div className="py-8">
          <EmptyState
            icon={<RefreshCcw className="size-6" />}
            title="불러오지 못했어요"
            description="잠시 후 다시 시도해 주세요."
            action={
              <Button variant="outline" onClick={() => goalsQ.refetch()}>
                다시 시도
              </Button>
            }
          />
        </div>
      ) : !goalsQ.data || goalsQ.data.categories.length === 0 ? (
        <FirstEntry />
      ) : (
        <Dashboard goals={goalsQ.data} />
      )}
    </>
  );
}

// ── 첫 진입 화면 ──────────────────────────────────────────────────────────────

function FirstEntry() {
  const spending = useSpendingAnalysis(3);
  const autoGoals = useAutoBudgetGoals();

  if (spending.isLoading) {
    return (
      <div className="space-y-4 py-5">
        <SkeletonCard lines={3} className="h-36" />
        <SkeletonCard lines={5} className="h-52" />
      </div>
    );
  }

  if (spending.isError) {
    return (
      <div className="py-8">
        <EmptyState
          icon={<RefreshCcw className="size-6" />}
          title="소비 분석을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button variant="outline" onClick={spending.refetch}>
              다시 시도
            </Button>
          }
        />
      </div>
    );
  }

  if (spending.data.totalAmount === 0) {
    return (
      <div className="py-8">
        <EmptyState
          title="분석할 카드 소비가 없어요"
          description="최근 3개월 카드 소비가 생기면 가계부 목표를 자동으로 제안할 수 있어요."
        />
      </div>
    );
  }

  return (
    <div className="pb-6 pt-5">
      <section className="pb-5">
        <p className="text-xs font-bold tracking-widest text-primary">
          가계부 첫 진입
        </p>
        <h1 className="mt-1 text-[22px] font-bold leading-tight text-foreground">
          3개월 카드 소비를
          <br />
          분석했어요
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          이 데이터로 가계부 목표를 자동 설정해요
        </p>
      </section>

      <div className="-mx-5 h-2 bg-muted" />

      <section className="py-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">월 평균 소비</p>
          <p className="font-numeric text-xl font-bold text-foreground">
            {formatKRW(Math.round(spending.data.monthlyAverage))}
          </p>
        </div>
        <div className="mt-5 space-y-4">
          {spending.data.categories.map((cat, i) => (
            <CategoryBar
              key={cat.name}
              name={cat.name}
              percentage={cat.percentage}
              isPrimary={i === 0}
              isOther={cat.isOther}
            />
          ))}
        </div>
      </section>

      <div className="-mx-5 bg-muted pb-4 pt-1">
        <div className="mx-5 rounded-xl bg-accent px-4 py-3">
          <p className="text-sm font-bold text-foreground">
            가계부 목표 자동 설정
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            소비 패턴을 바탕으로 카테고리별 월 목표 금액을 설정했어요. 나중에
            변경할 수 있어요.
          </p>
        </div>
      </div>

      <Button
        className="mt-4 h-14 w-full text-base font-semibold"
        disabled={autoGoals.isPending || autoGoals.isSuccess}
        onClick={() => autoGoals.mutate()}
      >
        {autoGoals.isPending
          ? "설정 중..."
          : autoGoals.isSuccess
            ? "설정 완료!"
            : "가계부 시작하기"}
      </Button>

      {autoGoals.isError && (
        <p className="mt-3 text-center text-xs text-destructive">
          목표 설정에 실패했어요. 다시 시도해 주세요.
        </p>
      )}
    </div>
  );
}

// ── 대시보드 ──────────────────────────────────────────────────────────────────

type TabValue = "budget" | "stock";
const TABS: { label: string; value: TabValue }[] = [
  { label: "가계부", value: "budget" },
  { label: "증권 캘린더", value: "stock" },
];

function Dashboard({ goals }: { goals: BudgetGoalSummary }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabValue>(
    searchParams.get("tab") === "stock" ? "stock" : "budget",
  );
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "day">("month");
  const [waveOn, setWaveOn] = useState(true);
  const [showSetupSheet, setShowSetupSheet] = useState(false);
  const [setupAccountId, setSetupAccountId] = useState<number | null>(null);
  const bankAccountsQ = useBankAccounts();
  const setTransferAccount = useSetTransferAccount();
  const agreeCollect = useAgreeCollect();

  const handleSetupStart = () => {
    setSetupAccountId(null);
    setShowSetupSheet(true);
  };

  const handleSetupSave = () => {
    if (setupAccountId === null) return;
    setTransferAccount.mutate(setupAccountId, {
      onSuccess: () => agreeCollect.mutate(undefined, {
        onSuccess: () => setShowSetupSheet(false),
      }),
    });
  };

  const handleMonthChange = (newMonth: Date) => {
    setViewMode("month");
    setCalendarMonth(newMonth);
    const lastDay = new Date(
      newMonth.getFullYear(),
      newMonth.getMonth() + 1,
      0,
    ).getDate();
    setSelectedDate(
      new Date(
        newMonth.getFullYear(),
        newMonth.getMonth(),
        Math.min(selectedDate.getDate(), lastDay),
      ),
    );
  };


  const handleDateSelect = (date: Date) => {
    if (viewMode === "day" && isSameDay(date, selectedDate)) {
      setViewMode("month");
    } else {
      setSelectedDate(date);
      setViewMode("day");
    }
  };

  const calendarQ = useBudgetCalendar(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
  );
  const txQ = useBudgetTransactions(
    viewMode === "day"
      ? {
          type: "DAILY",
          year: selectedDate.getFullYear(),
          month: selectedDate.getMonth() + 1,
          day: selectedDate.getDate(),
        }
      : {},
  );
  const savingsQ = useBudgetSavings();

  const dayMap = new Map<string, CalendarDayItem>();
  calendarQ.data?.days.forEach((d) => dayMap.set(d.date, d));

  const daysInCalendarMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0,
  ).getDate();
  const today = startOfDay(new Date());
  const now = new Date();
  const isCurrentMonth =
    calendarMonth.getFullYear() === now.getFullYear() &&
    calendarMonth.getMonth() === now.getMonth();

  const calendarDailyBudget = calendarQ.data?.dailyBudget ?? 0;
  const calendarSpent =
    calendarQ.data?.days.reduce((s, d) => s + Number(d.spent), 0) ??
    goals.spentAmount;
  // 현재 월은 goals.monthlyBudget을 직접 사용 (dailyBudget * days 역산 시 나머지 손실)
  const calendarMonthlyBudget = isCurrentMonth
    ? goals.monthlyBudget
    : calendarDailyBudget > 0
      ? calendarDailyBudget * daysInCalendarMonth
      : goals.monthlyBudget;
  const dailyBudget = calendarMonthlyBudget / daysInCalendarMonth;
  const usedPct =
    calendarMonthlyBudget > 0
      ? Math.min(100, Math.round((calendarSpent / calendarMonthlyBudget) * 100))
      : 0;

  return (
    <div className="pb-6">
      {/* 탭 바 */}
      <div className="-mx-5 flex border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "flex-1 py-3 text-sm font-semibold",
              tab === t.value ? "text-primary" : "text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "budget" ? (
        <div>
          {/* ── 월 네비(위) + 우측 미니 요약(아래) — 증권 캘린더 탭과 동일 배치 ── */}
          <div className="mb-3 mt-4">
            <div className="mb-0.5 flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                aria-label="이전 달"
              >
                <ChevronLeft className="size-5 text-muted-foreground" />
              </button>
              <span className="text-base font-bold text-foreground">
                {format(calendarMonth, "M월")}
              </span>
              <button
                type="button"
                onClick={() => handleMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                aria-label="다음 달"
              >
                <ChevronRight className="size-5 text-muted-foreground" />
              </button>
            </div>

            {/* 우상단 미니 요약: 사용률·절약 % + 슬림 2색 바 — 탭 시 월 상세 */}
            {/* min-h: 증권 캘린더 탭과 달력 시작 y 정렬용 (요약 높이 고정) */}
            <div className="flex min-h-[40px] flex-col items-end gap-1">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    budgetMonthPath(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() + 1,
                    ),
                  )
                }
                className="flex flex-col items-end gap-1"
              >
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-muted-foreground">
                    사용률{" "}
                    <span className="font-numeric font-bold text-primary">{usedPct}%</span>
                  </span>
                  {savingsQ.data?.isCollectAgreed && (
                    <span className="text-muted-foreground">
                      절약{" "}
                      <span className="font-numeric font-bold text-[#7DB2F4]">
                        {Math.max(0, 100 - usedPct)}%
                      </span>
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    "h-1.5 w-32 overflow-hidden rounded-full",
                    savingsQ.data?.isCollectAgreed ? "bg-[#DBEAFE]" : "bg-muted",
                  )}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
              </button>
              {!savingsQ.isLoading && !savingsQ.data?.isCollectAgreed && (
                <button
                  type="button"
                  onClick={handleSetupStart}
                  className="flex items-center gap-0.5 text-[11px] font-medium text-primary"
                >
                  절약금 모으기
                  <ChevronRight className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* ── 달력 ── */}
          <style>{`
            @keyframes budgetWaveDrift { from { transform: translateX(0); } to { transform: translateX(-50px); } }
            .bw-front { animation: budgetWaveDrift 3.2s linear infinite; }
            .bw-back { animation: budgetWaveDrift 5s linear infinite; }
          `}</style>
          <FinanceCalendar
            month={calendarMonth}
            onMonthChange={handleMonthChange}
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
            collapsed={viewMode === "day"}
            showHeader={false}
            className="pt-4"
            renderDay={(date, isCurrentMonth) => {
              if (!isCurrentMonth) return <span />;
              const key = format(date, "yyyy-MM-dd");
              const info = dayMap.get(key);
              const isFuture = isAfter(startOfDay(date), today);
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, today);
              const fillRatio =
                info && dailyBudget > 0
                  ? Math.min(1.2, info.spent / dailyBudget)
                  : 0;
              const isOver = fillRatio > 1;
              const fillPct = Math.min(100, Math.round(fillRatio * 100));
              const hasFill = !!info && !isFuture && fillPct > 0;
              const dow = date.getDay(); // 0=일, 6=토
              const dateColor = isFuture
                ? "#B5BBC3"
                : isToday
                  ? "#2563EB"
                  : dow === 0
                    ? "#F2696B"
                    : dow === 6
                      ? "#5B9BF5"
                      : "#1A1D23";
              return (
                <span
                  className={cn(
                    "relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-[14px] bg-card transition-shadow",
                    waveOn && hasFill
                      ? "shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
                      : "shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
                    isSelected && "ring-1 ring-[#0471E9]",
                  )}
                >
                  {/* 아래서 차오르는 채움: sin 기반 다층 파도 (토글 ON) */}
                  {waveOn && hasFill && (
                    <LiquidFill
                      progress={fillRatio}
                      animate={!reduceMotion}
                      className="absolute inset-0 h-full w-full"
                    />
                  )}
                  <span
                    className={cn(
                      "font-numeric relative text-[11px] leading-none",
                      isToday && !isOver && "font-bold",
                    )}
                    style={{ color: dateColor }}
                  >
                    {date.getDate()}
                  </span>
                  {/* 토글 OFF: 일별 소비금액 표시 */}
                  {!waveOn && hasFill && (
                    <span className="font-numeric absolute inset-x-0 bottom-1 text-center text-[8.5px] leading-none text-muted-foreground">
                      -{(info?.spent ?? 0).toLocaleString()}
                    </span>
                  )}
                  {isOver && <span className="sr-only">예산 초과</span>}
                  {isToday && <span className="sr-only">오늘</span>}
                </span>
              );
            }}
            legend={
              <button
                type="button"
                onClick={() => setWaveOn((v) => !v)}
                aria-pressed={waveOn}
                aria-label={waveOn ? "금액으로 보기" : "물결로 보기"}
                className={cn(
                  "relative size-7 overflow-hidden rounded-full border transition-colors",
                  waveOn
                    ? "border-[#0471E9]/30 bg-[#EAF3FE] shadow-sm"
                    : "border-border bg-background",
                )}
              >
                <LiquidFill
                  progress={waveOn ? 0.72 : 0.28}
                  animate={!reduceMotion}
                  className="absolute inset-0 h-full w-full"
                />
              </button>
            }
          />

          <AnimatePresence>
            {viewMode === "day" && (
              <motion.div
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.32, 0.72, 0, 1] }}
                className="mt-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {format(selectedDate, "M월 d일 (eee)", { locale: ko })} 소비
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewMode("month")}
                    className="flex items-center gap-0.5 text-xs text-muted-foreground"
                  >
                    <X className="size-3.5" />
                    닫기
                  </button>
                </div>
                {txQ.isLoading ? (
                  <SkeletonCard lines={2} />
                ) : !txQ.data?.transactions.length ? (
                  <EmptyState title="이 날 소비 내역이 없어요" />
                ) : (
                  <div className="divide-y divide-border/50">
                    {txQ.data.transactions.map((tx) => {
                      const Icon = getCategoryIcon(tx.category);
                      return (
                        <div
                          key={tx.transactionId}
                          className="flex items-center gap-3.5 py-3.5"
                        >
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent">
                            <Icon className="size-[17px] text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {tx.description}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {tx.category} · {formatTxTime(tx.transactedAt)}
                            </p>
                          </div>
                          <span className="font-numeric shrink-0 text-sm font-bold text-foreground">
                            -{formatKRW(tx.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      ) : (
        <StockCalendarTab />
      )}

      {/* ── 절약금 계좌 설정 시트 ── */}
      <Sheet open={showSetupSheet} onOpenChange={setShowSetupSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-10">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left text-base">이체 계좌 선택</SheetTitle>
          </SheetHeader>
          <p className="mb-4 text-sm text-muted-foreground">
            절약금을 받을 계좌를 선택해 주세요.
          </p>
          {bankAccountsQ.isLoading ? (
            <SkeletonCard lines={3} />
          ) : (
            <div className="space-y-2.5">
              {(bankAccountsQ.data ?? [])
                .filter(
                  (a) =>
                    a.currency === "KRW" &&
                    a.accountType === "DEMAND" &&
                    !a.isDormant,
                )
                .map((a) => (
                  <button
                    key={a.accountId}
                    type="button"
                    onClick={() => setSetupAccountId(a.accountId)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors",
                      setupAccountId === a.accountId
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background",
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.bankName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.accountName}</p>
                    </div>
                    {setupAccountId === a.accountId && (
                      <CheckCircle2 className="size-5 shrink-0 text-primary" />
                    )}
                  </button>
                ))}
            </div>
          )}
          <Button
            className="mt-5 h-14 w-full text-base font-bold"
            disabled={setupAccountId === null || setTransferAccount.isPending || agreeCollect.isPending}
            onClick={handleSetupSave}
          >
            {setTransferAccount.isPending || agreeCollect.isPending ? "처리 중..." : "시작하기"}
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}


function formatTxTime(isoStr: string) {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── 첫 진입 카테고리 바 ───────────────────────────────────────────────────────

function CategoryBar({
  name,
  percentage,
  isPrimary,
  isOther,
}: {
  name: string;
  percentage: number;
  isPrimary: boolean;
  isOther: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span
          className={cn(
            "font-medium",
            isOther ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {name}
        </span>
        <span
          className={cn(
            "font-numeric font-bold",
            isPrimary
              ? "text-primary"
              : isOther
                ? "text-muted-foreground"
                : "text-foreground/60",
          )}
        >
          {percentage}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            isPrimary
              ? "bg-primary"
              : isOther
                ? "bg-muted-foreground/30"
                : "bg-primary/30",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
