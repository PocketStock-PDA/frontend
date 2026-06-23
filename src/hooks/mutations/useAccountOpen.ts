import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type {
  CmaAccountResult,
  OpenAccountResult,
  TermItem,
} from "@/types/domain/account";

/** 약관 동의 저장 (POST /api/users/terms) */
export function useAgreeTerms() {
  return useMutation({
    mutationFn: (terms: TermItem[]) =>
      api.post<unknown>("/api/users/terms", { terms }),
  });
}

/** 계좌 비밀번호 설정 (POST /api/users/account-password) */
export function useSetAccountPassword() {
  return useMutation({
    mutationFn: (accountPassword: string) =>
      api.post<unknown>("/api/users/account-password", { accountPassword }),
  });
}

/** 증권 계좌 개설 (POST /api/trading/accounts) — DOMESTIC·OVERSEAS */
export function useOpenAccount() {
  return useMutation({
    mutationFn: (accountTypes: string[]) =>
      api.post<OpenAccountResult>("/api/trading/accounts", { accountTypes }),
  });
}

/** CMA 계좌 개설 (POST /api/cma/account) — 바디 없음 */
export function useOpenCmaAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<CmaAccountResult>("/api/cma/account", {}),
    // 개설 직후 홈/네비바가 새 계좌 상태를 즉시 반영하도록 CMA 캐시 무효화.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.cma.all }),
  });
}
