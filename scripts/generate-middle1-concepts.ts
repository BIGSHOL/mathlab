/**
 * 중1-1 개념 세분화 + 콘텐츠 생성 스크립트
 *
 * 1. curriculum.ts 기준 중1-1 소단원 13개를 AI에 전달
 * 2. 소단원별 2~4개 세분화 개념 + 300자+ 콘텐츠 생성
 * 3. 기존 중1-1 개념을 삭제하고 새 개념으로 대체
 *
 * 초등 패턴과 일관:
 * - 코드: M1-NUM-01-1, M1-NUM-01-2, ...
 * - 콘텐츠: 300자+ (정의 → 설명 → 예시 → 정리)
 * - keywords: 콤마 구분 문자열
 */

import { GoogleGenAI, Type } from '@google/genai';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error('GEMINI_API_KEY 없음'); process.exit(1); }
const ai = new GoogleGenAI({ apiKey });

// ===== 중1-1 curriculum.ts 기준 소단원 목록 =====
interface SubUnit {
  code: string;       // 기본 코드 (M1-NUM-01)
  part: string;       // calc, algebra, func
  chapter: string;    // 대단원
  section: string;    // 중단원
  sectionSub: string; // 소단원
}

const MIDDLE1_1_UNITS: SubUnit[] = [
  // 수와 연산
  { code: 'M1-NUM-01', part: 'calc', chapter: '수와 연산', section: '소인수분해', sectionSub: '소인수분해' },
  { code: 'M1-NUM-02', part: 'calc', chapter: '수와 연산', section: '소인수분해', sectionSub: '최대공약수와 최소공배수' },
  { code: 'M1-NUM-03', part: 'calc', chapter: '수와 연산', section: '정수와 유리수', sectionSub: '정수와 유리수' },
  { code: 'M1-NUM-04', part: 'calc', chapter: '수와 연산', section: '정수와 유리수', sectionSub: '정수와 유리수의 덧셈과 뺄셈' },
  { code: 'M1-NUM-05', part: 'calc', chapter: '수와 연산', section: '정수와 유리수', sectionSub: '정수와 유리수의 곱셈과 나눗셈' },
  // 문자와 식
  { code: 'M1-ALG-01', part: 'algebra', chapter: '문자와 식', section: '문자의 사용과 식', sectionSub: '문자의 사용과 식의 계산' },
  { code: 'M1-ALG-02', part: 'algebra', chapter: '문자와 식', section: '문자의 사용과 식', sectionSub: '일차식의 덧셈과 뺄셈' },
  { code: 'M1-ALG-03', part: 'algebra', chapter: '문자와 식', section: '일차방정식', sectionSub: '일차방정식의 풀이' },
  { code: 'M1-ALG-04', part: 'algebra', chapter: '문자와 식', section: '일차방정식', sectionSub: '일차방정식의 활용' },
  // 좌표평면과 그래프
  { code: 'M1-FUNC-01', part: 'func', chapter: '좌표평면과 그래프', section: '좌표와 그래프', sectionSub: '순서쌍과 좌표' },
  { code: 'M1-FUNC-02', part: 'func', chapter: '좌표평면과 그래프', section: '좌표와 그래프', sectionSub: '그래프' },
  { code: 'M1-FUNC-03', part: 'func', chapter: '좌표평면과 그래프', section: '정비례와 반비례', sectionSub: '정비례' },
  { code: 'M1-FUNC-04', part: 'func', chapter: '좌표평면과 그래프', section: '정비례와 반비례', sectionSub: '반비례' },
];

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    concepts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          subIndex: { type: Type.NUMBER, description: '세분화 순번 (1, 2, 3, ...)' },
          title: { type: Type.STRING, description: '개념 제목 (예: "소수와 합성수")' },
          fullContent: { type: Type.STRING, description: '학습 콘텐츠 본문 (250~400자)' },
          keywords: { type: Type.STRING, description: '핵심 키워드 콤마 구분 (예: "소수,합성수,약수,1")' },
        },
        required: ['subIndex', 'title', 'fullContent', 'keywords'],
      },
    },
  },
  required: ['concepts'],
};

