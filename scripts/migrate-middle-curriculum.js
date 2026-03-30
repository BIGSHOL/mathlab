/**
 * 중학교 교육과정 구조 마이그레이션
 *
 * 변경 내용:
 *   Concept: chapter(영역) → chapter(대단원), section(대단원) → section(소단원), sectionSub → null
 *   Question: chapter(영역) → chapter(대단원), section 값에서 대단원 판별
 *
 * 사용법:
 *   node scripts/migrate-middle-curriculum.js           # dry-run (변경 미리보기)
 *   node scripts/migrate-middle-curriculum.js --apply   # 실제 적용
 */

const { PrismaClient } = require('../node_modules/.prisma/client');
const db = new PrismaClient();

const DRY_RUN = !process.argv.includes('--apply');

// ── 중학교 대단원 목록 (새 curriculum.ts 기준) ──
// section 값에서 대단원을 판별할 때 사용
const MIDDLE_UNITS = {
  '1학년 1학기': ['소인수분해', '정수와 유리수', '문자의 사용과 식', '일차방정식', '좌표와 그래프', '정비례와 반비례'],
  '1학년 2학기': ['기본 도형', '작도와 합동', '평면도형', '입체도형', '자료의 정리와 해석'],
  '2학년 1학기': ['유리수와 순환소수', '식의 계산', '일차부등식', '연립일차방정식', '일차함수'],
  '2학년 2학기': ['삼각형의 성질', '사각형의 성질', '도형의 닮음', '피타고라스 정리', '확률'],
  '3학년 1학기': ['실수와 그 연산', '다항식의 곱셈과 인수분해', '이차방정식', '이차함수'],
  '3학년 2학기': ['삼각비', '원의 성질', '통계'],
};

// grade code → 학기 키 매핑
function gradeToSemesterKeys(grade) {
  const num = grade.replace('middle_', '');
  return [`${num}학년 1학기`, `${num}학년 2학기`];
}

// Question의 section 값에서 대단원 판별
// section에 대단원 이름이 포함되어 있으면 해당 대단원 반환
function findChapterFromSection(section, grade, semester) {
  if (!section) return null;

  // grade + semester로 가능한 대단원 목록 결정
  const semKeys = gradeToSemesterKeys(grade);
  const allUnits = [];
  for (const key of semKeys) {
    const units = MIDDLE_UNITS[key];
    if (units) {
      for (const u of units) {
        allUnits.push({ semKey: key, unit: u });
      }
    }
  }

  // semester로 좁히기 (있으면)
  let candidates = allUnits;
  if (semester) {
    const semKey = semKeys[semester - 1];
    if (semKey) {
      candidates = allUnits.filter(c => c.semKey === semKey);
    }
  }

  // section에 대단원 이름이 포함되는지 확인 (긴 것부터 매칭)
  const sorted = [...candidates].sort((a, b) => b.unit.length - a.unit.length);
  for (const c of sorted) {
    if (section.includes(c.unit)) return c.unit;
  }

  // 키워드 기반 폴백 매핑
  const keywordMap = [
    { keywords: ['소수', '합성수', '거듭제곱', '소인수', '약수', '제곱인 수'], unit: '소인수분해' },
    { keywords: ['정수', '유리수'], unit: '정수와 유리수' },
    { keywords: ['문자', '일차식'], unit: '문자의 사용과 식' },
    { keywords: ['일차방정식'], unit: '일차방정식' },
    { keywords: ['좌표', '순서쌍', '그래프'], unit: '좌표와 그래프' },
    { keywords: ['정비례', '반비례'], unit: '정비례와 반비례' },
    { keywords: ['점', '선', '면', '각', '위치 관계', '평행선'], unit: '기본 도형' },
    { keywords: ['작도', '합동'], unit: '작도와 합동' },
    { keywords: ['다각형', '부채꼴'], unit: '평면도형' },
    { keywords: ['다면체', '회전체', '겉넓이', '부피'], unit: '입체도형' },
    { keywords: ['도수분포', '히스토그램', '상대도수', '줄기와 잎'], unit: '자료의 정리와 해석' },
    { keywords: ['순환소수'], unit: '유리수와 순환소수' },
    { keywords: ['단항식', '다항식의 계산'], unit: '식의 계산' },
    { keywords: ['부등식'], unit: '일차부등식' },
    { keywords: ['연립'], unit: '연립일차방정식' },
    { keywords: ['일차함수'], unit: '일차함수' },
    { keywords: ['이등변', '외심', '내심'], unit: '삼각형의 성질' },
    { keywords: ['평행사변형', '사각형'], unit: '사각형의 성질' },
    { keywords: ['닮음', '무게중심'], unit: '도형의 닮음' },
    { keywords: ['피타고라스'], unit: '피타고라스 정리' },
    { keywords: ['경우의 수', '확률'], unit: '확률' },
    { keywords: ['제곱근', '실수', '근호'], unit: '실수와 그 연산' },
    { keywords: ['인수분해', '곱셈공식'], unit: '다항식의 곱셈과 인수분해' },
    { keywords: ['이차방정식'], unit: '이차방정식' },
    { keywords: ['이차함수', '포물선'], unit: '이차함수' },
    { keywords: ['삼각비', 'sin', 'cos', 'tan'], unit: '삼각비' },
    { keywords: ['원과 현', '접선', '원주각'], unit: '원의 성질' },
    { keywords: ['대푯값', '산포도', '상관'], unit: '통계' },
  ];

  const sectionLower = section.toLowerCase();
  for (const entry of keywordMap) {
    // 후보군에 해당 unit이 있는지 확인
    const validUnit = candidates.find(c => c.unit === entry.unit);
    if (!validUnit) continue;
    if (entry.keywords.some(kw => sectionLower.includes(kw.toLowerCase()))) {
      return entry.unit;
    }
  }

  return null;
}

