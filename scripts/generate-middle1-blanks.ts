/**
 * 중1-1 개념 빈칸 문제 일괄 생성 스크립트
 *
 * 초등 스크립트와 동일 파이프라인:
 * 1. Gemini로 easy/hard 용어 추출
 * 2. buildMergedExercise()로 템플릿 생성
 * 3. addFullSentenceBlanks()로 통문장 빈칸 추가
 * 4. BlankExercise DB에 저장
 *
 * 중등 특화:
 * - 수식($...$) 빈칸 비중 증가
 * - easy 5~10개, hard 3~8개로 범위 확대
 * - 예시 속 계산값 vs 정의 수식 구분
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
  return `당신은 한국 중학교 수학 교육 전문가입니다.

아래 중학교 수학 개념 설명을 읽고, 학생이 빈칸 채우기로 학습할 **수학적으로 의미 있는 용어**를 추출하세요.

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

## easy (1단계 빈칸) — 고유 용어 5~10개
개념의 뼈대가 되는 핵심 키워드. 한번 읽은 뒤 가볍게 떠올릴 수 있어야 할 것들.
- 정의되는 용어: "~을(를) ~라 한다"에서 정의명 (예: 소인수분해, 거듭제곱, 절댓값)
- 공식/법칙의 핵심 구성요소: 밑, 지수, 분모, 분자 등
- 분류/종류명: 소수, 합성수, 양수, 음수, 정비례, 반비례 등
- **핵심 수식**: 정의나 공식을 나타내는 수식은 $...$ 통째로 선택 (예: "$a^n$", "$\\dfrac{a}{b}$")
- **고유 용어 5~10개**: 짧은 콘텐츠면 5개, 긴 콘텐츠면 10개까지. 절대 12개 초과 금지

## hard (2단계 추가 빈칸) — 고유 용어 3~8개
easy에 포함되지 않은, 수학적으로 의미 있는 나머지 용어.
- 성질/조건/관계 용어: "크다", "작다", "같다", "역수", "교환" 등
- 공식의 부가 요소, 부가 수식 표현
- 수학 기호가 포함된 표현 (예: "$+$", "$-$", "$\\times$")
- 보조 정의나 참고 용어
- **최소 3개 이상** 반드시 포함 — hard가 적으면 2단계 학습이 1단계와 너무 비슷해짐
- 개수를 억지로 채우지 말되, 수학과 무관한 일반 서술어는 절대 선택하지 마세요

## 개수 균형 규칙 (중요!)
- easy와 hard의 **고유 용어 개수가 동일하면 안 됨** — 반드시 차이를 둘 것
- 일반적으로 easy가 hard보다 많음. 핵심은 **같은 개수를 피하는 것**
- 예시: easy 7개 + hard 4개 (O), easy 5개 + hard 5개 (X), easy 6개 + hard 8개 (O)

## 중등 수식 처리 규칙 (매우 중요!)
1. **짧은 수식 단위로 선택**: "$a$", "$n$", "$b$" 처럼 변수 하나, 또는 "$a^n$", "$-3$" 처럼 짧은 수식 단위로 선택
2. **긴 수식은 통째로 선택하지 마세요**: "$\\dfrac{a}{b} \\times \\dfrac{d}{c}$" 같은 긴 수식은 학생이 입력하기 어려움 → 그 안의 핵심 요소만 따로 선택 (예: "$a$", "$b$")
3. **예시 속 계산값은 빈칸 대상 아님**: "예) $2 \\times 2 \\times 2 = 8$" 에서 $2$, $8$ 같은 구체적 숫자
4. **수식은 반드시 $...$ 포함**: $ 기호를 포함하여 선택 (예: "$a^n$" O, "a^n" X)
5. **수식 빈칸은 입력 가능한 길이로**: 학생이 타이핑이나 칩으로 선택할 수 있는 짧은 단위. 최대 10자 이내의 수식만 선택

## 일반 규칙
1. 원문에 정확히 존재하는 단어/표현만 선택 (변형/축약 금지)
2. 조사(은/는/이/가/을/를/의/에/에서/로)는 분리하여 제외
3. 일반적 단어 제외: "수", "값", "식", "것", "때", "경우", "예를 들어", "바꾸어", "맞추어", "나타내면" 등
4. **같은 용어가 여러 번 나오면 한 번만 포함** — 코드가 자동으로 본문 내 모든 출현 위치에 빈칸을 생성하므로, 같은 용어를 중복 추출하면 빈칸이 과다해짐
5. **복합 용어는 통째로 선택**: "자연수 부분", "최대공약수", "기약분수" 등 여러 단어가 하나의 수학 개념을 이루면 분리하지 말고 통째로
6. **예시 속 구체값 제외**: "예) $3 \\times 3 \\times 3 \\times 3 = 3^4$" 같은 예시에서 $3$, $3^4$ 등 특정 계산값은 빈칸 대상이 아닙니다
7. **절대 금지**: (1), (2), ①, ②, #1 같은 번호 매기기, 순수 숫자
8. **절대 금지**: □, ▢, ■, ☐ 같은 도형 기호 (학생이 입력 불가)`;
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
    // 디버깅용
    aiTerms: terms,
  };
}

async function main() {
  const concepts = await prisma.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { id: true, conceptCode: true, title: true, fullContent: true },
    orderBy: { conceptCode: 'asc' },
  });

  console.log(`중1-1 개념 ${concepts.length}개 빈칸 생성 시작...\n`);

  // 기존 중1-1 빈칸 삭제
  const existingIds = concepts.map(c => c.id);
  const deleted = await prisma.blankExercise.deleteMany({
    where: { conceptId: { in: existingIds } },
  });
  if (deleted.count > 0) console.log(`기존 빈칸 삭제: ${deleted.count}개\n`);

  let success = 0, failed = 0;
  const BATCH_SIZE = 5;
  const DELAY_MS = 1500;

  for (let i = 0; i < concepts.length; i += BATCH_SIZE) {
    const batch = concepts.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(c => extractAndBuild(c.id, c.title, c.fullContent || '')),
    );

    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const c = batch[j];

      if (r.status === 'rejected') {
        failed++;
        console.log(`  ✗ ${c.conceptCode}: ${String(r.reason).substring(0, 80)}`);
        continue;
      }

      const val = r.value;
      if (!val || val.blanks.length === 0) {
        failed++;
        console.log(`  ✗ ${c.conceptCode}: 빈칸 생성 실패`);
        continue;
      }

      // DB 저장
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
      const easyTerms = val.aiTerms.filter(t => t.difficulty === 'easy').map(t => t.term).join(', ');
      console.log(`  ✓ ${c.conceptCode} | easy:${easyCount} hard:${hardCount} full:${fullCount} | ${easyTerms.substring(0, 60)}`);
    }

    const done = Math.min(i + BATCH_SIZE, concepts.length);
    const pct = ((done / concepts.length) * 100).toFixed(0);
    console.log(`[${pct}%] ${done}/${concepts.length} (성공:${success} 실패:${failed})\n`);

    if (i + BATCH_SIZE < concepts.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n=== 완료 ===`);
  console.log(`성공: ${success}개`);
  console.log(`실패: ${failed}개`);

  // 검증
  console.log(`\n=== 검증 ===`);
  const afterConcepts = await prisma.blankExercise.findMany({
    where: { concept: { grade: 'middle_1', semester: 1 } },
    include: { concept: { select: { conceptCode: true, title: true } } },
    orderBy: { concept: { conceptCode: 'asc' } },
  });

  let totalEasy = 0, totalHard = 0, totalFull = 0;
  const lowEasy: string[] = [];
  const lowHard: string[] = [];

  for (const ex of afterConcepts) {
    const blanks = ex.blanks as any[];
    const easy = blanks.filter((b: any) => b.difficulty === 'easy').length;
    const hard = blanks.filter((b: any) => b.difficulty === 'hard').length;
    const full = blanks.filter((b: any) => b.difficulty === 'full').length;
    totalEasy += easy;
    totalHard += hard;
    totalFull += full;
    if (easy < 3) lowEasy.push(`${ex.concept.conceptCode}(${easy})`);
    if (hard < 2) lowHard.push(`${ex.concept.conceptCode}(${hard})`);
  }

  const n = afterConcepts.length || 1;
  console.log(`평균 빈칸 수: easy=${(totalEasy/n).toFixed(1)} hard=${(totalHard/n).toFixed(1)} full=${(totalFull/n).toFixed(1)}`);
  console.log(`총 빈칸: easy=${totalEasy} hard=${totalHard} full=${totalFull} 합계=${totalEasy+totalHard+totalFull}`);

  if (lowEasy.length > 0) console.log(`⚠️ easy 부족 (<3): ${lowEasy.join(', ')}`);
  if (lowHard.length > 0) console.log(`⚠️ hard 부족 (<2): ${lowHard.join(', ')}`);

  // 샘플 3개
  console.log(`\n--- 샘플 ---`);
  const samples = afterConcepts.slice(0, 3);
  for (const s of samples) {
    const blanks = s.blanks as any[];
    const easyAnswers = blanks.filter((b: any) => b.difficulty === 'easy').map((b: any) => b.answer).join(', ');
    const hardAnswers = blanks.filter((b: any) => b.difficulty === 'hard').map((b: any) => b.answer).join(', ');
    console.log(`\n${s.concept.conceptCode} ${s.concept.title}`);
    console.log(`  easy(${blanks.filter((b:any)=>b.difficulty==='easy').length}): ${easyAnswers}`);
    console.log(`  hard(${blanks.filter((b:any)=>b.difficulty==='hard').length}): ${hardAnswers}`);
    console.log(`  full: ${blanks.filter((b:any)=>b.difficulty==='full').length}개`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
