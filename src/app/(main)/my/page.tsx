"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  CreditCard,
  Landmark,
  LogOut,
  Plane,
  Plus,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/common/AppHeader";
import { Switch } from "@/components/ui/switch";
import { useMyProfile } from "@/hooks/queries/useMyProfile";
import { useLogout } from "@/hooks/mutations/useAuth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatKRW } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { LinkedAccount, LinkedAccountType } from "@/types/domain/myPage";

const ACCOUNT_ICON: Record<LinkedAccountType, LucideIcon> = {
  BANK: Landmark,
  CARD: CreditCard,
  TRAVEL: Plane,
  PAY: Smartphone,
};

const SOON = () => toast.info("준비 중이에요");

/** 연동 계좌 칩 (연동됨) */
function LinkedAccountChip({ account }: { account: LinkedAccount }) {
  const Icon = ACCOUNT_ICON[account.type];
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border px-2 py-3">
      <span className="flex size-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-500">
        <Icon className="size-3.5" />
      </span>
      <span className="text-[11px] text-foreground">{account.name}</span>
      <span className="text-[11px] text-emerald-500">연동됨</span>
    </div>
  );
}

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

  const [cardChangeCollect, setCardChangeCollect] = useState(false);
  const [monthlySavingCollect, setMonthlySavingCollect] = useState(false);

  // 프로필이 바뀔 때마다 토글을 서버 설정값으로 재동기화.
  // effect 대신 렌더 중 이전값 비교 (set-state-in-effect 룰 회피 + React 권장 패턴).
  const [prevProfile, setPrevProfile] = useState(profile);
  if (profile && profile !== prevProfile) {
    setPrevProfile(profile);
    setCardChangeCollect(profile.settings.cardChangeCollect);
    setMonthlySavingCollect(profile.settings.monthlySavingCollect);
  }

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
          <p className="text-[11px] text-muted-foreground">{profile.username}</p>
        </div>
      </div>

      {/* 요약 카드 (CMA / 퍼즐판 총 평가) */}
      <div
        className="mt-2 flex items-center justify-between rounded-2xl px-4 py-3.5 text-white"
        style={{ backgroundImage: "var(--grad-1)" }}
      >
        <div>
          <p className="text-[11px] text-white/80">포켓스톡 CMA</p>
          <p className="mt-0.5 text-[22px] font-bold">
            {formatKRW(profile.cmaBalance)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-white/80">퍼즐판 총 평가</p>
          <p className="mt-0.5 text-[22px] font-bold">
            {formatKRW(profile.puzzleValuation)}
          </p>
        </div>
      </div>

      {/* 연동 계좌 */}
      <p className="mb-2 mt-5 text-xs font-medium text-muted-foreground">
        연동 계좌
      </p>
      <div className="grid grid-cols-3 gap-2">
        {profile.linkedAccounts.map((account) => (
          <LinkedAccountChip key={account.id} account={account} />
        ))}
        <button
          onClick={SOON}
          className="flex flex-col items-center gap-1 rounded-xl border border-border px-2 py-3"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Plus className="size-3.5" />
          </span>
          <span className="text-[11px] text-muted-foreground">추가</span>
        </button>
      </div>

      {/* 구분 밴드 */}
      <div className="-mx-5 mt-5 h-2 bg-muted" />

      {/* 설정 */}
      <p className="mb-2 mt-5 text-xs font-medium text-muted-foreground">설정</p>
      <div className="grid grid-cols-2 gap-2.5">
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
              onCheckedChange={setCardChangeCollect}
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
              onCheckedChange={setMonthlySavingCollect}
            />
          </div>
        </div>

        {/* 이동형 카드 */}
        <SettingLinkCard
          title="카드 잔돈 모으기 등록 카드 변경"
          onClick={SOON}
        />
        <SettingLinkCard title="절약금 이체되는 계좌 변경" onClick={SOON} />
        <SettingLinkCard title="주단위 적립 금액 하한선 설정" onClick={SOON} />
        <SettingLinkCard title="알림 설정" onClick={SOON} />
        <SettingLinkCard
          title="회원정보 수정"
          subtitle="비밀번호 변경"
          onClick={SOON}
        />
        <SettingLinkCard
          title="로그아웃"
          danger
          icon={LogOut}
          onClick={handleLogout}
        />
      </div>
    </>
  );
}
