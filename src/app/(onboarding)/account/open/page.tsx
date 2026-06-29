"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Landmark } from "lucide-react";
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
  // step!=="DONE" 만으론 FULL 계좌의 CMA개설~증권개설 사이 구간(step=PASSWORD)을 못 막는다.
  const [opened, setOpened] = useState(false);

  // CMA 계좌를 이미 보유한 회원에게는 계좌개설 페이지를 노출하지 않는다.
  // /api/cma/home 200(isSuccess)=보유 → 홈으로 돌려보냄.
  // 단, 이 플로우에서 개설을 시작했으면(opened) 제외 — 개설 직후 useCmaHome이 무효화→200이
  // 되며 이 가드가 발동하면 완료화면→자산연동(/asset-link) 진행을 가로챈다. (#155)
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

  // CMA 미개설(404)이 확정된 회원에게만 계좌개설 UI를 노출한다.
  // 보유(200)는 위 effect가 /home으로 보내고, 로딩·비-404 에러 상태는
  // 잘못된 노출을 막기 위해 스플래시로 가린다.
  // 단, 개설을 시작했으면(opened) 통과시킨다 — 개설 직후 200으로 바뀌어도 완료 화면을
  // 유지해 자산연동으로 진행할 수 있게 한다. (#155)
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

  return (
    <>
      <AppHeader
        variant="sub"
        title={STEP_TITLE[step]}
        showMenu={false}
        {...(step === "DONE" ? { showBack: false } : { onBack: back })}
      />
      <div className="pb-6">
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
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm text-muted-foreground">계좌 종류</p>
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
              "flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left",
              kind === o.value
                ? "border-primary bg-primary/5"
                : "border-border",
            )}
          >
            <span>
              <span className="block text-sm font-bold text-foreground">
                {o.label}
              </span>
              <span className="block text-xs text-muted-foreground">
                {o.desc}
              </span>
            </span>
            {kind === o.value && <Check className="size-5 text-primary" />}
          </button>
        ))}
      </section>

      <section className="space-y-1">
        <button
          type="button"
          onClick={toggleAll}
          className="flex w-full items-center gap-2 rounded-xl bg-muted/60 px-4 py-3 text-left"
        >
          <CheckCircle on={allOn} />
          <span className="text-sm font-bold text-foreground">전체 동의</span>
        </button>
        {TERMS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
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

      <Button
        onClick={onNext}
        disabled={!requiredOk || pending}
        className="h-12 w-full text-base font-bold"
      >
        다음
      </Button>
    </div>
  );
}

function CheckCircle({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full",
        on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      <Check className="size-3.5" />
    </span>
  );
}

// ── 2. 회원 정보 확인 (단순 입력) ──────────────────────────────────────────────
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
    <div className="space-y-6 pt-2">
      <p className="text-sm text-muted-foreground">
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
      <Button onClick={onNext} disabled={!ok} className="h-12 w-full text-base font-bold">
        다음
      </Button>
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
  if (query.isLoading) return <SkeletonCard lines={4} className="mt-2 h-44" />;
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
    <div className="space-y-4 pt-2">
      <p className="text-sm text-muted-foreground">
        본인 명의 계좌로 1원을 보내 인증해요.
      </p>
      <div className="space-y-2">
        {accounts.map((a: BankAccount) => (
          <button
            key={a.accountId}
            type="button"
            onClick={() => setSelectedId(a.accountId)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left",
              selectedId === a.accountId
                ? "border-primary bg-primary/5"
                : "border-border",
            )}
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-muted">
              <Landmark className="size-4 text-muted-foreground" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-foreground">
                {a.bankName} · {a.accountName}
              </span>
              <span className="block text-xs text-muted-foreground">
                {formatKRW(a.balance)}
              </span>
            </span>
            {selectedId === a.accountId && (
              <Check className="size-5 text-primary" />
            )}
          </button>
        ))}
      </div>
      <Button
        onClick={onNext}
        disabled={selectedId === null || pending}
        className="h-12 w-full text-base font-bold"
      >
        {pending ? "1원 보내는 중..." : "이 계좌로 인증하기"}
      </Button>
    </div>
  );
}

// ── 4. 1원 송금 인증 (토스/뱅샐 스타일) ────────────────────────────────────────
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
  const [code, setCode] = useState("");
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
    <div className="space-y-6 pt-2">
      <div>
        <h2 className="text-xl font-bold text-foreground">1원을 보냈어요</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {bank ? `${bank.bankName} ${bank.accountName}에 ` : ""}1원을 입금했어요.
          <br />
          입금자명에 표시된 <span className="font-bold text-foreground">3자리 숫자</span>를 입력해 주세요.
        </p>
      </div>

      <div className="rounded-xl bg-muted/60 p-4 text-center">
        <p className="text-xs text-muted-foreground">입금자명 예시</p>
        <p className="mt-0.5 font-bold text-foreground">{verify.depositorName}</p>
      </div>

      <div className="space-y-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
          inputMode="numeric"
          placeholder="3자리 숫자"
          className="h-12 text-center text-2xl font-bold tracking-[0.5em]"
        />
        <div className="flex justify-between text-xs">
          <span className={cn(expired ? "text-destructive" : "text-muted-foreground")}>
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

      <Button
        onClick={() => onConfirm(code)}
        disabled={code.length !== 3 || expired || pending}
        className="h-12 w-full text-base font-bold"
      >
        {pending ? "확인 중..." : "확인"}
      </Button>
    </div>
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
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Check className="size-10" />
        </span>
        <h2 className="mt-5 text-2xl font-bold text-foreground">계좌 개설 완료!</h2>
        <p className="mt-2 text-base font-medium leading-relaxed text-muted-foreground">
          {kind === "FULL" ? (
            <>
              신한 CMA + 국내/해외주식 계좌가
              <br />
              개설되었습니다
            </>
          ) : (
            "신한 CMA 계좌가 개설되었습니다"
          )}
        </p>
        {accountNo && (
          <div className="mt-6 w-full rounded-xl bg-brand-surface py-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">계좌번호</p>
            <p className="mt-1.5 font-numeric text-lg font-bold text-primary">
              {accountNo}
            </p>
          </div>
        )}
      </div>
      <Button onClick={onStart} className="h-12 w-full text-base font-bold">
        시작하기
      </Button>
    </div>
  );
}
