import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { MaturityReservation } from "@/types/domain/trading";

export function useMaturityReservations() {
  return useQuery({
    queryKey: queryKeys.trading.maturityReservations,
    queryFn: () => api.get<MaturityReservation[]>("/api/trading/maturity-reservations"),
  });
}
