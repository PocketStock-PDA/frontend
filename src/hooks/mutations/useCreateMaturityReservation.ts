import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { MaturityReservation, MaturityReservationRequest } from "@/types/domain/trading";

export function useCreateMaturityReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: MaturityReservationRequest) =>
      api.post<MaturityReservation>("/api/trading/maturity-reservations", req),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.trading.maturityReservations });
    },
  });
}
