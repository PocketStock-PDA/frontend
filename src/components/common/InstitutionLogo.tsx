import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface InstitutionLogoProps {
  /** 기관 코드 (예: "SHINHAN_BANK") — public/institution-logo/{code}.png 정적 에셋 키 */
  code?: string | null | undefined;
  /** 백엔드가 내려준 로고 URL. 있으면 정적 에셋보다 우선. */
  logoUrl?: string | null | undefined;
  /** 기관/계좌명 — 로고가 없을 때 첫 글자 fallback에 사용. */
  name?: string | null | undefined;
  /** Avatar 크기 클래스 (기본 size-9). */
  className?: string | undefined;
}

/**
 * 기관(은행·카드·증권) 로고. 우선순위: logoUrl → /institution-logo/{code}.png → 첫 글자.
 * 로고가 워드마크 포함 앱아이콘형이라 원형 크롭 시 글자가 잘려 rounded-xl 사각으로 표시한다.
 * (asset-link의 InstitutionTile 패턴을 공통화)
 */
export function InstitutionLogo({
  code,
  logoUrl,
  name,
  className,
}: InstitutionLogoProps) {
  // 빈 문자열 logoUrl은 미지정으로 보고 code 기반 정적 에셋으로 폴백한다.
  const src = logoUrl || (code ? `/institution-logo/${code}.png` : undefined);
  const initial = name?.trim().charAt(0).toUpperCase() ?? "";

  return (
    <Avatar className={cn("size-9 rounded-xl after:rounded-xl", className)}>
      {src && <AvatarImage src={src} alt="" className="rounded-xl object-contain" />}
      <AvatarFallback className="rounded-xl bg-muted text-sm font-bold text-muted-foreground">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
