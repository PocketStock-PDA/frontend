"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeader } from "@/components/common/SectionHeader";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { AssetPortfolioCard } from "@/components/features/asset/AssetPortfolioCard";
import { MaturityAlertCard } from "@/components/features/asset/MaturityAlertCard";
import { Button } from "@/components/ui/button";
import { useAssetSummary } from "@/hooks/queries/useAssetSummary";
import { useMaturityRecommendation } from "@/hooks/queries/useMaturityRecommendation";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

export default function AssetPage() {
  const { data, isLoading, isError, refetch } = useAssetSummary();
  const { data: maturityData } = useMaturityRecommendation();

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

        {/* 만기 알림 */}
        {maturityData?.triggerAccount && (
          <MaturityAlertCard account={maturityData.triggerAccount} />
        )}

        {/* 자산 구성 */}
        <section>
          <SectionHeader title="자산 구성" />
          {data.portfolio.length === 0 ? (
            <EmptyState title="등록된 자산이 없어요" />
          ) : (
            <AssetPortfolioCard portfolio={data.portfolio} />
          )}
        </section>

      </div>
    </>
  );
}
