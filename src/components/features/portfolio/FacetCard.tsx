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

// ── 미니 직소(2×2) — 시그니처 JigsawPuzzle과 같은 탭/홈 기하를 축소 재현 ──
const MP_S = 12; // 조각 크기
const MP_A = 0.4; // 탭 목 시작
const MP_E = 0.6; // 탭 목 끝
const MP_R = 0.16; // 탭 반경(클수록 깊은 홈)

/** 내부 경계 부호(결정적) — 같은 경계를 양쪽 조각이 공유해 탭↔홈으로 맞물림 */
function mpSign(kind: "h" | "v", i: number, j: number): 1 | -1 {
  const n = (i * 928371 + j * 1299721 + (kind === "h" ? 17 : 91)) % 2;
  return n === 0 ? 1 : -1;
}

function mpHEdge(x0: number, x1: number, y: number, b: number): string {
  if (b === 0) return `L ${x1} ${y} `;
  const len = Math.abs(x1 - x0);
  const dir = Math.sign(x1 - x0);
  const a = x0 + dir * len * MP_A;
  const e = x0 + dir * len * MP_E;
  const r = len * MP_R;
  const sweep = b > 0 ? (dir > 0 ? 1 : 0) : dir > 0 ? 0 : 1;
  return `L ${a} ${y} A ${r} ${r} 0 1 ${sweep} ${e} ${y} L ${x1} ${y} `;
}

function mpVEdge(x: number, y0: number, y1: number, b: number): string {
  if (b === 0) return `L ${x} ${y1} `;
  const len = Math.abs(y1 - y0);
  const dir = Math.sign(y1 - y0);
  const a = y0 + dir * len * MP_A;
  const e = y0 + dir * len * MP_E;
  const r = len * MP_R;
  const sweep = b > 0 ? (dir > 0 ? 0 : 1) : dir > 0 ? 1 : 0;
  return `L ${x} ${a} A ${r} ${r} 0 1 ${sweep} ${x} ${e} L ${x} ${y1} `;
}

function mpPiecePath(r: number, c: number): string {
  const x0 = c * MP_S;
  const y0 = r * MP_S;
  const x1 = x0 + MP_S;
  const y1 = y0 + MP_S;
  const top = r === 0 ? 0 : mpSign("h", r, c);
  const right = c === 1 ? 0 : mpSign("v", r, c + 1);
  const bottom = r === 1 ? 0 : mpSign("h", r + 1, c);
  const left = c === 0 ? 0 : mpSign("v", r, c);
  return (
    `M ${x0} ${y0} ` +
    mpHEdge(x0, x1, y0, top) +
    mpVEdge(x1, y0, y1, right) +
    mpHEdge(x1, x0, y1, bottom) +
    mpVEdge(x0, y1, y0, left) +
    "Z"
  );
}

/** 조각 미니 아이콘 — 시그니처와 같은 인터로킹 직소(2×2). 바구니와 동일한 브랜드 블루.
 *  활성=브랜드 채움 / 미진행=브랜드 빈 윤곽 */
export function MiniPuzzle({ active = false }: { active?: boolean }) {
  const filledN = active ? 3 : 0; // 활성=3/4 채움(거의 다 모은 느낌)
  return (
    <svg width="34" height="34" viewBox="-2 -2 28 28" fill="none" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => {
        const r = Math.floor(i / 2);
        const c = i % 2;
        const filled = i < filledN;
        return (
          <path
            key={i}
            d={mpPiecePath(r, c)}
            {...(filled
              ? { fill: "var(--brand)" }
              : {
                  fill: "none",
                  stroke: "var(--brand)",
                  strokeWidth: 1.6,
                  strokeLinejoin: "round" as const,
                })}
          />
        );
      })}
    </svg>
  );
}
