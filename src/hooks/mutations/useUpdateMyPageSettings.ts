import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { MyPageSettings, MyProfile } from "@/types/domain/myPage";

/** 변경분만 전송(null=변경 안 함). 둘 다 null이면 백엔드 400. */
type UpdateMyPageSettingsRequest = Partial<MyPageSettings>;

/**
 * 마이페이지 자동 모으기 토글 변경 (PATCH /api/users/me/mypage/settings).
 * 응답(MyPageSettings)으로 프로필 캐시의 settings 를 갱신한다.
 */
export function useUpdateMyPageSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMyPageSettingsRequest) =>
      api.patch<MyPageSettings>("/api/users/me/mypage/settings", body),
    onSuccess: (settings) => {
      queryClient.setQueryData<MyProfile>(queryKeys.user.profile, (prev) =>
        prev ? { ...prev, settings } : prev,
      );
    },
  });
}
