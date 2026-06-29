// 휴대폰 번호 입력 포맷·검증 — 회원가입·계좌개설 등에서 공용으로 사용.

/** 입력 중 자동 하이픈: 숫자만 추려 010-0000-0000 형태로 (최대 11자리). 포맷 전용. */
export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** 010으로 시작하는 휴대폰 11자리(숫자만) */
export const PHONE_REGEX = /^010\d{8}$/;

/** 하이픈 포함 입력값에서 숫자만 추출. */
export const phoneDigits = (value: string): string => value.replace(/\D/g, "");

/** 010 시작 11자리(숫자만) 유효 여부. 하이픈 포함 입력도 허용. */
export const isValidPhone = (value: string): boolean =>
  PHONE_REGEX.test(phoneDigits(value));
