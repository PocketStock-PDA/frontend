// 인증 세션 — access token은 메모리에만 보관(새로고침 시 휘발), refresh는 httpOnly 쿠키.
//   memory access token + Bearer / httpOnly refresh cookie / Next same-origin 프록시 (auth-strategy)

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearSession(): void {
  accessToken = null;
}

export function isAuthenticated(): boolean {
  return accessToken !== null;
}

// ── 슈퍼쏠(이벤트) 확인 여부 ──────────────────────────────────────────────────
// 로그인 후 한 번 슈퍼쏠 화면을 거치면 굽는 일반 쿠키(미들웨어가 아닌 클라이언트 가드가 읽음).
const EVENT_COOKIE = "has_seen_event";

export function hasSeenEvent(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((c) => c === `${EVENT_COOKIE}=true`);
}

/** 슈퍼쏠 확인 완료 표시 — 24시간 유지. */
export function markEventSeen(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${EVENT_COOKIE}=true; path=/; max-age=86400`;
}

// ── 디바이스 식별자 (간편 로그인 login/pin 의 X-Device-Id) ─────────────────────
const DEVICE_KEY = "ps.deviceId";

/** 최초 1회 생성해 localStorage에 보관. 기기=계정 매핑(간편 로그인)에 사용. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}
