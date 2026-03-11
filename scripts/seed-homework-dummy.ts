/**
 * 숙제 더미 데이터 시드 스크립트 v2
 * - 기존 숙제 플랜에 학생 배정
 * - 다양한 상태: 완료/미완료/미시작/미리풀기/재시도/통과실패
 *
 * 실행: npx tsx scripts/seed-homework-dummy.ts
 */
import { PrismaClient } from '@prisma/client';
import { generateProblems, type ArithmeticCategory, type ArithmeticLevel } from '../src/lib/services/arithmetic-generator';

const prisma = new PrismaClient();

type Prob = { content: string; answer: string; choices: string[]; category: string };

/** 셔플 유틸 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 랜덤 정오답 인덱스 배열 생성 (correctCount개 정답, 나머지 오답) */
function makeCorrectSet(total: number, correctCount: number): Set<number> {
  const indices = Array.from({ length: total }, (_, i) => i);
  const shuffled = shuffle(indices);
  return new Set(shuffled.slice(0, correctCount));
}

/**
 * attempt + answer 한번에 생성
 * correctIndices를 전달하면 해당 인덱스만 정답 처리 (재시도용)
 * 반환: { attempt, wrongIndices } — 다음 재시도에서 활용
 */
async function createAttemptWithAnswers(opts: {
  studentId: string;
  planId: string;
  day: number;
  category: string;
  level: string;
  problems: Prob[];
  correctCount: number;
  completedAt: Date | null;
  createdAt: Date;
  correctIndices?: Set<number>; // 명시적 정답 인덱스 (없으면 랜덤)
}) {
  const { studentId, planId, day, category, level, problems, correctCount, completedAt, createdAt } = opts;
  const problemCount = problems.length;
  const finalCorrect = completedAt ? correctCount : Math.floor(correctCount * 0.5);
  const finalScore = completedAt ? finalCorrect * 10 : 0;

  // 정답 인덱스: 명시적 전달 또는 랜덤 생성
  const correctSet = opts.correctIndices ?? makeCorrectSet(problemCount, finalCorrect);

  const attempt = await prisma.arithmeticAttempt.create({
    data: {
      studentId,
      category,
      level,
      problemCount,
      correctCount: finalCorrect,
      score: finalScore,
      totalTimeSeconds: Math.floor(60 + Math.random() * 300),
      completedAt,
      homeworkPlanId: planId,
      homeworkDayIndex: day,
      createdAt,
    },
  });

  const answerData = problems.map((prob, pi) => {
    const isCorrect = correctSet.has(pi);
    const selectedAnswer = isCorrect
      ? prob.answer
      : prob.choices.find((c: string) => c !== prob.answer) ?? prob.choices[0];
    return {
      attemptId: attempt.id,
      problemIndex: pi,
      content: prob.content,
      choices: prob.choices,
      selectedAnswer,
      correctAnswer: prob.answer,
      isCorrect,
      timeSpentSeconds: Math.floor(3 + Math.random() * 15),
      comboCount: 0,
      pointsEarned: isCorrect ? 10 : 0,
    };
  });

  if (answerData.length > 0) {
    await prisma.arithmeticAnswer.createMany({ data: answerData });
  }

  // 틀린 인덱스 반환 (다음 재시도에서 활용)
  const wrongIndices = Array.from({ length: problemCount }, (_, i) => i).filter(i => !correctSet.has(i));
  return { attempt, wrongIndices, correctSet };
}

function getCategoryForDay(
  plan: { progressionMode: string; weekdayMap: unknown; categories: unknown; totalDays: number },
  startDate: Date,
  day: number
): string {
  const categories = plan.categories as string[];
  if (plan.progressionMode === 'weekday' && plan.weekdayMap) {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + day);
    const dow = dayDate.getDay();
    const weekdayMap = plan.weekdayMap as Record<string, string | string[]>;
    const mapped = weekdayMap[String(dow)];
    return Array.isArray(mapped) ? mapped[0] : (mapped ?? categories[0]);
  }
  if (plan.progressionMode === 'sequential') {
    const daysPerCat = Math.ceil(plan.totalDays / categories.length);
    const catIdx = Math.min(Math.floor(day / daysPerCat), categories.length - 1);
    return categories[catIdx];
  }
  if (plan.progressionMode === 'round_robin') {
    return categories[day % categories.length];
  }
  return categories[0];
}

