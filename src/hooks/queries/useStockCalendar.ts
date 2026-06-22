import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { StockCalendarResponse } from "@/types/domain/stockCalendar";

export function useStockCalendar(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.stockCalendar.events(year, month),
    queryFn: () =>
      api.get<StockCalendarResponse>("/api/calendar/events", {
        params: { year: String(year), month: String(month) },
      }),
  });
}
