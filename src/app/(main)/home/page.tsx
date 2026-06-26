"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Coins, CreditCard, Globe, Landmark } from "lucide-react";
import { HomeHeader } from "@/components/common/HomeHeader";
import { CmaBalanceCard } from "@/components/features/cma/CmaBalanceCard";
import { CollectCoinsOverlay } from "@/components/features/cma/CollectCoinsOverlay";
import { SectionHeader } from "@/components/common/SectionHeader";
import { StatCard } from "@/components/common/StatCard";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { WelcomeEventDialog } from "@/components/features/onboarding/WelcomeEventDialog";
import { useCmaHome, isNoCmaAccount } from "@/hooks/queries/useCmaHome";
import { useMyProfile } from "@/hooks/queries/useMyProfile";
import { useNotifications } from "@/hooks/queries/useNotifications";
import { useWelcomeRewards } from "@/hooks/queries/useWelcomeRewards";
import { useCollectChange } from "@/hooks/mutations/useCollectChange";
import {
  useHomeLayoutStore,
  useHydrateHomeLayout,
  visibleLinks,
} from "@/store/homeLayoutStore";
import { formatKRW, formatUSD } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { CollectSourceType } from "@/types/domain/cma";

const SOURCE_ICON: Record<
  CollectSourceType,
  React.ComponentType<{ className?: string }>
> = {
  ACCOUNT: Landmark,
  CARD: CreditCard,
  POINT: Coins,
  FX: Globe,
};

const SOURCE_LABEL: Record<CollectSourceType, string> = {
  ACCOUNT: "계좌",
  CARD: "카드",
  POINT: "포인트",
  FX: "외화",
};

// 잔돈 대시보드 표시 타이틀 — ACCOUNT/POINT는 백엔드 name(기관명) 대신 고정 라벨로 노출.
const sourceTitle = (sourceType: CollectSourceType, name: string) =>
  sourceType === "ACCOUNT"
    ? "은행 잔돈"
    : sourceType === "POINT"
      ? "포인트"
      : name;


