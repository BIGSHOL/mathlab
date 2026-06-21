// 🚧 Lab P3 — 처방(Prescriber) smart 구현체 (핵심 해자)
//   dumbPrescriber(진도표만, mastery 무시)를 대체: BKT p(mastered) 약점 + 선수개념 그래프 반영.
//   genMode=AUTO. p0Pipeline.prescriber를 dumbPrescriber→smartPrescriber로 플립(1줄).
//
//   ⚠️ 격리(CLAUDE.md): 기출분석 무import. 정책/임계는 ../prescribe-policy(Lab 자체).
//
//   결정 (MVP):
//     (A) 무엇 = 선수개념 토대 주입 + 진도표 현위치 + 과거 약점 복습(top K)
//     (B) 난이도 = mastery 적응(약하면↓ 강하면↑, 교정은 상한 3)
//     (C) 문항수 = mastery 적응(약하면 적게, 강하면 많게)
//     (D) 선수개념 = 소프트 게이팅 — 미흡 선수를 *막지 않고 함께* 처방하고 앞 순서로(토대 보강)
//   각 항목 reason에 근거(점수·선수개념)를 남겨 분석 추적성 확보.
import { prisma } from '@/lib/db';
import type { Prescriber, PrescriptionDTO, PrescriptionItemDTO } from '../stages';
import {
  WEAKNESS_THRESHOLD,
  PREREQ_READY_THRESHOLD,
  MAX_WEAKNESS_OVERLAY,
  prescribeParams,
  hasEvidence,
} from '../prescribe-policy';

export const smartPrescriber: Prescriber = {
  mode: 'AUTO',
  async run({ studentId, mastery, track, monthIdx, sessionIdx }): Promise<PrescriptionDTO> {
    const currentConcepts = await prisma.labConcept.findMany({
      where: { track, monthIdx, sessionIdx },
      orderBy: { id: 'asc' },
    });

    const items: Omit<PrescriptionItemDTO, 'order'>[] = [];
    const prescribed = new Set<string>();

    // (D) 선수개념 토대 주입: 약한 현위치 개념의 '미흡 선수개념'을 먼저 처방(앞 순서).
    //     강하거나 증거 없는 현위치 개념은 토대가 충분하다고 보고 주입 안 함.
    const currentIds = new Set(currentConcepts.map((c) => c.id));
    for (const c of currentConcepts) {
      const cEntry = mastery[c.id];
      if (!hasEvidence(cEntry) || cEntry!.score >= WEAKNESS_THRESHOLD) continue;
      const edges = await prisma.labConceptEdge.findMany({ where: { dependentId: c.id } });
      for (const e of edges) {
        // 이미 처방됐거나, 선수개념이 현위치 개념이기도 하면 스킵(현위치 루프가 CURRENT_POSITION으로 다룸 — 태그 일관).
        if (prescribed.has(e.prereqId) || currentIds.has(e.prereqId)) continue;
        const pEntry = mastery[e.prereqId];
        // '미흡 선수'면 주입: ① 증거 있고 < READY(약함), 또는 ② 증거 없음(미시도 → 토대 미검증).
        //   충분한 선수(증거 있고 ≥ READY)만 스킵. 소프트 게이팅 취지: 약한 현위치의 흔들리는 토대를 보강.
        if (hasEvidence(pEntry) && pEntry!.score >= PREREQ_READY_THRESHOLD) continue;
        const { difficulty, count } = prescribeParams(pEntry, true); // cold 선수는 기본값(2,5)
        const pTag = hasEvidence(pEntry) ? pEntry!.score.toFixed(2) : 'cold';
        items.push({
          conceptId: e.prereqId,
          difficulty,
          count,
          reason: `PREREQ_GAP(선수 ${e.prereqId}=${pTag} < 현 ${c.id})`,
        });
        prescribed.add(e.prereqId);
      }
    }

    // (A·B·C) 진도표 현위치 개념 — 강하면 NORMAL(난이도↑ 가능), 약하면 교정(상한 3).
    for (const c of currentConcepts) {
      if (prescribed.has(c.id)) continue;
      const cEntry = mastery[c.id];
      const weak = hasEvidence(cEntry) && cEntry!.score < WEAKNESS_THRESHOLD;
      const { difficulty, count } = prescribeParams(cEntry, weak);
      const tag = hasEvidence(cEntry) ? cEntry!.score.toFixed(2) : 'cold';
      items.push({ conceptId: c.id, difficulty, count, reason: `CURRENT_POSITION(${tag})` });
      prescribed.add(c.id);
    }

    // (A) 과거 약점 복습: 관측 있고 약하며, 아직 미처방·현위치 아닌 개념 top K(가장 약한 순).
    const weakOverlay = Object.values(mastery)
      .filter((m) => hasEvidence(m) && m.score < WEAKNESS_THRESHOLD && !prescribed.has(m.conceptId))
      .sort((a, b) => a.score - b.score || a.conceptId.localeCompare(b.conceptId)) // 동점은 conceptId로 tiebreak → 결정적
      .slice(0, MAX_WEAKNESS_OVERLAY);
    for (const w of weakOverlay) {
      const { difficulty, count } = prescribeParams(w, true);
      items.push({ conceptId: w.conceptId, difficulty, count, reason: `WEAKNESS_REVIEW(${w.score.toFixed(2)})` });
      prescribed.add(w.conceptId);
    }

    return {
      studentId,
      items: items.map((it, i) => ({ ...it, order: i })),
      rationale: `SMART 처방 — 선수보강 + 현위치 ${currentConcepts.length} + 약점복습 ${weakOverlay.length} (난이도·문항 mastery 적응)`,
    };
  },
};
