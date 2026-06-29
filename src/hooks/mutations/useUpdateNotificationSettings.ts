import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { NotificationSettings } from "@/types/domain/notification";

/**
 * 알림 수신 설정 변경 (PUT /api/notifications/settings).
 * full-replace 라 4개 필드 전부 전송한다. 응답으로 설정 캐시를 갱신.
 */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: NotificationSettings) =>
      api.put<NotificationSettings>("/api/notifications/settings", body),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.notification.settings, settings);
    },
  });
}
