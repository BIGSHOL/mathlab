/**
 * 네이버 블로그 캡처 캐시 시그니처 회귀 검사.
 *
 * 단원만 교정하거나 학교명만 바꿔도 옛 PNG 를 재사용하면 안 된다.
 * 아무것도 안 바꿨으면 같은 키여야 재캡처 낭비가 없다.
 *
 * 실행: npx tsx scripts/parity/check-capture-sig.ts
 *    또는 npm run verify:capture-sig
 */
import {
  buildNaverCaptureSig,
  NAVER_CAPTURE_VERSION,
  questionCaptureSig,
  type CaptureSigMeta,
  type CaptureSigQuestion,
  type CaptureSigRegistryBlock,
} from '../../src/lib/exam-analysis/naver-capture-sig';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

const questions: CaptureSigQuestion[] = [
  {
    difficulty: '3',
    points: 5,
    question_type: 'algebra',
    ability_domain: 'calculation',
    is_correct: true,
    topic: '공통수학1 > 다항식 > 다항식의 연산',
    confidence: 0.9,
  },
];
const meta: CaptureSigMeta = {
  examTitle: '1학기 중간고사',
  schoolName: '정화중학교',
  grade: '중1',
  analyzedAt: '2026-08-01T00:00:00.000Z',
  totalQuestions: 1,
  totalPoints: 5,
};
const commentary = { overall_comment: '이번 시험은 표준 중심이다' };
const layoutSig = 'v3 theme-editorial layout-magazine|editorial|magazine|copy|header:classic:true';
const registryBlocks: CaptureSigRegistryBlock[] = [
  { id: 'header', variants: [{ id: 'classic' }, { id: 'compact' }] },
  { id: 'kpi', variants: [{ id: 'cards' }] },
];

const base = () =>
  buildNaverCaptureSig({
    commentary,
    questions,
    meta,
    layoutSig,
    registryBlocks,
    version: NAVER_CAPTURE_VERSION,
  });

console.log('── 캡처 시그니처 (naver-capture-sig) ──');
ok(NAVER_CAPTURE_VERSION === 'v4', '버전이 v4', NAVER_CAPTURE_VERSION);

const a = base();
const b = buildNaverCaptureSig({
  commentary,
  questions: [{ ...questions[0], topic: '공통수학1 > 함수 > 함수의 그래프' }],
  meta,
  layoutSig,
  registryBlocks,
  version: NAVER_CAPTURE_VERSION,
});
ok(a !== b, '단원만 바꿔도 sig 가 바뀐다');

const c = buildNaverCaptureSig({
  commentary,
  questions,
  meta: { ...meta, schoolName: '능인고등학교' },
  layoutSig,
  registryBlocks,
  version: NAVER_CAPTURE_VERSION,
});
ok(a !== c, '학교명만 바꿔도 바뀐다');

const d = base();
ok(a === d, '아무것도 안 바꾸면 그대로다');

console.log('\n── PATCH 교정 필드 · 레지스트리 구조 ──');
const conf = buildNaverCaptureSig({
  commentary,
  questions: [{ ...questions[0], confidence: 0.2 }],
  meta,
  layoutSig,
  registryBlocks,
  version: NAVER_CAPTURE_VERSION,
});
ok(a !== conf, '신뢰도만 바꿔도 sig 가 바뀐다');

const qRaw = questionCaptureSig(questions);
ok(qRaw.includes('다항식의 연산'), 'qSig 에 topic 이 들어간다', qRaw);
ok(qRaw.includes('0.9'), 'qSig 에 confidence 가 들어간다', qRaw);

const extraVariant = buildNaverCaptureSig({
  commentary,
  questions,
  meta,
  layoutSig,
  registryBlocks: [
    { id: 'header', variants: [{ id: 'classic' }, { id: 'compact' }, { id: 'poster' }] },
    { id: 'kpi', variants: [{ id: 'cards' }] },
  ],
  version: NAVER_CAPTURE_VERSION,
});
ok(a !== extraVariant, '레지스트리에 variant 가 늘면 sig 가 바뀐다');

const sameMetaOrder = buildNaverCaptureSig({
  commentary,
  questions,
  meta: {
    totalPoints: 5,
    analyzedAt: '2026-08-01T00:00:00.000Z',
    schoolName: '정화중학교',
    examTitle: '1학기 중간고사',
    totalQuestions: 1,
    grade: '중1',
  },
  layoutSig,
  registryBlocks,
  version: NAVER_CAPTURE_VERSION,
});
ok(a === sameMetaOrder, '메타 객체 키 순서가 달라도 같다');

console.log('\n──────────────────────────────');
if (fail) {
  console.log(`❌ ${fail}건 실패`);
  process.exit(1);
}
console.log('✅ 전부 통과');
