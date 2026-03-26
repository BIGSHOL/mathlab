/**
 * 초등 개념 빈칸 문제 일괄 생성 스크립트
 *
 * /api/concepts/bulk/extract-blanks와 동일한 로직:
 * 1. Gemini로 easy/hard 용어 추출
 * 2. buildMergedExercise()로 템플릿 생성
 * 3. addFullSentenceBlanks()로 통문장 빈칸 추가
 * 4. BlankExercise DB에 저장
 */

import { GoogleGenAI, Type } from '@google/genai';
import { PrismaClient } from '@prisma/client';
import { buildMergedExercise, addFullSentenceBlanks, type BlankDifficulty } from '../src/lib/utils/blank-generator';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error('GEMINI_API_KEY 없음'); process.exit(1); }
const ai = new GoogleGenAI({ apiKey });

const BLANK_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    blanks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING, description: '빈칸으로 만들 용어 (원문 그대로)' },
          difficulty: { type: Type.STRING, description: 'easy=1단계 핵심 빈칸, hard=2단계 추가 빈칸' },
        },
        required: ['term', 'difficulty'],
      },
    },
  },
  required: ['blanks'],
};

function buildPrompt(title: string, fullContent: string): string {
  return `당신은 한국 수학 교육 전문가입니다.

아래 수학 개념 설명을 읽고, 학생이 빈칸 채우기로 학습할 **수학적으로 의미 있는 용어**를 추출하세요.

## 학습 흐름
학생은 다음 순서로 개념을 학습합니다:
1. 완전한 문장을 읽고 개념을 이해한다 (개념학습 단계)
2. **easy 빈칸**만 채워본다 → 핵심 뼈대를 가볍게 복습
3. **easy + hard 빈칸**을 모두 채워본다 → 더 꼼꼼히 내용 파악
4. 통문장 빈칸 (코드가 자동 생성) → 거의 모든 단어가 빈칸

따라서 easy는 "쉬운 용어"가 아니라 "먼저 연습할 핵심 키워드"이고,
hard는 "어려운 용어"가 아니라 "2단계에서 추가로 채울 용어"입니다.

제목: ${title}
내용: ${fullContent}

## easy (1단계 빈칸)
개념의 뼈대가 되는 핵심 키워드. 한번 읽은 뒤 가볍게 떠올릴 수 있어야 할 것들.
- 정의되는 용어: "~을(를) ~라 한다"에서 정의명
- 공식의 핵심 구성요소: 밑변, 높이, 반지름 등
- 분류/종류명: 정삼각형, 이등변삼각형, 정육면체 등
- 개수는 콘텐츠 길이에 따라 자연스럽게 (짧으면 2-3개, 길면 6-8개)

## hard (2단계 추가 빈칸)
easy에 포함되지 않은, 수학적으로 의미 있는 나머지 용어.
- 성질/조건/관계 용어: "평행", "수직", "합동", "같다" 등
- 공식의 부가 요소, 단위, 수학 기호가 포함된 표현
- 수식($...$) 중 개념 이해에 필수적인 것
- 개수를 억지로 채우지 말 것 — 수학과 무관한 일반 서술어는 절대 선택하지 마세요

## 규칙
1. 원문에 정확히 존재하는 단어/표현만 선택 (변형/축약 금지)
2. 조사(은/는/이/가/을/를/의/에/에서/로)는 분리하여 제외
3. 일반적 단어 제외: "수", "값", "식", "것", "때", "경우", "예를 들어", "바꾸어", "맞추어", "나타내면" 등
4. 같은 용어가 여러 번 나오면 한 번만 포함
5. **복합 용어는 통째로 선택**: "자연수 부분", "소수점 아래 첫째 자리", "한 모서리의 길이" 등 여러 단어가 하나의 수학 개념을 이루면 분리하지 말고 통째로
6. **예시 속 구체값 제외**: "예) $2.3$과 $1.5$를 비교하면..." 같은 예시에서 $2.3$, $1.5$ 등 특정 숫자값은 빈칸 대상이 아닙니다. 단, 공식이나 단위($1\\text{cm}^3$ 등)는 선택 가능
7. **$...$ 수식은 통째로**: $ 기호를 포함하여 선택 (예: "$a^2$" O, "a^2" X)
8. **절대 금지**: (1), (2), ①, ②, #1 같은 번호 매기기, 순수 숫자
9. **절대 금지**: □, ▢, ■, ☐ 같은 도형 기호 (학생이 입력 불가)`;
}

interface AiBlankResult {
  blanks: { term: string; difficulty: string }[];
}

async function extractAndBuild(conceptId: string, title: string, fullContent: string) {
  // 1. Gemini로 용어 추출
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: buildPrompt(title, fullContent),
    config: {
      responseMimeType: 'application/json',
      responseSchema: BLANK_RESPONSE_SCHEMA,
    },
  });

  if (!response.text) return null;

  let jsonStr = response.text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
  }

  const data = JSON.parse(jsonStr) as AiBlankResult;
  if (!data.blanks || data.blanks.length === 0) return null;

  // 2. terms 매핑
  const terms = data.blanks.map(b => ({
    term: b.term,
    difficulty: (b.difficulty === 'hard' ? 'hard' : 'easy') as BlankDifficulty,
  }));

  // 3. 빈칸 Exercise 빌드
  const merged = buildMergedExercise(fullContent, terms, false);
  if (!merged) return null;

  // 4. 통문장 빈칸 추가
  const withFull = addFullSentenceBlanks(merged);

  return {
    conceptId,
    templateText: withFull.templateText,
    blanks: withFull.blanks.map(b => ({
      position: b.position,
      answer: b.answer,
      hint: b.hint,
      difficulty: b.difficulty,
    })),
  };
}

