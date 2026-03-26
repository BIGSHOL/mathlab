/**
 * 초등 개념 본문 서술형 재작성 스크립트
 *
 * 대화형(~해요, 안녕 친구들) → 서술형(~이다, ~라 한다)으로 변환
 * Gemini 2.5 Flash 사용, 개념 콘텐츠 패턴 규칙 적용
 */

import { GoogleGenAI } from '@google/genai';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY가 없습니다. .env.local을 확인하세요.');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

// ─────────────────────────────────────────────
// 개념 콘텐츠 패턴 (프롬프트)
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `당신은 한국 초등 수학 교재의 개념 텍스트를 **빈칸 학습 문제**에 최적화된 서술형으로 재작성하는 전문가입니다.

[목표]
주어진 대화형 개념 텍스트를 아래 규칙에 따라 **서술형 학습 텍스트**로 변환하세요.
원본의 수학적 내용을 100% 보존하면서, 빈칸 학습(5단계: 개념읽기 → 빈칸쉬움 → 빈칸어려움 → 통문장암기 → 백지복원)에 최적화된 형태로 바꿉니다.

[문체 규칙]
- 종결어미: ~이다, ~한다, ~라 한다, ~라고 한다, ~할 수 있다 (서술형)
- 절대 사용 금지: ~해요, ~거예요, ~랍니다, ~이에요, ~볼까요, ~할까요 (대화형)
- 인사/호칭 제거: "안녕", "친구들", "여러분", "우리" 등 삭제
- 감탄/격려 제거: "참 쉽죠", "할 수 있을 거예요", "정말 신기하죠" 등 삭제
- 질문형 제거: "~일까요?", "~볼까요?", "알아볼까요?" 등 삭제
- 모든 문장이 수학적 의미를 가져야 함 — 잡담, 감탄, 응원 문장 삭제

[구조 기호 체계]
- (1), (2), (3): 같은 단원 내 서로 다른 개념 구분
- ①, ②, ③: 하나의 개념 안에서 순서가 있는 절차/단계
- ⓐ, ⓑ, ⓒ: 여러 방법이나 종류 나열 (순서 무관)
- 원본에 이미 존재하면 유지, 새로 추가가 필요한 경우만 추가

[수식 규칙]
- 모든 숫자는 $...$로 감싸기 (예: $12$, $3.14$)
- 모든 수학 변수(a, b, x, n)는 $...$로 감싸기
- 곱셈: $\\times$, 나눗셈: $\\div$, 분수: $\\frac{a}{b}$
- 단, (1), (2), ①, ②, ⓐ, ⓑ 등 구조 기호의 숫자/문자는 감싸지 않음
- \\pi는 반드시 $\\pi$로 감싸기

[줄바꿈 규칙]
- 서로 다른 개념/주제가 전환될 때 줄바꿈
- (1), (2) 등 하위 개념 시작 전 줄바꿈
- ①, ② 등 순서 항목 시작 전 줄바꿈
- 한 문단은 2~4문장 적정

[내용 규칙]
- 정의: "~를 ~라 한다" 형태 유지
- 원본의 수학적 사실, 공식, 정의, 성질을 모두 보존
- 예시의 구체적 숫자와 계산은 보존 (설명으로서의 예시는 유지)
- "예를 들어" 대신 "예:" 또는 바로 예시 문장으로 작성
- 볼드(**) 사용하지 않음
- 마크다운 테이블(|...|) 사용하지 않음

[절대 금지]
- 원본에 없는 내용 추가하지 않기
- 수학적 사실을 변경하거나 오류 만들지 않기
- 원본 수식의 LaTeX를 변경하지 않기 ($ 감싸기만 추가)

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
      temperature: 0.2, // 낮은 temperature로 일관된 출력
    },
  });

  const text = response.text?.trim();
  if (!text) throw new Error(`빈 응답: ${conceptCode}`);

  // 코드 펜스 제거
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

  // 2. 너무 짧아진 경우 (원본의 40% 미만)
  if (rewritten.length < original.length * 0.4) {
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

  // 5. 빈 줄바꿈 확인
  if (!rewritten.includes('\n') && rewritten.length > 200) {
    issues.push('줄바꿈 없음');
  }

  return issues;
}

// ─────────────────────────────────────────────
// 메인 실행
// ─────────────────────────────────────────────
async function main() {
  const concepts = await prisma.concept.findMany({
    where: { grade: { startsWith: 'elementary_' } },
    select: { id: true, conceptCode: true, title: true, fullContent: true, grade: true },
    orderBy: [{ grade: 'asc' }, { conceptCode: 'asc' }],
  });

  console.log(`초등 개념 ${concepts.length}개 재작성 시작...\n`);

  // 진행률 및 통계
  let success = 0;
  let failed = 0;
  let warnings = 0;
  const errors: { code: string; error: string }[] = [];
  const warned: { code: string; issues: string[] }[] = [];

  // 배치 처리 (rate limit 방지)
  const BATCH_SIZE = 5;
  const DELAY_MS = 1000; // 배치 간 1초 대기

  for (let i = 0; i < concepts.length; i += BATCH_SIZE) {
    const batch = concepts.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (c) => {
        const original = c.fullContent || '';
        if (original.length < 50) return { id: c.id, code: c.conceptCode, skip: true };

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
        // 경고가 있어도 DB 업데이트 (심각하지 않으면)
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
    }

    // 진행률 출력
    const done = Math.min(i + BATCH_SIZE, concepts.length);
    const pct = ((done / concepts.length) * 100).toFixed(0);
    console.log(`[${pct}%] ${done}/${concepts.length} (성공:${success} 실패:${failed} 경고:${warnings})`);

    // rate limit 방지
    if (i + BATCH_SIZE < concepts.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  // ─────────────────────────────────────────────
  // 결과 요약
  // ─────────────────────────────────────────────
  console.log('\n=== 재작성 완료 ===');
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

  // 사후 검증: 학년별 샘플
  console.log('\n=== 변환 샘플 ===');
  const grades = ['elementary_3', 'elementary_4', 'elementary_5', 'elementary_6'];
  for (const g of grades) {
    const sample = await prisma.concept.findFirst({
      where: { grade: g },
      select: { conceptCode: true, fullContent: true },
      orderBy: { conceptCode: 'asc' },
    });
    if (sample) {
      const paras = (sample.fullContent || '').split('\n');
      console.log(`\n--- ${g.replace('elementary_', '초')} | ${sample.conceptCode} ---`);
      paras.forEach((p) => console.log(`  ${p.substring(0, 100)}${p.length > 100 ? '...' : ''}`));
    }
  }

  // 대화형 잔재 전수 검사
  console.log('\n=== 대화형 잔재 전수 검사 ===');
  const afterAll = await prisma.concept.findMany({
    where: { grade: { startsWith: 'elementary_' } },
    select: { conceptCode: true, fullContent: true },
  });
  let chattyRemain = 0;
  for (const c of afterAll) {
    if (/안녕|친구들|여러분|볼까요|할까요|거예요|랍니다|이에요/.test(c.fullContent || '')) {
      chattyRemain++;
      if (chattyRemain <= 5) console.log(`  ${c.conceptCode}: 대화형 잔재`);
    }
  }
  console.log(`대화형 잔재: ${chattyRemain}/${afterAll.length}개`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
