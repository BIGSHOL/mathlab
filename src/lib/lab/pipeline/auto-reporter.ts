// 🚧 Lab P4 — 보고(Reporter) auto 구현체 (결정적 리포트)
//   mastery 스냅샷 + 직전 리포트 대비 성장으로 학부모(PARENT)/원장(DIRECTOR) 리포트를 자동 생성·영속.
//   genMode=AUTO. p0Pipeline.reporter를 manualReporter→autoReporter로 플립.
//
//   ⚠️ 격리(CLAUDE.md): 기출분석/AI 에이전트 무import. *결정적 템플릿*(자체 AI 호출 없음 → 모델명 누출 0).
//      AI 내러티브는 P4b 선택 확장.
//   ⚠️ 성장(delta)은 직전 *같은 type* 리포트의 summary.snapshot과 비교로 계산(시계열 테이블 불필요).
//      매 리포트가 현재 스냅샷을 summary에 저장 → 다음 리포트가 diff. 첫 리포트는 prev 없음(baseline).
//   ⚠️ 사용자 노출(CLAUDE.md): PARENT는 정성 라벨(수치 자제, 12-5), DIRECTOR는 정확 수치.
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { Reporter, ReportDTO } from '../stages';
import {
  WEAKNESS_THRESHOLD,
  MASTERED_THRESHOLD,
  GROWTH_THRESHOLD,
  masteryLabel,
  overallLabel,
  masteryBucket,
} from '../report-policy';

