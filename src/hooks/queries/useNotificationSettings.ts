import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { NotificationSettings } from "@/types/domain/notification";

/**
 * 알림 수신 설정 조회 (GET /api/notifications/settings).
 * 종류별 토글 초기 상태용. 신규 유저는 BE 기본값으로 전부 true.
 */
export function useNotificationSettings() {
  return useQuery({
    queryKey: queryKeys.notification.settings,
    queryFn: () =>
      api.get<NotificationSettings>("/api/notifications/settings"),
  });
}
