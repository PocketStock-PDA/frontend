import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { Attendance } from "@/types/domain/points";

/** 출석체크 현황 조회 (GET /api/points/attendance) */
export function useAttendance() {
  return useQuery({
    queryKey: queryKeys.points.attendance,
    queryFn: () => api.get<Attendance>("/api/points/attendance"),
    retry: 1,
  });
}
