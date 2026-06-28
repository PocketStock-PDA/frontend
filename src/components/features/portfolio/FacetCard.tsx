"use client";

import { ChevronRight } from "lucide-react";
import { PuzzlePieceIcon } from "@/components/common/PuzzlePieceIcon";
import { cn } from "@/lib/utils";

export interface FacetCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  /** 진행 중(보유/모으기 활성) → 브랜드 틴트 + chevron / 미진행 → 외곽선 + 시작 CTA */
  active?: boolean;
  /** 활성 배지(예: "진행 중") */
  badge?: string | null;
  /** 미진행 시 우측 CTA 라벨(예: "담기"/"시작"/"전환"). active면 chevron */
  cta?: string | null;
  onClick: () => void;
}

/** 종목 허브의 "이 종목 모으는 법" 카드 — 조각/모으기/온주전환 공용(있으면 현황·없으면 유도). */
export function FacetCard({
  icon,
  title,
  subtitle,
  active = false,
  badge,
  cta,
  onClick,
}: FacetCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-2xl p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "bg-brand-surface hover:bg-brand-surface/70"
          : "border border-border hover:bg-muted/40",
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-[15px] font-bold",
              active ? "text-primary" : "text-foreground",
            )}
          >
            {title}
          </span>
          {badge && (
            <span className="rounded-full bg-card px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {badge}
            </span>
          )}
        </span>
        <span
          className={cn(
            "mt-0.5 block truncate text-[12.5px]",
            // brand-surface(활성) 위 muted는 4.5:1 미달 → ink로 끌어올린다(DESIGN: 틴트 위 보조텍스트)
            active ? "text-foreground/80" : "text-muted-foreground",
          )}
        >
          {subtitle}
        </span>
      </span>
      {cta ? (
        <span className="flex shrink-0 items-center gap-0.5 text-[13px] font-bold text-primary">
          {cta}
          <ChevronRight className="size-3.5" />
        </span>
      ) : (
        <ChevronRight className="size-[18px] shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}

/** 조각 미니 아이콘 — 단일 직소 조각(웰컴 팝업과 동일 실루엣, 가운데 정렬).
 *  size-6: 퍼즐은 viewBox를 꽉 채워, 내부 여백 큰 CollectIcon(size-9)과 시각 크기를 맞춤.
 *  활성=브랜드 채움 / 미진행=브랜드 윤곽 */
export function MiniPuzzle({ active = false }: { active?: boolean }) {
  return <PuzzlePieceIcon filled={active} className="size-6" />;
}
