/**
 * 🚧 Lab — 실제 개념그래프 시드 (curriculum.ts → LabConcept/LabConceptEdge)
 *
 *   합성 5개 개념을 교체할 "진짜" 커리큘럼 개념그래프를 메인앱 curriculum.ts에서 변환.
 *   격리 규칙(ADDITIVE-ONLY): curriculum.ts는 읽기 전용 재사용. Lab* 테이블에만 쓰기.
 *
 *   ── 변환 설계 (모두 휴리스틱 — 84개월 진도표·선수관계 정보가 repo에 없음) ──
 *   • 그레인 = 중단원 (대단원의 subUnits 첫 레이어). subUnits 없으면 대단원 자체.
 *   • 순서   = 학기 25개(초12·중6·고7)를 elem→mid→high 연결. monthIdx = 학기 서수(1..25),
 *              sessionIdx = 학기 내 개념 누적 순서(1..k). (literal '개월' 아닌 페이싱 서수)
 *   • domain = 대단원/중단원 이름 키워드 룰매핑(수와 연산·문자와 식·함수·기하·측정·규칙성·확률과 통계).
 *   • track  = CURRENT (ADVANCED 선행트랙은 추후).
 *   • edge   = 같은 (학기·domain) 내 연속 개념만 체인(보수적 선수관계). 교차도메인 거짓엣지 회피.
 *   • id     = lab-cur-{band}-{학기서수2}-{회차2}  (안정적 → 재실행 idempotent)
 *
 *   ⚠️ 선수관계 정밀화(Phase 2)는 별도. 지금은 "진짜 개념 노드 + 보수적 페이싱 엣지"가 목표.
 *   ⚠️ 데모 학생/합성 개념(lab-c1..c5)은 건드리지 않음 → 코크핏 루프 무회귀.
 *
 *   실행:
 *     node --env-file=.env.local --import tsx scripts/lab/seed-curriculum.ts            # dry-run(기본, DB 무변경)
 *     node --env-file=.env.local --import tsx scripts/lab/seed-curriculum.ts --apply    # 실제 upsert
 */
import { prisma } from '@/lib/db';
import {
  ELEMENTARY_SCHOOL_CURRICULUM,
  MIDDLE_SCHOOL_CURRICULUM,
  HIGH_SCHOOL_CURRICULUM,
} from '@/lib/constants/curriculum';
import type { CurriculumUnit } from '@/types/mathgen';

const APPLY = process.argv.includes('--apply');

type Band = 'elem' | 'mid' | 'high';
const BANDS: { band: Band; label: string; map: Record<string, CurriculumUnit[]> }[] = [
  { band: 'elem', label: '초등', map: ELEMENTARY_SCHOOL_CURRICULUM },
  { band: 'mid', label: '중등', map: MIDDLE_SCHOOL_CURRICULUM },
  { band: 'high', label: '고등', map: HIGH_SCHOOL_CURRICULUM },
];

// ── domain 룰매핑 (우선순위 순서대로 첫 매치) ──────────────────────────────
const DOMAIN_RULES: { domain: string; kw: string[] }[] = [
  { domain: '확률과 통계', kw: ['확률', '통계', '경우의 수', '순열', '조합', '이항', '자료', '막대그래프', '꺾은선', '그림그래프', '표와 그래프', '여러 가지 그래프', '평균', '가능성', '도수', '히스토그램', '줄기와 잎', '산포도', '상관', '분포', '추정', '모집단', '표본'] },
  { domain: '문자와 식', kw: ['문자', '식의 계산', '방정식', '부등식', '다항식', '인수분해', '나머지정리', '항등식', '연립', '행렬', '복소수'] },
  { domain: '함수', kw: ['함수', '정비례', '반비례', '좌표', '일차함수', '이차함수', '지수', '로그', '삼각함수', '수열', '극한', '미분', '적분', '도함수', '급수', '모델링'] },
  { domain: '기하', kw: ['도형', '모양', '삼각형', '사각형', '오각형', '다각형', '원', '각도', '각기둥', '각뿔', '입체', '직육면체', '정육면체', '합동', '대칭', '닮음', '피타고라스', '삼각비', '작도', '평면', '공간', '벡터', '이차곡선', '포물선', '타원', '쌍곡선', '원기둥', '원뿔', '구', '둘레', '넓이', '부피', '겉넓이', '이동', '회전체', '다면체', '전개도', '겨냥도', '쌓기'] },
  { domain: '측정', kw: ['길이', '시간', '시각', '시계', '들이', '무게', '비교하기', '재기'] },
  { domain: '규칙성', kw: ['규칙', '대응', '비와 비율', '비례', '백분율', '비례식', '비례배분'] },
  { domain: '수와 연산', kw: ['수', '덧셈', '뺄셈', '곱셈', '나눗셈', '분수', '소수', '정수', '유리수', '실수', '약수', '배수', '약분', '통분', '혼합', '어림', '범위', '제곱근', '소인수분해', '근호'] },
];

// 대단원명 정확매치 override (키워드 룰이 오분류하는 케이스 교정)
const DOMAIN_OVERRIDES: Record<string, string> = {
  소인수분해: '수와 연산', // '인수분해' 키워드(문자와 식)가 먼저 잡히는 것 교정
  '집합과 명제': '문자와 식', // 집합·명제 → 식/논리
  분류하기: '확률과 통계', // 초2 자료와 가능성 strand
};

