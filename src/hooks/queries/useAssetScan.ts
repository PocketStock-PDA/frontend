import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/utils/queryKeys";
import type { ScanResult } from "@/types/domain/asset";

/**
 * 잠자는 잔돈 스캔 (GET /api/assets/scan) — 연동 직후 발견 화면용.
 * enabled로 연동 완료 단계에서만 조회한다.
 */
export function useAssetScan(enabled = true) {
  return useQuery({
    queryKey: queryKeys.asset.scan,
    queryFn: () => api.get<ScanResult>("/api/assets/scan"),
    enabled,
  });
}