async function main() {
  console.log('=== 숙제 더미 데이터 시드 v2 ===\n');

  // 1. 기존 플랜 조회
  const plan = await prisma.arithmeticHomeworkPlan.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    include: { enrollments: true },
  });

  if (!plan) {
    console.log('❌ 활성 숙제 플랜이 없습니다. 먼저 플랜을 생성하세요.');
    return;
  }

  // 시작일을 14일 전으로 변경 (UTC 기준)
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  twoWeeksAgo.setUTCHours(0, 0, 0, 0);

  // 오늘의 요일을 숙제일에 추가 (NOT_STARTED 상태 표시를 위해)
  const todayDow = new Date().getDay();
  const existingMap = (plan.weekdayMap ?? {}) as Record<string, string[]>;
  if (plan.progressionMode === 'weekday' && !existingMap[String(todayDow)]?.length) {
    const firstCat = (plan.categories as string[])[0] ?? 'add_1digit';
    existingMap[String(todayDow)] = [firstCat];
  }

  // retryOnFail 활성화 (데모용)
  await prisma.arithmeticHomeworkPlan.update({
    where: { id: plan.id },
    data: {
      startDate: twoWeeksAgo,
      retryOnFail: true,
      retryMode: 'wrong_same',
      maxRetries: 3,
      passingScore: 80,
      ...(plan.progressionMode === 'weekday' ? { weekdayMap: existingMap } : {}),
    },
  });
  plan.startDate = twoWeeksAgo;
  plan.retryOnFail = true;
  plan.maxRetries = 3;
  plan.passingScore = 80;
  if (plan.progressionMode === 'weekday') {
    (plan as Record<string, unknown>).weekdayMap = existingMap;
    // weekdayMap 변경으로 빈 슬롯에 문제 생성
    const dp = plan.dailyProblems as unknown as Prob[][];
    let regenerated = 0;
    for (let d = 0; d < plan.totalDays; d++) {
      if (dp[d] && dp[d].length > 0) continue;
      const dd = new Date(twoWeeksAgo);
      dd.setDate(dd.getDate() + d);
      const wd = dd.getDay();
      const cats = existingMap[String(wd)];
      if (cats && cats.length > 0) {
        dp[d] = generateProblems(cats[0] as ArithmeticCategory, plan.level as ArithmeticLevel, plan.dailyCount) as unknown as Prob[];
        regenerated++;
      }
    }
    if (regenerated > 0) {
      await prisma.arithmeticHomeworkPlan.update({
        where: { id: plan.id },
        data: { dailyProblems: JSON.parse(JSON.stringify(dp)) },
      });
      console.log(`📝 ${regenerated}일분 문제 재생성 (새 요일 추가)`);
    }
  }

  console.log(`📋 플랜: ${plan.title}`);
  console.log(`   시작일: ${plan.startDate.toISOString().split('T')[0]} (14일 전)`);
  console.log(`   기간: ${plan.totalDays}일 · ${plan.dailyCount}문제/일`);
  console.log(`   통과: ${plan.passingScore}% · 재시도: ${plan.retryOnFail ? `최대${plan.maxRetries}회` : '없음'}`);
  console.log(`   모드: ${plan.progressionMode}\n`);

  // 2. 학생 조회 + 배정
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT', deletedAt: null },
    orderBy: { name: 'asc' },
  });

  if (students.length === 0) {
    console.log('❌ 학생이 없습니다.');
    return;
  }

  const existingEnrollments = new Set(plan.enrollments.map((e) => e.studentId));
  let enrolled = 0;
  for (const student of students) {
    if (!existingEnrollments.has(student.id)) {
      await prisma.arithmeticHomeworkEnrollment.create({
        data: { planId: plan.id, studentId: student.id },
      });
      enrolled++;
    }
  }
  console.log(`👩‍🎓 학생 ${students.length}명 (신규 배정 ${enrolled}명)\n`);

  // 3. 기존 데이터 삭제
  const existingAttempts = await prisma.arithmeticAttempt.findMany({
    where: { homeworkPlanId: plan.id },
    select: { id: true },
  });
  if (existingAttempts.length > 0) {
    await prisma.arithmeticAnswer.deleteMany({
      where: { attemptId: { in: existingAttempts.map((a) => a.id) } },
    });
  }
  const deleted = await prisma.arithmeticAttempt.deleteMany({
    where: { homeworkPlanId: plan.id },
  });
  console.log(`🗑️  기존 ${deleted.count}건 삭제\n`);

  // 4. 날짜 계산 (서비스 computeDayIndex와 동일 결과, timezone-independent)
  // 서비스: toKSTDate는 UTC+3h 후 date 추출 → UTC 서버에서만 정확
  // 로컬(KST): getTime() 기반으로 동일 결과 보장
  const THREE_H = 3 * 60 * 60 * 1000;
  const DAY_MS = 86_400_000;
  const toKSTDayNum = (d: Date) => Math.floor((d.getTime() + THREE_H) / DAY_MS);
  const startDate = new Date(plan.startDate);
  const today = new Date();

  const dailyProblems = plan.dailyProblems as unknown[][];
  const currentDayIndex = Math.max(0, toKSTDayNum(today) - toKSTDayNum(startDate));
  const maxDay = Math.min(currentDayIndex, plan.totalDays - 1);

  // 숙제일(비쉬는날) 목록
  const sessionDays: number[] = [];
  for (let d = 0; d < plan.totalDays; d++) {
    const dp = dailyProblems[d];
    if (dp && Array.isArray(dp) && dp.length > 0) sessionDays.push(d);
  }
  const pastSessionDays = sessionDays.filter((d) => d <= maxDay);

  console.log(`📅 dayIndex: ${currentDayIndex}, 숙제일: ${pastSessionDays.length}/${sessionDays.length}회\n`);

  // 5. 학생 패턴 정의 (더 다양하게)
  interface Pattern {
    name: string;
    completionRate: number;
    accuracyRange: [number, number];
    retryBehavior: 'always' | 'sometimes' | 'never'; // 재시도 성향
    earlyRate: number;  // 미리풀기 확률
  }
  const patterns: Pattern[] = [
    { name: '우등생',     completionRate: 1.0, accuracyRange: [85, 100], retryBehavior: 'always',    earlyRate: 0.5 },
    { name: '성실학생',   completionRate: 0.9, accuracyRange: [70, 95],  retryBehavior: 'always',    earlyRate: 0.3 },
    { name: '보통학생',   completionRate: 0.7, accuracyRange: [50, 85],  retryBehavior: 'sometimes', earlyRate: 0.0 },
    { name: '부진학생',   completionRate: 0.4, accuracyRange: [30, 60],  retryBehavior: 'sometimes', earlyRate: 0.0 },
    { name: '불성실학생', completionRate: 0.2, accuracyRange: [20, 50],  retryBehavior: 'never',     earlyRate: 0.0 },
  ];

  let totalAttempts = 0;
  let retryAttempts = 0;
  let earlyAttempts = 0;

  // 6. 학생별 데이터 생성
  for (let si = 0; si < students.length; si++) {
    const student = students[si];
    const pattern = patterns[si % patterns.length];
    let studentRetries = 0;
    let studentEarly = 0;

    for (let dayIdx = 0; dayIdx < pastSessionDays.length; dayIdx++) {
      const day = pastSessionDays[dayIdx];
      const dayProblems = dailyProblems[day] as Prob[];
      if (!dayProblems || dayProblems.length === 0) continue;

      const isToday = day === currentDayIndex;

      // 완료 여부 결정
      // 오늘(NOT_STARTED)과 과거(MISSED)를 명확히 구분
      if (isToday) {
        // 오늘: 우등생/성실학생은 대부분 완료, 나머지는 NOT_STARTED
        const todayStartRate = pattern.completionRate > 0.8 ? 0.8 : pattern.completionRate > 0.5 ? 0.5 : 0.2;
        if (Math.random() > todayStartRate) {
          // NOT_STARTED: 오늘 숙제 아직 안 품 → 아무 attempt도 없음
          continue;
        }
      } else {
        // 과거: completionRate로 결정 (안하면 MISSED)
        const shouldComplete = Math.random() < pattern.completionRate;
        if (!shouldComplete) continue;
      }

      const category = getCategoryForDay(plan, startDate, day);

      // 정답률 랜덤
      const [minAcc, maxAcc] = pattern.accuracyRange;
      const accuracy = minAcc + Math.random() * (maxAcc - minAcc);
      const correctCount = Math.round((accuracy / 100) * plan.dailyCount);

      // 날짜 계산
      const attemptDate = new Date(startDate);
      attemptDate.setDate(attemptDate.getDate() + day);
      attemptDate.setHours(15 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 60));

      // 미리풀기: 우등생/성실학생이 전날에 미리 풀기
      const isEarlyCompletion = !isToday && dayIdx > 0 && Math.random() < pattern.earlyRate;
      const actualCreatedAt = new Date(attemptDate);
      if (isEarlyCompletion) {
        actualCreatedAt.setDate(actualCreatedAt.getDate() - 1);
        studentEarly++;
        earlyAttempts++;
      }

      // 오늘인 경우 일부 IN_PROGRESS (시작은 했지만 완료 안함)
      const completedAt = isToday && Math.random() < 0.4 ? null : new Date(actualCreatedAt);

      // 첫 시도 생성 (랜덤 정오답 배치)
      const firstResult = await createAttemptWithAnswers({
        studentId: student.id,
        planId: plan.id,
        day,
        category,
        level: plan.level,
        problems: dayProblems,
        correctCount,
        completedAt,
        createdAt: actualCreatedAt,
      });
      totalAttempts++;

      // === 재시도 로직 ===
      if (!completedAt) continue; // IN_PROGRESS면 재시도 불가
      const firstAccuracy = Math.round((correctCount / plan.dailyCount) * 100);
      const needsRetry = firstAccuracy < plan.passingScore;

      if (needsRetry && plan.retryOnFail && pattern.retryBehavior !== 'never') {
        const shouldRetry = pattern.retryBehavior === 'always' || Math.random() < 0.5;
        if (!shouldRetry) continue;

        // 재시도 횟수 (패턴에 따라)
        const maxRetryAttempts = plan.maxRetries;
        const retryTimes = pattern.retryBehavior === 'always'
          ? Math.min(1 + Math.floor(Math.random() * 2), maxRetryAttempts) // 1~2회
          : 1; // sometimes: 1회만

        let prevWrongIndices = firstResult.wrongIndices;
        let prevCorrectSet = firstResult.correctSet;
        let lastAccuracy = firstAccuracy;

        for (let r = 0; r < retryTimes; r++) {
          // 재시도: 이전에 틀린 문제 중 일부를 맞히고, 약간 새로 틀릴 수도 있음
          const improvement = 10 + Math.random() * 15; // 10~25% 향상
          const newAccuracy = Math.min(100, lastAccuracy + improvement);
          const newCorrect = Math.round((newAccuracy / 100) * plan.dailyCount);
          const fixCount = newCorrect - (plan.dailyCount - prevWrongIndices.length); // 추가로 맞출 개수

          // 이전 틀린 문제 중 fixCount개를 맞히기
          const shuffledWrong = shuffle(prevWrongIndices);
          const fixedIndices = new Set(shuffledWrong.slice(0, Math.max(0, fixCount)));
          // 새 정답 세트 = 기존 정답 + 새로 맞힌 것
          const newCorrectSet = new Set(prevCorrectSet);
          fixedIndices.forEach(i => newCorrectSet.add(i));
          // 드물게 기존 정답도 틀릴 수 있음 (1~2문제, 20% 확률)
          if (Math.random() < 0.2) {
            const prevCorrectArr = [...prevCorrectSet];
            const slipCount = Math.min(1 + Math.floor(Math.random() * 2), prevCorrectArr.length);
            shuffle(prevCorrectArr).slice(0, slipCount).forEach(i => newCorrectSet.delete(i));
          }

          const retryDate = new Date(actualCreatedAt);
          retryDate.setMinutes(retryDate.getMinutes() + 30 * (r + 1)); // 30분 간격

          const retryResult = await createAttemptWithAnswers({
            studentId: student.id,
            planId: plan.id,
            day,
            category,
            level: plan.level,
            problems: dayProblems,
            correctCount: newCorrectSet.size,
            completedAt: retryDate,
            createdAt: retryDate,
            correctIndices: newCorrectSet,
          });
          retryAttempts++;
          totalAttempts++;
          studentRetries++;
          prevWrongIndices = retryResult.wrongIndices;
          prevCorrectSet = retryResult.correctSet;
          lastAccuracy = Math.round((newCorrectSet.size / plan.dailyCount) * 100);

          // 통과하면 재시도 중단
          if (lastAccuracy >= plan.passingScore) break;
        }

        // 부진학생: 재시도 횟수 초과 (통과 실패) 케이스 추가
        if (pattern.accuracyRange[1] <= 60 && lastAccuracy < plan.passingScore && Math.random() < 0.3) {
          for (let r2 = retryTimes; r2 < maxRetryAttempts; r2++) {
            // 부진학생은 점수가 거의 안 오름
            const fixCount2 = Math.floor(Math.random() * 3); // 0~2문제만 추가 맞힘
            const shuffledWrong2 = shuffle(prevWrongIndices);
            const newCorrectSet2 = new Set(prevCorrectSet);
            shuffledWrong2.slice(0, fixCount2).forEach(i => newCorrectSet2.add(i));
            // 기존 맞은 것도 일부 틀림
            const prevArr2 = [...prevCorrectSet];
            const slipCount2 = Math.min(Math.floor(Math.random() * 3), prevArr2.length);
            shuffle(prevArr2).slice(0, slipCount2).forEach(i => newCorrectSet2.delete(i));

            const retryDate2 = new Date(actualCreatedAt);
            retryDate2.setMinutes(retryDate2.getMinutes() + 30 * (r2 + 1));

            const retryResult2 = await createAttemptWithAnswers({
              studentId: student.id,
              planId: plan.id,
              day,
              category,
              level: plan.level,
              problems: dayProblems,
              correctCount: newCorrectSet2.size,
              completedAt: retryDate2,
              createdAt: retryDate2,
              correctIndices: newCorrectSet2,
            });
            retryAttempts++;
            totalAttempts++;
            studentRetries++;
            prevWrongIndices = retryResult2.wrongIndices;
            prevCorrectSet = retryResult2.correctSet;
          }
        }
      }
    }

    console.log(`  👤 ${student.name} (${pattern.name}) → 재시도 ${studentRetries}회, 미리풀기 ${studentEarly}회`);
  }

  // 7. 미리풀기: 다음 회차 (현재 시점 기준)
  const nextSessionDay = sessionDays.find((d) => d > currentDayIndex);
  let futureEarly = 0;

  if (nextSessionDay !== undefined) {
    const nextProblems = dailyProblems[nextSessionDay] as Prob[];
    if (nextProblems && nextProblems.length > 0) {
      console.log(`\n⚡ 미리풀기: 다음 회차 ${nextSessionDay + 1}일차`);
      const category = getCategoryForDay(plan, startDate, nextSessionDay);

      for (let si = 0; si < students.length; si++) {
        const student = students[si];
        const pattern = patterns[si % patterns.length];
        if (pattern.earlyRate <= 0 || Math.random() > 0.5) continue;

        const [minAcc, maxAcc] = pattern.accuracyRange;
        const acc = minAcc + Math.random() * (maxAcc - minAcc);
        const correct = Math.round((acc / 100) * plan.dailyCount);

        const earlyDate = new Date(today);
        earlyDate.setHours(16 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60));

        await createAttemptWithAnswers({
          studentId: student.id,
          planId: plan.id,
          day: nextSessionDay,
          category,
          level: plan.level,
          problems: nextProblems,
          correctCount: correct,
          completedAt: earlyDate,
          createdAt: earlyDate,
        });
        futureEarly++;
        totalAttempts++;
        console.log(`  ⚡ ${student.name} → ${nextSessionDay + 1}일차 미리풀기`);
      }
    }
  }

  console.log(`\n✅ 완료!`);
  console.log(`   총 attempt: ${totalAttempts}건`);
  console.log(`   재시도: ${retryAttempts}건`);
  console.log(`   미리풀기(과거): ${earlyAttempts}건`);
  console.log(`   미리풀기(미래): ${futureEarly}건`);
  console.log('\n=== 시드 완료 ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
