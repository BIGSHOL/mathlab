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
import type { AnalyzedQuestion } from './types';
import type { CommentaryResult } from './agents/commentary-agent';
import { QUESTION_TYPE_LABELS } from './constants';

// ── 타입 ──

export interface ArticleGenerationInput {
  examPaper: {
    title: string;
    schoolName: string | null;
    grade: string | null;
    category: string | null;
    unit: string | null;
    examScope: string[] | null;
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

  return `당신은 수학 교육 전문 블로거이자 학원 원장입니다.
기출 시험 분석 데이터를 바탕으로 네이버 블로그에 게시할 전문적인 기출 분석 글을 작성합니다.

## 글의 목적
- 독자: 학부모 (수학을 잘 모르는 분들도 이해 가능해야 함)
- 목표: 학원의 전문성을 어필하여 학부모의 신뢰를 얻고 학원 방문을 유도
- 톤: "~입니다", "~됩니다" 전문가 톤. 데이터와 수치를 근거로 제시
- 절대 "~해요", "~거든요" 같은 친근한 구어체 사용 금지

## 시험 정보
- 학교: ${schoolName}
- 학년: ${grade}
- 시험 범위: ${examPaper.examScope?.join(', ') || examPaper.unit || '미지정'}
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

### 글 구조 (반드시 이 순서와 소제목을 따르세요)
1. **시험 개요** — 문항수, 배점, 형식, 종합 난이도를 한눈에 정리
2. **난이도 분석** — Level별 분포를 해석하고 학부모 관점에서 의미 설명. 끝에 {{CHART:difficulty}} 토큰 삽입
3. **출제 영역 분석** — 5대 영역 분포와 단원별 비중. 끝에 {{CHART:type_radar}} 토큰 삽입
4. **단원별 출제 현황** — 주요 단원 상세 분석. 끝에 {{CHART:topic_bar}} 토큰 삽입
5. **주목할 문항 분석** — 킬러 문항 3~5개의 출제 의도와 풀이 포인트
6. **등급별 점수 확보 전략** — A/B/C 등급별 구체적 전략
7. **학습 방향 제안** — 이 시험을 바탕으로 한 앞으로의 학습 방향
${commentary.nearby_comparison ? '8. **주변 학교 비교** — 인근 학교와의 난이도/출제 경향 비교 분석' : ''}

### 네이버 SEO 최적화 (C-Rank / D.I.A.)
- **제목**: 25~40자, 핵심 키워드(${schoolName} + 기출 분석)를 앞쪽 15자 이내에 배치
- **소제목**: <h2>로 각 섹션 구분. 최소 6개
- **키워드 밀도 (매우 중요!)**: "${schoolName}" 단독 최소 20회 + "${grade}" 최소 10회 + "기출 분석"/"중간고사"/"기말고사" 등 키워드를 합산 30회 이상 포함. 밀도 2.5% 이상 필수! 모든 <h2> 소제목과 각 문단 첫 문장에 학교명을 포함할 것. "해당 학교", "이번 시험" 같은 대명사 대신 항상 "${schoolName}"을 직접 쓸 것
- **문단**: 2~4문장씩 짧게 끊어 모바일 가독성 확보. 문장당 40자 이내 권장
- **이미지 위치**: {{CHART:difficulty}}, {{CHART:type_radar}}, {{CHART:topic_bar}} 토큰을 정확히 해당 섹션 끝에 삽입
- **태그**: #${schoolName.replace(/\s/g, '')} #기출분석 #${grade || '수학'} 등 7~10개
- **글 길이 (엄격 제한!)**: HTML 태그를 제외한 순수 텍스트 기준 2,500~3,200자. 3,500자 절대 초과 금지! 각 섹션을 핵심만 간결하게 작성. 불필요한 수식어와 반복 설명을 줄일 것

### HTML 서식 규칙 (필수! content는 반드시 네이버 블로그 호환 HTML로 작성)
- content 필드는 **HTML 형식**으로 작성. 마크다운(##, **, -) 사용 금지!
- 테이블(<table>) 사용 금지! 데이터는 <ul><li> 리스트나 <strong> 텍스트로 표현
- **소제목**: <h2>시험 개요</h2> 형태로 작성. 모든 섹션에 <h2> 사용
- **<h3> 사용 금지!** 네이버에서 글자 크기가 깨짐. 하위 제목은 <p><strong style="font-size: 17px;">A등급 전략</strong></p> 형태로 사용
- **개별 문항 제목**: <p><strong>서술형 3번 — Level 5 (13점)</strong></p> 형태로 <strong>만 사용
- **볼드**: <strong>중요 내용</strong>
- **리스트**: <ul><li>항목1</li><li>항목2</li></ul>
- **글자 크기 통일 (네이버 호환 필수!)**: 모든 <p>와 <li>에 style="font-size: 15px;" 추가. 네이버 블로그는 태그별 글자 크기가 다르므로 인라인 스타일로 통일할 것
- **문단 간격 (네이버 블로그 호환 필수!)**:
  - 모든 문단은 <p>텍스트</p> 태그로 감싸기
  - 문단과 문단 사이에 반드시 <p>&nbsp;</p>를 삽입하여 시각적 줄바꿈 확보
  - 섹션(<h2>) 앞에도 <p>&nbsp;</p> 삽입
  - 네이버 블로그는 <p> margin을 무시하므로, 빈 줄(<p>&nbsp;</p>)로 간격을 만들어야 함
- **색상 강조 (핵심 수치/키워드에 적용)**:
  - 핵심 점수/수치: <span style="color: #E03131">84점</span> (빨간색)
  - 등급 라벨: <span style="color: #1971C2">A등급</span> (파란색)
  - 난이도 키워드: <span style="color: #E8590C">심화</span> (주황색), <span style="color: #2F9E44">기본</span> (녹색)
  - 단원명 강조: <strong style="color: #6741D9">인수분해</strong> (보라색)
- **형광펜 (문맥별 다른 색상 사용! 전부 노란색 금지!)**:
  - 핵심 인사이트/요약: <mark style="background-color: #FFF3BF">핵심 메시지</mark> (노란색)
  - A등급 전략: <mark style="background-color: #D8F5A2">A등급 핵심 전략</mark> (연두색)
  - B등급 전략: <mark style="background-color: #BAE3FF">B등급 핵심 전략</mark> (하늘색)
  - C등급 전략: <mark style="background-color: #FFE8CC">C등급 핵심 전략</mark> (살구색)
  - 경고/주의 메시지: <mark style="background-color: #FFD8D8">주의 사항</mark> (분홍색)
  - 단원/영역 강조: <mark style="background-color: #E8DEFF">영역 이름</mark> (연보라색)
- **<blockquote> 사용 금지!** 네이버 블로그에서 거대한 인용 스타일로 변환됨. 대신 <p><mark style="background-color: #FFF3BF">핵심 메시지</mark></p> 형광펜으로 강조
- 차트 이미지 위치: {{CHART:difficulty}}, {{CHART:type_radar}}, {{CHART:topic_bar}} 토큰만 삽입 (img 태그 아님)

### 서식 적용 가이드라인
- 각 섹션 도입부의 핵심 메시지 1문장은 <mark> 형광펜 처리 (섹션마다 다른 색상 사용!)
- 점수, 문항수, 퍼센트 등 숫자 데이터는 <strong style="color: #E03131"> 빨간 볼드
- Level 1~5 키워드는 난이도별 색상 적용 (1=녹색, 2=라임, 3=주황, 4=오렌지, 5=빨강)
- 등급별 전략의 등급 라벨(A/B/C)은 파란 볼드
- 단원명은 보라 볼드
- blockquote 대신 형광펜(<mark>)으로 핵심 인사이트 강조
- **형광펜 색상 배분 규칙** (같은 색상만 반복 사용 절대 금지!):
  - 시험 개요 섹션 → 노란색 형광 (#FFF3BF)
  - 난이도 분석 섹션 → 분홍색 형광 (#FFD8D8)
  - 출제 영역 분석 → 연보라색 형광 (#E8DEFF)
  - 단원별 출제 현황 → 살구색 형광 (#FFE8CC)
  - 주목할 문항 → 노란색 형광 (#FFF3BF)
  - A등급 전략 → 연두색 형광 (#D8F5A2), B등급 → 하늘색 (#BAE3FF), C등급 → 살구색 (#FFE8CC)
  - 학습 방향 제안 → 하늘색 형광 (#BAE3FF)

### 표현 규칙
- 종합 난이도 Level ${overallLevel}에 맞는 표현만 사용
- Level 1~2 시험에 "킬러", "최고난도", "변별력" 사용 금지
- Level 3 시험에 "최상위 변별" 사용 금지
- 과장 표현 금지. 수치와 데이터로만 근거 제시
- "이번 시험" 대신 "${schoolName} ${grade} 시험"으로 구체적 표기
- **자명한 환산 금지**: 100점 만점 시험에서 "N점으로 전체의 N%"처럼 점수=퍼센트가 자명한 경우 퍼센트를 적지 말 것 (예: ✗ "35점으로 전체의 35%"). 단, 문항수 대비 비율은 유용하므로 표기 (예: ✓ "9문항이 출제되어 43%")

### 학원 홍보 (자연스럽게)
- 글 마지막에 "저희 학원에서는 이러한 출제 경향을 반영하여..." 식의 자연스러운 마무리
- 과도한 광고 금지. 전문적 분석에 집중

## 출력 형식 (반드시 아래 JSON으로만 응답)
{
  "title": "블로그 제목 (25~40자, 키워드 앞쪽 배치)",
  "content": "HTML 본문 (<h2>, <h3>, <p>, <p>&nbsp;</p>, <strong>, <ul><li>, <mark>, <span style=color>, {{CHART:*}} 포함. blockquote 금지!)",
  "tags": ["#태그1", "#태그2", "..."],
  "metaDescription": "검색 결과 미리보기용 설명 (50~120자, 키워드 포함)"
}`;
}

// ── JSON 추출 (commentary-agent 패턴 재사용) ──

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

  throw new Error(`블로그 글 JSON 파싱 실패: ${jsonStr.slice(0, 200)}...`);
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
    max_tokens: 8192,
    temperature: 0.6,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  if (!text) throw new Error('AI 응답이 비어있습니다');

  const raw = extractJson(text);

  return {
    title: String(raw.title || ''),
    content: String(raw.content || ''),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    metaDescription: String(raw.metaDescription || raw.meta_description || ''),
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
    max_tokens: 8192,
    temperature: 0.6,
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

  await stream.finalMessage();
  flush(); // 남은 버퍼 전송

  if (!fullText) throw new Error('AI 응답이 비어있습니다');

  const raw = extractJson(fullText);

  return {
    title: String(raw.title || ''),
    content: String(raw.content || ''),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    metaDescription: String(raw.metaDescription || raw.meta_description || ''),
    generatedAt: new Date().toISOString(),
  };
}
