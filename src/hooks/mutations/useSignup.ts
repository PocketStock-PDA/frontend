import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { deviceHeader } from "@/hooks/mutations/useAuth";
import type { TermItem } from "@/types/domain/account";
import type {
  AuthMethodType,
  LoginResult,
  PasswordValidateResult,
  SignupResult,
  SmsSendResult,
  SmsVerifyResult,
  UsernameCheckResult,
} from "@/types/domain/auth";

/** 아이디 중복 확인 (GET /api/users/check-username) — 버튼 클릭 시 실행 */
export function useCheckUsername() {
  return useMutation({
    mutationFn: (username: string) =>
      api.get<UsernameCheckResult>("/api/users/check-username", {
        params: { username },
      }),
    retry: false,
  });
}

/** 비밀번호 정책 서버 검증 (POST /api/users/validate-password) */
export function useValidatePassword() {
  return useMutation({
    mutationFn: (password: string) =>
      api.post<PasswordValidateResult>("/api/users/validate-password", {
        password,
      }),
    retry: false,
  });
}

/** 휴대폰 인증번호 발송 (POST /api/auth/sms/send) */
export function useSendSms() {
  return useMutation({
    mutationFn: (phone: string) =>
      api.post<SmsSendResult>("/api/auth/sms/send", { phone }),
    retry: false,
  });
}

/** 휴대폰 인증번호 검증 (POST /api/auth/sms/verify) */
export function useVerifySms() {
  return useMutation({
    mutationFn: (vars: { phone: string; code: string }) =>
      api.post<SmsVerifyResult>("/api/auth/sms/verify", vars),
    retry: false,
  });
}

export interface CompleteSignupInput {
  account: { username: string; password: string };
  person: {
    name: string;
    residentFront: string;
    residentBack: string;
    phone: string;
  };
  /** 백엔드에 저장할 약관(알려진 termId만) */
  terms: TermItem[];
  /** 간편 로그인 수단(PIN/패턴) */
  authMethod: { type: AuthMethodType; value: string };
}

/**
 * 회원가입 최종 처리.
 * signup(공개) → login(공개, 토큰 획득) → terms·auth-method(토큰 첨부) 순서로 호출한다.
 * terms·auth-method는 @CurrentUserId 인증이 필요하므로, 갓 발급받은 accessToken을
 * 해당 호출에만 Authorization 헤더로 덧붙인다(전역 세션 저장은 로그인 작업에서 담당).
 * retry:false — 중복 가입 방지.
 */
export function useCompleteSignup() {
  return useMutation({
    mutationFn: async (input: CompleteSignupInput): Promise<LoginResult> => {
      const { account, person, terms, authMethod } = input;

      await api.post<SignupResult>("/api/users/signup", {
        username: account.username,
        password: account.password,
        name: person.name,
        residentFront: person.residentFront,
        residentBack: person.residentBack,
        phone: person.phone,
      });

      // 간편 로그인은 기기 바인딩(X-Device-Id)이라, 등록도 로그인과 동일한 기기로 묶어야
      // 이후 login/pin 이 같은 기기 자격증명을 찾는다. (등록 누락 시 401 PIN 불일치)
      const device = deviceHeader();

      const login = await api.post<LoginResult>(
        "/api/auth/login",
        { username: account.username, password: account.password },
        { headers: device },
      );

      const auth = {
        headers: { Authorization: `Bearer ${login.accessToken}` },
      };

      if (terms.length > 0) {
        await api.post("/api/users/terms", { terms }, auth);
      }
      await api.post(
        "/api/users/auth-method",
        { type: authMethod.type, value: authMethod.value },
        { headers: { ...auth.headers, ...device } },
      );

      return login;
    },
    retry: false,
  });
}
