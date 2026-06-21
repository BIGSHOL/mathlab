/**
 * 🚧 Lab P5 — 실 Gemini 서술형 채점 스모크 (선택, 실 API 비용 1~2콜)
 *   verify-p5는 결정적 스텁(비용 0). 이 스크립트는 *실제 Gemini 호출*이 동작하는지 확인한다.
 *   ⚠️ 명시 opt-in: LAB_P5_REAL_AI=1 일 때만 실행(실제 GEMINI_API_KEY 비용 발생, Flash 소액).
 *
 *   실행: LAB_P5_REAL_AI=1 node --env-file=.env.local --import tsx scripts/lab/smoke-p5-real-ai.ts
 *   (env에 GEMINI_API_KEY 필요. 좋은 답이 나쁜 답보다 점수가 높으면 PASS.)
 */
import { resetDescriptiveGrader, gradeDescriptive } from '@/lib/lab/pipeline/descriptive-grader';

async function main() {
  if (process.env.LAB_P5_REAL_AI !== '1') {
    console.log('⏭  스킵: 실 AI 스모크는 LAB_P5_REAL_AI=1 일 때만 실행(비용 발생).');
    console.log('   예) LAB_P5_REAL_AI=1 node --env-file=.env.local --import tsx scripts/lab/smoke-p5-real-ai.ts');
    process.exit(0);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY 미설정');
    process.exit(1);
  }
  resetDescriptiveGrader(); // 실 AI 채점기 사용

  const rubric = {
    rubric:
      '모범답안: 자연수의 덧셈은 두 수를 합쳐 더 큰 수를 만드는 연산이다. 수직선에서 오른쪽으로 이동하는 것으로 설명할 수 있다. 핵심 포인트: 합·증가의 의미, 교환법칙 언급 시 가점.',
  };
  const good = await gradeDescriptive({
    rubric,
    studentAnswer: { value: '자연수의 덧셈은 두 수를 합쳐 더 큰 수를 만드는 연산입니다. 수직선에서 오른쪽으로 이동하며, 더하는 순서를 바꿔도 결과가 같습니다(교환법칙).' },
    conceptName: '자연수의 덧셈',
  });
  const bad = await gradeDescriptive({
    rubric,
    studentAnswer: { value: '잘 모르겠어요.' },
    conceptName: '자연수의 덧셈',
  });

  console.log('좋은 답 채점:', JSON.stringify(good));
  console.log('나쁜 답 채점:', JSON.stringify(bad));
  const ok = good.partialScore > bad.partialScore && good.correct === true;
  console.log(ok ? '🎉 실 AI 스모크 PASS — 좋은 답 점수 > 나쁜 답 점수' : '⚠️  결과 확인 필요(AI 비결정적 — 재시도 가능)');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error('❌ 스모크 오류:', e instanceof Error ? e.message : e);
  process.exit(1);
});
