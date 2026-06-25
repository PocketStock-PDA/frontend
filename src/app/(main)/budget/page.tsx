"use client";

import { useState } from "react";
import { format, isSameDay, isAfter, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { RefreshCcw, ChevronLeft, ChevronRight, CheckCircle2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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
import { useTransferAccount } from "@/hooks/queries/useTransferAccount";
import { useBankAccounts } from "@/hooks/queries/useBankAccounts";
import { useAutoBudgetGoals } from "@/hooks/mutations/useAutoBudgetGoals";
import { useSetTransferAccount } from "@/hooks/mutations/useSetTransferAccount";
import { useAgreeCollect } from "@/hooks/mutations/useAgreeCollect";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { StockCalendarTab } from "./StockCalendarTab";
import type { BudgetGoalSummary, CalendarDayItem } from "@/types/domain/budget";

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
  const [tab, setTab] = useState<TabValue>("budget");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "day">("month");
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
    if (setupAccountId == null) return;
    setTransferAccount.mutate(setupAccountId, {
      onSuccess: () => agreeCollect.mutate(undefined, {
        onSuccess: () => setShowSetupSheet(false),
      }),
    });
  };

  const handleMonthChange = (newMonth: Date) => {
    setTxExpanded(false);
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
      setTxExpanded(false);
      setViewMode("month");
    } else {
      setTxExpanded(false);
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
  const transferAccountQ = useTransferAccount();

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
              tab === t.value ? "text-primary" : "text-[#AAAAAA]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "budget" ? (
        <div>
          {/* ── 월별 요약 (월 네비 포함) ── */}
          <div className="mt-4">
            {/* 월 네비게이션 */}
            <div className="mb-0.5 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                  aria-label="이전 달"
                >
                  <ChevronLeft className="size-5 text-muted-foreground" />
                </button>
                <span className="text-base font-bold text-foreground underline decoration-foreground underline-offset-4">
                  {format(calendarMonth, "yyyy년 M월")}
                </span>
                <button
                  type="button"
                  onClick={() => handleMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                  aria-label="다음 달"
                >
                  <ChevronRight className="size-5 text-muted-foreground" />
                </button>
              </div>
            </div>
            {/* 지출 요약 — 전체 탭 시 내역 페이지로 이동 */}
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/budget/${calendarMonth.getFullYear()}/${calendarMonth.getMonth() + 1}`,
                )
              }
              className="w-full text-left"
            >
              <div className="flex items-center justify-end">
                <div className="flex w-36 flex-col gap-1">
                  <span className="text-right text-[11px] text-muted-foreground underline underline-offset-2">
                    이번 달 예산 사용률
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-[#E8F0FB]">
                      <div
                        className="h-full rounded-full bg-[#C8DFF8] transition-all"
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                    <span className="font-numeric shrink-0 text-xs font-semibold text-primary">
                      {usedPct}%
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* ── 달력 ── */}
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
              const fillRatio =
                info && dailyBudget > 0
                  ? Math.min(1.2, info.spent / dailyBudget)
                  : 0;
              const isOver = fillRatio > 1;
              const dateColor = isFuture
                ? "#DDDDDD"
                : isOver
                  ? "#FFFFFF"
                  : "#333333";
              const fillPct = Math.min(100, fillRatio * 100);
              const fillColor = `rgba(4,113,233,${isOver ? 0.7 : 0.25})`;
              return (
                <span
                  className={cn(
                    "flex aspect-square w-full flex-col items-center justify-end rounded-lg",
                    isSelected && "ring-2 ring-primary",
                  )}
                  style={
                    info && !isFuture && fillPct > 0
                      ? {
                          background: `linear-gradient(to top, ${fillColor} ${fillPct}%, transparent ${fillPct}%)`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="pb-1 text-[11px] leading-none"
                    style={{ color: dateColor }}
                  >
                    {date.getDate()}
                  </span>
                </span>
              );
            }}
            legend={
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-[3px] bg-primary/70" />
                  초과
                </span>
              </div>
            }
          />

          <AnimatePresence>
            {viewMode === "day" && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                className="mt-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {format(selectedDate, "M월 d일 (eee)", { locale: ko })} 소비
                  </p>
                  <button
                    type="button"
                    onClick={() => { setTxExpanded(false); setViewMode("month"); }}
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
                  <div className="divide-y divide-border rounded-2xl border border-border">
                    {txQ.data.transactions.map((tx) => {
                      const Icon = getCategoryIcon(tx.category);
                      return (
                        <div
                          key={tx.transactionId}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent">
                            <Icon className="size-[15px] text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {tx.description}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
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

          {/* ── 이번 달 절약금 (월 뷰일 때만) ── */}
          {viewMode === "month" && <>
          <div className="-mx-5 mt-4 h-2 bg-muted" />
          <div className="flex items-center justify-between pb-3 pt-[14px]">
            <span className="text-sm font-medium text-foreground">이번 달 절약금</span>
            {savingsQ.data?.isCollectAgreed && (
              <span className="text-xs font-medium text-primary">월말 CMA 이체 예정</span>
            )}
          </div>
          {savingsQ.isLoading || transferAccountQ.isLoading ? (
            <SkeletonCard lines={2} className="h-20" />
          ) : !savingsQ.data?.isCollectAgreed ? (
            <div className="rounded-2xl border border-border bg-accent px-4 py-[14px]">
              <p className="text-sm font-medium text-foreground">목표 예산 절약 시 CMA로 자동 이체돼요</p>
              <p className="mt-1 text-xs text-muted-foreground">매월 말일에 절약한 금액이 CMA 계좌로 이체됩니다.</p>
              <Button
                size="sm"
                className="mt-3 h-9 w-full text-xs font-semibold"
                onClick={handleSetupStart}
              >
                절약금 모으기 시작하기
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#D1FAE5] bg-[#F0FDF4] px-4 py-[14px]">
              <p className="font-numeric text-[22px] font-bold text-[#22C55E]">
                {formatKRW(savingsQ.data.savedAmount)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                목표 예산 대비 절약한 금액 · {format(calendarMonth, "M월")} 말일 이체 예정
              </p>
              {!transferAccountQ.data && (
                <button
                  type="button"
                  onClick={() => router.push("/my/savings-transfer")}
                  className="mt-3 flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left"
                >
                  <span className="text-xs font-medium text-amber-700">이체 계좌가 설정되지 않았어요</span>
                  <ChevronRight className="size-3.5 shrink-0 text-amber-500" />
                </button>
              )}
            </div>
          )}
          </>}
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
                .filter((a) => a.currency === "KRW")
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
            disabled={setupAccountId == null || setTransferAccount.isPending || agreeCollect.isPending}
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

