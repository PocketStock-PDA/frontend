import { ChevronRight } from "lucide-react";
import { AmountDisplay } from "@/components/common/AmountDisplay";
import { cn } from "@/lib/utils";

export interface BalanceCardProps {
  label: string;
  amount: number;
  caption?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** 블루 그라데이션 잔액 히어로 카드 (포켓스톡 CMA 등) */
export function BalanceCard({
  label,
  amount,
  caption,
  actionLabel,
  onAction,
  className,
}: BalanceCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#4f46e5] p-5 text-white",
        className,
      )}
    >
      <p className="text-sm text-white/90">{label}</p>
      <AmountDisplay value={amount} size="xl" className="mt-1 text-white" />
      {caption && <p className="mt-1 text-sm text-white/80">{caption}</p>}
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 flex w-full items-center justify-end gap-0.5 text-sm text-white/90"
        >
          {actionLabel}
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  );
}
