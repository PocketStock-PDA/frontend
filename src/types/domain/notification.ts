// 알림 센터 (GET /api/notifications) — NotificationController와 1:1

/** 알림 한 건 (NotificationItem) */
export interface NotificationItem {
  id: number;
  /** 알림 종류 — 아이콘/색상 매핑 키 (예: TRADE_FILLED, UNFILLED, ...). 백엔드 어휘 확정 전 fallback 처리 */
  type: string;
  title: string;
  body: string;
  tag?: string | null;
  url?: string | null;
  occurredAt?: string | null;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

/**
 * 알림 수신 설정 (GET/PUT /api/notifications/settings) — NotificationSettings{Request,Response} 와 1:1.
 * full-replace 라 PUT 시 4개 필드 전부 전송. priceAlert ↔ notify_unfilled(미체결).
 * 신규 유저는 BE 기본값으로 전부 true.
 */
export interface NotificationSettings {
  /** 거래 체결 (TRADE_FILLED, AUTO_INVEST_EXECUTED) */
  tradeFilled: boolean;
  /** 미체결 (UNFILLED, AUTO_INVEST_FAILED) */
  priceAlert: boolean;
  /** 목표 알림 (GOAL_NUDGE) */
  goalNudge: boolean;
  /** 마케팅 (MARKETING) — 현재 발송 트리거 없음. UI 미노출, 값은 보존만 함 */
  marketing: boolean;
}

/** 알림 목록 응답 (NotificationListResponse) */
export interface NotificationListResponse {
  notifications: NotificationItem[];
  /** 안읽음 개수 — 헤더 종 뱃지용 */
  unreadCount: number;
  page: number;
  totalElements: number;
}
