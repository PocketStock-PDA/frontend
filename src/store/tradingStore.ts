import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PendingOrder {
  orderId: number;
  mode: "buy" | "sell";
  count: number;
  /** 5분 안전망 — 이 시각 이후엔 컴포넌트 마운트 시 자동 폐기 */
  expiresAt: number;
}

interface TradingState {
  /** stockCode → 접수 대기 조각 주문 목록 */
  pendingByStock: Record<string, PendingOrder[]>;
  addPending: (stockCode: string, order: Omit<PendingOrder, "expiresAt">) => void;
  removePending: (stockCode: string, orderIds: Set<number>) => void;
  clearPending: (stockCode: string) => void;
}

const TTL = 300_000; // 5분

/** 셀렉터 fallback용 안정 빈 배열 — ?? [] 대신 이걸 써야 getSnapshot 경고가 안 남 */
export const EMPTY_PENDING: PendingOrder[] = [];

export const useTradingStore = create<TradingState>()(
  persist(
    (set) => ({
      pendingByStock: {},

      addPending: (stockCode, order) =>
        set((s) => ({
          pendingByStock: {
            ...s.pendingByStock,
            [stockCode]: [
              ...(s.pendingByStock[stockCode] ?? []),
              { ...order, expiresAt: Date.now() + TTL },
            ],
          },
        })),

      removePending: (stockCode, orderIds) =>
        set((s) => ({
          pendingByStock: {
            ...s.pendingByStock,
            [stockCode]: (s.pendingByStock[stockCode] ?? []).filter(
              (p) => !orderIds.has(p.orderId),
            ),
          },
        })),

      clearPending: (stockCode) =>
        set((s) => ({
          pendingByStock: { ...s.pendingByStock, [stockCode]: [] },
        })),
    }),
    {
      name: "trading-pending",
      partialize: (s) => ({ pendingByStock: s.pendingByStock }),
    },
  ),
);
