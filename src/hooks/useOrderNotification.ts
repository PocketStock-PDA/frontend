import { useStompTopic } from "@/hooks/useStompTopic";
import { getUserIdFromToken } from "@/lib/auth/session";

/** `/topic/order-notification/{userId}` 체결통보 payload (#139). */
export interface OrderNotification {
  orderId: number;
  stockCode: string;
  side: "BUY" | "SELL";
  orderType: "FRACTIONAL" | "LIMIT";
  status: "FILLED" | "REJECTED" | "CANCELLED";
  filledQuantity: number | null;
  filledPrice: number | null;
  currency: string;
  filledAt: string;
}

/**
 * 실시간 체결통보 STOMP 구독. JWT sub → userId 토픽 자동 조립.
 * WS 미연결·userId 없으면 enabled=true여도 조용히 no-op(useStompTopic 보장).
 */
export function useOrderNotification(
  onMessage: (payload: OrderNotification) => void,
  enabled = true,
) {
  const userId = getUserIdFromToken();
  const topic = userId ? `/topic/order-notification/${userId}` : null;
  useStompTopic<OrderNotification>(topic, onMessage, enabled);
}