function buildPrompt(unit: SubUnit): string {
  return `당신은 한국 중학교 수학 교과서 저자입니다.

아래 소단원을 중학교 1학년 학생이 학습할 수 있도록 **2~4개의 세분화된 개념**으로 나누고, 각 개념의 학습 콘텐츠를 작성하세요.

## 대상 소단원
- 대단원: ${unit.chapter}
- 중단원: ${unit.section}
- 소단원: ${unit.sectionSub}

## 문체 규칙
- 종결어미: ~이다, ~한다, ~라 한다, ~라고 한다, ~할 수 있다 (서술형)
- 절대 사용 금지: ~해요, ~거예요, ~랍니다, ~이에요, ~볼까요, ~할까요 (대화형)
- 인사/호칭/감탄/격려/질문형 모두 금지
- 모든 문장이 수학적 의미를 가져야 함

## 구조 기호 체계 (반드시 준수)
- (1), (2), (3): 같은 개념 내 서로 다른 하위 주제/개념 구분
- ①, ②, ③: 하나의 주제 안에서 순서가 있는 절차/단계
- ⓐ, ⓑ, ⓒ: 여러 방법이나 종류 나열 (순서 무관)
- 줄글 3문장 이상 연속 금지 — 반드시 줄바꿈 또는 번호 기호로 나누기

## 줄바꿈 규칙
- 서로 다른 개념/주제가 전환될 때 줄바꿈
- (1), (2) 등 하위 개념 시작 전 줄바꿈
- ①, ② 등 순서 항목 시작 전 줄바꿈
- 한 문단은 2~3문장 적정

## 수식 규칙
- 모든 숫자는 $...$로 감싸기 (예: $12$, $3.14$)
- 모든 수학 변수(a, b, x, n)는 $...$로 감싸기
- 곱셈: $\\times$, 나눗셈: $\\div$, 분수: $\\frac{a}{b}$
- 단, (1), (2), ①, ② 등 구조 기호의 숫자/문자는 감싸지 않음
- 블록 수식 대신 인라인 $...$ 사용

## 특수문자 규칙 (LaTeX 대신 유니코드 사용)
- 온도: ℃ 사용 (예: $5$℃). $\\circ$나 $\\triangle$ 사용 금지
- 도(각도): ° 사용 (예: $90$°). $\\circ$ 사용 금지
- 백틱(\`) 사용 금지
- 볼드(**) 사용 금지

## 내용 규칙
- 정의: "~를 ~라 한다" 형태로 명확히
- 예시는 "예)" 로 시작
- 볼드(**) 사용하지 않음
- 마크다운 헤딩(###) 사용하지 않음
- 마크다운 테이블(|...|) 사용하지 않음

## 분량
- 각 개념 250~400자 (한글 기준)

## 세분화 기준
- 하나의 소단원 안에서 자연스럽게 나뉘는 하위 주제별로 분리
- 각 개념이 독립적으로 학습 가능하되, 순서대로 읽으면 자연스럽게 이어져야 함

## keywords
- 해당 개념의 핵심 수학 용어를 콤마로 구분 (5~8개, 일반 서술어 제외)

## 참고: 초등 콘텐츠 예시 (반드시 이 구조와 동일한 형태로)
"세 자리 수 덧셈은 백의 자리, 십의 자리, 일의 자리로 이루어진 두 수를 더하는 계산이다.
두 수를 더할 때에는 자릿값을 정확히 맞춰 세로로 쓰는 방법인 세로셈으로 계산하는 것이 중요하다.
① 먼저 일의 자리 숫자끼리 더한다.
② 그다음 십의 자리 숫자끼리 더한다.
③ 마지막으로 백의 자리 숫자끼리 더하여 답을 구할 수 있다.
예) $123 + 456$을 계산하는 방법은 다음과 같다.
일의 자리 숫자 $3$과 $6$을 더하면 $9$가 된다.
십의 자리 숫자 $2$와 $5$를 더하면 $7$이 된다.
백의 자리 숫자 $1$과 $4$를 더하면 $5$가 된다.
따라서 답은 $579$이다."

"받아올림은 두 수를 더한 값이 $10$이거나 $10$보다 클 때, $10$을 윗자리로 $1$로 올려주는 것을 말한다.
예) $235 + 148$의 계산 과정은 다음과 같다.
① 일의 자리 숫자 $5$와 $8$을 더하면 $13$이 된다. $13$에서 $3$은 일의 자리에 쓰고, $1$은 십의 자리로 받아올림한다.
② 십의 자리 숫자 $3$과 $4$를 더하고, 받아올림한 $1$까지 더하면 $8$이 된다.
③ 백의 자리 숫자 $2$와 $1$을 더하면 $3$이 나온다.
계산 결과는 $383$이 된다."`;
}

