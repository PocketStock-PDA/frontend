// 백엔드 공통 응답 구조
export interface ApiResponse<T = unknown> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
}