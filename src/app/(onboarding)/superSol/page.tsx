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
} from "lucide-react";
import { markEventSeen } from "@/lib/auth/session";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMyProfile } from "@/hooks/queries/useMyProfile";
import { PocketStockEntrySheet } from "./_components/PocketStockEntrySheet";
import { PocketStockIntro } from "./_components/PocketStockIntro";

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

  // superSol 은 진입점 — authed 진입 시 무조건 포켓스톡 안내 팝업부터 노출(닫기·오늘 보지 않기 없음).
  useEffect(() => {
    if (status !== "authed") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 진입 시 1회 모달 자동 노출
    setPopupOpen(true);
  }, [status]);

  // 팝업/추천서비스 어느 경로로든 포켓스톡 진입 — 전환 영상 재생 후 메인 홈으로.
  const goToPocketStock = () => {
    markEventSeen(); // 슈퍼쏠 확인 완료 표시 → 가드가 홈 진입 허용
    setPopupOpen(false);
    setIntro(true); // 영상 끝나면 onDone 에서 /home 으로 이동
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
            <span className="relative inline-flex items-center">
              <Bell className="size-[22px]" />
              <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[#f0455a]" />
            </span>
            <Search className="size-[22px]" />
          </div>
        </header>

        <main className="space-y-3 px-4">
          {/* 신한금융그룹 */}
          <section className="rounded-2xl bg-white p-4">
            <h2 className="text-base font-bold text-[#1a1d23]">신한금융그룹</h2>
            <ul className="mt-2 divide-y divide-[#f1f3f5]">
              <ServiceItem
                iconNode={
                  <svg width="27" height="27" viewBox="0 0 24 24" fill="none">
                    <rect x="6.8" y="3" width="10.4" height="18" rx="2.6" fill="#2f6bff" />
                    <rect x="9.2" y="5.8" width="3.4" height="3.4" rx="1" fill="#c2d6ff" />
                  </svg>
                }
                title="신한카드"
                desc="나에게 맞는 카드 찾기"
                right={<ChevronRight className="size-5 text-[#cfd6dd]" />}
              />
              <ServiceItem
                iconNode={
                  <svg width="27" height="27" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="9" width="3" height="7" rx="1" fill="#f04452" />
                    <path d="M5.5 6v3M5.5 16v2" stroke="#f04452" strokeWidth="1.8" strokeLinecap="round" />
                    <rect x="10.5" y="7" width="3" height="8" rx="1" fill="#3182f6" />
                    <path d="M12 4v3M12 15v2" stroke="#3182f6" strokeWidth="1.8" strokeLinecap="round" />
                    <rect x="17" y="5" width="3" height="6" rx="1" fill="#f04452" />
                    <path d="M18.5 3v2M18.5 11v2" stroke="#f04452" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                }
                title="신한투자증권"
                desc="지금 뜨는 주식 보러가기"
                right={<ChevronRight className="size-5 text-[#cfd6dd]" />}
              />
              <ServiceItem
                iconNode={
                  <svg width="27" height="27" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 3 4.8 5.7V11c0 4.6 3.1 7.9 7.2 9.2 4.1-1.3 7.2-4.6 7.2-9.2V5.7L12 3Z"
                      fill="#2f6bff"
                    />
                    <path d="M12 8.1v5.4M9.3 10.8h5.4" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
                  </svg>
                }
                title="신한라이프"
                desc="내게 필요한 보험, 보장분석으로 확인하기"
                right={<ChevronRight className="size-5 text-[#cfd6dd]" />}
              />
            </ul>
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
                iconSrc="/images/PocketStock-logo-clean.png"
                title="포켓스톡"
                badge="NEW"
                desc="잔돈으로 소수점 주식 자동 모으기"
                right={<ChevronRight className="size-5 text-[#cfd6dd]" />}
              />
              <ServiceItem
                iconNode={
                  <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
                    <path d="M18 5.5 5.5 15.5h25L18 5.5Z" fill="#ff9d5c" />
                    <rect x="8.5" y="14.5" width="19" height="15" rx="2.5" fill="#ffc59a" />
                    <path
                      d="M18 27.2c-3.4-2.1-5.4-3.9-5.4-6.3 0-1.6 1.3-2.8 2.9-2.8 1 0 1.9.5 2.5 1.3.6-.8 1.5-1.3 2.5-1.3 1.6 0 2.9 1.2 2.9 2.8 0 2.4-2 4.2-5.4 6.3Z"
                      fill="#ff4d63"
                    />
                  </svg>
                }
                title="SOL패밀리"
                badge="NEW"
                desc="가족과 함께하는 금융생활"
              />
              <ServiceItem
                iconNode={
                  <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
                    <rect x="6.5" y="9" width="23" height="18" rx="4.5" fill="#1f8a5b" />
                    <path
                      d="M12 14.5 15 22 18 16.8 21 22 24 14.5"
                      stroke="#fff"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
                title="급여클럽+"
                desc="급여이체 우대 혜택"
                right={<Pin className="size-5 text-[#cfd6dd]" />}
              />
              <ServiceItem
                iconNode={
                  <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
                    <rect
                      x="6"
                      y="12"
                      width="21"
                      height="13.5"
                      rx="2.6"
                      transform="rotate(-9 16.5 18.75)"
                      fill="#a9c6ff"
                    />
                    <rect x="9.5" y="11" width="21" height="13.5" rx="2.6" fill="#3f7bff" />
                    <rect x="9.5" y="14" width="21" height="2.6" fill="#2a62e0" />
                    <rect x="12.5" y="20" width="6" height="2" rx="1" fill="#fff" fillOpacity="0.85" />
                  </svg>
                }
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
          <span className="flex size-10 shrink-0 items-center justify-center">
            <Image
              src={iconSrc}
              alt=""
              width={36}
              height={36}
              className="size-[34px] object-contain rounded-[10px]"
            />
          </span>
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
