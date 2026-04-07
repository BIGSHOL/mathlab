import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 문제 패턴
  const q = await prisma.question.findFirst({
    where: { source: { contains: 'RPM' } },
    select: { bookCode: true, chapter: true, section: true, questionNum: true, difficulty: true, type: true, domain: true, abilityDomain: true, source: true, sourceTag: true, content: true, choices: true, answer: true },
  });
  console.log('=== 기존 문제 패턴 (RPM) ===');
  console.log(JSON.stringify({ ...q, content: q?.content?.substring(0, 80) + '...' }, null, 2));

  // 교과서 추출 문제 패턴
  const q2 = await prisma.question.findFirst({
    where: { sourceTag: '교과서' },
    select: { bookCode: true, chapter: true, section: true, questionNum: true, difficulty: true, type: true, domain: true, abilityDomain: true, source: true, sourceTag: true, content: true, choices: true, answer: true },
  });
  console.log('\n=== 교과서 추출 문제 패턴 ===');
  console.log(JSON.stringify({ ...q2, content: q2?.content?.substring(0, 80) + '...' }, null, 2));

  // 개념 패턴
  const c = await prisma.concept.findFirst({
    where: { conceptCode: { startsWith: 'M1-NUM-01' } },
    select: { conceptCode: true, title: true, grade: true, chapter: true, section: true, sectionSub: true, part: true, category: true, source: true, keywords: true },
  });
  console.log('\n=== 기존 개념 패턴 ===');
  console.log(JSON.stringify(c, null, 2));

  // 교과서 추출 개념 패턴
  const c2 = await prisma.concept.findFirst({
    where: { conceptCode: 'M1-NUM-01-4' },
    select: { conceptCode: true, title: true, grade: true, chapter: true, section: true, sectionSub: true, part: true, category: true, source: true, keywords: true },
  });
  console.log('\n=== 교과서 추출 개념 패턴 ===');
  console.log(JSON.stringify(c2, null, 2));

  // 빈칸 패턴
  const b = await prisma.blankExercise.findFirst({
    where: { concept: { conceptCode: 'M1-NUM-01-1' } },
    select: { level: true, blanks: true },
  });
  if (b) {
    const blanks = b.blanks as { difficulty: string }[];
    console.log('\n=== 빈칸 패턴 ===');
    console.log('level:', b.level);
    console.log('easy:', blanks.filter(x => x.difficulty === 'easy').length);
    console.log('hard:', blanks.filter(x => x.difficulty === 'hard').length);
    console.log('full:', blanks.filter(x => x.difficulty === 'full').length);
  }

  // 불일치 체크
  console.log('\n=== 불일치 체크 ===');
  const issues: string[] = [];

  // 1. domain이 5대 영역이 아닌 문제
  const badDomain = await prisma.question.count({
    where: { domain: { notIn: ['number', 'algebra', 'function', 'geometry', 'statistics'] } },
  });
  if (badDomain > 0) issues.push(`domain 5대 미매핑: ${badDomain}개`);

  // 2. abilityDomain 미설정
  const noAbility = await prisma.question.count({ where: { abilityDomain: null } });
  if (noAbility > 0) issues.push(`abilityDomain null: ${noAbility}개`);

  // 3. section이 curriculum 비표준
  const badSection = await prisma.question.findMany({
    where: { section: { not: null } },
    select: { section: true },
    distinct: ['section'],
  });
  const stdSections = new Set(['소인수분해', '최대공약수와 최소공배수', '제곱근과 실수', '근호를 포함한 식의 계산', '다항식의 곱셈', '다항식의 인수분해', '도함수의 활용']);
  for (const s of badSection) {
    if (s.section && !stdSections.has(s.section)) {
      issues.push(`비표준 section: "${s.section}"`);
    }
  }

  // 4. choices에 ① 없는 객관식
  const mcWithoutNum = await prisma.question.findMany({
    where: { type: 'MULTIPLE_CHOICE', choices: { not: null } },
    select: { id: true, choices: true },
  });
  let noCircleNum = 0;
  for (const q of mcWithoutNum) {
    const ch = q.choices as string[];
    if (ch.length > 0 && !ch[0].startsWith('①') && !/^\(\d+\)/.test(ch[0])) noCircleNum++;
  }
  if (noCircleNum > 0) issues.push(`보기 번호 없는 객관식: ${noCircleNum}개`);

  // 5. sourceTag 미설정
  const noTag = await prisma.question.count({ where: { OR: [{ sourceTag: null }, { sourceTag: '' }] } });
  if (noTag > 0) issues.push(`sourceTag 미설정: ${noTag}개`);

  if (issues.length === 0) {
    console.log('✅ 불일치 없음!');
  } else {
    issues.forEach(i => console.log('⚠', i));
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
