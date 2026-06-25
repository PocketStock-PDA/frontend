"use client";

import { useEffect, useState } from "react";
import { Client, type IMessage } from "@stomp/stompjs";
import { getAccessToken } from "@/lib/auth/session";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;
// 개발용 fallback — 로그인 세션이 없을 때만. 운영에선 미사용.
const DEV_TOKEN =
  process.env.NODE_ENV === "development"
    ? process.env.NEXT_PUBLIC_DEV_TOKEN
    : undefined;

/** WS CONNECT용 Bearer — REST와 동일하게 세션 토큰 우선, 없으면 dev fallback */
function wsAuthHeaders(): Record<string, string> {
  const token = getAccessToken() ?? DEV_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface LiveQuote {
  currentPrice: number;
  /** 등락률(%) — 프레임에 있으면 갱신, 없으면 미포함(REST 값 유지) */
  changeRate?: number;
}

/**
 * 여러 종목 실시간 체결 구독 — 단일 STOMP 연결로 N개 토픽을 묶어 구독(연결 1개).
 *   국내: /topic/stock/trade/{code}     (US3)
 *   해외: /topic/foreign/transaction/{code} (KIS HDFSCNT0)
 * REST 초기 스냅샷 위에 덮어쓸 라이브 가격·등락률 맵을 반환한다.
 * codes(종목군)·overseas(시장)가 바뀌면 이전 시세를 비우고 재구독.
 * ⚠️ WS 서버(STOMP /ws)가 기동·연결돼야 실제 스트리밍됨(아니면 REST 스냅샷 그대로 유지).
 */
export function useStockTradesLive(
  codes: string[],
  overseas: boolean,
): Record<string, LiveQuote> {
  const [live, setLive] = useState<Record<string, LiveQuote>>({});
  // 배열 ref가 매 렌더 바뀌므로 문자열 키로 구독 안정화
  const codesKey = codes.join(",");

  // 시장/종목군 전환 시 이전 시세 제거(REST 스냅샷 폴백) — 렌더 중 리셋(React 권장 패턴)
  const resetKey = `${overseas}|${codesKey}`;
  const [prevReset, setPrevReset] = useState(resetKey);
  if (prevReset !== resetKey) {
    setPrevReset(resetKey);
    setLive({});
  }

  useEffect(() => {
    const codeList = codesKey ? codesKey.split(",") : [];
    if (!WS_URL || codeList.length === 0) return;

    // 네이티브 WebSocket — 백엔드 STOMP /ws가 SockJS 미사용(WebSocketConfig)
    const client = new Client({ brokerURL: WS_URL, reconnectDelay: 3000 });
    // 매 (재)연결 직전에 최신 토큰으로 헤더 갱신 — 세션 갱신/재발급 반영
    client.beforeConnect = () => {
      client.connectHeaders = wsAuthHeaders();
    };

    client.onConnect = () => {
      codeList.forEach((code) => {
        const topic = overseas
          ? `/topic/foreign/transaction/${code}`
          : `/topic/stock/trade/${code}`;
        client.subscribe(topic, (message: IMessage) => {
          let parsed: unknown;
          try {
            parsed = JSON.parse(message.body);
          } catch {
            return;
          }
          const f = (
            parsed && typeof parsed === "object" && "data" in parsed
              ? (parsed as { data: unknown }).data
              : parsed
          ) as { currentPrice?: number; changeRate?: number };
          if (f?.currentPrice === undefined) return;
          setLive((prev) => ({
            ...prev,
            [code]: {
              currentPrice: f.currentPrice as number,
              ...(f.changeRate !== undefined ? { changeRate: f.changeRate } : {}),
            },
          }));
        });
      });
    };

    client.activate();
    return () => {
      void client.deactivate();
    };
  }, [codesKey, overseas]);

  return live;
}
