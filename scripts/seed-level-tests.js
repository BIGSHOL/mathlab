const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CHAPTER_DOMAIN = {
  '소인수분해': 'CALCULATION', '최대공약수와 최소공배수': 'CALCULATION',
  '정수와 유리수': 'UNDERSTANDING', '정수와 유리수의 계산': 'CALCULATION',
  '문자의 사용과 식의 계산': 'CALCULATION', '일차방정식의 풀이': 'CALCULATION',
  '일차방정식의 활용': 'PROBLEM_SOLVING', '좌표와 그래프': 'UNDERSTANDING',
  '정비례와 반비례': 'UNDERSTANDING',
  '기본 도형': 'UNDERSTANDING', '위치 관계': 'REASONING', '작도와 합동': 'REASONING',
  '다각형': 'REASONING', '원과 부채꼴': 'CALCULATION', '다면체와 회전체': 'UNDERSTANDING',
  '입체도형의 겉넓이와 부피': 'CALCULATION', '대푯값': 'UNDERSTANDING',
  '도수분포표와 상대도수': 'UNDERSTANDING',
  '유리수와 순환소수': 'CALCULATION', '단항식의 계산': 'CALCULATION',
  '다항식의 계산': 'CALCULATION', '일차부등식': 'CALCULATION',
  '일차부등식의 활용': 'PROBLEM_SOLVING', '연립일차방정식': 'CALCULATION',
  '연립일차방정식의 활용': 'PROBLEM_SOLVING', '일차함수와 그 그래프 ⑴': 'UNDERSTANDING',
  '삼각형의 성질': 'REASONING', '삼각형의 외심과 내심': 'REASONING',
  '삼각형의 무게중심': 'REASONING', '평행사변형': 'REASONING',
  '여러 가지 사각형': 'REASONING', '도형의 닮음': 'REASONING',
  '평행선 사이의 선분의 길이의 비': 'REASONING', '피타고라스 정리': 'REASONING',
  '경우의 수': 'PROBLEM_SOLVING',
  '제곱근의 뜻과 성질': 'UNDERSTANDING', '근호를 포함한 식의 계산': 'CALCULATION',
  '무리수와 실수': 'UNDERSTANDING', '다항식의 곱셈': 'CALCULATION',
  '다항식의 인수분해': 'CALCULATION', '이차방정식의 풀이': 'CALCULATION',
  '이차방정식의 활용': 'PROBLEM_SOLVING', '이차함수의 그래프 ⑴': 'UNDERSTANDING',
  '이차함수의 그래프 ⑵': 'UNDERSTANDING',
  '삼각비': 'CALCULATION', '삼각비의 활용': 'PROBLEM_SOLVING',
  '원과 직선': 'REASONING', '원주각': 'REASONING',
  '원주각의 활용': 'PROBLEM_SOLVING', '산포도': 'UNDERSTANDING',
  '상자그림과 산점도': 'UNDERSTANDING',
};

const DOMAINS = ['CALCULATION', 'UNDERSTANDING', 'PROBLEM_SOLVING', 'REASONING'];
const PER_DOMAIN = [7, 6, 6, 6]; // 25 total

const gradeConfig = [
  { grade: 7, label: '중1', books: ['1-1', '1-2'] },
  { grade: 8, label: '중2', books: ['2-1', '2-2'] },
  { grade: 9, label: '중3', books: ['3-1', '3-2'] },
];

const levels = [
  { label: '우수', rate: 0.92 },
  { label: '보통', rate: 0.68 },
  { label: '취약', rate: 0.32 },
];

