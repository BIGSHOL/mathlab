/**
 * 난이도 기준 단일화 회귀 검사 (적대적 리뷰 1.3).
 *
 * 한 프롬프트 안에 서로 다른 난이도 경계가 두 벌 이상 들어가면 AI 판정이 흔들린다.
 * 영어에는 수학 기준(정답률 90%+ · 개념 결합 · 식 변형 · 번호 위치)이 들어가면 안 되고,
 * 수학에는 영어 축이 들어가면 안 된다.
 *
 * 실행: npx tsx scripts/parity/check-difficulty-standards.ts
 */
import { EnglishExamPromptBuilder } from '../../src/lib/exam-analysis/english/prompt-builder';
import { MathExamPromptBuilder } from '../../src/lib/exam-analysis/math/prompt-builder';
import type { ExamContext } from '../../src/lib/exam-analysis/types';

const ctx = (subject: string): ExamContext => ({
  subject, grade_level: '중2', paper_type: 'blank',
  category: null, has_essay: true, exam_scope: [],
} as unknown as ExamContext);

const en = EnglishExamPromptBuilder.build(ctx('ENGLISH')).combined_prompt;
const ma = MathExamPromptBuilder.build(ctx('MATH')).combined_prompt;

let fail = 0;
function expect(prompt: string, needle: string, want: boolean, label: string) {
  const got = prompt.includes(needle);
  const ok = got === want;
  if (!ok) fail += 1;
  console.log(`  ${ok ? '✅' : '❌'} ${label}`);
}

console.log('── 영어 프롬프트: 수학 기준이 섞이지 않았는가 ──');
expect(en, '예상 정답률 90%+', false, '수학 경계(90%+) 없음');
expect(en, '2개 개념 결합 또는 식 변형', false, '수학 축(개념 결합·식 변형) 없음');
expect(en, '일반화 식/변수', false, '수학 축(추상도) 없음');
expect(en, '16~18번', false, '수학 위치 휴리스틱 없음');
expect(en, '애매하면 한 단계 낮게', false, '레거시 하향 편향 없음');
console.log('── 영어 프롬프트: 자기 기준은 있는가 ──');
expect(en, '정답률 85% 이상', true, '영어 경계(85%+) 있음');
expect(en, '**어휘 수준**', true, '영어 축(어휘 수준) 있음');
expect(en, '난이도 유형 검증', true, '유형 기준 V11 있음');

console.log('── 수학 프롬프트: 원래 기준 유지 + 영어 미유입 ──');
expect(ma, '예상 정답률 90%+', true, '수학 경계 유지');
expect(ma, '2개 개념 결합 또는 식 변형', true, '수학 축 유지');
expect(ma, '16~18번', true, '위치 휴리스틱 유지');
expect(ma, '**어휘 수준**', false, '영어 축 미유입');

console.log('\n──────────────────────────────');
if (fail) {
  console.log(`❌ ${fail}건 실패`);
  process.exit(1);
}
console.log('✅ 전부 통과 — 과목별 난이도 기준이 한 벌씩만 들어간다');
