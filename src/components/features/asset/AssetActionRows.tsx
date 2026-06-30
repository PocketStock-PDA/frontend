import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AssetActionRowsProps {
  daysUntilMaturity?: number | undefined;
  /** 부모 카드 안에 박아 쓸 때 자체 테두리·라운드 제거 */
  bare?: boolean;
  /** bare로 박을 때 첫 행 위에 구분선(위 콘텐츠와 분리)을 둘지 */
  leadingDivider?: boolean;
}

function MaturityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5 shrink-0">
      {/* 본체 */}
      <rect x="4" y="2" width="16" height="20" rx="2.5" fill="#2563eb" />
      {/* 화면 */}
      <rect x="6" y="4" width="12" height="5" rx="1.5" fill="#dbeafe" />
      {/* 버튼 3×2 */}
      <rect x="6.5" y="12" width="3" height="2.5" rx="0.6" fill="white" fillOpacity="0.65" />
      <rect x="10.5" y="12" width="3" height="2.5" rx="0.6" fill="white" fillOpacity="0.65" />
      <rect x="14.5" y="12" width="3" height="2.5" rx="0.6" fill="white" fillOpacity="0.65" />
      <rect x="6.5" y="16" width="3" height="2.5" rx="0.6" fill="white" fillOpacity="0.65" />
      <rect x="10.5" y="16" width="3" height="2.5" rx="0.6" fill="white" fillOpacity="0.65" />
      {/* = 버튼 강조 */}
      <rect x="14.5" y="16" width="3" height="2.5" rx="0.6" fill="#93c5fd" />
    </svg>
  );
}

// 홈 카드 아이콘 동일 SVG — 카드 본체 + 마그네틱선 + 번호칩
function CardIcon() {
  return (
    <svg className="size-5 shrink-0" viewBox="6 8 24 20" fill="none">
      <rect x="9.5" y="11" width="21" height="13.5" rx="2.6" fill="#3f7bff" />
      <rect x="9.5" y="14" width="21" height="2.6" fill="#2a62e0" />
      <rect x="12.5" y="20" width="6" height="2" rx="1" fill="#fff" fillOpacity="0.85" />
    </svg>
  );
}

export function AssetActionRows({
  daysUntilMaturity,
  bare = false,
  leadingDivider = false,
}: AssetActionRowsProps) {
  return (
    <div className={cn(!bare && "rounded-2xl border border-border overflow-hidden")}>
      <ActionRow
        href="/recommendations/maturity/select"
        icon={<MaturityIcon />}
        title="만기 자금 굴리기"
        description="예금·적금 만기 자금을 배당주로"
        badge={
          daysUntilMaturity !== undefined ? (
            <span
              className={cn(
                "font-numeric shrink-0 text-sm font-bold tabular-nums",
                daysUntilMaturity <= 7
                  ? "text-destructive ps-badge-urgent"
                  : "text-muted-foreground",
              )}
            >
              D-{daysUntilMaturity}
            </span>
          ) : null
        }
        divider={leadingDivider}
      />
      <ActionRow
        href="/recommendations/cards"
        icon={<CardIcon />}
        title="맞춤 카드 추천"
        description="소비 패턴에 맞는 카드"
        divider
      />
    </div>
  );
}

interface ActionRowProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: React.ReactNode;
  divider?: boolean;
}

function ActionRow({ href, icon, title, description, badge, divider }: ActionRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 px-4 py-3.5 transition-[colors,transform] duration-150 hover:bg-muted/50 active:scale-[0.99] active:bg-muted",
        divider && "border-t border-border",
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-surface text-primary transition-transform duration-150 group-active:scale-95">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {badge}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}
