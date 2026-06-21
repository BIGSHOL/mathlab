/**
 * 🚧 Lab — AI 문제생성기 품질 샘플 (DB 미저장, 콘텐츠 토대 2단계 검증용)
 *   실 개념그래프(seed-curriculum) 개념을 밴드·도메인·유형·난이도 다양하게 뽑아
 *   Gemini로 생성 → 본문/보기/정답/해설을 출력해 *품질*을 눈으로 확인.
 *   영속은 스키마 컬럼 확정 후 별도. 여긴 순수 생성+출력만.
 *
 *   실행: node --env-file=.env.local --import tsx scripts/lab/gen-sample.ts
 *   ⚠️ 실제 Gemini 호출(소액 비용). GEMINI_API_KEY 필요.
 */
import { prisma } from '@/lib/db';
import { generateProblem, type LabGenType } from '@/lib/lab/problem-gen';

const BAND_KR: Record<string, string> = { elem: '초등', mid: '중등', high: '고등' };
function bandOf(id: string): string {
  const m = id.match(/^lab-cur-(elem|mid|high)-/);
  return m ? BAND_KR[m[1]] : '';
}

// 다양성 샘플: (밴드, 도메인) 첫 개념 → 유형/난이도
const SAMPLE: { band: string; domain: string; type: LabGenType; difficulty: number }[] = [
  { band: 'mid', domain: '수와 연산', type: 'MULTIPLE_CHOICE', difficulty: 2 },
  { band: 'mid', domain: '문자와 식', type: 'SHORT_ANSWER', difficulty: 3 },
  { band: 'mid', domain: '함수', type: 'MULTIPLE_CHOICE', difficulty: 3 },
  { band: 'mid', domain: '기하', type: 'SHORT_ANSWER', difficulty: 4 },
  { band: 'high', domain: '문자와 식', type: 'DESCRIPTIVE', difficulty: 4 },
  { band: 'elem', domain: '수와 연산', type: 'MULTIPLE_CHOICE', difficulty: 2 },
];

const CIRCLED = ['①', '②', '③', '④', '⑤'];
function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

async function main() {
  let okCount = 0;
  let failCount = 0;
  const t0 = Date.now();

  for (const s of SAMPLE) {
    // (밴드, 도메인) 첫 개념
    const concept = await prisma.labConcept.findFirst({
      where: { id: { startsWith: `lab-cur-${s.band}-` }, domain: s.domain },
      orderBy: [{ monthIdx: 'asc' }, { sessionIdx: 'asc' }],
    });
    console.log('\n' + '═'.repeat(70));
    if (!concept) {
      console.log(`⚠️ 개념 없음: ${s.band}/${s.domain}`);
      continue;
    }
    const TYPE_KR: Record<LabGenType, string> = { MULTIPLE_CHOICE: '객관식', SHORT_ANSWER: '단답', DESCRIPTIVE: '서술형' };
    console.log(`[${bandOf(concept.id)} · ${concept.domain}] ${concept.name}  —  ${TYPE_KR[s.type]} · 난이도 ${s.difficulty}`);
    console.log('─'.repeat(70));
    try {
      const p = await generateProblem({
        conceptName: concept.name,
        domain: concept.domain ?? undefined,
        bandLabel: bandOf(concept.id),
        type: s.type,
        difficulty: s.difficulty,
      });
      okCount++;
      console.log('📝 ' + p.body);
      if (p.choices) {
        p.choices.forEach((c, i) => {
          const mark = (p.answer as { choice?: number }).choice === i + 1 ? ' ✅' : '';
          console.log(`   ${CIRCLED[i]} ${c}${mark}`);
        });
      }
      if (s.type === 'SHORT_ANSWER') console.log('정답:', (p.answer as { value?: string }).value);
      if (s.type === 'DESCRIPTIVE') console.log('루브릭:', trunc(String((p.answer as { rubric?: string }).rubric ?? ''), 280));
      if (p.explanation) console.log('해설:', trunc(p.explanation, 220));
    } catch (e) {
      failCount++;
      console.log('❌ 생성 실패:', e instanceof Error ? e.message : e);
    }
  }
  console.log('\n' + '═'.repeat(70));
  console.log(`완료 — 성공 ${okCount} · 실패 ${failCount} · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main()
  .catch((e) => {
    console.error('❌ 스크립트 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
