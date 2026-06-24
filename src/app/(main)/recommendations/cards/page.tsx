"use client";

import { useState } from "react";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { useCardRecommendation } from "@/hooks/queries/useCardRecommendation";
import type { CardRecommendationItem } from "@/types/domain/asset";

function getBackImageUrl(frontUrl: string) {
  return frontUrl.replace("_f_", "_b_");
}

function stripCategory(category: string, description: string) {
  return description.replace(category, "").trim();
}

function formatCardType(cardType: string) {
  if (!cardType) return "";
  const t = cardType.toUpperCase();
  if (t === "CREDIT" || t.includes("신용")) return "신용카드";
  if (t === "CHECK" || t.includes("체크")) return "체크카드";
  return cardType;
}

export default function CardRecommendationPage() {
  const { data, isLoading, isError } = useCardRecommendation();

  if (isLoading) {
    return (
      <>
        <AppHeader variant="sub" title="카드 추천" />
        <div className="space-y-3 pt-4">
          <SkeletonCard lines={1} className="h-10" />
          <SkeletonCard lines={4} className="h-44" />
          <SkeletonCard lines={4} className="h-40" />
        </div>
      </>
    );
  }

  if (isError || !data?.recommendations) {
    return (
      <>
        <AppHeader variant="sub" title="카드 추천" />
        <EmptyState
          title="카드 추천을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          className="mt-8"
        />
      </>
    );
  }

  if (data.recommendations.length === 0) {
    return (
      <>
        <AppHeader variant="sub" title="카드 추천" />
        <EmptyState
          title="추천할 카드가 없어요"
          description="카드 소비 내역이 쌓이면 맞춤 카드를 추천해 드려요."
          className="mt-8"
        />
      </>
    );
  }

  return (
    <>
      <AppHeader variant="sub" title="카드 추천" />
      <div className="py-4">
        {/* TOP 3 소비 카테고리 */}
        {data.topCategories.length > 0 && (
          <section className="mb-5">
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">
              내 소비 TOP {data.topCategories.length}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {data.topCategories.map((cat, i) => (
                <div
                  key={cat.category}
                  className="rounded-lg bg-accent px-2 py-1.5 text-center"
                >
                  <p className="text-[9px] text-muted-foreground">{i + 1}위 {cat.category}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-foreground">{cat.percentage}%</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="-mx-5 mb-5 h-2 bg-muted" />

        {/* 카드 목록 */}
        <p className="mb-3 text-[11px] font-medium text-muted-foreground">
          소비 패턴 맞춤 카드 추천
        </p>
        <div className="space-y-3">
          {data.recommendations.map((card, index) => (
            <CardItem key={card.cardName} card={card} rank={index + 1} />
          ))}
        </div>
      </div>
    </>
  );
}

function CardItem({ card, rank }: { card: CardRecommendationItem; rank: number }) {
  const [showBack, setShowBack] = useState(false);

  return (
    <div
      className="rounded-2xl border border-border p-4"
    >
      <div className="flex gap-3">
        {/* 카드 이미지 — 탭하면 앞뒤 전환 */}
        {card.imageUrl ? (
          <button
            type="button"
            onClick={() => setShowBack((v) => !v)}
            className="shrink-0"
          >
            <img
              src={showBack ? getBackImageUrl(card.imageUrl) : card.imageUrl}
              alt={card.cardName}
              className="h-[84px] w-[52px] rounded-xl object-cover shadow-sm transition-opacity duration-200"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = card.imageUrl!;
                setShowBack(false);
              }}
            />
          </button>
        ) : (
          <div className="flex h-[84px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-muted shadow-sm">
            <span className="text-[10px] text-muted-foreground">없음</span>
          </div>
        )}

        {/* 카드 정보 */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          {/* 카드명 + 순위 */}
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground">
                {card.cardName}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatCardType(card.cardType)}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {rank}위
            </span>
          </div>

          {/* 혜택 목록 */}
          {card.benefits.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {card.benefits.map((b) => (
                <div key={b.category} className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground">{b.category}</span>
                  <span className="text-[10px] font-semibold text-foreground/60">
                    {stripCategory(b.category, b.description)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-3">
        <Button
          className="h-9 w-full text-sm"
          onClick={() => {
            if (card.applyUrl?.startsWith("https://")) window.open(card.applyUrl, "_blank", "noopener,noreferrer");
          }}
          disabled={!card.applyUrl}
        >
          신청하기
        </Button>
      </div>
    </div>
  );
}
