// 회원가입 · 로그인 · 본인확인(SMS) · 간편 로그인(PIN/패턴)
//   member-controller / auth-controller / auth-method-controller / terms-controller

/** 회원가입 요청 (POST /api/users/signup) */
export interface SignupRequest {
  username: string;
  password: string;
  name: string;
  /** 주민등록번호 앞 6자리 */
  residentFront: string;
  /** 주민등록번호 뒷자리 첫 숫자(1자리) */
  residentBack: string;
  phone: string;
}

/** 회원가입 결과 */
export interface SignupResult {
  userId: number;
  username: string;
}

/** 아이디 중복 확인 (GET /api/users/check-username?username=) */
export interface UsernameCheckResult {
  available: boolean;
}

/** SMS 발송 결과 (POST /api/auth/sms/send) — code는 운영 미노출, dev 편의로 내려옴 */
export interface SmsSendResult {
  code?: string;
  /** 만료(초) */
  expiresIn: number;
}

/** SMS 검증 결과 (POST /api/auth/sms/verify) */
export interface SmsVerifyResult {
  verified: boolean;
}

/** 비밀번호 정책 검증 (POST /api/users/validate-password) */
export interface PasswordValidateResult {
  valid: boolean;
  /** 위반 규칙: MIN_LENGTH | UPPERCASE | LOWERCASE | DIGIT | SPECIAL */
  failedRules: string[];
}

/** 로그인 결과 (POST /api/auth/login | /api/auth/login/pin) */
export interface LoginResult {
  accessToken: string;
  expiresIn: number;
}

/** 간편 로그인 수단 — PIN(숫자 6자리) 또는 패턴 중 택1 */
export type AuthMethodType = "PIN" | "PATTERN";

/** 간편 로그인 등록 (POST /api/users/auth-method) */
export interface SetAuthMethodRequest {
  type: AuthMethodType;
  /** PIN 6자리 또는 패턴 노드 시퀀스("0-1-2-5") */
  value: string;
}
