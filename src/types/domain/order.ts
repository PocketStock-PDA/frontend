// 소수점 주문 (1조각 = 0.01주)
// ⚠️ POST /api/trading/orders/buy · /sell 는 문서 스펙 기준 — 백엔드 미구현 상태 (구현 시 동작)

export type Market = "DOMESTIC" | "OVERSEAS";

export interface BuyOrderRequest {
  /** 멱등키 — 주문 시도당 1개(재시도 시 동일 값 재사용). issue #4 */
  clientOrderId: string;
  stockCode: string;
  market: Market;
  orderType: "AMOUNT"; // 금액 기반
  amount: number;
}

interface SellOrderBase {
  /** 멱등키 — 주문 시도당 1개(재시도 시 동일 값 재사용). issue #4 */
  clientOrderId: string;
  stockCode: string;
  market: Market;
}

/** ALL=전량 / AMOUNT=부분(N조각) — 부분 매도 타입은 백엔드 확인 필요 */
export type SellOrderRequest =
  | (SellOrderBase & { orderType: "AMOUNT"; amount: number })
  | (SellOrderBase & { orderType: "ALL" });

export interface OrderResult {
  orderId: string;
  stockCode: string;
  orderType: string; // BUY | SELL
  status: string; // RECEIVED 등
}

// GET /api/trading/orders (구현됨)
export interface OrderHistoryItem {
  orderId: number;
  stockCode: string;
  side: string; // BUY | SELL
  orderType: string;
  quantity: number;
  price: number;
  status: string;
  createdAt: string;
}
