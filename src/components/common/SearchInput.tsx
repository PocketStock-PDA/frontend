"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  /** 마운트 시 자동 포커스 (검색 전용 오버레이 등) */
  autoFocus?: boolean;
  className?: string;
}

/** 검색 인풋: 좌측 돋보기 + 입력 시 우측 클리어(X) */
export function SearchInput({
  value,
  onChange,
  placeholder = "검색",
  onClear,
  autoFocus = false,
  className,
}: SearchInputProps) {
  const handleClear = () => {
    onChange("");
    onClear?.();
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl bg-muted px-3.5 py-3 transition-colors focus-within:ring-2 focus-within:ring-primary/40",
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-muted-foreground" />
      <input
        type="search"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        // iOS는 16px 미만 입력 포커스 시 화면을 자동 확대 → 모바일 text-base(16px)로 줌 차단,
        // md+에선 기존 14px 유지(Input 컴포넌트와 동일 패턴).
        className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="검색어 지우기"
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
