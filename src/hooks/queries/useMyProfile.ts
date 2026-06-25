import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { MyProfile } from "@/types/domain/myPage";

/**
 * 마이페이지 프로필 + 요약 + 설정 조회.
 * GET /api/users/me/mypage (core-api MyPageController) — 응답이 MyProfile 과 1:1.
 */
export function useMyProfile() {
  return useQuery({
    queryKey: queryKeys.user.profile,
    queryFn: () => api.get<MyProfile>("/api/users/me/mypage"),
  });
}
