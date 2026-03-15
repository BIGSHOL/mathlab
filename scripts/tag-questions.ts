/**
 * 기존 문제 전체 태깅 스크립트
 * - chapter 기반으로 domain(4대영역) 및 conceptId(계통도) 자동 매핑
 * - section의 "활용" 키워드로 PROBLEM_SOLVING 오버라이드
 * - difficulty HIGH/HIGHEST → REASONING 오버라이드 (도형 단원)
 *
 * Usage: npx tsx scripts/tag-questions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── chapter → domain 매핑 ───
// 기본 도메인 (section/difficulty로 일부 오버라이드됨)
const CHAPTER_DOMAIN: Record<string, string> = {
  // ── 중1 (1-1) ──
  '소인수분해': 'CALCULATION',
  '최대공약수와 최소공배수': 'CALCULATION',
  '정수와 유리수': 'UNDERSTANDING',
  '정수와 유리수의 계산': 'CALCULATION',
  '문자의 사용과 식의 계산': 'CALCULATION',
  '일차방정식의 풀이': 'CALCULATION',
  '일차방정식의 활용': 'PROBLEM_SOLVING',
  '좌표와 그래프': 'UNDERSTANDING',
  '정비례와 반비례': 'UNDERSTANDING',
  // ── 중1 (1-2) ──
  '기본 도형': 'UNDERSTANDING',
  '위치 관계': 'REASONING',
  '작도와 합동': 'REASONING',
  '다각형': 'REASONING',
  '원과 부채꼴': 'CALCULATION',
  '다면체와 회전체': 'UNDERSTANDING',
  '입체도형의 겉넓이와 부피': 'CALCULATION',
  '대푯값': 'UNDERSTANDING',
  '도수분포표와 상대도수': 'UNDERSTANDING',
  // ── 중2 (2-1) ──
  '유리수와 순환소수': 'CALCULATION',
  '단항식의 계산': 'CALCULATION',
  '다항식의 계산': 'CALCULATION',
  '일차부등식': 'CALCULATION',
  '일차부등식의 활용': 'PROBLEM_SOLVING',
  '연립일차방정식': 'CALCULATION',
  '연립일차방정식의 활용': 'PROBLEM_SOLVING',
  '일차함수와 그 그래프 ⑴': 'UNDERSTANDING',
  // ── 중2 (2-2) ──
  '삼각형의 성질': 'REASONING',
  '삼각형의 외심과 내심': 'REASONING',
  '삼각형의 무게중심': 'REASONING',
  '평행사변형': 'REASONING',
  '여러 가지 사각형': 'REASONING',
  '도형의 닮음': 'REASONING',
  '평행선 사이의 선분의 길이의 비': 'REASONING',
  '피타고라스 정리': 'REASONING',
  '경우의 수': 'PROBLEM_SOLVING',
  // ── 중3 (3-1) ──
  '제곱근의 뜻과 성질': 'UNDERSTANDING',
  '근호를 포함한 식의 계산': 'CALCULATION',
  '무리수와 실수': 'UNDERSTANDING',
  '다항식의 곱셈': 'CALCULATION',
  '다항식의 인수분해': 'CALCULATION',
  '이차방정식의 풀이': 'CALCULATION',
  '이차방정식의 활용': 'PROBLEM_SOLVING',
  '이차함수의 그래프 ⑴': 'UNDERSTANDING',
  '이차함수의 그래프 ⑵': 'UNDERSTANDING',
  // ── 중3 (3-2) ──
  '삼각비': 'CALCULATION',
  '삼각비의 활용': 'PROBLEM_SOLVING',
  '원과 직선': 'REASONING',
  '원주각': 'REASONING',
  '원주각의 활용': 'PROBLEM_SOLVING',
  '산포도': 'UNDERSTANDING',
  '상자그림과 산점도': 'UNDERSTANDING',
};

// ─── chapter → conceptCode 매핑 (주 개념) ───
// 하나의 chapter에 여러 concept이 있을 수 있지만, 주 개념 하나만 연결
const CHAPTER_CONCEPT: Record<string, string> = {
  // ── 중1 (1-1) ──
  '소인수분해': 'M1-NUM-01',
  '최대공약수와 최소공배수': 'M1-NUM-02',
  '정수와 유리수': 'M1-NUM-03',
  '정수와 유리수의 계산': 'M1-NUM-04',
  '문자의 사용과 식의 계산': 'M1-ALG-01',
  '일차방정식의 풀이': 'M1-ALG-02',
  '일차방정식의 활용': 'M1-ALG-04',
  '좌표와 그래프': 'M1-FUNC-01',
  '정비례와 반비례': 'M1-FUNC-02',
  // ── 중1 (1-2) ──
  '기본 도형': 'M1-GEO-01',
  '위치 관계': 'M1-GEO-04',
  '작도와 합동': 'M1-GEO-02',
  '다각형': 'M1-GEO-03',
  '원과 부채꼴': 'M1-GEO-05',
  '다면체와 회전체': 'M1-GEO-06',
  '입체도형의 겉넓이와 부피': 'M1-GEO-07',
  '대푯값': 'M1-STA-01',
  '도수분포표와 상대도수': 'M1-STA-02',
  // ── 중2 (2-1) ──
  '유리수와 순환소수': 'M2-NUM-01',
  '단항식의 계산': 'M2-ALG-01',
  '다항식의 계산': 'M2-ALG-02',
  '일차부등식': 'M2-ALG-03',
  '일차부등식의 활용': 'M2-ALG-05',
  '연립일차방정식': 'M2-ALG-04',
  '연립일차방정식의 활용': 'M2-ALG-06',
  '일차함수와 그 그래프 ⑴': 'M2-FUNC-01',
  // ── 중2 (2-2) ──
  '삼각형의 성질': 'M2-GEO-03',
  '삼각형의 외심과 내심': 'M2-GEO-04',
  '삼각형의 무게중심': 'M2-GEO-07', // 닮음/중점연결정리 관련
  '평행사변형': 'M2-GEO-05',
  '여러 가지 사각형': 'M2-GEO-06',
  '도형의 닮음': 'M2-GEO-07',
  '평행선 사이의 선분의 길이의 비': 'M2-GEO-07',
  '피타고라스 정리': 'M2-GEO-02',
  '경우의 수': 'M2-STA-01',
  // ── 중3 (3-1) ──
  '제곱근의 뜻과 성질': 'M3-NUM-01',
  '근호를 포함한 식의 계산': 'M3-NUM-02',
  '무리수와 실수': 'M3-NUM-04',
  '다항식의 곱셈': 'M3-ALG-01',
  '다항식의 인수분해': 'M3-ALG-02',
  '이차방정식의 풀이': 'M3-ALG-03',
  '이차방정식의 활용': 'M3-ALG-07',
  '이차함수의 그래프 ⑴': 'M3-FUNC-01',
  '이차함수의 그래프 ⑵': 'M3-FUNC-02',
  // ── 중3 (3-2) ──
  '삼각비': 'M3-GEO-01',
  '삼각비의 활용': 'M3-GEO-03',
  '원과 직선': 'M3-GEO-02',
  '원주각': 'M3-GEO-04',
  '원주각의 활용': 'M3-GEO-04',
  '산포도': 'M3-STA-01',
  '상자그림과 산점도': 'M3-STA-03',
};

// ─── section 기반 domain 오버라이드 규칙 ───
function refineDomain(baseDomain: string, section: string | null, difficulty: string | null): string {
  const sec = section ?? '';

  // "활용" 키워드가 section에 있으면 PROBLEM_SOLVING
  if (sec.includes('활용') || sec.includes('서술형') || sec.includes('심화')) {
    // 이미 PROBLEM_SOLVING이면 유지, 아니면 오버라이드
    if (baseDomain !== 'PROBLEM_SOLVING' && baseDomain !== 'REASONING') {
      return 'PROBLEM_SOLVING';
    }
  }

  // 고난도(HIGH/HIGHEST) + 도형 관련 → REASONING
  if ((difficulty === 'HIGH' || difficulty === 'HIGHEST') && baseDomain === 'UNDERSTANDING') {
    return 'REASONING';
  }

  return baseDomain;
}

async function main() {
  console.log('=== 문제 태깅 시작 ===\n');

  // 1. conceptCode → DB id 매핑 로드
  const concepts = await prisma.concept.findMany({
    where: { conceptCode: { not: null } },
    select: { id: true, conceptCode: true },
  });
  const conceptMap = new Map(concepts.map(c => [c.conceptCode, c.id]));
  console.log(`개념 ${conceptMap.size}개 로드됨`);

  // 2. 모든 문제 로드
  const questions = await prisma.question.findMany({
    select: { id: true, bookCode: true, chapter: true, section: true, difficulty: true },
  });
  console.log(`문제 ${questions.length}개 로드됨\n`);

  // 3. 태깅
  let tagged = 0;
  let skipped = 0;
  const unmatchedChapters = new Set<string>();

  // 배치 처리를 위한 업데이트 모음
  const updates: { id: string; domain: string; conceptId: string | null }[] = [];

  for (const q of questions) {
    const baseDomain = CHAPTER_DOMAIN[q.chapter];
    const conceptCode = CHAPTER_CONCEPT[q.chapter];

    if (!baseDomain) {
      unmatchedChapters.add(q.chapter);
      skipped++;
      continue;
    }

    const domain = refineDomain(baseDomain, q.section, q.difficulty);
    const conceptId = conceptCode ? (conceptMap.get(conceptCode) ?? null) : null;

    updates.push({ id: q.id, domain, conceptId });
    tagged++;
  }

  // 4. 배치 업데이트 (100개씩)
  const BATCH_SIZE = 100;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map(u => prisma.question.update({
        where: { id: u.id },
        data: { domain: u.domain, conceptId: u.conceptId },
      }))
    );
    process.stdout.write(`\r진행: ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length}`);
  }

  console.log('\n');

  // 5. 결과 보고
  console.log(`=== 태깅 완료 ===`);
  console.log(`태깅됨: ${tagged}`);
  console.log(`스킵됨: ${skipped}`);

  if (unmatchedChapters.size > 0) {
    console.log(`\n매핑 없는 chapter:`);
    for (const ch of unmatchedChapters) {
      console.log(`  - "${ch}"`);
    }
  }

  // 6. 도메인별 분포
  const domainDist = await prisma.question.groupBy({
    by: ['domain'],
    _count: true,
    orderBy: { domain: 'asc' },
  });
  console.log('\n도메인별 분포:');
  for (const d of domainDist) {
    console.log(`  ${d.domain ?? '(없음)'}: ${d._count}개`);
  }

  // 7. conceptId 연결 통계
  const linked = await prisma.question.count({ where: { conceptId: { not: null } } });
  const unlinked = await prisma.question.count({ where: { conceptId: null } });
  console.log(`\n개념 연결: ${linked}개 / 미연결: ${unlinked}개`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
