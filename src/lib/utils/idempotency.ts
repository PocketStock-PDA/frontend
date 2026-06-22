// 주문 멱등키(clientOrderId) — 따닥 탭·재전송 시 중복 주문/중복 차감 방지용 "번호표".
// 보안 토큰이 아니라 요청 식별용이므로 클라가 UUID로 자유롭게 생성한다 (issue #4).
// ⚠️ 주문 "시도" 1건당 1개 생성해 보관하고, 재시도/재전송 때는 같은 값을 재사용해야 멱등이 작동.
//    재시도마다 새로 만들면 멱등이 깨져 중복 주문이 됨. 새 주문일 때만 새로 발급.
export const genClientOrderId = (): string => crypto.randomUUID();
