"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookNavIcon,
  PortfolioNavIcon,
  HomeNavIcon,
  AssetNavIcon,
  ProfileNavIcon,
} from "@/components/icons/NavIcons";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCmaHome, isNoCmaAccount } from "@/hooks/queries/useCmaHome";

const MotionLink = motion(Link);

// 홈 화면 기준 5탭 (가계부 · 포트폴리오 · 홈 · 자산 · 마이페이지)
const tabs = [
  { href: "/budget", label: "가계부", icon: BookNavIcon },
  { href: "/portfolio", label: "포트폴리오", icon: PortfolioNavIcon },
  { href: "/home", label: "홈", icon: HomeNavIcon },
  { href: "/asset", label: "자산", icon: AssetNavIcon },
  { href: "/my", label: "마이페이지", icon: ProfileNavIcon },
] as const;

const SPRING_PILL = { type: "spring", stiffness: 400, damping: 35 } as const;
const SPRING_ICON = { type: "spring", stiffness: 500, damping: 28 } as const;
const EASE_MOUNT = [0.22, 1, 0.36, 1] as const;

export function BottomTabBar() {
  const pathname = usePathname();
  const { data, isLoading, error } = useCmaHome();

  // 온보딩 풀스크린 플로우(슈퍼쏠·계좌개설·자산연동)는 (onboarding) 레이아웃이라
  // 애초에 이 컴포넌트가 렌더되지 않음 → 여기선 별도 경로 분기 불필요.
  // 계좌 미개설(404)일 때만 숨김 — 홈의 신규회원(계좌개설 유도) 상태 비노출 목적.
  // 단, 이미 data가 있으면 복귀 시 일시적 404로 네비바가 사라지지 않게 한다. (#152)
  // 일시적 오류(5xx/네트워크)는 네비바를 유지해 다른 탭 이동을 막지 않는다.
  // 최초 로딩 중에는 확정 전 깜빡임 방지를 위해 숨긴다.
  if ((isNoCmaAccount(error) && !data) || isLoading) return null;

  return (
    // 떠 있는(floating) 알약형 네비. 바깥 래퍼는 클릭을 통과시키고(pointer-events-none)
    // 알약만 클릭을 받는다(pointer-events-auto) → 알약 위/옆 영역의 콘텐츠 탭을 막지 않음.
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] px-5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE_MOUNT }}
        className="pointer-events-auto flex items-center justify-around rounded-full border border-white/20 bg-white/30 px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-2xl"
      >
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <MotionLink
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              whileTap={{ scale: 0.86 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-1.5 text-[11px]",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-y-0 rounded-full border border-white/40 bg-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-md"
                  style={{ left: "-6px", right: "-6px" }}
                  transition={SPRING_PILL}
                />
              )}
              <motion.div
                className="relative z-10"
                animate={{ scale: isActive ? 1.12 : 1 }}
                transition={SPRING_ICON}
              >
                <Icon
                  className={cn("size-5 shrink-0", isActive && "fill-primary/15")}
                  strokeWidth={isActive ? 2.4 : 2}
                />
              </motion.div>
              <span className={cn("relative z-10", isActive && "font-semibold")}>{label}</span>
            </MotionLink>
          );
        })}
      </motion.div>
    </nav>
  );
}
