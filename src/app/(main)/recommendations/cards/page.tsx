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

const BAR_COLORS = ["#0471E9", "#3D8BEE", "#7DB2F4"];

export default function CardRecommendationPage() {
  const { data, isLoading, isError } = useCardRecommendation();

  if (isLoading) {
    return (
      <>
        <AppHeader variant="sub" title="카드 추천" />
        <div className="space-y-4 pt-5">
          <SkeletonCard lines={3} className="h-20" />
          <SkeletonCard lines={4} className="h-44" />
          <SkeletonCard lines={4} className="h-44" />
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

  const maxPct = Math.max(...data.topCategories.map((c) => c.percentage), 1);

  return (
    <>
      <AppHeader variant="sub" title="카드 추천" />
      <div className="py-5">

        {/* ── 소비 카테고리 ── */}
        {data.topCategories.length > 0 && (
          <section className="mb-7">
            <p className="mb-3 text-[13px] text-muted-foreground">많이 쓰는 곳</p>
            <div className="space-y-3">
              {data.topCategories.map((cat, i) => (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-medium text-foreground">
                      {cat.category}
                    </span>
                    <span className="font-numeric text-[12px] font-semibold text-foreground">
                      {cat.percentage}%
                    </span>
                  </div>
                  <div className="h-[5px] w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(cat.percentage / maxPct) * 100}%`,
                        backgroundColor: BAR_COLORS[i] ?? BAR_COLORS[2],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 카드 목록 ── */}
        <p className="mb-4 text-sm font-semibold text-foreground">
          추천 카드 {data.recommendations.length}개
        </p>
        <div className="space-y-4">
          {data.recommendations.map((card, index) => (
            <CardItem
              key={`${card.cardName}-${card.imageUrl ?? ""}`}
              card={card}
              rank={index + 1}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function CardItem({ card, rank }: { card: CardRecommendationItem; rank: number }) {
  const [showBack, setShowBack] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = card.imageUrl;

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex gap-4">
        {/* 카드 이미지 — 탭하면 앞뒤 전환 */}
        {imageUrl && !imageFailed ? (
          <button
            type="button"
            onClick={() => setShowBack((v) => !v)}
            className="shrink-0"
            aria-label={showBack ? "카드 앞면 보기" : "카드 뒷면 보기"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={showBack ? getBackImageUrl(imageUrl) : imageUrl}
              alt={card.cardName}
              className="h-[104px] w-[66px] rounded-xl object-cover shadow-[0_4px_14px_rgba(0,0,0,0.13)] transition-opacity duration-200"
              onError={() => {
                if (showBack) { setShowBack(false); return; }
                setImageFailed(true);
              }}
            />
          </button>
        ) : (
          <div className="flex h-[104px] w-[66px] shrink-0 items-center justify-center rounded-xl bg-muted">
            <span className="text-[10px] text-muted-foreground">없음</span>
          </div>
        )}

        {/* 카드 정보 */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* 카드명 + 순위 + 종류 */}
          <p className="text-[15px] font-bold leading-snug text-foreground">
            {card.cardName}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            <span className="font-semibold text-[#0471E9]">{rank}위</span>
            {" · "}
            {formatCardType(card.cardType)}
          </p>

          {/* 혜택 목록 */}
          {card.benefits.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {card.benefits.map((b) => (
                <div key={b.category} className="flex items-start justify-between gap-3">
                  <span className="shrink-0 text-[12px] text-muted-foreground">
                    {b.category}
                  </span>
                  <span className="text-right text-[12px] font-semibold text-foreground">
                    {stripCategory(b.category, b.description)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-4">
        <Button
          className="h-10 w-full text-sm font-semibold"
          onClick={() => {
            if (card.applyUrl?.startsWith("https://"))
              window.open(card.applyUrl, "_blank", "noopener,noreferrer");
          }}
          disabled={!card.applyUrl}
        >
          신청하기
        </Button>
      </div>
    </div>
  );
}
