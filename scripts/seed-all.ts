/**
 * seed-all.ts — MathLab 전체 시드 스크립트
 *
 * 실행: npx tsx scripts/seed-all.ts
 *
 * 모든 화면을 테스트할 수 있는 대규모 시드 데이터를 생성합니다.
 * 기존 데이터를 모두 삭제 후 새로 생성합니다.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ─── 유틸 ───────────────────────────────────────────────
const uuid = () => crypto.randomUUID();
const hash = (pw: string) => bcrypt.hashSync(pw, 10);
const now = new Date();
const day = (offset: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  return d;
};
const dateOnly = (offset: number) => {
  const d = day(offset);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ─── 카운터 ─────────────────────────────────────────────
const counts: Record<string, number> = {};
function count(key: string, n = 1) {
  counts[key] = (counts[key] || 0) + n;
}

// ─── 메인 ───────────────────────────────────────────────
async function main() {
  console.log('=== MathLab 전체 시드 시작 ===\n');

  // ──────────────────────────────────────────────────────
  // 1. 기존 데이터 삭제 (자식 테이블부터)
  // ──────────────────────────────────────────────────────
  console.log('기존 데이터 삭제 중...');

  // 퀴즈 관련
  await prisma.quizAnswerLog.deleteMany();
  await prisma.quizParticipant.deleteMany();
  await prisma.quizSessionQuestion.deleteMany();
  await prisma.quizSession.deleteMany();

  // 시험 관련
  await prisma.answerLog.deleteMany();
  await prisma.testAttempt.deleteMany();
  await prisma.testAssignment.deleteMany();
  await prisma.levelTestConfig.deleteMany();
  await prisma.testQuestion.deleteMany();
  await prisma.test.deleteMany();

  // 숙제 관련
  await prisma.arithmeticAnswer.deleteMany();
  await prisma.arithmeticAttempt.deleteMany();
  await prisma.arithmeticHomeworkEnrollment.deleteMany();
  await prisma.arithmeticHomeworkPlan.deleteMany();
  await prisma.questionHomeworkAttempt.deleteMany();
  await prisma.questionHomeworkEnrollment.deleteMany();
  await prisma.homeworkQuestion.deleteMany();
  await prisma.questionHomeworkPlan.deleteMany();
  await prisma.conceptHomeworkEnrollment.deleteMany();
  await prisma.conceptHomeworkPlan.deleteMany();

  // 학습 관련
  await prisma.blankAnswerLog.deleteMany();
  await prisma.blankAttempt.deleteMany();
  await prisma.learningProgress.deleteMany();
  await prisma.learningCourseEnrollment.deleteMany();
  await prisma.learningCourseConcept.deleteMany();
  await prisma.learningCourse.deleteMany();
  await prisma.conceptMemo.deleteMany();
  await prisma.conceptPrerequisite.deleteMany();

  // 게이미피케이션
  await prisma.userBadge.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.pointTransaction.deleteMany();
  await prisma.dailyQuestionAttempt.deleteMany();
  await prisma.dailyQuestion.deleteMany();
  await prisma.dailyMission.deleteMany();
  await prisma.timeAttackRecord.deleteMany();
  await prisma.diagnosticResult.deleteMany();

  // 기타
  await prisma.reportHistory.deleteMany();
  await prisma.teacherComment.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.questionGenerationLog.deleteMany();

  // 문제/개념/과목
  await prisma.blankExercise.deleteMany();
  await prisma.question.deleteMany();
  await prisma.concept.deleteMany();
  await prisma.subject.deleteMany();

  // 유저 관련
  await prisma.studentProfile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.tenant.deleteMany();

  console.log('삭제 완료.\n');

  // ──────────────────────────────────────────────────────
  // 2. Tenant
  // ──────────────────────────────────────────────────────
  console.log('1. Tenant 생성...');
  const tenantId = uuid();
  await prisma.tenant.create({
    data: { id: tenantId, slug: 'mathlab', name: 'MathLab 학원', updatedAt: now },
  });
  count('Tenant');

  // ──────────────────────────────────────────────────────
  // 3. Classrooms
  // ──────────────────────────────────────────────────────
  console.log('2. Classroom 생성...');
  const classroomIds = { elemA: uuid(), elemB: uuid(), middle: uuid() };
  await prisma.classroom.createMany({
    data: [
      { id: classroomIds.elemA, name: '초등 A반', grade: 5, tenantId },
      { id: classroomIds.elemB, name: '초등 B반', grade: 6, tenantId },
      { id: classroomIds.middle, name: '중등반', grade: 7, tenantId },
    ],
  });
  count('Classroom', 3);

  // ──────────────────────────────────────────────────────
  // 4. Users
  // ──────────────────────────────────────────────────────
  console.log('3. Users 생성...');
  const superAdminId = uuid();
  const ownerId = uuid();
  const managerId = uuid();
  const teacherIds = [uuid(), uuid(), uuid()];
  const studentIds: string[] = [];
  for (let i = 0; i < 15; i++) studentIds.push(uuid());

  // SUPER_ADMIN
  await prisma.user.create({
    data: {
      id: superAdminId, username: 'superadmin01', passwordHash: hash('1234'),
      name: '슈퍼관리자', role: 'SUPER_ADMIN', tenantId, updatedAt: now,
    },
  });

  // OWNER
  await prisma.user.create({
    data: {
      id: ownerId, username: 'owner01', passwordHash: hash('1234'),
      name: '원장님', role: 'OWNER', tenantId, updatedAt: now,
    },
  });

  // MANAGER
  await prisma.user.create({
    data: {
      id: managerId, username: 'manager01', passwordHash: hash('1234'),
      name: '이팀장', role: 'MANAGER', tenantId, updatedAt: now,
    },
  });

  // TEACHER x3
  const teacherNames = ['김선생', '박선생', '최선생'];
  for (let i = 0; i < 3; i++) {
    await prisma.user.create({
      data: {
        id: teacherIds[i],
        username: `teacher0${i + 1}`,
        passwordHash: hash('1234'),
        name: teacherNames[i],
        role: 'TEACHER',
        tenantId,
        updatedAt: now,
      },
    });
  }

  // STUDENT x15
  const studentMeta = [
    { name: '이수학', grade: 5, classroom: classroomIds.elemA, school: '서울수학초등학교', parent: '이아버지', birth: '2015-03-15' },
    { name: '박영희', grade: 5, classroom: classroomIds.elemA, school: '서울수학초등학교', parent: '박어머니', birth: '2015-07-22' },
    { name: '최민수', grade: 5, classroom: classroomIds.elemA, school: '강남초등학교', parent: '최아버지', birth: '2015-01-10' },
    { name: '정하늘', grade: 5, classroom: classroomIds.elemA, school: '강남초등학교', parent: '정어머니', birth: '2015-09-05' },
    { name: '김서연', grade: 5, classroom: classroomIds.elemA, school: '서초초등학교', parent: '김아버지', birth: '2015-11-30' },
    { name: '이준호', grade: 6, classroom: classroomIds.elemB, school: '서초초등학교', parent: '이어머니', birth: '2014-04-18' },
    { name: '한미래', grade: 6, classroom: classroomIds.elemB, school: '한강초등학교', parent: '한아버지', birth: '2014-08-25' },
    { name: '조은별', grade: 6, classroom: classroomIds.elemB, school: '한강초등학교', parent: '조어머니', birth: '2014-02-14' },
    { name: '윤도현', grade: 6, classroom: classroomIds.elemB, school: '반포초등학교', parent: '윤아버지', birth: '2014-06-07' },
    { name: '강지우', grade: 6, classroom: classroomIds.elemB, school: '반포초등학교', parent: '강어머니', birth: '2014-12-20' },
    { name: '송예린', grade: 7, classroom: classroomIds.middle, school: '서울중학교', parent: '송아버지', birth: '2013-05-11' },
    { name: '임태양', grade: 7, classroom: classroomIds.middle, school: '서울중학교', parent: '임어머니', birth: '2013-10-03' },
    { name: '구하린', grade: 7, classroom: classroomIds.middle, school: '강남중학교', parent: '구아버지', birth: '2013-03-28' },
    { name: '백다은', grade: 7, classroom: classroomIds.middle, school: '강남중학교', parent: '백어머니', birth: '2013-07-16' },
    { name: '노시우', grade: 7, classroom: classroomIds.middle, school: '서초중학교', parent: '노아버지', birth: '2013-01-09' },
  ];

  for (let i = 0; i < 15; i++) {
    const m = studentMeta[i];
    await prisma.user.create({
      data: {
        id: studentIds[i],
        username: `student${String(i + 1).padStart(2, '0')}`,
        passwordHash: hash('1234'),
        name: m.name,
        role: 'STUDENT',
        grade: m.grade,
        classroomId: m.classroom,
        tenantId,
        school: m.school,
        parentName: m.parent,
        parentPhone: `010-${String(1000 + i).slice(1)}-${String(5000 + i * 111).slice(0, 4)}`,
        phone: `010-${String(2000 + i).slice(1)}-${String(3000 + i * 222).slice(0, 4)}`,
        birthDate: new Date(m.birth),
        startDate: day(-90 - Math.floor(Math.random() * 180)),
        address: `서울시 강남구 테헤란로 ${100 + i}`,
        updatedAt: now,
      },
    });
  }
  count('User', 21);

  // ──────────────────────────────────────────────────────
  // 5. StudentProfile
  // ──────────────────────────────────────────────────────
  console.log('4. StudentProfile 생성...');
  const xpValues = [850, 520, 1200, 90, 350, 200, 60, 430, 780, 100, 950, 300, 45, 600, 150];
  for (let i = 0; i < 15; i++) {
    const xp = xpValues[i];
    const level = xp >= 1200 ? 6 : xp >= 800 ? 5 : xp >= 500 ? 4 : xp >= 250 ? 3 : xp >= 100 ? 2 : 1;
    const streak = [14, 7, 30, 1, 5, 3, 0, 8, 12, 2, 20, 4, 0, 9, 1][i];
    await prisma.studentProfile.create({
      data: {
        id: uuid(),
        userId: studentIds[i],
        totalXp: xp,
        level,
        currentStreak: streak,
        longestStreak: Math.max(streak, streak + Math.floor(Math.random() * 10)),
        lastActiveAt: day(-Math.floor(Math.random() * 3)),
        updatedAt: now,
      },
    });
  }
  count('StudentProfile', 15);

  // ──────────────────────────────────────────────────────
  // 6. Subjects
  // ──────────────────────────────────────────────────────
  console.log('5. Subjects 생성...');
  const subjectIds = { fraction: uuid(), shape: uuid(), ratio: uuid(), decimal: uuid(), integer: uuid() };
  await prisma.subject.createMany({
    data: [
      { id: subjectIds.fraction, title: '분수', description: '분수의 기본 개념과 연산', gradeLevel: 5, sortOrder: 1 },
      { id: subjectIds.shape, title: '도형', description: '기본 도형의 성질과 넓이', gradeLevel: 5, sortOrder: 2 },
      { id: subjectIds.ratio, title: '비율', description: '비율과 비례의 이해', gradeLevel: 6, sortOrder: 1 },
      { id: subjectIds.decimal, title: '소수', description: '소수의 개념과 연산', gradeLevel: 6, sortOrder: 2 },
      { id: subjectIds.integer, title: '정수와 유리수', description: '정수와 유리수의 개념 및 사칙연산', gradeLevel: 7, sortOrder: 1 },
    ],
  });
  count('Subject', 5);

  // ──────────────────────────────────────────────────────
  // 7. Concepts (15개, 과목당 3개)
  // ──────────────────────────────────────────────────────
  console.log('6. Concepts 생성...');

  interface ConceptSeed {
    id: string;
    subjectId: string;
    title: string;
    sortOrder: number;
    fullContent: string;
    conceptCode: string;
    grade: string;
    part: string;
    chapter: string;
    section: string;
    blanks: {
      level: number;
      templateText: string;
      blanks: { position: number; answer: string; hint: string }[];
    }[];
  }

  const conceptSeeds: ConceptSeed[] = [
    // ─── 분수 (3개) ───
    {
      id: uuid(), subjectId: subjectIds.fraction, title: '분수의 뜻', sortOrder: 1,
      conceptCode: 'E5-F01', grade: 'elementary_5', part: 'calc', chapter: '분수', section: '분수의 뜻',
      fullContent: '# 분수의 뜻\n\n분수는 전체를 똑같이 나눈 것 중 일부를 나타내는 수입니다.\n\n예를 들어, 피자 한 판을 $4$조각으로 나누면 한 조각은 전체의 $\\frac{1}{4}$입니다.\n\n## 분수의 구성\n- **분자**: 위에 있는 수 (가져간 부분)\n- **분모**: 아래에 있는 수 (전체를 나눈 수)\n\n## 진분수와 가분수\n- 진분수: 분자 < 분모 (예: $\\frac{3}{5}$)\n- 가분수: 분자 ≥ 분모 (예: $\\frac{5}{3}$)',
      blanks: [
        {
          level: 1,
          templateText: '분수는 전체를 똑같이 나눈 것 중 {{1}}를 나타내는 수입니다. 위에 있는 수를 {{2}}라 하고, 아래에 있는 수를 {{3}}라 합니다.',
          blanks: [
            { position: 1, answer: '일부', hint: 'ㅇㅂ' },
            { position: 2, answer: '분자', hint: 'ㅂㅈ' },
            { position: 3, answer: '분모', hint: 'ㅂㅁ' },
          ],
        },
        {
          level: 2,
          templateText: '{{1}}는 전체를 {{2}} 나눈 것 중 {{3}}를 나타내는 수입니다. 위에 있는 수를 {{4}}라 하고, 아래에 있는 수를 {{5}}라 합니다. 분자가 분모보다 작은 분수를 {{6}}라 하고, 분자가 분모보다 크거나 같은 분수를 {{7}}라 합니다.',
          blanks: [
            { position: 1, answer: '분수', hint: 'ㅂㅅ' },
            { position: 2, answer: '똑같이', hint: 'ㄸㄱㅇ' },
            { position: 3, answer: '일부', hint: 'ㅇㅂ' },
            { position: 4, answer: '분자', hint: 'ㅂㅈ' },
            { position: 5, answer: '분모', hint: 'ㅂㅁ' },
            { position: 6, answer: '진분수', hint: 'ㅈㅂㅅ' },
            { position: 7, answer: '가분수', hint: 'ㄱㅂㅅ' },
          ],
        },
      ],
    },
    {
      id: uuid(), subjectId: subjectIds.fraction, title: '분수의 덧셈', sortOrder: 2,
      conceptCode: 'E5-F02', grade: 'elementary_5', part: 'calc', chapter: '분수', section: '분수의 덧셈',
      fullContent: '# 분수의 덧셈\n\n분모가 같은 분수끼리는 분자만 더하면 됩니다.\n\n예: $\\frac{1}{5} + \\frac{2}{5} = \\frac{3}{5}$\n\n## 분모가 다른 경우\n분모가 다르면 먼저 통분한 후 더합니다.\n\n예: $\\frac{1}{3} + \\frac{1}{4} = \\frac{4}{12} + \\frac{3}{12} = \\frac{7}{12}$\n\n통분이란 두 분수의 분모를 같게 만드는 것입니다.',
      blanks: [
        {
          level: 1,
          templateText: '분모가 같은 분수의 덧셈은 {{1}}만 더하면 됩니다. 분모가 다르면 먼저 {{2}}을 한 후 더합니다.',
          blanks: [
            { position: 1, answer: '분자', hint: 'ㅂㅈ' },
            { position: 2, answer: '통분', hint: 'ㅌㅂ' },
          ],
        },
        {
          level: 2,
          templateText: '분모가 같은 분수의 {{1}}은 {{2}}만 더하면 됩니다. 분모가 {{3}} 분수는 먼저 {{4}}을 한 후 더합니다. {{5}}이란 두 분수의 {{6}}를 같게 만드는 것입니다.',
          blanks: [
            { position: 1, answer: '덧셈', hint: 'ㄷㅅ' },
            { position: 2, answer: '분자', hint: 'ㅂㅈ' },
            { position: 3, answer: '다른', hint: 'ㄷㄹ' },
            { position: 4, answer: '통분', hint: 'ㅌㅂ' },
            { position: 5, answer: '통분', hint: 'ㅌㅂ' },
            { position: 6, answer: '분모', hint: 'ㅂㅁ' },
          ],
        },
      ],
    },
    {
      id: uuid(), subjectId: subjectIds.fraction, title: '분수의 뺄셈', sortOrder: 3,
      conceptCode: 'E5-F03', grade: 'elementary_5', part: 'calc', chapter: '분수', section: '분수의 뺄셈',
      fullContent: '# 분수의 뺄셈\n\n분모가 같은 분수끼리는 분자만 빼면 됩니다.\n\n예: $\\frac{3}{5} - \\frac{1}{5} = \\frac{2}{5}$\n\n## 분모가 다른 경우\n분모가 다르면 먼저 통분한 후 뺍니다.\n\n예: $\\frac{3}{4} - \\frac{1}{3} = \\frac{9}{12} - \\frac{4}{12} = \\frac{5}{12}$',
      blanks: [
        {
          level: 1,
          templateText: '분모가 같은 분수의 뺄셈은 {{1}}만 빼면 됩니다. 분모가 다르면 먼저 {{2}}을 합니다.',
          blanks: [
            { position: 1, answer: '분자', hint: 'ㅂㅈ' },
            { position: 2, answer: '통분', hint: 'ㅌㅂ' },
          ],
        },
        {
          level: 2,
          templateText: '분모가 {{1}} 분수의 {{2}}은 {{3}}만 빼면 됩니다. 분모가 {{4}} 분수는 먼저 {{5}}을 한 후 뺍니다.',
          blanks: [
            { position: 1, answer: '같은', hint: 'ㄱㅇ' },
            { position: 2, answer: '뺄셈', hint: 'ㅃㅅ' },
            { position: 3, answer: '분자', hint: 'ㅂㅈ' },
            { position: 4, answer: '다른', hint: 'ㄷㄹ' },
            { position: 5, answer: '통분', hint: 'ㅌㅂ' },
          ],
        },
      ],
    },
    // ─── 도형 (3개) ───
    {
      id: uuid(), subjectId: subjectIds.shape, title: '삼각형의 넓이', sortOrder: 1,
      conceptCode: 'E5-G01', grade: 'elementary_5', part: 'geo', chapter: '도형의 넓이', section: '삼각형의 넓이',
      fullContent: '# 삼각형의 넓이\n\n삼각형의 넓이는 밑변과 높이를 이용하여 구합니다.\n\n## 공식\n$$\\text{삼각형의 넓이} = \\frac{\\text{밑변} \\times \\text{높이}}{2}$$\n\n## 예시\n밑변이 $6$cm, 높이가 $4$cm인 삼각형의 넓이:\n$$\\frac{6 \\times 4}{2} = 12\\text{(cm²)}$$',
      blanks: [
        {
          level: 1,
          templateText: '삼각형의 넓이 = {{1}} × {{2}} ÷ 2',
          blanks: [
            { position: 1, answer: '밑변', hint: 'ㅁㅂ' },
            { position: 2, answer: '높이', hint: 'ㄴㅇ' },
          ],
        },
        {
          level: 2,
          templateText: '{{1}}의 넓이는 {{2}}과 {{3}}를 이용하여 구합니다. 공식은 {{4}} × {{5}} ÷ {{6}} 입니다.',
          blanks: [
            { position: 1, answer: '삼각형', hint: 'ㅅㄱㅎ' },
            { position: 2, answer: '밑변', hint: 'ㅁㅂ' },
            { position: 3, answer: '높이', hint: 'ㄴㅇ' },
            { position: 4, answer: '밑변', hint: 'ㅁㅂ' },
            { position: 5, answer: '높이', hint: 'ㄴㅇ' },
            { position: 6, answer: '2', hint: '숫자' },
          ],
        },
      ],
    },
    {
      id: uuid(), subjectId: subjectIds.shape, title: '사각형의 넓이', sortOrder: 2,
      conceptCode: 'E5-G02', grade: 'elementary_5', part: 'geo', chapter: '도형의 넓이', section: '사각형의 넓이',
      fullContent: '# 사각형의 넓이\n\n## 직사각형\n$$\\text{직사각형의 넓이} = \\text{가로} \\times \\text{세로}$$\n\n## 평행사변형\n$$\\text{평행사변형의 넓이} = \\text{밑변} \\times \\text{높이}$$\n\n## 사다리꼴\n$$\\text{사다리꼴의 넓이} = \\frac{(\\text{윗변} + \\text{아랫변}) \\times \\text{높이}}{2}$$',
      blanks: [
        {
          level: 1,
          templateText: '직사각형의 넓이 = {{1}} × {{2}}. 평행사변형의 넓이 = {{3}} × {{4}}.',
          blanks: [
            { position: 1, answer: '가로', hint: 'ㄱㄹ' },
            { position: 2, answer: '세로', hint: 'ㅅㄹ' },
            { position: 3, answer: '밑변', hint: 'ㅁㅂ' },
            { position: 4, answer: '높이', hint: 'ㄴㅇ' },
          ],
        },
        {
          level: 2,
          templateText: '{{1}}의 넓이 = {{2}} × {{3}}. {{4}}의 넓이 = {{5}} × {{6}}. {{7}}의 넓이 = ({{8}} + {{9}}) × {{10}} ÷ 2.',
          blanks: [
            { position: 1, answer: '직사각형', hint: 'ㅈㅅㄱㅎ' },
            { position: 2, answer: '가로', hint: 'ㄱㄹ' },
            { position: 3, answer: '세로', hint: 'ㅅㄹ' },
            { position: 4, answer: '평행사변형', hint: 'ㅍㅎㅅㅂㅎ' },
            { position: 5, answer: '밑변', hint: 'ㅁㅂ' },
            { position: 6, answer: '높이', hint: 'ㄴㅇ' },
            { position: 7, answer: '사다리꼴', hint: 'ㅅㄷㄹㄲ' },
            { position: 8, answer: '윗변', hint: 'ㅇㅂ' },
            { position: 9, answer: '아랫변', hint: 'ㅇㄹㅂ' },
            { position: 10, answer: '높이', hint: 'ㄴㅇ' },
          ],
        },
      ],
    },
    {
      id: uuid(), subjectId: subjectIds.shape, title: '원의 넓이', sortOrder: 3,
      conceptCode: 'E5-G03', grade: 'elementary_5', part: 'geo', chapter: '도형의 넓이', section: '원의 넓이',
      fullContent: '# 원의 넓이\n\n원의 넓이는 반지름을 이용하여 구합니다.\n\n## 공식\n$$\\text{원의 넓이} = \\pi r^2 = \\text{반지름} \\times \\text{반지름} \\times 3.14$$\n\n## 원주\n$$\\text{원주(둘레)} = \\pi d = \\text{지름} \\times 3.14$$\n\n원주율은 약 $3.14$이며, 기호로 $\\pi$(파이)로 나타냅니다.',
      blanks: [
        {
          level: 1,
          templateText: '원의 넓이 = {{1}} × {{2}} × {{3}}',
          blanks: [
            { position: 1, answer: '반지름', hint: 'ㅂㅈㄹ' },
            { position: 2, answer: '반지름', hint: 'ㅂㅈㄹ' },
            { position: 3, answer: '3.14', hint: '원주율' },
          ],
        },
        {
          level: 2,
          templateText: '{{1}}의 넓이 = {{2}} × {{3}} × {{4}}. 원주(둘레) = {{5}} × {{6}}. 원주율은 약 {{7}}이며, 기호로 {{8}}로 나타냅니다.',
          blanks: [
            { position: 1, answer: '원', hint: 'ㅇ' },
            { position: 2, answer: '반지름', hint: 'ㅂㅈㄹ' },
            { position: 3, answer: '반지름', hint: 'ㅂㅈㄹ' },
            { position: 4, answer: '3.14', hint: '원주율' },
            { position: 5, answer: '지름', hint: 'ㅈㄹ' },
            { position: 6, answer: '3.14', hint: '원주율' },
            { position: 7, answer: '3.14', hint: '숫자' },
            { position: 8, answer: 'π', hint: '파이' },
          ],
        },
      ],
    },
    // ─── 비율 (3개) ───
    {
      id: uuid(), subjectId: subjectIds.ratio, title: '비의 개념', sortOrder: 1,
      conceptCode: 'E6-R01', grade: 'elementary_6', part: 'calc', chapter: '비와 비율', section: '비의 개념',
      fullContent: '# 비의 개념\n\n비란 두 수를 나눗셈으로 비교하는 것입니다.\n\n예: 사과 $3$개, 배 $2$개 → 사과와 배의 비는 $3:2$\n\n## 비의 값\n$$\\text{비의 값} = \\frac{\\text{앞항}}{\\text{뒷항}}$$\n$3:2$의 비의 값 $= \\frac{3}{2} = 1.5$',
      blanks: [
        {
          level: 1,
          templateText: '비란 두 수를 {{1}}으로 비교하는 것입니다. 비의 값 = {{2}} ÷ {{3}}.',
          blanks: [
            { position: 1, answer: '나눗셈', hint: 'ㄴㄴㅅ' },
            { position: 2, answer: '앞항', hint: 'ㅇㅎ' },
            { position: 3, answer: '뒷항', hint: 'ㄷㅎ' },
          ],
        },
        {
          level: 2,
          templateText: '{{1}}란 두 수를 {{2}}으로 비교하는 것입니다. 사과 3개, 배 2개일 때 사과와 배의 비는 {{3}}입니다. {{4}}의 값 = {{5}} ÷ {{6}}이며, 3:2의 비의 값은 {{7}}입니다.',
          blanks: [
            { position: 1, answer: '비', hint: 'ㅂ' },
            { position: 2, answer: '나눗셈', hint: 'ㄴㄴㅅ' },
            { position: 3, answer: '3:2', hint: '숫자:숫자' },
            { position: 4, answer: '비', hint: 'ㅂ' },
            { position: 5, answer: '앞항', hint: 'ㅇㅎ' },
            { position: 6, answer: '뒷항', hint: 'ㄷㅎ' },
            { position: 7, answer: '1.5', hint: '숫자' },
          ],
        },
      ],
    },
    {
      id: uuid(), subjectId: subjectIds.ratio, title: '비율과 백분율', sortOrder: 2,
      conceptCode: 'E6-R02', grade: 'elementary_6', part: 'calc', chapter: '비와 비율', section: '비율과 백분율',
      fullContent: '# 비율과 백분율\n\n## 비율\n비율은 비의 값을 다른 방식으로 나타낸 것입니다.\n$$\\text{비율} = \\frac{\\text{비교하는 양}}{\\text{기준량}}$$\n\n## 백분율\n백분율은 비율을 $100$을 기준으로 나타낸 것입니다.\n$$\\text{백분율} = \\text{비율} \\times 100$$\n\n예: $25$명 중 $5$명 $= \\frac{5}{25} = 0.2 = 20\\%$',
      blanks: [
        {
          level: 1,
          templateText: '비율 = {{1}} ÷ {{2}}. 백분율 = {{3}} × 100.',
          blanks: [
            { position: 1, answer: '비교하는 양', hint: 'ㅂㄱㅎㄴ ㅇ' },
            { position: 2, answer: '기준량', hint: 'ㄱㅈㄹ' },
            { position: 3, answer: '비율', hint: 'ㅂㅇ' },
          ],
        },
        {
          level: 2,
          templateText: '{{1}}은 비의 값을 다른 방식으로 나타낸 것입니다. {{2}} = {{3}} ÷ {{4}}. {{5}}은 비율을 {{6}}을 기준으로 나타낸 것입니다. {{7}} = {{8}} × 100.',
          blanks: [
            { position: 1, answer: '비율', hint: 'ㅂㅇ' },
            { position: 2, answer: '비율', hint: 'ㅂㅇ' },
            { position: 3, answer: '비교하는 양', hint: 'ㅂㄱㅎㄴ ㅇ' },
            { position: 4, answer: '기준량', hint: 'ㄱㅈㄹ' },
            { position: 5, answer: '백분율', hint: 'ㅂㅂㅇ' },
            { position: 6, answer: '100', hint: '숫자' },
            { position: 7, answer: '백분율', hint: 'ㅂㅂㅇ' },
            { position: 8, answer: '비율', hint: 'ㅂㅇ' },
          ],
        },
      ],
    },
    {
      id: uuid(), subjectId: subjectIds.ratio, title: '비례식', sortOrder: 3,
      conceptCode: 'E6-R03', grade: 'elementary_6', part: 'calc', chapter: '비와 비율', section: '비례식',
      fullContent: '# 비례식\n\n비례식은 비의 값이 같은 두 비를 등호로 연결한 식입니다.\n\n예: $2:3 = 4:6$\n\n## 비례식의 성질\n외항의 곱 = 내항의 곱\n$2 \\times 6 = 3 \\times 4 = 12$\n\n## 용어\n- 외항: 바깥쪽 두 항 ($2$와 $6$)\n- 내항: 안쪽 두 항 ($3$과 $4$)',
      blanks: [
        {
          level: 1,
          templateText: '비례식의 성질: {{1}}의 곱 = {{2}}의 곱.',
          blanks: [
            { position: 1, answer: '외항', hint: 'ㅇㅎ' },
            { position: 2, answer: '내항', hint: 'ㄴㅎ' },
          ],
        },
        {
          level: 2,
          templateText: '{{1}}은 비의 값이 같은 두 비를 {{2}}로 연결한 식입니다. 비례식의 성질: {{3}}의 곱 = {{4}}의 곱. {{5}}은 바깥쪽 두 항이고, {{6}}은 안쪽 두 항입니다.',
          blanks: [
            { position: 1, answer: '비례식', hint: 'ㅂㄹㅅ' },
            { position: 2, answer: '등호', hint: 'ㄷㅎ' },
            { position: 3, answer: '외항', hint: 'ㅇㅎ' },
            { position: 4, answer: '내항', hint: 'ㄴㅎ' },
            { position: 5, answer: '외항', hint: 'ㅇㅎ' },
            { position: 6, answer: '내항', hint: 'ㄴㅎ' },
          ],
        },
      ],
    },
    // ─── 소수 (3개) ───
    {
      id: uuid(), subjectId: subjectIds.decimal, title: '소수의 뜻', sortOrder: 1,
      conceptCode: 'E6-D01', grade: 'elementary_6', part: 'calc', chapter: '소수의 나눗셈', section: '소수의 뜻',
      fullContent: '# 소수의 뜻\n\n소수는 $1$보다 작은 수를 나타내거나, 정수와 정수 사이의 수를 나타낼 때 사용합니다.\n\n## 소수의 구조\n- 소수점 왼쪽: 정수 부분\n- 소수점 오른쪽: 소수 부분\n\n예: $3.14$에서 정수 부분은 $3$, 소수 부분은 $0.14$\n\n## 자릿값\n- 소수 첫째 자리: $\\frac{1}{10}$ 자리\n- 소수 둘째 자리: $\\frac{1}{100}$ 자리',
      blanks: [
        {
          level: 1,
          templateText: '소수점 왼쪽을 {{1}} 부분, 오른쪽을 {{2}} 부분이라 합니다. 소수 첫째 자리는 {{3}} 자리입니다.',
          blanks: [
            { position: 1, answer: '정수', hint: 'ㅈㅅ' },
            { position: 2, answer: '소수', hint: 'ㅅㅅ' },
            { position: 3, answer: '1/10', hint: '분수' },
          ],
        },
        {
          level: 2,
          templateText: '{{1}}는 정수와 정수 사이의 수를 나타낼 때 사용합니다. {{2}}점 왼쪽을 {{3}} 부분, 오른쪽을 {{4}} 부분이라 합니다. 소수 첫째 자리는 {{5}} 자리, 둘째 자리는 {{6}} 자리입니다.',
          blanks: [
            { position: 1, answer: '소수', hint: 'ㅅㅅ' },
            { position: 2, answer: '소수', hint: 'ㅅㅅ' },
            { position: 3, answer: '정수', hint: 'ㅈㅅ' },
            { position: 4, answer: '소수', hint: 'ㅅㅅ' },
            { position: 5, answer: '1/10', hint: '분수' },
            { position: 6, answer: '1/100', hint: '분수' },
          ],
        },
      ],
    },
    {
      id: uuid(), subjectId: subjectIds.decimal, title: '소수의 덧셈과 뺄셈', sortOrder: 2,
      conceptCode: 'E6-D02', grade: 'elementary_6', part: 'calc', chapter: '소수의 나눗셈', section: '소수의 덧셈과 뺄셈',
      fullContent: '# 소수의 덧셈과 뺄셈\n\n소수의 덧셈과 뺄셈은 소수점을 맞추어 계산합니다.\n\n## 덧셈\n$$2.45 + 1.3 = 2.45 + 1.30 = 3.75$$\n\n## 뺄셈\n$$5.6 - 2.38 = 5.60 - 2.38 = 3.22$$\n\n**핵심**: 자릿수가 다르면 $0$을 붙여서 자릿수를 맞춥니다.',
      blanks: [
        {
          level: 1,
          templateText: '소수의 덧셈과 뺄셈은 {{1}}을 맞추어 계산합니다. 자릿수가 다르면 {{2}}을 붙여서 맞춥니다.',
          blanks: [
            { position: 1, answer: '소수점', hint: 'ㅅㅅㅈ' },
            { position: 2, answer: '0', hint: '숫자' },
          ],
        },
        {
          level: 2,
          templateText: '소수의 {{1}}과 {{2}}은 {{3}}을 맞추어 계산합니다. {{4}}가 다르면 {{5}}을 붙여서 {{6}}를 맞춥니다.',
          blanks: [
            { position: 1, answer: '덧셈', hint: 'ㄷㅅ' },
            { position: 2, answer: '뺄셈', hint: 'ㅃㅅ' },
            { position: 3, answer: '소수점', hint: 'ㅅㅅㅈ' },
            { position: 4, answer: '자릿수', hint: 'ㅈㄹㅅ' },
            { position: 5, answer: '0', hint: '숫자' },
            { position: 6, answer: '자릿수', hint: 'ㅈㄹㅅ' },
          ],
        },
      ],
    },
    {
      id: uuid(), subjectId: subjectIds.decimal, title: '소수의 곱셈', sortOrder: 3,
      conceptCode: 'E6-D03', grade: 'elementary_6', part: 'calc', chapter: '소수의 나눗셈', section: '소수의 곱셈',
      fullContent: '# 소수의 곱셈\n\n소수의 곱셈은 자연수처럼 계산한 후, 소수점의 위치를 정합니다.\n\n## 소수점 위치\n두 수의 소수 자릿수를 더한 만큼 소수점을 왼쪽으로 옮깁니다.\n\n예: $1.2 \\times 0.3 = ?$\n$12 \\times 3 = 36$, 소수 자릿수 합 $= 2$\n따라서 $0.36$',
      blanks: [
        {
          level: 1,
          templateText: '소수의 곱셈은 {{1}}처럼 계산한 후, {{2}}의 위치를 정합니다.',
          blanks: [
            { position: 1, answer: '자연수', hint: 'ㅈㅇㅅ' },
            { position: 2, answer: '소수점', hint: 'ㅅㅅㅈ' },
          ],
        },
        {
          level: 2,
          templateText: '소수의 {{1}}은 {{2}}처럼 계산한 후, {{3}}의 위치를 정합니다. 두 수의 소수 {{4}}를 더한 만큼 소수점을 {{5}}으로 옮깁니다.',
          blanks: [
            { position: 1, answer: '곱셈', hint: 'ㄱㅅ' },
            { position: 2, answer: '자연수', hint: 'ㅈㅇㅅ' },
            { position: 3, answer: '소수점', hint: 'ㅅㅅㅈ' },
            { position: 4, answer: '자릿수', hint: 'ㅈㄹㅅ' },
            { position: 5, answer: '왼쪽', hint: 'ㅇㅉ' },
          ],
        },
      ],
    },
    // ─── 정수와 유리수 (3개) ───
    {
      id: uuid(), subjectId: subjectIds.integer, title: '정수의 개념', sortOrder: 1,
      conceptCode: 'M1-I01', grade: 'middle_1', part: 'calc', chapter: '정수와 유리수', section: '정수의 개념',
      fullContent: '# 정수의 개념\n\n정수는 양의 정수, $0$, 음의 정수를 통틀어 이르는 말입니다.\n\n## 분류\n- **양의 정수(자연수)**: $+1, +2, +3, \\ldots$\n- **0**: 양수도 음수도 아닌 수\n- **음의 정수**: $-1, -2, -3, \\ldots$\n\n## 수직선\n수직선에서 오른쪽으로 갈수록 크고, 왼쪽으로 갈수록 작습니다.\n$$\\cdots < -3 < -2 < -1 < 0 < 1 < 2 < 3 < \\cdots$$',
      blanks: [
        {
          level: 1,
          templateText: '정수는 {{1}}, {{2}}, {{3}}를 통틀어 이르는 말입니다.',
          blanks: [
            { position: 1, answer: '양의 정수', hint: 'ㅇㅇ ㅈㅅ' },
            { position: 2, answer: '0', hint: '숫자' },
            { position: 3, answer: '음의 정수', hint: 'ㅇㅇ ㅈㅅ' },
          ],
        },
        {
          level: 2,
          templateText: '{{1}}는 {{2}}, {{3}}, {{4}}를 통틀어 이르는 말입니다. 양의 정수는 {{5}}라고도 합니다. 수직선에서 {{6}}으로 갈수록 크고, {{7}}으로 갈수록 작습니다.',
          blanks: [
            { position: 1, answer: '정수', hint: 'ㅈㅅ' },
            { position: 2, answer: '양의 정수', hint: 'ㅇㅇ ㅈㅅ' },
            { position: 3, answer: '0', hint: '숫자' },
            { position: 4, answer: '음의 정수', hint: 'ㅇㅇ ㅈㅅ' },
            { position: 5, answer: '자연수', hint: 'ㅈㅇㅅ' },
            { position: 6, answer: '오른쪽', hint: 'ㅇㄹㅉ' },
            { position: 7, answer: '왼쪽', hint: 'ㅇㅉ' },
          ],
        },
      ],
    },
    {
      id: uuid(), subjectId: subjectIds.integer, title: '정수의 사칙연산', sortOrder: 2,
      conceptCode: 'M1-I02', grade: 'middle_1', part: 'calc', chapter: '정수와 유리수', section: '정수의 사칙연산',
      fullContent: '# 정수의 사칙연산\n\n## 덧셈\n- 같은 부호: 절댓값을 더하고 공통 부호를 붙임\n  - $(+3) + (+5) = +8$\n  - $(-3) + (-5) = -8$\n- 다른 부호: 절댓값이 큰 수에서 작은 수를 빼고, 절댓값이 큰 수의 부호를 붙임\n  - $(+7) + (-3) = +4$\n\n## 뺄셈\n뺄셈은 빼는 수의 부호를 바꾸어 덧셈으로 변환\n$(+5) - (+3) = (+5) + (-3) = +2$\n\n## 곱셈/나눗셈\n- 같은 부호끼리: 결과는 양수 ($+$)\n- 다른 부호끼리: 결과는 음수 ($-$)',
      blanks: [
        {
          level: 1,
          templateText: '같은 부호의 덧셈: {{1}}을 더하고 공통 {{2}}를 붙입니다. 뺄셈은 빼는 수의 {{3}}를 바꾸어 {{4}}으로 변환합니다.',
          blanks: [
            { position: 1, answer: '절댓값', hint: 'ㅈㄷㄱ' },
            { position: 2, answer: '부호', hint: 'ㅂㅎ' },
            { position: 3, answer: '부호', hint: 'ㅂㅎ' },
            { position: 4, answer: '덧셈', hint: 'ㄷㅅ' },
          ],
        },
        {
          level: 2,
          templateText: '같은 부호의 {{1}}: {{2}}을 더하고 공통 {{3}}를 붙입니다. 다른 부호: 절댓값이 {{4}} 수에서 {{5}} 수를 뺍니다. {{6}}은 빼는 수의 부호를 바꾸어 {{7}}으로 변환합니다. 같은 부호끼리 곱하면 {{8}}, 다른 부호끼리 곱하면 {{9}}입니다.',
          blanks: [
            { position: 1, answer: '덧셈', hint: 'ㄷㅅ' },
            { position: 2, answer: '절댓값', hint: 'ㅈㄷㄱ' },
            { position: 3, answer: '부호', hint: 'ㅂㅎ' },
            { position: 4, answer: '큰', hint: 'ㅋ' },
            { position: 5, answer: '작은', hint: 'ㅈㅇ' },
            { position: 6, answer: '뺄셈', hint: 'ㅃㅅ' },
            { position: 7, answer: '덧셈', hint: 'ㄷㅅ' },
            { position: 8, answer: '양수', hint: 'ㅇㅅ' },
            { position: 9, answer: '음수', hint: 'ㅇㅅ' },
          ],
        },
      ],
    },
    {
      id: uuid(), subjectId: subjectIds.integer, title: '유리수의 개념', sortOrder: 3,
      conceptCode: 'M1-I03', grade: 'middle_1', part: 'calc', chapter: '정수와 유리수', section: '유리수의 개념',
      fullContent: '# 유리수의 개념\n\n유리수는 $\\frac{a}{b}$ ($a$, $b$는 정수, $b \\neq 0$)의 꼴로 나타낼 수 있는 수입니다.\n\n## 유리수의 분류\n- 양의 유리수: $\\frac{3}{5}, 2.7, +4$ 등\n- $0$\n- 음의 유리수: $-\\frac{1}{2}, -0.3, -5$ 등\n\n## 정수와 유리수의 관계\n모든 정수는 유리수입니다. (예: $3 = \\frac{3}{1}$)\n유리수 ⊃ 정수 ⊃ 자연수',
      blanks: [
        {
          level: 1,
          templateText: '유리수는 {{1}} (a, b는 정수, b≠0)의 꼴로 나타낼 수 있는 수입니다. 모든 {{2}}는 유리수입니다.',
          blanks: [
            { position: 1, answer: 'a/b', hint: '분수꼴' },
            { position: 2, answer: '정수', hint: 'ㅈㅅ' },
          ],
        },
        {
          level: 2,
          templateText: '{{1}}는 {{2}} (a, b는 정수, b≠0)의 꼴로 나타낼 수 있는 수입니다. 유리수는 {{3}}, {{4}}, {{5}}로 분류됩니다. 모든 {{6}}는 유리수이고, 모든 {{7}}는 정수입니다.',
          blanks: [
            { position: 1, answer: '유리수', hint: 'ㅇㄹㅅ' },
            { position: 2, answer: 'a/b', hint: '분수꼴' },
            { position: 3, answer: '양의 유리수', hint: 'ㅇㅇ ㅇㄹㅅ' },
            { position: 4, answer: '0', hint: '숫자' },
            { position: 5, answer: '음의 유리수', hint: 'ㅇㅇ ㅇㄹㅅ' },
            { position: 6, answer: '정수', hint: 'ㅈㅅ' },
            { position: 7, answer: '자연수', hint: 'ㅈㅇㅅ' },
          ],
        },
      ],
    },
  ];

  const conceptIds = conceptSeeds.map((c) => c.id);

  for (const c of conceptSeeds) {
    await prisma.concept.create({
      data: {
        id: c.id,
        subjectId: c.subjectId,
        title: c.title,
        fullContent: c.fullContent,
        sortOrder: c.sortOrder,
        conceptCode: c.conceptCode,
        grade: c.grade,
        part: c.part,
        chapter: c.chapter,
        section: c.section,
        updatedAt: now,
      },
    });

    for (const b of c.blanks) {
      await prisma.blankExercise.create({
        data: {
          id: uuid(),
          conceptId: c.id,
          level: b.level,
          templateText: b.templateText,
          blanks: b.blanks,
        },
      });
    }
  }
  count('Concept', conceptSeeds.length);
  count('BlankExercise', conceptSeeds.length * 2);

  // ─── 선행관계 ───
  console.log('6-1. ConceptPrerequisite 생성...');
  // 분수의 덧셈 ← 분수의 뜻
  await prisma.conceptPrerequisite.create({
    data: { id: uuid(), conceptId: conceptIds[1], prerequisiteId: conceptIds[0] },
  });
  // 분수의 뺄셈 ← 분수의 뜻
  await prisma.conceptPrerequisite.create({
    data: { id: uuid(), conceptId: conceptIds[2], prerequisiteId: conceptIds[0] },
  });
  // 비율과 백분율 ← 비의 개념
  await prisma.conceptPrerequisite.create({
    data: { id: uuid(), conceptId: conceptIds[7], prerequisiteId: conceptIds[6] },
  });
  // 비례식 ← 비율과 백분율
  await prisma.conceptPrerequisite.create({
    data: { id: uuid(), conceptId: conceptIds[8], prerequisiteId: conceptIds[7] },
  });
  // 정수의 사칙연산 ← 정수의 개념
  await prisma.conceptPrerequisite.create({
    data: { id: uuid(), conceptId: conceptIds[13], prerequisiteId: conceptIds[12] },
  });
  // 유리수의 개념 ← 정수의 개념
  await prisma.conceptPrerequisite.create({
    data: { id: uuid(), conceptId: conceptIds[14], prerequisiteId: conceptIds[12] },
  });
  count('ConceptPrerequisite', 6);

  // ──────────────────────────────────────────────────────
  // 8. Questions (40개)
  // ──────────────────────────────────────────────────────
  console.log('7. Questions 생성...');

  const difficulties: ('BASIC' | 'MEDIUM' | 'HIGH' | 'HIGHEST')[] = ['BASIC', 'MEDIUM', 'HIGH', 'HIGHEST'];
  const domains = ['CALCULATION', 'UNDERSTANDING', 'PROBLEM_SOLVING', 'REASONING'];

  interface QSeed {
    bookCode: string;
    chapter: string;
    difficulty: 'BASIC' | 'MEDIUM' | 'HIGH' | 'HIGHEST';
    type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER';
    content: string;
    choices: string[] | null;
    answer: string;
    explanation: string | null;
    domain: string;
  }

  const questionSeeds: QSeed[] = [
    // E5-1 분수 (10개)
    { bookCode: 'E5-1', chapter: '1. 분수의 덧셈과 뺄셈', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$\\frac{1}{4} + \\frac{2}{4}$의 값은?', choices: ['$\\frac{1}{4}$', '$\\frac{2}{4}$', '$\\frac{3}{4}$', '$\\frac{4}{4}$', '$\\frac{5}{4}$'], answer: '3', explanation: '분모가 같으므로 분자끼리 더합니다. $1 + 2 = 3$이므로 $\\frac{3}{4}$입니다.', domain: 'CALCULATION' },
    { bookCode: 'E5-1', chapter: '1. 분수의 덧셈과 뺄셈', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$\\frac{5}{6} - \\frac{2}{6}$의 값은?', choices: ['$\\frac{1}{6}$', '$\\frac{2}{6}$', '$\\frac{3}{6}$', '$\\frac{4}{6}$', '$\\frac{7}{6}$'], answer: '3', explanation: '분모가 같으므로 분자끼리 뺍니다. $5 - 2 = 3$이므로 $\\frac{3}{6}$입니다.', domain: 'CALCULATION' },
    { bookCode: 'E5-1', chapter: '1. 분수의 덧셈과 뺄셈', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$\\frac{1}{3} + \\frac{1}{6}$의 값은?', choices: ['$\\frac{1}{6}$', '$\\frac{2}{6}$', '$\\frac{1}{2}$', '$\\frac{2}{3}$', '$\\frac{5}{6}$'], answer: '3', explanation: '$\\frac{1}{3} = \\frac{2}{6}$이므로, $\\frac{2}{6} + \\frac{1}{6} = \\frac{3}{6} = \\frac{1}{2}$', domain: 'CALCULATION' },
    { bookCode: 'E5-1', chapter: '1. 분수의 덧셈과 뺄셈', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '$\\frac{2}{5} + \\frac{1}{10}$을 계산하시오.', choices: null, answer: '1/2', explanation: '$\\frac{2}{5} = \\frac{4}{10}$이므로 $\\frac{4}{10} + \\frac{1}{10} = \\frac{5}{10} = \\frac{1}{2}$', domain: 'CALCULATION' },
    { bookCode: 'E5-1', chapter: '1. 분수의 덧셈과 뺄셈', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '진분수 중에서 분모가 $8$이고 $\\frac{1}{2}$보다 큰 분수는 모두 몇 개인가?', choices: ['$1$개', '$2$개', '$3$개', '$4$개', '$5$개'], answer: '3', explanation: '$\\frac{1}{2} = \\frac{4}{8}$이므로, $\\frac{5}{8}, \\frac{6}{8}, \\frac{7}{8}$의 $3$개입니다.', domain: 'REASONING' },
    { bookCode: 'E5-1', chapter: '1. 분수의 덧셈과 뺄셈', difficulty: 'HIGHEST', type: 'SHORT_ANSWER', content: '어떤 분수에 $\\frac{2}{7}$을 더했더니 $\\frac{5}{7}$이 되었습니다. 어떤 분수를 구하시오.', choices: null, answer: '3/7', explanation: '$\\frac{5}{7} - \\frac{2}{7} = \\frac{3}{7}$', domain: 'PROBLEM_SOLVING' },
    { bookCode: 'E5-1', chapter: '2. 분수의 곱셈', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$\\frac{2}{3} \\times 4$의 값은?', choices: ['$\\frac{2}{3}$', '$\\frac{4}{3}$', '$\\frac{8}{3}$', '$\\frac{6}{3}$', '$\\frac{8}{12}$'], answer: '3', explanation: '$\\frac{2 \\times 4}{3} = \\frac{8}{3}$', domain: 'CALCULATION' },
    { bookCode: 'E5-1', chapter: '2. 분수의 곱셈', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$\\frac{3}{5} \\times \\frac{2}{7}$의 값은?', choices: ['$\\frac{5}{12}$', '$\\frac{6}{35}$', '$\\frac{5}{35}$', '$\\frac{6}{12}$', '$\\frac{3}{7}$'], answer: '2', explanation: '$\\frac{3 \\times 2}{5 \\times 7} = \\frac{6}{35}$', domain: 'CALCULATION' },
    { bookCode: 'E5-1', chapter: '2. 분수의 곱셈', difficulty: 'HIGH', type: 'SHORT_ANSWER', content: '가로가 $\\frac{3}{4}$m, 세로가 $\\frac{2}{5}$m인 직사각형의 넓이를 구하시오.', choices: null, answer: '3/10', explanation: '$\\frac{3}{4} \\times \\frac{2}{5} = \\frac{6}{20} = \\frac{3}{10}$ (m²)', domain: 'PROBLEM_SOLVING' },
    { bookCode: 'E5-1', chapter: '1. 분수의 덧셈과 뺄셈', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '분수에서 아래에 있는 수를 무엇이라 하나요?', choices: ['분자', '분모', '분수', '진분수', '대분수'], answer: '2', explanation: '분수에서 아래에 있는 수를 분모라 합니다.', domain: 'UNDERSTANDING' },

    // E5-2 도형 (8개)
    { bookCode: 'E5-2', chapter: '3. 도형의 넓이', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '밑변이 $6$cm, 높이가 $4$cm인 삼각형의 넓이는?', choices: ['$10$cm²', '$12$cm²', '$20$cm²', '$24$cm²', '$8$cm²'], answer: '2', explanation: '$\\frac{6 \\times 4}{2} = 12$ (cm²)', domain: 'CALCULATION' },
    { bookCode: 'E5-2', chapter: '3. 도형의 넓이', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '가로 $5$cm, 세로 $3$cm인 직사각형의 넓이는?', choices: ['$8$cm²', '$15$cm²', '$16$cm²', '$12$cm²', '$10$cm²'], answer: '2', explanation: '$5 \\times 3 = 15$ (cm²)', domain: 'CALCULATION' },
    { bookCode: 'E5-2', chapter: '3. 도형의 넓이', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '윗변 $4$cm, 아랫변 $8$cm, 높이 $5$cm인 사다리꼴의 넓이는?', choices: ['$20$cm²', '$30$cm²', '$40$cm²', '$25$cm²', '$35$cm²'], answer: '2', explanation: '$\\frac{(4 + 8) \\times 5}{2} = \\frac{60}{2} = 30$ (cm²)', domain: 'CALCULATION' },
    { bookCode: 'E5-2', chapter: '3. 도형의 넓이', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '반지름이 $5$cm인 원의 넓이를 구하시오. (원주율: $3.14$)', choices: null, answer: '78.5', explanation: '$5 \\times 5 \\times 3.14 = 78.5$ (cm²)', domain: 'CALCULATION' },
    { bookCode: 'E5-2', chapter: '3. 도형의 넓이', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '넓이가 $36$cm²인 삼각형의 밑변이 $12$cm일 때, 높이는?', choices: ['$3$cm', '$4$cm', '$6$cm', '$9$cm', '$12$cm'], answer: '3', explanation: '$36 = \\frac{12 \\times h}{2}$이므로 $h = 6$cm', domain: 'PROBLEM_SOLVING' },
    { bookCode: 'E5-2', chapter: '4. 원', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '지름이 $10$cm인 원의 원주(둘레)는? (원주율: $3.14$)', choices: ['$15.7$cm', '$31.4$cm', '$62.8$cm', '$78.5$cm', '$314$cm'], answer: '2', explanation: '$10 \\times 3.14 = 31.4$ (cm)', domain: 'CALCULATION' },
    { bookCode: 'E5-2', chapter: '4. 원', difficulty: 'HIGH', type: 'SHORT_ANSWER', content: '원주가 $62.8$cm인 원의 반지름을 구하시오. (원주율: $3.14$)', choices: null, answer: '10', explanation: '지름 $= 62.8 \\div 3.14 = 20$cm, 반지름 $= 10$cm', domain: 'PROBLEM_SOLVING' },
    { bookCode: 'E5-2', chapter: '3. 도형의 넓이', difficulty: 'HIGHEST', type: 'MULTIPLE_CHOICE', content: '직사각형의 가로를 $2$배로 늘리고 세로를 $\\frac{1}{2}$로 줄이면 넓이는?', choices: ['$2$배', '$\\frac{1}{2}$배', '변함없다', '$4$배', '$\\frac{1}{4}$배'], answer: '3', explanation: '가로 $\\times 2$, 세로 $\\times \\frac{1}{2}$이면 넓이 $= 2 \\times \\frac{1}{2} = 1$배 (변함없음)', domain: 'REASONING' },

    // E6-1 비율 (8개)
    { bookCode: 'E6-1', chapter: '5. 비와 비율', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '사과 $4$개와 귤 $6$개의 비는?', choices: ['$4:6$', '$6:4$', '$2:3$', '$3:2$', '$4:10$'], answer: '1', explanation: '사과와 귤의 비는 사과 수 : 귤 수 = $4:6$입니다.', domain: 'UNDERSTANDING' },
    { bookCode: 'E6-1', chapter: '5. 비와 비율', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$3:5$의 비의 값은?', choices: ['$0.5$', '$0.6$', '$0.8$', '$1.5$', '$1.67$'], answer: '2', explanation: '비의 값 $= \\frac{3}{5} = 0.6$', domain: 'CALCULATION' },
    { bookCode: 'E6-1', chapter: '5. 비와 비율', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '$40$명 중 $8$명이 안경을 쓰고 있습니다. 안경 쓴 학생의 비율을 백분율로 나타내시오.', choices: null, answer: '20', explanation: '$\\frac{8}{40} = 0.2 = 20\\%$', domain: 'CALCULATION' },
    { bookCode: 'E6-1', chapter: '5. 비와 비율', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$2:3 = 8:x$에서 $x$의 값은?', choices: ['$6$', '$8$', '$10$', '$12$', '$16$'], answer: '4', explanation: '외항의 곱 = 내항의 곱: $2 \\times x = 3 \\times 8$, $2x = 24$, $x = 12$', domain: 'CALCULATION' },
    { bookCode: 'E6-1', chapter: '5. 비와 비율', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '설탕물 $200$g에 설탕이 $30$g 들어 있습니다. 설탕의 비율(%)은?', choices: ['$10\\%$', '$12\\%$', '$15\\%$', '$20\\%$', '$25\\%$'], answer: '3', explanation: '$\\frac{30}{200} \\times 100 = 15\\%$', domain: 'PROBLEM_SOLVING' },
    { bookCode: 'E6-1', chapter: '5. 비와 비율', difficulty: 'HIGH', type: 'SHORT_ANSWER', content: '지도에서 $1$cm가 실제 $50000$cm를 나타낸다. 지도에서 $3$cm인 거리의 실제 거리는 몇 km인가?', choices: null, answer: '1.5', explanation: '$3 \\times 50000 = 150000$cm $= 1500$m $= 1.5$km', domain: 'PROBLEM_SOLVING' },
    { bookCode: 'E6-1', chapter: '6. 비례식', difficulty: 'HIGHEST', type: 'MULTIPLE_CHOICE', content: '비례식 $a:12 = 3:4$에서 $a$의 값은?', choices: ['$6$', '$7$', '$8$', '$9$', '$10$'], answer: '4', explanation: '$4a = 12 \\times 3 = 36$, $a = 9$', domain: 'CALCULATION' },
    { bookCode: 'E6-1', chapter: '5. 비와 비율', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '비율을 $100$을 기준으로 나타낸 것을 무엇이라 하나요?', choices: ['비', '비의 값', '백분율', '비율', '비례식'], answer: '3', explanation: '비율을 100을 기준으로 나타낸 것을 백분율이라 합니다.', domain: 'UNDERSTANDING' },

    // M1-1 정수와 유리수 (14개)
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$-3$의 절댓값은?', choices: ['$-3$', '$3$', '$0$', '$-1$', '$1$'], answer: '2', explanation: '절댓값은 수직선 위에서 원점까지의 거리이므로 $|-3| = 3$', domain: 'UNDERSTANDING' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '다음 중 정수가 아닌 것은?', choices: ['$-5$', '$0$', '$\\frac{1}{2}$', '$+3$', '$-1$'], answer: '3', explanation: '$\\frac{1}{2}$은 정수가 아닌 유리수입니다.', domain: 'UNDERSTANDING' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$(+5) + (-3)$의 값은?', choices: ['$+8$', '$+2$', '$-2$', '$-8$', '$0$'], answer: '2', explanation: '부호가 다르므로 절댓값의 차: $5 - 3 = 2$, 절댓값이 큰 수의 부호($+$)를 붙여 $+2$', domain: 'CALCULATION' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$(-7) + (-4)$의 값은?', choices: ['$-11$', '$-3$', '$+3$', '$+11$', '$-28$'], answer: '1', explanation: '부호가 같으므로 절댓값을 더하고 공통 부호($-$): $-(7+4) = -11$', domain: 'CALCULATION' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '$(+8) - (+13)$을 계산하시오.', choices: null, answer: '-5', explanation: '$(+8) + (-13) = -(13-8) = -5$', domain: 'CALCULATION' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$(-3) \\times (+4)$의 값은?', choices: ['$+12$', '$-12$', '$+7$', '$-7$', '$-1$'], answer: '2', explanation: '부호가 다르므로 결과는 음수: $-(3 \\times 4) = -12$', domain: 'CALCULATION' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '$(-2) \\times (-3) \\times (-1)$의 값은?', choices: ['$-6$', '$+6$', '$-5$', '$+5$', '$0$'], answer: '1', explanation: '$(-2) \\times (-3) = +6$, $+6 \\times (-1) = -6$. 음수가 홀수 개이면 결과는 음수.', domain: 'CALCULATION' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'HIGH', type: 'SHORT_ANSWER', content: '$(-18) \\div (+6)$을 계산하시오.', choices: null, answer: '-3', explanation: '부호가 다르므로 결과는 음수: $-(18 \\div 6) = -3$', domain: 'CALCULATION' },
    { bookCode: 'M1-1', chapter: '2. 유리수', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '다음 중 유리수인 것을 모두 고르면?', choices: ['$-3$만', '$\\frac{2}{3}$만', '$-3$과 $\\frac{2}{3}$', '$0$만', '$-3$, $\\frac{2}{3}$, $0$ 모두'], answer: '5', explanation: '정수, 분수, 0 모두 유리수입니다.', domain: 'UNDERSTANDING' },
    { bookCode: 'M1-1', chapter: '2. 유리수', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$\\frac{-3}{4} + \\frac{1}{4}$의 값은?', choices: ['$\\frac{-4}{4}$', '$\\frac{-2}{4}$', '$\\frac{-1}{2}$', '$\\frac{-2}{4}$와 $\\frac{-1}{2}$ 모두', '$\\frac{1}{2}$'], answer: '4', explanation: '$\\frac{-3+1}{4} = \\frac{-2}{4} = \\frac{-1}{2}$ (두 답 모두 같은 값)', domain: 'CALCULATION' },
    { bookCode: 'M1-1', chapter: '2. 유리수', difficulty: 'HIGH', type: 'SHORT_ANSWER', content: '$\\frac{2}{3} - \\frac{5}{6}$을 계산하시오.', choices: null, answer: '-1/6', explanation: '$\\frac{4}{6} - \\frac{5}{6} = \\frac{-1}{6}$', domain: 'CALCULATION' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'HIGHEST', type: 'MULTIPLE_CHOICE', content: '두 수 $a = -3$, $b = 5$일 때, $|a| + |b| - |a + b|$의 값은?', choices: ['$0$', '$2$', '$4$', '$6$', '$8$'], answer: '4', explanation: '$|{-3}| + |5| - |{-3}+5| = 3 + 5 - |2| = 8 - 2 = 6$', domain: 'REASONING' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'HIGHEST', type: 'SHORT_ANSWER', content: '$(-1)^{10} + (-1)^{11}$을 계산하시오.', choices: null, answer: '0', explanation: '$(-1)^{10} = 1$ (짝수 거듭제곱), $(-1)^{11} = -1$ (홀수 거듭제곱), $1 + (-1) = 0$', domain: 'REASONING' },
    { bookCode: 'M1-1', chapter: '2. 유리수', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '수직선에서 $-2$와 $4$ 사이의 거리는?', choices: ['$2$', '$4$', '$6$', '$8$', '$-2$'], answer: '3', explanation: '두 수 사이의 거리 $= |4 - (-2)| = |6| = 6$', domain: 'UNDERSTANDING' },
  ];

  const questionIds: string[] = [];
  for (let i = 0; i < questionSeeds.length; i++) {
    const q = questionSeeds[i];
    const qId = uuid();
    questionIds.push(qId);
    await prisma.question.create({
      data: {
        id: qId,
        bookCode: q.bookCode,
        chapter: q.chapter,
        questionNum: i + 1,
        difficulty: q.difficulty,
        type: q.type,
        content: q.content,
        choices: q.choices,
        answer: q.answer,
        explanation: q.explanation,
        domain: q.domain,
        updatedAt: now,
      },
    });
  }
  count('Question', questionSeeds.length);

  // ──────────────────────────────────────────────────────
  // 9. Tests (3개)
  // ──────────────────────────────────────────────────────
  console.log('8. Tests 생성...');

  // 초5 분수 단원 평가: 문제 0~9
  const test1Id = uuid();
  const test1Qs = questionIds.slice(0, 10);
  await prisma.test.create({
    data: {
      id: test1Id, title: '초5 분수 단원 평가', grade: 5, testType: 'unit',
      questionIds: test1Qs, questionCount: 10, timeLimitMin: 40,
      createdBy: teacherIds[0], tenantId, updatedAt: now,
    },
  });
  for (let i = 0; i < test1Qs.length; i++) {
    await prisma.testQuestion.create({
      data: { id: uuid(), testId: test1Id, questionId: test1Qs[i], sortOrder: i + 1 },
    });
  }

  // 초6 비율 중간고사: 문제 18~32 (15개)
  const test2Id = uuid();
  const test2Qs = questionIds.slice(18, 33);
  await prisma.test.create({
    data: {
      id: test2Id, title: '초6 비율 중간고사', grade: 6, testType: 'midterm',
      questionIds: test2Qs, questionCount: 15, timeLimitMin: 50,
      createdBy: teacherIds[0], tenantId, updatedAt: now,
    },
  });
  for (let i = 0; i < test2Qs.length; i++) {
    await prisma.testQuestion.create({
      data: { id: uuid(), testId: test2Id, questionId: test2Qs[i], sortOrder: i + 1 },
    });
  }

  // 중1 진단 레벨테스트: 문제 26~35 (10개)
  const test3Id = uuid();
  const test3Qs = questionIds.slice(26, 36);
  await prisma.test.create({
    data: {
      id: test3Id, title: '중1 진단 레벨테스트', grade: 7, testType: 'level_test',
      questionIds: test3Qs, questionCount: 10, timeLimitMin: 30,
      createdBy: teacherIds[0], tenantId, updatedAt: now,
    },
  });
  for (let i = 0; i < test3Qs.length; i++) {
    await prisma.testQuestion.create({
      data: { id: uuid(), testId: test3Id, questionId: test3Qs[i], sortOrder: i + 1 },
    });
  }
  count('Test', 3);
  count('TestQuestion', test1Qs.length + test2Qs.length + test3Qs.length);

  // LevelTestConfig
  await prisma.levelTestConfig.create({
    data: {
      id: uuid(), testId: test3Id,
      questionDomains: [
        { domain: 'CALCULATION', count: 4 },
        { domain: 'UNDERSTANDING', count: 3 },
        { domain: 'PROBLEM_SOLVING', count: 2 },
        { domain: 'REASONING', count: 1 },
      ],
    },
  });
  count('LevelTestConfig', 1);

  // ──────────────────────────────────────────────────────
  // 10. TestAssignment + TestAttempt + AnswerLog
  // ──────────────────────────────────────────────────────
  console.log('9. TestAssignment + Attempt + AnswerLog 생성...');

  const testConfigs = [
    { testId: test1Id, studentSlice: studentIds.slice(0, 5), qIds: test1Qs },
    { testId: test2Id, studentSlice: studentIds.slice(5, 10), qIds: test2Qs },
    { testId: test3Id, studentSlice: studentIds.slice(10, 15), qIds: test3Qs },
  ];

  const statuses: ('COMPLETED' | 'ASSIGNED' | 'IN_PROGRESS')[] = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'ASSIGNED', 'IN_PROGRESS'];

  for (const tc of testConfigs) {
    for (let si = 0; si < tc.studentSlice.length; si++) {
      const sId = tc.studentSlice[si];
      const status = statuses[si];
      const assignmentId = uuid();
      const bestAttemptId = status === 'COMPLETED' ? uuid() : null;

      let bestScore: number | null = null;
      if (status === 'COMPLETED') {
        const correctCount = Math.floor(tc.qIds.length * (0.5 + Math.random() * 0.4));
        bestScore = Math.round((correctCount / tc.qIds.length) * 100);
      }

      await prisma.testAssignment.create({
        data: {
          id: assignmentId, testId: tc.testId, studentId: sId,
          status, dueDate: day(7), bestScore, bestAttemptId,
          updatedAt: now,
        },
      });
      count('TestAssignment');

      if (status === 'COMPLETED' && bestAttemptId) {
        const correctCount = Math.round((bestScore! / 100) * tc.qIds.length);
        await prisma.testAttempt.create({
          data: {
            id: bestAttemptId, testId: tc.testId, studentId: sId,
            assignmentId, score: bestScore!, maxScore: 100,
            correctCount, totalCount: tc.qIds.length,
            xpEarned: Math.floor(bestScore! / 10), comboMax: Math.floor(Math.random() * 5),
            completedAt: day(-Math.floor(Math.random() * 7)),
            startedAt: day(-8),
          },
        });
        count('TestAttempt');

        // AnswerLog
        for (let qi = 0; qi < tc.qIds.length; qi++) {
          const isCorrect = qi < correctCount;
          const correctAnswer = questionSeeds.find((_, idx) => questionIds[idx] === tc.qIds[qi])
            ? questionSeeds[questionIds.indexOf(tc.qIds[qi])]?.answer || '1'
            : '1';
          await prisma.answerLog.create({
            data: {
              id: uuid(), attemptId: bestAttemptId, questionId: tc.qIds[qi],
              selectedAnswer: isCorrect ? correctAnswer : String(Math.floor(Math.random() * 5) + 1),
              isCorrect, timeSpentSeconds: 30 + Math.floor(Math.random() * 120),
              comboCount: isCorrect ? qi : 0, pointsEarned: isCorrect ? 10 : 0,
            },
          });
          count('AnswerLog');
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────
  // 11. ArithmeticHomeworkPlan
  // ──────────────────────────────────────────────────────
  console.log('10. ArithmeticHomeworkPlan 생성...');

  const arithPlan1Id = uuid();
  const arithPlan2Id = uuid();

  await prisma.arithmeticHomeworkPlan.create({
    data: {
      id: arithPlan1Id, title: '덧셈 연습', createdBy: teacherIds[0],
      categories: ['add_1digit', 'add_2digit'], level: 'easy',
      dailyCount: 10, totalDays: 5, startDate: dateOnly(-10),
      dailyProblems: [], isActive: true, tenantId, updatedAt: now,
    },
  });
  await prisma.arithmeticHomeworkPlan.create({
    data: {
      id: arithPlan2Id, title: '곱셈 연습', createdBy: teacherIds[0],
      categories: ['mul_2x1digit'], level: 'easy',
      dailyCount: 8, totalDays: 5, startDate: dateOnly(-7),
      dailyProblems: [], isActive: true, tenantId, updatedAt: now,
    },
  });
  count('ArithmeticHomeworkPlan', 2);

  // Enrollments + some Attempts
  for (let i = 0; i < 5; i++) {
    await prisma.arithmeticHomeworkEnrollment.create({
      data: { id: uuid(), planId: arithPlan1Id, studentId: studentIds[i] },
    });
    await prisma.arithmeticHomeworkEnrollment.create({
      data: { id: uuid(), planId: arithPlan2Id, studentId: studentIds[i + 5] },
    });
    count('ArithmeticHomeworkEnrollment', 2);
  }

  // Some ArithmeticAttempts for first plan
  for (let i = 0; i < 3; i++) {
    const attemptId = uuid();
    const correct = 7 + Math.floor(Math.random() * 4);
    await prisma.arithmeticAttempt.create({
      data: {
        id: attemptId, studentId: studentIds[i], category: 'add_1digit',
        level: 'easy', problemCount: 10, correctCount: correct,
        score: correct * 10, xpEarned: correct * 2, comboMax: 5,
        totalTimeSeconds: 120 + Math.floor(Math.random() * 180),
        homeworkPlanId: arithPlan1Id, homeworkDayIndex: 0,
        completedAt: day(-8),
      },
    });
    // 2~3 answers per attempt
    for (let j = 0; j < 3; j++) {
      const isC = j < 2;
      await prisma.arithmeticAnswer.create({
        data: {
          id: uuid(), attemptId, problemIndex: j,
          content: `$${3 + j} + ${4 + j}$`, choices: { options: [`${7+2*j}`, `${8+2*j}`, `${6+2*j}`, `${9+2*j}`] },
          selectedAnswer: isC ? `${7+2*j}` : `${8+2*j}`, correctAnswer: `${7+2*j}`,
          isCorrect: isC, timeSpentSeconds: 5 + Math.floor(Math.random() * 15),
        },
      });
      count('ArithmeticAnswer');
    }
    count('ArithmeticAttempt');
  }

  // ──────────────────────────────────────────────────────
  // 12. ConceptHomeworkPlan
  // ──────────────────────────────────────────────────────
  console.log('11. ConceptHomeworkPlan 생성...');

  const conceptHwPlan1Id = uuid();
  const conceptHwPlan2Id = uuid();

  await prisma.conceptHomeworkPlan.create({
    data: {
      id: conceptHwPlan1Id, title: '분수 개념 복습 숙제', createdBy: teacherIds[0],
      startDate: dateOnly(-5), totalDays: 3,
      dailyConcepts: [[conceptIds[0]], [conceptIds[1]], [conceptIds[2]]],
      requiredStage: 'BLANK_FULL', isActive: true, tenantId, updatedAt: now,
    },
  });
  await prisma.conceptHomeworkPlan.create({
    data: {
      id: conceptHwPlan2Id, title: '도형 넓이 암기 숙제', createdBy: teacherIds[1],
      startDate: dateOnly(-3), totalDays: 3,
      dailyConcepts: [[conceptIds[3]], [conceptIds[4]], [conceptIds[5]]],
      requiredStage: 'BLANK_FULL', isActive: true, tenantId, updatedAt: now,
    },
  });
  count('ConceptHomeworkPlan', 2);

  for (let i = 0; i < 5; i++) {
    await prisma.conceptHomeworkEnrollment.create({
      data: { id: uuid(), planId: conceptHwPlan1Id, studentId: studentIds[i] },
    });
    await prisma.conceptHomeworkEnrollment.create({
      data: { id: uuid(), planId: conceptHwPlan2Id, studentId: studentIds[i] },
    });
    count('ConceptHomeworkEnrollment', 2);
  }

  // ──────────────────────────────────────────────────────
  // 13. QuestionHomeworkPlan
  // ──────────────────────────────────────────────────────
  console.log('12. QuestionHomeworkPlan 생성...');

  const qhwPlanId = uuid();
  await prisma.questionHomeworkPlan.create({
    data: {
      id: qhwPlanId, title: '분수 문제 풀이 숙제', createdBy: teacherIds[0],
      startDate: dateOnly(-3), totalDays: 2,
      dailyQuestions: [questionIds.slice(0, 3), questionIds.slice(3, 6)],
      passingScore: 80, isActive: true, tenantId, updatedAt: now,
    },
  });
  count('QuestionHomeworkPlan', 1);

  // HomeworkQuestion 매핑
  for (let day = 0; day < 2; day++) {
    const dayQIds = day === 0 ? questionIds.slice(0, 3) : questionIds.slice(3, 6);
    for (let j = 0; j < dayQIds.length; j++) {
      await prisma.homeworkQuestion.create({
        data: { id: uuid(), planId: qhwPlanId, questionId: dayQIds[j], dayIndex: day, sortOrder: j },
      });
      count('HomeworkQuestion');
    }
  }

  // Enrollment + Attempt
  for (let i = 0; i < 5; i++) {
    await prisma.questionHomeworkEnrollment.create({
      data: { id: uuid(), planId: qhwPlanId, studentId: studentIds[i] },
    });
    count('QuestionHomeworkEnrollment');
  }

  // 완료 데이터 (학생 3명)
  for (let i = 0; i < 3; i++) {
    await prisma.questionHomeworkAttempt.create({
      data: {
        id: uuid(), planId: qhwPlanId, studentId: studentIds[i], dayIndex: 0,
        answers: [
          { questionId: questionIds[0], selected: '3', correct: true },
          { questionId: questionIds[1], selected: '3', correct: true },
          { questionId: questionIds[2], selected: '2', correct: i === 0 },
        ],
        correctCount: i === 0 ? 3 : 2, totalCount: 3,
        score: i === 0 ? 100 : 67, completedAt: day(-1),
      },
    });
    count('QuestionHomeworkAttempt');
  }

  // ──────────────────────────────────────────────────────
  // 14. LearningProgress
  // ──────────────────────────────────────────────────────
  console.log('13. LearningProgress 생성...');

  const stages: ('READING' | 'BLANK_EASY' | 'BLANK_HARD' | 'BLANK_FULL')[] = ['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_FULL'];

  // 학생 10명에 대해 다양한 진행도
  const progressConfigs = [
    { studentIdx: 0, conceptIdx: 0, completedStages: 4 }, // 전체 완료
    { studentIdx: 0, conceptIdx: 1, completedStages: 3 },
    { studentIdx: 0, conceptIdx: 2, completedStages: 2 },
    { studentIdx: 1, conceptIdx: 0, completedStages: 4 },
    { studentIdx: 1, conceptIdx: 1, completedStages: 1 },
    { studentIdx: 2, conceptIdx: 0, completedStages: 4 },
    { studentIdx: 2, conceptIdx: 3, completedStages: 2 },
    { studentIdx: 3, conceptIdx: 0, completedStages: 1 },
    { studentIdx: 4, conceptIdx: 0, completedStages: 3 },
    { studentIdx: 4, conceptIdx: 1, completedStages: 2 },
    { studentIdx: 5, conceptIdx: 6, completedStages: 4 },
    { studentIdx: 5, conceptIdx: 7, completedStages: 3 },
    { studentIdx: 6, conceptIdx: 6, completedStages: 2 },
    { studentIdx: 7, conceptIdx: 6, completedStages: 1 },
    { studentIdx: 8, conceptIdx: 9, completedStages: 4 },
    { studentIdx: 8, conceptIdx: 10, completedStages: 3 },
    { studentIdx: 9, conceptIdx: 9, completedStages: 2 },
    { studentIdx: 10, conceptIdx: 12, completedStages: 4 },
    { studentIdx: 10, conceptIdx: 13, completedStages: 3 },
    { studentIdx: 11, conceptIdx: 12, completedStages: 2 },
    { studentIdx: 12, conceptIdx: 12, completedStages: 1 },
  ];

  for (const pc of progressConfigs) {
    for (let s = 0; s < pc.completedStages; s++) {
      const completed = s < pc.completedStages - 1 || pc.completedStages === 4;
      await prisma.learningProgress.create({
        data: {
          id: uuid(),
          userId: studentIds[pc.studentIdx],
          conceptId: conceptIds[pc.conceptIdx],
          stage: stages[s],
          completed,
          attempts: completed ? 1 + Math.floor(Math.random() * 3) : 1,
          score: completed ? 80 + Math.floor(Math.random() * 21) : null,
          startedAt: day(-20 + s * 2),
          completedAt: completed ? day(-20 + s * 2 + 1) : null,
          updatedAt: now,
        },
      });
      count('LearningProgress');
    }
  }

  // ──────────────────────────────────────────────────────
  // 15. LearningCourse
  // ──────────────────────────────────────────────────────
  console.log('14. LearningCourse 생성...');

  const course1Id = uuid();
  const course2Id = uuid();

  await prisma.learningCourse.create({
    data: {
      id: course1Id, title: '초5 분수+도형 마스터 코스', description: '분수와 도형 개념을 순서대로 학습합니다.',
      createdBy: teacherIds[0], isActive: true, tenantId, updatedAt: now,
    },
  });
  await prisma.learningCourse.create({
    data: {
      id: course2Id, title: '중1 정수/유리수 기초 코스', description: '정수와 유리수의 기초 개념을 학습합니다.',
      createdBy: teacherIds[2], isActive: true, tenantId, updatedAt: now,
    },
  });
  count('LearningCourse', 2);

  // Course1: 분수 3 + 도형 2 = 5개 개념
  const course1Concepts = [conceptIds[0], conceptIds[1], conceptIds[2], conceptIds[3], conceptIds[4]];
  for (let i = 0; i < course1Concepts.length; i++) {
    await prisma.learningCourseConcept.create({
      data: { id: uuid(), courseId: course1Id, conceptId: course1Concepts[i], sortOrder: i },
    });
  }

  // Course2: 정수/유리수 3 + 비율 2 = 5개 개념
  const course2Concepts = [conceptIds[12], conceptIds[13], conceptIds[14], conceptIds[6], conceptIds[7]];
  for (let i = 0; i < course2Concepts.length; i++) {
    await prisma.learningCourseConcept.create({
      data: { id: uuid(), courseId: course2Id, conceptId: course2Concepts[i], sortOrder: i },
    });
  }
  count('LearningCourseConcept', 10);

  // Enrollments
  const courseEnrollments: { courseId: string; studentIdx: number; status: 'ACTIVE' | 'COMPLETED' | 'LOCKED' }[] = [
    { courseId: course1Id, studentIdx: 0, status: 'COMPLETED' },
    { courseId: course1Id, studentIdx: 1, status: 'ACTIVE' },
    { courseId: course1Id, studentIdx: 2, status: 'ACTIVE' },
    { courseId: course1Id, studentIdx: 3, status: 'LOCKED' },
    { courseId: course2Id, studentIdx: 10, status: 'COMPLETED' },
    { courseId: course2Id, studentIdx: 11, status: 'ACTIVE' },
    { courseId: course2Id, studentIdx: 12, status: 'ACTIVE' },
  ];

  for (const ce of courseEnrollments) {
    await prisma.learningCourseEnrollment.create({
      data: {
        id: uuid(), courseId: ce.courseId, studentId: studentIds[ce.studentIdx],
        status: ce.status, sortOrder: ce.studentIdx,
        startedAt: ce.status !== 'LOCKED' ? day(-15) : null,
        completedAt: ce.status === 'COMPLETED' ? day(-2) : null,
        updatedAt: now,
      },
    });
    count('LearningCourseEnrollment');
  }

  // ──────────────────────────────────────────────────────
  // 16. QuizSession
  // ──────────────────────────────────────────────────────
  console.log('15. QuizSession 생성...');

  const quiz1Id = uuid();
  const quiz2Id = uuid();
  const quiz1QuestionIds = questionIds.slice(0, 5);
  const quiz2QuestionIds = questionIds.slice(26, 31);

  await prisma.quizSession.create({
    data: {
      id: quiz1Id, title: '분수 퀴즈 대결', hostId: teacherIds[0],
      questionIds: quiz1QuestionIds, status: 'COMPLETED', currentQ: 5,
      joinCode: 'AB1234', startedAt: day(-3), endedAt: day(-3), tenantId,
    },
  });
  await prisma.quizSession.create({
    data: {
      id: quiz2Id, title: '정수 스피드 퀴즈', hostId: teacherIds[2],
      questionIds: quiz2QuestionIds, status: 'WAITING', currentQ: 0,
      joinCode: 'CD5678', tenantId,
    },
  });
  count('QuizSession', 2);

  // QuizSessionQuestion
  for (let i = 0; i < quiz1QuestionIds.length; i++) {
    await prisma.quizSessionQuestion.create({
      data: { id: uuid(), sessionId: quiz1Id, questionId: quiz1QuestionIds[i], sortOrder: i },
    });
  }
  for (let i = 0; i < quiz2QuestionIds.length; i++) {
    await prisma.quizSessionQuestion.create({
      data: { id: uuid(), sessionId: quiz2Id, questionId: quiz2QuestionIds[i], sortOrder: i },
    });
  }
  count('QuizSessionQuestion', quiz1QuestionIds.length + quiz2QuestionIds.length);

  // Quiz1 participants
  for (let i = 0; i < 5; i++) {
    const participantId = uuid();
    const correct = 2 + Math.floor(Math.random() * 4);
    await prisma.quizParticipant.create({
      data: {
        id: participantId, sessionId: quiz1Id, studentId: studentIds[i],
        studentName: studentMeta[i].name, score: correct * 100,
        correctCount: correct, rank: i + 1,
      },
    });
    count('QuizParticipant');

    // QuizAnswerLog
    for (let qi = 0; qi < quiz1QuestionIds.length; qi++) {
      const isCorrect = qi < correct;
      const correctAns = questionSeeds[qi]?.answer || '1';
      await prisma.quizAnswerLog.create({
        data: {
          id: uuid(), participantId, questionId: quiz1QuestionIds[qi],
          questionIndex: qi, selectedAnswer: isCorrect ? correctAns : '5',
          correctAnswer: correctAns, isCorrect,
          timeSpentSeconds: 5 + Math.floor(Math.random() * 25),
          pointsEarned: isCorrect ? 100 : 0,
        },
      });
      count('QuizAnswerLog');
    }
  }

  // ──────────────────────────────────────────────────────
  // 17. Badge + UserBadge
  // ──────────────────────────────────────────────────────
  console.log('16. Badge + UserBadge 생성...');

  const badgeData = [
    { key: 'streak_3', label: '작은 불씨', description: '연속 학습 3일 달성', icon: '/badges/streak_3.png', color: '#f59e0b', condition: { type: 'streak', value: 3 }, sortOrder: 10 },
    { key: 'streak_7', label: '타오르는 열정', description: '연속 학습 7일 달성', icon: '/badges/streak_7.png', color: '#ef4444', condition: { type: 'streak', value: 7 }, sortOrder: 11 },
    { key: 'streak_30', label: '습관의 완성', description: '연속 학습 30일 달성', icon: '🌟', color: '#8b5cf6', condition: { type: 'streak', value: 30 }, sortOrder: 12 },
    { key: 'blank_1', label: '첫 발걸음', description: '개념 백지쓰기 1회 통과', icon: '📝', color: '#3b82f6', condition: { type: 'blank', value: 1 }, sortOrder: 20 },
    { key: 'blank_10', label: '지식의 탐구자', description: '개념 백지쓰기 10회 통과', icon: '🧠', color: '#2563eb', condition: { type: 'blank', value: 10 }, sortOrder: 21 },
    { key: 'arithmetic_100', label: '계산의 시작', description: '연산 문제 100개 정답', icon: '/badges/arithmetic_100.png', color: '#10b981', condition: { type: 'arithmetic', value: 100 }, sortOrder: 30 },
    { key: 'arithmetic_1000', label: '인간 계산기', description: '연산 문제 1,000개 정답', icon: '⚡', color: '#059669', condition: { type: 'arithmetic', value: 1000 }, sortOrder: 31 },
    { key: 'test_100_1', label: '백점 만점', description: '시험에서 첫 100점 달성', icon: '/badges/test_100_1.png', color: '#ec4899', condition: { type: 'test_100', value: 1 }, sortOrder: 40 },
    { key: 'level_5', label: '폭풍 성장', description: '캐릭터 레벨 5 달성', icon: '📈', color: '#14b8a6', condition: { type: 'level', value: 5 }, sortOrder: 42 },
    { key: 'hidden_owl', label: '올빼미족', description: '새벽 시간(00시~04시)에 학습 진행', icon: '/badges/hidden_owl.png', color: '#4f46e5', condition: { type: 'hidden_owl', value: 1 }, sortOrder: 90 },
  ];

  const badgeIds: Record<string, string> = {};
  for (const b of badgeData) {
    const bId = uuid();
    badgeIds[b.key] = bId;
    await prisma.badge.create({ data: { id: bId, ...b } });
  }
  count('Badge', badgeData.length);

  // UserBadge: 일부 학생에게 배지 수여
  const userBadges = [
    { studentIdx: 0, badges: ['streak_7', 'blank_1', 'blank_10', 'arithmetic_100', 'level_5'] },
    { studentIdx: 2, badges: ['streak_30', 'blank_1', 'blank_10', 'arithmetic_100', 'arithmetic_1000', 'test_100_1', 'level_5'] },
    { studentIdx: 4, badges: ['streak_3', 'blank_1', 'arithmetic_100'] },
    { studentIdx: 8, badges: ['streak_7', 'blank_1', 'hidden_owl'] },
    { studentIdx: 10, badges: ['streak_30', 'blank_1', 'blank_10', 'level_5'] },
  ];

  for (const ub of userBadges) {
    for (let i = 0; i < ub.badges.length; i++) {
      await prisma.userBadge.create({
        data: {
          id: uuid(),
          userId: studentIds[ub.studentIdx],
          badgeId: badgeIds[ub.badges[i]],
          earnedAt: day(-30 + i * 3),
        },
      });
      count('UserBadge');
    }
  }

  // ──────────────────────────────────────────────────────
  // 18. PointTransaction
  // ──────────────────────────────────────────────────────
  console.log('17. PointTransaction 생성...');

  const ptReasons = ['개념학습 완료', '빈칸 쉬움 통과', '빈칸 어려움 통과', '통문장 암기 완료', '시험 완료', '연산 연습', '일일 미션 완료', '퀴즈 참여'];
  const ptAmounts = [5, 10, 15, 20, 30, 10, 25, 50];

  for (let i = 0; i < 15; i++) {
    const txCount = 3 + Math.floor(Math.random() * 6); // 3~8 transactions per student
    for (let j = 0; j < txCount; j++) {
      const rIdx = Math.floor(Math.random() * ptReasons.length);
      await prisma.pointTransaction.create({
        data: {
          id: uuid(),
          userId: studentIds[i],
          amount: ptAmounts[rIdx],
          type: 'EARN',
          reason: ptReasons[rIdx],
          createdAt: day(-Math.floor(Math.random() * 30)),
        },
      });
      count('PointTransaction');
    }
  }

  // ──────────────────────────────────────────────────────
  // 19. DailyMission
  // ──────────────────────────────────────────────────────
  console.log('18. DailyMission 생성...');

  for (let i = 0; i < 5; i++) {
    const allComplete = i < 2;
    await prisma.dailyMission.create({
      data: {
        id: uuid(), studentId: studentIds[i], date: dateOnly(0),
        missions: [
          { type: 'arithmetic', label: '연산 10문제 풀기', count: 10, completed: allComplete || i < 3 },
          { type: 'concept', label: '개념 1개 학습하기', count: 1, completed: allComplete },
          { type: 'blank', label: '빈칸 연습 1회', count: 1, completed: allComplete },
        ],
        allComplete, xpAwarded: allComplete ? 25 : 0, updatedAt: now,
      },
    });
    count('DailyMission');
  }

  // ──────────────────────────────────────────────────────
  // 20. DailyQuestion + Attempt
  // ──────────────────────────────────────────────────────
  console.log('19. DailyQuestion 생성...');

  const dailyQId = uuid();
  await prisma.dailyQuestion.create({
    data: {
      id: dailyQId, questionId: questionIds[4], date: dateOnly(0),
      createdBy: teacherIds[0], tenantId,
    },
  });
  count('DailyQuestion', 1);

  for (let i = 0; i < 3; i++) {
    const correctAns = questionSeeds[4].answer;
    const isCorrect = i < 2;
    await prisma.dailyQuestionAttempt.create({
      data: {
        id: uuid(), dailyQuestionId: dailyQId, studentId: studentIds[i],
        selectedAnswer: isCorrect ? correctAns : '1', isCorrect,
      },
    });
    count('DailyQuestionAttempt');
  }

  // ──────────────────────────────────────────────────────
  // 21. TimeAttackRecord
  // ──────────────────────────────────────────────────────
  console.log('20. TimeAttackRecord 생성...');

  const taCategories = ['add_1digit', 'add_2digit', 'mul_2x1digit', 'sub_1digit', 'add_3digit'];
  for (let i = 0; i < 10; i++) {
    await prisma.timeAttackRecord.create({
      data: {
        id: uuid(),
        studentId: studentIds[i % 15],
        category: taCategories[i % taCategories.length],
        level: i < 5 ? 'easy' : 'normal',
        correctCount: 15 + Math.floor(Math.random() * 10),
        totalTime: 30 + Math.floor(Math.random() * 90),
        createdAt: day(-Math.floor(Math.random() * 14)),
      },
    });
    count('TimeAttackRecord');
  }

  // ──────────────────────────────────────────────────────
  // 22. FeatureFlag
  // ──────────────────────────────────────────────────────
  console.log('21. FeatureFlag 생성...');

  const flags = [
    { key: 'time_attack', label: '타임어택 챌린지' },
    { key: 'daily_mission', label: '일일 미션 시스템' },
    { key: 'badge_system', label: '뱃지 시스템' },
    { key: 'quiz_speed_scoring', label: '퀴즈 속도 점수' },
    { key: 'revenge_challenge', label: '복수전 챌린지' },
    { key: 'class_competition', label: '반 대항전' },
    { key: 'daily_question', label: '오늘의 문제' },
    { key: 'enhanced_levelup', label: '강화된 레벨업 애니메이션' },
  ];

  for (const f of flags) {
    await prisma.featureFlag.create({
      data: { id: uuid(), key: f.key, label: f.label, enabled: true, tenantId, updatedAt: now },
    });
    count('FeatureFlag');
  }

  // ──────────────────────────────────────────────────────
  // 23. DiagnosticResult
  // ──────────────────────────────────────────────────────
  console.log('22. DiagnosticResult 생성...');

  // 가상의 attemptId를 사용 (실제 TestAttempt가 존재하지 않는 별도 진단)
  const diagnosticStudents = [10, 11, 12];
  for (let i = 0; i < 3; i++) {
    const accuracy = 40 + Math.floor(Math.random() * 50);
    await prisma.diagnosticResult.create({
      data: {
        id: uuid(),
        attemptId: uuid(), // 독립적인 진단 결과
        studentId: studentIds[diagnosticStudents[i]],
        diagnosticType: 'level_test',
        recommendLevel: accuracy >= 70 ? 'middle_1' : 'elementary_6',
        weakAreas: ['정수의 사칙연산', '유리수의 개념'],
        strongAreas: ['정수의 개념'],
        overallAccuracy: accuracy,
        domainScores: {
          CALCULATION: 50 + Math.floor(Math.random() * 40),
          UNDERSTANDING: 40 + Math.floor(Math.random() * 50),
          PROBLEM_SOLVING: 30 + Math.floor(Math.random() * 40),
          REASONING: 20 + Math.floor(Math.random() * 50),
        },
      },
    });
    count('DiagnosticResult');
  }

  // ──────────────────────────────────────────────────────
  // 24. Inquiry
  // ──────────────────────────────────────────────────────
  console.log('23. Inquiry 생성...');

  await prisma.inquiry.create({
    data: {
      id: uuid(), userId: studentIds[0], title: '분수 문제 풀이가 어려워요',
      category: '학습 질문', content: '분수의 통분이 잘 이해가 안 돼요. 도와주세요!',
      status: 'PENDING', updatedAt: now,
    },
  });
  await prisma.inquiry.create({
    data: {
      id: uuid(), userId: studentIds[5], title: '비밀번호를 변경하고 싶어요',
      category: '계정 문의', content: '비밀번호 변경은 어떻게 하나요?',
      status: 'PENDING', updatedAt: now,
    },
  });
  await prisma.inquiry.create({
    data: {
      id: uuid(), userId: teacherIds[1], title: '시험 결과 다운로드 기능 문의',
      category: '기능 문의', content: '학생 시험 결과를 엑셀로 다운로드할 수 있나요?',
      status: 'ANSWERED', reply: '현재 개발 중인 기능입니다. 다음 업데이트에서 지원 예정입니다.',
      repliedAt: day(-1), repliedBy: ownerId, updatedAt: now,
    },
  });
  count('Inquiry', 3);

  // ──────────────────────────────────────────────────────
  // 25. TeacherComment
  // ──────────────────────────────────────────────────────
  console.log('24. TeacherComment 생성...');

  const months = ['2026-01', '2026-02', '2026-03'];
  const commentTexts = [
    '분수 개념 이해가 빠르고 연산 실력이 좋습니다. 꾸준히 복습하면 더 좋은 결과가 있을 거예요.',
    '도형 넓이 공식을 잘 외우고 있습니다. 응용 문제에서 조금 더 연습이 필요합니다.',
    '정수 연산에 자신감이 붙고 있습니다. 유리수까지 확장하면 좋겠습니다.',
    '출석률이 높고 성실합니다. 학습 태도가 매우 좋아요.',
    '최근 시험 성적이 크게 올랐습니다. 본인의 노력이 결실을 맺고 있어요.',
  ];

  for (let i = 0; i < 5; i++) {
    await prisma.teacherComment.create({
      data: {
        id: uuid(),
        teacherId: teacherIds[i % 3],
        studentId: studentIds[i],
        month: months[i % 3],
        content: commentTexts[i],
        updatedAt: now,
      },
    });
    count('TeacherComment');
  }

  // ──────────────────────────────────────────────────────
  // 26. ReportHistory
  // ──────────────────────────────────────────────────────
  console.log('25. ReportHistory 생성...');

  for (let i = 0; i < 3; i++) {
    await prisma.reportHistory.create({
      data: {
        id: uuid(),
        studentId: studentIds[i],
        type: 'level_test',
        content: {
          summary: `${studentMeta[i].name} 학생의 레벨테스트 보고서`,
          date: day(-10 + i * 3).toISOString(),
          overallScore: 60 + i * 15,
          recommendation: '기초 개념 복습 후 응용 문제로 확장 권장',
        },
        channel: 'web',
        sentAt: day(-10 + i * 3),
      },
    });
    count('ReportHistory');
  }

  // ──────────────────────────────────────────────────────
  // 27. ConceptMemo
  // ──────────────────────────────────────────────────────
  console.log('26. ConceptMemo 생성...');

  const memos = [
    { studentIdx: 0, conceptIdx: 0, content: '분모는 아래, 분자는 위! 피자로 기억하자.' },
    { studentIdx: 0, conceptIdx: 1, content: '통분 잊지 말자. 분모를 같게!' },
    { studentIdx: 1, conceptIdx: 0, content: '진분수: 분자 < 분모, 가분수: 분자 >= 분모' },
    { studentIdx: 2, conceptIdx: 3, content: '삼각형 넓이 = 밑변 x 높이 / 2, 직사각형의 반!' },
    { studentIdx: 10, conceptIdx: 12, content: '양의 정수 = 자연수. 0은 양수도 음수도 아님.' },
  ];

  for (const m of memos) {
    await prisma.conceptMemo.create({
      data: {
        id: uuid(),
        userId: studentIds[m.studentIdx],
        conceptId: conceptIds[m.conceptIdx],
        content: m.content,
        updatedAt: now,
      },
    });
    count('ConceptMemo');
  }

  // ──────────────────────────────────────────────────────
  // 완료
  // ──────────────────────────────────────────────────────
  console.log('\n=== 시드 완료! ===\n');
  console.log('── 생성 요약 ──');
  const sortedKeys = Object.keys(counts).sort();
  for (const k of sortedKeys) {
    console.log(`  ${k}: ${counts[k]}개`);
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`\n  총: ${total}개 레코드\n`);
}

main()
  .catch((e) => {
    console.error('시드 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