async function main() {
  const concepts = await prisma.concept.findMany({
    where: { grade: { startsWith: 'elementary_' } },
    select: { id: true, conceptCode: true, title: true, fullContent: true, grade: true },
    orderBy: [{ grade: 'asc' }, { conceptCode: 'asc' }],
  });

  console.log(`초등 개념 ${concepts.length}개 빈칸 생성 시작...\n`);

  // 기존 초등 빈칸 삭제
  const existingIds = concepts.map(c => c.id);
  const deleted = await prisma.blankExercise.deleteMany({
    where: { conceptId: { in: existingIds } },
  });
  if (deleted.count > 0) console.log(`기존 빈칸 삭제: ${deleted.count}개`);

  let success = 0, failed = 0;
  const BATCH_SIZE = 5;
  const DELAY_MS = 1000;

  for (let i = 0; i < concepts.length; i += BATCH_SIZE) {
    const batch = concepts.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(c => extractAndBuild(c.id, c.title, c.fullContent || '')),
    );

    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const code = batch[j].conceptCode;

      if (r.status === 'rejected') {
        failed++;
        console.log(`  ✗ ${code}: ${String(r.reason).substring(0, 80)}`);
        continue;
      }

      const val = r.value;
      if (!val || val.blanks.length === 0) {
        failed++;
        console.log(`  ✗ ${code}: 빈칸 생성 실패`);
        continue;
      }

      // DB 저장 (level=1로 통합 저장, per-blank difficulty 태깅)
      await prisma.blankExercise.create({
        data: {
          conceptId: val.conceptId,
          level: 1,
          templateText: val.templateText,
          blanks: val.blanks,
        },
      });
      success++;

      const easyCount = val.blanks.filter(b => b.difficulty === 'easy').length;
      const hardCount = val.blanks.filter(b => b.difficulty === 'hard').length;
      const fullCount = val.blanks.filter(b => b.difficulty === 'full').length;
    }

    const done = Math.min(i + BATCH_SIZE, concepts.length);
    const pct = ((done / concepts.length) * 100).toFixed(0);
    console.log(`[${pct}%] ${done}/${concepts.length} (성공:${success} 실패:${failed})`);

    if (i + BATCH_SIZE < concepts.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n=== 완료 ===`);
  console.log(`성공: ${success}개`);
  console.log(`실패: ${failed}개`);

  // 검증
  console.log(`\n=== 검증 ===`);
  const afterConcepts = await prisma.concept.findMany({
    where: { grade: { startsWith: 'elementary_' } },
    select: {
      conceptCode: true, grade: true,
      blanks: { select: { blanks: true } },
    },
    orderBy: [{ grade: 'asc' }],
  });

  const gradeStats: Record<string, { total: number; withBlanks: number; avgEasy: number; avgHard: number; avgFull: number }> = {};

  for (const c of afterConcepts) {
    const g = c.grade!.replace('elementary_', '초');
    if (!gradeStats[g]) gradeStats[g] = { total: 0, withBlanks: 0, avgEasy: 0, avgHard: 0, avgFull: 0 };
    gradeStats[g].total++;

    if (c.blanks.length > 0) {
      gradeStats[g].withBlanks++;
      const allBlanks = c.blanks[0].blanks as any[];
      const easy = allBlanks.filter((b: any) => b.difficulty === 'easy').length;
      const hard = allBlanks.filter((b: any) => b.difficulty === 'hard').length;
      const full = allBlanks.filter((b: any) => b.difficulty === 'full').length;
      gradeStats[g].avgEasy += easy;
      gradeStats[g].avgHard += hard;
      gradeStats[g].avgFull += full;
    }
  }

  console.log('학년 | 개수 | 빈칸있음 | 평균easy | 평균hard | 평균full');
  for (const [g, s] of Object.entries(gradeStats)) {
    const n = s.withBlanks || 1;
    console.log(`${g}  | ${s.total}  | ${s.withBlanks}     | ${(s.avgEasy/n).toFixed(1)}     | ${(s.avgHard/n).toFixed(1)}     | ${(s.avgFull/n).toFixed(1)}`);
  }

  // 샘플
  console.log(`\n--- 샘플 ---`);
  const samples = await prisma.blankExercise.findMany({
    where: { concept: { grade: { startsWith: 'elementary_' } } },
    include: { concept: { select: { conceptCode: true } } },
    take: 3,
  });

  for (const s of samples) {
    const blanks = s.blanks as any[];
    const easyAnswers = blanks.filter((b: any) => b.difficulty === 'easy').map((b: any) => b.answer).join(', ');
    const hardAnswers = blanks.filter((b: any) => b.difficulty === 'hard').slice(0, 5).map((b: any) => b.answer).join(', ');
    console.log(`\n${s.concept.conceptCode} | easy:${blanks.filter((b:any)=>b.difficulty==='easy').length} hard:${blanks.filter((b:any)=>b.difficulty==='hard').length} full:${blanks.filter((b:any)=>b.difficulty==='full').length}`);
    console.log(`  easy: ${easyAnswers}`);
    console.log(`  hard: ${hardAnswers}...`);
    console.log(`  template: ${s.templateText.substring(0, 150)}...`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
