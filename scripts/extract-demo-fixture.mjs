/**
 * 데모 픽스처 추출 — 실제 완료 분석본들을 익명화하여 src/lib/demo/demo-exams.json (배열) 생성.
 *
 * 사용: node --env-file=.env.local scripts/extract-demo-fixture.mjs
 *
 * 익명화:
 *  - 학교명/제목/teacher/tenant 등 식별 정보 → OO고/OO중·A고·B고 마스킹 (실존 학교 충돌 사전 차단)
 *  - 본문(코멘트·총평) 내 등장하는 실제 학교명 → SCHOOL_MAP 치환
 *  - 교정 이력 플래그 제거 (데모 사용자는 아직 교정 전 — 교정된 최종 값은 유지)
 *  - 치환 후 남은 학교명 패턴을 스캔해 경고 출력 (수동 확인용)
 *
 * 픽스처 id = demo-g1/demo-m2/demo-m3 — 컴포넌트 내부 fetch가 데모 리터럴 라우트
 * (canonical "demo" 라우트의 re-export)로 가도록 라우트 폴더명과 1:1 일치.
 */
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// 추출 대상 — metadata+commentary 완비 분석본. titleOverride로 데모 표기 제목 지정.
// key → 픽스처 id = `demo-${key}` (리터럴 API 라우트 폴더명과 일치해야 함: demo-g1/demo-m2/demo-m3)
const SAMPLES = [
  { paperId: 'cmpw5489a0001vdx0n7087q01', key: 'g1', titleOverride: 'OO고 1학년 공통수학1 2026년 1학기 중간고사', desc: '고1 공통수학1' },
  { paperId: 'cmpusyfn0000dvddkmw44ykn3', key: 'm2', titleOverride: 'OO중 2학년 2026년 1학기 중간고사', desc: '중2 수학' },
  { paperId: 'cmpuqt1tm0001vddkfxaxj5ip', key: 'm3', titleOverride: 'OO중 3학년 2026년 1학기 중간고사', desc: '중3 수학' },
];

// 실제 학교명 → 마스킹 치환표 (긴 이름 먼저 — '제일고등학교'가 '제일고'보다 먼저 매칭되도록 정렬됨)
// 가상 이름도 실존 학교와 겹칠 수 있어 OO고/A고 식 마스킹으로 사전 차단 (2026-06-11 사용자 지시).
// 본교 = OO고/OO중, 인근 학교 = A고·B고·… (비교 텍스트에서 서로 구분되도록 알파벳 부여)
const SCHOOL_MAP = {
  '제일고등학교': 'OO고등학교',
  '제일고': 'OO고',
  '경상고등학교': 'A고',
  '경상여자고등학교': 'B여고',
  '경상여고': 'B여고',
  '경상고': 'A고',
  '능인고등학교': 'C고',
  '능인고': 'C고',
  '경명여자고등학교': 'D여고',
  '경명여고': 'D여고',
  '성광고등학교': 'E고',
  '성광고': 'E고',
  '칠성고등학교': 'F고',
  '칠성고': 'F고',
  '영진고등학교': 'G고',
  '영진고': 'G고',
  '성화여자고등학교': 'H여고',
  '성화여고': 'H여고',
  '신명고등학교': 'I고',
  '신명고': 'I고',
  '대구일중학교': 'OO중학교',
  '대구일중': 'OO중',
  // 중학교 인근 비교에 등장 가능한 학교들 (스캔 결과 따라 보강)
  '경복중학교': 'A중',
  '경복중': 'A중',
  '대구중학교': 'B중',
  '대구중': 'B중',
  '경상중학교': 'C중',
  '경상중': 'C중',
  '대구': '○○지역',
};

function scrubText(s) {
  let out = s;
  for (const [real, fake] of Object.entries(SCHOOL_MAP)) {
    out = out.split(real).join(fake);
  }
  return out;
}

/** 객체/배열/문자열 재귀 치환 */
function scrubDeep(v) {
  if (typeof v === 'string') return scrubText(v);
  if (Array.isArray(v)) return v.map(scrubDeep);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = scrubDeep(val);
    return out;
  }
  return v;
}

