import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

interface TxnAuthRequest {
  accountPassword: string;
  keepAuth: boolean;
}

interface TxnAuthResponse {
  verifiedAt: string;
  expiresAt: string;
}

/** 거래 인증 — 계좌 비밀번호(4자리) 검증. keepAuth=true면 30분 세션 유지. */
export function useTxnAuth() {
  return useMutation({
    mutationFn: (req: TxnAuthRequest) =>
      api.post<TxnAuthResponse>("/api/users/account-password/verify", req),
  });
}
