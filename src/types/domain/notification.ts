// 알림 센터 (GET /api/notifications) — NotificationController와 1:1

/** 알림 한 건 (NotificationItem) */
export interface NotificationItem {
  id: number;
  /** 알림 종류 — 아이콘/색상 매핑 키 (예: TRADE_FILLED, UNFILLED, ...). 백엔드 어휘 확정 전 fallback 처리 */
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

/** 알림 목록 응답 (NotificationListResponse) */
export interface NotificationListResponse {
  notifications: NotificationItem[];
  /** 안읽음 개수 — 헤더 종 뱃지용 */
  unreadCount: number;
  page: number;
  totalElements: number;
}
