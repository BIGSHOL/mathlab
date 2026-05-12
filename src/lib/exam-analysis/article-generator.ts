/**
 * 기출 분석 블로그 글 AI 생성기
 *
 * 기출 분석 데이터 + AI 총평을 바탕으로
 * 네이버 블로그에 최적화된 전문가 수준의 기출 분석 글을 자동 생성
 *
 * AI 모델: Claude Sonnet 4.6 (commentary-agent와 동일)
 * SEO: NaverSEO Pro의 C-Rank/D.I.A. 규칙 적용
 */

import Anthropic from '@anthropic-ai/sdk';
import katex from 'katex';
import type { AnalyzedQuestion } from './types';
import type { CommentaryResult } from './agents/commentary-agent';
import { QUESTION_TYPE_LABELS } from './constants';
import { normalizeMathText } from '@/lib/pdf-extract-engine/ai/post-processor';

// ── 영문 enum 차단 (UI normalizeKoreanLabels 와 동일) ──
const ARTICLE_ENUM_KO_MAP: Record<string, string> = {
  CALCULATION: '계산력',
  UNDERSTANDING: '이해력',
  PROBLEM_SOLVING: '문제해결력',
  'PROBLEM SOLVING': '문제해결력',
  REASONING: '추론력',
  NUMBER: '수와 연산',
  ALGEBRA: '문자와 식',
  FUNCTION: '함수',
  GEOMETRY: '기하',
  STATISTICS: '확률과 통계',
};

function stripEnglishEnums(text: string): string {
  if (!text) return text;
  let out = text;
  for (const [k, v] of Object.entries(ARTICLE_ENUM_KO_MAP)) {
    const re = new RegExp(`\\b${k.replace(/ /g, '[ _]')}\\b`, 'g');
    out = out.replace(re, v);
  }
  return out;
}

// ── LaTeX → 표시 가능한 형태로 변환 (블로그 컨텍스트 안전망) ──
/**
 * AI 가 프롬프트 무시하고 \$...\$ LaTeX 를 출력했을 경우 안전망.
 *
 * - 간단한 패턴(\\sqrt, \\frac, ^N, _N)은 유니코드/평문으로 변환 (네이버 호환)
 * - 변환 실패 시 KaTeX HTML 로 렌더링 (TipTap 프리뷰/MathLab UI 에서는 보임)
 *   네이버 게시 시 CSS 가 없어 깨질 수 있으나, 적어도 raw "\$\\sqrt..." 보다는 낫다
 *
 * 호출 순서:
 *   1. simplifyLatexToPlain — 간단 패턴 유니코드 치환 (네이버 안전)
 *   2. renderRemainingLatexToKatex — 남은 \$...\$ 만 KaTeX HTML 로 (UI 표시용 최후 보루)
 */

const SUPER_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵',
  '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '=': '⁼', 'n': 'ⁿ',
};
const SUB_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅',
  '6': '₆', '7': '₇', '8': '₈', '9': '₉', 'n': 'ₙ', 'k': 'ₖ', 'i': 'ᵢ', 'j': 'ⱼ',
};

function toSuperscript(s: string): string | null {
  let out = '';
  for (const ch of s) {
    if (SUPER_MAP[ch] != null) out += SUPER_MAP[ch];
    else return null; // 변환 불가능 문자 포함 시 폴백
  }
  return out;
}

function toSubscript(s: string): string | null {
  let out = '';
  for (const ch of s) {
    if (SUB_MAP[ch] != null) out += SUB_MAP[ch];
    else return null;
  }
  return out;
}

