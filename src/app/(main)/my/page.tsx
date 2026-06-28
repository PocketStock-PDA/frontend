"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  LayoutGrid,
  LogOut,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/common/AppHeader";
import { Switch } from "@/components/ui/switch";
import { useMyProfile } from "@/hooks/queries/useMyProfile";
import { useCollectSettings } from "@/hooks/queries/useCollectSettings";
import { useUpdateMyPageSettings } from "@/hooks/mutations/useUpdateMyPageSettings";
import { useSaveCollectSettings } from "@/hooks/mutations/useSaveCollectSettings";
import { useLogout } from "@/hooks/mutations/useAuth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { enablePush } from "@/lib/push/webPush";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

const SOON = () => toast.info("준비 중이에요");

// 푸시 알림 켜기 — 권한 요청 → 구독 → 백엔드 토큰 등록
const handleEnablePush = async () => {
  try {
    const result = await enablePush();
    if (result === "ok") toast.success("푸시 알림을 켰어요");
    else if (result === "denied")
      toast.error("알림 권한이 거부됐어요. 기기 설정에서 허용해 주세요.");
    else
      toast.info(
        "이 환경에서는 푸시를 사용할 수 없어요. 앱 설치 후 이용해 주세요.",
      );
  } catch {
    // 구독/토큰 등록 중 네트워크·API 실패
    toast.error("푸시 알림 설정에 실패했어요. 잠시 후 다시 시도해 주세요.");
  }
};

