"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { InstitutionLogo } from "@/components/common/InstitutionLogo";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { AppHeader } from "@/components/common/AppHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { PinKeypad } from "@/components/common/PinKeypad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBankAccounts } from "@/hooks/queries/useBankAccounts";
import { useCmaHome, isNoCmaAccount } from "@/hooks/queries/useCmaHome";
import {
  useAgreeTerms,
  useSetAccountPassword,
  useOpenAccount,
  useOpenCmaAccount,
} from "@/hooks/mutations/useAccountOpen";
import {
  useRequestAccountVerify,
  useConfirmAccountVerify,
} from "@/hooks/mutations/useAccountVerify";
import { formatKRW } from "@/lib/utils/currency";
import { formatPhone, isValidPhone } from "@/lib/utils/phone";
import { cn } from "@/lib/utils";
import type {
  AccountVerifyRequestResult,
  BankAccount,
} from "@/types/domain/account";

type Step = "TERMS" | "INFO" | "BANK" | "VERIFY" | "PASSWORD" | "DONE";
type AccountKind = "FULL" | "CMA";

const STEP_TITLE: Record<Step, string> = {
  TERMS: "약관 동의",
  INFO: "회원 정보 확인",
  BANK: "인증할 계좌 선택",
  VERIFY: "1원 송금 인증",
  PASSWORD: "계좌 비밀번호 설정",
  DONE: "계좌 개설 완료",
};

const STEP_ORDER: Step[] = ["TERMS", "INFO", "BANK", "VERIFY", "PASSWORD", "DONE"];

// CMA는 POST /api/cma/account, 증권은 POST /api/trading/accounts(DOMESTIC·OVERSEAS).
// FULL=CMA+종합(둘 다), CMA=CMA만.
const SECURITIES_TYPES = ["DOMESTIC", "OVERSEAS"];

// 약관 GET 엔드포인트가 없어 하드코딩. 백엔드 실측: termId 1·2·3, 전부 필수
const TERMS = [
  { id: 1, label: "계좌 개설 약관 동의", required: true },
  { id: 2, label: "개인(신용)정보 수집·이용 동의", required: true },
  { id: 3, label: "전자금융거래 이용약관 동의", required: true },
];

const errMsg = (e: unknown) =>
  e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.";

