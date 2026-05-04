/**
 * 중1 워크북 출력용 풍부한 교과서 본문 생성 스크립트
 *
 * 기존 학생 빈칸 학습용 개념(Concept)과 별개로 row를 추가:
 *   - source:       'textbook-rich'   (학생 측 API에서 필터로 제외)
 *   - conceptCode:  'WB-M1-...'       (이중 식별)
 *   - fullContent:  700~1500자        (정의·설명·예시·풀이단계 포함)
 *
 * 학생 빈칸 학습 데이터에는 영향 없음. 워크북 출력 시 우선 사용.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/generate-middle1-textbook.ts            # 전체 생성
 *   npx tsx --env-file=.env scripts/generate-middle1-textbook.ts --limit=3  # 처음 N개 단원만 (테스트)
 *   npx tsx --env-file=.env scripts/generate-middle1-textbook.ts --reset    # 기존 textbook-rich row 삭제 후 재생성
 */
import { GoogleGenAI, Type } from '@google/genai';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { formatRichTextbookContent } from '../src/lib/services/workbook/textbook-format';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error('GEMINI_API_KEY 없음'); process.exit(1); }
const ai = new GoogleGenAI({ apiKey });

const SOURCE_TAG = 'textbook-rich';

interface SubUnit {
  code: string;
  part: string;
  chapter: string;
  section: string;
  sectionSub: string;
}

// 중1-1 (수와 연산 / 문자와 식 / 좌표평면과 그래프) — 13단원
const MIDDLE1_1_UNITS: SubUnit[] = [
  { code: 'M1-NUM-01', part: 'calc', chapter: '수와 연산', section: '소인수분해', sectionSub: '소인수분해' },
  { code: 'M1-NUM-02', part: 'calc', chapter: '수와 연산', section: '소인수분해', sectionSub: '최대공약수와 최소공배수' },
  { code: 'M1-NUM-03', part: 'calc', chapter: '수와 연산', section: '정수와 유리수', sectionSub: '정수와 유리수' },
  { code: 'M1-NUM-04', part: 'calc', chapter: '수와 연산', section: '정수와 유리수', sectionSub: '정수와 유리수의 덧셈과 뺄셈' },
  { code: 'M1-NUM-05', part: 'calc', chapter: '수와 연산', section: '정수와 유리수', sectionSub: '정수와 유리수의 곱셈과 나눗셈' },
  { code: 'M1-ALG-01', part: 'algebra', chapter: '문자와 식', section: '문자의 사용과 식', sectionSub: '문자의 사용과 식의 계산' },
  { code: 'M1-ALG-02', part: 'algebra', chapter: '문자와 식', section: '문자의 사용과 식', sectionSub: '일차식의 덧셈과 뺄셈' },
  { code: 'M1-ALG-03', part: 'algebra', chapter: '문자와 식', section: '일차방정식', sectionSub: '일차방정식의 풀이' },
  { code: 'M1-ALG-04', part: 'algebra', chapter: '문자와 식', section: '일차방정식', sectionSub: '일차방정식의 활용' },
  { code: 'M1-FUNC-01', part: 'func', chapter: '좌표평면과 그래프', section: '좌표와 그래프', sectionSub: '순서쌍과 좌표' },
  { code: 'M1-FUNC-02', part: 'func', chapter: '좌표평면과 그래프', section: '좌표와 그래프', sectionSub: '그래프' },
  { code: 'M1-FUNC-03', part: 'func', chapter: '좌표평면과 그래프', section: '정비례와 반비례', sectionSub: '정비례' },
  { code: 'M1-FUNC-04', part: 'func', chapter: '좌표평면과 그래프', section: '정비례와 반비례', sectionSub: '반비례' },
];

