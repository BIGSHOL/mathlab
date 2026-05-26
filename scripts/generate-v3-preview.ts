/**
 * V3 리디자인 시안 생성 스크립트 (Phase 0)
 *
 * 가장 최근 ExamAnalysis 1건을 선택해 V3 디자인 시안 2개를 생성:
 *  - data/handoff-exam-analysis-v3/preview/commentary-merged.html (앱 화면, NYT Science 톤)
 *  - data/handoff-exam-analysis-v3/preview/naver-blog-merged.html (네이버 블로그, Q&A 인터뷰)
 *  - data/handoff-exam-analysis-v3/preview/_data.json (사용된 데이터 스냅샷)
 *
 * 사용: npx tsx scripts/generate-v3-preview.ts
 * 옵션: --examPaperId=<id>  지정 시 해당 시험지 사용 (생략 시 가장 최근)
 */

import { config as dotenvConfig } from 'dotenv';
import { join } from 'path';
// .env.local 우선 + .env 폴백 (Next.js와 동일 순서)
// override:true — 이미 빈 값으로 설정된 환경변수도 .env 값으로 덮어씀
dotenvConfig({ path: join(process.cwd(), '.env.local'), override: true });
dotenvConfig({ path: join(process.cwd(), '.env'), override: false });

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { prisma } from '../src/lib/db';
import { generateAllChartImages } from '../src/lib/exam-analysis/chart-image-generator';
import { buildCommentaryHtml, buildNaverBlogHtml } from './generate-v3-preview-html';
import type { AnalyzedQuestion, BasicAnalysisResult } from '../src/lib/exam-analysis/types';

// ── V3 신규 필드 타입 (Phase 1 이전 임시 정의) ──

export interface V3Extension {
  blog_kicker?: string;
  blog_headline?: string;
  blog_dek?: string;
  feature_callout?: {
    big_number: string;
    big_number_unit?: string;
    big_number_label: string;
    title: string;
    body: string[];
  };
  grade_cuts?: Array<{
    grade: string;
    score: number;
    previous_score?: number;
    delta?: number;
    student_count?: number;
  }>;
  topic_performance?: Array<{
    topic: string;
    question_count: number;
    correct_rate: number;
    label: 'strong' | 'weak' | 'neutral';
  }>;
  blog_qa?: Array<{
    question: string;
    answer: string[];
    data_box?: {
      label: string;
      kind: 'comparison' | 'bars' | 'table';
      rows: Array<{ label: string; value: string; highlight?: boolean }>;
    };
  }>;
  conclusion?: {
    kicker?: string;
    body: string;
  };
  pull_quote?: {
    text: string;
    cite?: string;
  };
}

export interface ExistingCommentary {
  overall_comment: string;
  score_strategies?: Array<{ grade: string; target: string; points?: string[] }>;
  strength_areas?: string[];
  improvement_areas?: string[];
  notable_questions?: Array<{ question_number: number | string; comment: string }>;
  teaching_recommendations?: Array<{ priority: number; topic: string; reason: string }>;
  nearby_comparison?: string;
}

export type MergedCommentary = ExistingCommentary & V3Extension;

// ── V3 시스템 프롬프트 (blog-prompt-spec.md 기반) ──

