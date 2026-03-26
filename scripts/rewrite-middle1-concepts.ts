/**
 * 중1-1 개념 본문 구조화 재작성 스크립트
 *
 * 초등 개념과 동일한 구조 기호 체계·줄바꿈 규칙 적용:
 * - (1), (2), (3): 하위 주제 구분
 * - ①, ②, ③: 순서 있는 절차
 * - ⓐ, ⓑ, ⓒ: 방법/종류 나열
 * - 줄글 3문장 연속 금지
 * - 모든 숫자/변수 $...$로 감싸기
 */

import { GoogleGenAI } from '@google/genai';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error('GEMINI_API_KEY가 없습니다.'); process.exit(1); }
const ai = new GoogleGenAI({ apiKey });

// ─────────────────────────────────────────────
// 재작성 프롬프트 (초등 rewrite 프롬프트 기반 + 중등 보강)
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `당신은 한국 중학교 수학 교재의 개념 텍스트를 **빈칸 학습 문제**에 최적화된 서술형으로 재작성하는 전문가입니다.

[목표]
주어진 중등 수학 개념 텍스트를 아래 규칙에 따라 **구조화된 서술형 학습 텍스트**로 변환하세요.
원본의 수학적 내용을 100% 보존하면서, 아래 초등 예시와 완전히 동일한 구조로 재작성합니다.

[문체 규칙]
- 종결어미: ~이다, ~한다, ~라 한다, ~라고 한다, ~할 수 있다 (서술형)
- 절대 사용 금지: ~해요, ~거예요, ~랍니다, ~이에요, ~볼까요, ~할까요 (대화형)
- 인사/호칭 제거: "안녕", "친구들", "여러분", "우리" 등 삭제
- 감탄/격려 제거: "참 쉽죠", "할 수 있을 거예요", "정말 신기하죠" 등 삭제
- 질문형 제거: "~일까요?", "~볼까요?", "알아볼까요?" 등 삭제
- 모든 문장이 수학적 의미를 가져야 함 — 잡담, 감탄, 응원 문장 삭제

[구조 기호 체계 — 가장 중요한 규칙]
- (1), (2), (3): 같은 개념 내 서로 다른 하위 주제/개념 구분. 반드시 줄바꿈 후 사용.
- ①, ②, ③: 하나의 주제 안에서 순서가 있는 절차/단계. 반드시 줄바꿈 후 사용.
- ⓐ, ⓑ, ⓒ: 여러 방법이나 종류 나열 (순서 무관). 반드시 줄바꿈 후 사용.
- 줄글 3문장 이상 연속 금지 — 반드시 줄바꿈 또는 번호 기호로 나누기
- 하나의 개념에 하위 주제가 2개 이상이면 반드시 (1), (2) 등으로 구분할 것

[줄바꿈 규칙 — 초등과 동일한 가독성 확보]
- 서로 다른 개념/주제가 전환될 때 반드시 줄바꿈
- (1), (2) 등 하위 개념 시작 전 반드시 줄바꿈
- ①, ② 등 순서 항목 시작 전 반드시 줄바꿈
- 정의문("~를 ~라 한다") 뒤에 줄바꿈
- "예)" 시작 문장 전에 줄바꿈
- 한 문단은 1~2문장 적정 (3문장 이상 연속하지 않기)
- 빈 줄(연속 줄바꿈 2개)은 사용하지 않기

[수식 규칙]
- 모든 숫자는 $...$로 감싸기 (예: $12$, $3.14$)
- 모든 수학 변수(a, b, x, n)는 $...$로 감싸기
- 곱셈: $\\times$, 나눗셈: $\\div$, 분수: $\\frac{a}{b}$
- 거듭제곱: $a^2$, $2^3$ 등
- 부등호: $\\neq$, $\\leq$, $\\geq$
- 단, (1), (2), ①, ②, ⓐ, ⓑ 등 구조 기호의 숫자/문자는 감싸지 않음
- 블록 수식 대신 인라인 $...$ 사용
- \\pi는 반드시 $\\pi$로 감싸기

[특수문자 규칙 — LaTeX 대신 유니코드 사용]
- 온도: ℃ 사용 (예: $5$℃). $\\circ$나 $\\triangle$ 사용 금지
- 도(각도): ° 사용 (예: $90$°). $\\circ$ 사용 금지
- 백틱(\`) 사용 금지

[내용 규칙]
- 정의: "~를 ~라 한다" 형태 유지
- 원본의 수학적 사실, 공식, 정의, 성질을 모두 보존
- 예시의 구체적 숫자와 계산은 보존
- "예를 들어" 대신 "예)" 로 시작
- 볼드(**) 사용하지 않음
- 마크다운 헤딩(###) 사용하지 않음
- 마크다운 테이블(|...|) 사용하지 않음

[절대 금지]
- 원본에 없는 내용 추가하지 않기
- 수학적 사실을 변경하거나 오류 만들지 않기
- 원본 수식의 LaTeX를 변경하지 않기 ($ 감싸기만 추가)

[초등 완성본 예시 — 반드시 이 구조와 동일한 형태로 재작성]

예시 1:
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

예시 2:
"삼각형은 세 개의 선분으로 둘러싸인 도형이다.
(1) 정삼각형은 세 변의 길이가 모두 같은 삼각형이다.
세 각의 크기도 모두 $60$도로 같다.
(2) 이등변삼각형은 두 변의 길이가 같은 삼각형이다.
같은 두 변에 대한 두 밑각의 크기가 서로 같다.
(3) 직각삼각형은 한 각이 $90$도인 삼각형이다.
직각삼각형에서 직각의 대변을 빗변이라 한다.
예) 세 변의 길이가 $3$, $3$, $3$인 삼각형은 정삼각형이다."

[출력]
변환된 텍스트만 출력하세요. 설명이나 머리말 없이 본문만 반환합니다.`;