interface AiConcept {
  subIndex: number;
  title: string;
  fullContent: string;
  keywords: string;
}

async function generateForUnit(unit: SubUnit): Promise<AiConcept[] | null> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: buildPrompt(unit),
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  if (!response.text) return null;

  let jsonStr = response.text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
  }

  const data = JSON.parse(jsonStr);
  if (!data.concepts || data.concepts.length === 0) return null;

  return data.concepts as AiConcept[];
}

async function main() {
  // subjectId 조회 (기존 중1 개념에서 가져오기)
  const existingSample = await prisma.concept.findFirst({
    where: { grade: 'middle_1', semester: 1 },
    select: { subjectId: true },
  });
  if (!existingSample) {
    console.error('기존 중1 개념이 없어 subjectId를 알 수 없습니다');
    process.exit(1);
  }
  const subjectId = existingSample.subjectId;
  console.log(`subjectId: ${subjectId}\n`);

  // 기존 중1-1 개념 + 관련 데이터 삭제
  const oldConcepts = await prisma.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { id: true, conceptCode: true },
  });
  console.log(`기존 중1-1 개념 ${oldConcepts.length}개 삭제 중...`);

  const oldIds = oldConcepts.map(c => c.id);
  // 관련 데이터 먼저 삭제
  await prisma.blankExercise.deleteMany({ where: { conceptId: { in: oldIds } } });
  await prisma.conceptMemo.deleteMany({ where: { conceptId: { in: oldIds } } });
  await prisma.learningProgress.deleteMany({ where: { conceptId: { in: oldIds } } });
  await prisma.concept.deleteMany({ where: { id: { in: oldIds } } });
  console.log(`삭제 완료\n`);

  // 소단원별 AI 생성
  let totalCreated = 0;
  const DELAY_MS = 1500;

  for (let i = 0; i < MIDDLE1_1_UNITS.length; i++) {
    const unit = MIDDLE1_1_UNITS[i];
    console.log(`[${i + 1}/${MIDDLE1_1_UNITS.length}] ${unit.sectionSub} 생성 중...`);

    try {
      const concepts = await generateForUnit(unit);
      if (!concepts || concepts.length === 0) {
        console.log(`  ✗ 생성 실패`);
        continue;
      }

      // sortOrder: 대단원 기준 (수와연산=10, 문자와식=20, 좌표=30) + 소단원 순번 * 10 + subIndex
      const chapterBase = unit.chapter === '수와 연산' ? 100 : unit.chapter === '문자와 식' ? 200 : 300;
      const unitIndex = MIDDLE1_1_UNITS.filter(u => u.chapter === unit.chapter).indexOf(unit);
      const sortBase = chapterBase + unitIndex * 10;

      for (const c of concepts) {
        const conceptCode = `${unit.code}-${c.subIndex}`;
        await prisma.concept.create({
          data: {
            conceptCode,
            title: c.title,
            fullContent: c.fullContent,
            keywords: c.keywords,
            grade: 'middle_1',
            semester: 1,
            chapter: unit.chapter,
            section: unit.section,
            sectionSub: unit.sectionSub,
            part: unit.part,
            sortOrder: sortBase + c.subIndex,
            subjectId,
          },
        });
        totalCreated++;
        console.log(`  ✓ ${conceptCode} — ${c.title} (${c.fullContent.length}자)`);
      }
    } catch (e) {
      console.log(`  ✗ 에러: ${String(e).substring(0, 100)}`);
    }

    if (i < MIDDLE1_1_UNITS.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n=== 완료 ===`);
  console.log(`생성된 개념: ${totalCreated}개`);

  // 검증
  const created = await prisma.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { conceptCode: true, title: true, chapter: true, section: true, sectionSub: true, sortOrder: true, fullContent: true },
    orderBy: { sortOrder: 'asc' },
  });

  console.log(`\n=== 검증: 중1-1 개념 ${created.length}개 ===`);
  let prevChapter = '';
  for (const c of created) {
    if (c.chapter !== prevChapter) {
      console.log(`\n[${c.chapter}]`);
      prevChapter = c.chapter!;
    }
    console.log(`  ${c.conceptCode} [sort:${c.sortOrder}] ${c.section} / ${c.sectionSub} — ${c.title} (${c.fullContent?.length || 0}자)`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
