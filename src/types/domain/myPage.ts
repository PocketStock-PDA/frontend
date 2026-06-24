// 마이페이지 / 설정 (Figma 화면 25)
// ⚠️ 사용자 프로필·설정 백엔드 API 미구현 — 현재 mock 으로 채운다(useMyProfile + mock/myPage).

/** 연동 자산 종류 — 아이콘 매핑용 */
export type LinkedAccountType = "BANK" | "CARD" | "TRAVEL" | "PAY";

/** 연동 계좌 칩 한 개 */
export interface LinkedAccount {
  id: string;
  /** 표시 이름 (예: 신한은행) */
  name: string;
  type: LinkedAccountType;
  /** 연동 완료 여부 */
  linked: boolean;
}

/** 잔돈/절약금 자동 모으기 토글 설정 */
export interface MyPageSettings {
  /** 카드 잔돈 모으기 */
  cardChangeCollect: boolean;
  /** 월 절약금 모으기 */
  monthlySavingCollect: boolean;
}

/** 마이페이지 프로필 + 요약 + 설정 */
export interface MyProfile {
  /** 회원 이름 (아바타 이니셜은 첫 글자에서 파생) */
  name: string;
  /** 마스킹된 이메일 */
  email: string;
  /** 포켓스톡 CMA 잔액 */
  cmaBalance: number;
  /** 퍼즐판 총 평가금액 */
  puzzleValuation: number;
  linkedAccounts: LinkedAccount[];
  settings: MyPageSettings;
}