/** 단순한 LaTeX 토큰을 유니코드/평문으로 변환 — 변환 실패하면 원문 반환 */
function simplifyLatexInline(tex: string): string {
  let s = tex;
  // \sqrt{X} → √(X)
  s = s.replace(/\\sqrt\s*\{([^{}]+)\}/g, '√($1)');
  // \frac{a}{b} → a/b
  s = s.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1/$2');
  // \dfrac{a}{b} → a/b
  s = s.replace(/\\dfrac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1/$2');
  // \le → ≤, \ge → ≥, \ne → ≠
  s = s.replace(/\\le\b/g, '≤').replace(/\\ge\b/g, '≥').replace(/\\ne\b/g, '≠');
  // \times → ×, \cdot → ·, \div → ÷
  s = s.replace(/\\times\b/g, '×').replace(/\\cdot\b/g, '·').replace(/\\div\b/g, '÷');
  // \pi → π, \theta → θ, \sigma → σ, \alpha → α, \beta → β
  s = s.replace(/\\pi\b/g, 'π').replace(/\\theta\b/g, 'θ').replace(/\\sigma\b/g, 'σ')
       .replace(/\\alpha\b/g, 'α').replace(/\\beta\b/g, 'β').replace(/\\gamma\b/g, 'γ');
  // ^N (한 자리) → 유니코드 superscript
  s = s.replace(/\^\{([^{}]+)\}/g, (_, exp) => toSuperscript(exp) ?? `^${exp}`);
  s = s.replace(/\^([0-9+\-=n])/g, (_, exp) => toSuperscript(exp) ?? `^${exp}`);
  // _N → 유니코드 subscript
  s = s.replace(/_\{([^{}]+)\}/g, (_, sub) => toSubscript(sub) ?? `_${sub}`);
  s = s.replace(/_([0-9nkij])/g, (_, sub) => toSubscript(sub) ?? `_${sub}`);
  // 빈 중괄호 / 단순 중괄호 제거
  s = s.replace(/\{([^{}]*)\}/g, '$1');
  return s;
}

/** content/title/metaDescription 에서 \$...\$ → 유니코드/평문 변환 + 잔여는 KaTeX HTML */
function normalizeLatexForBlog(text: string): string {
  if (!text) return text;
  return text.replace(/\$([^$\n]+?)\$/g, (match, tex) => {
    const plain = simplifyLatexInline(tex);
    // 변환 후에도 LaTeX 명령(\\)이 남아있으면 KaTeX HTML 로 fallback
    if (/\\[a-zA-Z]/.test(plain)) {
      try {
        return katex.renderToString(tex, {
          throwOnError: false,
          strict: false,
          output: 'html',
        });
      } catch {
        return match; // 최종 폴백: 원문 그대로
      }
    }
    return plain;
  });
}

// ── 타입 ──

export interface ArticleGenerationInput {
  examPaper: {
    title: string;
    schoolName: string | null;
    grade: string | null;
    category: string | null;
    unit: string | null;
    // Prisma Json? — 신형 {topics, examYear, examSemester, examCategory} 객체 또는 레거시 string[] 또는 null
    examScope: unknown;
  };
  analysis: {
    questions: AnalyzedQuestion[];
    summary: {
      difficulty_distribution: Record<string, number>;
      type_distribution: Record<string, number>;
    };
    totalQuestions: number;
    totalPoints: number;
  };
  commentary: CommentaryResult;
}

export interface ArticleGenerationResult {
  title: string;
  content: string;       // 마크다운 ({{CHART:*}} 토큰 포함)
  tags: string[];
  metaDescription: string;
  generatedAt: string;
}

// ── 프롬프트 빌더 ──

function buildArticlePrompt(input: ArticleGenerationInput): string {
  const { examPaper, analysis, commentary } = input;

  const schoolName = examPaper.schoolName || '해당 학교';
  const grade = examPaper.grade || '';
  const totalQ = analysis.totalQuestions;
  const totalPts = analysis.totalPoints;

  // examScope 정규화: 신형 {topics: [...]} 객체, 레거시 string[], null 모두 안전 처리
  const examScopeTopics: string[] = (() => {
    const raw = examPaper.examScope;
    if (Array.isArray(raw)) return raw as string[];
    if (raw && typeof raw === 'object' && Array.isArray((raw as { topics?: unknown }).topics)) {
      return (raw as { topics: string[] }).topics;
    }
    return [];
  })();
  const scopeLabel = examScopeTopics.length ? examScopeTopics.join(', ') : (examPaper.unit || '미지정');

  // 난이도 분포 텍스트
  const diff = analysis.summary.difficulty_distribution;
  const LEVEL_NAMES = ['', '기본', '표준', '응용', '심화', '최고난도'];
  const diffLines = ['1', '2', '3', '4', '5'].map((lv) => {
    const count = (diff[lv] || 0)
      + (lv === '1' ? (diff.concept || 0) : 0)
      + (lv === '2' ? (diff.pattern || 0) : 0)
      + (lv === '4' ? (diff.reasoning || 0) : 0)
      + (lv === '5' ? (diff.creative || 0) : 0);
    return `  - Level ${lv}(${LEVEL_NAMES[Number(lv)]}): ${count}문항`;
  }).join('\n');

  // 난이도별 배점
  const diffPoints = [0, 0, 0, 0, 0];
  for (const q of analysis.questions) {
    const d = String(q.difficulty);
    const lvl = d === 'concept' ? 0 : d === 'pattern' ? 1 : d === 'reasoning' ? 3 : d === 'creative' ? 4
      : (Number(d) >= 1 && Number(d) <= 5) ? Number(d) - 1 : 2;
    diffPoints[lvl] += q.points || 0;
  }

  // 유형 분포 텍스트
  const types = analysis.summary.type_distribution;
  const typeLines = Object.entries(QUESTION_TYPE_LABELS)
    .map(([key, label]) => `  - ${label}: ${types[key] || 0}문항`)
    .join('\n');

  // 단원별 출제 현황
  const topicStats: Record<string, { count: number; pts: number }> = {};
  for (const q of analysis.questions) {
    const topic = q.topic || '미분류';
    if (!topicStats[topic]) topicStats[topic] = { count: 0, pts: 0 };
    topicStats[topic].count++;
    topicStats[topic].pts += q.points || 0;
  }
  const topicLines = Object.entries(topicStats)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([t, s]) => `  - ${t}: ${s.count}문항 (${s.pts}점)`)
    .join('\n');

  // 형식 분포
  const formats = { objective: 0, short_answer: 0, essay: 0 };
  for (const q of analysis.questions) {
    const f = q.question_format || 'objective';
    if (f in formats) formats[f as keyof typeof formats]++;
  }

  // 등급별 전략 텍스트
  const strategyText = commentary.score_strategies
    ? commentary.score_strategies.map((s) =>
      `- ${s.grade} (${s.target}): ${s.points?.join(' / ') || s.strategy || ''}`,
    ).join('\n')
    : commentary.score_strategy || '';

  // 주목할 문항 텍스트
  const notableText = commentary.notable_questions
    .map((n) => `- ${n.question_number}번: ${n.comment}`)
    .join('\n');

  // 지도 추천 텍스트
  const teachingText = commentary.teaching_recommendations
    ?.map((r) => `- [우선순위 ${r.priority}] ${r.topic}: ${r.reason}`)
    .join('\n') || '';

  // 주변 학교 비교
  const nearbyText = commentary.nearby_comparison || '(주변 학교 비교 데이터 없음)';

  // 종합 난이도
  const diffCounts = ['1', '2', '3', '4', '5'].map((lv) => diff[lv] || 0);
  const diffTotal = diffCounts.reduce((s, c) => s + c, 0) || 1;
  const overallLevel = Math.round(diffCounts.reduce((s, c, i) => s + c * (i + 1), 0) / diffTotal);

  // 매 생성마다 다른 글 전개를 유도하는 랜덤 시드들
  const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  const seedOpening = pick([
    '서술형 배점이나 형식의 특이점으로 시작',
    '가장 높은 난이도 문항의 존재감으로 시작',
    '기본 문항으로 받을 수 있는 점수의 한계로 시작',
    '특정 단원의 압도적 출제 비중으로 시작',
    '인근 학교와의 차별점으로 시작',
    '이 시험에서 가장 의외였던 점으로 시작',
  ]);
  const seedDifficulty = pick([
    '상위 난이도(Level 4~5)가 얼마나 무거운지를 먼저 보여주기',
    '하위 난이도(Level 1~2)로 확보 가능한 안전 점수를 먼저 계산',
    '등급 커트라인(90/70점)을 기준으로 각 난이도 구간의 역할 설명',
  ]);
  const seedNotable = pick([
    '개념 연결고리 중심 — 같은 개념이 여러 문항에 걸쳐 반복 출제된 패턴을 부각',
    '당락 문항 중심 — 배점이 크거나 정답률이 갈릴 문항 위주로 분석',
    '의외성 중심 — 쉬워 보이지만 함정이 있거나, 어려워 보이지만 부분 점수가 가능한 문항',
  ]);
  const seedGradeStyle = pick([
    '각 등급별로 "이 등급의 학생이 가장 많이 실수하는 구간"을 짚어주는 방식',
    '각 등급별로 "N문항만 더 맞히면 다음 등급"이라는 구체적 숫자 제시 방식',
    '각 등급별로 "절대 놓치면 안 되는 문항 번호"를 콕 집어주는 방식',
  ]);
  const seedClosing = pick([
    '마지막 문장을 학습 방향의 연장선으로 마무리',
    '마지막 문장을 학부모의 궁금증을 유도하는 질문형으로 마무리',
    '마지막 문장을 이번 시험의 핵심 메시지를 한 줄로 요약하며 마무리',
  ]);
  const seedLearning = pick([
    '배점 비중 순서대로 우선순위 제시',
    '학습 난이도 순서(쉬운 것부터)로 단계적 접근 제시',
    '약점 보완 관점 — 가장 많이 틀릴 단원부터 역순으로 공략',
  ]);

  return `당신은 15년 경력의 수학 학원 원장이자 기출 분석 전문가입니다.
직접 시험지를 분석하고, 학부모 상담을 수백 번 해본 경험에서 우러나오는 글을 씁니다.
데이터를 나열하는 보고서가 아니라, 데이터를 해석하여 학부모가 "아, 그래서 우리 아이는 이렇게 해야 하는구나"라고 깨닫게 만드는 글을 씁니다.

## 글의 목적
- 독자: 학부모 (수학을 잘 모르는 분들도 이해 가능해야 함)
- 목표: 학원의 전문성을 어필하여 학부모의 신뢰를 얻고 학원 방문을 유도
- 톤: 전문가의 분석 칼럼. 격식체("~합니다")를 기본으로 하되, 자연스러운 흐름이 최우선
- "~해요", "~거든요" 같은 구어체는 사용하지 않지만, "~인 셈입니다", "~볼 만합니다", "~눈여겨볼 대목입니다" 같은 자연스러운 표현을 적극 사용

## 시험 정보
- 학교: ${schoolName}
- 학년: ${grade}
- 시험 범위: ${scopeLabel}
- 총 문항수: ${totalQ}문항, 총 배점: ${totalPts}점
- 형식: 객관식 ${formats.objective}문항, 단답형 ${formats.short_answer}문항, 서술형 ${formats.essay}문항
- 종합 난이도: Level ${overallLevel} (${LEVEL_NAMES[overallLevel]})

## 난이도 분포
${diffLines}
- 난이도별 배점: Level1 ${diffPoints[0]}점, Level2 ${diffPoints[1]}점, Level3 ${diffPoints[2]}점, Level4 ${diffPoints[3]}점, Level5 ${diffPoints[4]}점

## 유형 분포 (5대 교육과정 영역)
${typeLines}

## 단원별 출제 현황
${topicLines}

## AI 총평 요약
${commentary.overall_comment}

## 등급별 점수 확보 전략
${strategyText}

## 강점 영역
${commentary.strength_areas.map((s) => `- ${s}`).join('\n')}

## 보완 필요 영역
${commentary.improvement_areas.map((s) => `- ${s}`).join('\n')}

## 주목할 문항
${notableText}

## 지도 추천
${teachingText}

## 주변 학교 비교
${nearbyText}

## 글 작성 규칙

### 수식 표기 규칙 (네이버 블로그 컨텍스트 — 필수)
**핵심 원칙: 이 글은 네이버 블로그에 게시됩니다. 네이버는 KaTeX/LaTeX 를 렌더링하지 않습니다.**
**따라서 \$...\$ LaTeX 문법을 사용하면 안 됩니다. 사용자에게 raw "\\sqrt{A^2}", "\\frac{a}{b}" 가 그대로 보이게 됩니다.**

- **\$...\$ 절대 사용 금지** — 단순 변수 \$x\$, \$a\$ 도 사용 금지
- **수식은 유니코드 문자 + 평문으로 표현**:
  - 제곱: x², a², n³  (² ³ 유니코드 — Alt+0178/0179)
  - 첨자: x₁, x₂, aₙ  (₁ ₂ ₙ 유니코드)
  - 분수: a/b 또는 "분자÷분모"  ("\\frac{a}{b}" 금지)
  - 제곱근: √(A²) 또는 "A² 의 제곱근"  ("\\sqrt{A^2}" 금지)
  - 절댓값: |A|  (수직바 사용)
  - 부등호: ≤, ≥, ≠  (\\le, \\ge 금지)
  - 곱셈: × 또는 ·  (\\times 금지)
  - 시그마: Σ, 적분 ∫, 파이 π, 세타 θ
- **수식이 너무 복잡하면 자연어로 풀어쓰세요**:
  - ✗ \$\\sqrt{A^2} = |A|\$ 원리를 적용해
  - ✓ √(A²) = |A| 원리를 적용해
  - ✓ "A² 의 제곱근은 A 의 절댓값과 같다" 원리를 적용해
- **점수·문항수·등급도 평문**: "Level 2", "9문항", "48점" — \$ 없이

### 영문 enum 사용 금지 (필수)
- 능력영역은 **"계산력 / 이해력 / 문제해결력 / 추론력"** 으로만 표기
- 유형은 **"수와 연산 / 문자와 식 / 함수 / 기하 / 확률과 통계"** 로만 표기
- **CALCULATION, UNDERSTANDING, PROBLEM_SOLVING, REASONING, NUMBER, ALGEBRA, FUNCTION, GEOMETRY, STATISTICS** 같은 영문 토큰을 글에 한 글자도 포함하지 말 것
- ✗ "CALCULATION 영역에서 강세", "PROBLEM_SOLVING 능력 필요"
- ✓ "계산력 영역에서 강세", "문제해결력이 필요"

### 글 구조 (이 순서를 따르되, 각 섹션의 도입 방식은 매번 달라야 합니다)
1. **시험 개요** — **[도입 전략: ${seedOpening}]** 이 전략에 맞는 핵심 특징 하나로 시작하세요. 단순 나열이 아닌, 이 시험의 '성격'을 한 문장으로 규정한 뒤 세부 정보를 풀어서 설명
2. **난이도 분석** — **[전개 전략: ${seedDifficulty}]** 숫자를 나열하지 말고 이 전략에 맞게 서술. 끝에 {{CHART:difficulty}} 토큰 삽입
3. **출제 영역 분석** — 출제된 영역의 비중과 특징만 분석. 아래 규칙을 반드시 따를 것:
   - **미출제 영역 언급 금지**: 시험 범위에 포함되지 않아 출제되지 않은 영역(예: 함수, 기하, 확률과 통계)은 절대 언급하지 말 것. "~은 한 문항도 없습니다"는 정보 가치가 없음
   - **"범위가 좁다" 클리셰 금지**: "범위가 좁다고 방심하면 독이 됩니다" 같은 뻔한 경고 금지. 대신 출제된 영역 내에서 어떤 단원이 얼마나 집중되어 있는지, 그것이 학생에게 어떤 의미인지를 구체적으로 서술
   - 끝에 {{CHART:combined_radar}} 토큰 삽입 (출제 영역 + 능력 영역이 좌우로 합쳐진 하나의 이미지)
4. **단원별 출제 현황** — 단원별 배점의 '이유'를 추측하거나, 학생이 느낄 체감 난이도와 연결. 끝에 {{CHART:topic_bar}} 토큰 삽입
5. **주목할 문항 분석** — **[분석 전략: ${seedNotable}]** 3~5개 문항을 선정하되, 이 전략에 맞게 서술
6. **등급별 점수 확보 전략** — **[서술 방식: ${seedGradeStyle}]** A/B/C 등급 모두 충분히 깊게 다루되, 이 서술 방식에 맞게 작성. "~해야 합니다"만 반복하지 말고 현실적 조언
7. **학습 방향 제안** — **[구성 전략: ${seedLearning}]** 이 전략에 맞게 구체적인 학습 순서와 이유를 제시
- **[마무리 전략: ${seedClosing}]**
${commentary.nearby_comparison ? '8. **주변 학교 비교** — 다른 학교와의 차이를 통해 이 학교만의 특징을 부각' : ''}

### 네이버 SEO 최적화 (C-Rank / D.I.A.)
- **제목**: 25~40자, 핵심 키워드(${schoolName} + 기출 분석)를 앞쪽 15자 이내에 배치
- **소제목**: <h2>로 각 섹션 구분. 최소 6개. 모든 <h2> 소제목에 "${schoolName} ${grade}" 포함
- **키워드 배치 전략 (자연스러움이 최우선!)**:
  - "${schoolName}" 12~15회 (제목, 모든 <h2>, 각 섹션 첫 문장, 마지막 문장에 집중 배치)
  - "${grade}" 5~8회 (소제목, 각 섹션 도입부에 배치)
  - 같은 문단 안에서 학교명을 2회 이상 반복하지 말 것! 문단 내에서는 "이번 시험", "해당 기출" 등 자연스러운 대체 표현 사용
  - ✗ "성광중 중3 시험은 성광중 중3 기출 분석에서..." (같은 문장에 2회 = 스터핑)
  - ✓ "성광중 중3 시험은 응용~심화 구간에 배점이 집중된 구조로, 기본 개념만으로는 고득점이 어렵습니다." (1회만, 자연스럽게)
- **문단**: 2~4문장씩 짧게 끊어 모바일 가독성 확보. 문장당 40자 이내 권장
- **이미지 위치**: {{CHART:difficulty}}, {{CHART:combined_radar}}, {{CHART:topic_bar}} 토큰을 정확히 해당 섹션 끝에 삽입. **절대 "▲ 21문항 난이도 분포" 같은 텍스트 캡션으로 대체하지 말 것!** 반드시 {{CHART:difficulty}} 형태의 토큰 문자열 그대로 출력
- **태그 규칙 (정확히 따를 것)**:
  - 필수 태그: #${schoolName.replace(/\s/g, '')} #${schoolName.replace(/\s/g, '')}기출 #${schoolName.replace(/\s/g, '')}수학 #${grade ? grade.replace(/\s/g, '') + '수학' : '중학수학'} #기출분석 #수학기출분석 #중간고사기출
  - 주변 학교가 있으면 주변 학교명 태그도 추가: ${nearbyText !== '(주변 학교 비교 데이터 없음)' ? '주변 학교명을 #학교명 형태로 각각 추가' : ''}
  - 총 8~12개. 일반적이고 검색되지 않을 태그(#교육, #학습 등) 사용 금지
- **글 길이 (구조적 제한)**: 각 <h2> 섹션 아래에 3~4개 문단(<br><br>로 구분), 각 문단은 2~4문장으로 구성. 이 구조를 지키면 자연스럽게 2,500~3,200자 범위에 들어옴. 3,500자 절대 초과 금지

### HTML 서식 규칙 (네이버 블로그 100% 호환 — 가장 중요한 규칙!)
**핵심 원칙: 네이버 블로그는 <p>태그에 자체 마진을 추가하고 <ul><li>를 변형함. 따라서 <br> 기반 단순 HTML만 사용!**

- content 필드는 **HTML 형식**으로 작성. 마크다운(##, **, -) 사용 금지!
- **[중요] JSON 파싱 오류 방지**: 모든 HTML 태그의 속성에는 큰따옴표 대신 작은따옴표(')를 사용. ✓ style='color: #E03131' ✗ style="color: #E03131"
- **사용 금지 태그**: <p>, <ul>, <li>, <ol>, <table>, <blockquote>, <h3>, <div> — 네이버가 자체 스타일을 적용하여 레이아웃이 깨짐
- **사용 가능 태그**: <h2>, <strong>, <span>, <mark>, <br>, <img>, {{CHART:*}} 토큰
- **소제목**: <h2>시험 개요</h2> 형태. 모든 섹션에 <h2> 사용
- **하위 제목** (등급별 전략 등): <strong style='font-size: 17px;'>A등급 전략</strong><br><br> 형태
- **개별 문항 제목**: <strong>서술형 3번 — Level 5 (13점)</strong><br> 형태
- **볼드**: <strong>중요 내용</strong>
- **리스트 항목**: <ul><li> 대신 수동 불릿 사용! "• 항목 내용<br>" 형태로 작성
  - ✓ • Level 4 심화 7문항 중 계산 위주 문항을 선별하여 추가 점수를 획득해야 합니다.<br>
  - ✗ <ul><li>Level 4 심화 7문항 중...</li></ul>
- **줄바꿈**: 문장 끝마다 <br> 삽입. 문단 사이는 <br><br> (빈 줄 효과)
- **섹션 간 간격**: <h2> 앞에 <br><br> 삽입하여 시각적 구분
- **글자 크기**: 인라인 스타일 불필요 (네이버 기본 크기로 통일됨). <h2>만 네이버가 적절한 크기로 렌더링
- **색상 강조 (핵심 수치/키워드에 적용)**:
  - 핵심 점수/수치: <span style='color: #E03131'>84점</span> (빨간색)
  - 등급 라벨: <span style='color: #1971C2'>A등급</span> (파란색)
  - 난이도 키워드: <span style='color: #E8590C'>심화</span> (주황색), <span style='color: #2F9E44'>기본</span> (녹색)
  - 단원명 강조: <strong style='color: #6741D9'>인수분해</strong> (보라색)
- **형광펜 (문맥별 다른 색상 사용! 전부 노란색 금지!)**:
  - 핵심 인사이트: <mark style='background-color: #FFF3BF'>핵심 메시지</mark> (노란색)
  - A등급 전략: <mark style='background-color: #D8F5A2'>A등급 핵심</mark> (연두색)
  - B등급 전략: <mark style='background-color: #BAE3FF'>B등급 핵심</mark> (하늘색)
  - C등급 전략: <mark style='background-color: #FFE8CC'>C등급 핵심</mark> (살구색)
  - 경고/주의: <mark style='background-color: #FFD8D8'>주의 사항</mark> (분홍색)
  - 영역 강조: <mark style='background-color: #E8D5FF'>영역 이름</mark> (연보라색)
- 차트 이미지 위치: {{CHART:difficulty}}, {{CHART:combined_radar}}, {{CHART:topic_bar}} 토큰만 삽입

**HTML 구조 예시 (태그 패턴 참고용 — 문장 표현은 매번 새롭게 작성!):**
<h2>성광중 중3 수학 등급별 점수 확보 전략</h2>
<br>
<strong style='font-size: 17px;'><span style='color: #1971C2'>A등급</span> (90점 이상) 전략</strong><br>
<mark style='background-color: #D8F5A2'>기본~응용 구간 48점을 실수 없이 가져가는 것이 출발점입니다.</mark><br>
여기까지는 충분히 가능한 범위입니다. 승부는 그 다음부터 갈립니다.<br>
• Level 4 심화 7문항 중 5문항 이상을 정확히 풀어야 90점 라인에 도달할 수 있습니다.<br>
• 서술형은 단계별 풀이를 빠짐없이 적는 연습이 필수입니다. 답만 맞히고 과정 점수를 잃으면 A등급이 무너집니다.<br>
<br>
<strong style='font-size: 17px;'><span style='color: #1971C2'>B등급</span> (70~89점) 전략</strong><br>
<mark style='background-color: #BAE3FF'>Level 3 응용 문항이 이 구간의 승부처입니다.</mark><br>
• 기본·표준 6문항(16점)은 반드시 전부 가져가되, 여기서 멈추면 70점에 한참 못 미칩니다.<br>

### 서식 적용 가이드라인
- 각 섹션 도입부의 핵심 메시지 1문장은 <mark> 형광펜 처리 (섹션마다 다른 색상 사용!)
- 점수, 문항수, 퍼센트 등 숫자 데이터는 <strong style='color: #E03131'> 빨간 볼드
- Level 1~5 키워드는 난이도별 색상 적용 (1=녹색, 2=라임, 3=주황, 4=오렌지, 5=빨강)
- 등급별 전략의 등급 라벨(A/B/C)은 파란 볼드
- 단원명은 보라 볼드
- blockquote 대신 형광펜(<mark>)으로 핵심 인사이트 강조
- **형광펜 색상 배분 규칙** (같은 색상만 반복 사용 절대 금지!):
  - 시험 개요 섹션 → 노란색 형광 (#FFF3BF)
  - 난이도 분석 섹션 → 분홍색 형광 (#FFD8D8)
  - 출제 영역 분석 → 연보라색 형광 (#E8D5FF)
  - 단원별 출제 현황 → 살구색 형광 (#FFE8CC)
  - 주목할 문항 → 노란색 형광 (#FFF3BF)
  - A등급 전략 → 연두색 형광 (#D8F5A2), B등급 → 하늘색 (#BAE3FF), C등급 → 살구색 (#FFE8CC)
  - 학습 방향 제안 → 하늘색 형광 (#BAE3FF)

### 자연스러운 글쓰기 규칙 (가장 중요! — AI스러운 글 절대 금지)

**핵심 원칙: 이 글을 읽은 사람이 "AI가 썼네"라고 느끼면 실패입니다. 사람이 직접 분석하고 쓴 것처럼 보여야 합니다.**

**[금지 패턴 — 이렇게 쓰면 안 됩니다]**
- ✗ 모든 문단을 "~은/는 ~입니다"로 시작 (가장 흔한 AI 패턴!)
- ✗ "~입니다", "~됩니다"로만 문장을 끝내는 일률적 종결
- ✗ 매 섹션 첫 문장에서 숫자부터 나열 ("총 21문항 100점 만점으로...")
- ✗ 수식어 남발: "체계적으로", "실질적으로", "집중적으로", "종합적으로", "전략적으로", "다각적인", "입체적인", "심도 있는"
- ✗ AI 접속사 클리셰: "요약하자면", "결론적으로", "종합적으로 볼 때", "궁극적으로", "필수적입니다"
- ✗ AI가 작성했음을 암시하는 어떤 표현도 금지: "AI 분석", "AI가 작성", "자동 생성", "Powered by" 등. 이 글은 원장님이 직접 쓴 것처럼 보여야 함
- ✗ A/B/C 등급 전략 분량을 기계적으로 똑같이 맞추기 (사람은 절대 그렇게 쓰지 않음)
- ✗ 같은 구조의 문장을 연속 배치 ("A는 B입니다. C는 D입니다. E는 F입니다.")
- ✗ 모든 리스트 항목을 "~해야 합니다"로 끝내기
- ✗ 데이터를 그대로 문장으로 옮기기 ("6문항 31점으로 단일 단원 최고 비중입니다")
- ✗ 섹션마다 동일한 전개 패턴 (사실 진술 → 수치 나열 → 결론)
- ✗ "좌우합니다", "결정짓습니다", "핵심 축을 형성합니다" 같은 과장 클리셰
- ✗ 글 전체가 하나의 톤으로 평탄하게 흐르는 것 (리듬 없이 단조로움)

**[필수 패턴 — 이렇게 써야 합니다]**

1. **문장 시작 다양화** — 연속 3문장이 같은 구조로 시작하면 안 됩니다:
   - 질문으로 시작: "기본 문항으로 받을 수 있는 점수가 얼마나 될까요?"
   - 역접/반전으로 시작: "그런데 문제는 여기서부터입니다."
   - 비유/비교로 시작: "이 단원 하나에 시험의 3분의 1이 걸려 있습니다."
   - 강조 도치: "무려 35점, 서술형 3문항의 합산 배점입니다."
   - 접속사/전환어: "다만", "결국", "달리 말하면", "눈여겨볼 점은", "한 가지 더"

2. **종결어 10가지 이상 혼용** (같은 종결어 연속 2회 금지!):
   - ~입니다 / ~됩니다 (기본, 전체의 30% 이하)
   - ~인 셈입니다 / ~볼 수 있습니다 / ~마찬가지입니다
   - ~어렵습니다 / ~불가능합니다 / ~쉽지 않습니다
   - ~주목할 필요가 있습니다 / ~눈여겨볼 대목입니다
   - ~때문입니다 / ~까닭입니다
   - ~보입니다 / ~보여집니다 / ~드러납니다
   - ~달라집니다 / ~갈립니다 / ~나뉩니다
   - ~차이가 큽니다 / ~격차가 존재합니다
   - ~중요합니다 / ~관건입니다 / ~핵심입니다
   - ~가능합니다 / ~충분합니다 / ~무리가 없습니다

3. **인사이트 먼저, 데이터는 근거로** — 숫자를 먼저 나열하지 말고, 해석을 먼저 쓰고 숫자를 근거로 붙이세요:
   - ✗ "응용 이상 문항이 전체 배점의 84점을 차지하는 고난도 구조입니다."
   - ✓ "기본 개념만 익힌 학생이 받을 수 있는 점수는 16점에 불과합니다. 나머지 84점은 모두 응용력 이상을 요구하는 문항으로 채워져 있습니다."

4. **학부모 관점 프레이밍** — 추상적 분석이 아닌, 학부모가 실감할 수 있는 표현:
   - ✗ "서술형 배점이 35점으로 인근 학교를 상회합니다."
   - ✓ "서술형 3문항의 배점이 35점입니다. 풀이 과정을 어떻게 쓰느냐에 따라 한 등급이 통째로 달라질 수 있는 비중입니다."

5. **문단 간 연결** — 각 섹션이 독립된 보고서 항목처럼 끊기지 않도록 전환어를 사용:
   - "난이도를 살펴봤으니, 이제 어떤 단원에서 이 난이도가 집중되는지 확인해 보겠습니다."
   - "이 단원이 왜 중요한지는 아래 문항 분석에서 더 구체적으로 드러납니다."

6. **리듬 변화** — 짧은 문장과 긴 문장을 섞어서 단조로움을 깨세요:
   - 짧은 강조: "핵심은 서술형입니다." / "여기서 갈립니다." / "16점, 이것이 바닥입니다."
   - 긴 설명: 그 뒤에 구체적인 근거와 맥락을 붙임

7. **구체적 비유/환산** — 추상적 수치를 학부모가 체감할 수 있게:
   - "시험 전체의 3분의 1이 이 단원 하나에 걸려 있습니다."
   - "이 문항 하나로 한 등급이 갈릴 수 있는 배점입니다."
   - "Level 4 문항 7개 중 3개만 더 맞히면 B에서 A로 올라갑니다."

8. **현장감 부여** — 글 전체에서 1~2회, 학원 현장 경험이 묻어나는 표현을 자연스럽게 섞으세요 (남발 금지, 최대 2회):
   - "시험지를 처음 받아보고 눈에 띈 점이 있습니다."
   - "매년 이맘때 아이들이 가장 많이 헤매는 부분이 바로 이 단원입니다."
   - "상담에서 자주 듣는 질문 중 하나가 '서술형을 어떻게 대비하느냐'인데,"
   - "냉정하게 말씀드리면,"

9. **비대칭 분량** — 등급별 전략이나 문항 분석을 쓸 때, 분량을 기계적으로 균등하게 배분하지 마세요. 승부처가 되는 구간(예: B등급 전략, 핵심 킬러 문항)은 길고 깊게, 뻔한 구간은 짧게 치고 넘기세요. 사람은 강조하고 싶은 곳에 열을 올리고 덜 중요한 곳은 대충 넘깁니다.

10. **강조 후 여백** — 형광펜이나 볼드로 강조한 문장 뒤에는 <br><br>을 넣어 시각적 여운을 주세요. 단어 하나를 볼드하지 말고 구절이나 문장 단위로 강조하세요.

### 표현 규칙
- 종합 난이도 Level ${overallLevel}에 맞는 표현만 사용
- Level 1~2 시험에 "킬러", "최고난도", "변별력" 사용 금지
- Level 3 시험에 "최상위 변별" 사용 금지
- 과장 표현 금지. 근거 없는 수식어("실질적으로", "체계적으로") 삭제
- **자명한 환산 금지**: 100점 만점 시험에서 "N점으로 전체의 N%"처럼 점수=퍼센트가 자명한 경우 퍼센트를 적지 말 것. 단, 문항수 대비 비율은 유용하므로 표기 (예: ✓ "9문항, 전체의 43%")
- **난이도 구간 표현 정확성**: "기본 개념만으로 확보 가능한 점수"라고 할 때 Level 3(응용)을 포함하지 말 것. Level 1~2만 = "기본 문항", Level 1~3 합산 = "Level 3까지 포함 시"로 구분
- **정보 중복 금지**: 같은 수치를 본문 서술과 리스트에서 이중으로 나열하지 말 것. 본문에서 인사이트 → 리스트에서 데이터 보충, 또는 둘 중 하나만 선택
- **동일 표현 반복 금지**: "확보해야 합니다"를 3회 이상, "좌우합니다"를 2회 이상, "핵심"을 4회 이상 사용 금지. 같은 단어가 반복되면 동의어로 교체
- **학교명 약어 사용**: "대구일중학교" → "대구일중", "경명여자중학교" → "경명여중", "침산중학교" → "침산중"처럼 현장에서 실제 쓰는 약어로 표기. "~중학교", "~고등학교" 풀네임 사용 금지
- **"약" 붙이기 금지**: 제공된 데이터에 정확한 수치가 있으면 "약 19점", "대략 10점" 같은 불필요한 헤징 금지. 정확한 숫자를 그대로 사용. 데이터에 없는 수치를 추정해서 만들어내는 것도 금지
- **주변 학교 비교 일관성**: 여러 학교를 나열할 때 동일한 포맷을 유지. 같은 문단에서 앞에는 "학교(N점)" 뒤에는 "학교(N문항)" 처럼 단위나 구조가 뒤바뀌면 안 됨. 하나의 기준(문항수 or 배점)을 정해서 통일

### 학원 홍보 (자연스럽게, 본문과 톤 일치)
- 글 마지막 1~2문장으로 자연스럽게 마무리. 별도 단락으로 분리하지 말 것
- ✓ "이번 기출에서 드러난 출제 경향과 단원별 맞춤 전략이 궁금하시면 언제든 문의 주시기 바랍니다." (분석 흐름의 연장선)
- ✗ "저희 학원에서는 ~수업을 진행하고 있습니다." (갑작스러운 광고 전환)
- 과도한 광고 금지. 전문적 분석에 집중

## 출력 형식 (반드시 아래 JSON으로만 응답. 마크다운 코드블록(\`\`\`json) 없이 순수 JSON만 출력!)
{
  "title": "블로그 제목 (25~40자, 키워드 앞쪽 배치)",
  "content": "HTML 본문 (<h2>, <strong>, <mark>, <span style=color>, <br>, {{CHART:*}} 사용. <p>/<ul>/<li>/<blockquote>/<h3> 사용 금지!)",
  "tags": ["#태그1", "#태그2", "..."],
  "metaDescription": "검색 결과 미리보기용 설명 (50~120자, 키워드 포함)"
}`;
}

