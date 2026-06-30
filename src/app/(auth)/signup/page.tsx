"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { AppHeader } from "@/components/common/AppHeader";
import { PageContainer } from "@/components/common/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PinKeypad } from "@/components/common/PinKeypad";
import { PatternLock } from "@/components/features/auth/PatternLock";
import {
  useCheckUsername,
  useValidatePassword,
  useSendSms,
  useVerifySms,
  useCompleteSignup,
} from "@/hooks/mutations/useSignup";
import { cn } from "@/lib/utils";
import { formatPhone, PHONE_REGEX } from "@/lib/utils/phone";
import type { TermItem } from "@/types/domain/account";
import type { AuthMethodType } from "@/types/domain/auth";

type Step = "ACCOUNT" | "VERIFY" | "TERMS" | "SECURE" | "DONE";
const STEP_ORDER: Step[] = ["ACCOUNT", "VERIFY", "TERMS", "SECURE"];

const STEP_TITLE: Record<Step, string> = {
  ACCOUNT: "계정 정보 입력",
  VERIFY: "휴대폰 본인확인",
  TERMS: "약관 동의",
  SECURE: "간편 로그인 설정",
  DONE: "회원가입 완료",
};

const errMsg = (e: unknown) =>
  e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.";

interface Account {
  username: string;
  password: string;
}
interface Person {
  name: string;
  residentFront: string;
  residentBack: string;
  phone: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("ACCOUNT");
  const [account, setAccount] = useState<Account | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [terms, setTerms] = useState<TermItem[]>([]);
  const complete = useCompleteSignup();

  const back = () => {
    const prev = STEP_ORDER[STEP_ORDER.indexOf(step) - 1];
    if (prev) setStep(prev);
    else router.back();
  };

  const finalize = (authMethod: { type: AuthMethodType; value: string }) => {
    if (!account || !person || complete.isPending) return;
    complete.mutate(
      { account, person, terms, authMethod },
      {
        onSuccess: () => setStep("DONE"),
        onError: (e) => toast.error(errMsg(e)),
      },
    );
  };

  return (
    <PageContainer>
      <AppHeader
        variant="sub"
        title={STEP_TITLE[step]}
        showMenu={false}
        {...(step === "DONE" ? {} : { onBack: back })}
      />
      <div className="pb-2">
        {step !== "DONE" && (
          <Stepper
            current={STEP_ORDER.indexOf(step)}
            total={STEP_ORDER.length}
          />
        )}

        {step === "ACCOUNT" && (
          <AccountStep
            onNext={(acc) => {
              setAccount(acc);
              setStep("VERIFY");
            }}
          />
        )}

        {step === "VERIFY" && (
          <VerifyStep
            onNext={(p) => {
              setPerson(p);
              setStep("TERMS");
            }}
          />
        )}

        {step === "TERMS" && (
          <TermsStep
            onNext={(payload) => {
              setTerms(payload);
              setStep("SECURE");
            }}
          />
        )}

        {step === "SECURE" && (
          <SecureStep pending={complete.isPending} onComplete={finalize} />
        )}

        {step === "DONE" && (
          <DoneStep onStart={() => router.replace("/login")} />
        )}
      </div>
    </PageContainer>
  );
}

