"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Star,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/common/AppHeader";
import { Switch } from "@/components/ui/switch";
import { useNotificationSettings } from "@/hooks/queries/useNotificationSettings";
import { useUpdateNotificationSettings } from "@/hooks/mutations/useUpdateNotificationSettings";
import {
  disablePush,
  enablePush,
  getPushState,
  type PushState,
} from "@/lib/push/webPush";
import type { NotificationSettings } from "@/types/domain/notification";
import { cn } from "@/lib/utils";

/** 종류별 토글 행 정의 — 아이콘은 네비바 비활성과 동일한 회색 톤으로 통일. marketing 은 발송 트리거가 없어 미노출. */
const TYPE_ICON_TONE = "bg-muted text-muted-foreground";
const TYPE_ROWS: {
  key: keyof NotificationSettings;
  label: string;
  desc: string;
  Icon: LucideIcon;
}[] = [
  {
    key: "tradeFilled",
    label: "거래 체결",
    desc: "주문 체결·자동매매 집행 결과",
    Icon: CheckCircle2,
  },
  {
    key: "priceAlert",
    label: "미체결",
    desc: "미체결·자동매매 실패 안내",
    Icon: XCircle,
  },
  {
    key: "goalNudge",
    label: "목표 알림",
    desc: "목표 달성·예산 넛지",
    Icon: Star,
  },
];

/** 한 줄짜리 토글 카드 (아이콘 + 라벨/설명 + Switch) */
function ToggleRow({
  label,
  desc,
  icon,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  desc?: string;
  icon?: { Icon: LucideIcon; tone: string };
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border p-[15px]",
        disabled && "opacity-50",
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            icon.tone,
          )}
        >
          <icon.Icon className="size-4.5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

export default function NotificationSettingsPage() {
  const settingsQ = useNotificationSettings();
  const update = useUpdateNotificationSettings();

  // 종류별 토글: 서버 설정을 로컬에 미러링(낙관적 반영 → PUT → 실패 시 롤백).
  // 초기값 undefined — 서버값으로 1회 동기화(my/page 의 prevProfile 패턴).
  const [local, setLocal] = useState<NotificationSettings | undefined>(
    undefined,
  );
  const [prev, setPrev] = useState<NotificationSettings | undefined>(undefined);
  if (settingsQ.data && settingsQ.data !== prev) {
    setPrev(settingsQ.data);
    setLocal(settingsQ.data);
  }

  // 마스터(브라우저 권한 + 구독) 상태 — 권한 요청 없이 조회. enable/disable 후 갱신.
  const [pushState, setPushState] = useState<PushState | null>(null);
  const [masterBusy, setMasterBusy] = useState(false);
  useEffect(() => {
    void getPushState().then(setPushState);
  }, []);

  const permission = pushState?.permission;
  const subscribed = !!pushState?.subscribed;
  const masterDisabled =
    masterBusy ||
    pushState === null ||
    permission === "unsupported" ||
    (permission === "denied" && !subscribed);

  const handleMaster = async (next: boolean) => {
    setMasterBusy(true);
    try {
      if (next) {
        const r = await enablePush();
        if (r === "ok") toast.success("푸시 알림을 켰어요");
        else if (r === "denied")
          toast.error("알림 권한이 거부됐어요. 기기 설정에서 허용해 주세요.");
        else
          toast.info(
            "이 환경에서는 푸시를 사용할 수 없어요. 앱 설치 후 이용해 주세요.",
          );
      } else {
        await disablePush();
        toast.success("푸시 알림을 껐어요");
      }
      setPushState(await getPushState());
    } catch {
      toast.error("설정 변경에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setMasterBusy(false);
    }
  };

  // 종류별 토글 — full-replace 라 현재 4개 값 전부 전송. 실패 시 이전 값으로 롤백.
  const toggleType = (key: keyof NotificationSettings, next: boolean) => {
    if (!local) return;
    const before = local;
    const updated = { ...local, [key]: next };
    setLocal(updated);
    update.mutate(updated, {
      onError: () => {
        setLocal(before);
        toast.error("설정 변경에 실패했어요");
      },
    });
  };

  return (
    <>
      <AppHeader variant="sub" title="알림 설정" />

      <div className="flex flex-col gap-2.5 pb-12 pt-2">
        {/* 마스터 */}
        <ToggleRow
          label="푸시 알림 받기"
          desc="기기로 푸시 알림을 받아요"
          checked={subscribed}
          disabled={masterDisabled}
          onCheckedChange={handleMaster}
        />
        {permission === "unsupported" && (
          <p className="px-1 text-[11px] text-muted-foreground">
            이 환경에서는 푸시를 사용할 수 없어요. 앱 설치 후 이용해 주세요.
          </p>
        )}
        {permission === "denied" && !subscribed && (
          <p className="px-1 text-[11px] text-destructive">
            알림 권한이 거부됐어요. 기기 설정에서 알림을 허용해 주세요.
          </p>
        )}

        {/* 종류별 */}
        <p className="mb-1 mt-4 text-xs font-medium text-muted-foreground">
          알림 종류
        </p>
        {TYPE_ROWS.map(({ key, label, desc, Icon }) => (
          <ToggleRow
            key={key}
            label={label}
            desc={desc}
            icon={{ Icon, tone: TYPE_ICON_TONE }}
            checked={!!local?.[key]}
            disabled={!subscribed || !local || update.isPending}
            onCheckedChange={(next) => toggleType(key, next)}
          />
        ))}

        <p className="mt-3 px-1 text-[11px] text-muted-foreground">
          계좌 인증 등 보안 알림은 설정과 무관하게 발송됩니다.
        </p>
      </div>
    </>
  );
}