// ─────────────────────────────────────────────
// Gemini 호출
// ─────────────────────────────────────────────
async function rewriteConcept(
  original: string,
  title: string,
  conceptCode: string,
): Promise<string> {
  const userPrompt = `[개념코드] ${conceptCode}
[제목] ${title}
[원본 텍스트]
${original}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: userPrompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.15,
    },
  });

  const text = response.text?.trim();
  if (!text) throw new Error(`빈 응답: ${conceptCode}`);

  let result = text;
  if (result.startsWith('```')) {
    result = result.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
  }

  return result.trim();
}

// ─────────────────────────────────────────────
// 품질 검증
// ─────────────────────────────────────────────
function validateResult(original: string, rewritten: string, code: string): string[] {
  const issues: string[] = [];

  // 1. 대화형 잔재
  if (/안녕|친구들|여러분|볼까요|할까요|거예요|랍니다|이에요|해요[.!]/.test(rewritten)) {
    issues.push('대화형 잔재');
  }

  // 2. 너무 짧아진 경우 (원본의 50% 미만)
  if (rewritten.length < original.length * 0.5) {
    issues.push(`너무 짧음 (${original.length}→${rewritten.length}자)`);
  }

  // 3. 너무 길어진 경우 (원본의 200% 초과)
  if (rewritten.length > original.length * 2) {
    issues.push(`너무 김 (${original.length}→${rewritten.length}자)`);
  }

  // 4. $ 홀수 (깨진 KaTeX)
  const dollars = (rewritten.match(/\$/g) || []).length;
  if (dollars % 2 !== 0) {
    issues.push('$ 홀수 (KaTeX 깨짐)');
  }

  // 5. 줄바꿈 확인 (구조화 핵심!)
  if (!rewritten.includes('\n') && rewritten.length > 150) {
    issues.push('줄바꿈 없음');
  }

  // 6. 구조 기호 존재 확인 (200자 이상이면 최소 하나는 있어야)
  if (rewritten.length > 200) {
    const hasStructure = /[①②③④⑤⑥⑦⑧⑨⑩ⓐⓑⓒⓓⓔ]|\(\d+\)/.test(rewritten);
    if (!hasStructure) {
      issues.push('구조기호 없음');
    }
  }

  // 7. 3문장 이상 줄바꿈 없이 연속 체크
  const lines = rewritten.split('\n');
  for (const line of lines) {
    const sentences = line.split(/[.다]\s/).length;
    if (sentences >= 4 && line.length > 120) {
      issues.push('줄글 과다');
      break;
    }
  }

  // 8. 250자 미만
  if (rewritten.length < 250) {
    issues.push(`${rewritten.length}자 (250자 미만)`);
  }

  return issues;
}

