import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { setAccessToken, clearSession, getDeviceId } from "@/lib/auth/session";
import { clearPushToken } from "@/lib/push/webPush";
import type { AuthMethodType, LoginResult } from "@/types/domain/auth";

/** 간편 로그인용 X-Device-Id 헤더 — 등록(auth-method)·로그인(login/pin)이 동일 기기로 묶이도록 공유 */
export function deviceHeader(): Record<string, string> {
  const id = getDeviceId();
  return id ? { "X-Device-Id": id } : {};
}

/** 아이디/비밀번호 로그인 (POST /api/auth/login) */
export function useLogin() {
  return useMutation({
    mutationFn: (v: { username: string; password: string }) =>
      api.post<LoginResult>("/api/auth/login", v, { headers: deviceHeader() }),
    onSuccess: (res) => setAccessToken(res.accessToken),
    retry: false,
  });
}

/** 간편 로그인 (POST /api/auth/login/pin) — type: PIN | PATTERN */
export function usePinLogin() {
  return useMutation({
    mutationFn: (v: { type: AuthMethodType; value: string }) =>
      api.post<LoginResult>("/api/auth/login/pin", v, {
        headers: deviceHeader(),
      }),
    onSuccess: (res) => setAccessToken(res.accessToken),
    retry: false,
  });
}

/** 로그아웃 (POST /api/auth/logout) — 성공/실패와 무관하게 세션·캐시 정리 */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await clearPushToken();
      return api.post<unknown>("/api/auth/logout", {});
    },
    onSettled: () => {
      clearSession();
      queryClient.clear();
    },
  });
}