const p = new PrismaClient();
try {
  const fixtures = [];
  for (const { paperId, key, titleOverride, desc } of SAMPLES) {
    const paper = await p.examPaper.findUnique({
      where: { id: paperId },
      select: {
        title: true, subject: true, grade: true, category: true, examScope: true,
        examType: true, schoolName: true,
        analyses: {
          select: {
            questions: true, summary: true, modelVersion: true,
            totalQuestions: true, totalPoints: true, earnedPoints: true, analyzedAt: true,
            extensions: { where: { agentType: 'commentary' }, select: { result: true, createdAt: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!paper || !paper.analyses[0]) throw new Error('분석본을 찾을 수 없습니다: ' + paperId);

    const a = paper.analyses[0];
    const commentaryExt = a.extensions[0] ?? null;
    if (!commentaryExt) throw new Error('commentary extension이 없습니다: ' + paperId);

    // 교정 이력 제거 — 데모 사용자는 아직 교정 안 했으므로 "선생님 교정 N건 반영" 표시가 어색.
    // 교정된 최종 값(difficulty 등)은 유지하고 플래그/AI 원본 보존 필드만 제거.
    const cleanQuestions = (Array.isArray(a.questions) ? a.questions : []).map((q) => {
      const { manually_edited, manually_edited_at, ai_difficulty, ai_points, ai_topic, ai_question_type, ai_ability_domain, ...rest } = q;
      return rest;
    });

    // 총평 readiness 사전 검증 — 깨진 샘플이 데모에 들어가면 [총평 생성]이 비활성화됨
    const ptsSum = cleanQuestions.reduce((s, q) => s + (q.points || 0), 0);
    const expected = a.totalPoints && a.totalPoints > 0 ? a.totalPoints : 100;
    const unknownTopics = cleanQuestions.filter((q) => !(q.topic || '').trim() || /UNKNOWN|미정/i.test(q.topic || '')).length;
    if (Math.round(ptsSum * 100) / 100 !== expected || unknownTopics > 0) {
      throw new Error(`readiness 실패 (${paperId}): 배점합 ${ptsSum}/${expected}, 미분류 ${unknownTopics}건`);
    }

    // ExamPaperData 형태 (src/app/(teacher)/exam-analysis/types.ts) — id는 리터럴 라우트와 1:1
    fixtures.push({
      id: `demo-${key}`,
      title: titleOverride ?? scrubText(paper.title),
      subject: paper.subject,
      grade: paper.grade,
      category: paper.category,
      examScope: scrubDeep(paper.examScope),
      examType: paper.examType,
      status: 'COMPLETED',
      analysisStep: 4,
      schoolName: scrubText(paper.schoolName ?? ''),
      schoolId: null, // 주변학교 fetch 차단 (nearby-count는 실제 API라 데모에서 스킵)
      school: null,
      errorMessage: null,
      extractedToBankAt: null,
      createdAt: new Date().toISOString(),
      teacher: { id: 'demo-teacher', name: '데모 선생님' },
      student: null,
      analyses: [
        {
          id: `demo-analysis-${key}`,
          questions: scrubDeep(cleanQuestions),
          summary: scrubDeep(a.summary),
          modelVersion: a.modelVersion,
          totalQuestions: a.totalQuestions,
          totalPoints: a.totalPoints,
          earnedPoints: a.earnedPoints,
          analyzedAt: a.analyzedAt?.toISOString() ?? null,
          extensions: [
            {
              id: 'demo-ext-commentary',
              agentType: 'commentary',
              result: scrubDeep(commentaryExt.result),
              createdAt: commentaryExt.createdAt.toISOString(),
              errorMessage: null,
            },
          ],
        },
      ],
    });
    console.log(`✅ ${desc}: ${titleOverride} | ${a.totalQuestions}문항 ${a.totalPoints}점`);
  }

  // 잔존 학교명 패턴 스캔 (수동 확인)
  const json = JSON.stringify(fixtures);
  const found = new Set();
  for (const m of json.matchAll(/[가-힣]{2,8}(?:고등학교|여자고등학교|여고|중학교)/g)) found.add(m[0]);
  for (const m of json.matchAll(/[가-힣]{2,5}[고중](?=[\s"\\.,?!)\]])/g)) found.add(m[0]);

  const outPath = resolve('src/lib/demo/demo-exams.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(fixtures, null, 1), 'utf8');

  console.log('\n✅ 픽스처 저장:', outPath, `(${fixtures.length}개, ${Math.round(json.length / 1024)}KB)`);
  console.log('\n⚠️ 잔존 학교명 의심 패턴 (수동 확인):');
  console.log([...found].join(', ') || '(없음)');
} finally {
  await p.$disconnect();
}
