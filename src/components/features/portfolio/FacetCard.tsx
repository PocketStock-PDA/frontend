"use client";

import { ChevronRight } from "lucide-react";
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
        <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
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

/** 조각 미니 아이콘 — 활성=채운 조각 / 미진행=빈 윤곽 */
export function MiniPuzzle({ active = false }: { active?: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const filled = active && i < 7;
        return (
          <rect
            key={i}
            x={c * 9 + 1}
            y={r * 9 + 1}
            width={7.5}
            height={7.5}
            rx={2}
            {...(filled
              ? { fill: "var(--brand)" }
              : {
                  fill: "none",
                  stroke: active ? "var(--brand)" : "#c7ccd4",
                  strokeWidth: 1.4,
                })}
          />
        );
      })}
    </svg>
  );
}

/** 모으기 미니 아이콘 — 활성=브랜드 동전 / 미진행=빈 윤곽 */
export function MiniCoins({ active = false }: { active?: boolean }) {
  return (
    <svg width="28" height="26" viewBox="0 0 30 28" fill="none" aria-hidden="true">
      {[20, 13, 6].map((y) => (
        <ellipse
          key={y}
          cx={15}
          cy={y}
          rx={11}
          ry={4}
          {...(active
            ? { fill: "var(--brand)" }
            : { fill: "none", stroke: "#c7ccd4", strokeWidth: 1.4 })}
        />
      ))}
    </svg>
  );
}