export default function HomePage() {
  const router = useRouter();
  // 인사말 이름은 /home 응답에 없어 마이페이지 프로필(GET /api/users/me/mypage)에서 가져온다.
  const { data, isLoading, isError, error, refetch } = useCmaHome();
  const { data: profile } = useMyProfile();
  const { data: notifications } = useNotifications();
  const collect = useCollectChange();

  // "CMA로 모으기" 코인 모이기 연출 — 출발(수집 잔돈 블록)·도착(모으기 버튼) 영역 측정용 ref.
  const sourcesRef = useRef<HTMLDivElement>(null);
  const collectBtnRef = useRef<HTMLDivElement>(null);

  const [collectAnim, setCollectAnim] = useState<{
    id: number;
    origin: DOMRect;
    target: DOMRect;
  } | null>(null);

  const handleCollect = () => {
    if (collect.isPending) return; // 재진입 방지
    collect.mutate(undefined, {
      // 성공했을 때만 코인 모이기 연출 — 실패 요청엔 재생하지 않음
      onSuccess: () => {
        const origin = sourcesRef.current?.getBoundingClientRect();
        const target = collectBtnRef.current?.getBoundingClientRect();
        if (origin && target) {
          setCollectAnim({ id: Date.now(), origin, target });
        }
      },
    });
  };

  const linkOrder = useHomeLayoutStore((s) => s.order);
  const hiddenLinks = useHomeLayoutStore((s) => s.hidden);
  useHydrateHomeLayout();
  const quickLinks = useMemo(
    () => visibleLinks(linkOrder, hiddenLinks),
    [linkOrder, hiddenLinks],
  );

  // SOL트래블(FX)은 백엔드가 0원이면 collectSources에서 빼므로, 없으면 0원 타일로 보강.
  // 타일 위치가 바뀌지 않도록 고정 순서(계좌 → 카드 → 포인트 → 외화)로 정렬한다.
  const displayedCollectSources = useMemo(() => {
    const sources = data?.collectSources ?? [];
    const withFx = sources.some((s) => s.sourceType === "FX")
      ? sources
      : [
          ...sources,
          {
            sourceType: "FX" as const,
            name: "SOL트래블",
            amount: 0,
            currency: "USD" as const,
          },
        ];
    const order: Record<CollectSourceType, number> = {
      ACCOUNT: 0,
      CARD: 1,
      POINT: 2,
      FX: 3,
    };
    return [...withFx].sort(
      (a, b) => order[a.sourceType] - order[b.sourceType],
    );
  }, [data]);

  // 신규 회원 = CMA 계좌 미개설(/home 404). 첫 가입 이벤트 팝업을 먼저 띄운다.
  // (rewards용 localStorage dismiss와 분리 — 계좌 없으면 진입 시 매번 노출)
  const noCmaAccount = isNoCmaAccount(error);
  const [eventOpen, setEventOpen] = useState(true);

  // 첫 가입 이벤트 팝업: 첫 주식 미수령(rewards 비어있음) 시 홈 진입마다 노출 (issue #84)
  // 미수령이면 localStorage dismiss 무시 — 닫아도 홈 재진입 시 다시 뜸.
  // 수령 완료 시 welcomeEligible이 false가 되어 팝업 자체가 렌더되지 않음.
  const rewardsQ = useWelcomeRewards();
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const welcomeEligible =
    rewardsQ.isSuccess && (rewardsQ.data?.length ?? 0) === 0;
  const dismissWelcome = () => setWelcomeDismissed(true);

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

  // 모으기 버튼 금액: KRW·USD 별도 합계를 함께 표기.
  // 임계 판단은 표시 단위(원/센트)와 동일 기준 — 포매터(ROUND_DOWN) 출력이 0이면 노출/활성 제외
  // (예: 0<USD<0.01은 "$0.00"으로 찍히므로 "0인데 활성" 모순 방지)
  const krwLabel = formatKRW(data.totalCollectable);
  const usdLabel = formatUSD(data.totalCollectableUsd);
  const hasKrw = krwLabel !== formatKRW(0);
  const hasUsd = usdLabel !== formatUSD(0);
  const collectAmounts = [
    hasKrw ? krwLabel : null,
    hasUsd ? usdLabel : null,
  ].filter(Boolean);
  const collectLabel =
    collectAmounts.length > 0 ? collectAmounts.join(" · ") : formatKRW(0);

  return (
    <>
      {collectAnim && (
        <CollectCoinsOverlay
          key={collectAnim.id}
          active
          origin={collectAnim.origin}
          target={collectAnim.target}
          onComplete={() => setCollectAnim(null)}
        />
      )}
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
      <HomeHeader
        userName={profile?.name ?? "회원"}
        onBellClick={() => router.push("/notifications")}
        unreadCount={notifications?.unreadCount ?? 0}
      />
      <div className="space-y-4">
        {/* TODO: usdToKrwRate는 환율 API 연동 시 전달(펼침 시 'N원 기준' 표기) */}
        <CmaBalanceCard
          krwBalance={data.cmaBalance.KRW}
          usdBalance={data.cmaBalance.USD}
          interestRate={data.interestRate}
          todayInterest={data.todayInterest}
        />

        {/* 수집 잔돈 통합 블록 */}
        <div ref={sourcesRef} className="rounded-2xl bg-brand-surface p-4">
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
                    title={sourceTitle(s.sourceType, s.name)}
                    subtitle={SOURCE_LABEL[s.sourceType]}
                    value={
                      <AmountDisplay
                        value={s.amount}
                        currency={s.currency}
                        size="md"
                        className="font-bold"
                      />
                    }
                  />
                );
              })}
            </div>
          )}

          <p className="mb-2 mt-4 text-[13px] font-medium text-muted-foreground">
            수집 가능한 잔돈
          </p>
          {displayedCollectSources.length === 0 ? (
            <EmptyState title="수집 가능한 잔돈이 없어요" />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {displayedCollectSources.map((s) => {
                const Icon = SOURCE_ICON[s.sourceType];
                return (
                  <StatCard
                    key={`${s.sourceType}-${s.name}`}
                    orientation="tile"
                    icon={<Icon className="size-4" />}
                    title={sourceTitle(s.sourceType, s.name)}
                    subtitle={SOURCE_LABEL[s.sourceType]}
                    value={
                      <AmountDisplay
                        value={s.amount}
                        currency={s.currency}
                        size="sm"
                        className="font-bold"
                      />
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div ref={collectBtnRef}>
            <Button
              variant="outline"
              onClick={handleCollect}
              disabled={(!hasKrw && !hasUsd) || collect.isPending}
              className="h-12 w-full border-primary text-base font-bold text-primary hover:bg-brand-surface"
            >
              <ArrowUp />
              {collectLabel} CMA로 모으기
            </Button>
          </div>
          {collect.isError && (
            <p className="mt-2 text-center text-xs text-destructive">
              모으기에 실패했어요. 잠시 후 다시 시도해 주세요.
            </p>
          )}
        </div>

        <Separator />

        {/* 바로가기 (홈화면 편집에서 순서/표시 변경) */}
        {quickLinks.length > 0 && (
          <section>
            <p className="mb-3 text-[13px] font-medium text-muted-foreground">
              바로가기
            </p>
            <div className="grid grid-cols-4 gap-y-5">
              {quickLinks.map(({ id, label, icon: Icon, href, highlight }) => (
                <Link
                  key={id}
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
        )}
      </div>
    </>
  );
}
