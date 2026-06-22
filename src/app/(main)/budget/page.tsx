"use client";

import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { useSpendingAnalysis } from "@/hooks/queries/useSpendingAnalysis";
import { useAutoBudgetGoals } from "@/hooks/mutations/useAutoBudgetGoals";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

export default function BudgetPage() {
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
      {/* 헤더 */}
      <section className="pb-5">
        <p className="text-xs font-bold tracking-widest text-primary">가계부 첫 진입</p>
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

      {/* 소비 분석 */}
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

      {/* 안내 카드 */}
      <div className="-mx-5 bg-muted pb-4 pt-1">
        <div className="mx-5 rounded-xl bg-primary/10 px-4 py-3">
          <p className="text-sm font-bold text-foreground">가계부 목표 자동 설정</p>
          <p className="mt-1 text-xs text-muted-foreground">
            소비 패턴을 바탕으로 카테고리별 월 목표 금액을 설정했어요.
            나중에 변경할 수 있어요.
          </p>
        </div>
      </div>

      {/* 시작 버튼 */}
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
        <span className={cn("font-medium", isOther ? "text-muted-foreground" : "text-foreground")}>
          {name}
        </span>
        <span
          className={cn(
            "font-numeric font-bold",
            isPrimary ? "text-primary" : isOther ? "text-muted-foreground" : "text-foreground/60",
          )}
        >
          {percentage}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            isPrimary ? "bg-primary" : isOther ? "bg-muted-foreground/30" : "bg-primary/30",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
