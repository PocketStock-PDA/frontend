"use client";

import { useEffect } from "react";
import { ensurePushRegistered } from "@/lib/push/webPush";

/**
 * 앱 로드 시 푸시 토큰 보장(자동) — 이미 알림 권한을 허용한 사용자의 구독을 재등록해 토큰을 최신으로 유지.
 * 권한 요청은 하지 않으며(거슬리지 않게), 미지원·미허용 환경에선 아무 동작도 하지 않는다. UI 없음.
 */
export function PushSync() {
  useEffect(() => {
    void ensurePushRegistered();
  }, []);
  return null;
}