async function main() {
  // 1. Delete old level tests
  const oldTests = await prisma.test.findMany({ where: { testType: 'level_test' } });
  for (const t of oldTests) {
    const attempts = await prisma.testAttempt.findMany({ where: { testId: t.id }, select: { id: true } });
    const attIds = attempts.map(a => a.id);
    if (attIds.length) {
      await prisma.diagnosticResult.deleteMany({ where: { attemptId: { in: attIds } } });
      await prisma.answerLog.deleteMany({ where: { attemptId: { in: attIds } } });
      await prisma.testAttempt.deleteMany({ where: { testId: t.id } });
    }
    await prisma.levelTestConfig.deleteMany({ where: { testId: t.id } });
    await prisma.testAssignment.deleteMany({ where: { testId: t.id } });
    await prisma.test.delete({ where: { id: t.id } });
  }
  console.log('Deleted', oldTests.length, 'old level tests');

  const teacher = await prisma.user.findFirst({ where: { role: { in: ['TEACHER', 'ADMIN'] } } });
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    orderBy: { name: 'asc' },
    take: 9,
  });

  // 2. Create tests with balanced domains
  for (let ci = 0; ci < gradeConfig.length; ci++) {
    const cfg = gradeConfig[ci];

    const allQs = await prisma.question.findMany({
      where: { bookCode: { in: cfg.books } },
      select: { id: true, chapter: true },
    });

    const byDomain = { CALCULATION: [], UNDERSTANDING: [], PROBLEM_SOLVING: [], REASONING: [] };
    for (const q of allQs) {
      const d = CHAPTER_DOMAIN[q.chapter] || 'UNDERSTANDING';
      byDomain[d].push(q);
    }
    for (const d of DOMAINS) byDomain[d].sort(() => Math.random() - 0.5);

    const selected = [];
    const questionDomains = {};

    for (let di = 0; di < DOMAINS.length; di++) {
      const domain = DOMAINS[di];
      const count = PER_DOMAIN[di];
      const picked = byDomain[domain].slice(0, count);
      for (const q of picked) {
        selected.push(q);
        questionDomains[q.id] = domain;
      }
    }

    selected.sort(() => Math.random() - 0.5);
    const questionIds = selected.map(q => q.id);

    const domainCounts = {};
    Object.values(questionDomains).forEach(d => { domainCounts[d] = (domainCounts[d] || 0) + 1; });
    console.log(cfg.label + ':', questionIds.length, 'questions,', JSON.stringify(domainCounts));

    const test = await prisma.$transaction(async (tx) => {
      const created = await tx.test.create({
        data: {
          title: cfg.label + ' 계통도 레벨테스트',
          grade: cfg.grade, testType: 'level_test',
          questionIds, questionCount: 25, timeLimitMin: 50,
          shuffleOptions: false, maxAttempts: 1, createdBy: teacher.id,
        },
      });
      await tx.levelTestConfig.create({
        data: { testId: created.id, questionDomains },
      });
      return created;
    });

    // 3. Create dummy attempts
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, answer: true, choices: true, chapter: true, domain: true },
    });
    const qMap = new Map(questions.map(q => [q.id, q]));
    const configDomains = questionDomains;

    for (let li = 0; li < levels.length; li++) {
      const student = students[ci * 3 + li];
      if (!student) continue;
      const lvl = levels[li];
      const correctCount = Math.round(questionIds.length * lvl.rate);
      const idxs = [...Array(questionIds.length).keys()].sort(() => Math.random() - 0.5);
      const correctSet = new Set(idxs.slice(0, correctCount));

      const attempt = await prisma.testAttempt.create({
        data: {
          testId: test.id, studentId: student.id,
          startedAt: new Date(Date.now() - 40 * 60000),
          completedAt: new Date(),
          score: Math.round(lvl.rate * 100), maxScore: 100,
          correctCount, totalCount: questionIds.length, attemptNumber: 1,
        },
      });

      const answerData = questionIds.map((qId, idx) => {
        const q = qMap.get(qId);
        const isCorrect = correctSet.has(idx);
        const correct = q?.answer || '1';
        const wrong = (q?.choices || ['1','2','3','4']).filter(o => o !== correct);
        return {
          attemptId: attempt.id, questionId: qId,
          selectedAnswer: isCorrect ? correct : (wrong[Math.floor(Math.random() * wrong.length)] || '2'),
          isCorrect, timeSpentSeconds: Math.floor(Math.random() * 120) + 30,
        };
      });
      await prisma.answerLog.createMany({ data: answerData });

      // Analyze
      const ds = {};
      for (const qId of questionIds) {
        const d = configDomains[qId] || 'UNDERSTANDING';
        if (!ds[d]) ds[d] = { total: 0, correct: 0 };
        ds[d].total++;
        if (answerData.find(a => a.questionId === qId)?.isCorrect) ds[d].correct++;
      }
      for (const d of Object.keys(ds)) ds[d].accuracy = Math.round((ds[d].correct / ds[d].total) * 100);

      const cs = {};
      for (const qId of questionIds) {
        const ch = qMap.get(qId)?.chapter || '?';
        if (!cs[ch]) cs[ch] = { total: 0, correct: 0 };
        cs[ch].total++;
        if (answerData.find(a => a.questionId === qId)?.isCorrect) cs[ch].correct++;
      }
      const weak = [], strong = [];
      for (const [ch, s] of Object.entries(cs)) {
        const a = Math.round((s.correct / s.total) * 100);
        if (a < 60) weak.push({ chapter: ch, accuracy: a, total: s.total, correct: s.correct });
        if (a >= 80) strong.push({ chapter: ch, accuracy: a, total: s.total, correct: s.correct });
      }

      const overall = Math.round(lvl.rate * 100);
      const recLvl = overall >= 96 ? '1등급' : overall >= 89 ? '2등급' : overall >= 77 ? '3등급' : overall >= 60 ? '4등급' : overall >= 40 ? '5등급' : overall >= 23 ? '6등급' : overall >= 11 ? '7등급' : overall >= 4 ? '8등급' : '9등급';

      await prisma.diagnosticResult.create({
        data: {
          attemptId: attempt.id, studentId: student.id,
          diagnosticType: 'LEVEL', overallAccuracy: overall,
          domainScores: ds, weakAreas: weak, strongAreas: strong, recommendLevel: recLvl,
        },
      });

      console.log(' ', student.name, lvl.label, '->', recLvl, '(' + overall + '%)');
    }
  }

  await prisma.$disconnect();
  console.log('Done!');
}
main().catch(e => { console.error(e); process.exit(1); });
