import type { CSSProperties } from "react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { AssetActionRows } from "@/components/features/asset/AssetActionRows";
import type { AssetPortfolioItem } from "@/types/domain/asset";

// 예금·적금(만기형 안전자산) 비중이 이 % 이상이면 비중 조정 멘트를 노출.
const SAFE_CATEGORIES = ["예금", "적금"];
const SUGGEST_THRESHOLD = 50;
const STRONG_THRESHOLD = 70;
// 자산 구성 도넛과 동일 색 재사용 — 예적금(파랑) → 배당주(증권·보라)
const DEPOSIT_COLOR = "#3b82f6";
const STOCK_COLOR = "#8b5cf6";

interface RebalanceSuggestionProps {
  portfolio: AssetPortfolioItem[];
  daysUntilMaturity?: number | undefined;
}

/**
 * 리밸런싱 추천 — 멘트(예적금 비중↑ → 배당주)와 액션(만기 자금 굴리기·맞춤 카드 추천)을
 * 한 카드에 묶은 섹션. 멘트는 예적금 비중 기준으로만 노출(만기 임박과 무관 — 그건 상단 알림).
 * 액션은 항상 노출되는 메뉴.
 */
export function RebalanceSuggestion({ portfolio, daysUntilMaturity }: RebalanceSuggestionProps) {
  const total = portfolio.reduce((s, p) => s + p.amount, 0);
  const safe = portfolio
    .filter((p) => SAFE_CATEGORIES.includes(p.category))
    .reduce((s, p) => s + p.amount, 0);
  const safePct = total > 0 ? Math.round((safe / total) * 100) : 0;
  const overweight = safePct >= SUGGEST_THRESHOLD;

  const lead =
    safePct >= STRONG_THRESHOLD
      ? "예적금에 많이 쏠려 있어요."
      : "예적금 비중이 높은 편이에요.";

  return (
    <section className="ps-rise-in" style={{ "--i": 1 } as CSSProperties}>
      <SectionHeader title="리밸런싱 추천" />
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {/* 멘트 — 예적금 비중이 높을 때만 (도넛과 동일 색) */}
        {overweight && (
          <div className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: DEPOSIT_COLOR }} />
              <span className="font-bold" style={{ color: DEPOSIT_COLOR }}>
                예적금 {safePct}%
              </span>
              <span>→</span>
              <span className="size-1.5 rounded-full" style={{ backgroundColor: STOCK_COLOR }} />
              <span className="font-bold" style={{ color: STOCK_COLOR }}>
                배당주
              </span>
            </div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-foreground/80">
              {lead} 일부를 배당주로 옮겨 비중을 조정해보세요.
            </p>
          </div>
        )}

        {/* 액션 — 멘트 아래로 같은 카드에 묶어서 (멘트 있으면 첫 행 위에 구분선) */}
        <AssetActionRows
          bare
          leadingDivider={overweight}
          daysUntilMaturity={daysUntilMaturity}
        />
      </div>
    </section>
  );
}
