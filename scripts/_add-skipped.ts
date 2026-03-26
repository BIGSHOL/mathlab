import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import { buildMergedExercise, addFullSentenceBlanks } from '../src/lib/utils/blank-generator';

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const subjectMap: Record<string, string> = {
  elementary_4: 'cmn5vrht4000rvdjgsb823rej',
  elementary_5: 'cmn5vrk8p0026vdjgf9ysrq0h',
};

const concepts = [
  {
    title: '소수 두 자리 수의 이해',
    fullContent: `(1) 소수 두 자리 수의 뜻
소수점 아래 둘째 자리까지 있는 수를 소수 두 자리 수라고 한다.
소수점 아래 둘째 자리의 숫자는 $\frac{1}{100}$의 자리를 나타낸다.
예) $0.35$는 $\frac{1}{10}$이 $3$개, $\frac{1}{100}$이 $5$개인 수이다.

(2) 소수 두 자리 수의 크기
$0.01$은 $1$을 $100$등분한 것 중 하나이다.
$0.1$은 $0.01$이 $10$개 모인 것과 같다.
예) $0.47$은 $0.01$이 $47$개인 수이므로, $\frac{47}{100}$과 같다.

(3) 소수 두 자리 수의 크기 비교
소수 두 자리 수의 크기를 비교할 때는 소수점 아래 첫째 자리부터 차례로 비교한다.
예) $0.35$와 $0.38$을 비교하면, 소수 첫째 자리가 $3$으로 같고 둘째 자리에서 $5 < 8$이므로 $0.35 < 0.38$이다.`,
    grade: 'elementary_4', semester: 2, chapter: '소수의 덧셈과 뺄셈', section: '소수 두/세 자리 수',
    part: 'calc', keywords: '소수,소수점,소수 두 자리 수,자릿값,백분의 일', conceptCode: 'E4-NUM-13-1', sortOrder: 105, category: 'concept',
  },
  {
    title: '소수 세 자리 수의 이해',
    fullContent: `(1) 소수 세 자리 수의 뜻
소수점 아래 셋째 자리까지 있는 수를 소수 세 자리 수라고 한다.
소수점 아래 셋째 자리의 숫자는 $\frac{1}{1000}$의 자리를 나타낸다.
예) $0.125$는 $\frac{1}{10}$이 $1$개, $\frac{1}{100}$이 $2$개, $\frac{1}{1000}$이 $5$개인 수이다.

(2) 소수의 자릿값 체계
소수점 아래로 $\frac{1}{10}$의 자리, $\frac{1}{100}$의 자리, $\frac{1}{1000}$의 자리가 차례로 놓인다.
$0.001$은 $1$을 $1000$등분한 것 중 하나이다.
예) $0.256$은 $0.001$이 $256$개인 수이므로, $\frac{256}{1000}$과 같다.

(3) 소수 사이의 관계
$0.1$은 $0.01$이 $10$개, $0.01$은 $0.001$이 $10$개 모인 것이다.
이처럼 소수에서도 자연수와 마찬가지로 $10$배씩 커지는 자릿값 체계가 성립한다.`,
    grade: 'elementary_4', semester: 2, chapter: '소수의 덧셈과 뺄셈', section: '소수 두/세 자리 수',
    part: 'calc', keywords: '소수,소수 세 자리 수,자릿값,천분의 일,소수점', conceptCode: 'E4-NUM-13-2', sortOrder: 106, category: 'concept',
  },
  {
    title: '통분을 이용한 분수의 크기 비교',
    fullContent: `(1) 분모가 같은 분수의 크기 비교
분모가 같은 분수는 분자가 큰 쪽이 더 크다.
예) $\frac{3}{7}$과 $\frac{5}{7}$에서 분모가 $7$로 같으므로, 분자를 비교하면 $3 < 5$이다. 따라서 $\frac{3}{7} < \frac{5}{7}$이다.

(2) 분모가 다른 분수의 크기 비교
분모가 다른 분수는 통분하여 분모를 같게 만든 뒤 비교한다.
예) $\frac{2}{3}$과 $\frac{3}{4}$를 비교하려면 두 분모의 공통분모 $12$로 통분한다.
$\frac{2}{3} = \frac{8}{12}$이고, $\frac{3}{4} = \frac{9}{12}$이다.
$8 < 9$이므로, $\frac{2}{3} < \frac{3}{4}$이다.

(3) 분수의 크기 비교 정리
분모가 같으면 분자끼리 비교하고, 분모가 다르면 통분한 뒤 분자끼리 비교한다.`,
    grade: 'elementary_5', semester: 1, chapter: '약분과 통분', section: '분수의 크기 비교',
    part: 'calc', keywords: '분수,크기 비교,통분,분모,분자,공통분모', conceptCode: 'E5-NUM-06-4', sortOrder: 65, category: 'concept',
  },
];

async function extractTerms(title: string, content: string) {
  const prompt = `당신은 한국 수학 교육 전문가입니다.
아래 수학 개념의 본문을 읽고, 빈칸 학습에 적합한 핵심 용어를 추출해주세요.

## 규칙
- easy: 핵심 고유 용어 3~8개
- hard: 부차적 학습 용어 최소 2개
- easy와 hard 개수 동일 금지
- 원문 정확 일치, 조사 제외, $...$ 수식 통째 선택
- 번호 패턴/도형 기호 금지, 중복 금지

## 제목: ${title}
## 본문: ${content}

{ "blanks": [{ "term": "용어", "difficulty": "easy" }, ...] }`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object' as any,
        properties: {
          blanks: {
            type: 'array' as any,
            items: {
              type: 'object' as any,
              properties: {
                term: { type: 'string' as any },
                difficulty: { type: 'string' as any, enum: ['easy', 'hard'] },
              },
              required: ['term', 'difficulty'],
            },
          },
        },
        required: ['blanks'],
      },
    },
  });

  const text = response.text || '';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned).blanks || [];
}

async function main() {
  console.log('=== 건너뛴 3개 개념 추가 ===\n');

  for (const nc of concepts) {
    const existing = await prisma.concept.findFirst({ where: { conceptCode: nc.conceptCode } });
    if (existing) {
      console.log(`⚠ ${nc.conceptCode}: 이미 존재, 건너뜀`);
      continue;
    }

    const created = await prisma.concept.create({
      data: {
        ...nc,
        sectionSub: null,
        source: null,
        subjectId: subjectMap[nc.grade],
      },
    });
    console.log(`✓ ${nc.conceptCode} "${nc.title}" 추가 완료`);

    // 빈칸 생성
    const terms = await extractTerms(nc.title, nc.fullContent);
    if (terms.length > 0) {
      let exercise = buildMergedExercise(nc.fullContent, terms, { mergeSameTerms: false });
      exercise = addFullSentenceBlanks(exercise);
      await prisma.blankExercise.create({
        data: { conceptId: created.id, level: 1, templateText: exercise.templateText, blanks: exercise.blanks as any },
      });
      const e = exercise.blanks.filter((b:any) => b.difficulty === 'easy').length;
      const h = exercise.blanks.filter((b:any) => b.difficulty === 'hard').length;
      const f = exercise.blanks.filter((b:any) => b.difficulty === 'full').length;
      console.log(`  빈칸: easy=${e}, hard=${h}, full=${f}`);
    }
  }

  console.log('\n완료');
}
main().catch(console.error).finally(() => prisma.$disconnect());
