/**
 * 기출 분석 블로그 글 AI 생성기 (Hybrid Archetype × Composition)
 *
 * 기존 단일 거대 프롬프트(412~697줄)를 archetype 분류 + 모듈 컴포지션으로 분해.
 *
 * 흐름:
 *   1. classifySignals: 시험 특성 신호 추출
 *   2. buildBlueprint: archetype 분류 + 골격(톤/등급 라벨/차트/도입 H2) 결정
 *   3. composeBlueprint: 본론 모듈 5~7개를 신호 기반 동적 선택 + 정렬
 *   4. assembleArticlePrompt: 7개 sub-builder로 프롬프트 조립
 *   5. Claude Sonnet 4.6 호출 (스트리밍, max_tokens 16K)
 *   6. checkAntiPatterns: 생성된 본문에서 가짜 경험·일반론·반복 강조어 정규식 검출
 *
 * AI 모델: Claude Sonnet 4.6 (commentary-agent와 동일)
 * SEO: NaverSEO Pro의 C-Rank/D.I.A. 규칙 적용
 */

import Anthropic from '@anthropic-ai/sdk';
import { generateText } from './shared/commentary-llm';
import katex from 'katex';
import type { AnalyzedQuestion } from './types';
import type { CommentaryResult } from './agents/commentary-agent';
import { DIFFICULTY_LEGACY_MAP } from './constants';
import { weightedAverageDifficulty } from './shared/difficulty';
import { toExamSubjectKey } from './shared/subject';
import { normalizeMathText } from '@/lib/pdf-extract-engine/ai/post-processor';
import { formatDistribution } from './shared/question-format';
import {
  classifySignals,
  buildBlueprint,
  type Archetype,
  type ChartId,
  type ClosingTone,
  type GradeBand,
} from './article-archetype';
import {
  composeBlueprint,
  type ArticleVariables,
  type BuildChunkContext,
} from './article-modules';
import {
  buildSystemBase,
  buildArchetypeHeader,
  buildFactsAndDataBlock,
  buildSectionGuides,
  buildFormatRules,
  buildOutputSchema,
  assembleArticlePrompt,
  type FactsBlockInput,
} from './article-prompt-builders';
import {
  checkAntiPatterns,
  type AntiPatternWarning,
} from './article-anti-patterns';

