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
 * AMOUNT=금액 기반(원하는 금액만큼) / QUANTITY=수량 기반(소수 주수).
 * 최소 주문금액(국내 1,000원·해외 $1) 이상이면 되고, 금액 단위·배수 제약은 없다.
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

/**
 * 소수점 주문 응답 (POST /api/trading/orders/fractional).
 * 백엔드가 한 주문을 정수부=온주(즉시 호가체결) / 소수부=소수(차수 배치)로 split한 결과.
 * whole*=온주분(없으면 null) · fractional*=소수분(없으면 null). 예: 0.1주→소수만 / 1.0→온주만 / 13.14→온주13+소수0.14.
 */
export interface SplitOrderResponse {
  stockCode: string;
  side: "BUY" | "SELL";
  /** 온주분(즉시 체결) — 없으면 null */
  wholeOrderId: number | null;
  wholeQty: number | null;
  wholeFillPrice: number | null;
  wholeAmount: number | null;
  /** 소수분(차수 대기) — 없으면 null */
  fractionalOrderId: number | null;
  roundId: number | null;
  fractionalEstQty: number | null;
  fractionalHeld: number | null;
  fractionalStatus: string | null; // QUEUED 등
  /** 처리 후 예수금 잔액 */
  orderable: number;
}

/**
 * 온주 주문 응답 (POST /api/trading/orders/whole).
 * MARKET=자체 시뮬 즉시 전량 체결(status=FILLED) / LIMIT=호가 미충족 시 PENDING(매칭 데몬이 후속 체결).
 */
export interface WholeOrderResponse {
  orderId: number;
  stockCode: string;
  side: "BUY" | "SELL";
  quantity: number;
  /** 체결가 (PENDING이면 null일 수 있음) */
  fillPrice: number | null;
  /** fillPrice × quantity (세금 미반영) */
  totalAmount: number | null;
  status: string; // FILLED | PENDING 등
  /** 체결 후 예수금 잔액(KRW) */
  balanceAfter: number | null;
}

// GET /api/trading/orders (구현됨)
export interface OrderHistoryItem {
  orderId: number;
  stockCode: string;
  side: string; // BUY | SELL
  orderType: string; // QUANTITY | AMOUNT | ALL …
  /** AMOUNT(금액) 주문은 null */
  quantity: number | null;
  /** 금액(AMOUNT) 주문의 주문 금액. 수량 주문은 null */
  orderAmount: number | null;
  /** 체결가 미기록 시 null */
  price: number | null;
  status: string; // FILLED | PENDING | QUEUED | REJECTED
  /** KRW | USD */
  currency: string;
  createdAt: string;
  /** 체결금액 — 소수점 체결분은 백엔드 배분합(allocations), 온주·미체결은 null. 내역 금액은 이 값(라이브가 추정 금지) */
  filledAmount: number | null;
  /** 매도 체결 시점 평단(실현손익 산출 입력값). 매도 FILLED만 non-null. 국내=KRW, 해외=USD. */
  avgBuyPriceAtSell: number | null;
  /** 해외 매도 체결 시점 USD/KRW 환율. 국내·매수·환율 취득 실패 시 null. */
  fxRateAtFill: number | null;
  /** 실현손익(판매수익) native — 백엔드 산출(매도 FILLED만, HALF_UP). 프론트 재계산 금지. */
  realizedPnl: number | null;
  /** 실현손익 환산 KRW — 해외=native×체결환율(환율없으면 null), 국내=native. */
  realizedPnlKrw: number | null;
  /** REJECTED 사유 — 거절된 주문만 non-null. */
  failReason: string | null;
}
