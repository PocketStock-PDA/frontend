import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_LINK_ORDER,
  QUICK_LINK_BY_ID,
  resolveOrder,
  type QuickLink,
} from "@/lib/home/quickLinks";

interface HomeLayoutState {
  /** 사용자가 지정한 타일 순서(id). 표시/숨김 타일을 모두 포함한다. */
  order: string[];
  /** 숨긴 타일 id 목록. */
  hidden: string[];
  /** 표시/숨김 토글. */
  toggleHidden: (id: string) => void;
  /** 드래그 정렬 결과 반영(정규화된 id 배열). */
  setOrder: (order: string[]) => void;
  /** 기본값 복원. */
  reset: () => void;
}

/**
 * 홈 "바로가기" 타일의 순서·표시 여부.
 * 계정이 아니라 기기(localStorage)에 저장 — 백엔드 불필요(요구 시 마이페이지 설정 API로 승격).
 */
export const useHomeLayoutStore = create<HomeLayoutState>()(
  persist(
    (set) => ({
      order: DEFAULT_LINK_ORDER,
      hidden: [],
      toggleHidden: (id) =>
        set((s) => ({
          hidden: s.hidden.includes(id)
            ? s.hidden.filter((x) => x !== id)
            : [...s.hidden, id],
        })),
      setOrder: (order) => set({ order: resolveOrder(order) }),
      reset: () => set({ order: DEFAULT_LINK_ORDER, hidden: [] }),
    }),
    // skipHydration: SSR/첫 클라 렌더는 기본값으로 고정하고, 마운트 후 useHydrateHomeLayout으로
    // localStorage 값을 재수화한다(하이드레이션 미스매치 방지).
    { name: "ps.home.layout", skipHydration: true },
  ),
);

/** 마운트 후 1회 localStorage 값으로 재수화. 홈/홈편집 등 store 소비 화면에서 호출. */
export function useHydrateHomeLayout() {
  useEffect(() => {
    void useHomeLayoutStore.persist.rehydrate();
  }, []);
}

// 이 함수는 매번 새 배열을 만들므로 zustand selector 로 직접 쓰지 말고,
// 컴포넌트에서 order/hidden 을 구독한 뒤 useMemo 로 감싸 호출한다(재렌더 루프 방지).
// resolveOrder 가 반환하는 id 는 항상 QUICK_LINK_BY_ID 의 키이지만, 인덱스 접근 안전을
// 위해 undefined 는 flatMap 으로 걸러낸다.

/** 홈에 실제로 노출할 타일(순서 적용 + 숨김 제외). */
export function visibleLinks(order: string[], hidden: string[]): QuickLink[] {
  return resolveOrder(order).flatMap((id) => {
    const link = QUICK_LINK_BY_ID[id];
    return link && !hidden.includes(id) ? [link] : [];
  });
}