export default function AccountOpenPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("TERMS");
  const [kind, setKind] = useState<AccountKind>("FULL");
  const [agreed, setAgreed] = useState<Set<number>>(new Set());
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [verify, setVerify] = useState<AccountVerifyRequestResult | null>(null);
  const [accountNo, setAccountNo] = useState<string | null>(null);
  // 이 플로우에서 개설을 시작/완료했는지. true면 개설 직후 useCmaHome이 200으로 바뀌어도
  // "이미 보유 → /home" 가드가 발동하지 않게 한다. (#155)
  const [opened, setOpened] = useState(false);

  // CMA 계좌를 이미 보유한 회원에게는 계좌개설 페이지를 노출하지 않는다.
  const cmaQ = useCmaHome();
  useEffect(() => {
    if (cmaQ.isSuccess && !opened) router.replace("/home");
  }, [cmaQ.isSuccess, opened, router]);

  const bankQ = useBankAccounts();
  const agreeTerms = useAgreeTerms();
  const reqVerify = useRequestAccountVerify();
  const confirmVerify = useConfirmAccountVerify();
  const setPw = useSetAccountPassword();
  const openAcc = useOpenAccount();
  const openCma = useOpenCmaAccount();

  const back = () => {
    const order: Step[] = ["TERMS", "INFO", "BANK", "VERIFY", "PASSWORD"];
    const prev = order[order.indexOf(step) - 1];
    if (prev) setStep(prev);
    else router.back();
  };

  // CMA 미개설(404)이 확정된 회원에게만 계좌개설 UI를 노출한다. (#155)
  if (!opened && !isNoCmaAccount(cmaQ.error)) {
    return (
      <>
        <AppHeader variant="sub" title="계좌 개설" showMenu={false} showBack={false} />
        <div className="p-4">
          <SkeletonCard lines={3} className="h-48" />
        </div>
      </>
    );
  }

  const stepIdx = STEP_ORDER.indexOf(step);
  const progress = (stepIdx + 1) / STEP_ORDER.length;

  return (
    <>
      <AppHeader
        variant="sub"
        title={STEP_TITLE[step]}
        showMenu={false}
        {...(step === "DONE" ? {} : { onBack: back })}
      />

      {step !== "DONE" && (
        <div className="h-[2px] overflow-hidden bg-muted">
          <div
            className="h-full w-full origin-left bg-primary transition-transform duration-500"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
      )}

      <div
        className={cn(
          step !== "DONE" && "pb-32",
          step !== "PASSWORD" && step !== "DONE" && "px-4",
        )}
      >
        {step === "TERMS" && (
          <TermsStep
            kind={kind}
            setKind={setKind}
            agreed={agreed}
            setAgreed={setAgreed}
            pending={agreeTerms.isPending}
            onNext={() => {
              const payload = TERMS.map((t) => ({
                termId: t.id,
                agreed: agreed.has(t.id),
              }));
              agreeTerms.mutate(payload, {
                onSuccess: () => setStep("INFO"),
                onError: (e) => toast.error(errMsg(e)),
              });
            }}
          />
        )}

        {step === "INFO" && (
          <InfoStep
            name={name}
            setName={setName}
            phone={phone}
            setPhone={setPhone}
            onNext={() => setStep("BANK")}
          />
        )}

        {step === "BANK" && (
          <BankStep
            query={bankQ}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            pending={reqVerify.isPending}
            onNext={() => {
              if (selectedId === null || reqVerify.isPending) return;
              reqVerify.mutate(selectedId, {
                onSuccess: (data) => {
                  setVerify(data);
                  setStep("VERIFY");
                },
                onError: (e) => toast.error(errMsg(e)),
              });
            }}
          />
        )}

        {step === "VERIFY" && verify && (
          <VerifyStep
            key={verify.verificationId}
            verify={verify}
            bank={bankQ.data?.find((a) => a.accountId === selectedId)}
            pending={confirmVerify.isPending}
            resending={reqVerify.isPending}
            onResend={() => {
              if (selectedId === null || reqVerify.isPending) return;
              reqVerify.mutate(selectedId, {
                onSuccess: (data) => setVerify(data),
                onError: (e) => toast.error(errMsg(e)),
              });
            }}
            onConfirm={(code) =>
              confirmVerify.mutate(
                { verificationId: verify.verificationId, code },
                {
                  onSuccess: (res) => {
                    if (res.verified) {
                      toast.success("계좌 인증 완료");
                      setStep("PASSWORD");
                    } else {
                      toast.error("입금자명이 일치하지 않아요.");
                    }
                  },
                  onError: (e) => toast.error(errMsg(e)),
                },
              )
            }
          />
        )}

        {step === "PASSWORD" && (
          <PasswordStep
            pending={
              setPw.isPending || openCma.isPending || openAcc.isPending
            }
            onDone={(pw) =>
              setPw.mutate(pw, {
                onSuccess: () =>
                  // 항상 CMA 개설 → FULL이면 증권(국내·해외)도 개설
                  openCma.mutate(undefined, {
                    onSuccess: (cma) => {
                      // CMA가 생긴 시점부터 /home 리다이렉트 가드를 끈다 (FULL은 증권개설이 더 남음)
                      setOpened(true);
                      if (kind === "CMA") {
                        setAccountNo(cma.cmaAccountNo);
                        setStep("DONE");
                        return;
                      }
                      openAcc.mutate(SECURITIES_TYPES, {
                        onSuccess: (sec) => {
                          setAccountNo(sec.accountNo);
                          setStep("DONE");
                        },
                        onError: (e) => toast.error(errMsg(e)),
                      });
                    },
                    onError: (e) => toast.error(errMsg(e)),
                  }),
                onError: (e) => toast.error(errMsg(e)),
              })
            }
          />
        )}

        {step === "DONE" && (
          <DoneStep
            accountNo={accountNo}
            kind={kind}
            onStart={() => router.replace("/asset-link")}
          />
        )}
      </div>
    </>
  );
}

// ── 공통: 고정 하단 CTA ──────────────────────────────────────────────────────────
function BottomCta({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-border bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
      {children}
    </div>
  );
}

