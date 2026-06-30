import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_LINK_ORDER,
  QUICK_LINK_BY_ID,
  resolveOrder,
  type QuickLink,
} from "@/lib/home/quickLinks";
import { getUserIdFromToken } from "@/lib/auth/session";

interface HomeLayoutState {
  /** 사용자가 지정한 타일 순서(id). 표시/숨김 타일을 모두 포함한다. */
  order: string[];
  /** 숨긴 타일 id 목록. */
  hidden: string[];
  /** 이 저장본의 소유자(userId). 다른 사용자로 로그인하면 기본값으로 교체한다. */
  ownerId: number | null;
  /** 표시/숨김 토글. */
  toggleHidden: (id: string) => void;
  /** 드래그 정렬 결과 반영(정규화된 id 배열). */
  setOrder: (order: string[]) => void;
  /** 기본값 복원(현재 소유자 유지). */
  reset: () => void;
  /** 저장본을 지정 사용자 기준 기본값으로 교체(계정 전환 시). */
  adoptOwner: (ownerId: number | null) => void;
}

/**
 * 홈 "바로가기" 타일의 순서·표시 여부.
 * 기기(localStorage)에 저장하되 ownerId로 사용자에 귀속한다 — 백엔드 불필요(요구 시
 * 마이페이지 설정 API로 승격). 같은 기기에서 같은 유저는 재로그인 후에도 설정이 복원되고,
 * 다른 계정으로 로그인하면(소유자 불일치) 이전 사용자 설정 대신 기본값으로 시작한다.
 */
export const useHomeLayoutStore = create<HomeLayoutState>()(
  persist(
    (set) => ({
      order: DEFAULT_LINK_ORDER,
      hidden: [],
      ownerId: null,
      toggleHidden: (id) =>
        set((s) => ({
          hidden: s.hidden.includes(id)
            ? s.hidden.filter((x) => x !== id)
            : [...s.hidden, id],
        })),
      setOrder: (order) => set({ order: resolveOrder(order) }),
      reset: () => set({ order: DEFAULT_LINK_ORDER, hidden: [] }),
      adoptOwner: (ownerId) =>
        set({ order: DEFAULT_LINK_ORDER, hidden: [], ownerId }),
    }),
    // skipHydration: SSR/첫 클라 렌더는 기본값으로 고정하고, 마운트 후 useHydrateHomeLayout으로
    // localStorage 값을 재수화한다(하이드레이션 미스매치 방지).
    { name: "ps.home.layout", skipHydration: true },
  ),
);

/**
 * 마운트 후 1회 localStorage 값으로 재수화 + 소유자 확인. 홈/홈편집 등 store 소비 화면에서 호출.
 * 재수화한 저장본의 소유자가 현재 로그인 사용자와 다르면(계정 전환) 기본값으로 교체한다.
 * 호출 시점엔 RequireAuth 통과로 access token이 준비돼 있어 userId 판별이 안전하다.
 */
export function useHydrateHomeLayout() {
  useEffect(() => {
    void Promise.resolve(useHomeLayoutStore.persist.rehydrate()).then(() => {
      const uid = getUserIdFromToken();
      // uid를 못 읽으면(파싱 실패 등) 섣불리 지우지 않고 기존 저장본을 유지한다.
      if (uid === null) return;
      if (useHomeLayoutStore.getState().ownerId !== uid) {
        useHomeLayoutStore.getState().adoptOwner(uid);
      }
    });
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
