"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeader } from "@/components/common/SectionHeader";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { AssetPortfolioCard } from "@/components/features/asset/AssetPortfolioCard";
import { Button } from "@/components/ui/button";
import { useAssetSummary } from "@/hooks/queries/useAssetSummary";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

export default function AssetPage() {
  const { data, isLoading, isError, refetch } = useAssetSummary();

  if (isLoading) {
    return (
      <>
        <AppHeader variant="sub" title="자산 현황" />
        <div className="space-y-4">
          <SkeletonCard lines={2} className="h-28" />
          <SkeletonCard lines={4} className="h-52" />
          <SkeletonCard lines={2} className="h-24" />
        </div>
      </>
    );
  }

  if (isError || !data) {
    return (
      <>
        <AppHeader variant="sub" title="자산 현황" />
        <EmptyState
          title="불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              다시 시도
            </Button>
          }
        />
      </>
    );
  }

  const momDiff = data.momDiff ?? 0;
  const isPositive = momDiff >= 0;
  const totalExpenses = data.fixedExpenses + data.variableExpenses;

  return (
    <>
      <AppHeader variant="sub" title="자산 현황" />
      <div className="space-y-5">
        {/* 순자산 */}
        <section className="rounded-2xl bg-primary p-5 text-white">
          <p className="text-sm text-white/80">순자산</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">
            {formatKRW(data.netAssets)}
          </p>
          {momDiff !== 0 && (
            <div className={cn("mt-2 flex items-center gap-1 text-sm")}>
              {isPositive ? (
                <TrendingUp className="size-4" />
              ) : (
                <TrendingDown className="size-4" />
              )}
              <span>
                전월 대비 {isPositive ? "+" : ""}
                {formatKRW(momDiff)}
              </span>
            </div>
          )}
        </section>

        {/* 자산 구성 */}
        <section>
          <SectionHeader title="자산 구성" />
          {data.portfolio.length === 0 ? (
            <EmptyState title="등록된 자산이 없어요" />
          ) : (
            <AssetPortfolioCard portfolio={data.portfolio} />
          )}
        </section>

        {/* 이번 달 지출 */}
        <section>
          <SectionHeader title="이번 달 지출" />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">고정 지출</p>
              <p className="mt-1.5 text-lg font-bold text-foreground">
                {formatKRW(data.fixedExpenses)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">변동 지출</p>
              <p className="mt-1.5 text-lg font-bold text-foreground">
                {formatKRW(data.variableExpenses)}
              </p>
            </div>
          </div>
          {totalExpenses > 0 && (
            <p className="mt-3 text-right text-sm text-muted-foreground">
              합계{" "}
              <span className="font-bold text-foreground">
                {formatKRW(totalExpenses)}
              </span>
            </p>
          )}
        </section>
      </div>
    </>
  );
}