// 중1-2 (기본 도형 / 평면도형 / 입체도형 / 통계) — 12단원
const MIDDLE1_2_UNITS: SubUnit[] = [
  { code: 'M1-GEO-01', part: 'geo', chapter: '기본 도형', section: '기본 도형', sectionSub: '점, 선, 면' },
  { code: 'M1-GEO-02', part: 'geo', chapter: '기본 도형', section: '기본 도형', sectionSub: '각' },
  { code: 'M1-GEO-03', part: 'geo', chapter: '기본 도형', section: '위치 관계', sectionSub: '평행과 수직' },
  { code: 'M1-GEO-04', part: 'geo', chapter: '기본 도형', section: '작도와 합동', sectionSub: '삼각형의 작도' },
  { code: 'M1-GEO-05', part: 'geo', chapter: '기본 도형', section: '작도와 합동', sectionSub: '삼각형의 합동 조건' },
  { code: 'M1-GEO-06', part: 'geo', chapter: '평면도형', section: '다각형', sectionSub: '다각형의 내각과 외각' },
  { code: 'M1-GEO-07', part: 'geo', chapter: '평면도형', section: '원과 부채꼴', sectionSub: '부채꼴의 호의 길이와 넓이' },
  { code: 'M1-GEO-08', part: 'geo', chapter: '입체도형', section: '다면체와 회전체', sectionSub: '다면체' },
  { code: 'M1-GEO-09', part: 'geo', chapter: '입체도형', section: '다면체와 회전체', sectionSub: '회전체' },
  { code: 'M1-GEO-10', part: 'geo', chapter: '입체도형', section: '입체도형의 겉넓이와 부피', sectionSub: '기둥·뿔·구의 겉넓이와 부피' },
  { code: 'M1-STA-01', part: 'data', chapter: '통계', section: '자료의 정리', sectionSub: '도수분포표와 히스토그램' },
  { code: 'M1-STA-02', part: 'data', chapter: '통계', section: '자료의 정리', sectionSub: '상대도수와 그 그래프' },
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
          title: { type: Type.STRING, description: '개념 제목' },
          fullContent: { type: Type.STRING, description: '풍부한 교과서 본문 (700~1500자)' },
          keywords: { type: Type.STRING, description: '핵심 키워드 콤마 구분' },
        },
        required: ['subIndex', 'title', 'fullContent', 'keywords'],
      },
    },
  },
  required: ['concepts'],
};

