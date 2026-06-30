"use client";

import type { CSSProperties } from "react";
import { AlertTriangle } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { AssetPortfolioCard } from "@/components/features/asset/AssetPortfolioCard";
import { MaturityAlert } from "@/components/features/asset/MaturityAlert";
import { RebalanceSuggestion } from "@/components/features/asset/RebalanceSuggestion";
import { Button } from "@/components/ui/button";
import { useAssetSummary } from "@/hooks/queries/useAssetSummary";
import { useMaturityRecommendation } from "@/hooks/queries/useMaturityRecommendation";
import { AmountDisplay } from "@/components/common/AmountDisplay";

export default function AssetPage() {
  const { data, isLoading, isError, refetch } = useAssetSummary();
  const { data: maturityData } = useMaturityRecommendation();

  if (isLoading) {
    return (
      <>
        <AppHeader variant="sub" title="자산 현황" />
        <div className="space-y-5">
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
        {/* 만기 임박 알림 — 만기 ≤ 1개월 예적금이 있을 때만, 순자산보다 위 */}
        {maturityData?.triggerAccount && (
          <MaturityAlert account={maturityData.triggerAccount} />
        )}

        {/* 순자산 + 자산 구성 */}
        <section
          className="overflow-hidden rounded-2xl bg-brand-surface ps-rise-in"
          style={{ "--i": 0 } as CSSProperties}
        >
          {/* 순자산 */}
          <div className="px-5 pb-3 pt-5">
            <p className="text-sm font-medium text-primary">순자산</p>
            <AmountDisplay
              value={data.netAssets}
              currency="KRW"
              size="xl"
              className="mt-1.5 block tracking-tight"
            />
            {data.partial && (
              <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
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
          <div className="mx-4 mb-4 rounded-2xl border border-primary/30 bg-card p-5">
            {data.portfolio.length === 0 ? (
              <EmptyState
                title="등록된 자산이 없어요"
                description="자산을 연동하면 구성을 한눈에 볼 수 있어요."
              />
            ) : (
              <AssetPortfolioCard
                bare
                portfolio={data.portfolio}
                pointSources={data.pointSources}
              />
            )}
          </div>
        </section>

        {/* 리밸런싱 추천 — 멘트(예적금 비중↑) + 액션(만기 자금 굴리기·맞춤 카드 추천)을 한 카드에 묶음 */}
        <RebalanceSuggestion
          portfolio={data.portfolio}
          daysUntilMaturity={maturityData?.triggerAccount?.daysUntilMaturity}
        />
      </div>
    </>
  );
}
