import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/utils/queryKeys";
import { MOCK_MY_PROFILE } from "@/lib/mock/myPage";
import type { MyProfile } from "@/types/domain/myPage";

/**
 * 마이페이지 프로필 + 요약 + 설정 조회.
 * ⚠️ 백엔드 미구현 — 현재 mock 데이터 반환. 구현 시 queryFn 을 아래 주석처럼 교체.
 *   queryFn: () => api.get<MyProfile>("/api/users/me"),
 */
export function useMyProfile() {
  return useQuery({
    queryKey: queryKeys.user.profile,
    queryFn: async (): Promise<MyProfile> => MOCK_MY_PROFILE,
  });
}