function buildPrompt(unit: SubUnit, semester: 1 | 2): string {
  return `당신은 한국 중학교 수학 교과서 저자입니다. 학원 워크북에 인쇄될 풍부한 교과서 본문을 작성합니다.

## 대상 (중1-${semester})
- 대단원: ${unit.chapter}
- 중단원: ${unit.section}
- 소단원: ${unit.sectionSub}

## 작성 분량
- 각 개념의 fullContent는 **반드시 700~1500자**.
- 핵심 정의 + 자세한 설명 + 구체적 예시 + 풀이 단계 + 주의/오류 패턴이 모두 포함되어야 함.
- 학생이 이 본문 하나만 읽어도 개념을 완전히 이해할 수 있는 수준.

## 세분화
- 소단원을 **2~4개**의 자연스러운 학습 단위로 나눔.
- 각 단위는 독립적으로 읽혀도 되지만 순서대로 학습하면 흐름이 자연스러움.

## 문체 규칙
- 종결어미: ~이다, ~한다, ~라 한다, ~할 수 있다 (서술형)
- 절대 사용 금지: ~해요, ~거예요, ~랍니다, ~볼까요 (대화형)
- 인사/호칭("여러분", "친구들"), 감탄("참 쉽죠"), 질문형("~일까요?") 모두 금지

## 구조 기호
- (1), (2), (3): 같은 개념 안의 서로 다른 하위 주제
- ①, ②, ③: 순서 있는 절차/단계
- ⓐ, ⓑ, ⓒ: 여러 종류·방법 나열 (순서 무관)
- 줄글 3문장 연속 금지 — 줄바꿈 또는 번호로 끊기

## 수식 규칙 (KaTeX 호환 — 매우 중요)
- 모든 숫자/변수/수식은 \`$...$\` 또는 \`$$...$$\`로 감싸기. 예: $a$, $a+b$, $25$, $x^2$
- 한글이 수식 안에 들어가면 반드시 \`\\text{}\` 사용. 예: $\\text{소금의 양} = \\frac{\\text{농도}}{100} \\times \\text{소금물의 양}$
- 분수는 \`\\frac\` 사용 (\`\\dfrac\` **금지** — 인라인에서 거대 분수가 됨)
- 곱셈은 \`\\times\`, 나눗셈은 \`\\div\`
- \`$ ... $\` 짝이 반드시 맞아야 하고, 인라인 수식 내부에 줄바꿈 금지
- 여러 줄 수식은 \`$$...$$\` 또는 \`$$\\begin{aligned}...\\end{aligned}$$\` 사용

## 마크다운
- 줄바꿈은 일반 줄바꿈으로 (HTML 태그 금지)
- 강조는 **굵게** 정도만 (인용 \`>\` 표 \`|\` 모두 가능)

## 풍부함의 예시 (이 정도 수준의 본문을 원함)
"소수란 $1$보다 큰 자연수 중에서 $1$과 자기 자신만을 약수로 가지는 수를 뜻한다.
즉, 약수가 정확히 $2$개인 자연수가 소수이다.

(1) 소수의 예
$2, 3, 5, 7, 11, 13, 17, 19, 23, 29, \\dots$ 와 같은 수가 소수이다.
이 중 $2$는 가장 작은 소수이며, 유일한 짝수 소수라는 점에서 특별하다. $2$를 제외한 모든 소수는 홀수이다.

(2) 합성수와의 차이
약수가 $3$개 이상인 자연수를 합성수라 한다. 예를 들어 $6$의 약수는 $1, 2, 3, 6$ 으로 $4$개이므로 합성수이다.
$1$은 약수가 자기 자신뿐이므로 소수도 합성수도 아니다. 이는 자주 헷갈리는 부분이므로 반드시 기억해야 한다.

(3) 소수를 찾는 방법 — 에라토스테네스의 체
① $1$은 소수가 아니므로 지운다.
② 소수 $2$는 남기고 $2$의 배수를 모두 지운다.
③ 소수 $3$은 남기고 $3$의 배수를 모두 지운다.
④ 같은 방식으로 $5, 7, 11, \\dots$ 의 배수를 차례로 지우면 남는 수가 모두 소수이다.

(4) 소수의 성질
① 소수의 약수는 항상 $2$개이다.
② $2$를 제외한 모든 소수는 홀수이다.
③ 소수는 무한히 많다는 사실이 증명되어 있다."

위 예시처럼 정의·예시·구조·실제 응용·주의사항이 모두 포함된 풍부한 본문을 작성하라.`;
}

interface AiConcept {
  subIndex: number;
  title: string;
  fullContent: string;
  keywords: string;
}

