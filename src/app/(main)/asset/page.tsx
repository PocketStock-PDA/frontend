"use client";

import { AlertTriangle } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeader } from "@/components/common/SectionHeader";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { AssetActionRows } from "@/components/features/asset/AssetActionRows";
import { AssetPortfolioCard } from "@/components/features/asset/AssetPortfolioCard";
import { MaturityAlertCard } from "@/components/features/asset/MaturityAlertCard";
import { Button } from "@/components/ui/button";
import { useAssetSummary } from "@/hooks/queries/useAssetSummary";
import { useMaturityRecommendation } from "@/hooks/queries/useMaturityRecommendation";
import { formatKRW } from "@/lib/utils/currency";

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

  return (
    <>
      <AppHeader variant="sub" title="자산 현황" />
      <div className="space-y-5">
        {/* 순자산 + 자산 구성 — 한 카드로 묶음(포트폴리오 탭 톤) */}
        <section className="overflow-hidden rounded-2xl bg-brand-surface">
          {/* 순자산 (brand-surface) */}
          <div className="p-5">
            <p className="text-sm font-medium text-primary">순자산</p>
            <p className="mt-1.5 text-3xl font-bold tracking-tight text-foreground">
              {formatKRW(data.netAssets)}
            </p>
            {data.partial && (
              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span className="flex-1">일부 자산을 불러오지 못해 실제보다 적게 표시될 수 있어요.</span>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="shrink-0 font-semibold underline underline-offset-2"
                >
                  다시 시도
                </button>
              </div>
            )}
          </div>

          {/* 자산 구성 (흰 배경) */}
          <div className="border-t border-primary/10 bg-card p-5">
            <p className="mb-3 text-sm font-bold text-primary">자산 구성</p>
            {data.portfolio.length === 0 ? (
              <EmptyState title="등록된 자산이 없어요" />
            ) : (
              <AssetPortfolioCard
                bare
                portfolio={data.portfolio}
                pointSources={data.pointSources}
              />
            )}
          </div>
        </section>

        {/* 만기 알림 */}
        {maturityData?.triggerAccount && (
          <MaturityAlertCard account={maturityData.triggerAccount} />
        )}

        {/* 자금 굴리기 */}
        <section>
          <SectionHeader title="자금 굴리기" />
          <AssetActionRows
            daysUntilMaturity={maturityData?.triggerAccount?.daysUntilMaturity}
          />
        </section>

      </div>
    </>
  );
}
