"use client";

import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";

/**
 * T3. 간편 호가창 매매 (온주) — placeholder.
 * 실제 호가창 + WebSocket 실시간 + 온주 지정가 주문은 이슈 ②에서 구현.
 */
export default function OrderbookPage() {
  return (
    <>
      <AppHeader variant="sub" title="호가창 매매" />
      <div className="pt-6">
        <EmptyState
          title="호가창 매매 준비 중"
          description="간편 호가창(온주 지정가) 매매는 곧 제공될 예정이에요."
        />
      </div>
    </>
  );
}
