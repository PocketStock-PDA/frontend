import { Bell, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatKRW } from "@/lib/utils/currency";
import type { MaturityTriggerAccount } from "@/types/domain/asset";

interface MaturityAlertCardProps {
  account: MaturityTriggerAccount;
}

export function MaturityAlertCard({ account }: MaturityAlertCardProps) {
  const { accountName, principalAmount, maturityDate, daysUntilMaturity } = account;

  const parts = maturityDate.split("-");
  const formattedDate = `${parseInt(parts[1] ?? "0")}/${parseInt(parts[2] ?? "0")}`;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      {/* 헤더 */}
      <div className="mb-2 flex items-center gap-1.5">
        <Bell className="size-3.5 text-amber-500" />
        <span className="text-xs font-semibold text-amber-600">
          곧 만기예요 · D-{daysUntilMaturity}
        </span>
      </div>

      {/* 계좌 정보 */}
      <p className="text-sm font-bold text-foreground">
        {accountName} {formatKRW(principalAmount)} · {formattedDate} 만기
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        다음 1년, 어디에 들까요?
      </p>

      {/* CTA — 임박 계좌는 선택 화면을 건너뛰고 그 계좌로 바로 추천 진입 */}
      <Link
        href={`/recommendations/maturity?accountId=${account.accountId}`}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white"
      >
        예금 vs 배당주 비교해보기
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