function mapDomain(majorName: string, minorName: string): string {
  if (DOMAIN_OVERRIDES[majorName]) return DOMAIN_OVERRIDES[majorName];
  const hay = `${majorName} ${minorName}`;
  for (const rule of DOMAIN_RULES) {
    if (rule.kw.some((k) => hay.includes(k))) return rule.domain;
  }
  return '기타';
}

const pad2 = (n: number) => String(n).padStart(2, '0');

type ConceptRow = { id: string; name: string; track: 'CURRENT'; monthIdx: number; sessionIdx: number; domain: string; semKey: string; band: Band; major: string };

// ── 변환 ──────────────────────────────────────────────────────────────────
const concepts: ConceptRow[] = [];
const edges: { prereqId: string; dependentId: string }[] = [];

let semOrd = 0; // 학기 서수 (1..25 across all bands) = monthIdx
for (const { band, map } of BANDS) {
  for (const semKey of Object.keys(map)) {
    semOrd += 1;
    let sess = 0;
    // (semKey, domain) → 직전 개념 id  (보수적 선수 체인용)
    const lastByDomain: Record<string, string> = {};
    for (const major of map[semKey]) {
      const minors = major.subUnits && major.subUnits.length > 0 ? major.subUnits : [major];
      for (const minor of minors) {
        sess += 1;
        const domain = mapDomain(major.name, minor.name);
        const id = `lab-cur-${band}-${pad2(semOrd)}-${pad2(sess)}`;
        concepts.push({ id, name: minor.name, track: 'CURRENT', monthIdx: semOrd, sessionIdx: sess, domain, semKey, band, major: major.name });
        // 같은 학기·도메인 연속 개념만 prereq 체인 (교차도메인 거짓엣지 회피)
        const prev = lastByDomain[domain];
        if (prev) edges.push({ prereqId: prev, dependentId: id });
        lastByDomain[domain] = id;
      }
    }
  }
}

// ── 리포트 ────────────────────────────────────────────────────────────────
function report() {
  const byBand: Record<string, number> = {};
  const byDomain: Record<string, number> = {};
  for (const c of concepts) {
    byBand[c.band] = (byBand[c.band] ?? 0) + 1;
    byDomain[c.domain] = (byDomain[c.domain] ?? 0) + 1;
  }
  console.log('─'.repeat(64));
  console.log(`📚 curriculum.ts → LabConcept 변환 ${APPLY ? '(APPLY)' : '(DRY-RUN, DB 무변경)'}`);
  console.log('─'.repeat(64));
  console.log(`학기(서수): ${semOrd}개 · 개념(중단원): ${concepts.length}개 · 선수엣지: ${edges.length}개`);
  console.log('밴드별:', Object.entries(byBand).map(([k, v]) => `${k} ${v}`).join(' · '));
  console.log('도메인별:', Object.entries(byDomain).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
  const other = concepts.filter((c) => c.domain === '기타');
  if (other.length) console.log(`⚠️ 도메인 '기타' ${other.length}개:`, other.slice(0, 12).map((c) => c.name).join(', '));
  console.log('샘플(중1-1):');
  for (const c of concepts.filter((c) => c.band === 'mid' && c.monthIdx === 13).slice(0, 8)) {
    console.log(`   ${c.id}  [${c.domain}]  ${c.major} > ${c.name}  (m${c.monthIdx}s${c.sessionIdx})`);
  }
}

async function apply() {
  // 개념 upsert
  for (const c of concepts) {
    await prisma.labConcept.upsert({
      where: { id: c.id },
      create: { id: c.id, name: c.name, track: c.track, monthIdx: c.monthIdx, sessionIdx: c.sessionIdx, domain: c.domain },
      update: { name: c.name, track: c.track, monthIdx: c.monthIdx, sessionIdx: c.sessionIdx, domain: c.domain },
    });
  }
  // 엣지 upsert
  for (const e of edges) {
    await prisma.labConceptEdge.upsert({
      where: { prereqId_dependentId: { prereqId: e.prereqId, dependentId: e.dependentId } },
      create: e,
      update: {},
    });
  }
  const counts = {
    curriculumConcepts: await prisma.labConcept.count({ where: { id: { startsWith: 'lab-cur-' } } }),
    totalConcepts: await prisma.labConcept.count(),
    totalEdges: await prisma.labConceptEdge.count(),
  };
  console.log('✅ APPLY 완료:', counts);
}

// 무손실 가드 — 메인 테이블 + 합성개념 + 데모 마스터리는 절대 안 바뀜을 증명
async function snapshot(label: string) {
  const [school, synthetic, demoMastery, demoStudent] = await Promise.all([
    prisma.school.count().catch(() => -1),
    prisma.labConcept.count({ where: { id: { startsWith: 'lab-c' }, NOT: { id: { startsWith: 'lab-cur-' } } } }),
    prisma.labMasteryRecord.count({ where: { studentId: 'lab-student-demo' } }),
    prisma.labStudent.count({ where: { id: 'lab-student-demo' } }),
  ]);
  console.log(`[${label}] School ${school} · 합성개념 ${synthetic} · 데모마스터리 ${demoMastery} · 데모학생 ${demoStudent}`);
}

async function main() {
  report();
  if (APPLY) {
    await snapshot('BEFORE');
    await apply();
    await snapshot('AFTER ');
  } else {
    console.log('\n👉 실제 반영하려면 --apply 플래그로 재실행.');
  }
}

main()
  .catch((e) => {
    console.error('❌ 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
