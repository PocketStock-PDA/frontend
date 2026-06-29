import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { FxHistory } from "@/types/domain/exchange";

export function useExchangeHistory(page = 0, size = 5) {
  return useQuery({
    queryKey: queryKeys.exchange.history(page, size),
    queryFn: () =>
      api.get<FxHistory>("/api/exchange/history", {
        params: { page: String(page), size: String(size) },
      }),
  });
}

export function useExchangeHistoryInfinite(size = 15) {
  return useInfiniteQuery({
    queryKey: queryKeys.exchange.historyInfinite(size),
    queryFn: ({ pageParam }) =>
      api.get<FxHistory>("/api/exchange/history", {
        params: { page: String(pageParam), size: String(size) },
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.totalElements / size);
      const next = lastPage.page + 1;
      return next < totalPages ? next : undefined;
    },
  });
}
