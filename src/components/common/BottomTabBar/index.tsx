"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PieChart, Wallet, BookOpen, User } from "lucide-react";

const tabs = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/portfolio", label: "포트폴리오", icon: PieChart },
  { href: "/trading", label: "투자", icon: Wallet },
  { href: "/budget", label: "가계부", icon: BookOpen },
  { href: "/my", label: "마이", icon: User },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-zinc-200 flex items-center">
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 text-xs
              ${isActive ? "text-blue-600" : "text-zinc-400"}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
