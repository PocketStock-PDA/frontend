"use client";

import { useEffect, useRef } from "react";
import { Client, type IMessage } from "@stomp/stompjs";
import { getAccessToken } from "@/lib/auth/session";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;
// 개발용 fallback — 로그인 세션이 없을 때만. 운영(NODE_ENV !== development)에선 미사용.
const DEV_TOKEN =
  process.env.NODE_ENV === "development"
    ? process.env.NEXT_PUBLIC_DEV_TOKEN
    : undefined;

/** WS CONNECT용 Bearer — REST와 동일하게 세션 토큰 우선, 없으면 dev fallback */
function wsAuthHeaders(): Record<string, string> {
  const token = getAccessToken() ?? DEV_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * STOMP(네이티브 WebSocket) 단일 토픽 구독 공통 훅. 연결·재연결(3s)·해제를 처리한다.
 * 메시지는 JSON 파싱 후, REST처럼 `{ data }` 래핑이면 자동 언랩해 onMessage로 전달.
 * topic 이 null 이거나 enabled=false 면 구독하지 않는다.
 * ⚠️ 백엔드 STOMP /ws(네이티브, ledger-api)가 기동돼야 실제 연결됨.
 */
export function useStompTopic<T>(
  topic: string | null,
  onMessage: (payload: T) => void,
  enabled = true,
) {
  // 핸들러 최신값을 ref로 유지 → onMessage 참조가 바뀌어도 재연결하지 않음
  const handlerRef = useRef(onMessage);
  useEffect(() => {
    handlerRef.current = onMessage;
  });

  useEffect(() => {
    if (!enabled || !topic || !WS_URL) return;

    // 네이티브 WebSocket — 백엔드 STOMP /ws가 SockJS 미사용(WebSocketConfig)
    const client = new Client({ brokerURL: WS_URL, reconnectDelay: 3000 });
    // 매 (재)연결 직전에 최신 토큰으로 헤더 갱신 — 세션 갱신/재발급 반영
    client.beforeConnect = () => {
      client.connectHeaders = wsAuthHeaders();
    };

    client.onConnect = () => {
      client.subscribe(topic, (message: IMessage) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(message.body);
        } catch {
          return;
        }
        const payload = (
          parsed && typeof parsed === "object" && "data" in parsed
            ? (parsed as { data: unknown }).data
            : parsed
        ) as T;
        handlerRef.current(payload);
      });
    };

    client.activate();
    return () => {
      void client.deactivate();
    };
  }, [topic, enabled]);
}
