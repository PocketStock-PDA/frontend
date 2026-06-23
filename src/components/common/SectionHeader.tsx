import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: React.ReactNode;
  /** 우측 액션 ("더보기 >" 등) */
  action?: React.ReactNode;
  className?: string;
}

/** 섹션 제목 + 우측 액션 */
export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div
      className={cn("mb-3 flex items-center justify-between gap-2", className)}
    >
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      {action}
    </div>
  );
}
