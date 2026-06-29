"use client";

import { useMemo } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";
import { AppHeader } from "@/components/common/AppHeader";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  useHomeLayoutStore,
  useHydrateHomeLayout,
} from "@/store/homeLayoutStore";
import { QUICK_LINK_BY_ID, resolveOrder } from "@/lib/home/quickLinks";
import { cn } from "@/lib/utils";

/** 드래그 핸들로만 정렬되는 행(스위치/탭은 그대로 동작). */
function EditRow({ id }: { id: string }) {
  const link = QUICK_LINK_BY_ID[id];
  const hidden = useHomeLayoutStore((s) => s.hidden.includes(id));
  const toggleHidden = useHomeLayoutStore((s) => s.toggleHidden);
  const controls = useDragControls();

  if (!link) return null;
  const Icon = link.icon;

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border bg-background p-3",
        hidden && "opacity-50",
      )}
    >
      <span
        onPointerDown={(e) => controls.start(e)}
        className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
        aria-label="순서 이동 핸들"
      >
        <GripVertical className="size-5" />
      </span>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        <Icon className="size-4.5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {link.label}
      </span>
      <Switch
        checked={!hidden}
        onCheckedChange={() => toggleHidden(id)}
        aria-label={`${link.label} 표시`}
      />
    </Reorder.Item>
  );
}

export default function HomeEditPage() {
  const order = useHomeLayoutStore((s) => s.order);
  const setOrder = useHomeLayoutStore((s) => s.setOrder);
  const reset = useHomeLayoutStore((s) => s.reset);
  useHydrateHomeLayout();
  const ids = useMemo(() => resolveOrder(order), [order]);

  return (
    <>
      <AppHeader variant="sub" title="홈화면 편집" />

      <p className="mb-3 text-[13px] text-muted-foreground">
        손잡이를 끌어 순서를 바꾸고, 스위치로 표시 여부를 정하세요.
      </p>

      <Reorder.Group
        axis="y"
        values={ids}
        onReorder={setOrder}
        className="space-y-2"
      >
        {ids.map((id) => (
          <EditRow key={id} id={id} />
        ))}
      </Reorder.Group>

      <Button variant="outline" onClick={reset} className="mt-5 w-full">
        기본값으로 초기화
      </Button>
    </>
  );
}
