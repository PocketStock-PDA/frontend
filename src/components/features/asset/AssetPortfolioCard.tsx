"use client";

import { useEffect, useRef, useState } from "react";
import { DonutChart } from "@/components/common/DonutChart";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { AssetPortfolioItem } from "@/types/domain/asset";

const CATEGORY_COLORS: Record<string, string> = {
  예금: "#3b82f6",
  적금: "#3b82f6",
  증권: "#8b5cf6",
  부동산: "#f97316",
  보험: "#14b8a6",
  연금: "#f59e0b",
  기타: "#6b7280",
};

function getCategoryColor(category: string): string {
  return (
    Object.entries(CATEGORY_COLORS).find(([key]) =>
      category.includes(key),
    )?.[1] ?? "#6b7280"
  );
}

interface AssetPortfolioCardProps {
  portfolio: AssetPortfolioItem[];
}

export function AssetPortfolioCard({ portfolio }: AssetPortfolioCardProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // 카드 밖 클릭 → 해제
  useEffect(() => {
    const dismiss = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setSelectedIdx(null);
      }
    };
    document.addEventListener("click", dismiss);
    return () => document.removeEventListener("click", dismiss);
  }, []);

  const handleSelect = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 레벨 dismiss 차단
    setSelectedIdx((prev) => (prev === idx ? null : idx));
  };

  const donutData = portfolio.map((item) => ({
    label: item.category,
    value: item.amount,
    color: getCategoryColor(item.category),
  }));

  const selected = selectedIdx !== null ? portfolio[selectedIdx] : null;
  const totalAmount = portfolio.reduce((s, i) => s + i.amount, 0);

  return (
    // 카드 빈 여백 클릭 → 해제
    <div
      ref={cardRef}
      className="rounded-2xl border border-border bg-card p-5"
      onClick={() => setSelectedIdx(null)}
    >
      {/* 도넛 차트 — stopPropagation은 세그먼트 자체가 담당 */}
      <div className="flex justify-center py-2">
        <DonutChart
          data={donutData}
          size={180}
          thickness={26}
          {...(selectedIdx !== null && { selectedIndex: selectedIdx })}
          onSegmentClick={handleSelect}
          popDistance={12}
          centerLabel={
            <div className="text-center transition-all duration-200">
              {selected ? (
                <>
                  <p
                    className="text-[11px] font-semibold"
                    style={{ color: getCategoryColor(selected.category) }}
                  >
                    {selected.category}
                  </p>
                  <p className="text-base font-bold text-foreground">
                    {selected.ratio.toFixed(1)}%
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] text-muted-foreground">순자산</p>
                  <p className="text-sm font-bold text-foreground">
                    {(totalAmount / 10000).toFixed(0)}만원
                  </p>
                </>
              )}
            </div>
          }
        />
      </div>

      {/* 카테고리 그리드 */}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {portfolio.map((item, idx) => {
          const isSelected = selectedIdx === idx;
          const isDimmed = selectedIdx !== null && !isSelected;
          const color = getCategoryColor(item.category);

          return (
            <button
              key={item.category}
              type="button"
              onClick={(e) => handleSelect(idx, e)}
              className={cn(
                "rounded-xl p-3 text-left transition-all duration-200",
                "border-2",
                isSelected
                  ? "border-transparent shadow-sm"
                  : "border-transparent bg-muted/60",
                isDimmed && "opacity-40",
              )}
              style={
                isSelected
                  ? { backgroundColor: `${color}18`, borderColor: color }
                  : undefined
              }
            >
              <div className="mb-2 flex items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-muted-foreground">
                  {item.category}
                </span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {formatKRW(item.amount)}
              </p>
              <p
                className="mt-0.5 text-xs font-medium"
                style={{ color: isSelected ? color : undefined }}
              >
                <span className={isSelected ? "" : "text-muted-foreground"}>
                  {item.ratio.toFixed(1)}%
                </span>
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
