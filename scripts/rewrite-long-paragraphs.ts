/**
 * 초등 개념 긴 문단 구조화 스크립트 (2차)
 *
 * C유형: 구조 기호 없이 정의/서술이 길게 이어지는 문단 → 문장 단위 줄바꿈 + 구조 기호 추가
 * D유형: 순서가 있는 절차인데 ①② 없는 경우 → ①② 추가
 */

import { GoogleGenAI } from '@google/genai';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error('GEMINI_API_KEY 없음'); process.exit(1); }
const ai = new GoogleGenAI({ apiKey });

const SYSTEM_PROMPT = `당신은 한국 초등 수학 개념 텍스트의 구조를 개선하는 전문가입니다.

[목표]
주어진 개념 텍스트에서 **긴 문단을 구조화**하세요.
수학적 내용은 절대 변경하지 않고, 줄바꿈과 구조 기호만 추가합니다.

[규칙]
1. 한 문단에 핵심 정보가 여러 개 포함되면 **줄바꿈으로 분리**
2. 서로 다른 개념이 한 문단에 있으면 **(1), (2)** 등으로 구분
3. 순서가 있는 절차가 나열되면 **①, ②, ③**으로 구분
4. 여러 방법/종류가 나열되면 **ⓐ, ⓑ, ⓒ**로 구분
5. 한 항목은 1~2문장(약 80자 이내)이 이상적
6. 기존에 이미 있는 (1)(2), ①② 구조는 그대로 유지
7. 예) 로 시작하는 예시 문단은 건드리지 않음

[절대 금지]
- 문장 내용, 수식, 단어를 변경하지 않기
- 문장을 삭제하거나 새로 추가하지 않기
- 문체를 변경하지 않기 (~이다 → ~해요 등)
- 볼드(**) 추가하지 않기

[출력]
구조화된 텍스트만 출력. 설명 없이 본문만 반환.`;

// 대상 판별: 긴 문단(한글 단어 13개+)이 있고, 구조화 안 된 개념
function needsRestructure(fc: string): boolean {
  const paras = fc.split('\n').filter(p => p.trim().length > 0);
  const hasStructure = /\(\d\)|[①②③④⑤]/.test(fc);

  for (const p of paras) {
    const isExample = /^예\)/.test(p.trim());
    if (isExample) continue;

    const noLatex = p.replace(/\$[^$]+\$/g, 'L');
    const korWords = (noLatex.match(/[가-힣]{2,}/g) || []).length;

    if (korWords > 12) {
      // C유형: 구조 기호 없이 장문
      if (!hasStructure) return true;
      // D유형: 구조 기호 있어도 이 문단 자체에 기호가 없고 절차형
      if (!/\(\d\)|[①②③]/.test(p) && /먼저|다음|그다음|마지막|그리고/.test(p)) return true;
      // 구조 기호 있어도 개별 항목이 너무 길면
      if (!/\(\d\)|[①②③]/.test(p) && korWords > 18) return true;
    }
  }
  return false;
}

async function restructureConcept(fc: string, title: string, code: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `[개념코드] ${code}\n[제목] ${title}\n[텍스트]\n${fc}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.1,
    },
  });

  let text = response.text?.trim() || '';
  if (text.startsWith('```')) {
    text = text.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
  }
  return text.trim();
}

function validate(original: string, result: string): string[] {
  const issues: string[] = [];
  if (/안녕|친구들|여러분|해요[.!]|거예요|랍니다/.test(result)) issues.push('대화형 잔재');
  if (result.length < original.length * 0.7) issues.push(`너무 짧음(${original.length}→${result.length})`);
  if (result.length > original.length * 1.5) issues.push(`너무 김(${original.length}→${result.length})`);
  const dollars = (result.match(/\$/g) || []).length;
  if (dollars % 2 !== 0) issues.push('KaTeX 깨짐');
  return issues;
}

async function main() {
  const concepts = await prisma.concept.findMany({
    where: { grade: { startsWith: 'elementary_' } },
    select: { id: true, conceptCode: true, title: true, fullContent: true, grade: true },
    orderBy: [{ grade: 'asc' }, { conceptCode: 'asc' }],
  });

  const targets = concepts.filter(c => needsRestructure(c.fullContent || ''));
  console.log(`대상: ${targets.length}개 / 전체 ${concepts.length}개\n`);

  let success = 0, failed = 0, skipped = 0;
  const BATCH_SIZE = 5;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (c) => {
        const result = await restructureConcept(c.fullContent || '', c.title, c.conceptCode || '');
        const issues = validate(c.fullContent || '', result);
        return { id: c.id, code: c.conceptCode, result, issues };
      }),
    );

    for (const r of results) {
      if (r.status === 'rejected') {
        failed++;
        console.log(`  ✗ ${batch[results.indexOf(r)]?.conceptCode}: ${String(r.reason).substring(0, 80)}`);
        continue;
      }
      const v = r.value;
      if (v.issues.some(i => i.includes('KaTeX'))) {
        failed++;
        console.log(`  ✗ ${v.code}: KaTeX 깨짐 → 스킵`);
        continue;
      }
      if (v.issues.length > 0) {
        console.log(`  ⚠ ${v.code}: ${v.issues.join(', ')}`);
      }
      await prisma.concept.update({ where: { id: v.id }, data: { fullContent: v.result } });
      success++;
    }

    const done = Math.min(i + BATCH_SIZE, targets.length);
    console.log(`[${((done / targets.length) * 100).toFixed(0)}%] ${done}/${targets.length} (성공:${success} 실패:${failed})`);

    if (i + BATCH_SIZE < targets.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\n=== 완료: 성공 ${success} / 실패 ${failed} ===`);

  // 샘플
  console.log('\n=== 변환 샘플 ===');
  for (const t of targets.slice(0, 4)) {
    const after = await prisma.concept.findFirst({ where: { id: t.id }, select: { conceptCode: true, fullContent: true } });
    console.log('\n--- ' + after!.conceptCode + ' ---');
    console.log(after!.fullContent);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