// ── JSON 추출 (commentary-agent 패턴 + 정규식 partial fallback) ──

function extractJson(text: string): Record<string, unknown> {
  // 1차: 코드펜스 내 JSON
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : text.trim();

  // 2차: JSON 범위 추출
  const jsonStart = candidate.indexOf('{');
  const jsonEnd = candidate.lastIndexOf('}');
  const jsonStr = jsonStart >= 0 && jsonEnd > jsonStart
    ? candidate.slice(jsonStart, jsonEnd + 1)
    : candidate;

  // 3차: 직접 파싱
  try {
    return JSON.parse(jsonStr);
  } catch {
    // 무시
  }

  // 4차: 잘린 JSON 복구
  let fixed = jsonStr;
  const unescaped = fixed.replace(/\\"/g, '');
  if ((unescaped.match(/"/g) || []).length % 2 !== 0) fixed += '"';
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');
  const openBrackets = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
  const openBraces = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length;
  for (let i = 0; i < openBrackets; i++) fixed += ']';
  for (let i = 0; i < openBraces; i++) fixed += '}';

  try {
    return JSON.parse(fixed);
  } catch {
    // 무시
  }

  // 5차: 마지막 키-값 제거 후 재시도
  const lastComma = fixed.lastIndexOf(',');
  if (lastComma > 0) {
    let closing = fixed.slice(0, lastComma) + fixed.slice(lastComma + 1).replace(/[^}\]]/g, '');
    const ob = (closing.match(/\[/g) || []).length - (closing.match(/\]/g) || []).length;
    const oc = (closing.match(/\{/g) || []).length - (closing.match(/\}/g) || []).length;
    for (let i = 0; i < ob; i++) closing += ']';
    for (let i = 0; i < oc; i++) closing += '}';
    try {
      return JSON.parse(closing);
    } catch {
      // 무시
    }
  }

  // 6차: 정규식 기반 partial 필드 추출 (content 가 max_tokens 초과로 중간에 잘렸을 때 fallback)
  // title/metaDescription/tags 는 보통 짧아서 살아남고, content 만 잘리는 케이스가 다수
  const partial = extractFieldsByRegex(jsonStr);
  if (partial.title || partial.content) {
    return partial;
  }

  // 최종 실패: 디버그 용이하도록 잘린 끝부분도 포함
  const tail = jsonStr.length > 200 ? `...${jsonStr.slice(-200)}` : '';
  throw new Error(
    `블로그 글 JSON 파싱 실패 (응답 길이 ${jsonStr.length}자, 토큰 한도 초과 가능성): ${jsonStr.slice(0, 200)}${tail}`,
  );
}

/**
 * JSON 전체 파싱이 실패해도 각 필드를 정규식으로 부분 추출.
 * Claude 가 max_tokens 한도 직전까지 출력하다 content 중간에서 잘려도, title/tags/metaDescription 은 살릴 수 있도록.
 */
function extractFieldsByRegex(jsonStr: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // title: "..." — JSON 문자열은 큰따옴표로 감싸지고 escape 된 \" 만 안쪽 허용
  const titleMatch = jsonStr.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (titleMatch) {
    try {
      result.title = JSON.parse(`"${titleMatch[1]}"`);
    } catch {
      result.title = titleMatch[1];
    }
  }

  // metaDescription
  const metaMatch = jsonStr.match(/"meta(?:Description|_description)"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (metaMatch) {
    try {
      result.metaDescription = JSON.parse(`"${metaMatch[1]}"`);
    } catch {
      result.metaDescription = metaMatch[1];
    }
  }

  // tags: ["..."] — 배열 자체가 잘리지 않은 경우만 시도
  const tagsMatch = jsonStr.match(/"tags"\s*:\s*(\[[^\]]*\])/);
  if (tagsMatch) {
    try {
      result.tags = JSON.parse(tagsMatch[1]);
    } catch {
      // 무시
    }
  }

  // content: "..." — 잘려도 가능한 만큼 추출
  // 1) 정상 완료: ",\\s*\"<다음키>"|\\s*}" 앞까지
  const contentFullMatch = jsonStr.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*[,}]/);
  if (contentFullMatch) {
    try {
      result.content = JSON.parse(`"${contentFullMatch[1]}"`);
    } catch {
      result.content = contentFullMatch[1];
    }
  } else {
    // 2) 잘림 케이스: content 시작 이후 문자열을 끝까지 추출 (마지막 따옴표 없음)
    const contentStart = jsonStr.search(/"content"\s*:\s*"/);
    if (contentStart >= 0) {
      const after = jsonStr.slice(contentStart).match(/"content"\s*:\s*"([\s\S]*)$/);
      if (after) {
        // tags/metaDescription 토큰 직전까지 잘라내기 (있으면)
        let body = after[1];
        const nextKey = body.search(/",\s*"(?:tags|metaDescription|meta_description)"/);
        if (nextKey >= 0) body = body.slice(0, nextKey);
        // 끝의 unescape 된 따옴표 제거
        body = body.replace(/"+$/, '');
        try {
          result.content = JSON.parse(`"${body}"`);
        } catch {
          result.content = body;
        }
      }
    }
  }

  return result;
}

// ── 메인 생성 함수 (일괄) ──

export async function generateExamArticle(
  input: ArticleGenerationInput,
): Promise<ArticleGenerationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다');
  }

  const client = new Anthropic({ apiKey });
  const prompt = buildArticlePrompt(input);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    // 16K 토큰: 한글 본문(약 2,500~3,200자) + JSON 오버헤드 + HTML 마크업 여유.
    // 8K 는 잦은 잘림(max_tokens 종료) → JSON 파싱 실패 유발.
    max_tokens: 16384,
    temperature: 0.75,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  if (!text) throw new Error('AI 응답이 비어있습니다');

  // stop_reason 이 'max_tokens' 면 응답이 잘렸을 가능성 — 로그로 노출 후 partial 파싱 시도
  if (response.stop_reason === 'max_tokens') {
    console.warn('[article-generator] max_tokens 도달 — 응답이 잘렸을 수 있음. partial 파싱 시도.');
  }

  const raw = extractJson(text);

  // 안전망 변환 체인:
  //   normalizeMathText  — LaTeX 정규화 (\dfrac → \frac, 줄바꿈 정리 등)
  //   stripEnglishEnums  — 영문 enum → 한글 라벨
  //   normalizeLatexForBlog — \$...\$ → 유니코드/평문 (블로그 컨텍스트, 네이버 호환)
  const processBlogText = (s: string) =>
    normalizeLatexForBlog(stripEnglishEnums(normalizeMathText(s)));

  return {
    title: processBlogText(String(raw.title || '')),
    content: processBlogText(String(raw.content || '')),
    tags: Array.isArray(raw.tags) ? raw.tags.map(t => stripEnglishEnums(String(t))) : [],
    metaDescription: processBlogText(String(raw.metaDescription || raw.meta_description || '')),
    generatedAt: new Date().toISOString(),
  };
}

// ── 스트리밍 생성 함수 (NDJSON용) ──

export async function generateExamArticleStream(
  input: ArticleGenerationInput,
  onDelta: (text: string) => void,
): Promise<ArticleGenerationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다');
  }

  const client = new Anthropic({ apiKey });
  const prompt = buildArticlePrompt(input);

  let fullText = '';

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    // 16K 토큰: 한글 본문(약 2,500~3,200자) + JSON 오버헤드 + HTML 마크업 여유.
    // 8K 는 잦은 잘림(max_tokens 종료) → JSON 파싱 실패 유발.
    max_tokens: 16384,
    temperature: 0.75,
    messages: [{ role: 'user', content: prompt }],
  });

  // 청크 버퍼 (너무 잦은 전송 방지)
  let buf = '';
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (buf.length > 0) {
      onDelta(buf);
      buf = '';
    }
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  };

  stream.on('text', (text) => {
    fullText += text;
    buf += text;
    if (buf.length >= 40) {
      flush();
    } else if (!flushTimer) {
      flushTimer = setTimeout(flush, 60);
    }
  });

  const finalMsg = await stream.finalMessage();
  flush(); // 남은 버퍼 전송

  if (!fullText) throw new Error('AI 응답이 비어있습니다');

  // stop_reason 이 'max_tokens' 면 응답이 잘렸을 가능성 — 로그로 노출 후 partial 파싱 시도
  if (finalMsg.stop_reason === 'max_tokens') {
    console.warn('[article-generator] stream max_tokens 도달 — 응답이 잘렸을 수 있음. partial 파싱 시도.');
  }

  const raw = extractJson(fullText);

  // 안전망 변환 체인:
  //   normalizeMathText  — LaTeX 정규화 (\dfrac → \frac, 줄바꿈 정리 등)
  //   stripEnglishEnums  — 영문 enum → 한글 라벨
  //   normalizeLatexForBlog — \$...\$ → 유니코드/평문 (블로그 컨텍스트, 네이버 호환)
  const processBlogText = (s: string) =>
    normalizeLatexForBlog(stripEnglishEnums(normalizeMathText(s)));

  return {
    title: processBlogText(String(raw.title || '')),
    content: processBlogText(String(raw.content || '')),
    tags: Array.isArray(raw.tags) ? raw.tags.map(t => stripEnglishEnums(String(t))) : [],
    metaDescription: processBlogText(String(raw.metaDescription || raw.meta_description || '')),
    generatedAt: new Date().toISOString(),
  };
}