function buildV3SystemPrompt(): string {
  return `너는 한국 중·고등학교 수학 시험 분석가다. 학원이 학부모에게 보여줄 블로그 글을 위한 신규 V3 필드를 생성한다.

## 출력 형식 — 오직 아래 키만 포함한 JSON 객체 하나만 출력 (코드펜스/설명문 금지)

{
  "blog_kicker": "시험 분석 · {학교명} {학년} {시험명}",
  "blog_headline": "시험의 핵심을 한 문장으로 (예: 변별의 무게중심이 이동했다)",
  "blog_dek": "헤드라인을 풀어 설명하는 1~2 문장 부연",
  "feature_callout": {
    "big_number": "강조할 단일 숫자 (예: 2.9, 17%, -4점)",
    "big_number_unit": "단위 (예: /5, 점, %) — 없으면 생략",
    "big_number_label": "그 숫자가 무엇인지 (예: 2025 평균 난이도)",
    "title": "거대 숫자를 풀어 설명하는 헤드라인 — 일부에 따옴표로 강조 가능 (예: 30문항 중 '17%만' 킬러였다)",
    "body": ["2~3 문단 부연 설명 — **굵게**로 데이터 인용"]
  },
  "blog_qa": [
    {
      "question": "학부모 시점의 자연스러운 질문 ('우리 아이...' 같은 친근한 톤)",
      "answer": ["1~2 문단. 데이터 인용은 **굵게**. '~습니다' 존댓말로 통일."],
      "data_box": {
        "label": "DATA · 무엇에 관한 데이터인지",
        "kind": "comparison | bars | table",
        "rows": [{ "label": "행 라벨", "value": "값 또는 % 문자열 (예: 80%)", "highlight": false }]
      }
    }
  ],
  "grade_cuts": [
    { "grade": "1등급", "score": 88, "previous_score": 92, "delta": -4, "student_count": 3 }
  ],
  "topic_performance": [
    { "topic": "단원명", "question_count": 8, "correct_rate": 0.80, "label": "strong" }
  ],
  "conclusion": {
    "kicker": "CONCLUSION · 다음 시험을 준비하는 학생에게",
    "body": "2~3 문장 행동 지침"
  },
  "pull_quote": {
    "text": "시험 핵심을 짧게 압축한 한 문장",
    "cite": "출처 라벨 (예: 매스랩 AI 분석)"
  }
}

## blog_qa 5문항 — 정확한 패턴

- Q1: 시험이 작년 대비 어떻게 변했나? (난이도·구성)
- Q2: 우리 아이 점수가 안 나온 단원은 어디인가? (단원별 정답률 기반) — data_box.kind="bars"
- Q3: 1등급 받으려면 몇 점이 필요한가? (등급 컷) — data_box.kind="table" (학생 응답 데이터 있을 때만)
- Q4: 인근 학교 대비 우리 학교 시험은 어떤가? (학교 비교) — schoolId 없으면 이 질문 생략하고 4문항으로
- Q5: 다음 시험을 위해 학생은 뭘 해야 하나? (구체 액션 3개)

## 절대 규칙

1. **데이터에 없는 숫자/이름을 지어내지 말 것.** 학생 응답 분포가 없으면 grade_cuts는 빈 배열. 학교 정보 없으면 Q4 생략.
2. **영문 enum 금지** — 능력영역은 "계산력/이해력/문제해결력/추론력", 유형은 "수와 연산/문자와 식/함수/기하/확률과 통계". CALCULATION, NUMBER 같은 영문 토큰 한 글자도 출력 금지.
3. **\\dfrac 금지, \\text{한글} 금지.** 단순 정수·점수·한글에 \$ 사용 금지 (보기번호 ①②③④⑤, ㄱㄴㄷ 제외).
4. **존댓말 "~습니다" 통일.** 평어체 섞지 말 것.
5. **answer 문단은 3~4줄 이내.** 짧게 끊어 쓰기.
6. **데이터 인용은 \`**굵게**\` 마크다운**.
7. **충분히 못 채우는 필드는 undefined.** 거짓 placeholder 금지.
8. blog_qa 항목은 최소 3개 이상. 5개 미만이어도 OK (정직성 우선).

## 톤 가이드

학부모가 읽는다는 전제. 어려운 입시 용어를 풀어쓰기. 데이터는 반드시 본문에 인용. "이번 시험은 어렵다"가 아니라 "**88점**이 1등급 컷이다" 식.`;
}

// ── 시험 데이터 → AI 프롬프트 ──

