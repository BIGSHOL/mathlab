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

## easy (1단계 빈칸) — 고유 용어 3~8개
개념의 뼈대가 되는 핵심 키워드. 한번 읽은 뒤 가볍게 떠올릴 수 있어야 할 것들.
- 정의되는 용어: "~을(를) ~라 한다"에서 정의명
- 공식의 핵심 구성요소: 밑변, 높이, 반지름 등
- 분류/종류명: 정삼각형, 이등변삼각형, 정육면체 등
- **고유 용어 3~8개**: 짧은 콘텐츠면 3개, 긴 콘텐츠면 8개까지. 절대 10개 초과 금지

## hard (2단계 추가 빈칸) — 고유 용어 최소 2개
easy에 포함되지 않은, 수학적으로 의미 있는 나머지 용어.
- 성질/조건/관계 용어: "평행", "수직", "합동", "같다" 등
- 공식의 부가 요소, 단위, 수학 기호가 포함된 표현
- 수식($...$) 중 개념 이해에 필수적인 것
- **최소 2개 이상** 반드시 포함 — hard가 0이면 2단계 학습이 1단계와 동일해져 의미 없음
- 개수를 억지로 채우지 말되, 수학과 무관한 일반 서술어는 절대 선택하지 마세요

## 개수 균형 규칙 (중요!)
- easy와 hard의 **고유 용어 개수가 동일하면 안 됨** — 반드시 차이를 둘 것
- 일반적으로 easy가 hard보다 많거나 적어도 됨. 핵심은 **같은 개수를 피하는 것**
- 예시: easy 5개 + hard 3개 (O), easy 4개 + hard 4개 (X), easy 3개 + hard 6개 (O)

## 규칙
1. 원문에 정확히 존재하는 단어/표현만 선택 (변형/축약 금지)
2. 조사(은/는/이/가/을/를/의/에/에서/로)는 분리하여 제외
3. 일반적 단어 제외: "수", "값", "식", "것", "때", "경우", "예를 들어", "바꾸어", "맞추어", "나타내면" 등
4. **같은 용어가 여러 번 나오면 한 번만 포함** — 코드가 자동으로 본문 내 모든 출현 위치에 빈칸을 생성하므로, 같은 용어를 중복 추출하면 빈칸이 과다해짐
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

  const terms = data.blanks.map(b => ({
    term: b.term,
    difficulty: (b.difficulty === 'hard' ? 'hard' : 'easy') as BlankDifficulty,
  }));

  const merged = buildMergedExercise(fullContent, terms, false);
  if (!merged) return null;

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
  // 빈칸 없는 초등 개념만 조회
  const concepts = await prisma.concept.findMany({
    where: { grade: { startsWith: 'elementary_' }, blanks: { none: {} } },
    select: { id: true, conceptCode: true, title: true, fullContent: true, grade: true },
    orderBy: [{ grade: 'asc' }, { conceptCode: 'asc' }],
  });

  console.log(`빈칸 미생성 초등 개념 ${concepts.length}개 처리 시작...\n`);

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
      console.log(`  ✓ ${code}: easy=${easyCount} hard=${hardCount} full=${fullCount}`);
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
  
  // 전체 현황
  const total = await prisma.concept.count({ where: { grade: { startsWith: 'elementary' } } });
  const withBlanks = await prisma.concept.count({ where: { grade: { startsWith: 'elementary' }, blanks: { some: {} } } });
  console.log(`\n전체 초등: ${total}개, 빈칸 있음: ${withBlanks}개, 없음: ${total - withBlanks}개`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
