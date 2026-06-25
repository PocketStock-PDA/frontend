import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { NotificationListResponse } from "@/types/domain/notification";

/** 알림 목록 조회 (GET /api/notifications) — 최신순. */
export function useNotifications(page = 0, size = 30) {
  return useQuery({
    queryKey: queryKeys.notification.list(page, size),
    queryFn: () =>
      api.get<NotificationListResponse>("/api/notifications", {
        params: { page: String(page), size: String(size) },
      }),
  });
}