async function generateForUnit(unit: SubUnit, semester: 1 | 2): Promise<AiConcept[] | null> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: buildPrompt(unit, semester),
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });
  if (!response.text) return null;
  let jsonStr = response.text.trim();
  if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
  const data = JSON.parse(jsonStr);
  if (!data.concepts || data.concepts.length === 0) return null;
  return data.concepts as AiConcept[];
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
  const reset = args.includes('--reset');
  const onlyHalf = args.find((a) => a === '--sem1' || a === '--sem2');

  const sample = await prisma.concept.findFirst({
    where: { grade: 'middle_1' },
    select: { subjectId: true },
  });
  if (!sample) {
    console.error('기존 중1 개념이 없어 subjectId를 알 수 없습니다.');
    process.exit(1);
  }
  const subjectId = sample.subjectId;
  console.log(`subjectId: ${subjectId}`);

  if (reset) {
    const oldRich = await prisma.concept.findMany({
      where: { source: SOURCE_TAG },
      select: { id: true },
    });
    if (oldRich.length > 0) {
      const ids = oldRich.map((c) => c.id);
      await prisma.blankExercise.deleteMany({ where: { conceptId: { in: ids } } });
      await prisma.conceptMemo.deleteMany({ where: { conceptId: { in: ids } } });
      await prisma.learningProgress.deleteMany({ where: { conceptId: { in: ids } } });
      await prisma.concept.deleteMany({ where: { id: { in: ids } } });
      console.log(`✅ 기존 textbook-rich row ${oldRich.length}개 삭제`);
    }
  }

  const allUnits: Array<{ unit: SubUnit; semester: 1 | 2 }> = [];
  if (onlyHalf !== '--sem2') MIDDLE1_1_UNITS.forEach((u) => allUnits.push({ unit: u, semester: 1 }));
  if (onlyHalf !== '--sem1') MIDDLE1_2_UNITS.forEach((u) => allUnits.push({ unit: u, semester: 2 }));

  const targetUnits = allUnits.slice(0, limit);
  console.log(`\n📚 생성 대상: ${targetUnits.length}개 소단원 (전체 ${allUnits.length}개 중)`);
  console.log(`   source 태그: '${SOURCE_TAG}', conceptCode prefix: 'WB-'\n`);

  let totalCreated = 0;
  let totalChars = 0;
  const DELAY_MS = 1500;

  for (let i = 0; i < targetUnits.length; i++) {
    const { unit, semester } = targetUnits[i];
    console.log(`[${i + 1}/${targetUnits.length}] (sem${semester}) ${unit.chapter} > ${unit.sectionSub} 생성 중...`);

    try {
      const concepts = await generateForUnit(unit, semester);
      if (!concepts || concepts.length === 0) {
        console.log(`  ✗ 생성 실패`);
        continue;
      }

      const chapterBase =
        unit.chapter === '수와 연산' ? 100 :
        unit.chapter === '문자와 식' ? 200 :
        unit.chapter === '좌표평면과 그래프' ? 300 :
        unit.chapter === '기본 도형' ? 400 :
        unit.chapter === '평면도형' ? 500 :
        unit.chapter === '입체도형' ? 600 :
        unit.chapter === '통계' ? 700 : 800;
      const sameChapterUnits = (semester === 1 ? MIDDLE1_1_UNITS : MIDDLE1_2_UNITS).filter((u) => u.chapter === unit.chapter);
      const unitIndex = sameChapterUnits.indexOf(unit);
      const sortBase = chapterBase + unitIndex * 10;

      for (const c of concepts) {
        const conceptCode = `WB-${unit.code}-${c.subIndex}`;
        // 기존 충돌 시 skip (재실행 안전)
        const exists = await prisma.concept.findUnique({ where: { conceptCode } });
        if (exists) {
          console.log(`  ↷ ${conceptCode} 이미 존재 — 스킵`);
          continue;
        }
        const formatted = formatRichTextbookContent(c.fullContent);
        await prisma.concept.create({
          data: {
            conceptCode,
            title: c.title,
            fullContent: formatted,
            keywords: c.keywords,
            grade: 'middle_1',
            semester,
            chapter: unit.chapter,
            section: unit.section,
            sectionSub: unit.sectionSub,
            part: unit.part,
            sortOrder: sortBase + c.subIndex,
            subjectId,
            source: SOURCE_TAG,
          },
        });
        totalCreated += 1;
        totalChars += formatted.length;
        console.log(`  ✓ ${conceptCode} — ${c.title} (${formatted.length}자)`);
      }
    } catch (e) {
      console.log(`  ✗ 에러: ${String(e).substring(0, 200)}`);
    }

    if (i < targetUnits.length - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\n=== 완료 ===`);
  console.log(`생성된 textbook-rich 개념: ${totalCreated}개`);
  if (totalCreated > 0) {
    console.log(`평균 길이: ${Math.round(totalChars / totalCreated)}자`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
