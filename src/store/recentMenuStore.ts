import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentMenu {
  href: string;
  label: string;
}

const MAX_RECENT = 6;

interface RecentMenuState {
  /** 최근 사용한 메뉴(최신순). */
  recent: RecentMenu[];
  /** 메뉴 사용 기록 — 같은 href 는 최신으로 끌어올리고 최대 MAX_RECENT 개 유지. */
  record: (menu: RecentMenu) => void;
  clear: () => void;
}

/**
 * 사이드바 "최근 메뉴" — 기기(localStorage)에 저장.
 * 미확정 라우트("#")는 기록하지 않는다.
 */
export const useRecentMenuStore = create<RecentMenuState>()(
  persist(
    (set) => ({
      recent: [],
      record: (menu) =>
        set((s) => {
          if (!menu.href || menu.href === "#") return s;
          const rest = s.recent.filter((m) => m.href !== menu.href);
          return { recent: [menu, ...rest].slice(0, MAX_RECENT) };
        }),
      clear: () => set({ recent: [] }),
    }),
    { name: "ps.recentMenus" },
  ),
);
