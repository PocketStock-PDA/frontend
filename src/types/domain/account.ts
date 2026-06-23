// 계좌 개설 + 1원 송금 인증
//   securities-account-controller / signup-account-verify-controller /
//   terms-controller / account-password-controller / bank-account-controller

/** 보유 은행 계좌 (GET /api/assets/bank-accounts) */
export interface BankAccount {
  accountId: number;
  bankCode: string;
  bankName: string;
  accountName: string;
  accountType: string;
  balance: number;
  currency: string;
  isDormant: boolean;
  isVerified: boolean;
}

/** 1원 송금 인증 요청 결과 (POST /api/auth/account-verify/request) */
export interface AccountVerifyRequestResult {
  verificationId: string;
  /** 입금자명 (예: 포켓스톡087) */
  depositorName: string;
  /** 인증 코드 3자리 — 운영에선 미노출, dev 편의로 내려옴 */
  code?: string;
  /** 만료(초) */
  expiresIn: number;
}

/** 약관 동의 항목 (POST /api/users/terms) */
export interface TermItem {
  termId: number;
  agreed: boolean;
}

/** 증권 계좌 개설 결과 (POST /api/trading/accounts) */
export interface OpenAccountResult {
  accountNo: string;
  accountTypes: string[];
}

/** CMA 계좌 개설 결과 (POST /api/cma/account) */
export interface CmaAccountResult {
  cmaAccountNo: string | null;
  openedAt: string;
  balances: { currency: string; balance: number; interestRate: number }[];
}
