"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { PartnerPointSheet } from "@/components/features/points/PartnerPointSheet";
import { useCmaHome } from "@/hooks/queries/useCmaHome";
import { cn } from "@/lib/utils";

type EventStatus = "ongoing" | "ended";

interface EventItem {
  emoji: string;
  /** 상단 보조 문구(카테고리) */
  subtitle: string;
  /** 굵은 제목 */
  title: string;
  /** 진행중 이벤트 우측 칩 라벨 */
  reward: string;
  status: EventStatus;
  /** 진행중 이벤트 이동 링크 */
  href?: string;
}

// 진행중: SOL야구 · 급여클럽+ (링크 추후 연결) / 나머지는 종료된 이벤트
const EVENT_ITEMS: EventItem[] = [
  {
    emoji: "⚾",
    subtitle: "365 즐기는 야구 생활",
    title: "SOL야구",
    reward: "참여하기",
    status: "ongoing",
    href: "https://m.shinhan.com/rib/mnew/index.jsp#210011008600",
  },
  {
    emoji: "💵",
    subtitle: "매월 모으는 급여 봉투",
    title: "급여클럽+",
    reward: "참여하기",
    status: "ongoing",
    href: "https://m.shinhan.com/rib/mnew/index.jsp#210010850002",
  },
  {
    emoji: "👟",
    subtitle: "매일 만보걷고 포인트 받기",
    title: "만보걷기",
    reward: "참여하기",
    status: "ended",
  },
  {
    emoji: "🏃",
    subtitle: "달릴수록 커지는 혜택",
    title: "20+ 뛰어요",
    reward: "참여하기",
    status: "ended",
  },
  {
    emoji: "🅿️",
    subtitle: "포인트가 쌓이는 신한인증서",
    title: "차곡차곡 포인트",
    reward: "랜덤포인트",
    status: "ended",
  },
  {
    emoji: "📈",
    subtitle: "경제지표 맞히고 포인트 받기",
    title: "매일 코스피 예측",
    reward: "정답 포인트",
    status: "ended",
  },
  {
    emoji: "📺",
    subtitle: "광고만 봐도 포인트가 팡팡",
    title: "광고보고 포인트 받기",
    reward: "포인트+혜택",
    status: "ended",
  },
];

const TABS = [
  { key: "all", label: "전체" },
  { key: "ongoing", label: "진행중" },
  { key: "ended", label: "종료된 이벤트" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function EventRow({ item }: { item: EventItem }) {
  const ended = item.status === "ended";
  const handleClick = () => {
    if (ended) {
      toast.info("종료된 이벤트예요");
      return;
    }
    // 진행중: 링크로 이동(새 창) > 준비중 토스트
    if (item.href) window.open(item.href, "_blank", "noopener,noreferrer");
    else toast.info("준비 중이에요");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl py-2.5 text-left transition-colors hover:bg-muted/50 active:bg-muted",
        ended && "opacity-60",
      )}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl">
        {item.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] text-muted-foreground">
          {item.subtitle}
        </p>
        <p className="mt-0.5 truncate text-[15px] font-bold text-foreground">
          {item.title}
        </p>
      </div>
      {ended ? (
        <span className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">
          종료
        </span>
      ) : (
        <span className="shrink-0 rounded-full bg-brand-surface px-3 py-1.5 text-xs font-bold text-primary">
          {item.reward}
        </span>
      )}
    </button>
  );
}

export default function PointsPage() {
  const { data, isLoading, isError } = useCmaHome();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("all");

  // 마이신한포인트(자사) vs 제휴사 포인트 — 홈과 동일하게 기관명 '신한' 포함 여부로 구분.
  const pointSources =
    data?.collectSources.filter((s) => s.sourceType === "POINT") ?? [];
  const myShinhanTotal = pointSources
    .filter((s) => s.name.includes("신한"))
    .reduce((sum, s) => sum + s.amount, 0);
  const partnerPointTotal = pointSources
    .filter((s) => !s.name.includes("신한"))
    .reduce((sum, s) => sum + s.amount, 0);
  const totalPoint = myShinhanTotal + partnerPointTotal;

  // 조회 중/실패를 실제 0P와 구분 — 로딩은 스켈레톤, 실패는 '—'로 표시.
  const pointNode = (value: number) =>
    isLoading ? (
      <span className="inline-block h-4 w-14 animate-pulse rounded bg-foreground/10 align-[-2px]" />
    ) : isError ? (
      "—"
    ) : (
      `${value.toLocaleString()}P`
    );

  const visibleItems =
    tab === "all" ? EVENT_ITEMS : EVENT_ITEMS.filter((i) => i.status === tab);

  return (
    <>
      <AppHeader variant="sub" title="포인트" />
      <div className="space-y-4">
        {/* 포인트 히어로 카드 — 전체 포인트 + 신한/제휴사 분리(제휴사 옆 연동 설정) */}
        <div className="overflow-hidden rounded-2xl mb-6 p-5 text-foreground bg-brand-surface">
          <p className="text-sm font-medium text-primary">전체 포인트</p>
          {isError ? (
            <p className="mt-1 text-sm text-muted-foreground">
              포인트를 불러오지 못했어요
            </p>
          ) : isLoading ? (
            <div className="mt-1.5 h-7 w-32 animate-pulse rounded bg-foreground/10" />
          ) : (
            <p className="mt-0.5 font-numeric text-2xl font-semibold">
              {totalPoint.toLocaleString()}P
            </p>
          )}

          <div className="mt-4 flex divide-x divide-border/35 rounded-xl bg-card border border-border text-left">
            <div className="flex-1 px-4 py-3">
              <p className="text-[12px] text-foreground/70">신한포인트</p>
              <p className="mt-0.5 font-numeric text-[16px] font-semibold">
                {pointNode(myShinhanTotal)}
              </p>
            </div>
            <div className="flex flex-1 items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[12px] text-foreground/70">제휴사 포인트</p>
                <p className="mt-0.5 font-numeric text-[15px] font-semibold">
                  {pointNode(partnerPointTotal)}
                </p>
              </div>
              <button
                type="button"
                aria-label="제휴사 연동 설정"
                onClick={() => setSheetOpen(true)}
                className="shrink-0 rounded-full p-1.5 text-foreground transition-colors"
              >
                <Settings2 className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 세그먼트 탭 (아웃라인 없이 채움/텍스트) */}
        <div className="flex gap-2 mb-2">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors",
                tab === key
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 이벤트 리스트 */}
        {visibleItems.length > 0 ? (
          <div className="space-y-0.5">
            {visibleItems.map((item) => (
              <EventRow key={item.title} item={item} />
            ))}
          </div>
        ) : (
          <div className="py-10">
            <EmptyState
              title="해당하는 이벤트가 없어요"
              description="새로운 이벤트가 곧 찾아올 거예요."
            />
          </div>
        )}
      </div>

      <PartnerPointSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
