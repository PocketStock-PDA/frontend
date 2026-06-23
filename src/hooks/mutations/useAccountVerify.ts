import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { AccountVerifyRequestResult } from "@/types/domain/account";

/** 1원 송금 인증 요청 — 선택 계좌로 1원 입금 + 입금자명 코드 발급 (POST /api/auth/account-verify/request) */
export function useRequestAccountVerify() {
  return useMutation({
    mutationFn: (accountId: number) =>
      api.post<AccountVerifyRequestResult>("/api/auth/account-verify/request", {
        accountId,
      }),
  });
}

/** 입금자명(3자리) 확인 (POST /api/auth/account-verify/confirm) */
export function useConfirmAccountVerify() {
  return useMutation({
    mutationFn: (req: { verificationId: string; code: string }) =>
      api.post<{ verified: boolean }>(
        "/api/auth/account-verify/confirm",
        req,
      ),
  });
}
