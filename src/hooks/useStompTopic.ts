"use client";

import { useEffect, useRef } from "react";
import { Client, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;
// 개발용 임시 인증 — REST(client.ts)와 동일. 운영은 로그인 토큰으로 대체 예정.
const DEV_TOKEN =
  process.env.NODE_ENV === "development"
    ? process.env.NEXT_PUBLIC_DEV_TOKEN
    : undefined;

/**
 * STOMP(over SockJS) 단일 토픽 구독 공통 훅. 연결·재연결(3s)·해제를 처리한다.
 * 메시지는 JSON 파싱 후, REST처럼 `{ data }` 래핑이면 자동 언랩해 onMessage로 전달.
 * topic 이 null 이거나 enabled=false 면 구독하지 않는다.
 * ⚠️ WS 서버(게이트웨이 :8080/ws)가 기동돼야 실제 연결됨.
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

    // SockJS 핸드셰이크는 http(s) 스킴 (env는 ws:// → http://)
    const httpUrl = WS_URL.replace(/^ws/, "http");
    const client = new Client({
      webSocketFactory: () => new SockJS(httpUrl),
      reconnectDelay: 3000,
      connectHeaders: DEV_TOKEN ? { Authorization: `Bearer ${DEV_TOKEN}` } : {},
    });

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
