// 보안 컨텍스트(HTTPS/localhost)가 아니면 crypto.randomUUID 가 없다.
// 모바일에서 http://<IP>:포트 로 접속하면 undefined → 호출 시 TypeError.
// getRandomValues 는 비보안 컨텍스트에서도 동작하므로 이를 이용해 RFC4122 v4 를 만든다.
// 각 단계는 try/catch 로 감싼다 — 함수가 "존재"해도 환경에 따라 호출이 throw 할 수 있고,
// 여기서 끊기면 멱등키 생성이 막혀 환전·주문 흐름 전체가 중단되므로 반드시 폴백으로 이어준다.
export function safeRandomUUID(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // 다음 폴백으로
  }
  try {
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      const hex = Array.from(bytes, (x, i) => {
        const v = i === 6 ? (x & 0x0f) | 0x40 : i === 8 ? (x & 0x3f) | 0x80 : x; // v4 / variant
        return v.toString(16).padStart(2, "0");
      }).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  } catch {
    // 최후 폴백으로
  }
  // 최후 폴백 — 멱등 식별용이라 충돌만 사실상 없으면 충분.
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// 주문 멱등키(clientOrderId) — 따닥 탭·재전송 시 중복 주문/중복 차감 방지용 "번호표".
// 보안 토큰이 아니라 요청 식별용이므로 클라가 UUID로 자유롭게 생성한다 (issue #4).
// ⚠️ 주문 "시도" 1건당 1개 생성해 보관하고, 재시도/재전송 때는 같은 값을 재사용해야 멱등이 작동.
//    재시도마다 새로 만들면 멱등이 깨져 중복 주문이 됨. 새 주문일 때만 새로 발급.
export const genClientOrderId = (): string => safeRandomUUID();