function buildUserPrompt(opts: {
  examPaper: { title: string; grade: string; schoolName: string | null };
  basic: BasicAnalysisResult;
  existing: ExistingCommentary;
  topicBreakdown: Array<{ topic: string; count: number; correct: number; total: number; pts: number }>;
  hasStudentData: boolean;
  hasSchool: boolean;
}): string {
  const { examPaper, basic, existing, topicBreakdown, hasStudentData, hasSchool } = opts;
  const types = basic.summary.type_distribution;
  const diff = basic.summary.difficulty_distribution;
  const totalQ = basic.questions.length;
  const totalPts = basic.exam_info.total_points;

  // 가중 평균 난이도
  const counts = [diff['1'] || 0, diff['2'] || 0, diff['3'] || 0, diff['4'] || 0, diff['5'] || 0];
  const sum = counts.reduce((s, c) => s + c, 0);
  const weighted = sum > 0 ? counts.reduce((s, c, i) => s + c * (i + 1), 0) / sum : 0;

  const topicsLine = topicBreakdown
    .map((t) => hasStudentData
      ? `${t.topic}: ${t.count}문항(${t.pts}점), 정답률 ${t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0}%`
      : `${t.topic}: ${t.count}문항(${t.pts}점)`)
    .join('\n');

  return `## 시험 정보
- 학교: ${examPaper.schoolName ?? '(정보 없음)'} ${hasSchool ? '' : '(주변 학교 비교 불가)'}
- 학년/시험: ${examPaper.grade} · ${examPaper.title}
- 규모: 총 ${totalQ}문항, ${totalPts}점
- 평균 난이도(가중): ${weighted.toFixed(1)} / 5
- 난이도 분포: 기본(1) ${counts[0]} · 표준(2) ${counts[1]} · 응용(3) ${counts[2]} · 심화(4) ${counts[3]} · 최고난도(5) ${counts[4]}
- 형식: 객관식 ${basic.exam_info.format_distribution.objective}문항, 단답형 ${basic.exam_info.format_distribution.short_answer}문항, 서술형 ${basic.exam_info.format_distribution.essay}문항
- 유형: 수와연산 ${types.number || 0}, 문자와식 ${types.algebra || 0}, 함수 ${types.function || 0}, 기하 ${types.geometry || 0}, 확률통계 ${types.statistics || 0}
- 학생 응답 데이터: ${hasStudentData ? '있음' : '없음 (출제 분석만 가능)'}

## 단원별 출제 (상위 ${topicBreakdown.length}개)
${topicsLine}

## 기존 AI 총평 (참고용)
- overall_comment: ${existing.overall_comment.slice(0, 600)}
- strength_areas: ${(existing.strength_areas || []).join(' / ')}
- improvement_areas: ${(existing.improvement_areas || []).join(' / ')}
- nearby_comparison: ${existing.nearby_comparison ? existing.nearby_comparison.slice(0, 400) : '(없음)'}

위 데이터로 위 출력 형식의 V3 신규 필드 JSON을 작성하세요. **데이터에 없는 숫자/이름을 지어내지 말 것.** 학생 응답이 없으면 grade_cuts는 빈 배열. 학교 정보가 없으면 Q4 (학교 비교)를 생략하고 4문항만 작성.`;
}

// ── Claude 호출 ──

async function generateV3Fields(opts: Parameters<typeof buildUserPrompt>[0]): Promise<V3Extension> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다');

  const client = new Anthropic({ apiKey });
  const system = buildV3SystemPrompt();
  const user = buildUserPrompt(opts);

  console.log('[v3-preview] Claude 호출 중 (V3 신규 필드 생성)...');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16384,
    temperature: 0.6,
    system,
    messages: [{ role: 'user', content: user }],
  });

  if (response.stop_reason === 'max_tokens') {
    console.warn('[v3-preview] max_tokens 도달 — 응답이 잘렸을 수 있음');
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  // JSON 추출
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error(`Claude V3 응답에서 JSON 객체를 찾을 수 없음: ${text.slice(0, 200)}`);
  }
  let json = text.slice(start, end + 1);
  // JSON 정규화: AI가 종종 undefined / trailing comma 를 출력 → null + 제거
  json = json.replace(/:\s*undefined/g, ': null');
  json = json.replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.parse(json) as V3Extension;
  } catch (e) {
    throw new Error(`V3 JSON 파싱 실패: ${(e as Error).message}\n원본: ${json.slice(0, 500)}`);
  }
}

// ── 단원별 통계 (학생 응답 포함) ──

