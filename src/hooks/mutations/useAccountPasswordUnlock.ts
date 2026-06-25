import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

/**
 * 계좌 비밀번호 잠금 해제 인증번호 발송 (POST /api/users/account-password/unlock/sms).
 * 등록된 휴대폰으로 푸시 알림으로 인증번호를 보낸다(잠금 상태 + 푸시 구독 필요).
 */
export function useSendUnlockCode() {
  return useMutation({
    mutationFn: () => api.post<void>("/api/users/account-password/unlock/sms", {}),
    retry: false,
  });
}

/**
 * 계좌 비밀번호 잠금 해제 (POST /api/users/account-password/unlock).
 * 푸시로 받은 인증번호(code)를 검증해 잠금을 해제한다. 휴대폰 번호는 서버가 결정(code만 전송).
 */
export function useUnlockAccountPassword() {
  return useMutation({
    mutationFn: (code: string) =>
      api.post<void>("/api/users/account-password/unlock", { code }),
    retry: false,
  });
}