// ── 1. 약관 + 계좌 종류 ────────────────────────────────────────────────────────
function TermsStep({
  kind,
  setKind,
  agreed,
  setAgreed,
  pending,
  onNext,
}: {
  kind: AccountKind;
  setKind: (k: AccountKind) => void;
  agreed: Set<number>;
  setAgreed: (s: Set<number>) => void;
  pending: boolean;
  onNext: () => void;
}) {
  const allOn = TERMS.every((t) => agreed.has(t.id));
  const requiredOk = TERMS.filter((t) => t.required).every((t) =>
    agreed.has(t.id),
  );
  const toggle = (id: number) => {
    const next = new Set(agreed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setAgreed(next);
  };
  const toggleAll = () =>
    setAgreed(allOn ? new Set() : new Set(TERMS.map((t) => t.id)));

  return (
    <div className="space-y-5 pt-6">
      <section className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">계좌 종류</p>
        {(
          [
            { value: "FULL", label: "CMA + 종합계좌", desc: "국내·해외 주식 + CMA" },
            { value: "CMA", label: "CMA 계좌만", desc: "포켓스톡 CMA만 개설" },
          ] as const
        ).map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={kind === o.value}
            onClick={() => setKind(o.value)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors",
              kind === o.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30",
            )}
          >
            <span>
              <span className="block text-sm font-semibold text-foreground">
                {o.label}
              </span>
              <span className="block text-xs text-muted-foreground">
                {o.desc}
              </span>
            </span>
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full transition-colors",
                kind === o.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted",
              )}
            >
              {kind === o.value && <Check className="size-3" />}
            </span>
          </button>
        ))}
      </section>

      <section className="space-y-0.5">
        <button
          type="button"
          onClick={toggleAll}
          className="flex w-full items-center gap-2.5 rounded-xl bg-muted/60 px-4 py-3 text-left"
        >
          <CheckCircle on={allOn} />
          <span className="text-sm font-semibold text-foreground">전체 동의</span>
        </button>
        {TERMS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left"
          >
            <CheckCircle on={agreed.has(t.id)} />
            <span className="flex-1 text-sm text-foreground">
              <span className="text-muted-foreground">
                [{t.required ? "필수" : "선택"}]{" "}
              </span>
              {t.label}
            </span>
          </button>
        ))}
      </section>

      <BottomCta>
        <Button
          onClick={onNext}
          disabled={!requiredOk || pending}
          className="h-12 w-full text-[15px] font-semibold"
        >
          다음
        </Button>
      </BottomCta>
    </div>
  );
}

function CheckCircle({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full transition-colors",
        on ? "bg-primary text-primary-foreground" : "bg-muted",
      )}
    >
      {on && <Check className="size-3" />}
    </span>
  );
}

// ── 2. 회원 정보 확인 ──────────────────────────────────────────────────────────
function InfoStep({
  name,
  setName,
  phone,
  setPhone,
  onNext,
}: {
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  onNext: () => void;
}) {
  // 회원가입과 동일 규칙: 010 시작 11자리(공용 isValidPhone).
  const phoneValid = isValidPhone(phone);
  const phoneError = phone.length > 0 && !phoneValid;
  const ok = name.trim().length > 0 && phoneValid;
  return (
    <div className="pt-6">
      <p className="mb-6 text-sm text-muted-foreground">
        계좌 개설에 사용할 회원 정보를 확인해 주세요.
      </p>
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">이름</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            className="h-12"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">휴대폰번호</span>
          <Input
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            inputMode="tel"
            placeholder="010-0000-0000"
            className="h-12"
          />
          {phoneError && (
            <span className="text-xs text-destructive">
              010으로 시작하는 휴대폰 번호 11자리를 입력해 주세요.
            </span>
          )}
        </label>
      </div>
      <BottomCta>
        <Button
          onClick={onNext}
          disabled={!ok}
          className="h-12 w-full text-[15px] font-semibold"
        >
          다음
        </Button>
      </BottomCta>
    </div>
  );
}

