"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  ArrowUp,
  BookText,
  Coins,
  CreditCard,
  Landmark,
  PieChart,
  Receipt,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { HomeHeader } from "@/components/common/HomeHeader";
import { CmaBalanceCard } from "@/components/features/cma/CmaBalanceCard";
import { SectionHeader } from "@/components/common/SectionHeader";
import { StatCard } from "@/components/common/StatCard";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { WelcomeEventDialog } from "@/components/features/onboarding/WelcomeEventDialog";
import { useCmaHome, isNoCmaAccount } from "@/hooks/queries/useCmaHome";
import { useWelcomeRewards } from "@/hooks/queries/useWelcomeRewards";
import { useCollectChange } from "@/hooks/mutations/useCollectChange";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { CollectSourceType } from "@/types/domain/cma";

const SOURCE_ICON: Record<
  CollectSourceType,
  React.ComponentType<{ className?: string }>
> = {
  ACCOUNT: Landmark,
  CARD: CreditCard,
  POINT: Coins,
};

const SOURCE_LABEL: Record<CollectSourceType, string> = {
  ACCOUNT: "계좌",
  CARD: "카드",
  POINT: "포인트",
};

interface QuickLink {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  highlight?: boolean;
}

// TODO: 라우트 일부 미확정 — 사용자 지정 대기 중 (#)
const QUICK_LINKS: QuickLink[] = [
  { label: "주식 모으기", icon: TrendingUp, href: "/trading", highlight: true },
  { label: "환전", icon: ArrowLeftRight, href: "/exchange" },
  { label: "가계부", icon: BookText, href: "/budget" },
  { label: "포트폴리오", icon: PieChart, href: "/portfolio" },
  { label: "자산", icon: Wallet, href: "/asset" },
  { label: "모으기 설정", icon: Settings, href: "/trading/auto" },
  { label: "거래 내역", icon: Receipt, href: "#" },
  { label: "포인트", icon: Coins, href: "#" },
];

const WELCOME_DISMISS_KEY = "ps.welcomeEvent.dismissed";

