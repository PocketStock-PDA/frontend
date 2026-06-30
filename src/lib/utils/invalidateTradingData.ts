import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";

/**
 * 주문 발생(onSuccess) 또는 체결 통보(WS) 시 호출하는 단일 캐시 무효화 함수.
 * 추가할 키가 생기면 여기만 수정한다.
 */
export function invalidateTradingData(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.trading.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.cma.home });
  void queryClient.refetchQueries({ queryKey: queryKeys.trading.pendingOrders, type: "all" });
}
