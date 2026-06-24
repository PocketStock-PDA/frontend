"use client";

import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/common/AppHeader";
import { Button } from "@/components/ui/button";
import { useCmaHome } from "@/hooks/queries/useCmaHome";

interface ActivityItem {
  emoji: string;
  title: string;
  description: string;
  buttonLabel: string;
}

const DAILY_ITEMS: ActivityItem[] = [
  { emoji: "⚾", title: "SOL야구", description: "365 즐기는 야구 생활", buttonLabel: "참여하기" },
  { emoji: "👟", title: "만보걷기", description: "매일 만보걷고 포인트 받기", buttonLabel: "랜덤포인트" },
  { emoji: "🏃", title: "20+ 뛰어요", description: "달릴수록 커지는 혜택", buttonLabel: "참여하기" },
];

const CHALLENGE_ITEMS: ActivityItem[] = [
  { emoji: "💵", title: "급여클럽+", description: "매월 모으는 급여 봉투", buttonLabel: "참여하기" },
  { emoji: "🅿️", title: "차곡차곡 포인트", description: "포인트가 쌓이는 신한인증서", buttonLabel: "랜덤포인트" },
  { emoji: "📈", title: "매일 코스피 예측하기", description: "경제지표 맞히고 포인트 받기", buttonLabel: "참여하기" },
  { emoji: "📺", title: "광고보고 포인트 받기", description: "광고만 봐도 포인트가 팡팡", buttonLabel: "참여하기" },
];

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl">
        {item.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{item.title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{item.description}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 border-primary/30 text-xs text-primary"
        onClick={() => toast.info("준비 중이에요")}
      >
        {item.buttonLabel}
      </Button>
    </div>
  );
}

export default function PointsPage() {
  const { data } = useCmaHome();

  const pointBalance = data?.collectSources
    .filter((s) => s.sourceType === "POINT")
    .reduce((sum, s) => sum + s.amount, 0) ?? 0;

  return (
    <>
      <AppHeader variant="sub" title="포인트" />
      <div className="space-y-3 pb-8">
        {/* 포인트 배너 */}
        <div className="relative overflow-hidden rounded-2xl bg-primary px-5 py-5">
          <div className="relative z-10">
            <p className="mb-1 text-[11px] font-medium text-primary-foreground/70">
              마이신한포인트 ⓘ
            </p>
            <button
              className="flex items-center gap-0.5 text-2xl font-bold text-primary-foreground"
              onClick={() => toast.info("준비 중이에요")}
            >
              {pointBalance.toLocaleString()}P <ChevronRight className="size-5" />
            </button>
          </div>

          <div className="relative z-10 mt-4 divide-y divide-white/20 rounded-xl bg-white/20 px-4">
            <button
              className="flex w-full items-center justify-between py-3"
              onClick={() => toast.info("준비 중이에요")}
            >
              <span className="text-[13px] text-primary-foreground/80">내 멤버십</span>
              <span className="flex items-center gap-0.5 text-[13px] font-semibold text-primary-foreground">
                일반 <ChevronRight className="size-3.5" />
              </span>
            </button>
            <button
              className="flex w-full items-center justify-between py-3"
              onClick={() => toast.info("준비 중이에요")}
            >
              <span className="text-[13px] text-primary-foreground/80">내 쿠폰</span>
              <span className="flex items-center gap-0.5 text-[13px] font-semibold text-primary-foreground">
                더보기 <ChevronRight className="size-3.5" />
              </span>
            </button>
          </div>
        </div>

        {/* 매일매일 포인트 쌓기 */}
        <div className="rounded-2xl border border-border p-4">
          <p className="mb-1 text-[15px] font-bold text-foreground">매일매일 포인트 쌓기</p>
          <div className="divide-y divide-border">
            {DAILY_ITEMS.map((item) => (
              <ActivityRow key={item.title} item={item} />
            ))}
          </div>
        </div>

        {/* 더 큰 혜택에 도전 */}
        <div className="rounded-2xl border border-border p-4">
          <p className="mb-1 text-[15px] font-bold text-foreground">더 큰 혜택에 도전</p>
          <div className="divide-y divide-border">
            {CHALLENGE_ITEMS.map((item) => (
              <ActivityRow key={item.title} item={item} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
