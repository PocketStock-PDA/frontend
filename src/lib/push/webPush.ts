import { api } from "@/lib/api/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export type PushEnableResult = "ok" | "denied" | "unsupported";

/** base64url(VAPID 공개키) → Uint8Array (applicationServerKey 형식) */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!VAPID_PUBLIC_KEY
  );
}

/** 활성 서비스워커 등록 조회 — 없으면(dev·미등록) undefined. ready는 미등록 시 영영 pending이라 회피. */
async function getRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing) return undefined;
  return navigator.serviceWorker.ready;
}

/** 구독 생성/재사용 후 백엔드 등록. */
async function registerSubscription(
  reg: ServiceWorkerRegistration,
): Promise<void> {
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string),
    }));
  await api.post<void>("/api/notifications/token", {
    token: JSON.stringify(sub.toJSON()),
    deviceType: "WEB",
  });
}

/**
 * 푸시 켜기(사용자 동작) — 권한 요청 → 구독 → 백엔드 등록.
 * "ok"=성공 / "denied"=권한 거부 / "unsupported"=미지원·SW미등록(dev 등).
 */
export async function enablePush(): Promise<PushEnableResult> {
  if (!isPushSupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const reg = await getRegistration();
  if (!reg) return "unsupported";
  await registerSubscription(reg);
  return "ok";
}

/**
 * 앱 로드 시 토큰 보장(자동) — 이미 권한 허용된 경우에만 구독 재등록.
 * 권한 요청은 하지 않음(거슬리지 않게). 실패는 조용히 무시.
 */
export async function ensurePushRegistered(): Promise<void> {
  if (!isPushSupported() || Notification.permission !== "granted") return;
  try {
    const reg = await getRegistration();
    if (reg) await registerSubscription(reg);
  } catch {
    // 토큰 보장 실패는 best-effort — 무시
  }
}
