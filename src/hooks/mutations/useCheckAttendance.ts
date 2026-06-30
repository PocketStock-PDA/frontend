import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { AttendanceResult } from "@/types/domain/points";

/**
 * 출석체크 (POST /api/points/attendance) — 마이신한포인트 적립.
 * 성공 시 출석 현황과 CMA 홈(포인트 잔액) 캐시 갱신.
 */
export function useCheckAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<AttendanceResult>("/api/points/attendance", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.points.attendance });
      queryClient.invalidateQueries({ queryKey: queryKeys.cma.all });
    },
    retry: false,
  });
}