// ─────────────────────────────────────────────
// 메인 실행
// ─────────────────────────────────────────────
async function main() {
  const concepts = await prisma.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { id: true, conceptCode: true, title: true, fullContent: true },
    orderBy: [{ sortOrder: 'asc' }, { conceptCode: 'asc' }],
  });

  console.log(`중1-1 개념 ${concepts.length}개 재작성 시작...\n`);

  let success = 0;
  let failed = 0;
  let warnings = 0;
  const errors: { code: string; error: string }[] = [];
  const warned: { code: string; issues: string[] }[] = [];

  const BATCH_SIZE = 5;
  const DELAY_MS = 1500;

  for (let i = 0; i < concepts.length; i += BATCH_SIZE) {
    const batch = concepts.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (c) => {
        const original = c.fullContent || '';
        if (original.length < 30) return { id: c.id, code: c.conceptCode, skip: true };

        const rewritten = await rewriteConcept(original, c.title, c.conceptCode || '');
        const issues = validateResult(original, rewritten, c.conceptCode || '');

        return {
          id: c.id,
          code: c.conceptCode,
          original,
          rewritten,
          issues,
          skip: false,
        };
      }),
    );

    for (const r of results) {
      if (r.status === 'rejected') {
        failed++;
        const code = batch[results.indexOf(r)]?.conceptCode || '?';
        errors.push({ code, error: String(r.reason).substring(0, 100) });
        console.log(`  ✗ ${code}: ${String(r.reason).substring(0, 80)}`);
        continue;
      }

      const val = r.value;
      if (!val || val.skip) continue;

      if (val.issues.length > 0) {
        warnings++;
        warned.push({ code: val.code || '', issues: val.issues });
        console.log(`  ⚠ ${val.code}: ${val.issues.join(', ')}`);
        // KaTeX 깨지면 스킵
        if (val.issues.some((i) => i.includes('KaTeX 깨짐'))) {
          failed++;
          console.log(`    → KaTeX 깨짐으로 스킵`);
          continue;
        }
      }

      // DB 업데이트
      await prisma.concept.update({
        where: { id: val.id },
        data: { fullContent: val.rewritten },
      });
      success++;
      console.log(`  ✓ ${val.code}: ${val.original.length}→${val.rewritten.length}자`);
    }

    const done = Math.min(i + BATCH_SIZE, concepts.length);
    const pct = ((done / concepts.length) * 100).toFixed(0);
    console.log(`[${pct}%] ${done}/${concepts.length} (성공:${success} 실패:${failed} 경고:${warnings})\n`);

    if (i + BATCH_SIZE < concepts.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  // ─────────────────────────────────────────────
  // 결과 요약
  // ─────────────────────────────────────────────
  console.log('=== 재작성 완료 ===');
  console.log(`성공: ${success}개`);
  console.log(`실패: ${failed}개`);
  console.log(`경고: ${warnings}개`);

  if (errors.length > 0) {
    console.log('\n--- 실패 목록 ---');
    errors.forEach((e) => console.log(`  ${e.code}: ${e.error}`));
  }

  if (warned.length > 0) {
    console.log('\n--- 경고 목록 ---');
    warned.forEach((w) => console.log(`  ${w.code}: ${w.issues.join(', ')}`));
  }

  // ─────────────────────────────────────────────
  // 사후 검증: 샘플 출력
  // ─────────────────────────────────────────────
  console.log('\n=== 변환 샘플 (대단원별 첫 개념) ===');
  const chapters = ['수와 연산', '문자와 식', '좌표평면과 그래프'];
  for (const ch of chapters) {
    const sample = await prisma.concept.findFirst({
      where: { grade: 'middle_1', semester: 1, chapter: ch },
      select: { conceptCode: true, title: true, fullContent: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (sample) {
      console.log(`\n--- ${ch} | ${sample.conceptCode} ${sample.title} ---`);
      const lines = (sample.fullContent || '').split('\n');
      lines.forEach((l) => console.log(`  ${l.substring(0, 120)}${l.length > 120 ? '...' : ''}`));
    }
  }

  // 구조 기호 사용 통계
  console.log('\n=== 구조 기호 사용 현황 ===');
  const allConcepts = await prisma.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { conceptCode: true, fullContent: true },
  });

  let withParens = 0, withCircled = 0, withLettered = 0, noStructure = 0;
  for (const c of allConcepts) {
    const content = c.fullContent || '';
    const hasParen = /\(\d+\)/.test(content);
    const hasCircled = /[①②③④⑤⑥⑦⑧⑨⑩]/.test(content);
    const hasLettered = /[ⓐⓑⓒⓓⓔ]/.test(content);
    if (hasParen) withParens++;
    if (hasCircled) withCircled++;
    if (hasLettered) withLettered++;
    if (!hasParen && !hasCircled && !hasLettered) {
      noStructure++;
      console.log(`  구조없음: ${c.conceptCode}`);
    }
  }
  console.log(`(N) 사용: ${withParens}/${allConcepts.length}`);
  console.log(`①②③ 사용: ${withCircled}/${allConcepts.length}`);
  console.log(`ⓐⓑⓒ 사용: ${withLettered}/${allConcepts.length}`);
  console.log(`구조 없음: ${noStructure}/${allConcepts.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