// ── 영문 enum 차단 (UI normalizeKoreanLabels 와 동일) ──
const ARTICLE_ENUM_KO_MAP: Record<string, string> = {
  CALCULATION: '계산력',
  UNDERSTANDING: '이해력',
  PROBLEM_SOLVING: '문제해결력',
  'PROBLEM SOLVING': '문제해결력',
  REASONING: '추론력',
  NUMBER: '수와 연산',
  CHANGE_RELATION: '변화와 관계',
  SHAPE_MEASURE: '도형과 측정',
  DATA_POSSIBILITY: '자료와 가능성',
  // 옛 토큰 호환
  ALGEBRA: '변화와 관계',
  FUNCTION: '변화와 관계',
  GEOMETRY: '도형과 측정',
  STATISTICS: '자료와 가능성',
  // 영어 6유형·4능력 — 수학 텍스트엔 등장하지 않는 토큰이라 함께 둬도 안전
  GRAMMAR: '어법',
  VOCABULARY: '어휘',
  READING: '독해',
  LISTENING: '듣기',
  WRITING: '서술·영작',
  COMMUNICATION: '의사소통',
  ACCURACY: '정확성',
  EXPRESSION: '표현력',
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
    else return null;
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

function simplifyLatexInline(tex: string): string {
  let s = tex;
  s = s.replace(/\\sqrt\s*\{([^{}]+)\}/g, '√($1)');
  s = s.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1/$2');
  s = s.replace(/\\dfrac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1/$2');
  s = s.replace(/\\le\b/g, '≤').replace(/\\ge\b/g, '≥').replace(/\\ne\b/g, '≠');
  s = s.replace(/\\times\b/g, '×').replace(/\\cdot\b/g, '·').replace(/\\div\b/g, '÷');
  s = s.replace(/\\pi\b/g, 'π').replace(/\\theta\b/g, 'θ').replace(/\\sigma\b/g, 'σ')
       .replace(/\\alpha\b/g, 'α').replace(/\\beta\b/g, 'β').replace(/\\gamma\b/g, 'γ');
  s = s.replace(/\^\{([^{}]+)\}/g, (_, exp) => toSuperscript(exp) ?? `^${exp}`);
  s = s.replace(/\^([0-9+\-=n])/g, (_, exp) => toSuperscript(exp) ?? `^${exp}`);
  s = s.replace(/_\{([^{}]+)\}/g, (_, sub) => toSubscript(sub) ?? `_${sub}`);
  s = s.replace(/_([0-9nkij])/g, (_, sub) => toSubscript(sub) ?? `_${sub}`);
  s = s.replace(/\{([^{}]*)\}/g, '$1');
  return s;
}

function normalizeLatexForBlog(text: string): string {
  if (!text) return text;
  return text.replace(/\$([^$\n]+?)\$/g, (match, tex) => {
    const plain = simplifyLatexInline(tex);
    if (/\\[a-zA-Z]/.test(plain)) {
      try {
        return katex.renderToString(tex, {
          throwOnError: false,
          strict: false,
          output: 'html',
        });
      } catch {
        return match;
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
    examScope: unknown;
    /** 과목 — 페르소나·enum 규칙·태그의 과목명 분기용. 없으면 수학(기존 동작 유지). */
    subject?: string | null;
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

export interface BlueprintInfo {
  archetype: Archetype;
  reason: string;
  tone: ClosingTone;
  charts: ChartId[];
  gradeBands: GradeBand[];
  selectedModuleIds: string[];
}

export interface ArticleGenerationResult {
  title: string;
  content: string;       // HTML ({{CHART:*}} 토큰 포함)
  tags: string[];
  metaDescription: string;
  generatedAt: string;
  // ── 신규 (하위 호환을 위해 optional) ──
  archetype?: Archetype;
  blueprintInfo?: BlueprintInfo;
  antiPatternWarnings?: AntiPatternWarning[];
}

// ── 분석 헬퍼 (블로그 본문 정성 표현용) ──

function normalizeDiffNum(key: string | number | null | undefined): number | null {
  // 미정(판독 실패)은 3(응용)으로 채우지 않는다 — 집계에서 빼야 종합 난이도가 왜곡되지 않는다.
  if (key == null || key === '') return null;
  const k = String(key);
  const mapped = DIFFICULTY_LEGACY_MAP[k] || k;
  const n = Number(mapped);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : 3;
}

/** 배점-난이도 갭 분석 — display용 정형 라벨에 필요한 문항 리스트 추출 */
function calcPointsDifficultyGaps(questions: AnalyzedQuestion[]): {
  overpriced: Array<{ num: string | number; points: number; level: number }>;
  underpriced: Array<{ num: string | number; points: number; level: number }>;
} {
  if (questions.length === 0) return { overpriced: [], underpriced: [] };

  const sumByLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const cntByLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const q of questions) {
    const lv = normalizeDiffNum(q.difficulty);
    if (lv == null) continue;   // 미정 문항은 배점-난이도 통계에서 제외
    sumByLevel[lv] += q.points || 0;
    cntByLevel[lv]++;
  }
  const avgByLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (let i = 1; i <= 5; i++) avgByLevel[i] = cntByLevel[i] > 0 ? sumByLevel[i] / cntByLevel[i] : 0;

  const items = questions
    .map((q) => {
      const lv = normalizeDiffNum(q.difficulty);
      if (lv == null) return null;   // 미정 문항은 배점 과소·과대 판정 대상 아님
      const points = q.points || 0;
      const expected = avgByLevel[lv] || 3;
      const gap = points - expected;
      const gapRatio = expected > 0 ? Math.abs(gap) / expected : 0;
      return { num: q.question_number, points, level: lv, gap, gapRatio };
    })
    .filter((i): i is NonNullable<typeof i> => i != null && i.gapRatio > 0.3)
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

  const overpriced = items.filter((i) => i.gap > 0).slice(0, 3).map(({ num, points, level }) => ({ num, points, level }));
  const underpriced = items.filter((i) => i.gap < 0).slice(0, 3).map(({ num, points, level }) => ({ num, points, level }));
  return { overpriced, underpriced };
}

// ── 프롬프트 빌더 (thin orchestrator) ──

function buildArticlePrompt(
  input: ArticleGenerationInput,
  variables: ArticleVariables = {},
): { prompt: string; archetype: Archetype; blueprintInfo: BlueprintInfo } {
  const { examPaper, analysis, commentary } = input;

  const schoolName = examPaper.schoolName || '해당 학교';
  const grade = examPaper.grade || '';
  const subject = examPaper.subject ?? null;
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

  // 신호 → archetype → blueprint → 모듈 컴포지션
  const signals = classifySignals({
    questions: analysis.questions,
    totalQuestions: totalQ,
    totalPoints: totalPts,
    hasNearbyCompare: !!commentary.nearby_comparison,
  });
  const blueprint = buildBlueprint(signals);
  const subjectName = toExamSubjectKey(subject) === 'ENGLISH' ? '영어' : '수학';
  const selectedModules = composeBlueprint(signals, blueprint, schoolName, grade, subjectName);

  // 배점-난이도 갭 (display 라벨)
  const gaps = calcPointsDifficultyGaps(analysis.questions);
  const formatItem = (i: { num: string | number; points: number; level: number }) =>
    `${i.num}번(${i.points}점/Level ${i.level})`;
  const overpricedLabel = gaps.overpriced.length ? gaps.overpriced.map(formatItem).join(', ') : '(없음)';
  const underpricedLabel = gaps.underpriced.length ? gaps.underpriced.map(formatItem).join(', ') : '(없음)';

  // 난이도별 배점 합계
  const diffPoints = [0, 0, 0, 0, 0];
  for (const q of analysis.questions) {
    const d = String(q.difficulty);
    const lvl = d === 'concept' ? 0 : d === 'pattern' ? 1 : d === 'reasoning' ? 3 : d === 'creative' ? 4
      : (Number(d) >= 1 && Number(d) <= 5) ? Number(d) - 1 : 2;
    diffPoints[lvl] += q.points || 0;
  }

  // 형식 분포 (정규화 경유 — 변형 표기가 누락되지 않는다)
  const formats = formatDistribution(analysis.questions);

  // 종합 난이도 — **화면·총평과 반드시 같은 공식**(레벨별 영향력 가중 × 배점).
  // 주석은 "가중 평균"이라 써 있었지만 실제로는 단순 문항수 평균이었다 (적대적 리뷰 1.5).
  const { avg: weightedAvg } = weightedAverageDifficulty(analysis.questions);
  const overallLevel = weightedAvg > 0 ? Math.round(weightedAvg) : 3;

  // FactsBlockInput 구성
  const facts: FactsBlockInput = {
    schoolName, grade, scopeLabel, totalQ, totalPts, formats, overallLevel,
    diffCounts: signals.diffCounts,
    diffPoints,
    typeDistribution: analysis.summary.type_distribution as Record<string, number>,
    subject,   // 유형 라벨을 과목별로 고르기 위해 전달 (수학 라벨 주입 방지)
    topicStats: signals.topicStats.map((t) => ({ topic: t.topic, count: t.count, pts: t.pts })),
    commentary,
    discrim: { overallLabel: signals.discrimOverall, poorRatioLabel: signals.poorRatioLabel },
    overpricedLabel,
    underpricedLabel,
    essayInsight: signals.essayCount > 0 ? {
      essayCount: signals.essayCount,
      essayPts: signals.essayPts,
      weightPct: signals.essayWeightPct,
      avgLevelLabel: signals.essayAvgLevelLabel,
      topicsLabel: signals.essayTopicsLabel,
    } : null,
  };

  // 모듈 buildChunk에 전달할 컨텍스트
  const ctx: BuildChunkContext = {
    archetype: blueprint.archetype,
    blueprint,
    schoolName,
    grade,
    subjectName,
    variables,
  };

  // 프롬프트 조립
  const prompt = assembleArticlePrompt({
    systemBase: buildSystemBase(variables, subject),
    archetypeHeader: buildArchetypeHeader(blueprint),
    factsAndData: buildFactsAndDataBlock(facts),
    sectionGuides: buildSectionGuides(selectedModules, ctx, signals),
    formatRules: buildFormatRules(blueprint, schoolName, grade, subject),
    outputSchema: buildOutputSchema(blueprint, schoolName, grade),
  });

  return {
    prompt,
    archetype: blueprint.archetype,
    blueprintInfo: {
      archetype: blueprint.archetype,
      reason: blueprint.reason,
      tone: blueprint.tone,
      charts: blueprint.charts,
      gradeBands: blueprint.gradeBands,
      selectedModuleIds: selectedModules.map((sm) => sm.module.id),
    },
  };
}

// ── JSON 추출 (commentary-agent 패턴 + 정규식 partial fallback) ──

function extractJson(text: string): Record<string, unknown> {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : text.trim();

  const jsonStart = candidate.indexOf('{');
  const jsonEnd = candidate.lastIndexOf('}');
  const jsonStr = jsonStart >= 0 && jsonEnd > jsonStart
    ? candidate.slice(jsonStart, jsonEnd + 1)
    : candidate;

  try {
    return JSON.parse(jsonStr);
  } catch {
    // 무시
  }

  // 잘린 JSON 복구
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

  // 마지막 키-값 제거 후 재시도
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

  // 정규식 기반 partial 필드 추출
  const partial = extractFieldsByRegex(jsonStr);
  if (partial.title || partial.content) {
    return partial;
  }

  const tail = jsonStr.length > 200 ? `...${jsonStr.slice(-200)}` : '';
  throw new Error(
    `블로그 글 JSON 파싱 실패 (응답 길이 ${jsonStr.length}자, 토큰 한도 초과 가능성): ${jsonStr.slice(0, 200)}${tail}`,
  );
}

/**
 * JSON 전체 파싱이 실패해도 각 필드를 정규식으로 부분 추출.
 * Claude 가 max_tokens 한도 직전까지 출력하다 content 중간에서 잘려도, title/tags/metaDescription 은 살릴 수 있도록.
 */
/**
 * JSON.parse 실패한 raw 문자열에서 수동으로 escape 풀기.
 * 본문에 `\"답을 아는 것\"` 같은 raw escape가 그대로 남는 버그 방지용 안전망.
 * 순서 중요: \\ 를 마지막에 처리 (다른 escape보다 늦게 — 이미 풀린 \"를 다시 깨뜨리지 않도록)
 */
function unescapeJsonRaw(s: string): string {
  return s
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\//g, '/')
    .replace(/\\\\/g, '\\');
}

function extractFieldsByRegex(jsonStr: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const titleMatch = jsonStr.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (titleMatch) {
    try {
      result.title = JSON.parse(`"${titleMatch[1]}"`);
    } catch {
      result.title = unescapeJsonRaw(titleMatch[1]);
    }
  }

  const metaMatch = jsonStr.match(/"meta(?:Description|_description)"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (metaMatch) {
    try {
      result.metaDescription = JSON.parse(`"${metaMatch[1]}"`);
    } catch {
      result.metaDescription = unescapeJsonRaw(metaMatch[1]);
    }
  }

  const tagsMatch = jsonStr.match(/"tags"\s*:\s*(\[[^\]]*\])/);
  if (tagsMatch) {
    try {
      result.tags = JSON.parse(tagsMatch[1]);
    } catch {
      // 무시
    }
  }

  const contentFullMatch = jsonStr.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*[,}]/);
  if (contentFullMatch) {
    try {
      result.content = JSON.parse(`"${contentFullMatch[1]}"`);
    } catch {
      result.content = unescapeJsonRaw(contentFullMatch[1]);
    }
  } else {
    const contentStart = jsonStr.search(/"content"\s*:\s*"/);
    if (contentStart >= 0) {
      const after = jsonStr.slice(contentStart).match(/"content"\s*:\s*"([\s\S]*)$/);
      if (after) {
        let body = after[1];
        const nextKey = body.search(/",\s*"(?:tags|metaDescription|meta_description)"/);
        if (nextKey >= 0) body = body.slice(0, nextKey);
        body = body.replace(/"+$/, '');
        try {
          result.content = JSON.parse(`"${body}"`);
        } catch {
          result.content = unescapeJsonRaw(body);
        }
      }
    }
  }

  return result;
}

// ── 응답 후처리 + 안전망 변환 체인 ──

function processBlogText(s: string): string {
  return normalizeLatexForBlog(stripEnglishEnums(normalizeMathText(s)));
}

function buildResult(
  raw: Record<string, unknown>,
  archetype: Archetype,
  blueprintInfo: BlueprintInfo,
): ArticleGenerationResult {
  const content = processBlogText(String(raw.content || ''));
  return {
    title: processBlogText(String(raw.title || '')),
    content,
    tags: Array.isArray(raw.tags) ? raw.tags.map((t) => stripEnglishEnums(String(t))) : [],
    metaDescription: processBlogText(String(raw.metaDescription || raw.meta_description || '')),
    generatedAt: new Date().toISOString(),
    archetype,
    blueprintInfo,
    antiPatternWarnings: checkAntiPatterns(content),
  };
}

// ── 메인 생성 함수 (일괄) ──

export async function generateExamArticle(
  input: ArticleGenerationInput,
  variables: ArticleVariables = {},
): Promise<ArticleGenerationResult> {
  const { prompt, archetype, blueprintInfo } = buildArticlePrompt(input, variables);

  // 16K 토큰: 한글 본문(약 2,500~3,200자) + JSON 오버헤드 + HTML 마크업 여유
  const { text } = await generateText({
    label: 'article',
    user: prompt,
    maxTokens: 16384,
    temperature: 0.75,
  });

  if (!text) throw new Error('AI 응답이 비어있습니다');

  const raw = extractJson(text);
  return buildResult(raw, archetype, blueprintInfo);
}

// ── 스트리밍 생성 함수 (NDJSON용) ──

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onBlueprint?: (info: BlueprintInfo) => void;  // 스트림 시작 직후 archetype/모듈 정보 송신
}

export async function generateExamArticleStream(
  input: ArticleGenerationInput,
  callbacks: StreamCallbacks | ((text: string) => void),
  variables: ArticleVariables = {},
): Promise<ArticleGenerationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다');
  }

  // 하위 호환: 함수가 직접 전달되면 onDelta로 처리
  const cb: StreamCallbacks = typeof callbacks === 'function'
    ? { onDelta: callbacks }
    : callbacks;

  const client = new Anthropic({ apiKey });
  const { prompt, archetype, blueprintInfo } = buildArticlePrompt(input, variables);

  // 블루프린트 정보를 먼저 송신 (클라이언트가 archetype/모듈 표시용)
  cb.onBlueprint?.(blueprintInfo);

  let fullText = '';

  // ⚠️ 이 경로만 Anthropic 직결이다 — 토큰 단위 delta 가 필요해 commentary-llm(비스트리밍)을
  //    쓸 수 없다. 기능 자체가 비활성(V2_ARTICLE_ENABLED=false)이라 이중 프로바이더 스트리밍을
  //    새로 만들지 않았다. **재활성화한다면** 여기부터 게이트웨이에 스트리밍을 추가할 것.
  //    Sonnet 5 규격: temperature 금지(400), thinking 생략 시 adaptive 로 켜져 예산을 잠식.
  const stream = client.messages.stream({
    model: 'claude-sonnet-5',
    max_tokens: 16384,
    thinking: { type: 'disabled' },
    messages: [{ role: 'user', content: prompt }],
  });

  // 청크 버퍼 (너무 잦은 전송 방지)
  let buf = '';
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (buf.length > 0) {
      cb.onDelta(buf);
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
  flush();

  if (!fullText) throw new Error('AI 응답이 비어있습니다');

  if (finalMsg.stop_reason === 'max_tokens') {
    console.warn('[article-generator] stream max_tokens 도달 — 응답이 잘렸을 수 있음. partial 파싱 시도.');
  }

  const raw = extractJson(fullText);
  return buildResult(raw, archetype, blueprintInfo);
}