export const autoReporter: Reporter = {
  mode: 'AUTO',
  // masteryDelta·periodStart/End는 Reporter 계약 입력이지만 여기선 직접 쓰지 않는다:
  //   리포트는 *현재 mastery 상태 스냅샷*(기간 필터링 아님)이고, 성장은 직전 리포트 대비로 계산.
  //   period는 리포트가 '대략 어느 구간을 다루는지' 메타데이터로 LabReport에 저장만 된다.
  async run({ studentId, periodStart, periodEnd, type }): Promise<ReportDTO> {
    const records = await prisma.labMasteryRecord.findMany({
      where: { studentId },
      include: { concept: true },
    });

    // 평가된 개념이 0개(데이터 없음) → '없음' 리포트. '약점 없이 고르게 학습'(좋은 상태)과 혼동 방지.
    if (records.length === 0) {
      const empty: Record<string, unknown> =
        type === 'PARENT'
          ? { kind: 'PARENT', snapshot: {}, overall: '데이터 없음', conceptCount: 0, grew: [], strengths: [], focus: [], concepts: [], message: '아직 평가된 개념이 없습니다. 학습을 시작하면 리포트가 채워집니다.' }
          : { kind: 'DIRECTOR', snapshot: {}, stats: { conceptCount: 0, mastered: 0, inProgress: 0, weak: 0, avgScore: 0, totalObservations: 0 }, byDomain: {}, weakConcepts: [], grown: [] };
      await prisma.labReport.create({
        data: { studentId, type, periodStart, periodEnd, summary: empty as Prisma.InputJsonValue, genMode: 'AUTO' },
      });
      return { studentId, type, url: '', summary: empty };
    }

    // 직전 같은 type 리포트의 스냅샷(성장 비교용) — Json? 안전 정규화(CLAUDE.md #11: 값이 number인지까지 검증).
    //   ⚠️ 한계: 같은 (student,type) 리포트를 *동시에* 생성하면 둘 다 같은 직전 스냅샷을 읽어 성장 체인이 어긋날 수 있다.
    //      리포트는 수동/주기 트리거라 동시 생성이 사실상 없고, 통계(현재 상태)는 항상 정확(어긋나도 grown delta만 영향).
    //      고빈도 트리거가 필요해지면 (student,type) 직렬화 또는 SERIALIZABLE 트랜잭션으로 보강.
    const prior = await prisma.labReport.findFirst({
      where: { studentId, type },
      orderBy: { createdAt: 'desc' },
    });
    const priorSnapshot: Record<string, number> = (() => {
      const s = prior?.summary;
      if (s && typeof s === 'object' && !Array.isArray(s)) {
        const snap = (s as { snapshot?: unknown }).snapshot;
        if (snap && typeof snap === 'object' && !Array.isArray(snap)) {
          const rec = snap as Record<string, unknown>;
          if (Object.values(rec).every((v) => typeof v === 'number')) return rec as Record<string, number>;
        }
      }
      return {};
    })();

    const snapshot: Record<string, number> = {};
    const concepts = records.map((r) => {
      snapshot[r.conceptId] = r.score;
      const prev = r.conceptId in priorSnapshot ? priorSnapshot[r.conceptId] : null;
      const delta = prev === null ? null : r.score - prev;
      return {
        conceptId: r.conceptId,
        name: r.concept.name,
        domain: r.concept.domain ?? '기타',
        score: r.score,
        observationCount: r.observationCount,
        bucket: masteryBucket(r.score),
        prev,
        delta,
      };
    });

    const n = concepts.length;
    const avgScore = n ? concepts.reduce((s, c) => s + c.score, 0) / n : 0;
    const grown = concepts.filter((c) => c.delta !== null && c.delta >= GROWTH_THRESHOLD);
    const strengths = concepts.filter((c) => c.score >= MASTERED_THRESHOLD);
    const focus = concepts.filter((c) => c.score < WEAKNESS_THRESHOLD);

    let summary: Record<string, unknown>;
    if (type === 'PARENT') {
      // 학부모: 정성 라벨·격려, 수치 자제.
      summary = {
        kind: 'PARENT',
        snapshot,
        overall: overallLabel(avgScore),
        conceptCount: n,
        grew: grown.map((c) => c.name),
        strengths: strengths.map((c) => c.name),
        focus: focus.map((c) => c.name),
        concepts: concepts.map((c) => ({
          name: c.name,
          level: masteryLabel(c.score),
          grew: c.delta !== null && c.delta >= GROWTH_THRESHOLD,
        })),
        message: buildParentMessage(overallLabel(avgScore), grown.length, focus.length),
      };
    } else {
      // 원장: 정확 통계.
      const byDomain: Record<string, { count: number; avg: number; weak: number }> = {};
      for (const c of concepts) {
        const d = (byDomain[c.domain] ??= { count: 0, avg: 0, weak: 0 });
        d.count += 1;
        d.avg += c.score;
        if (c.score < WEAKNESS_THRESHOLD) d.weak += 1;
      }
      for (const d of Object.values(byDomain)) d.avg = d.count ? d.avg / d.count : 0;
      summary = {
        kind: 'DIRECTOR',
        snapshot,
        stats: {
          conceptCount: n,
          mastered: concepts.filter((c) => c.bucket === 'mastered').length,
          inProgress: concepts.filter((c) => c.bucket === 'inProgress').length,
          weak: focus.length,
          avgScore,
          totalObservations: concepts.reduce((s, c) => s + c.observationCount, 0),
        },
        byDomain,
        weakConcepts: focus.map((c) => ({
          name: c.name,
          domain: c.domain,
          score: c.score,
          observationCount: c.observationCount,
        })),
        grown: grown.map((c) => ({ name: c.name, delta: c.delta })),
      };
    }

    await prisma.labReport.create({
      data: { studentId, type, periodStart, periodEnd, summary: summary as Prisma.InputJsonValue, genMode: 'AUTO' },
    });

    return { studentId, type, url: '', summary };
  },
};

/** 학부모용 정성 메시지(수치 노출 없음, 모델명 없음). */
function buildParentMessage(overall: string, grewCount: number, focusCount: number): string {
  const parts: string[] = [`이번 기간 종합 학습 상태는 '${overall}'입니다.`];
  if (grewCount > 0) parts.push(`${grewCount}개 개념에서 성장이 확인되었습니다.`);
  if (focusCount > 0) parts.push(`${focusCount}개 개념은 다음 기간 집중 지도가 필요합니다.`);
  else parts.push('약점 개념 없이 고르게 학습하고 있습니다.');
  return parts.join(' ');
}
