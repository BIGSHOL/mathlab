// 🚧 Lab — [테스트] 자동 응답 기능 검증 (로그인/브라우저 불필요)
//   SolveForm의 자동 채우기가 만드는 답을 *실제 grader*(answer-compare.gradeObjective)로 채점해
//   ① 실 인제스트 문제의 정답키가 사용 가능한지(정답 빌드→정답 채점) ② 목표 정답률이 그대로 재현되는지 확인.
//   page.tsx의 정답 추출(answerText/correctChoice/correctValue)과 SolveForm.buildAnswer를 동일하게 복제.
//   서술형(DESCRIPTIVE)은 실 파이프라인이 AI 채점 → 여기선 결정 채점 불가라 카운트만(근사 명시).
//
//   사용: node --env-file=.env.local --import tsx scripts/lab/verify-autoanswer.ts
import { prisma } from '@/lib/db';
import { gradeObjective } from '@/lib/lab/answer-compare';

// ── page.tsx 복제: 단답/서술 정답 텍스트 추출 ──────────────────────────────
function answerText(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    for (const k of ['value', 'modelAnswer', 'text', 'answer', 'rubric']) {
      if (typeof o[k] === 'string') return o[k] as string;
    }
  }
  return '';
}

type P = { id: string; type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'DESCRIPTIVE'; answer: unknown; choices: string[] | null; difficulty: number };

function correctOf(p: P): { correctChoice: number | null; correctValue: string | null } {
  const a = p.answer as { choice?: number; value?: string } | null;
  return {
    correctChoice: p.type === 'MULTIPLE_CHOICE' && a && typeof a.choice === 'number' ? a.choice : null,
    correctValue: p.type !== 'MULTIPLE_CHOICE' ? answerText(p.answer) || null : null,
  };
}

// ── SolveForm 복제: 한 문항 답 빌드 ───────────────────────────────────────
function wrongShort(correct: string): string {
  const t = (correct ?? '').trim();
  if (/^-?\d+(\.\d+)?$/.test(t)) return String(Number(t) + 1);
  return t ? `${t}_오답` : '오답';
}
function buildAnswer(p: P, makeCorrect: boolean): { choice?: number; value?: string } {
  const { correctChoice, correctValue } = correctOf(p);
  if (p.type === 'MULTIPLE_CHOICE') {
    const total = p.choices && p.choices.length > 0 ? p.choices.length : 5;
    const opts = Array.from({ length: total }, (_, i) => i + 1);
    if (makeCorrect && correctChoice != null) return { choice: correctChoice };
    const wrong = opts.filter((n) => n !== correctChoice);
    return { choice: wrong.length ? wrong[Math.floor(Math.random() * wrong.length)] : correctChoice ?? 1 };
  }
  const cv = correctValue ?? '';
  if (makeCorrect) return { value: cv };
  if (p.type === 'DESCRIPTIVE') return { value: '잘 모르겠습니다.' };
  return { value: wrongShort(cv) };
}

async function main() {
  // 실 인제스트(본문 있음) 문제만 — 자동 응답이 실제로 쓰일 대상.
  const probs = (await prisma.labProblem.findMany({
    where: { body: { not: null } },
    select: { id: true, type: true, answer: true, choices: true, difficulty: true },
  })) as unknown as P[];

  console.log(`📦 실 인제스트 문제 ${probs.length}개 (본문 보유)\n`);

  // ── (1) 데이터 품질: '정답 빌드'가 실제 정답으로 채점되는가? ──
  const byType: Record<string, { n: number; correctOk: number; wrongOk: number; review: number; noKey: number }> = {};
  for (const p of probs) {
    const t = p.type;
    byType[t] ??= { n: 0, correctOk: 0, wrongOk: 0, review: 0, noKey: 0 };
    byType[t].n++;
    const { correctChoice, correctValue } = correctOf(p);
    if (p.type === 'MULTIPLE_CHOICE' ? correctChoice == null : !correctValue) byType[t].noKey++;

    if (t === 'DESCRIPTIVE') continue; // 실 파이프라인 AI 채점 → 결정 검증 제외

    const vCorrect = gradeObjective(p.type, p.answer, buildAnswer(p, true));
    const vWrong = gradeObjective(p.type, p.answer, buildAnswer(p, false));
    if (vCorrect.correct) byType[t].correctOk++;
    if (!vWrong.correct && !vWrong.needsReview) byType[t].wrongOk++;
    if (vCorrect.needsReview || vWrong.needsReview) byType[t].review++;
  }

  console.log('① 데이터 품질 (객관식·단답, 실 grader 채점):');
  for (const [t, s] of Object.entries(byType)) {
    if (t === 'DESCRIPTIVE') { console.log(`  ${t.padEnd(16)} n=${s.n} · 정답키 없음 ${s.noKey} · (AI 채점, 결정 검증 제외)`); continue; }
    const pc = (x: number) => `${((x / s.n) * 100).toFixed(1)}%`;
    console.log(`  ${t.padEnd(16)} n=${s.n} · 정답빌드→정답 ${pc(s.correctOk)} · 오답빌드→오답 ${pc(s.wrongOk)} · 정답키 없음 ${s.noKey} · 검수보류 ${s.review}`);
  }

  // ── (2) 목표 정답률 재현: computeFill(목표) → 실 채점 realized 비교 ──
  // 객관식·단답만 결정 채점 가능 → 그 부분집합으로 목표율 재현 측정.
  const objective = probs.filter((p) => p.type !== 'DESCRIPTIVE');
  console.log(`\n② 목표 정답률 재현 (객관식·단답 ${objective.length}문항, 가상 워크시트 1장 = 6문항 표본 × 반복):`);
  const N = Math.min(6, objective.length); // 화면 워크시트 크기 가정
  for (const target of [50, 70, 90, 100]) {
    let sumRealized = 0;
    const trials = 200;
    for (let trial = 0; trial < trials; trial++) {
      // N개 무작위 표본 → computeFill: round(N*target/100)개 정답(난이도 가중은 결과율과 무관 → 단순 셔플)
      const sample = [...objective].sort(() => Math.random() - 0.5).slice(0, N);
      const k = Math.round((N * target) / 100);
      const correctIds = new Set(sample.slice(0, k).map((p) => p.id)); // 어느 걸 정답으로 둘지(가중 무관)
      let got = 0;
      for (const p of sample) {
        const v = gradeObjective(p.type, p.answer, buildAnswer(p, correctIds.has(p.id)));
        if (v.correct) got++;
      }
      sumRealized += got / N;
    }
    const realized = (sumRealized / trials) * 100;
    const expected = (Math.round((N * target) / 100) / N) * 100;
    const flag = Math.abs(realized - expected) <= 1.0 ? '✅' : '⚠️';
    console.log(`  목표 ${String(target).padStart(3)}% → 기대 ${expected.toFixed(1)}% · 실측 ${realized.toFixed(1)}% ${flag}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
