// 포인트 출석체크 (GET/POST /api/points/attendance)

/** 출석 현황 (GET /api/points/attendance) */
export interface Attendance {
  /** 오늘 이미 출석했는지 */
  checkedToday: boolean;
  /** 현재 연속 출석 일수 (출석한 적 없으면 0) */
  streak: number;
  /** 마지막 출석 일자 (YYYY-MM-DD, KST 서버 기준). 없으면 null */
  lastCheckedDate: string | null;
  /** 1회 출석 적립 포인트 (마이신한포인트) */
  dailyReward: number;
}

/** 출석 처리 결과 (POST /api/points/attendance) */
export interface AttendanceResult {
  /** 이번 출석으로 적립된 포인트 */
  awarded: number;
  /** 출석 후 연속 일수 */
  streak: number;
  /** 적립 후 마이신한포인트 잔액 */
  balanceAfter: number;
}
