"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { InstitutionLogo } from "@/components/common/InstitutionLogo";
import { useInstitutions } from "@/hooks/queries/useInstitutions";
import { useLinkAssets } from "@/hooks/mutations/useLinkAssets";
import { useUnlinkPoint } from "@/hooks/mutations/useUnlinkPoint";
import { cn } from "@/lib/utils";

/** 자사 포인트(마이신한) — 제휴사 선택 그리드에서 제외. */
const SELF_POINT = "SHINHAN_POINT";

interface PartnerPointSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 제휴사 포인트 연동 설정 — POINT 기관 그리드에서 여러 개 체크 후 일괄 연동/해제.
 * 시안: 포인트 전환하기(1248-102).
 */
export function PartnerPointSheet({ open, onOpenChange }: PartnerPointSheetProps) {
  const { data: institutions } = useInstitutions();
  const link = useLinkAssets();
  const unlink = useUnlinkPoint();

  const partners = useMemo(
    () =>
      (institutions ?? []).filter(
        (i) => i.category === "POINT" && i.companyCode !== SELF_POINT,
      ),
    [institutions],
  );
  const linkedCodes = useMemo(
    () =>
      new Set(
        partners.filter((p) => p.linkStatus === "LINKED").map((p) => p.companyCode),
      ),
    [partners],
  );

  // 시트 열릴 때 현재 연동 현황으로 선택 초기화.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 시트 오픈 시 연동 현황으로 1회 동기화
    setSelected(new Set(linkedCodes));
    // linkedCodes는 오픈 시점 값으로 충분(중간 리페치 시 선택 유지) → open만 의존
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (code: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const pending = link.isPending || unlink.isPending;

  const apply = async () => {
    const toLink = [...selected].filter((c) => !linkedCodes.has(c));
    const toUnlink = [...linkedCodes].filter((c) => !selected.has(c));
    if (toLink.length === 0 && toUnlink.length === 0) {
      onOpenChange(false);
      return;
    }
    try {
      if (toLink.length > 0) await link.mutateAsync(toLink); // 일괄 연동
      await Promise.all(toUnlink.map((c) => unlink.mutateAsync(c))); // 개별 해제
      toast.success("포인트 연동을 업데이트했어요");
      onOpenChange(false);
    } catch {
      toast.error("연동 처리에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[85vh] max-w-[430px] gap-0 rounded-t-3xl px-5 pb-6 pt-2"
      >
        <SheetHeader className="px-0">
          <SheetTitle className="text-lg font-bold">제휴사 포인트 연동</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            연동할 제휴사를 선택하세요. 연동 해제도 여기서 할 수 있어요.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-2 grid grid-cols-3 gap-2 overflow-y-auto py-2">
          {partners.map((p) => {
            const on = selected.has(p.companyCode);
            return (
              <button
                key={p.companyCode}
                type="button"
                onClick={() => toggle(p.companyCode)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition",
                  on
                    ? "border-primary bg-brand-surface"
                    : "border-border bg-card",
                )}
              >
                {on && (
                  <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary">
                    <Check className="size-3 text-white" />
                  </span>
                )}
                <InstitutionLogo
                  code={p.companyCode}
                  logoUrl={p.logoUrl}
                  name={p.companyName}
                  className="size-11"
                />
                <span className="line-clamp-2 text-center text-[11px] leading-tight text-foreground">
                  {p.companyName}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          onClick={apply}
          disabled={pending}
          className="mt-3 h-12 w-full text-base font-bold"
        >
          {pending ? "처리 중..." : "적용"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