function buildTopicBreakdown(questions: AnalyzedQuestion[]): Array<{ topic: string; count: number; correct: number; total: number; pts: number }> {
  const stats: Record<string, { count: number; correct: number; total: number; pts: number }> = {};
  for (const q of questions) {
    const raw = q.topic || '미분류';
    const parts = raw.split('>').map((s) => s.trim());
    const t = parts[parts.length - 1];
    if (!stats[t]) stats[t] = { count: 0, correct: 0, total: 0, pts: 0 };
    stats[t].count++;
    stats[t].pts += q.points || 0;
    if (q.is_correct !== null) {
      stats[t].total++;
      if (q.is_correct === true) stats[t].correct++;
    }
  }
  return Object.entries(stats)
    .map(([topic, s]) => ({ topic, ...s }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

// ── 메인 ──

async function main() {
  console.log('[v3-preview] 시작...');

  // 옵션 파싱
  const argExamPaperId = process.argv.find((a) => a.startsWith('--examPaperId='))?.split('=')[1];
  const useCache = process.argv.includes('--use-cache');

  // 1. 분석본 선택
  const analysis = await prisma.examAnalysis.findFirst({
    where: {
      analyzedAt: { not: null },
      ...(argExamPaperId ? { examPaperId: argExamPaperId } : {}),
    },
    orderBy: { analyzedAt: 'desc' },
    include: { examPaper: { include: { school: true } } },
  });

  if (!analysis) {
    throw new Error('완료된 ExamAnalysis 가 없습니다. 먼저 분석을 1건 실행하세요.');
  }

  console.log(`[v3-preview] 선택된 분석본: ExamPaper="${analysis.examPaper.title}" / 학교=${analysis.examPaper.school?.name ?? '(없음)'} / analyzedAt=${analysis.analyzedAt?.toISOString()}`);

  // 2. 기본 분석 데이터 캐스팅
  // questions/summary는 Json — Json? 정규화 패턴 (CLAUDE.md 11번 규칙)
  const rawQuestions = analysis.questions;
  const rawSummary = analysis.summary;
  if (!Array.isArray(rawQuestions)) {
    throw new Error('analysis.questions 가 배열이 아닙니다');
  }
  if (!rawSummary || typeof rawSummary !== 'object') {
    throw new Error('analysis.summary 가 객체가 아닙니다');
  }
  const questions = rawQuestions as unknown as AnalyzedQuestion[];
  const summary = rawSummary as unknown as BasicAnalysisResult['summary'];

  const totalPts = analysis.totalPoints ?? questions.reduce((s, q) => s + (q.points || 0), 0);
  const basic: BasicAnalysisResult = {
    exam_info: {
      total_questions: questions.length,
      total_points: totalPts,
      school_name: analysis.examPaper.school?.name ?? analysis.examPaper.schoolName ?? null,
      format_distribution: {
        objective: questions.filter((q) => q.question_format === 'objective').length,
        short_answer: questions.filter((q) => q.question_format === 'short_answer').length,
        essay: questions.filter((q) => q.question_format === 'essay').length,
      },
    },
    summary,
    questions,
  };

  // 3. 기존 commentary 결과 (재사용)
  const commentaryExt = await prisma.examAnalysisExtension.findFirst({
    where: { analysisId: analysis.id, agentType: 'commentary' },
  });

  let existing: ExistingCommentary;
  if (commentaryExt && commentaryExt.result && typeof commentaryExt.result === 'object') {
    existing = commentaryExt.result as unknown as ExistingCommentary;
    console.log('[v3-preview] 기존 commentary 결과 재사용');
  } else {
    console.warn('[v3-preview] 기존 commentary 결과가 없습니다. 빈 기본값 사용 (V3 신규 필드만 생성).');
    existing = {
      overall_comment: '',
      strength_areas: [],
      improvement_areas: [],
      notable_questions: [],
    };
  }

  // 4. V3 신규 필드 생성 (Claude) — --use-cache 면 기존 _data.json 재사용
  const topicBreakdown = buildTopicBreakdown(questions);
  const hasStudentData = questions.some((q) => q.is_correct !== null);
  const hasSchool = !!analysis.examPaper.school;
  const cacheDataPath = join(process.cwd(), 'data', 'handoff-exam-analysis-v3', 'preview', '_data.json');

  let v3: V3Extension;
  if (useCache && existsSync(cacheDataPath)) {
    try {
      const cached = JSON.parse(readFileSync(cacheDataPath, 'utf8'));
      if (cached.meta?.examPaperId === analysis.examPaperId && cached.v3) {
        v3 = cached.v3 as V3Extension;
        console.log(`[v3-preview] 캐시 사용 — Claude 호출 스킵 (blog_qa: ${v3.blog_qa?.length ?? 0}개)`);
      } else {
        console.log('[v3-preview] 캐시 examPaperId 불일치 → 새로 호출');
        v3 = await generateV3Fields({
          examPaper: { title: analysis.examPaper.title, grade: analysis.examPaper.grade, schoolName: analysis.examPaper.school?.name ?? analysis.examPaper.schoolName },
          basic, existing, topicBreakdown, hasStudentData, hasSchool,
        });
        console.log(`[v3-preview] V3 필드 생성 완료 — blog_qa: ${v3.blog_qa?.length ?? 0}개, grade_cuts: ${v3.grade_cuts?.length ?? 0}개`);
      }
    } catch (e) {
      console.warn('[v3-preview] 캐시 파싱 실패, 새로 호출:', (e as Error).message);
      v3 = await generateV3Fields({
        examPaper: { title: analysis.examPaper.title, grade: analysis.examPaper.grade, schoolName: analysis.examPaper.school?.name ?? analysis.examPaper.schoolName },
        basic, existing, topicBreakdown, hasStudentData, hasSchool,
      });
    }
  } else {
    v3 = await generateV3Fields({
      examPaper: { title: analysis.examPaper.title, grade: analysis.examPaper.grade, schoolName: analysis.examPaper.school?.name ?? analysis.examPaper.schoolName },
      basic, existing, topicBreakdown, hasStudentData, hasSchool,
    });
    console.log(`[v3-preview] V3 필드 생성 완료 — blog_qa: ${v3.blog_qa?.length ?? 0}개, grade_cuts: ${v3.grade_cuts?.length ?? 0}개`);
  }

  // 5. 차트 4종 PNG 생성
  console.log('[v3-preview] 차트 4종 PNG 생성 중...');
  const charts = await generateAllChartImages(summary as { difficulty_distribution: Record<string, number>; type_distribution: Record<string, number> }, questions);
  console.log('[v3-preview] 차트 생성 완료');

  // 6. 머지
  const merged: MergedCommentary = { ...existing, ...v3 };

  // 7. 메타
  const meta = {
    examPaperId: analysis.examPaperId,
    examTitle: analysis.examPaper.title,
    grade: analysis.examPaper.grade,
    schoolName: analysis.examPaper.school?.name ?? analysis.examPaper.schoolName,
    analyzedAt: analysis.analyzedAt?.toISOString() ?? null,
    totalQuestions: questions.length,
    totalPoints: totalPts,
    hasStudentData,
    hasSchool,
  };

  // 8. HTML 작성
  const commentaryHtml = buildCommentaryHtml({ commentary: merged, charts, meta, summary, questions });
  const naverBlogHtml = buildNaverBlogHtml({ commentary: merged, charts, meta, summary, questions });

  // 9. 출력 폴더
  const outDir = join(process.cwd(), 'data', 'handoff-exam-analysis-v3', 'preview');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  writeFileSync(join(outDir, 'commentary-merged.html'), commentaryHtml, 'utf8');
  writeFileSync(join(outDir, 'naver-blog-merged.html'), naverBlogHtml, 'utf8');
  writeFileSync(
    join(outDir, '_data.json'),
    JSON.stringify(
      {
        meta,
        existing,
        v3,
        topicBreakdown,
        summary,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log('[v3-preview] 완료!');
  console.log(`  → ${join(outDir, 'commentary-merged.html')}`);
  console.log(`  → ${join(outDir, 'naver-blog-merged.html')}`);
  console.log(`  → ${join(outDir, '_data.json')}`);
}

main()
  .catch((e) => {
    console.error('[v3-preview] 실패:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
