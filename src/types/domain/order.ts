// 소수점 주문 (1조각 = 0.01주)
// 매수/매도 모두 POST /api/trading/orders/fractional 로 통일, body의 side(BUY|SELL)로 구분.
// market은 백엔드가 stockCode→exchange에서 파생하므로 전송하지 않는다.

export type Market = "DOMESTIC" | "OVERSEAS";

interface FractionalOrderBase {
  /** 멱등키 — 주문 시도당 1개(재시도 시 동일 값 재사용). issue #4 */
  clientOrderId: string;
  stockCode: string;
  market: Market;
}

/**
 * AMOUNT=금액 기반(국내는 1,000원 단위 제약) / QUANTITY=수량 기반(소수 주수, 단위 제약 없음).
 * 수량으로 주문할 땐 AMOUNT(=수량×가격)로 보내면 1,000원 배수가 아니라 거부되므로 QUANTITY를 쓴다.
 */
export type BuyOrderRequest =
  | (FractionalOrderBase & { orderType: "AMOUNT"; amount: number })
  | (FractionalOrderBase & { orderType: "QUANTITY"; quantity: number });

/** ALL=전량 / AMOUNT=금액 / QUANTITY=수량(소수 주수) */
export type SellOrderRequest =
  | (FractionalOrderBase & { orderType: "AMOUNT"; amount: number })
  | (FractionalOrderBase & { orderType: "QUANTITY"; quantity: number })
  | (FractionalOrderBase & { orderType: "ALL" });

// 온주(정수 주) 주문 (POST /api/trading/orders/whole) — issue #4 멱등키 패턴.
interface WholeOrderBase {
  /** 멱등키 — 주문 시도당 1개(재시도 시 동일 값 재사용). issue #4 */
  clientOrderId: string;
  stockCode: string;
  market: Market;
  side: "BUY" | "SELL";
  /** 정수 주 수량 */
  quantity: number;
}

/** MARKET=시장가(간편) / LIMIT=지정가(호가창) */
export type WholeOrderRequest =
  | (WholeOrderBase & { orderType: "MARKET" })
  | (WholeOrderBase & { orderType: "LIMIT"; price: number });

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
