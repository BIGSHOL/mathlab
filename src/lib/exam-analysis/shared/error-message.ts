/**
 * 실패 사유 → **사용자에게 보여줄 문구**로 정제.
 *
 * CLAUDE.md 핵심규칙 #0 / #0-1: 사용자 UI에 모델명·벤더명·인프라 사정(환경변수, API 키,
 * CLI 플래그, 스택트레이스, 파일 경로, HTTP 상태코드)을 노출하지 않는다.
 *
 * 실제 유출 사례(2026-08): 시험지 분석 실패 토스트에
 *   `AI 실행기가 종료되었습니다 (code 1) Error: When using --print, --output-format=stream-json requires --verbose`
 * 가 그대로 떴다. UI 쪽에서 모델명만 치환(`replace(/gemini|claude/gi,'AI')`)했기 때문에
 * 환경변수명·CLI 플래그·영문 예외는 전부 통과했다.
 *
 * ## 방침 — 화이트리스트(통과 조건을 만족한 것만 원문 유지)
 * 우리가 **한국어로 직접 던진 메시지**만 통과시키고, 나머지 기술 문자열은 원인 범주별
 * 한국어 문구로 치환한다. 원문은 호출부에서 `console` 로 남기므로 디버깅 정보는 잃지 않는다.
 *
 * 블랙리스트(금지어만 가리기)로 하지 않은 이유: 새 실행기·새 SDK가 붙을 때마다 금지어를
 * 추가해야 하고, 한 번 빠뜨리면 그대로 샌다. 위 유출도 정확히 그 방식이라 발생했다.
 *
 * 회귀 검사: `npx tsx scripts/parity/check-error-message.ts`
 */

/** 벤더·스택 식별자 — 하나라도 있으면 원문 노출 금지 */
const VENDOR_RE =
  /gemini|claude|anthropic|openai|chatgpt|gpt-|grok|codex|supabase|vercel|prisma|sql|redis|lemon\s*squeezy|stripe|kakao|neis|cloudflare/i;

/**
 * 내부 구현 흔적 — 환경변수·키·CLI 플래그·경로·스택·에러코드.
 * (정규식 리터럴로 둔다. `new RegExp('...')` 는 이스케이프가 한 겹 더 필요해 실수하기 쉽다.)
 */
const INTERNAL_RE =
  /환경\s*변수|api[\s_-]?key|apikey|secret|credential|bearer|unauthorized|forbidden|--[a-z][a-z0-9-]{2,}|\bE[A-Z]{3,}\b|\bat\s+\w[\w.]*\s*\(|https?:\/\/|[A-Za-z]:\\|\/(?:src|lib|app|node_modules)\/|\.[jt]sx?\b|process\.env|undefined is not|is not a function|\bcode\s*[:=]?\s*\d|\bstatus\s*[:=]?\s*\d{3}|\b[45]\d{2}\b|\bError\b|\bException\b|\bstack\b|\btrace\b/i;

/** 원인 범주 → 사용자 문구. 위에서부터 먼저 맞는 것을 쓴다. */
const CATEGORIES: Array<{ re: RegExp; msg: string }> = [
  {
    re: /quota|rate.?limit|resource.?exhausted|too many requests|\b429\b/i,
    msg: '분석 요청이 몰려 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  },
  {
    re: /api[\s_-]?key|apikey|환경\s*변수|credential|unauthorized|forbidden|\b401\b|\b403\b|not logged in|login/i,
    msg: 'AI 분석 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  },
  {
    re: /timeout|timed.?out|deadline|ETIMEDOUT|ECONNRESET|ECONNREFUSED|abort/i,
    msg: '분석 시간이 초과되었습니다. 다시 시도해 주세요.',
  },
  {
    // 실행기 구성/기동 실패 — CLI 플래그, 종료 코드, spawn 실패.
    // JSON 범주보다 **앞**에 둔다: 실제 유출 사례가 `--output-format=stream-json` 이라
    // 뒤에 두면 "결과를 읽지 못했습니다"로 잘못 안내된다(원인은 실행기 구성).
    re: /--[a-z][a-z0-9-]{2,}|exit code|\bcode\s*\d|spawn|command not found/i,
    msg: 'AI 분석 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  },
  {
    re: /json|parse|unexpected token|schema|스키마/i,
    msg: '분석 결과를 읽지 못했습니다. 다시 시도해 주세요.',
  },
  {
    re: /download|fetch|storage|bucket|ENOENT|no such file|파일|이미지/i,
    msg: '시험지 파일을 불러오지 못했습니다. 파일을 다시 업로드해 주세요.',
  },
];

const GENERIC = '시험지 분석에 실패했습니다. 다시 시도해도 같으면 문의해 주세요.';

/** 한글이 한 글자라도 있는가 — 우리가 작성한 안내 문구인지 판별하는 1차 조건 */
const HANGUL_RE = /[가-힣]/;

/**
 * 사용자에게 보여줄 실패 문구를 만든다.
 *
 * @param raw     원본 에러 메시지(`Error.message` 등)
 * @param generic 범주에 걸리지 않았을 때 쓸 기본 문구 (기능별로 다르게 줄 수 있음)
 */
export function toUserFacingError(raw: unknown, generic: string = GENERIC): string {
  const text = raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : '';
  const msg = text.trim();
  if (!msg) return generic;

  // ① 우리가 한국어로 던진 안내 문구는 그대로 — 단, 벤더·내부 흔적이 없어야 한다.
  //    (예: '시험지 파일이 없습니다', '분석된 문항이 없습니다')
  if (HANGUL_RE.test(msg) && !VENDOR_RE.test(msg) && !INTERNAL_RE.test(msg)) return msg;

  // ② 원인을 특정할 수 있으면 그 범주의 문구로 — 사용자가 할 일을 알 수 있게.
  for (const { re, msg: friendly } of CATEGORIES) {
    if (re.test(msg)) return friendly;
  }

  // ③ 정체불명의 기술 문자열은 통째로 감춘다.
  return generic;
}
