"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { InstitutionLogo } from "@/components/common/InstitutionLogo";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { AppHeader } from "@/components/common/AppHeader";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { PinKeypad } from "@/components/common/PinKeypad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCmaHome, isNoCmaAccount } from "@/hooks/queries/useCmaHome";
import {
  useAgreeTerms,
  useSetAccountPassword,
  useOpenAccount,
  useOpenCmaAccount,
} from "@/hooks/mutations/useAccountOpen";
import { formatPhone, isValidPhone } from "@/lib/utils/phone";
import { cn } from "@/lib/utils";
import type { AccountVerifyRequestResult } from "@/types/domain/account";

type Step = "TERMS" | "INFO" | "BANK" | "VERIFY" | "PASSWORD" | "DONE";
type AccountKind = "FULL" | "CMA";

const STEP_TITLE: Record<Step, string> = {
  TERMS: "약관 동의",
  INFO: "회원 정보 확인",
  BANK: "계좌 인증",
  VERIFY: "1원 송금 인증",
  PASSWORD: "계좌 비밀번호 설정",
  DONE: "계좌 개설 완료",
};

// 계좌 인증 단계에서 선택할 은행 (public/institution-logo/{code}.png)
const BANKS = [
  { code: "SHINHAN_BANK", name: "신한" },
  { code: "KB_BANK", name: "국민" },
  { code: "WOORI_BANK", name: "우리" },
  { code: "HANA_BANK", name: "하나" },
  { code: "NH_BANK", name: "농협" },
  { code: "IBK_BANK", name: "기업" },
  { code: "KAKAO_BANK", name: "카카오뱅크" },
  { code: "TOSS_BANK", name: "토스뱅크" },
  { code: "KBANK", name: "케이뱅크" },
  { code: "SC_BANK", name: "SC제일" },
  { code: "MG_BANK", name: "새마을" },
] as const;

const STEP_ORDER: Step[] = [
  "TERMS",
  "INFO",
  "BANK",
  "VERIFY",
  "PASSWORD",
  "DONE",
];

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

// 1원 송금 인증 목 데이터 — 실제 검증 없이 화면용으로만 생성한다.
const makeMockVerify = (): AccountVerifyRequestResult => {
  const code = String(Math.floor(Math.random() * 900) + 100); // 3자리
  return {
    verificationId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `mock-${Date.now()}`,
    depositorName: `포켓스톡${code}`,
    code,
    expiresIn: 180,
  };
};

