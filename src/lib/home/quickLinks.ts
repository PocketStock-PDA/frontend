import {
  ArrowLeftRight,
  BookText,
  Coins,
  PieChart,
  Receipt,
  Settings,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/** 홈 "바로가기" 타일 1개. id 는 홈화면 편집(순서/표시) 저장 키로 쓰이므로 변경 금지. */
export interface QuickLink {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  highlight?: boolean;
}

// TODO: 라우트 일부 미확정 — 사용자 지정 대기 중 (#)
export const QUICK_LINKS: QuickLink[] = [
  { id: "trading", label: "주식 모으기", icon: TrendingUp, href: "/trading", highlight: true },
  { id: "trading-auto", label: "모으기 설정", icon: Settings, href: "/trading/auto" },
  { id: "portfolio", label: "포트폴리오", icon: PieChart, href: "/portfolio" },
  { id: "history", label: "거래 내역", icon: Receipt, href: "#" },
  { id: "asset", label: "자산", icon: Wallet, href: "/asset" },
  { id: "budget", label: "가계부", icon: BookText, href: "/budget" },
  { id: "exchange", label: "환전", icon: ArrowLeftRight, href: "/exchange" },
  { id: "points", label: "포인트", icon: Coins, href: "/points" },
];

export const QUICK_LINK_BY_ID: Record<string, QuickLink> = Object.fromEntries(
  QUICK_LINKS.map((link) => [link.id, link]),
);

export const DEFAULT_LINK_ORDER: string[] = QUICK_LINKS.map((link) => link.id);

/**
 * 저장된 순서를 실제 타일 목록에 맞춰 정규화.
 * - 더 이상 없는 id 는 제거, 새로 추가된 타일은 뒤에 붙인다(앱 업데이트 안전).
 */
export function resolveOrder(order: string[]): string[] {
  const known = order.filter((id) => id in QUICK_LINK_BY_ID);
  const missing = DEFAULT_LINK_ORDER.filter((id) => !known.includes(id));
  return [...known, ...missing];
}
