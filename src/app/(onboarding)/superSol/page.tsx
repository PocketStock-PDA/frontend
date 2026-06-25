"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Smile,
  Wallet,
  Bell,
  Search,
  ChevronRight,
  Pin,
  Home,
  CircleDollarSign,
  ShoppingBag,
  Gift,
  LineChart,
  WalletCards,
  HeartHandshake,
  CreditCard,
  Banknote,
} from "lucide-react";
import { markEventSeen } from "@/lib/auth/session";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMyProfile } from "@/hooks/queries/useMyProfile";
import { PocketStockEntrySheet } from "./_components/PocketStockEntrySheet";
import { PocketStockIntro } from "./_components/PocketStockIntro";

// "오늘 보지 않기" 로 닫은 날짜를 보관 — 같은 날 재진입 시 팝업 자동 노출 생략.
const POPUP_HIDDEN_KEY = "ps.superSolPopupHiddenDate";
// 로컬(브라우저) 기준 날짜 — toISOString()의 UTC 사용 시 KST 자정 부근에 날짜가 어긋남.
const todayKey = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

export default function SuperSolPage() {
  const router = useRouter();
  const { status } = useAuth();
  const { data: profile } = useMyProfile();
  const [popupOpen, setPopupOpen] = useState(false);
  const [intro, setIntro] = useState(false); // 포켓스톡 전환 영상 재생 중

  // 로그인하지 않은 사용자가 직접 들어오면 로그인으로.
  useEffect(() => {
    if (status === "guest") router.replace("/login");
  }, [status, router]);

  // 진입(authed) 시 1회 포켓스톡 안내 팝업 자동 노출.
  // localStorage 는 클라이언트 전용이라 마운트 후 effect 에서 확인한다("오늘 보지 않기" 생략).
  useEffect(() => {
    if (status !== "authed") return;
    if (localStorage.getItem(POPUP_HIDDEN_KEY) === todayKey()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 진입 시 1회 모달 자동 노출
    setPopupOpen(true);
  }, [status]);

  // 팝업/추천서비스 어느 경로로든 포켓스톡 진입 — 전환 영상 재생 후 메인 홈으로.
  const goToPocketStock = () => {
    markEventSeen(); // 슈퍼쏠 확인 완료 표시 → 가드가 홈 진입 허용
    setPopupOpen(false);
    setIntro(true); // 영상 끝나면 onDone 에서 /home 으로 이동
  };

  const hidePopupToday = () => {
    localStorage.setItem(POPUP_HIDDEN_KEY, todayKey());
    setPopupOpen(false);
  };

  if (status !== "authed") return null;

  const name = profile?.name ?? "회원";
  const initial = name.charAt(0);

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#f2f4f6]">
      <div className="mx-auto min-h-full max-w-[430px] bg-[#f2f4f6] pb-24 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        {/* 헤더 */}
        <header className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <span
              className="flex size-7 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg,#FFB02E,#FF8A00)" }}
            >
              {initial}
            </span>
            <span className="text-lg font-bold text-[#1a1d23]">{name}님</span>
          </div>
          <div className="flex items-center gap-4 text-[#3d4651]">
            <Smile className="size-[22px]" />
            <Wallet className="size-[22px]" />
            <span className="relative">
              <Bell className="size-[22px]" />
              <span className="absolute right-0 top-0 size-1.5 rounded-full bg-[#f0455a]" />
            </span>
            <Search className="size-[22px]" />
          </div>
        </header>

        <main className="space-y-3 px-4">
          {/* 입출금 통장 개설 프로모 */}
          <section className="flex flex-col items-center gap-2.5 rounded-2xl bg-white px-4 pb-4 pt-5">
            <span className="relative flex size-16 items-center justify-center rounded-2xl bg-[#eef3ff]">
              <WalletCards className="size-8 text-[#2f6bff]" />
              <Banknote className="absolute -bottom-1 -right-1 size-5 rounded-md bg-white text-[#22a06b]" />
            </span>
            <p className="text-center text-[15px] font-bold leading-snug text-[#1a1d23]">
              수수료가 평생 없는
              <br />
              입출금 통장을 만들어보세요
            </p>
            <button
              type="button"
              className="mt-1 w-full rounded-xl py-3 text-sm font-bold text-white"
              style={{
                background: "linear-gradient(135deg,#5b8def 0%,#8b6ff0 100%)",
              }}
            >
              가입하기
            </button>
          </section>

          {/* 마이신한포인트 */}
          <section
            className="flex items-center justify-between rounded-2xl px-5 py-4"
            style={{
              background: "linear-gradient(120deg,#4a7dff 0%,#6f9bff 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-white/25 text-sm font-bold text-white">
                P
              </span>
              <div>
                <p className="text-xs text-white/85">마이신한포인트</p>
                <p className="text-xl font-bold text-white">0P</p>
              </div>
            </div>
            <span className="rounded-lg bg-white/90 px-4 py-2 text-sm font-bold text-[#2f6bff]">
              모으기
            </span>
          </section>

          {/* 추천서비스 */}
          <section className="rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1a1d23]">추천서비스</h2>
              <ChevronRight className="size-5 text-[#b0b8c1]" />
            </div>

            <ul className="mt-2 divide-y divide-[#f1f3f5]">
              {/* ── 우리 서비스(포켓스톡) — 맨 위 · 탭 시 포켓스톡으로 진입 ── */}
              <ServiceItem
                onClick={goToPocketStock}
                iconSrc="/images/PocketStock-logo.png"
                title="포켓스톡"
                badge="NEW"
                desc="잔돈으로 소수점 주식 자동 모으기"
                right={<ChevronRight className="size-5 text-[#cfd6dd]" />}
              />
              <ServiceItem
                iconNode={<HeartHandshake className="size-5 text-[#ff5a72]" />}
                iconStyle={{ background: "#ffeef0" }}
                title="SOL패밀리"
                badge="NEW"
                desc="가족과 함께하는 금융생활"
              />
              <ServiceItem
                iconNode={<Wallet className="size-5 text-[#22a06b]" />}
                iconStyle={{ background: "#e9f7ef" }}
                title="급여클럽+"
                desc="급여이체 우대 혜택"
                right={<Pin className="size-5 text-[#cfd6dd]" />}
              />
              <ServiceItem
                iconNode={<CreditCard className="size-5 text-[#2f6bff]" />}
                iconStyle={{ background: "#eaf1ff" }}
                title="내 카드 이용내역"
                desc="모든 카드 사용내역 조회"
                right={<Pin className="size-5 text-[#cfd6dd]" />}
              />
            </ul>
          </section>
        </main>
      </div>

      {/* 하단 네비 (부모 서비스 분위기 재현) */}
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-[#eef0f2] bg-white pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-2">
        <ul className="flex items-center justify-around">
          <NavItem icon={<Home className="size-5" />} label="홈" active />
          <NavItem
            icon={<CircleDollarSign className="size-5" />}
            label="금융"
          />
          <NavItem icon={<ShoppingBag className="size-5" />} label="상품" />
          <NavItem icon={<Gift className="size-5" />} label="혜택" />
          <NavItem icon={<LineChart className="size-5" />} label="주식" />
        </ul>
      </nav>

      <PocketStockEntrySheet
        open={popupOpen}
        onOpenChange={setPopupOpen}
        onStart={goToPocketStock}
        onHideToday={hidePopupToday}
      />

      {intro && (
        <PocketStockIntro onDone={() => router.replace("/home")} />
      )}
    </div>
  );
}

function ServiceItem({
  iconSrc,
  iconNode,
  iconStyle,
  title,
  badge,
  desc,
  right,
  onClick,
}: {
  /** 실제 일러스트 이미지 경로 (있으면 이미지 아이콘으로 렌더) */
  iconSrc?: string;
  /** 코드 아이콘 노드 (iconSrc 없을 때 iconStyle 배경 위에 렌더) */
  iconNode?: React.ReactNode;
  iconStyle?: React.CSSProperties;
  title: string;
  badge?: string;
  desc: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <li>
      <Tag
        {...(onClick ? { type: "button" as const, onClick } : {})}
        className="flex w-full items-center gap-3 py-3 text-left"
      >
        {iconSrc ? (
          <Image
            src={iconSrc}
            alt=""
            width={44}
            height={44}
            className="size-10 shrink-0 object-contain rounded-[12px]"
          />
        ) : (
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl"
            style={iconStyle}
          >
            {iconNode}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-[#1a1d23]">{title}</p>
            {badge && (
              <span className="text-[11px] font-bold text-[#f0455a]">
                {badge}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-[#8b95a1]">{desc}</p>
        </div>
        {right}
      </Tag>
    </li>
  );
}

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <li
      className="flex flex-col items-center gap-1"
      style={{ color: active ? "#2f6bff" : "#9aa3ad" }}
    >
      {icon}
      <span className="text-[11px] font-medium">{label}</span>
    </li>
  );
}
