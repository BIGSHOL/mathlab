// 🚧 Lab 파이프라인 조립 (P0 토대 + P1 채점 auto)
//   "P0/P1"은 *빌드 단계*를 가리키는 라벨이지 파이프라인 버전이 아니다 — 객체는 하나(p0Pipeline)를
//   유지하고, manual↔auto 플립은 필드 1개를 다른 구현체로 교체하는 것뿐(runCycle/서비스 무손상).
//     P0: 척추 + dumb 처방(진도표만) + manual 공급/채점
//     P1: grader만 manualGrader → autoGrader (객관식·단답 자동채점)
//     P2: diagnoser만 manualDiagnoser → autoDiagnoser (BKT p(mastered))
//     P3: prescriber만 dumbPrescriber → smartPrescriber (BKT 약점·선수개념 적응 처방)
//   manual/dumb 구현체는 export로 보존(back-compat·참조용). 객체명 p0Pipeline은 의도적으로 유지.
import type { Pipeline } from '../stages';
import { manualDiagnoser } from './manual-diagnoser';
import { autoDiagnoser } from './auto-diagnoser';
import { dumbPrescriber } from './dumb-prescriber';
import { smartPrescriber } from './smart-prescriber';
import { manualSupplier } from './manual-supplier';
import { manualGrader } from './manual-grader';
import { autoGrader } from './auto-grader';
import { manualReporter } from './manual-reporter';

export const p0Pipeline: Pipeline = {
  diagnoser: autoDiagnoser, // P2: BKT 진단. 멱등성은 service가 diagnosedAt으로 보장.
  prescriber: smartPrescriber, // P3: BKT 약점·선수개념 적응 처방(핵심 해자).
  supplier: manualSupplier,
  grader: autoGrader, // P1: 자동채점(객관식·단답). manual은 멱등 read로 흡수됨.
  reporter: manualReporter,
};

export {
  manualDiagnoser,
  autoDiagnoser,
  dumbPrescriber,
  smartPrescriber,
  manualSupplier,
  manualGrader,
  autoGrader,
  manualReporter,
};
