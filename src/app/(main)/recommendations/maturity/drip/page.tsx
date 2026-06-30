"use client";

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { AppHeader } from "@/components/common/AppHeader";
import { MaturityStepper } from "@/components/features/maturity/MaturityStepper";
import { ExitGuardDialog } from "@/components/features/maturity/ExitGuardDialog";
import { useStockDetails } from "@/hooks/queries/useStockDetails";
import { parseAccountId } from "@/lib/utils/params";
import { formatKRW } from "@/lib/utils/currency";

/**
 * Step 3: 배당 재투자 설정.
 * 실제 DRIP API는 호출하지 않는다 — drip=CODE:1,CODE:0 파라미터로 step 5(완료)에 전달.
 */
export default function MaturityDripPage() {
  const router = useRouter();
  const params = useSearchParams();
  const accountId = parseAccountId(params.get("accountId"));
  const depositAmount = Math.floor(Number(params.get("deposit")) || 0);
  const hasDeposit = accountId !== null && depositAmount > 0;
  const rawItems = params.get("items") ?? "";
  const [exitOpen, setExitOpen] = useState(false);

  // items=CODE:AMT,... 에서 종목코드 추출
  const codes = useMemo(() => {
    if (!rawItems) return [];
    return rawItems.split(",").flatMap((seg) => {
      const code = seg.split(":")[0];
      return code ? [code] : [];
    });
  }, [rawItems]);

  // DRIP 토글 로컬 상태 — 기본값: 모두 켬
  const [dripEnabled, setDripEnabled] = useState<Record<string, boolean>>(
    () => Object.fromEntries(codes.map((c) => [c, true])),
  );

  const detailQueries = useStockDetails(codes);
  const infoByCode = useMemo(() => {
    const m = new Map<string, { name: string; logoUrl: string | null }>();
    codes.forEach((code, i) => {
      const d = detailQueries[i]?.data;
      m.set(code, { name: d?.stockName ?? code, logoUrl: d?.logoUrl ?? null });
    });
    return m;
  }, [codes, detailQueries]);

  const handleNext = () => {
    const dripParam = codes.map((c) => `${c}:${dripEnabled[c] ? 1 : 0}`).join(",");
    const base = `items=${rawItems}&accountId=${accountId ?? ""}&drip=${dripParam}`;
    if (hasDeposit) {
      router.push(`/recommendations/maturity/deposit?${base}&deposit=${depositAmount}`);
    } else {
      router.push(`/recommendations/maturity/complete?${base}&depositAction=skip`);
    }
  };

  return (
    <>
      <AppHeader variant="sub" title="배당 재투자" onBack={() => setExitOpen(true)} />
      <MaturityStepper current={3} />

      <div className="space-y-5 pb-28">
        {/* 헤더 설명 */}
        <section className="rounded-2xl bg-brand-surface p-5">
          <div className="flex items-center gap-1.5 text-[13.5px] font-bold text-primary">
            <CheckCircle2 className="size-[17px]" />
            배당 재투자 설정
          </div>
          <p className="mt-2.5 text-[15.5px] font-bold leading-snug text-foreground">
            배당이 들어오면 자동으로
            <br />
            같은 주식을 더 사드려요
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#3c5170]">
            받은 배당으로 같은 주식을 더 사 복리를 굴려요. 언제든지 설정을 바꿀 수 있어요.
          </p>
        </section>

        {/* 종목별 DRIP 토글 */}
        {codes.length > 0 && (
          <section>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <ul className="divide-y divide-border">
                {codes.map((code) => {
                  const info = infoByCode.get(code);
                  const name = info?.name ?? code;
                  const logoUrl = info?.logoUrl ?? null;
                  const enabled = dripEnabled[code] ?? true;
                  return (
                    <li key={code} className="flex items-center gap-3 px-4 py-3.5">
                      <Avatar className="size-9 shrink-0 rounded-xl">
                        {logoUrl && <AvatarImage src={logoUrl} alt="" />}
                        <AvatarFallback className="rounded-xl bg-muted text-[11px] font-semibold text-muted-foreground">
                          {name.trim().charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground">{name}</p>
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          {enabled ? "배당 재투자 켜짐" : "꺼짐 · 배당을 현금으로 받아요"}
                        </p>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(v) =>
                          setDripEnabled((prev) => ({ ...prev, [code]: v }))
                        }
                        aria-label={`${name} 배당 재투자 ${enabled ? "끄기" : "켜기"}`}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="mt-2 px-1 text-[11.5px] leading-relaxed text-muted-foreground">
              소액 배당(1,000원 미만)은 CMA 잔돈으로 채워 1,000원어치 사드려요.
            </p>
          </section>
        )}

      </div>

      {/* 하단 CTA */}
      <div className="fixed bottom-[var(--bottom-nav-offset)] left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-background px-5 pb-4 pt-3">
        {hasDeposit && (
          <div className="mb-3 flex items-center justify-between rounded-xl bg-muted px-4 py-2.5">
            <p className="text-[12.5px] text-muted-foreground">남은 금액 · 다음 단계에서 재예치 설정</p>
            <p className="font-numeric text-[13px] font-semibold tabular-nums text-foreground">
              {formatKRW(depositAmount)}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={handleNext}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white transition-[opacity,transform] duration-150 active:scale-[0.98] active:opacity-80"
        >
          {hasDeposit ? "예금 재예치 설정" : "최종 확인"}
        </button>
      </div>

      <ExitGuardDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        onConfirm={() => router.back()}
      />
    </>
  );
}
