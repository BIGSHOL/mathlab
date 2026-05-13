/**
 * 기출 분석 블로그 글 — Anti-pattern 정의 + 사후 검출
 *
 * 1) buildAntiPatternsRules() — 프롬프트에 명시적 금지 규칙 주입
 * 2) checkAntiPatterns(content) — 생성된 글에서 위반 정규식 검출 → 사용자 경고
 *
 * "AI 일반론 / 가짜 경험 / 반복 강조어 / 무명 CTA"가 발생하는 근본 원인은
 * 기존 프롬프트가 "현장감 부여" 명목으로 가짜 경험을 *권장*하던 자기모순.
 * 이 모듈은 그것을 금지하고 검증하는 단일 진실 원천.
 */

// ── 패턴 정의 ──

/** 가짜 경험 표현 (AI가 흉내내는 1인칭 경험) */
const FAKE_EXPERIENCE_PATTERNS = [
  /매년\s*이맘때\s*아이들이?/,
  /상담에서\s*자주\s*듣는\s*질문/,
  /시험지를\s*처음\s*받아보고/,
  /수백\s*번\s*봐온/,
  /제가\s*직접\s*분석/,
  /현장에서\s*아이들을\s*가르치/,
  /십수\s*년\s*경력에서/,
];

/** 어느 시험에든 통할 추상 멘트 (구체성 0) */
const ABSTRACT_CLICHE_PATTERNS = [
  /공식을?\s*외[웠우][다는]?\s*것이?\s*아니라/,
  /낯선\s*상황에\s*꺼내\s*[쓸써]/,
  /균형\s*잡힌\s*시험/,
  /체계적인?\s*학습이?\s*필요/,
  /수학적\s*사고력을?\s*길러/,
  /개념과\s*응용의\s*연결고리/,
  /기본기[가는]\s*가장\s*중요/,
];

/** 반복 강조어 — 한 글에 각 1~2회까지만 허용 */
const REDUNDANT_EMPHASIS_LIMITS: Array<{ pattern: RegExp; label: string; maxCount: number }> = [
  { pattern: /달리\s*말[하해]면/g, label: '"달리 말하면"', maxCount: 1 },
  { pattern: /라는\s*점을\s*먼저\s*인식/g, label: '"~라는 점을 먼저 인식"', maxCount: 1 },
  { pattern: /무엇보다도?/g, label: '"무엇보다"', maxCount: 1 },
  { pattern: /눈여겨볼\s*대목/g, label: '"눈여겨볼 대목"', maxCount: 2 },
  { pattern: /(?<![가-힣])핵심은(?![가-힣])/g, label: '"핵심은"', maxCount: 3 },
  { pattern: /결국[은,\s]/g, label: '"결국"', maxCount: 2 },
];

/** 무명 CTA — 학원/강사 변수 없는 일반 멘트 */
const GENERIC_CTA_PATTERNS = [
  /언제든\s*문의\s*주시기?\s*바랍니다/,
  /저희\s*학원에서\s*[는는]?\s*\w*\s*수업을?\s*진행/,
];

// ── 사후 검출 ──

export interface AntiPatternWarning {
  type: 'fake_experience' | 'abstract_cliche' | 'redundant_emphasis' | 'generic_cta';
  label: string;
  occurrences: number;
  excerpt: string;
}

/**
 * 생성된 본문에서 anti-pattern 위반 검출.
 * 위반은 차단하지 않고 경고만 — 사용자가 편집기에서 수정 가능.
 */
export function checkAntiPatterns(content: string): AntiPatternWarning[] {
  if (!content || typeof content !== 'string') return [];
  const warnings: AntiPatternWarning[] = [];

  // 가짜 경험
  for (const pat of FAKE_EXPERIENCE_PATTERNS) {
    const match = content.match(new RegExp(pat.source, 'g'));
    if (match && match.length > 0) {
      warnings.push({
        type: 'fake_experience',
        label: `가짜 경험 표현 (${pat.source.replace(/\\s\*/g, ' ').replace(/[\\?]/g, '')})`,
        occurrences: match.length,
        excerpt: extractExcerpt(content, pat),
      });
    }
  }

  // 추상 클리셰
  for (const pat of ABSTRACT_CLICHE_PATTERNS) {
    const match = content.match(new RegExp(pat.source, 'g'));
    if (match && match.length > 0) {
      warnings.push({
        type: 'abstract_cliche',
        label: `AI 일반론 클리셰 (${pat.source.replace(/\\s\*/g, ' ').replace(/[\\?\[\]]/g, '')})`,
        occurrences: match.length,
        excerpt: extractExcerpt(content, pat),
      });
    }
  }

  // 반복 강조어
  for (const { pattern, label, maxCount } of REDUNDANT_EMPHASIS_LIMITS) {
    const matches = content.match(pattern);
    if (matches && matches.length > maxCount) {
      warnings.push({
        type: 'redundant_emphasis',
        label: `${label} 반복 (허용 ${maxCount}회)`,
        occurrences: matches.length,
        excerpt: extractExcerpt(content, pattern),
      });
    }
  }

  // 무명 CTA
  for (const pat of GENERIC_CTA_PATTERNS) {
    const match = content.match(new RegExp(pat.source, 'g'));
    if (match && match.length > 0) {
      warnings.push({
        type: 'generic_cta',
        label: '무특색 CTA (학원/강사 정보 없는 일반 멘트)',
        occurrences: match.length,
        excerpt: extractExcerpt(content, pat),
      });
    }
  }

  return warnings;
}

