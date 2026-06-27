import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";

export function useCancelMaturityReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<void>(`/api/trading/maturity-reservations/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.trading.maturityReservations });
    },
  });
}
