"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchInput } from "@/components/common/SearchInput";
import { useStockSearch } from "@/hooks/queries/useStockSearch";

/**
 * 종목 검색 전용 화면 (/trading/search).
 * 라우트라 모바일 뒤로가기로 자연히 닫히고, 종목 선택 시 replace로 검색을 히스토리에서 비운다.
 */
export default function StockSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data, isLoading } = useStockSearch(query);
  // 백엔드가 드물게 data:null → api 클라가 {} 반환. 배열 가드로 크래시 방지
  const stocks = Array.isArray(data) ? data : [];
  const trimmed = query.trim();

  // 종목 선택 → 매수매도로. replace라 거기서 뒤로가기 시 검색이 아닌 직전 화면으로
  const pick = (code: string) => router.replace(`/trading/${code}`);

  return (
    <>
      <AppHeader variant="sub" title="종목 검색" />
      <div className="space-y-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="종목명 또는 코드 검색"
          autoFocus
        />

        {trimmed.length === 0 ? (
          <p className="px-1 py-10 text-center text-sm text-muted-foreground">
            종목명 또는 코드로 검색해 보세요
          </p>
        ) : isLoading ? (
          <p className="px-1 py-10 text-center text-sm text-muted-foreground">
            검색 중…
          </p>
        ) : stocks.length === 0 ? (
          <p className="px-1 py-10 text-center text-sm text-muted-foreground">
            검색 결과가 없어요
          </p>
        ) : (
          <ul className="-mx-1">
            {stocks.map((s) => (
              <li key={s.stockCode}>
                <button
                  type="button"
                  onClick={() => pick(s.stockCode)}
                  className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <Avatar className="size-8">
                    {s.logoUrl && (
                      <AvatarImage src={s.logoUrl} alt={s.stockName} />
                    )}
                    <AvatarFallback>{s.stockName.trim().charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {s.stockName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.exchange} · {s.stockCode}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