async function main() {
  console.log(DRY_RUN ? '🔍 DRY-RUN 모드 (변경 미리보기)\n' : '🚀 APPLY 모드 (실제 적용)\n');

  // ── 1. Concept 마이그레이션 ──
  console.log('═══ Concept 마이그레이션 ═══');

  const concepts = await db.$queryRawUnsafe(`
    SELECT id, grade, chapter, section, "sectionSub"
    FROM "Concept"
    WHERE grade LIKE 'middle_%'
    ORDER BY grade, chapter, section
  `);

  console.log(`중학교 Concept: ${concepts.length}건\n`);

  let conceptUpdated = 0;
  let conceptSkipped = 0;
  const conceptErrors = [];

  for (const c of concepts) {
    const newChapter = c.section;      // 대단원 ← 현재 section
    const newSection = c.sectionSub;   // 소단원 ← 현재 sectionSub
    const newSectionSub = null;

    if (!newChapter) {
      conceptErrors.push(`[SKIP] id=${c.id} grade=${c.grade} - section(대단원)이 없음`);
      conceptSkipped++;
      continue;
    }

    // 변경 사항이 없는 경우 (이미 마이그레이션된 경우)
    if (c.chapter === newChapter && c.section === newSection) {
      conceptSkipped++;
      continue;
    }

    console.log(`  ${c.grade} | "${c.chapter}" → "${newChapter}" | "${c.section}" → "${newSection || '-'}" | "${c.sectionSub || '-'}" → null`);

    if (!DRY_RUN) {
      await db.$queryRawUnsafe(`
        UPDATE "Concept"
        SET chapter = $1, section = $2, "sectionSub" = $3
        WHERE id = $4
      `, newChapter, newSection, newSectionSub, c.id);
    }
    conceptUpdated++;
  }

  console.log(`\nConcept 결과: ${conceptUpdated}건 변경, ${conceptSkipped}건 스킵`);
  if (conceptErrors.length > 0) {
    console.log('Concept 에러:');
    conceptErrors.forEach(e => console.log('  ' + e));
  }

  // ── 2. Question 마이그레이션 ──
  console.log('\n═══ Question 마이그레이션 ═══');

  // 중학교 문제: bookCode가 숫자-숫자 패턴 (E로 시작하면 초등, H로 시작하면 고등)
  const questions = await db.$queryRawUnsafe(`
    SELECT id, "bookCode", chapter, section
    FROM "Question"
    WHERE "bookCode" ~ '^[1-3]-[1-2]$'
      AND chapter IS NOT NULL
    ORDER BY "bookCode", chapter, section
  `);

  console.log(`중학교 Question: ${questions.length}건\n`);

  let questionUpdated = 0;
  let questionSkipped = 0;
  const questionErrors = [];

  // 영역 목록 (변경 전 chapter 값들)
  const DOMAIN_NAMES = ['수와 연산', '문자와 식', '기하', '통계', '좌표평면과 그래프', '부등식과 방정식', '함수', '확률'];

  for (const q of questions) {
    // chapter가 영역명이 아니면 이미 마이그레이션된 것
    if (!DOMAIN_NAMES.includes(q.chapter)) {
      questionSkipped++;
      continue;
    }

    const gradeNum = q.bookCode.split('-')[0];
    const semesterNum = parseInt(q.bookCode.split('-')[1]);
    const grade = `middle_${gradeNum}`;

    const newChapter = findChapterFromSection(q.section, grade, semesterNum);

    if (!newChapter) {
      questionErrors.push(`[UNMAPPED] id=${q.id} bookCode=${q.bookCode} chapter="${q.chapter}" section="${q.section}"`);
      continue;
    }

    console.log(`  ${q.bookCode} | "${q.chapter}" → "${newChapter}" | section="${q.section}"`);

    if (!DRY_RUN) {
      await db.$queryRawUnsafe(`
        UPDATE "Question"
        SET chapter = $1
        WHERE id = $2
      `, newChapter, q.id);
    }
    questionUpdated++;
  }

  console.log(`\nQuestion 결과: ${questionUpdated}건 변경, ${questionSkipped}건 스킵`);
  if (questionErrors.length > 0) {
    console.log('Question 매핑 실패:');
    questionErrors.forEach(e => console.log('  ' + e));
  }

  // ── 요약 ──
  console.log('\n═══════════════════════════════');
  console.log(`총 Concept: ${conceptUpdated}건 변경`);
  console.log(`총 Question: ${questionUpdated}건 변경`);
  console.log(`매핑 실패: ${questionErrors.length}건`);
  if (DRY_RUN) {
    console.log('\n⚠️  DRY-RUN 모드입니다. 실제 적용하려면: node scripts/migrate-middle-curriculum.js --apply');
  } else {
    console.log('\n✅ 마이그레이션 완료!');
  }
}

main()
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); })
  .finally(() => db.$disconnect());
