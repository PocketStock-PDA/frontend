// 기관 로고 코드 매핑 — public/institution-logo/{CODE}.png 키로 사용.

/**
 * 카드 발급사명 → 로고 코드. 카드 DTO(LinkedCard)에는 companyCode가 없어
 * companyName(예: "신한카드", "KB국민카드")에 발급사가 항상 포함되는 점을 이용한다.
 * (예적금 상품명과 달리 카드사명은 신뢰 가능)
 */
const CARD_NAME_CODE: ReadonlyArray<readonly [string, string]> = [
  ["신한", "SHINHAN_CARD"],
  ["국민", "KB_CARD"],
  ["KB", "KB_CARD"],
  ["하나", "HANA_CARD"],
  ["농협", "NH_CARD"],
  ["NH", "NH_CARD"],
  ["삼성", "SAMSUNG_CARD"],
  ["현대", "HYUNDAI_CARD"],
  ["롯데", "LOTTE_CARD"],
  ["우리", "WOORI_CARD"],
  ["비씨", "BC_CARD"],
  ["BC", "BC_CARD"],
];

export function cardCodeFromName(companyName?: string | null): string | undefined {
  if (!companyName) return undefined;
  return CARD_NAME_CODE.find(([kw]) => companyName.includes(kw))?.[1];
}

const BANK_NAME_CODE: ReadonlyArray<readonly [string, string]> = [
  ["신한", "SHINHAN_BANK"],
  ["국민", "KB_BANK"],
  ["KB", "KB_BANK"],
  ["하나", "HANA_BANK"],
  ["농협", "NH_BANK"],
  ["NH", "NH_BANK"],
  ["우리", "WOORI_BANK"],
  ["기업", "IBK_BANK"],
  ["IBK", "IBK_BANK"],
  ["카카오", "KAKAO_BANK"],
  ["케이뱅크", "KBANK"],
  ["토스", "TOSS_BANK"],
  ["SC", "SC_BANK"],
  ["제일", "SC_BANK"],
  ["새마을", "MG_BANK"],
  ["MG", "MG_BANK"],
];

export function bankCodeFromName(bankName?: string | null): string | undefined {
  if (!bankName) return undefined;
  return BANK_NAME_CODE.find(([kw]) => bankName.includes(kw))?.[1];
}