// ── 3. 인증할 계좌 선택 ────────────────────────────────────────────────────────
function BankStep({
  query,
  selectedId,
  setSelectedId,
  pending,
  onNext,
}: {
  query: ReturnType<typeof useBankAccounts>;
  selectedId: number | null;
  setSelectedId: (id: number) => void;
  pending: boolean;
  onNext: () => void;
}) {
  if (query.isLoading) return <SkeletonCard lines={4} className="mt-6 h-44" />;
  if (query.isError) {
    return (
      <div className="pt-6">
        <EmptyState
          title="계좌를 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
              다시 시도
            </Button>
          }
        />
      </div>
    );
  }
  // 1원 인증 대상은 입출금(DEMAND) 통장만 — 적금/예금(SAVINGS/DEPOSIT)은 제외.
  const accounts = (query.data ?? []).filter(
    (a) => !a.isDormant && a.accountType === "DEMAND",
  );
  if (accounts.length === 0) {
    return (
      <div className="pt-6">
        <EmptyState
          title="인증할 계좌가 없어요"
          description="본인 명의의 입출금 계좌가 필요해요."
        />
      </div>
    );
  }
  return (
    <div className="pt-6">
      <p className="mb-5 text-sm text-muted-foreground">
        본인 명의 계좌로 1원을 보내 인증해요.
      </p>
      <div className="space-y-2">
        {accounts.map((a: BankAccount) => (
          <button
            key={a.accountId}
            type="button"
            onClick={() => setSelectedId(a.accountId)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
              selectedId === a.accountId
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30",
            )}
          >
            <InstitutionLogo
              code={a.bankCode}
              name={a.bankName}
              className="size-10 shrink-0"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {a.bankName} · {a.accountName}
              </span>
              <span className="block text-xs text-muted-foreground">
                {formatKRW(a.balance)}
              </span>
            </span>
            {selectedId === a.accountId && (
              <Check className="size-4 text-primary" />
            )}
          </button>
        ))}
      </div>
      <BottomCta>
        <Button
          onClick={onNext}
          disabled={selectedId === null || pending}
          className="h-12 w-full text-[15px] font-semibold"
        >
          {pending ? "1원 보내는 중..." : "이 계좌로 인증하기"}
        </Button>
      </BottomCta>
    </div>
  );
}

