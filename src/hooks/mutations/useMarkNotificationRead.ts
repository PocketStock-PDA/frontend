import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";

interface MarkReadResponse {
  id: number;
  isRead: boolean;
}

interface MarkAllReadResponse {
  updatedCount: number;
}

/** 개별 알림 읽음 처리 (PATCH /api/notifications/{id}/read). */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.patch<MarkReadResponse>(`/api/notifications/${id}/read`, {}),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.notification.all }),
  });
}

/** 전체 알림 읽음 처리 (PATCH /api/notifications/read-all). */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.patch<MarkAllReadResponse>("/api/notifications/read-all", {}),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.notification.all }),
  });
}
