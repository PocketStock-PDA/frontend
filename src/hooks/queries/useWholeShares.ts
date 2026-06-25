import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type {
  WholeShareConversion,
  WholeShareConvertResult,
} from "@/types/domain/trading";

/** 온주 전환내역 조회 (GET /api/trading/whole-shares) — 종목 무관 전체 */
export function useWholeShareHistory() {
  return useQuery({
    queryKey: queryKeys.trading.wholeShares,
    queryFn: () =>
      api.get<WholeShareConversion[]>("/api/trading/whole-shares"),
  });
}

/**
 * 온주 전환 실행 (POST /api/trading/whole-shares).
 * 소수 보유의 정수부를 온주(직접소유)로 굳힘 — 소수 1주 이상일 때만 가능.
 * 성공 시 보유·전환내역 캐시 무효화.
 */
export function useConvertWholeShares() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stockCode: string) =>
      api.post<WholeShareConvertResult>("/api/trading/whole-shares", {
        stockCode,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trading.holdings });
      queryClient.invalidateQueries({ queryKey: queryKeys.trading.wholeShares });
    },
  });
}
