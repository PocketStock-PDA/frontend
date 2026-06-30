"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExitGuardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ExitGuardDialog({ open, onOpenChange, onConfirm }: ExitGuardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[320px] gap-0 rounded-2xl px-6 pb-6 pt-6">
        <DialogHeader className="text-left">
          <DialogTitle>아직 예약이 완료되지 않았어요</DialogTitle>
          <DialogDescription className="mt-1.5 text-[13px] leading-relaxed">
            지금 나가면 설정한 내용이 사라지고 예약도 되지 않아요. 계속 진행할까요?
          </DialogDescription>
        </DialogHeader>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
            className="h-11 flex-1 rounded-xl bg-muted text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/70 active:scale-95"
          >
            나가기
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-white transition-opacity active:scale-95 active:opacity-80"
          >
            계속 설정하기
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