// ── 진행바 ─────────────────────────────────────────────────────────────────────
function Stepper({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 py-4">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors",
            i <= current ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

// ── 1. 계정 정보 ───────────────────────────────────────────────────────────────
const PW_RULES = [
  { key: "MIN_LENGTH", label: "8자 이상", test: (p: string) => p.length >= 8 },
  { key: "UPPERCASE", label: "대문자", test: (p: string) => /[A-Z]/.test(p) },
  { key: "LOWERCASE", label: "소문자", test: (p: string) => /[a-z]/.test(p) },
  { key: "DIGIT", label: "숫자", test: (p: string) => /\d/.test(p) },
  {
    key: "SPECIAL",
    label: "특수문자",
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
];

function AccountStep({ onNext }: { onNext: (acc: Account) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // 중복확인 결과: null=미확인, true=사용가능, false=중복, "error"=확인불가(백엔드 오류)
  const [available, setAvailable] = useState<boolean | "error" | null>(null);

  const check = useCheckUsername();
  const validate = useValidatePassword();

  const onCheck = () => {
    if (!username.trim() || check.isPending) return;
    check.mutate(username.trim(), {
      onSuccess: (res) => setAvailable(res.available),
      // 백엔드 check-username 장애 시에도 가입을 막지 않음(최종 signup에서 중복 검증)
      onError: () => setAvailable("error"),
    });
  };

  const passed = PW_RULES.filter((r) => r.test(password));
  const score = passed.length;
  const allPwOk = score === PW_RULES.length;
  const match = password.length > 0 && password === confirm;
  // 중복확인을 거친 경우에만 진행 — 미확인(null)·중복(false)은 차단, 확인불가("error")는 허용
  const canNext =
    username.trim().length > 0 &&
    allPwOk &&
    match &&
    (available === true || available === "error");

  const onSubmit = () => {
    if (!canNext || validate.isPending) return;
    // 서버 정책 검증으로 최종 확인
    validate.mutate(password, {
      onSuccess: (res) => {
        if (res.valid) onNext({ username: username.trim(), password });
        else {
          const labels = res.failedRules
            .map((k) => PW_RULES.find((r) => r.key === k)?.label ?? k)
            .join(", ");
          toast.error(`비밀번호 조건을 확인해 주세요: ${labels}`);
        }
      },
      onError: (e) => toast.error(errMsg(e)),
    });
  };

  return (
    <div className="space-y-6 pt-1">
      <p className="text-sm text-muted-foreground">
        아이디와 비밀번호를 설정해 주세요.
      </p>

      {/* 아이디 */}
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">아이디</span>
        <div className="flex gap-2">
          <Input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setAvailable(null);
            }}
            placeholder="아이디"
            aria-label="아이디"
            autoCapitalize="none"
            className="h-12"
          />
          <Button
            type="button"
            variant="outline"
            onClick={onCheck}
            disabled={!username.trim() || check.isPending}
            className="h-12 shrink-0"
          >
            중복확인
          </Button>
        </div>
        {available === true && (
          <p className="text-xs text-primary">사용 가능한 아이디예요.</p>
        )}
        {available === false && (
          <p className="text-xs text-destructive">이미 사용 중인 아이디예요.</p>
        )}
        {available === "error" && (
          <p className="text-xs text-muted-foreground">
            중복 확인을 일시적으로 사용할 수 없어요. 그대로 진행할 수 있어요.
          </p>
        )}
      </div>

      {/* 비밀번호 */}
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">비밀번호</span>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          aria-label="비밀번호"
          className="h-12"
        />
        {/* 조건 체크리스트 — 상단 진행바와 구분되는 형태 */}
        <ul className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
          {PW_RULES.map((r) => {
            const ok = r.test(password);
            return (
              <li
                key={r.key}
                className={cn(
                  "inline-flex items-center gap-1 text-xs transition-colors",
                  ok ? "font-medium text-primary" : "text-muted-foreground",
                )}
              >
                <Check
                  className={cn("size-3.5", ok ? "opacity-100" : "opacity-30")}
                />
                {r.label}
              </li>
            );
          })}
        </ul>
      </div>

      {/* 비밀번호 확인 */}
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">
          비밀번호 확인
        </span>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="비밀번호 확인"
          aria-label="비밀번호 확인"
          className="h-12"
        />
        {confirm.length > 0 && !match && (
          <p className="text-xs text-destructive">
            비밀번호가 일치하지 않아요.
          </p>
        )}
      </div>

      <Button
        onClick={onSubmit}
        disabled={!canNext || validate.isPending}
        className="h-12 w-full text-base font-bold"
      >
        다음 — 휴대폰 인증
      </Button>
    </div>
  );
}

// ── 2. 휴대폰 본인확인 (SMS) ───────────────────────────────────────────────────
const CARRIERS = [
  "SKT",
  "KT",
  "LGU+",
  "알뜰폰(SKT)",
  "알뜰폰(KT)",
  "알뜰폰(LG)",
];

// ── 입력 검증 (zod) ────────────────────────────────────────────────────────────
// 휴대폰 포맷(formatPhone)·정규식(PHONE_REGEX)은 공용 유틸 사용 — 계좌개설과 동일 규칙 공유.

/** 010으로 시작하는 휴대폰 11자리(숫자만) */
const phoneSchema = z
  .string()
  .regex(PHONE_REGEX, "010으로 시작하는 휴대폰 번호 11자리를 입력해 주세요.");

/** 주민번호 뒷 첫자리 — 내국인 1~4만 허용 */
const residentBackSchema = z
  .string()
  .regex(/^[1-4]$/, "뒷자리 첫 숫자는 1~4만 입력할 수 있어요.");

/**
 * 주민번호 앞 6자리(YYMMDD) 생년월일 유효성.
 * 달력상 실제 날짜인지는 zod 내장 규칙이 없어 refine으로 검사.
 * 세기는 뒷 첫자리로 판별(1·2→19xx, 3·4→20xx). 미입력 시 2000년대 가정(2월 윤일은 뒷자리 입력 후 확정).
 */
const residentFrontSchema = (backFirst?: string) =>
  z.string().refine((front) => {
    if (!/^\d{6}$/.test(front)) return false;
    const yy = Number(front.slice(0, 2));
    const mm = Number(front.slice(2, 4));
    const dd = Number(front.slice(4, 6));
    if (mm < 1 || mm > 12) return false;
    const century = backFirst === "1" || backFirst === "2" ? 1900 : 2000;
    const lastDay = new Date(century + yy, mm, 0).getDate(); // mm은 1-based → 해당 월 마지막 날
    return dd >= 1 && dd <= lastDay;
  }, "생년월일(앞 6자리)이 올바르지 않아요.");

function VerifyStep({ onNext }: { onNext: (p: Person) => void }) {
  const [name, setName] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [carrier, setCarrier] = useState("SKT");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [remain, setRemain] = useState(0);

  const send = useSendSms();
  const verify = useVerifySms();

  useEffect(() => {
    const t = setInterval(() => setRemain((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneCheck = phoneSchema.safeParse(phoneDigits);
  const backCheck = residentBackSchema.safeParse(back);
  const frontCheck = residentFrontSchema(back).safeParse(front);

  // 인라인 메시지 — 사용자가 해당 칸을 충분히 입력했을 때만 노출(입력 도중엔 침묵)
  const phoneError =
    phoneDigits.length > 0 && !phoneCheck.success
      ? phoneCheck.error.issues[0]?.message
      : null;
  const frontError =
    front.length === 6 && !frontCheck.success
      ? frontCheck.error.issues[0]?.message
      : null;
  const backError =
    back.length === 1 && !backCheck.success
      ? backCheck.error.issues[0]?.message
      : null;

  const infoOk =
    name.trim().length > 0 &&
    frontCheck.success &&
    backCheck.success &&
    phoneCheck.success;
  const expired = sent && remain <= 0;
  const mm = String(Math.floor(remain / 60)).padStart(2, "0");
  const ss = String(remain % 60).padStart(2, "0");

  const onSend = () => {
    if (!infoOk || send.isPending) return;
    send.mutate(phoneDigits, {
      onSuccess: (res) => {
        setSent(true);
        setCode("");
        setRemain(res.expiresIn);
        if (process.env.NODE_ENV === "development" && res.code)
          toast.message(`개발용 인증번호: ${res.code}`);
      },
      onError: (e) => toast.error(errMsg(e)),
    });
  };

  const onConfirm = () => {
    if (code.length !== 6 || verify.isPending) return;
    verify.mutate(
      { phone: phoneDigits, code },
      {
        onSuccess: (res) => {
          if (res.verified) {
            onNext({
              name: name.trim(),
              residentFront: front,
              residentBack: back,
              phone: phoneDigits,
            });
          } else {
            toast.error("인증번호가 일치하지 않아요.");
          }
        },
        onError: (e) => toast.error(errMsg(e)),
      },
    );
  };

  return (
    <div className="space-y-6 pt-1">
      <p className="text-sm text-muted-foreground">
        이름과 주민등록번호를 입력해 주세요.
      </p>

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">이름</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          className="h-12"
        />
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">
          주민등록번호
        </span>
        <div className="flex items-center gap-2">
          <Input
            value={front}
            onChange={(e) =>
              setFront(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            placeholder="앞 6자리"
            className="h-12 flex-1"
          />
          <span className="text-muted-foreground">—</span>
          <div className="flex flex-1 items-center gap-1.5">
            <Input
              value={back}
              onChange={(e) =>
                setBack(e.target.value.replace(/\D/g, "").slice(0, 1))
              }
              inputMode="numeric"
              placeholder="첫 자리"
              className="h-12 w-14 text-center"
            />
            <span className="text-lg tracking-widest text-muted-foreground">
              ●●●●●●
            </span>
          </div>
        </div>
        {frontError || backError ? (
          <p className="text-xs text-destructive">{frontError ?? backError}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            주민등록번호 뒷자리는 첫 숫자만 입력합니다.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">통신사</span>
        <div className="grid grid-cols-3 gap-2">
          {CARRIERS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={carrier === c}
              onClick={() => setCarrier(c)}
              className={cn(
                "rounded-lg border py-2.5 text-sm",
                carrier === c
                  ? "border-primary bg-primary/5 font-bold text-primary"
                  : "border-border text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">휴대폰 번호</span>
        <Input
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          inputMode="tel"
          placeholder="010-0000-0000"
          className="h-12"
        />
        {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
      </div>

      {!sent ? (
        <Button
          onClick={onSend}
          disabled={!infoOk || send.isPending}
          className="h-12 w-full text-base font-bold"
        >
          {send.isPending ? "전송 중..." : "인증 문자 받기"}
        </Button>
      ) : (
        <div className="space-y-2">
          <Input
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            placeholder="인증번호 6자리"
            className="h-12 text-center text-xl font-semibold tracking-[0.4em] placeholder:text-[14px] placeholder:text-gray-400"
          />
          <div className="flex justify-between text-xs">
            <span
              className={cn(
                expired ? "text-destructive" : "text-muted-foreground",
              )}
            >
              남은 시간 {mm}:{ss}
            </span>
            <button
              type="button"
              onClick={onSend}
              disabled={send.isPending}
              className="font-medium text-primary disabled:opacity-50"
            >
              {send.isPending ? "전송 중..." : "재요청"}
            </button>
          </div>
          <Button
            onClick={onConfirm}
            disabled={code.length !== 6 || expired || verify.isPending}
            className="h-12 w-full text-base font-bold"
          >
            {verify.isPending ? "확인 중..." : "확인"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── 3. 약관 동의 ───────────────────────────────────────────────────────────────
// 백엔드 termId는 1·2·3만 알려져 있어 그 3개만 저장한다.
// 마이데이터·마케팅(선택)은 backend termId 미확정 → UI 동의만 받고 저장은 보류(TODO).
const SIGNUP_TERMS: {
  key: string;
  termId: number | null;
  label: string;
  required: boolean;
}[] = [
  { key: "service", termId: 1, label: "서비스 이용약관", required: true },
  {
    key: "privacy",
    termId: 2,
    label: "개인정보 수집·이용 동의",
    required: true,
  },
  { key: "invest", termId: 3, label: "투자권유 동의", required: true },
  {
    key: "mydata",
    termId: null,
    label: "마이데이터 서비스 이용약관",
    required: false,
  },
  {
    key: "marketing",
    termId: null,
    label: "마케팅 활용 동의",
    required: false,
  },
];

function TermsStep({ onNext }: { onNext: (terms: TermItem[]) => void }) {
  const [agreed, setAgreed] = useState<Set<string>>(new Set());

  const allOn = SIGNUP_TERMS.every((t) => agreed.has(t.key));
  const requiredOk = SIGNUP_TERMS.filter((t) => t.required).every((t) =>
    agreed.has(t.key),
  );
  const toggle = (key: string) => {
    const next = new Set(agreed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setAgreed(next);
  };
  const toggleAll = () =>
    setAgreed(allOn ? new Set() : new Set(SIGNUP_TERMS.map((t) => t.key)));

  const onSubmit = () => {
    const payload: TermItem[] = SIGNUP_TERMS.filter(
      (t) => t.termId !== null,
    ).map((t) => ({ termId: t.termId as number, agreed: agreed.has(t.key) }));
    onNext(payload);
  };

  return (
    <div className="space-y-6 pt-1">
      <section className="space-y-1">
        <button
          type="button"
          aria-pressed={allOn}
          onClick={toggleAll}
          className="flex w-full items-center gap-2 rounded-xl bg-muted/60 px-4 py-3 text-left"
        >
          <CheckCircle on={allOn} />
          <span className="text-sm font-bold text-foreground">
            약관 전체 동의
          </span>
        </button>
        {SIGNUP_TERMS.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={agreed.has(t.key)}
            onClick={() => toggle(t.key)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
          >
            <CheckCircle on={agreed.has(t.key)} />
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
        onClick={onSubmit}
        disabled={!requiredOk}
        className="h-12 w-full text-base font-bold"
      >
        확인
      </Button>
    </div>
  );
}

function CheckCircle({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full",
        on
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      <Check className="size-3.5" />
    </span>
  );
}

// ── 4. 간편 로그인 설정 (PIN 또는 패턴, 필수) ──────────────────────────────────
function SecureStep({
  pending,
  onComplete,
}: {
  pending: boolean;
  onComplete: (m: { type: AuthMethodType; value: string }) => void;
}) {
  const [method, setMethod] = useState<AuthMethodType | null>(null);
  const [phase, setPhase] = useState<"SET" | "CONFIRM">("SET");
  const [first, setFirst] = useState("");
  // 입력 위젯 강제 리셋용 nonce (약한 PIN 거부 시 같은 phase에서 비우기)
  const [nonce, setNonce] = useState(0);

  const reset = () => {
    setPhase("SET");
    setFirst("");
    setNonce((n) => n + 1);
  };

  const handleValue = (value: string) => {
    if (phase === "SET") {
      // 백엔드 PIN 정책 선반영: 동일 숫자·연속(오름/내림) 거부 → 마지막 단계 대신 즉시 안내
      if (method === "PIN" && isWeakPin(value)) {
        toast.error("연속되거나 동일한 숫자는 사용할 수 없어요.");
        setNonce((n) => n + 1);
        return;
      }
      setFirst(value);
      setPhase("CONFIRM");
    } else if (value === first) {
      onComplete({ type: method as AuthMethodType, value });
    } else {
      toast.error("입력이 일치하지 않아요. 다시 설정해 주세요.");
      reset();
    }
  };

  if (method === null) {
    return (
      <div className="space-y-4 pt-6">
        <p className="text-center text-sm text-muted-foreground">
          간편 로그인 수단을 선택해 주세요.
        </p>
        <button
          type="button"
          onClick={() => setMethod("PIN")}
          className="flex w-full flex-col items-start gap-1 rounded-xl border border-border px-4 py-4 text-left"
        >
          <span className="text-base font-bold text-foreground">PIN 번호</span>
          <span className="text-xs text-muted-foreground">
            숫자 6자리로 빠르게 로그인
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMethod("PATTERN")}
          className="flex w-full flex-col items-start gap-1 rounded-xl border border-border px-4 py-4 text-left"
        >
          <span className="text-base font-bold text-foreground">패턴</span>
          <span className="text-xs text-muted-foreground">
            점 4개 이상을 이어 로그인
          </span>
        </button>
      </div>
    );
  }

  const title =
    phase === "SET"
      ? method === "PIN"
        ? "PIN 번호를 설정해 주세요"
        : "패턴을 그려 주세요"
      : "한 번 더 입력해 주세요";

  return (
    <div className="space-y-10 pt-6">
      <p className="text-center text-base font-bold text-foreground">{title}</p>

      {method === "PIN" ? (
        <PinKeypadField
          key={`pin-${phase}-${nonce}`}
          onSubmit={handleValue}
          disabled={pending}
        />
      ) : (
        <PatternLock
          key={`pattern-${phase}-${nonce}`}
          onComplete={handleValue}
          minLength={4}
          disabled={pending}
        />
      )}

      {pending && (
        <p className="text-center text-sm text-muted-foreground">처리 중...</p>
      )}
      {!pending && (
        <button
          type="button"
          onClick={() => {
            setMethod(null);
            reset();
          }}
          className="mx-auto block text-sm text-muted-foreground underline"
        >
          다른 방법 선택
        </button>
      )}
    </div>
  );
}

/** PIN 6자리 입력 — 부모가 key(phase·nonce)로 리마운트하여 단계 전환/거부 시 초기화한다. */
function PinKeypadField({
  onSubmit,
  disabled,
}: {
  onSubmit: (v: string) => void;
  disabled: boolean;
}) {
  const [pin, setPin] = useState("");

  const handleChange = (v: string) => {
    setPin(v);
    if (v.length === 6) onSubmit(v);
  };

  return (
    <PinKeypad
      value={pin}
      onChange={handleChange}
      length={6}
      disabled={disabled}
    />
  );
}

/** 약한 PIN(6자리 동일 숫자 / 오름·내림 연속) 여부 — 백엔드 정책 선반영 */
function isWeakPin(pin: string) {
  if (new Set(pin).size === 1) return true;
  const d = pin.split("").map(Number);
  let asc = true;
  let desc = true;
  for (let i = 1; i < d.length; i++) {
    const prev = d[i - 1];
    const cur = d[i];
    if (prev === undefined || cur === undefined) continue;
    if (cur !== prev + 1) asc = false;
    if (cur !== prev - 1) desc = false;
  }
  return asc || desc;
}

// ── 완료 ───────────────────────────────────────────────────────────────────────
function DoneStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 pt-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-8" />
      </span>
      <h2 className="text-xl font-bold text-foreground">회원가입 완료!</h2>
      <p className="text-sm text-muted-foreground">
        포켓스톡에 오신 것을 환영해요. 로그인하고 시작해 보세요.
      </p>
      <Button
        onClick={onStart}
        className="mt-6 h-12 w-full text-base font-bold"
      >
        로그인하러 가기
      </Button>
    </div>
  );
}
