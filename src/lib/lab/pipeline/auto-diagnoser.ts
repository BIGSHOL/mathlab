// 🚧 Lab P2 — 진단(Diagnoser) auto 구현체 (BKT)
//   누적 정답률(manualDiagnoser) 대신 BKT로 p(mastered)를 갱신한다.
//   genMode=AUTO. p0Pipeline.diagnoser를 manualDiagnoser→autoDiagnoser로 플립(1줄).
//
//   ⚠️ 격리(CLAUDE.md): 기출분석 무import. BKT는 ../bkt(Lab 자체).
//   ⚠️ 멱등성: 같은 제출의 이중 관측 방지는 service.runStudentCycle이 diagnosedAt으로 게이트.
//      (여기선 주어진 graded 시퀀스를 1회 반영만 한다 — diagnoser는 순수 함수.)
//   ⚠️ observationCount는 메타데이터(관측 수)로만 갱신. BKT 가중치로는 쓰지 않는다.
//      (BKT는 시퀀스 기반 — 관측마다 prior를 posterior로 조건화하므로 '많을수록 강한 신뢰'가
//       p(mastered) 자체에 이미 반영됨. observationCount는 대시보드/신뢰도 표시·디버깅용.)
import { prisma } from '@/lib/db';
import type { Diagnoser, MasteryDelta, MasteryEntry } from '../stages';
import { BKT_PARAMS, bktFold } from '../bkt';

export const autoDiagnoser: Diagnoser = {
  mode: 'AUTO',
  async run({ studentId, graded }): Promise<MasteryDelta> {
    if (graded.length === 0) return { studentId, updates: [] };

    // 개념별 관측 시퀀스(정/오 순서 보존 — BKT는 순서 민감)
    const seqByConcept = new Map<string, boolean[]>();
    for (const g of graded) {
      const arr = seqByConcept.get(g.conceptId) ?? [];
      arr.push(g.correct);
      seqByConcept.set(g.conceptId, arr);
    }

    const updates: MasteryEntry[] = [];
    for (const [conceptId, seq] of seqByConcept) {
      const existing = await prisma.labMasteryRecord.findUnique({
        where: { studentId_conceptId: { studentId, conceptId } },
      });
      // prior: 기존 신념(관측 있으면) 아니면 pL0. P0/P1 누적점수도 신념으로 이어받음('공짜로 켬').
      const prior = existing && existing.observationCount > 0 ? existing.score : BKT_PARAMS.pL0;
      const newScore = bktFold(prior, seq);
      const newObs = (existing?.observationCount ?? 0) + seq.length;

      await prisma.labMasteryRecord.upsert({
        where: { studentId_conceptId: { studentId, conceptId } },
        create: {
          studentId,
          conceptId,
          score: newScore,
          observationCount: newObs,
          lastObservedAt: new Date(),
          genMode: 'AUTO',
        },
        update: { score: newScore, observationCount: newObs, lastObservedAt: new Date(), genMode: 'AUTO' },
      });
      updates.push({ conceptId, score: newScore, observationCount: newObs });
    }

    return { studentId, updates };
  },
};