export default function HomePage() {
  const router = useRouter();
  // TODO: 인사말 이름은 사용자 프로필 API 연동 시 교체 (/home 응답엔 없음)
  const { data, isLoading, isError, error, refetch } = useCmaHome();
  const collect = useCollectChange();

  // 신규 회원 = CMA 계좌 미개설(/home 404). 첫 가입 이벤트 팝업을 먼저 띄운다.
  // (rewards용 localStorage dismiss와 분리 — 계좌 없으면 진입 시 매번 노출)
  const noCmaAccount = isNoCmaAccount(error);
  const [eventOpen, setEventOpen] = useState(true);

  // 첫 가입 이벤트 팝업: 첫 주식 미수령(rewards 비어있음) + 미닫힘 시 노출 (issue #34)
  const rewardsQ = useWelcomeRewards();
  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem(WELCOME_DISMISS_KEY) === "1",
  );
  const welcomeEligible =
    rewardsQ.isSuccess && (rewardsQ.data?.length ?? 0) === 0;
  const dismissWelcome = () => {
    if (typeof window !== "undefined")
      localStorage.setItem(WELCOME_DISMISS_KEY, "1");
    setWelcomeDismissed(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} className="h-32" />
        <SkeletonCard lines={3} className="h-48" />
      </div>
    );
  }

  // 신규 회원(계좌 없음): 첫 가입 이벤트 팝업을 먼저 띄우고, "다음으로"에서 계좌개설로.
  if (noCmaAccount) {
    return (
      <>
        <WelcomeEventDialog
          open={eventOpen}
          onOpenChange={setEventOpen}
          onProceed={() => router.push("/account/open")}
          ctaLabel="계좌 개설하러 가기"
        />
        <div className="flex min-h-[75vh] flex-col items-center justify-center gap-3 px-6 text-center">
          <h2 className="text-2xl font-bold text-foreground">
            아직 계좌가 없어요
          </h2>
          <p className="text-base text-muted-foreground">
            포켓스톡 계좌를 개설하면
            <br />
            투자를 시작할 수 있어요.
          </p>
          <Button
            onClick={() => router.push("/account/open")}
            className="mt-6 h-14 w-full max-w-xs text-lg font-bold"
          >
            계좌 개설하기
          </Button>
        </div>
      </>
    );
  }

  if (isError || !data) {
    return (
      <div>
        <EmptyState
          title="불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              다시 시도
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      {welcomeEligible && (
        <WelcomeEventDialog
          open={!welcomeDismissed}
          onOpenChange={(o) => {
            if (!o) dismissWelcome();
          }}
          onProceed={() => {
            dismissWelcome();
            router.push("/reward");
          }}
          ctaLabel="종목 선택하러 가기"
        />
      )}
      <HomeHeader userName="회원" />
      <div className="space-y-4">
        {/* TODO: usdToKrwRate는 환율 API 연동 시 전달(펼침 시 'N원 기준' 표기) */}
        <CmaBalanceCard
          krwBalance={data.cmaBalance.KRW}
          usdBalance={data.cmaBalance.USD}
          interestRate={data.interestRate}
          todayInterest={data.todayInterest}
        />

        {/* 수집 잔돈 통합 블록 */}
        <div className="rounded-2xl bg-brand-surface p-4">
          <SectionHeader className="mb-2" title="수집한 잔돈" />
          {/* 이번 달 수집한 잔돈 — 은행(신한은행)·카드·포인트 모두 각 소스 행으로 표시 */}
          {data.collectedSources.length > 0 && (
            <div className="space-y-2">
              {data.collectedSources.map((s) => {
                const Icon = SOURCE_ICON[s.sourceType];
                return (
                  <StatCard
                    key={`collected-${s.sourceType}-${s.name}`}
                    orientation="row"
                    icon={<Icon className="size-4" />}
                    title={s.name}
                    subtitle={SOURCE_LABEL[s.sourceType]}
                    value={
                      <AmountDisplay value={s.amount} size="md" className="font-bold" />
                    }
                  />
                );
              })}
            </div>
          )}

          <p className="mb-2 mt-4 text-[13px] font-medium text-muted-foreground">
            수집 가능한 잔돈
          </p>
          {data.collectSources.length === 0 ? (
            <EmptyState title="수집 가능한 잔돈이 없어요" />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {data.collectSources.map((s) => {
                const Icon = SOURCE_ICON[s.sourceType];
                return (
                  <StatCard
                    key={`${s.sourceType}-${s.name}`}
                    orientation="tile"
                    icon={<Icon className="size-4" />}
                    title={s.name}
                    subtitle={SOURCE_LABEL[s.sourceType]}
                    value={
                      <AmountDisplay value={s.amount} size="sm" className="font-bold" />
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        <div>
          <Button
            variant="outline"
            onClick={() => collect.mutate()}
            disabled={data.totalCollectable <= 0 || collect.isPending}
            className="h-12 w-full border-primary text-base font-bold text-primary hover:bg-brand-surface"
          >
            <ArrowUp />
            {formatKRW(data.totalCollectable)} CMA로 모으기
          </Button>
          {collect.isError && (
            <p className="mt-2 text-center text-xs text-destructive">
              모으기에 실패했어요. 잠시 후 다시 시도해 주세요.
            </p>
          )}
        </div>

        <Separator />

        {/* 바로가기 */}
        <section>
          <p className="mb-3 text-[13px] font-medium text-muted-foreground">
            바로가기
          </p>
          <div className="grid grid-cols-4 gap-y-5">
            {QUICK_LINKS.map(({ label, icon: Icon, href, highlight }) => (
              <Link
                key={label}
                href={href}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  className={cn(
                    "flex size-14 items-center justify-center rounded-2xl",
                    highlight
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-foreground",
                  )}
                >
                  <Icon className="size-6" />
                </span>
                <span className="whitespace-nowrap text-xs text-foreground">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