export default function AccountOpenPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("TERMS");
  const [kind, setKind] = useState<AccountKind>("FULL");
  const [agreed, setAgreed] = useState<Set<number>>(new Set());
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bankCode, setBankCode] = useState<string | null>(null);
  const [accountInput, setAccountInput] = useState("");
  const [verify, setVerify] = useState<AccountVerifyRequestResult | null>(null);
  const [accounts, setAccounts] = useState<{ label: string; no: string }[]>([]);
  // 이 플로우에서 개설을 시작/완료했는지. true면 개설 직후 useCmaHome이 200으로 바뀌어도
  // "이미 보유 → /home" 가드가 발동하지 않게 한다. (#155)
  const [opened, setOpened] = useState(false);

  // CMA 계좌를 이미 보유한 회원에게는 계좌개설 페이지를 노출하지 않는다.
  const cmaQ = useCmaHome();
  useEffect(() => {
    if (cmaQ.isSuccess && !opened) router.replace("/home");
  }, [cmaQ.isSuccess, opened, router]);

  const agreeTerms = useAgreeTerms();
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
        <AppHeader
          variant="sub"
          title="계좌 개설"
          showMenu={false}
          showBack={false}
        />
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
        <div className="h-0.5 overflow-hidden bg-muted">
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
            bankCode={bankCode}
            setBankCode={setBankCode}
            accountInput={accountInput}
            setAccountInput={setAccountInput}
            onNext={() => {
              if (bankCode === null || accountInput.trim().length === 0) return;
              setVerify(makeMockVerify());
              setStep("VERIFY");
            }}
          />
        )}

        {step === "VERIFY" && verify && (
          <VerifyStep
            key={verify.verificationId}
            verify={verify}
            bank={{
              bankName: BANKS.find((b) => b.code === bankCode)?.name ?? "",
              accountName: accountInput,
            }}
            pending={false}
            resending={false}
            onResend={() => setVerify(makeMockVerify())}
            onConfirm={() => {
              toast.success("계좌 인증 완료");
              setStep("PASSWORD");
            }}
          />
        )}

        {step === "PASSWORD" && (
          <PasswordStep
            pending={setPw.isPending || openCma.isPending || openAcc.isPending}
            onDone={(pw) =>
              setPw.mutate(pw, {
                onSuccess: () =>
                  // 항상 CMA 개설 → FULL이면 증권(국내·해외)도 개설
                  openCma.mutate(undefined, {
                    onSuccess: (cma) => {
                      // CMA가 생긴 시점부터 /home 리다이렉트 가드를 끈다 (FULL은 증권개설이 더 남음)
                      setOpened(true);
                      const cmaRow = cma.cmaAccountNo
                        ? [{ label: "포켓스톡 CMA", no: cma.cmaAccountNo }]
                        : [];
                      if (kind === "CMA") {
                        setAccounts(cmaRow);
                        setStep("DONE");
                        return;
                      }
                      openAcc.mutate(SECURITIES_TYPES, {
                        onSuccess: (sec) => {
                          setAccounts([
                            ...cmaRow,
                            { label: "종합(국내·해외)", no: sec.accountNo },
                          ]);
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
            accounts={accounts}
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
            {
              value: "FULL",
              label: "CMA + 종합계좌",
              desc: "국내·해외 주식 + 포켓스톡 CMA",
            },
            // { value: "CMA", label: "CMA 계좌만", desc: "포켓스톡 CMA만 개설" },
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
          className="flex w-full items-center gap-2.5 rounded-xl bg-muted px-4 py-3 text-left"
        >
          <CheckCircle on={allOn} />
          <span className="text-sm font-semibold text-foreground">
            전체 동의
          </span>
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
        on ? "bg-primary text-primary-foreground" : "bg-white border",
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
          <span className="text-sm font-medium text-foreground">
            휴대폰번호
          </span>
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

// ── 3. 계좌 인증 (은행 선택 + 계좌번호 직접 입력) ───────────────────────────────
function BankStep({
  bankCode,
  setBankCode,
  accountInput,
  setAccountInput,
  onNext,
}: {
  bankCode: string | null;
  setBankCode: (code: string) => void;
  accountInput: string;
  setAccountInput: (v: string) => void;
  onNext: () => void;
}) {
  const ok = bankCode !== null && accountInput.trim().length > 0;
  return (
    <div className="pt-6">
      <p className="mb-5 text-sm text-muted-foreground">
        본인 명의 계좌로 1원을 보내 인증해요.
      </p>

      <section className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">은행 선택</p>
        <Select
          {...(bankCode ? { value: bankCode } : {})}
          onValueChange={(v) => setBankCode(v)}
        >
          <SelectTrigger className="h-12! w-full rounded-lg px-2.5 text-base md:text-sm">
            <SelectValue placeholder="은행을 선택해 주세요" />
          </SelectTrigger>
          <SelectContent>
            {BANKS.map((b) => (
              <SelectItem key={b.code} value={b.code} className="py-2.5">
                <InstitutionLogo
                  code={b.code}
                  name={b.name}
                  className="size-6 shrink-0"
                />
                <span className="text-sm font-medium text-foreground">
                  {b.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <label className="mt-5 block space-y-1.5">
        <span className="text-sm font-medium text-foreground">계좌번호</span>
        <Input
          value={accountInput}
          onChange={(e) =>
            setAccountInput(e.target.value.replace(/[^0-9-]/g, ""))
          }
          inputMode="numeric"
          placeholder="계좌번호 입력 (- 없이)"
          className="h-12"
        />
      </label>

      <BottomCta>
        <Button
          onClick={onNext}
          disabled={!ok}
          className="h-12 w-full text-[15px] font-semibold"
        >
          이 계좌로 인증하기
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
  bank: { bankName: string; accountName: string };
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
            포켓스톡에서 요청하신 입금 1원이 {bank ? `${bank.bankName} ` : ""}
            계좌로 입금되었어요.
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
                    if (ch && i < 2) slotRefs[i + 1]?.current?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !digits[i] && i > 0) {
                      slotRefs[i - 1]?.current?.focus();
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
      <PinKeypad
        value={pin}
        onChange={handleChange}
        length={4}
        disabled={pending}
        secure
      />
      {pending && (
        <p className="text-center text-sm text-muted-foreground">
          계좌 개설 중...
        </p>
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
  accounts,
  kind,
  onStart,
}: {
  accounts: { label: string; no: string }[];
  kind: AccountKind;
  onStart: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100svh-5rem)] flex-col px-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 pb-8 pt-10 text-center">
        <div className="ps-rise-in" style={{ "--i": 0 } as React.CSSProperties}>
          <PocketStockLogo />
        </div>
        <div
          className="ps-rise-in space-y-2"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          <h2 className="text-lg font-semibold text-foreground">계좌 개설 완료</h2>
          {accounts.length > 0 && (
            <div className="mx-auto w-full max-w-[280px] space-y-1.5 rounded-xl bg-muted px-6 py-4">
              {accounts.map((a) => (
                <div
                  key={a.no}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span className="shrink-0 text-muted-foreground">
                    {a.label}
                  </span>
                  <span className="font-numeric truncate font-semibold text-foreground">
                    {a.no}
                  </span>
                </div>
              ))}
            </div>
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