// ── 4. 1원 송금 인증 ────────────────────────────────────────────────────────────
function VerifyStep({
  verify,
  bank,
  pending,
  resending,
  onResend,
  onConfirm,
}: {
  verify: AccountVerifyRequestResult;
  bank: BankAccount | undefined;
  pending: boolean;
  resending: boolean;
  onResend: () => void;
  onConfirm: (code: string) => void;
}) {
  const [digits, setDigits] = useState(["", "", ""]);
  const code = digits.join("");
  const slotRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const [remain, setRemain] = useState(verify.expiresIn);

  // verify 갱신(다시 받기) 시 부모가 key로 remount → 타이머만 돌림
  useEffect(() => {
    const t = setInterval(() => setRemain((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(remain / 60)).padStart(2, "0");
  const ss = String(remain % 60).padStart(2, "0");
  const expired = remain <= 0;

  return (
    <>
      {/* eslint-disable-next-line react/no-danger -- notif-drop 애니메이션은 이 컴포넌트 전용 */}
      <style>{`
        @keyframes notif-drop {
          from { opacity: 0; transform: translateY(-14px) scale(0.97); }
          to   { opacity: 1; transform: none; }
        }
        .notif-drop {
          animation: notif-drop 0.46s cubic-bezier(0.22,1,0.36,1) 0.1s both;
        }
      `}</style>

      {/* iOS 스타일 알림 배너 */}
      <div className="notif-drop mt-3 overflow-hidden rounded-2xl border border-black/[0.07] bg-[rgba(242,242,247,0.97)] shadow-[0_4px_20px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        <div className="px-3.5 pb-3 pt-3">
          <div className="mb-1.5 flex items-center gap-2">
            <InstitutionLogo
              code="SHINHAN_BANK"
              name="신한"
              className="size-[18px] shrink-0 rounded-[5px]"
            />
            <span className="text-[11px] font-semibold text-[#1c1c1e]">
              superSol
            </span>
            <span className="ml-auto text-[10px] text-[#8e8e93]">지금</span>
          </div>
          <p className="text-[12px] leading-[1.5] text-[#1c1c1e]">
            포켓스톡에서 요청하신 입금 1원이{" "}
            {bank ? `${bank.bankName} ` : ""}계좌로 입금되었어요.
          </p>
          <p className="mt-0.5 text-[12px] text-[#48484a]">
            입금자명:{" "}
            <span className="font-semibold text-[#1c1c1e]">
              {verify.depositorName}
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-6 pt-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">1원을 보냈어요</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {bank ? `${bank.bankName} ${bank.accountName}에 ` : ""}입금했어요.
            <br />
            입금자명의{" "}
            <span className="font-semibold text-foreground">3자리 숫자</span>를
            입력해 주세요.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-center gap-6 py-2">
            {([0, 1, 2] as const).map((i) => (
              <div key={i} className="flex w-14 flex-col items-center gap-2">
                <input
                  ref={slotRefs[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digits[i]}
                  autoFocus={i === 0}
                  onChange={(e) => {
                    const ch = e.target.value.replace(/\D/g, "").slice(-1);
                    const next = [...digits] as [string, string, string];
                    next[i] = ch;
                    setDigits(next);
                    if (ch && i < 2) slotRefs[i + 1].current?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !digits[i] && i > 0) {
                      slotRefs[i - 1].current?.focus();
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  className="font-numeric h-10 w-full bg-transparent text-center text-3xl font-bold text-foreground caret-transparent outline-none"
                />
                <div
                  className={cn(
                    "h-[2px] w-full rounded-full transition-colors duration-150",
                    digits[i] ? "bg-primary" : "bg-border",
                  )}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span
              className={cn(
                expired ? "text-destructive" : "text-muted-foreground",
              )}
            >
              남은 시간 {mm}:{ss}
            </span>
            <button
              type="button"
              onClick={onResend}
              disabled={resending}
              className="font-medium text-primary disabled:opacity-50"
            >
              {resending ? "보내는 중..." : "다시 받기"}
            </button>
          </div>
          {process.env.NODE_ENV === "development" && (
            <p className="text-right text-[11px] text-muted-foreground">
              (개발용 코드: {verify.code})
            </p>
          )}
        </div>

        <BottomCta>
          <Button
            onClick={() => onConfirm(code)}
            disabled={code.length !== 3 || expired || pending}
            className="h-12 w-full text-[15px] font-semibold"
          >
            {pending ? "확인 중..." : "확인"}
          </Button>
        </BottomCta>
      </div>
    </>
  );
}

// ── 5. 계좌 비밀번호 설정 ──────────────────────────────────────────────────────
function PasswordStep({
  pending,
  onDone,
}: {
  pending: boolean;
  onDone: (pw: string) => void;
}) {
  const [phase, setPhase] = useState<"SET" | "CONFIRM">("SET");
  const [first, setFirst] = useState("");
  const [pin, setPin] = useState("");

  const handleChange = (v: string) => {
    setPin(v);
    if (v.length < 4) return;
    if (phase === "SET") {
      setFirst(v);
      setPin("");
      setPhase("CONFIRM");
    } else if (v === first) {
      onDone(v);
    } else {
      toast.error("비밀번호가 일치하지 않아요. 다시 입력해 주세요.");
      setFirst("");
      setPin("");
      setPhase("SET");
    }
  };

  return (
    <div className="space-y-10 pt-6">
      <p className="text-center text-base font-bold text-foreground">
        {phase === "SET"
          ? "계좌 비밀번호 4자리를 입력해 주세요"
          : "한 번 더 입력해 주세요"}
      </p>
      <PinKeypad value={pin} onChange={handleChange} length={4} disabled={pending} secure />
      {pending && (
        <p className="text-center text-sm text-muted-foreground">계좌 개설 중...</p>
      )}
    </div>
  );
}

// ── 6. 개설 완료 ───────────────────────────────────────────────────────────────
function PocketStockLogo() {
  return (
    <img
      src="/icons/icon-512x512.png"
      alt="포켓스톡"
      width={112}
      height={112}
      className="rounded-2xl"
    />
  );
}

function DoneStep({
  accountNo,
  kind,
  onStart,
}: {
  accountNo: string | null;
  kind: AccountKind;
  onStart: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100svh-5rem)] flex-col px-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 pb-8 pt-10 text-center">
        <div
          className="ps-rise-in"
          style={{ "--i": 0 } as React.CSSProperties}
        >
          <PocketStockLogo />
        </div>
        <div
          className="ps-rise-in space-y-2"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          <h2 className="text-xl font-bold text-foreground">계좌 개설 완료!</h2>
          {accountNo && (
            <p className="font-numeric text-sm text-muted-foreground">
              <span className="mr-1.5">계좌번호</span>
              <span className="font-semibold text-foreground">{accountNo}</span>
            </p>
          )}
          <p className="text-sm leading-relaxed text-muted-foreground">
            {kind === "FULL" ? (
              <>
                포켓스톡 CMA + 국내/해외주식 계좌가
                <br />
                개설되었어요
              </>
            ) : (
              "포켓스톡 CMA 계좌가 개설되었어요"
            )}
          </p>
        </div>
      </div>

      <div className="pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <Button
          onClick={onStart}
          className="h-12 w-full text-[15px] font-semibold"
        >
          시작하기
        </Button>
      </div>
    </div>
  );
}
