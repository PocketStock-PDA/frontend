import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * 회원 비밀번호 변경 (PUT /api/users/me).
 * 서버가 현재 비번 일치·정책·현재≠신규를 검증하고, 성공 시 모든 refresh token을 폐기한다.
 * → 호출부는 성공 후 세션을 정리(로그아웃)하고 재로그인을 유도해야 한다.
 */
export function useUpdatePassword() {
  return useMutation({
    mutationFn: (body: UpdatePasswordRequest) =>
      api.put<unknown>("/api/users/me", body),
  });
}
