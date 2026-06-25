"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { WheelPicker, type WheelPickerOption } from "@/components/common/WheelPicker";

export interface WheelPickerSheetProps<T extends string | number> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: WheelPickerOption<T>[];
  value: T;
  /** 확인 시 확정 */
  onConfirm: (value: T) => void;
}

/** 휠 피커 바텀시트 — 제목 + 휠 + 취소/확인. 확인을 눌러야 확정(취소=원복). */
export function WheelPickerSheet<T extends string | number>({
  open,
  onOpenChange,
  title,
  options,
  value,
  onConfirm,
}: WheelPickerSheetProps<T>) {
  const [temp, setTemp] = useState<T>(value);
  // 열릴 때 현재 값으로 초기화
  useEffect(() => {
    if (open) setTemp(value);
  }, [open, value]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="gap-0 rounded-t-2xl px-5 pb-7 pt-3">
        <SheetHeader className="p-0 pb-1">
          <SheetTitle className="text-base font-bold">{title}</SheetTitle>
        </SheetHeader>
        <WheelPicker
          options={options}
          value={temp}
          onChange={setTemp}
          className="mt-2"
        />
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12 flex-1 text-base font-bold"
          >
            취소
          </Button>
          <Button
            onClick={() => {
              onConfirm(temp);
              onOpenChange(false);
            }}
            className="h-12 flex-1 text-base font-bold"
          >
            확인
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
