import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface SkeletonCardProps {
  /** 본문 줄 수, 기본 2 */
  lines?: number;
  className?: string;
}

/** 카드 로딩 스켈레톤 */
export function SkeletonCard({ lines = 2, className }: SkeletonCardProps) {
  // 음수/비유한 값으로 인한 RangeError 방지
  const count = Number.isFinite(lines) ? Math.max(0, Math.floor(lines)) : 0;
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4",
        className,
      )}
    >
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === count - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}