/** 우측 화살표가 있는 설정 카드 (탭 시 이동) */
function SettingLinkCard({
  title,
  subtitle,
  danger = false,
  icon: Icon = ChevronRight,
  onClick,
}: {
  title: string;
  subtitle?: string;
  danger?: boolean;
  icon?: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-[72px] flex-col items-start justify-between rounded-2xl border border-border p-[15px] text-left"
    >
      <span className="space-y-0.5">
        <span
          className={cn(
            "block text-xs font-medium leading-snug",
            danger ? "text-destructive" : "text-foreground",
          )}
        >
          {title}
        </span>
        {subtitle && (
          <span className="block text-[11px] text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
      <Icon className="size-3.5 self-end text-muted-foreground" />
    </button>
  );
}

export default function MyPage() {
  const router = useRouter();
  const { data: profile } = useMyProfile();
  const { setGuest } = useAuth();
  const logout = useLogout();
  const updateSettings = useUpdateMyPageSettings();
  const collectSettingsQ = useCollectSettings();
  const saveCollect = useSaveCollectSettings();

  const [cardChangeCollect, setCardChangeCollect] = useState(false);
  const [monthlySavingCollect, setMonthlySavingCollect] = useState(false);

  // 프로필이 바뀔 때마다 토글을 서버 설정값으로 재동기화.
  // effect 대신 렌더 중 이전값 비교 (set-state-in-effect 룰 회피 + React 권장 패턴).
  // 초기값은 undefined여야 한다 — profile이 이미 캐시돼 첫 렌더부터 존재하는 경우에도
  // 동기화가 1회 실행되도록(profile로 초기화하면 비교가 영원히 false라 토글이 안 맞음).
  const [prevProfile, setPrevProfile] = useState<typeof profile>(undefined);
  if (profile && profile !== prevProfile) {
    setPrevProfile(profile);
    setCardChangeCollect(profile.settings.cardChangeCollect);
    setMonthlySavingCollect(profile.settings.monthlySavingCollect);
  }

  // 카드 잔돈 모으기는 카드 수집설정(별도 저장소)과 양방향으로 동기화한다.
  // ON  → 모을 카드를 직접 고르도록 card-collect 페이지로 이동(저장 시 토글 플래그 자동 ON).
  // OFF → 현재 enabled 인 CARD 수집설정을 모두 해제(연동 해제) → 플래그도 자동 OFF.
  const toggleCardChangeCollect = (next: boolean) => {
    if (next) {
      router.push("/my/card-collect");
      return;
    }
    setCardChangeCollect(false); // 낙관적 반영
    const disable = (collectSettingsQ.data ?? [])
      .filter((s) => s.sourceType === "CARD" && s.enabled)
      .map((s) => ({
        sourceType: "CARD" as const,
        sourceRefId: s.sourceRefId,
        enabled: false,
      }));
    const onError = () => {
      setCardChangeCollect(true);
      toast.error("설정 변경에 실패했어요");
    };
    // enabled 카드가 있으면 수집설정 해제(훅이 플래그까지 동기화), 없으면 플래그만 끔.
    if (disable.length > 0) saveCollect.mutate(disable, { onError });
    else updateSettings.mutate({ cardChangeCollect: false }, { onError });
  };

  // 월 절약금 모으기: 낙관적 반영 후 PATCH. 실패 시 이전 값으로 롤백.
  const toggleMonthlySaving = (next: boolean) => {
    setMonthlySavingCollect(next);
    updateSettings.mutate(
      { monthlySavingCollect: next },
      {
        onError: () => {
          setMonthlySavingCollect(!next);
          toast.error("설정 변경에 실패했어요");
        },
      },
    );
  };

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        setGuest();
        router.replace("/login");
      },
    });
  };

  if (!profile) {
    return <AppHeader variant="sub" title="마이페이지" />;
  }

  return (
    <>
      <AppHeader variant="sub" title="마이페이지" />

      {/* 프로필 */}
      <div className="flex items-center gap-3.5 py-2">
        <span className="flex size-13 shrink-0 items-center justify-center rounded-[26px] bg-primary text-[22px] font-bold text-primary-foreground">
          {profile.name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-foreground">{profile.name}</p>
          <p className="text-sm text-muted-foreground">{profile.username}</p>
        </div>
      </div>

      {/* 요약 카드 (CMA / 퍼즐판 총 평가) */}
      <div
        className="mt-2 flex items-center justify-between rounded-xl p-5 text-white"
        style={{ backgroundImage: "var(--grad-1)" }}
      >
        <div>
          <p className="text-[12px] text-white/80">포켓스톡 CMA</p>
          <p className="mt-0.5 text-2xl font-semibold">
            {formatKRW(profile.cmaBalance)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] text-white/80">퍼즐판 총 평가</p>
          <p className="mt-0.5 text-2xl font-semibold">
            {formatKRW(profile.puzzleValuation)}
          </p>
        </div>
      </div>

      {/* 홈화면 편집 + 자산연동 추가 */}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          onClick={() => router.push("/home/edit")}
          className="flex min-h-[72px] flex-col items-start justify-between rounded-2xl border border-border p-[15px] text-left"
        >
          <LayoutGrid className="size-5 text-primary" />
          <span className="text-xs font-medium leading-snug text-foreground">
            홈화면 편집
          </span>
        </button>
        <button
          onClick={() => router.push("/asset-link")}
          className="flex min-h-[72px] flex-col items-start justify-between rounded-2xl border border-border p-[15px] text-left"
        >
          <Plus className="size-5 text-primary" />
          <span className="text-xs font-medium leading-snug text-foreground">
            자산연동 추가하기
          </span>
        </button>
      </div>

      {/* 구분 밴드 */}
      <div className="-mx-5 mt-5 h-2 bg-muted" />

      {/* 설정 */}
      <p className="mb-2 mt-5 text-xs font-medium text-muted-foreground">
        설정
      </p>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {/* 토글 2개 */}
        <div className="flex flex-col gap-2 rounded-2xl border border-border px-[15px] py-3.5">
          <p className="text-xs font-medium leading-snug text-foreground">
            카드 잔돈
            <br />
            모으기
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-500">
              {cardChangeCollect ? "ON" : "OFF"}
            </span>
            <Switch
              checked={cardChangeCollect}
              onCheckedChange={toggleCardChangeCollect}
              disabled={updateSettings.isPending || saveCollect.isPending}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-border px-[15px] py-3.5">
          <p className="text-xs font-medium leading-snug text-foreground">
            월 절약금
            <br />
            모으기
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-500">
              {monthlySavingCollect ? "ON" : "OFF"}
            </span>
            <Switch
              checked={monthlySavingCollect}
              onCheckedChange={toggleMonthlySaving}
              disabled={updateSettings.isPending}
            />
          </div>
        </div>

        {/* 이동형 카드 */}
        <SettingLinkCard
          title="카드 잔돈 모으기 등록 카드 변경"
          onClick={() => router.push("/my/card-collect")}
        />
        <SettingLinkCard
          title="절약금 이체되는 계좌 변경"
          onClick={() => router.push("/my/savings-transfer")}
        />
        <SettingLinkCard title="알림 설정" onClick={handleEnablePush} />
        <SettingLinkCard
          title="회원정보 수정"
          subtitle="비밀번호 변경"
          onClick={SOON}
        />
      </div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={logout.isPending}
        className="flex items-center gap-1 disabled:opacity-50"
      >
        <span className="block text-[12px] text-muted-foreground">
          로그아웃
        </span>
        <LogOut className="size-3.5 text-muted-foreground" />
      </button>
    </>
  );
}
