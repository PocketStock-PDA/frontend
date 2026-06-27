import { cn } from "@/lib/utils";

export interface CurrencyToggleProps {
  /** 켜짐(true)=원화(₩), 꺼짐(false)=달러($) */
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}

/** 달러($) ↔ 원화(₩) 표시 토글. checked=원화. knob에 현재 통화 글자 노출. */
export function CurrencyToggle({ checked, onChange, className }: CurrencyToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? "원화로 보기 (켜짐)" : "원화로 보기 (꺼짐)"}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full px-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        checked ? "bg-primary" : "bg-muted",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full bg-white font-numeric text-[11px] font-bold shadow-sm transition-transform duration-200 ease-out",
          checked ? "translate-x-5 text-primary" : "translate-x-0 text-muted-foreground",
        )}
      >
        {checked ? "₩" : "$"}
      </span>
    </button>
  );
}