function extractExcerpt(content: string, pattern: RegExp): string {
  const m = content.match(pattern);
  if (!m || m.index == null) return '';
  const start = Math.max(0, (m.index || 0) - 15);
  const end = Math.min(content.length, (m.index || 0) + m[0].length + 25);
  const raw = content.slice(start, end).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
  return raw.trim();
}

// ── 프롬프트 규칙 빌더 ──

export function buildAntiPatternsRules(): string {
  return `### Anti-pattern 절대 금지 규칙 (이 규칙을 어기면 글이 실패로 간주됨)

**1. 가짜 경험 표현 절대 금지** — AI는 매년 본 적도, 상담한 적도 없습니다. 다음 표현 일체 사용 금지:
- ✗ "매년 이맘때 아이들이 가장 많이 헤매는…"
- ✗ "상담에서 자주 듣는 질문 중 하나가…"
- ✗ "시험지를 처음 받아보고 눈에 띈 점이…"
- ✗ "수백 번 봐온…", "제가 직접 분석한…"
- ✓ 대신: 데이터 자체가 말해주는 것을 분석가 어조로 제시 ("난이도 분포를 살펴보면…", "이 구성은 …을 시사한다")

**2. 어느 시험에든 통할 추상 멘트 절대 금지** — 어느 학교 어느 시험에도 그대로 통할 일반론을 쓰지 마세요. 침산중에만 해당하는 구체성을 가지세요:
- ✗ "공식을 외운 것이 아니라 낯선 상황에서 꺼내 쓸 수 있는지를 묻고 있다"
- ✗ "균형 잡힌 시험이다 / 체계적 학습이 필요하다 / 수학적 사고력을 길러야"
- ✓ 대신: 이 시험의 구체적 단원·문항·배점을 근거로 한 정성 평가

**3. 반복 강조어 1회 제한** — 같은 강조 표현은 한 글에 1~2회까지:
- ✗ "달리 말하면 / 달리 말해" — 한 글에 1회만
- ✗ "...라는 점을 먼저 인식해야 합니다" — 한 글에 1회만
- ✗ "결국 / 핵심은 / 무엇보다" — 한 글에 각 1~2회만

**4. 수치 본문 3중 반복 금지** — 차트로 보이는 수치(난이도 분포, 단원별 배점)는 본문에서 1회만 인용하고 나머지는 정성 표현으로:
- ✗ "Level 4 심화 7문항"이 본문·차트·등급 전략·요약에 4회 등장
- ✓ 차트 캡션에 "▲ ..." 텍스트 추가 금지 — {{CHART:*}} 토큰만 정확히 사용

**5. 무명 CTA 절대 금지** — 학원/강사 변수가 비어있으면 차라리 단순 마무리. 무특색 "문의 주시기 바랍니다"는 무가치:
- ✗ "이번 기출에서 드러난 출제 경향과 단원별 맞춤 전략이 더 궁금하시다면 언제든 문의 주시기 바랍니다."
- ✓ 학원명 있으면: "○○수학에서는 이번 ${'{{SCHOOL}}'} 기출을 단원별 약점 진단으로 활용하고 있습니다."
- ✓ 학원명 없으면: 분석을 정리하는 한 줄 마무리로 종결 (CTA 강제하지 말 것)

**6. 섹션 목차 표현 금지** — 본문에 "1. 시험 개요 2. 난이도 분석…" 같은 정형 목차 흔적 일체 금지. 자연스러운 H2 제목만 사용.

**7. AI가 작성했음을 암시 절대 금지** — "AI 분석", "자동 생성", "Powered by" 등 일체 사용 금지. 학원 원장이 직접 쓴 분석 칼럼처럼 보여야 함.`;
}
