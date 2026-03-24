/**
 * seed-full.ts — MathLab 종합 시드 스크립트 (전체 기능 테스트용)
 *
 * 실행: npx tsx scripts/seed-full.ts
 *
 * 모든 역할(STUDENT, TEACHER, MANAGER, OWNER, SUPER_ADMIN)에서
 * 모든 기능을 테스트할 수 있도록 대규모 더미 데이터를 생성합니다.
 *
 * ─ 테넌트 3개 (멀티테넌트)
 * ─ 사용자 45+명 (역할별 충분한 수)
 * ─ 과목 8개, 개념 24개, 빈칸연습 48개
 * ─ 문제 135개
 * ─ 시험 8개 (일반+레벨테스트)
 * ─ 숙제 3종 각 2개
 * ─ 퀴즈 4개
 * ─ 뱃지 35개 + 수여
 * ─ 이용권 통합 (TenantLicense + StudentLicense)
 * ─ 학습과정, 복수전, 타임어택, 진단, 리포트, 일일미션 등 전체 커버
 */

import { PrismaClient, LicenseFeature } from '@prisma/client';
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
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

// ─── 카운터 ─────────────────────────────────────────────
const counts: Record<string, number> = {};
function count(key: string, n = 1) {
  counts[key] = (counts[key] || 0) + n;
}

// ─── 비밀번호 캐시 (bcrypt 느려서) ──────────────────────
const PW_ADMIN = hash('admin1234');
const PW_PASS = hash('pass1234');
const PW_STUDENT = hash('1234');

// ─── 메인 ───────────────────────────────────────────────
async function main() {
  console.log('=== MathLab 종합 시드 시작 ===\n');

  // ════════════════════════════════════════════════════════
  // 1. 기존 데이터 삭제 (자식 테이블부터)
  // ════════════════════════════════════════════════════════
  console.log('기존 데이터 삭제 중...');

  // 이용권
  await prisma.studentLicense.deleteMany();
  await prisma.tenantLicense.deleteMany();

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
  await prisma.timeAttackAnswer.deleteMany();
  await prisma.timeAttackRecord.deleteMany();
  await prisma.revengeAnswer.deleteMany();
  await prisma.revengeAttempt.deleteMany();
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

  // ════════════════════════════════════════════════════════
  // 2. Tenants (3개)
  // ════════════════════════════════════════════════════════
  console.log('1. Tenant 생성...');
  const tenants = [
    { id: uuid(), slug: 'mathlab', name: 'MathLab 본원' },
    { id: uuid(), slug: 'gangnam', name: '강남점' },
    { id: uuid(), slug: 'seocho', name: '서초점' },
  ];
  for (const t of tenants) {
    await prisma.tenant.create({ data: { ...t, updatedAt: now } });
  }
  count('Tenant', 3);
  const [T1, T2, T3] = tenants.map(t => t.id);

  // ════════════════════════════════════════════════════════
  // 3. Classrooms (테넌트별)
  // ════════════════════════════════════════════════════════
  console.log('2. Classroom 생성...');
  const classrooms = [
    // T1 본원
    { id: uuid(), name: '초등 A반', grade: 5, tenantId: T1 },
    { id: uuid(), name: '초등 B반', grade: 6, tenantId: T1 },
    { id: uuid(), name: '중등반', grade: 7, tenantId: T1 },
    { id: uuid(), name: '고등 기초반', grade: 10, tenantId: T1 },
    // T2 강남점
    { id: uuid(), name: '초등 영재반', grade: 5, tenantId: T2 },
    { id: uuid(), name: '중등 심화반', grade: 8, tenantId: T2 },
    // T3 서초점
    { id: uuid(), name: '초등반', grade: 6, tenantId: T3 },
    { id: uuid(), name: '중등반', grade: 7, tenantId: T3 },
  ];
  await prisma.classroom.createMany({ data: classrooms });
  count('Classroom', classrooms.length);

  // 편의를 위한 이름 인덱싱
  const CR = Object.fromEntries(classrooms.map(c => [c.name + '@' + c.tenantId, c.id]));
  const cr = (name: string, tid: string) => CR[name + '@' + tid];

  // ════════════════════════════════════════════════════════
  // 4. Users (역할별 충분한 수)
  // ════════════════════════════════════════════════════════
  console.log('3. Users 생성...');

  // --- SUPER_ADMIN (1명, 테넌트 없음 혹은 T1) ---
  const superAdminId = uuid();
  await prisma.user.create({
    data: {
      id: superAdminId, username: 'superadmin', passwordHash: PW_ADMIN,
      name: '슈퍼관리자', role: 'SUPER_ADMIN', tenantId: T1, updatedAt: now,
    },
  });

  // --- OWNER (테넌트별 1명) ---
  const ownerIds: Record<string, string> = {};
  const ownerData = [
    { tid: T1, username: 'admin', name: '김원장' },
    { tid: T2, username: 'admin_gn', name: '이원장' },
    { tid: T3, username: 'admin_sc', name: '박원장' },
  ];
  for (const o of ownerData) {
    const id = uuid();
    ownerIds[o.tid] = id;
    await prisma.user.create({
      data: {
        id, username: o.username, passwordHash: PW_ADMIN,
        name: o.name, role: 'OWNER', tenantId: o.tid, updatedAt: now,
      },
    });
  }

  // --- MANAGER (T1 2명, T2 1명) ---
  const managerIds: string[] = [];
  const managerData = [
    { tid: T1, username: 'manager01', name: '이팀장' },
    { tid: T1, username: 'manager02', name: '한팀장' },
    { tid: T2, username: 'manager_gn', name: '정팀장' },
  ];
  for (const m of managerData) {
    const id = uuid();
    managerIds.push(id);
    await prisma.user.create({
      data: {
        id, username: m.username, passwordHash: PW_PASS,
        name: m.name, role: 'MANAGER', tenantId: m.tid, updatedAt: now,
      },
    });
  }

  // --- TEACHER (T1 3명, T2 2명, T3 1명) ---
  const teacherIds: string[] = [];
  const teacherData = [
    { tid: T1, username: 'teacher01', name: '김선생' },
    { tid: T1, username: 'teacher02', name: '박선생' },
    { tid: T1, username: 'teacher03', name: '최선생' },
    { tid: T2, username: 'teacher_gn1', name: '강교사' },
    { tid: T2, username: 'teacher_gn2', name: '윤교사' },
    { tid: T3, username: 'teacher_sc1', name: '서교사' },
  ];
  for (const t of teacherData) {
    const id = uuid();
    teacherIds.push(id);
    await prisma.user.create({
      data: {
        id, username: t.username, passwordHash: PW_PASS,
        name: t.name, role: 'TEACHER', tenantId: t.tid, updatedAt: now,
      },
    });
  }

  // --- STUDENT (T1 15명, T2 8명, T3 5명 = 28명) ---
  const allStudentIds: string[] = [];
  const studentMeta: { name: string; grade: number; classroomId: string; tenantId: string; school: string; parent: string; birth: string }[] = [];

  // T1 본원 학생 15명
  const t1Students = [
    { name: '이수학', grade: 5, cr: '초등 A반', school: '서울수학초', parent: '이아버지', birth: '2015-03-15' },
    { name: '박영희', grade: 5, cr: '초등 A반', school: '서울수학초', parent: '박어머니', birth: '2015-07-22' },
    { name: '최민수', grade: 5, cr: '초등 A반', school: '강남초', parent: '최아버지', birth: '2015-01-10' },
    { name: '정하늘', grade: 5, cr: '초등 A반', school: '강남초', parent: '정어머니', birth: '2015-09-05' },
    { name: '김서연', grade: 5, cr: '초등 A반', school: '서초초', parent: '김아버지', birth: '2015-11-30' },
    { name: '이준호', grade: 6, cr: '초등 B반', school: '서초초', parent: '이어머니', birth: '2014-04-18' },
    { name: '한미래', grade: 6, cr: '초등 B반', school: '한강초', parent: '한아버지', birth: '2014-08-25' },
    { name: '조은별', grade: 6, cr: '초등 B반', school: '한강초', parent: '조어머니', birth: '2014-02-14' },
    { name: '윤도현', grade: 6, cr: '초등 B반', school: '반포초', parent: '윤아버지', birth: '2014-06-07' },
    { name: '강지우', grade: 6, cr: '초등 B반', school: '반포초', parent: '강어머니', birth: '2014-12-20' },
    { name: '송예린', grade: 7, cr: '중등반', school: '서울중', parent: '송아버지', birth: '2013-05-11' },
    { name: '임태양', grade: 7, cr: '중등반', school: '서울중', parent: '임어머니', birth: '2013-10-03' },
    { name: '구하린', grade: 7, cr: '중등반', school: '강남중', parent: '구아버지', birth: '2013-03-28' },
    { name: '백다은', grade: 7, cr: '중등반', school: '강남중', parent: '백어머니', birth: '2013-07-16' },
    { name: '노시우', grade: 10, cr: '고등 기초반', school: '서울고', parent: '노아버지', birth: '2010-01-09' },
  ];
  for (const s of t1Students) {
    studentMeta.push({ ...s, classroomId: cr(s.cr, T1), tenantId: T1 });
  }

  // T2 강남점 학생 8명
  const t2Students = [
    { name: '오지훈', grade: 5, cr: '초등 영재반', school: '대치초', parent: '오아버지', birth: '2015-02-11' },
    { name: '장서윤', grade: 5, cr: '초등 영재반', school: '대치초', parent: '장어머니', birth: '2015-06-19' },
    { name: '유하준', grade: 5, cr: '초등 영재반', school: '역삼초', parent: '유아버지', birth: '2015-10-25' },
    { name: '권나영', grade: 5, cr: '초등 영재반', school: '역삼초', parent: '권어머니', birth: '2015-04-08' },
    { name: '심재현', grade: 8, cr: '중등 심화반', school: '강남중', parent: '심아버지', birth: '2012-08-14' },
    { name: '문소희', grade: 8, cr: '중등 심화반', school: '강남중', parent: '문어머니', birth: '2012-11-22' },
    { name: '배준서', grade: 8, cr: '중등 심화반', school: '대치중', parent: '배아버지', birth: '2012-03-05' },
    { name: '안지민', grade: 8, cr: '중등 심화반', school: '대치중', parent: '안어머니', birth: '2012-07-30' },
  ];
  for (const s of t2Students) {
    studentMeta.push({ ...s, classroomId: cr(s.cr, T2), tenantId: T2 });
  }

  // T3 서초점 학생 5명
  const t3Students = [
    { name: '홍유진', grade: 6, cr: '초등반', school: '서초초', parent: '홍아버지', birth: '2014-05-16' },
    { name: '양민재', grade: 6, cr: '초등반', school: '서초초', parent: '양어머니', birth: '2014-09-23' },
    { name: '탁예원', grade: 7, cr: '중등반', school: '서초중', parent: '탁아버지', birth: '2013-01-14' },
    { name: '남도윤', grade: 7, cr: '중등반', school: '서초중', parent: '남어머니', birth: '2013-06-28' },
    { name: '천시온', grade: 7, cr: '중등반', school: '반포중', parent: '천아버지', birth: '2013-11-02' },
  ];
  for (const s of t3Students) {
    studentMeta.push({ ...s, classroomId: cr(s.cr, T3), tenantId: T3 });
  }

  // 학생 전체 생성
  for (let i = 0; i < studentMeta.length; i++) {
    const m = studentMeta[i];
    const id = uuid();
    allStudentIds.push(id);
    await prisma.user.create({
      data: {
        id,
        username: `student${String(i + 1).padStart(2, '0')}`,
        passwordHash: PW_STUDENT,
        name: m.name,
        role: 'STUDENT',
        grade: m.grade,
        classroomId: m.classroomId,
        tenantId: m.tenantId,
        school: m.school,
        parentName: m.parent,
        parentPhone: `010-${String(1000 + i).slice(1)}-${String(5000 + i * 111).slice(0, 4)}`,
        phone: `010-${String(2000 + i).slice(1)}-${String(3000 + i * 222).slice(0, 4)}`,
        birthDate: new Date(m.birth),
        startDate: day(-90 - rand(0, 180)),
        address: `서울시 강남구 테헤란로 ${100 + i}`,
        updatedAt: now,
      },
    });
  }

  const totalUsers = 1 + 3 + 3 + 6 + studentMeta.length;
  count('User', totalUsers);

  // 슬라이스 헬퍼: 테넌트별 학생 ID
  const t1StudentIds = allStudentIds.slice(0, 15);
  const t2StudentIds = allStudentIds.slice(15, 23);
  const t3StudentIds = allStudentIds.slice(23, 28);

  // ════════════════════════════════════════════════════════
  // 5. StudentProfile
  // ════════════════════════════════════════════════════════
  console.log('4. StudentProfile 생성...');
  for (let i = 0; i < allStudentIds.length; i++) {
    const xp = rand(0, 2000);
    const level = xp >= 1600 ? 7 : xp >= 1200 ? 6 : xp >= 800 ? 5 : xp >= 500 ? 4 : xp >= 250 ? 3 : xp >= 100 ? 2 : 1;
    const streak = rand(0, 35);
    await prisma.studentProfile.create({
      data: {
        id: uuid(),
        userId: allStudentIds[i],
        totalXp: xp,
        level,
        currentStreak: streak,
        longestStreak: streak + rand(0, 15),
        lastActiveAt: day(-rand(0, 5)),
        updatedAt: now,
      },
    });
  }
  count('StudentProfile', allStudentIds.length);

  // ════════════════════════════════════════════════════════
  // 6. Subjects (8개: 초5~고등)
  // ════════════════════════════════════════════════════════
  console.log('5. Subjects 생성...');
  const subjects = [
    { id: uuid(), title: '분수', description: '분수의 기본 개념과 연산', gradeLevel: 5, sortOrder: 1 },
    { id: uuid(), title: '도형', description: '기본 도형의 성질과 넓이', gradeLevel: 5, sortOrder: 2 },
    { id: uuid(), title: '비율', description: '비율과 비례의 이해', gradeLevel: 6, sortOrder: 1 },
    { id: uuid(), title: '소수', description: '소수의 개념과 연산', gradeLevel: 6, sortOrder: 2 },
    { id: uuid(), title: '정수와 유리수', description: '정수와 유리수의 개념 및 사칙연산', gradeLevel: 7, sortOrder: 1 },
    { id: uuid(), title: '일차방정식', description: '일차방정식과 부등식', gradeLevel: 7, sortOrder: 2 },
    { id: uuid(), title: '함수', description: '함수의 개념과 그래프', gradeLevel: 8, sortOrder: 1 },
    { id: uuid(), title: '수와 식의 계산', description: '고등 공통수학 — 다항식 연산', gradeLevel: 10, sortOrder: 1 },
  ];
  await prisma.subject.createMany({ data: subjects });
  count('Subject', subjects.length);

  const SID = Object.fromEntries(subjects.map(s => [s.title, s.id]));

  // ════════════════════════════════════════════════════════
  // 7. Concepts (24개, 과목당 3개)
  // ════════════════════════════════════════════════════════
  console.log('6. Concepts + BlankExercise 생성...');

  interface BlankSeed { level: number; templateText: string; blanks: { position: number; answer: string; hint: string }[] }
  interface ConceptSeed {
    id: string; subjectId: string; title: string; sortOrder: number;
    fullContent: string; conceptCode: string; grade: string; part: string;
    chapter: string; section: string; blanks: BlankSeed[];
  }

  const conceptSeeds: ConceptSeed[] = [
    // ─── 분수 (3) ───
    {
      id: uuid(), subjectId: SID['분수'], title: '분수의 뜻', sortOrder: 1,
      conceptCode: 'E5-F01', grade: 'elementary_5', part: 'calc', chapter: '분수', section: '분수의 뜻',
      fullContent: '# 분수의 뜻\n\n분수는 전체를 똑같이 나눈 것 중 일부를 나타내는 수입니다.\n\n## 분수의 구성\n- **분자**: 위에 있는 수\n- **분모**: 아래에 있는 수\n\n## 진분수와 가분수\n- 진분수: 분자 < 분모 (예: $\\frac{3}{5}$)\n- 가분수: 분자 ≥ 분모 (예: $\\frac{5}{3}$)',
      blanks: [
        { level: 1, templateText: '분수는 전체를 똑같이 나눈 것 중 {{1}}를 나타내는 수입니다. 위에 있는 수를 {{2}}라 하고, 아래에 있는 수를 {{3}}라 합니다.', blanks: [{ position: 1, answer: '일부', hint: 'ㅇㅂ' }, { position: 2, answer: '분자', hint: 'ㅂㅈ' }, { position: 3, answer: '분모', hint: 'ㅂㅁ' }] },
        { level: 2, templateText: '{{1}}는 전체를 {{2}} 나눈 것 중 {{3}}를 나타내는 수입니다. 분자가 분모보다 작은 분수를 {{4}}라 하고, 크거나 같은 분수를 {{5}}라 합니다.', blanks: [{ position: 1, answer: '분수', hint: 'ㅂㅅ' }, { position: 2, answer: '똑같이', hint: 'ㄸㄱㅇ' }, { position: 3, answer: '일부', hint: 'ㅇㅂ' }, { position: 4, answer: '진분수', hint: 'ㅈㅂㅅ' }, { position: 5, answer: '가분수', hint: 'ㄱㅂㅅ' }] },
      ],
    },
    {
      id: uuid(), subjectId: SID['분수'], title: '분수의 덧셈', sortOrder: 2,
      conceptCode: 'E5-F02', grade: 'elementary_5', part: 'calc', chapter: '분수', section: '분수의 덧셈',
      fullContent: '# 분수의 덧셈\n\n분모가 같은 분수끼리는 분자만 더합니다.\n\n분모가 다르면 먼저 통분한 후 더합니다.\n\n통분이란 두 분수의 분모를 같게 만드는 것입니다.',
      blanks: [
        { level: 1, templateText: '분모가 같은 분수의 덧셈은 {{1}}만 더하면 됩니다. 분모가 다르면 먼저 {{2}}을 합니다.', blanks: [{ position: 1, answer: '분자', hint: 'ㅂㅈ' }, { position: 2, answer: '통분', hint: 'ㅌㅂ' }] },
        { level: 2, templateText: '{{1}}이란 두 분수의 {{2}}를 같게 만드는 것입니다. 분모가 {{3}} 분수는 먼저 통분한 후 더합니다.', blanks: [{ position: 1, answer: '통분', hint: 'ㅌㅂ' }, { position: 2, answer: '분모', hint: 'ㅂㅁ' }, { position: 3, answer: '다른', hint: 'ㄷㄹ' }] },
      ],
    },
    {
      id: uuid(), subjectId: SID['분수'], title: '분수의 뺄셈', sortOrder: 3,
      conceptCode: 'E5-F03', grade: 'elementary_5', part: 'calc', chapter: '분수', section: '분수의 뺄셈',
      fullContent: '# 분수의 뺄셈\n\n분모가 같으면 분자만 빼고, 다르면 통분 후 뺍니다.',
      blanks: [
        { level: 1, templateText: '분수의 뺄셈에서 분모가 다르면 먼저 {{1}}을 합니다.', blanks: [{ position: 1, answer: '통분', hint: 'ㅌㅂ' }] },
        { level: 2, templateText: '분모가 {{1}} 분수의 {{2}}은 {{3}}만 빼면 됩니다.', blanks: [{ position: 1, answer: '같은', hint: 'ㄱㅇ' }, { position: 2, answer: '뺄셈', hint: 'ㅃㅅ' }, { position: 3, answer: '분자', hint: 'ㅂㅈ' }] },
      ],
    },
    // ─── 도형 (3) ───
    {
      id: uuid(), subjectId: SID['도형'], title: '삼각형의 넓이', sortOrder: 1,
      conceptCode: 'E5-G01', grade: 'elementary_5', part: 'geo', chapter: '도형의 넓이', section: '삼각형의 넓이',
      fullContent: '# 삼각형의 넓이\n\n$$\\text{삼각형의 넓이} = \\frac{\\text{밑변} \\times \\text{높이}}{2}$$',
      blanks: [
        { level: 1, templateText: '삼각형의 넓이 = {{1}} × {{2}} ÷ 2', blanks: [{ position: 1, answer: '밑변', hint: 'ㅁㅂ' }, { position: 2, answer: '높이', hint: 'ㄴㅇ' }] },
        { level: 2, templateText: '{{1}}의 넓이 = {{2}} × {{3}} ÷ {{4}}', blanks: [{ position: 1, answer: '삼각형', hint: 'ㅅㄱㅎ' }, { position: 2, answer: '밑변', hint: 'ㅁㅂ' }, { position: 3, answer: '높이', hint: 'ㄴㅇ' }, { position: 4, answer: '2', hint: '숫자' }] },
      ],
    },
    {
      id: uuid(), subjectId: SID['도형'], title: '사각형의 넓이', sortOrder: 2,
      conceptCode: 'E5-G02', grade: 'elementary_5', part: 'geo', chapter: '도형의 넓이', section: '사각형의 넓이',
      fullContent: '# 사각형의 넓이\n\n직사각형 = 가로 × 세로\n평행사변형 = 밑변 × 높이\n사다리꼴 = (윗변 + 아랫변) × 높이 ÷ 2',
      blanks: [
        { level: 1, templateText: '직사각형의 넓이 = {{1}} × {{2}}', blanks: [{ position: 1, answer: '가로', hint: 'ㄱㄹ' }, { position: 2, answer: '세로', hint: 'ㅅㄹ' }] },
        { level: 2, templateText: '{{1}}의 넓이 = ({{2}} + {{3}}) × {{4}} ÷ 2', blanks: [{ position: 1, answer: '사다리꼴', hint: 'ㅅㄷㄹㄲ' }, { position: 2, answer: '윗변', hint: 'ㅇㅂ' }, { position: 3, answer: '아랫변', hint: 'ㅇㄹㅂ' }, { position: 4, answer: '높이', hint: 'ㄴㅇ' }] },
      ],
    },
    {
      id: uuid(), subjectId: SID['도형'], title: '원의 넓이', sortOrder: 3,
      conceptCode: 'E5-G03', grade: 'elementary_5', part: 'geo', chapter: '도형의 넓이', section: '원의 넓이',
      fullContent: '# 원의 넓이\n\n$$\\text{넓이} = \\pi r^2$$\n원주율은 약 $3.14$입니다.',
      blanks: [
        { level: 1, templateText: '원의 넓이 = {{1}} × {{2}} × {{3}}', blanks: [{ position: 1, answer: '반지름', hint: 'ㅂㅈㄹ' }, { position: 2, answer: '반지름', hint: 'ㅂㅈㄹ' }, { position: 3, answer: '3.14', hint: '원주율' }] },
        { level: 2, templateText: '원주(둘레) = {{1}} × {{2}}. 원주율은 약 {{3}}이며, 기호로 {{4}}로 나타냅니다.', blanks: [{ position: 1, answer: '지름', hint: 'ㅈㄹ' }, { position: 2, answer: '3.14', hint: '원주율' }, { position: 3, answer: '3.14', hint: '숫자' }, { position: 4, answer: 'π', hint: '파이' }] },
      ],
    },
    // ─── 비율 (3) ───
    {
      id: uuid(), subjectId: SID['비율'], title: '비의 개념', sortOrder: 1,
      conceptCode: 'E6-R01', grade: 'elementary_6', part: 'calc', chapter: '비와 비율', section: '비의 개념',
      fullContent: '# 비의 개념\n\n비란 두 수를 나눗셈으로 비교하는 것입니다.\n비의 값 = 앞항 ÷ 뒷항',
      blanks: [
        { level: 1, templateText: '비의 값 = {{1}} ÷ {{2}}', blanks: [{ position: 1, answer: '앞항', hint: 'ㅇㅎ' }, { position: 2, answer: '뒷항', hint: 'ㄷㅎ' }] },
        { level: 2, templateText: '{{1}}란 두 수를 {{2}}으로 비교하는 것입니다.', blanks: [{ position: 1, answer: '비', hint: 'ㅂ' }, { position: 2, answer: '나눗셈', hint: 'ㄴㄴㅅ' }] },
      ],
    },
    {
      id: uuid(), subjectId: SID['비율'], title: '비율과 백분율', sortOrder: 2,
      conceptCode: 'E6-R02', grade: 'elementary_6', part: 'calc', chapter: '비와 비율', section: '비율과 백분율',
      fullContent: '# 비율과 백분율\n\n비율 = 비교하는 양 ÷ 기준량\n백분율 = 비율 × 100',
      blanks: [
        { level: 1, templateText: '백분율 = {{1}} × 100', blanks: [{ position: 1, answer: '비율', hint: 'ㅂㅇ' }] },
        { level: 2, templateText: '{{1}}은 비율을 {{2}}을 기준으로 나타낸 것입니다.', blanks: [{ position: 1, answer: '백분율', hint: 'ㅂㅂㅇ' }, { position: 2, answer: '100', hint: '숫자' }] },
      ],
    },
    {
      id: uuid(), subjectId: SID['비율'], title: '비례식', sortOrder: 3,
      conceptCode: 'E6-R03', grade: 'elementary_6', part: 'calc', chapter: '비와 비율', section: '비례식',
      fullContent: '# 비례식\n\n비례식의 성질: 외항의 곱 = 내항의 곱',
      blanks: [
        { level: 1, templateText: '비례식의 성질: {{1}}의 곱 = {{2}}의 곱', blanks: [{ position: 1, answer: '외항', hint: 'ㅇㅎ' }, { position: 2, answer: '내항', hint: 'ㄴㅎ' }] },
        { level: 2, templateText: '{{1}}은 비의 값이 같은 두 비를 {{2}}로 연결한 식입니다.', blanks: [{ position: 1, answer: '비례식', hint: 'ㅂㄹㅅ' }, { position: 2, answer: '등호', hint: 'ㄷㅎ' }] },
      ],
    },
    // ─── 소수 (3) ───
    {
      id: uuid(), subjectId: SID['소수'], title: '소수의 뜻', sortOrder: 1,
      conceptCode: 'E6-D01', grade: 'elementary_6', part: 'calc', chapter: '소수의 나눗셈', section: '소수의 뜻',
      fullContent: '# 소수의 뜻\n\n소수점 왼쪽은 정수 부분, 오른쪽은 소수 부분입니다.',
      blanks: [
        { level: 1, templateText: '소수점 왼쪽을 {{1}} 부분, 오른쪽을 {{2}} 부분이라 합니다.', blanks: [{ position: 1, answer: '정수', hint: 'ㅈㅅ' }, { position: 2, answer: '소수', hint: 'ㅅㅅ' }] },
        { level: 2, templateText: '소수 첫째 자리는 {{1}} 자리, 둘째 자리는 {{2}} 자리입니다.', blanks: [{ position: 1, answer: '1/10', hint: '분수' }, { position: 2, answer: '1/100', hint: '분수' }] },
      ],
    },
    {
      id: uuid(), subjectId: SID['소수'], title: '소수의 덧셈과 뺄셈', sortOrder: 2,
      conceptCode: 'E6-D02', grade: 'elementary_6', part: 'calc', chapter: '소수의 나눗셈', section: '소수의 덧셈과 뺄셈',
      fullContent: '# 소수의 덧셈과 뺄셈\n\n소수점을 맞추어 계산합니다. 자릿수가 다르면 0을 붙여서 맞춥니다.',
      blanks: [
        { level: 1, templateText: '소수의 덧셈과 뺄셈은 {{1}}을 맞추어 계산합니다.', blanks: [{ position: 1, answer: '소수점', hint: 'ㅅㅅㅈ' }] },
        { level: 2, templateText: '{{1}}가 다르면 {{2}}을 붙여서 맞춥니다.', blanks: [{ position: 1, answer: '자릿수', hint: 'ㅈㄹㅅ' }, { position: 2, answer: '0', hint: '숫자' }] },
      ],
    },
    {
      id: uuid(), subjectId: SID['소수'], title: '소수의 곱셈', sortOrder: 3,
      conceptCode: 'E6-D03', grade: 'elementary_6', part: 'calc', chapter: '소수의 나눗셈', section: '소수의 곱셈',
      fullContent: '# 소수의 곱셈\n\n자연수처럼 계산한 후, 소수 자릿수를 더한 만큼 소수점을 왼쪽으로 옮깁니다.',
      blanks: [
        { level: 1, templateText: '소수의 곱셈은 {{1}}처럼 계산한 후 {{2}}의 위치를 정합니다.', blanks: [{ position: 1, answer: '자연수', hint: 'ㅈㅇㅅ' }, { position: 2, answer: '소수점', hint: 'ㅅㅅㅈ' }] },
        { level: 2, templateText: '두 수의 소수 {{1}}를 더한 만큼 소수점을 {{2}}으로 옮깁니다.', blanks: [{ position: 1, answer: '자릿수', hint: 'ㅈㄹㅅ' }, { position: 2, answer: '왼쪽', hint: 'ㅇㅉ' }] },
      ],
    },
    // ─── 정수와 유리수 (3) ───
    {
      id: uuid(), subjectId: SID['정수와 유리수'], title: '정수의 개념', sortOrder: 1,
      conceptCode: 'M1-I01', grade: 'middle_1', part: 'calc', chapter: '정수와 유리수', section: '정수의 개념',
      fullContent: '# 정수의 개념\n\n정수는 양의 정수, 0, 음의 정수를 통틀어 이르는 말입니다. 양의 정수는 자연수라고도 합니다.',
      blanks: [
        { level: 1, templateText: '정수는 {{1}}, {{2}}, {{3}}를 통틀어 이르는 말입니다.', blanks: [{ position: 1, answer: '양의 정수', hint: 'ㅇㅇ ㅈㅅ' }, { position: 2, answer: '0', hint: '숫자' }, { position: 3, answer: '음의 정수', hint: 'ㅇㅇ ㅈㅅ' }] },
        { level: 2, templateText: '수직선에서 {{1}}으로 갈수록 크고, {{2}}으로 갈수록 작습니다.', blanks: [{ position: 1, answer: '오른쪽', hint: 'ㅇㄹㅉ' }, { position: 2, answer: '왼쪽', hint: 'ㅇㅉ' }] },
      ],
    },
    {
      id: uuid(), subjectId: SID['정수와 유리수'], title: '정수의 사칙연산', sortOrder: 2,
      conceptCode: 'M1-I02', grade: 'middle_1', part: 'calc', chapter: '정수와 유리수', section: '정수의 사칙연산',
      fullContent: '# 정수의 사칙연산\n\n같은 부호끼리 더하면 절댓값을 더하고 공통 부호를 붙입니다.\n뺄셈은 빼는 수의 부호를 바꾸어 덧셈으로 변환합니다.',
      blanks: [
        { level: 1, templateText: '같은 부호: {{1}}을 더하고 공통 {{2}}를 붙입니다.', blanks: [{ position: 1, answer: '절댓값', hint: 'ㅈㄷㄱ' }, { position: 2, answer: '부호', hint: 'ㅂㅎ' }] },
        { level: 2, templateText: '같은 부호끼리 곱하면 {{1}}, 다른 부호끼리 곱하면 {{2}}입니다.', blanks: [{ position: 1, answer: '양수', hint: 'ㅇㅅ' }, { position: 2, answer: '음수', hint: 'ㅇㅅ' }] },
      ],
    },
    {
      id: uuid(), subjectId: SID['정수와 유리수'], title: '유리수의 개념', sortOrder: 3,
      conceptCode: 'M1-I03', grade: 'middle_1', part: 'calc', chapter: '정수와 유리수', section: '유리수의 개념',
      fullContent: '# 유리수의 개념\n\n유리수는 a/b (a, b는 정수, b≠0)의 꼴로 나타낼 수 있는 수입니다. 모든 정수는 유리수입니다.',
      blanks: [
        { level: 1, templateText: '유리수는 {{1}} (a, b는 정수, b≠0)의 꼴로 나타낼 수 있는 수입니다.', blanks: [{ position: 1, answer: 'a/b', hint: '분수꼴' }] },
        { level: 2, templateText: '모든 {{1}}는 유리수이고, 모든 {{2}}는 정수입니다.', blanks: [{ position: 1, answer: '정수', hint: 'ㅈㅅ' }, { position: 2, answer: '자연수', hint: 'ㅈㅇㅅ' }] },
      ],
    },
    // ─── 일차방정식 (3) ───
    {
      id: uuid(), subjectId: SID['일차방정식'], title: '방정식의 뜻', sortOrder: 1,
      conceptCode: 'M1-E01', grade: 'middle_1', part: 'algebra', chapter: '일차방정식', section: '방정식의 뜻',
      fullContent: '# 방정식의 뜻\n\n방정식은 미지수를 포함하는 등식입니다. 방정식을 참이 되게 하는 미지수의 값을 해(근)라 합니다.',
      blanks: [
        { level: 1, templateText: '방정식은 {{1}}를 포함하는 {{2}}입니다.', blanks: [{ position: 1, answer: '미지수', hint: 'ㅁㅈㅅ' }, { position: 2, answer: '등식', hint: 'ㄷㅅ' }] },
        { level: 2, templateText: '방정식을 참이 되게 하는 미지수의 값을 {{1}}라 합니다.', blanks: [{ position: 1, answer: '해', hint: 'ㅎ' }] },
      ],
    },
    {
      id: uuid(), subjectId: SID['일차방정식'], title: '등식의 성질', sortOrder: 2,
      conceptCode: 'M1-E02', grade: 'middle_1', part: 'algebra', chapter: '일차방정식', section: '등식의 성질',
      fullContent: '# 등식의 성질\n\n등식의 양변에 같은 수를 더하거나, 빼거나, 곱하거나, 나누어도 등식은 성립합니다.',
      blanks: [
        { level: 1, templateText: '등식의 {{1}}에 같은 수를 더하거나 빼도 등식은 성립합니다.', blanks: [{ position: 1, answer: '양변', hint: 'ㅇㅂ' }] },
        { level: 2, templateText: '등식의 양변에 {{1}}이 아닌 같은 수를 곱하거나 나누어도 등식은 성립합니다.', blanks: [{ position: 1, answer: '0', hint: '숫자' }] },
      ],
    },
    {
      id: uuid(), subjectId: SID['일차방정식'], title: '일차방정식의 풀이', sortOrder: 3,
      conceptCode: 'M1-E03', grade: 'middle_1', part: 'algebra', chapter: '일차방정식', section: '일차방정식의 풀이',
      fullContent: '# 일차방정식의 풀이\n\n이항: 등식의 한 변의 항을 부호를 바꾸어 다른 변으로 옮기는 것입니다.',
      blanks: [
        { level: 1, templateText: '{{1}}이란 등식의 한 변의 항을 {{2}}를 바꾸어 다른 변으로 옮기는 것입니다.', blanks: [{ position: 1, answer: '이항', hint: 'ㅇㅎ' }, { position: 2, answer: '부호', hint: 'ㅂㅎ' }] },
        { level: 2, templateText: '일차방정식 $ax + b = 0$에서 $x = -\\frac{b}{a}$ (단, $a \\neq {{1}}$)', blanks: [{ position: 1, answer: '0', hint: '숫자' }] },
      ],
    },
    // ─── 함수 (3) ───
    {
      id: uuid(), subjectId: SID['함수'], title: '함수의 뜻', sortOrder: 1,
      conceptCode: 'M2-F01', grade: 'middle_2', part: 'func', chapter: '함수', section: '함수의 뜻',
      fullContent: '# 함수의 뜻\n\n두 변수 x, y에서 x의 값이 정해지면 y의 값이 하나로 정해지는 관계를 y는 x의 함수라 합니다.',
      blanks: [
        { level: 1, templateText: 'x의 값이 정해지면 y의 값이 {{1}}로 정해지는 관계를 {{2}}라 합니다.', blanks: [{ position: 1, answer: '하나', hint: 'ㅎㄴ' }, { position: 2, answer: '함수', hint: 'ㅎㅅ' }] },
        { level: 2, templateText: '함수 $y = f(x)$에서 x를 {{1}}, y를 {{2}}라 합니다.', blanks: [{ position: 1, answer: '독립변수', hint: 'ㄷㄹㅂㅅ' }, { position: 2, answer: '종속변수', hint: 'ㅈㅅㅂㅅ' }] },
      ],
    },
    {
      id: uuid(), subjectId: SID['함수'], title: '일차함수', sortOrder: 2,
      conceptCode: 'M2-F02', grade: 'middle_2', part: 'func', chapter: '함수', section: '일차함수',
      fullContent: '# 일차함수\n\n$y = ax + b$ (a ≠ 0) 꼴의 함수를 일차함수라 합니다. a는 기울기, b는 y절편입니다.',
      blanks: [
        { level: 1, templateText: '일차함수 $y = ax + b$에서 a는 {{1}}, b는 {{2}}입니다.', blanks: [{ position: 1, answer: '기울기', hint: 'ㄱㅇㄱ' }, { position: 2, answer: 'y절편', hint: 'yㅈㅍ' }] },
        { level: 2, templateText: '기울기가 {{1}}이면 오른쪽 위로, {{2}}이면 오른쪽 아래로 향합니다.', blanks: [{ position: 1, answer: '양수', hint: 'ㅇㅅ' }, { position: 2, answer: '음수', hint: 'ㅇㅅ' }] },
      ],
    },
    {
      id: uuid(), subjectId: SID['함수'], title: '일차함수의 그래프', sortOrder: 3,
      conceptCode: 'M2-F03', grade: 'middle_2', part: 'func', chapter: '함수', section: '일차함수의 그래프',
      fullContent: '# 일차함수의 그래프\n\n일차함수의 그래프는 직선입니다. 기울기가 같으면 평행합니다.',
      blanks: [
        { level: 1, templateText: '일차함수의 그래프는 {{1}}입니다.', blanks: [{ position: 1, answer: '직선', hint: 'ㅈㅅ' }] },
        { level: 2, templateText: '{{1}}가 같으면 두 직선은 {{2}}합니다.', blanks: [{ position: 1, answer: '기울기', hint: 'ㄱㅇㄱ' }, { position: 2, answer: '평행', hint: 'ㅍㅎ' }] },
      ],
    },
    // ─── 수와 식의 계산 (고등, 3) ───
    {
      id: uuid(), subjectId: SID['수와 식의 계산'], title: '다항식의 덧셈과 뺄셈', sortOrder: 1,
      conceptCode: 'H1-P01', grade: 'high_common1', part: 'algebra', chapter: '수와 식의 계산', section: '다항식의 연산',
      fullContent: '# 다항식의 덧셈과 뺄셈\n\n동류항끼리 모아서 계산합니다. 동류항은 문자와 차수가 같은 항입니다.',
      blanks: [
        { level: 1, templateText: '다항식의 덧셈은 {{1}}끼리 모아서 계산합니다.', blanks: [{ position: 1, answer: '동류항', hint: 'ㄷㄹㅎ' }] },
        { level: 2, templateText: '{{1}}은 {{2}}와 {{3}}가 같은 항입니다.', blanks: [{ position: 1, answer: '동류항', hint: 'ㄷㄹㅎ' }, { position: 2, answer: '문자', hint: 'ㅁㅈ' }, { position: 3, answer: '차수', hint: 'ㅊㅅ' }] },
      ],
    },
    {
      id: uuid(), subjectId: SID['수와 식의 계산'], title: '다항식의 곱셈', sortOrder: 2,
      conceptCode: 'H1-P02', grade: 'high_common1', part: 'algebra', chapter: '수와 식의 계산', section: '다항식의 곱셈',
      fullContent: '# 다항식의 곱셈\n\n분배법칙을 이용합니다.\n$(a+b)(c+d) = ac + ad + bc + bd$',
      blanks: [
        { level: 1, templateText: '다항식의 곱셈은 {{1}}을 이용합니다.', blanks: [{ position: 1, answer: '분배법칙', hint: 'ㅂㅂㅂㅊ' }] },
        { level: 2, templateText: '$(a+b)^2 = a^2 + {{1}}ab + b^2$, $(a-b)^2 = a^2 - {{2}}ab + b^2$', blanks: [{ position: 1, answer: '2', hint: '숫자' }, { position: 2, answer: '2', hint: '숫자' }] },
      ],
    },
    {
      id: uuid(), subjectId: SID['수와 식의 계산'], title: '인수분해', sortOrder: 3,
      conceptCode: 'H1-P03', grade: 'high_common1', part: 'algebra', chapter: '수와 식의 계산', section: '인수분해',
      fullContent: '# 인수분해\n\n인수분해는 다항식을 두 개 이상의 인수의 곱으로 나타내는 것입니다.\n공통인수를 묶거나, 곱셈 공식의 역을 이용합니다.',
      blanks: [
        { level: 1, templateText: '{{1}}는 다항식을 인수의 {{2}}으로 나타내는 것입니다.', blanks: [{ position: 1, answer: '인수분해', hint: 'ㅇㅅㅂㅎ' }, { position: 2, answer: '곱', hint: 'ㄱ' }] },
        { level: 2, templateText: '$a^2 - b^2 = (a+b)({{1}})$, $a^2 + 2ab + b^2 = ({{2}})^2$', blanks: [{ position: 1, answer: 'a-b', hint: '식' }, { position: 2, answer: 'a+b', hint: '식' }] },
      ],
    },
  ];

  const conceptIds = conceptSeeds.map(c => c.id);

  for (const c of conceptSeeds) {
    await prisma.concept.create({
      data: {
        id: c.id, subjectId: c.subjectId, title: c.title, fullContent: c.fullContent,
        sortOrder: c.sortOrder, conceptCode: c.conceptCode, grade: c.grade,
        part: c.part, chapter: c.chapter, section: c.section, updatedAt: now,
      },
    });
    for (const b of c.blanks) {
      await prisma.blankExercise.create({
        data: { id: uuid(), conceptId: c.id, level: b.level, templateText: b.templateText, blanks: b.blanks },
      });
    }
  }
  count('Concept', conceptSeeds.length);
  count('BlankExercise', conceptSeeds.length * 2);

  // 선행관계
  console.log('6-1. ConceptPrerequisite 생성...');
  const prereqs = [
    [1, 0], [2, 0],   // 분수 덧셈/뺄셈 ← 분수의 뜻
    [7, 6],            // 비율과 백분율 ← 비의 개념
    [8, 7],            // 비례식 ← 비율과 백분율
    [13, 12],          // 정수 사칙연산 ← 정수 개념
    [14, 12],          // 유리수 ← 정수 개념
    [16, 15],          // 등식의 성질 ← 방정식의 뜻
    [17, 16],          // 일차방정식 풀이 ← 등식의 성질
    [19, 18],          // 일차함수 ← 함수의 뜻
    [20, 19],          // 그래프 ← 일차함수
    [22, 21],          // 다항식 곱셈 ← 다항식 덧뺄
    [23, 22],          // 인수분해 ← 다항식 곱셈
  ];
  for (const [cIdx, pIdx] of prereqs) {
    await prisma.conceptPrerequisite.create({
      data: { id: uuid(), conceptId: conceptIds[cIdx], prerequisiteId: conceptIds[pIdx] },
    });
  }
  count('ConceptPrerequisite', prereqs.length);

  // ════════════════════════════════════════════════════════
  // 8. Questions (120개)
  // ════════════════════════════════════════════════════════
  console.log('7. Questions 생성...');

  type QDiff = 'BASIC' | 'MEDIUM' | 'HIGH' | 'HIGHEST';
  type QType = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER';
  interface QSeed {
    bookCode: string; chapter: string; difficulty: QDiff; type: QType;
    content: string; choices: string[] | null; answer: string;
    explanation: string | null; domain: string;
  }

  const questionSeeds: QSeed[] = [
    // E5-1 분수 (15개)
    { bookCode: 'E5-1', chapter: '1. 분수의 덧셈과 뺄셈', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$\\frac{1}{4} + \\frac{2}{4}$의 값은?', choices: ['$\\frac{1}{4}$', '$\\frac{2}{4}$', '$\\frac{3}{4}$', '$\\frac{4}{4}$', '$\\frac{5}{4}$'], answer: '3', explanation: '분자끼리 더합니다.', domain: 'CALCULATION' },
    { bookCode: 'E5-1', chapter: '1. 분수의 덧셈과 뺄셈', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$\\frac{5}{6} - \\frac{2}{6}$의 값은?', choices: ['$\\frac{1}{6}$', '$\\frac{2}{6}$', '$\\frac{3}{6}$', '$\\frac{4}{6}$', '$\\frac{7}{6}$'], answer: '3', explanation: '분자끼리 뺍니다.', domain: 'CALCULATION' },
    { bookCode: 'E5-1', chapter: '1. 분수의 덧셈과 뺄셈', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$\\frac{1}{3} + \\frac{1}{6}$의 값은?', choices: ['$\\frac{1}{6}$', '$\\frac{2}{6}$', '$\\frac{1}{2}$', '$\\frac{2}{3}$', '$\\frac{5}{6}$'], answer: '3', explanation: '통분하면 $\\frac{2}{6}+\\frac{1}{6}=\\frac{3}{6}=\\frac{1}{2}$', domain: 'CALCULATION' },
    { bookCode: 'E5-1', chapter: '1. 분수의 덧셈과 뺄셈', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '$\\frac{2}{5} + \\frac{1}{10}$을 계산하시오.', choices: null, answer: '1/2', explanation: '통분 후 계산', domain: 'CALCULATION' },
    { bookCode: 'E5-1', chapter: '1. 분수의 덧셈과 뺄셈', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '진분수 중 분모가 $8$이고 $\\frac{1}{2}$보다 큰 분수는 몇 개?', choices: ['$1$개', '$2$개', '$3$개', '$4$개', '$5$개'], answer: '3', explanation: '$\\frac{5}{8}, \\frac{6}{8}, \\frac{7}{8}$의 3개', domain: 'REASONING' },
    { bookCode: 'E5-1', chapter: '1. 분수의 덧셈과 뺄셈', difficulty: 'HIGHEST', type: 'SHORT_ANSWER', content: '어떤 분수에 $\\frac{2}{7}$을 더했더니 $\\frac{5}{7}$이 되었다. 어떤 분수?', choices: null, answer: '3/7', explanation: '$\\frac{5}{7}-\\frac{2}{7}=\\frac{3}{7}$', domain: 'PROBLEM_SOLVING' },
    { bookCode: 'E5-1', chapter: '2. 분수의 곱셈', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$\\frac{2}{3} \\times 4$의 값은?', choices: ['$\\frac{2}{3}$', '$\\frac{4}{3}$', '$\\frac{8}{3}$', '$\\frac{6}{3}$', '$\\frac{8}{12}$'], answer: '3', explanation: '$\\frac{2 \\times 4}{3}=\\frac{8}{3}$', domain: 'CALCULATION' },
    { bookCode: 'E5-1', chapter: '2. 분수의 곱셈', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$\\frac{3}{5} \\times \\frac{2}{7}$의 값은?', choices: ['$\\frac{5}{12}$', '$\\frac{6}{35}$', '$\\frac{5}{35}$', '$\\frac{6}{12}$', '$\\frac{3}{7}$'], answer: '2', explanation: '분자끼리, 분모끼리 곱합니다.', domain: 'CALCULATION' },
    { bookCode: 'E5-1', chapter: '2. 분수의 곱셈', difficulty: 'HIGH', type: 'SHORT_ANSWER', content: '가로 $\\frac{3}{4}$m, 세로 $\\frac{2}{5}$m인 직사각형의 넓이는?', choices: null, answer: '3/10', explanation: '$\\frac{6}{20}=\\frac{3}{10}$', domain: 'PROBLEM_SOLVING' },
    { bookCode: 'E5-1', chapter: '1. 분수의 덧셈과 뺄셈', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '분수에서 아래에 있는 수를 무엇이라 하나요?', choices: ['분자', '분모', '분수', '진분수', '대분수'], answer: '2', explanation: '아래 수 = 분모', domain: 'UNDERSTANDING' },
    { bookCode: 'E5-1', chapter: '2. 분수의 곱셈', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$2\\frac{1}{3} \\times 3$의 값은?', choices: ['$6$', '$7$', '$6\\frac{1}{3}$', '$6\\frac{2}{3}$', '$8$'], answer: '2', explanation: '$\\frac{7}{3} \\times 3=7$', domain: 'CALCULATION' },
    { bookCode: 'E5-1', chapter: '1. 분수의 덧셈과 뺄셈', difficulty: 'HIGH', type: 'SHORT_ANSWER', content: '$\\frac{7}{12} - \\frac{1}{4}$을 계산하시오.', choices: null, answer: '1/3', explanation: '$\\frac{7}{12}-\\frac{3}{12}=\\frac{4}{12}=\\frac{1}{3}$', domain: 'CALCULATION' },
    { bookCode: 'E5-1', chapter: '2. 분수의 곱셈', difficulty: 'HIGHEST', type: 'MULTIPLE_CHOICE', content: '$\\frac{a}{b} \\times \\frac{b}{a}$의 값은? (a,b≠0)', choices: ['$0$', '$1$', '$\\frac{a}{b}$', '$\\frac{b}{a}$', '$ab$'], answer: '2', explanation: '역수를 곱하면 1', domain: 'REASONING' },
    { bookCode: 'E5-1', chapter: '1. 분수의 덧셈과 뺄셈', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$\\frac{3}{8} + \\frac{4}{8}$의 값은?', choices: ['$\\frac{3}{8}$', '$\\frac{4}{8}$', '$\\frac{7}{8}$', '$\\frac{7}{16}$', '$1$'], answer: '3', explanation: '분자끼리 더합니다.', domain: 'CALCULATION' },
    { bookCode: 'E5-1', chapter: '2. 분수의 곱셈', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '$\\frac{4}{9} \\times \\frac{3}{8}$을 계산하시오.', choices: null, answer: '1/6', explanation: '$\\frac{12}{72}=\\frac{1}{6}$', domain: 'CALCULATION' },

    // E5-2 도형 (15개)
    { bookCode: 'E5-2', chapter: '3. 도형의 넓이', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '밑변 $6$cm, 높이 $4$cm인 삼각형의 넓이는?', choices: ['$10$cm²', '$12$cm²', '$20$cm²', '$24$cm²', '$8$cm²'], answer: '2', explanation: '$6 \\times 4 \\div 2 = 12$', domain: 'CALCULATION' },
    { bookCode: 'E5-2', chapter: '3. 도형의 넓이', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '가로 $5$cm, 세로 $3$cm인 직사각형의 넓이는?', choices: ['$8$cm²', '$15$cm²', '$16$cm²', '$12$cm²', '$10$cm²'], answer: '2', explanation: '$5 \\times 3 = 15$', domain: 'CALCULATION' },
    { bookCode: 'E5-2', chapter: '3. 도형의 넓이', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '윗변 $4$cm, 아랫변 $8$cm, 높이 $5$cm인 사다리꼴의 넓이는?', choices: ['$20$cm²', '$30$cm²', '$40$cm²', '$25$cm²', '$35$cm²'], answer: '2', explanation: '$(4+8) \\times 5 \\div 2 = 30$', domain: 'CALCULATION' },
    { bookCode: 'E5-2', chapter: '3. 도형의 넓이', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '반지름 $5$cm인 원의 넓이는? (원주율: 3.14)', choices: null, answer: '78.5', explanation: '$5 \\times 5 \\times 3.14 = 78.5$', domain: 'CALCULATION' },
    { bookCode: 'E5-2', chapter: '3. 도형의 넓이', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '넓이가 $36$cm²인 삼각형의 밑변이 $12$cm일 때, 높이는?', choices: ['$3$cm', '$4$cm', '$6$cm', '$9$cm', '$12$cm'], answer: '3', explanation: '$36 = 12 \\times h \\div 2$이므로 $h=6$', domain: 'PROBLEM_SOLVING' },
    { bookCode: 'E5-2', chapter: '4. 원', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '지름 $10$cm인 원의 원주는? (원주율: 3.14)', choices: ['$15.7$cm', '$31.4$cm', '$62.8$cm', '$78.5$cm', '$314$cm'], answer: '2', explanation: '$10 \\times 3.14=31.4$', domain: 'CALCULATION' },
    { bookCode: 'E5-2', chapter: '4. 원', difficulty: 'HIGH', type: 'SHORT_ANSWER', content: '원주가 $62.8$cm인 원의 반지름은? (원주율: 3.14)', choices: null, answer: '10', explanation: '지름=$62.8 \\div 3.14=20$, 반지름=10', domain: 'PROBLEM_SOLVING' },
    { bookCode: 'E5-2', chapter: '3. 도형의 넓이', difficulty: 'HIGHEST', type: 'MULTIPLE_CHOICE', content: '직사각형의 가로를 2배, 세로를 $\\frac{1}{2}$로 하면 넓이는?', choices: ['$2$배', '$\\frac{1}{2}$배', '변함없다', '$4$배', '$\\frac{1}{4}$배'], answer: '3', explanation: '$2 \\times \\frac{1}{2}=1$배', domain: 'REASONING' },
    { bookCode: 'E5-2', chapter: '3. 도형의 넓이', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '정사각형의 한 변이 $4$cm일 때 넓이는?', choices: ['$8$cm²', '$12$cm²', '$16$cm²', '$20$cm²', '$4$cm²'], answer: '3', explanation: '$4 \\times 4=16$', domain: 'CALCULATION' },
    { bookCode: 'E5-2', chapter: '3. 도형의 넓이', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '밑변 $10$cm, 높이 $6$cm인 평행사변형의 넓이는?', choices: ['$16$cm²', '$30$cm²', '$60$cm²', '$80$cm²', '$36$cm²'], answer: '3', explanation: '$10 \\times 6=60$', domain: 'CALCULATION' },
    { bookCode: 'E5-2', chapter: '4. 원', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '반지름 $3$cm인 원의 둘레는? (원주율: 3.14)', choices: null, answer: '18.84', explanation: '$2 \\times 3 \\times 3.14=18.84$', domain: 'CALCULATION' },
    { bookCode: 'E5-2', chapter: '3. 도형의 넓이', difficulty: 'HIGH', type: 'SHORT_ANSWER', content: '넓이가 $48$cm²인 직사각형의 가로가 $8$cm일 때 세로는?', choices: null, answer: '6', explanation: '$48 \\div 8=6$', domain: 'PROBLEM_SOLVING' },
    { bookCode: 'E5-2', chapter: '3. 도형의 넓이', difficulty: 'HIGHEST', type: 'MULTIPLE_CHOICE', content: '삼각형의 밑변을 $3$배, 높이를 $2$배로 하면 넓이는 몇 배?', choices: ['$3$배', '$5$배', '$6$배', '$8$배', '$12$배'], answer: '3', explanation: '넓이는 밑변×높이÷2이므로 $3 \\times 2=6$배', domain: 'REASONING' },
    { bookCode: 'E5-2', chapter: '3. 도형의 넓이', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '마름모의 넓이 공식에 필요한 것은?', choices: ['밑변, 높이', '가로, 세로', '두 대각선', '한 변, 높이', '반지름'], answer: '3', explanation: '마름모의 넓이=두 대각선의 곱÷2', domain: 'UNDERSTANDING' },
    { bookCode: 'E5-2', chapter: '4. 원', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '반지름이 $r$인 반원의 넓이는?', choices: ['$\\pi r^2$', '$\\frac{\\pi r^2}{2}$', '$2\\pi r$', '$\\pi r$', '$\\frac{\\pi r}{2}$'], answer: '2', explanation: '원의 넓이의 절반', domain: 'UNDERSTANDING' },

    // E6-1 비율 (15개)
    { bookCode: 'E6-1', chapter: '5. 비와 비율', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '사과 $4$개와 귤 $6$개의 비는?', choices: ['$4:6$', '$6:4$', '$2:3$', '$3:2$', '$4:10$'], answer: '1', explanation: '사과:귤=4:6', domain: 'UNDERSTANDING' },
    { bookCode: 'E6-1', chapter: '5. 비와 비율', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$3:5$의 비의 값은?', choices: ['$0.5$', '$0.6$', '$0.8$', '$1.5$', '$1.67$'], answer: '2', explanation: '$3÷5=0.6$', domain: 'CALCULATION' },
    { bookCode: 'E6-1', chapter: '5. 비와 비율', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '$40$명 중 $8$명이 안경을 쓰고 있다. 백분율은?', choices: null, answer: '20', explanation: '$8÷40 \\times 100=20$', domain: 'CALCULATION' },
    { bookCode: 'E6-1', chapter: '5. 비와 비율', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$2:3 = 8:x$에서 $x$는?', choices: ['$6$', '$8$', '$10$', '$12$', '$16$'], answer: '4', explanation: '외항의 곱=내항의 곱', domain: 'CALCULATION' },
    { bookCode: 'E6-1', chapter: '5. 비와 비율', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '설탕물 $200$g에 설탕 $30$g의 비율(%)은?', choices: ['$10$%', '$12$%', '$15$%', '$20$%', '$25$%'], answer: '3', explanation: '$30÷200 \\times 100=15$', domain: 'PROBLEM_SOLVING' },
    { bookCode: 'E6-1', chapter: '5. 비와 비율', difficulty: 'HIGH', type: 'SHORT_ANSWER', content: '지도에서 1cm가 50000cm. 3cm의 실제 거리는 몇 km?', choices: null, answer: '1.5', explanation: '$3 \\times 50000=150000$cm$=1.5$km', domain: 'PROBLEM_SOLVING' },
    { bookCode: 'E6-1', chapter: '6. 비례식', difficulty: 'HIGHEST', type: 'MULTIPLE_CHOICE', content: '$a:12 = 3:4$에서 $a$는?', choices: ['$6$', '$7$', '$8$', '$9$', '$10$'], answer: '4', explanation: '$4a=36, a=9$', domain: 'CALCULATION' },
    { bookCode: 'E6-1', chapter: '5. 비와 비율', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '비율을 100 기준으로 나타낸 것은?', choices: ['비', '비의 값', '백분율', '비율', '비례식'], answer: '3', explanation: '백분율의 정의', domain: 'UNDERSTANDING' },
    { bookCode: 'E6-1', chapter: '6. 비례식', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '비례식 $2:5 = 6:15$에서 외항은?', choices: ['$2$와 $5$', '$5$와 $6$', '$2$와 $15$', '$6$와 $15$', '$5$와 $15$'], answer: '3', explanation: '바깥쪽 두 항', domain: 'UNDERSTANDING' },
    { bookCode: 'E6-1', chapter: '5. 비와 비율', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '$12:16$을 가장 간단한 자연수의 비로 나타내시오. (형태: a:b)', choices: null, answer: '3:4', explanation: '최대공약수 4로 나눔', domain: 'CALCULATION' },
    { bookCode: 'E6-1', chapter: '6. 비례식', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$x:6 = 10:15$에서 $x$는?', choices: ['$2$', '$3$', '$4$', '$5$', '$6$'], answer: '3', explanation: '$15x=60, x=4$', domain: 'CALCULATION' },
    { bookCode: 'E6-1', chapter: '5. 비와 비율', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '300명 중 45%가 여학생이면 남학생은 몇 명?', choices: ['$135$명', '$145$명', '$155$명', '$165$명', '$175$명'], answer: '4', explanation: '여학생=$300 \\times 0.45=135$, 남학생=$300-135=165$', domain: 'PROBLEM_SOLVING' },
    { bookCode: 'E6-1', chapter: '6. 비례식', difficulty: 'HIGHEST', type: 'SHORT_ANSWER', content: '$a:b = 3:5$, $b:c = 5:7$일 때 $a:b:c$를 구하시오.', choices: null, answer: '3:5:7', explanation: 'b가 공통이므로 $a:b:c=3:5:7$', domain: 'REASONING' },
    { bookCode: 'E6-1', chapter: '5. 비와 비율', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '비율 $0.25$를 백분율로 나타내면?', choices: ['$2.5$%', '$25$%', '$250$%', '$0.25$%', '$50$%'], answer: '2', explanation: '$0.25 \\times 100=25$', domain: 'CALCULATION' },
    { bookCode: 'E6-1', chapter: '6. 비례식', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '비례식에서 내항의 곱이 $36$이면 외항은?', choices: ['곱이 36', '곱이 72', '합이 36', '곱이 18', '합이 12'], answer: '1', explanation: '외항의 곱=내항의 곱=36', domain: 'UNDERSTANDING' },

    // E6-2 소수의 나눗셈 (15개)
    { bookCode: 'E6-2', chapter: '7. 소수의 뜻과 성질', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$0.1$은 $\\frac{1}{10}$과 같다. $0.01$은?', choices: ['$\\frac{1}{10}$', '$\\frac{1}{100}$', '$\\frac{1}{1000}$', '$\\frac{10}{100}$', '$\\frac{1}{50}$'], answer: '2', explanation: '$0.01=\\frac{1}{100}$', domain: 'UNDERSTANDING' },
    { bookCode: 'E6-2', chapter: '7. 소수의 뜻과 성질', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$0.7$을 분수로 나타내면?', choices: ['$\\frac{7}{100}$', '$\\frac{7}{10}$', '$\\frac{70}{10}$', '$\\frac{7}{1000}$', '$\\frac{1}{7}$'], answer: '2', explanation: '$0.7=\\frac{7}{10}$', domain: 'UNDERSTANDING' },
    { bookCode: 'E6-2', chapter: '7. 소수의 뜻과 성질', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '$\\frac{3}{8}$을 소수로 나타내시오.', choices: null, answer: '0.375', explanation: '$3÷8=0.375$', domain: 'CALCULATION' },
    { bookCode: 'E6-2', chapter: '8. 소수의 덧셈과 뺄셈', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$0.3 + 0.5$의 값은?', choices: ['$0.2$', '$0.8$', '$0.35$', '$0.53$', '$1.0$'], answer: '2', explanation: '$0.3+0.5=0.8$', domain: 'CALCULATION' },
    { bookCode: 'E6-2', chapter: '8. 소수의 덧셈과 뺄셈', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$3.5 - 1.8$의 값은?', choices: ['$1.3$', '$1.7$', '$2.3$', '$2.7$', '$5.3$'], answer: '2', explanation: '$3.5-1.8=1.7$', domain: 'CALCULATION' },
    { bookCode: 'E6-2', chapter: '8. 소수의 덧셈과 뺄셈', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '$4.25 + 3.78$을 계산하시오.', choices: null, answer: '8.03', explanation: '$4.25+3.78=8.03$', domain: 'CALCULATION' },
    { bookCode: 'E6-2', chapter: '8. 소수의 덧셈과 뺄셈', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '$5.04 - 2.97$의 값은?', choices: ['$2.03$', '$2.07$', '$2.13$', '$2.97$', '$3.07$'], answer: '2', explanation: '$5.04-2.97=2.07$', domain: 'CALCULATION' },
    { bookCode: 'E6-2', chapter: '9. 소수의 곱셈', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$0.4 \\times 3$의 값은?', choices: ['$0.7$', '$1.2$', '$0.12$', '$4.3$', '$12$'], answer: '2', explanation: '$0.4 \\times 3=1.2$', domain: 'CALCULATION' },
    { bookCode: 'E6-2', chapter: '9. 소수의 곱셈', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '$0.6 \\times 0.7$을 계산하시오.', choices: null, answer: '0.42', explanation: '$0.6 \\times 0.7=0.42$', domain: 'CALCULATION' },
    { bookCode: 'E6-2', chapter: '9. 소수의 곱셈', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$1.5 \\times 0.4$의 값은?', choices: ['$0.6$', '$0.9$', '$1.1$', '$1.9$', '$6.0$'], answer: '1', explanation: '$1.5 \\times 0.4=0.6$', domain: 'CALCULATION' },
    { bookCode: 'E6-2', chapter: '9. 소수의 곱셈', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '$2.5 \\times 0.04$의 값은?', choices: ['$0.01$', '$0.1$', '$1.0$', '$0.001$', '$10$'], answer: '2', explanation: '$2.5 \\times 0.04=0.1$', domain: 'CALCULATION' },
    { bookCode: 'E6-2', chapter: '7. 소수의 뜻과 성질', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '유한소수로 나타낼 수 있는 분수는?', choices: ['$\\frac{1}{3}$', '$\\frac{1}{6}$', '$\\frac{1}{8}$', '$\\frac{1}{7}$', '$\\frac{1}{9}$'], answer: '3', explanation: '분모의 소인수가 2, 5뿐이면 유한소수', domain: 'REASONING' },
    { bookCode: 'E6-2', chapter: '9. 소수의 곱셈', difficulty: 'HIGHEST', type: 'SHORT_ANSWER', content: '$0.125 \\times 8$을 계산하시오.', choices: null, answer: '1', explanation: '$0.125=\\frac{1}{8}$이므로 $\\frac{1}{8} \\times 8=1$', domain: 'REASONING' },
    { bookCode: 'E6-2', chapter: '8. 소수의 덧셈과 뺄셈', difficulty: 'HIGHEST', type: 'MULTIPLE_CHOICE', content: '$0.\\overline{3}$을 분수로 나타내면?', choices: ['$\\frac{1}{3}$', '$\\frac{3}{10}$', '$\\frac{1}{30}$', '$\\frac{3}{100}$', '$\\frac{33}{100}$'], answer: '1', explanation: '$0.333...=\\frac{1}{3}$', domain: 'REASONING' },
    { bookCode: 'E6-2', chapter: '7. 소수의 뜻과 성질', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '소수 $2.35$에서 $3$은 어떤 자릿값?', choices: ['일의 자리', '소수 첫째자리', '소수 둘째자리', '십의 자리', '백의 자리'], answer: '2', explanation: '소수점 바로 뒤 = 소수 첫째자리', domain: 'UNDERSTANDING' },

    // M1-1 정수와 유리수 (15개)
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$-3$의 절댓값은?', choices: ['$-3$', '$3$', '$0$', '$-1$', '$1$'], answer: '2', explanation: '절댓값=원점까지 거리', domain: 'UNDERSTANDING' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '정수가 아닌 것은?', choices: ['$-5$', '$0$', '$\\frac{1}{2}$', '$+3$', '$-1$'], answer: '3', explanation: '$\\frac{1}{2}$은 정수가 아닌 유리수', domain: 'UNDERSTANDING' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$(+5) + (-3)$의 값은?', choices: ['$+8$', '$+2$', '$-2$', '$-8$', '$0$'], answer: '2', explanation: '다른 부호: $5-3=2$, 양수', domain: 'CALCULATION' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$(-7) + (-4)$의 값은?', choices: ['$-11$', '$-3$', '$+3$', '$+11$', '$-28$'], answer: '1', explanation: '같은 부호: $-(7+4)=-11$', domain: 'CALCULATION' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '$(+8) - (+13)$을 계산하시오.', choices: null, answer: '-5', explanation: '$(+8)+(-13)=-5$', domain: 'CALCULATION' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$(-3) \\times (+4)$의 값은?', choices: ['$+12$', '$-12$', '$+7$', '$-7$', '$-1$'], answer: '2', explanation: '다른 부호: 음수', domain: 'CALCULATION' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '$(-2)\\times(-3)\\times(-1)$의 값은?', choices: ['$-6$', '$+6$', '$-5$', '$+5$', '$0$'], answer: '1', explanation: '음수 홀수개→음수', domain: 'CALCULATION' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'HIGH', type: 'SHORT_ANSWER', content: '$(-18)÷(+6)$을 계산하시오.', choices: null, answer: '-3', explanation: '다른 부호: $-3$', domain: 'CALCULATION' },
    { bookCode: 'M1-1', chapter: '2. 유리수', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$-3$, $\\frac{2}{3}$, $0$ 중 유리수는?', choices: ['$-3$만', '$\\frac{2}{3}$만', '$-3$과 $\\frac{2}{3}$', '$0$만', '모두'], answer: '5', explanation: '모두 유리수', domain: 'UNDERSTANDING' },
    { bookCode: 'M1-1', chapter: '2. 유리수', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$\\frac{-3}{4}+\\frac{1}{4}$의 값은?', choices: ['$\\frac{-4}{4}$', '$\\frac{-2}{4}$', '$\\frac{-1}{2}$', '$\\frac{-2}{4}$와 $\\frac{-1}{2}$ 모두', '$\\frac{1}{2}$'], answer: '4', explanation: '같은 값', domain: 'CALCULATION' },
    { bookCode: 'M1-1', chapter: '2. 유리수', difficulty: 'HIGH', type: 'SHORT_ANSWER', content: '$\\frac{2}{3}-\\frac{5}{6}$을 계산하시오.', choices: null, answer: '-1/6', explanation: '$\\frac{4}{6}-\\frac{5}{6}=-\\frac{1}{6}$', domain: 'CALCULATION' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'HIGHEST', type: 'MULTIPLE_CHOICE', content: '$|a|+|b|-|a+b|$에서 $a=-3, b=5$이면?', choices: ['$0$', '$2$', '$4$', '$6$', '$8$'], answer: '4', explanation: '$3+5-2=6$', domain: 'REASONING' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'HIGHEST', type: 'SHORT_ANSWER', content: '$(-1)^{10}+(-1)^{11}$을 계산하시오.', choices: null, answer: '0', explanation: '$1+(-1)=0$', domain: 'REASONING' },
    { bookCode: 'M1-1', chapter: '2. 유리수', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$-2$와 $4$ 사이의 거리는?', choices: ['$2$', '$4$', '$6$', '$8$', '$-2$'], answer: '3', explanation: '$|4-(-2)|=6$', domain: 'UNDERSTANDING' },
    { bookCode: 'M1-1', chapter: '1. 정수와 유리수', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '양의 정수는 다른 말로?', choices: ['유리수', '정수', '자연수', '실수', '소수'], answer: '3', explanation: '양의 정수=자연수', domain: 'UNDERSTANDING' },

    // M1-2 일차방정식 (15개)
    { bookCode: 'M1-2', chapter: '3. 일차방정식', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '다음 중 방정식인 것은?', choices: ['$3+5=8$', '$x+3=7$', '$2>1$', '$3 \\times 4$', '$a+b$'], answer: '2', explanation: '미지수 포함 등식', domain: 'UNDERSTANDING' },
    { bookCode: 'M1-2', chapter: '3. 일차방정식', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$x+5=8$의 해는?', choices: ['$x=2$', '$x=3$', '$x=4$', '$x=5$', '$x=13$'], answer: '2', explanation: '$x=8-5=3$', domain: 'CALCULATION' },
    { bookCode: 'M1-2', chapter: '3. 일차방정식', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '$3x-6=9$를 풀어라.', choices: null, answer: '5', explanation: '$3x=15, x=5$', domain: 'CALCULATION' },
    { bookCode: 'M1-2', chapter: '3. 일차방정식', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$2(x+3)=10$의 해는?', choices: ['$x=1$', '$x=2$', '$x=3$', '$x=4$', '$x=5$'], answer: '2', explanation: '$2x+6=10, 2x=4, x=2$', domain: 'CALCULATION' },
    { bookCode: 'M1-2', chapter: '3. 일차방정식', difficulty: 'HIGH', type: 'SHORT_ANSWER', content: '$\\frac{x-1}{3}=2$를 풀어라.', choices: null, answer: '7', explanation: '$x-1=6, x=7$', domain: 'CALCULATION' },
    { bookCode: 'M1-2', chapter: '3. 일차방정식', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '$5x+3=2x+12$의 해는?', choices: ['$x=2$', '$x=3$', '$x=4$', '$x=5$', '$x=6$'], answer: '2', explanation: '$3x=9, x=3$', domain: 'CALCULATION' },
    { bookCode: 'M1-2', chapter: '3. 일차방정식', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '등식의 양변에 같은 수를 더해도 등식이 성립하는 것은?', choices: ['교환법칙', '결합법칙', '등식의 성질', '분배법칙', '이항'], answer: '3', explanation: '등식의 성질', domain: 'UNDERSTANDING' },
    { bookCode: 'M1-2', chapter: '3. 일차방정식', difficulty: 'HIGHEST', type: 'SHORT_ANSWER', content: '연속하는 세 정수의 합이 $33$이다. 가운데 수는?', choices: null, answer: '11', explanation: '$x-1+x+x+1=33, 3x=33, x=11$', domain: 'PROBLEM_SOLVING' },
    { bookCode: 'M1-2', chapter: '3. 일차방정식', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$4x-8=0$의 해는?', choices: ['$x=-2$', '$x=0$', '$x=2$', '$x=4$', '$x=8$'], answer: '3', explanation: '$4x=8, x=2$', domain: 'CALCULATION' },
    { bookCode: 'M1-2', chapter: '3. 일차방정식', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '어떤 수의 $3$배에서 $5$를 뺀 것이 $7$이다. 어떤 수는?', choices: ['$2$', '$3$', '$4$', '$5$', '$6$'], answer: '3', explanation: '$3x-5=7, 3x=12, x=4$', domain: 'PROBLEM_SOLVING' },
    { bookCode: 'M1-2', chapter: '3. 일차방정식', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '$-2x+10=0$을 풀어라.', choices: null, answer: '5', explanation: '$-2x=-10, x=5$', domain: 'CALCULATION' },
    { bookCode: 'M1-2', chapter: '3. 일차방정식', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '이항이란?', choices: ['항을 더하기', '항을 빼기', '부호를 바꿔 이동', '양변을 곱하기', '양변을 나누기'], answer: '3', explanation: '부호를 바꾸어 다른 변으로 이동', domain: 'UNDERSTANDING' },
    { bookCode: 'M1-2', chapter: '3. 일차방정식', difficulty: 'HIGHEST', type: 'MULTIPLE_CHOICE', content: '$|2x-1|=5$의 해의 개수는?', choices: ['$0$개', '$1$개', '$2$개', '$3$개', '무한'], answer: '3', explanation: '$2x-1=5$ 또는 $2x-1=-5$', domain: 'REASONING' },
    { bookCode: 'M1-2', chapter: '3. 일차방정식', difficulty: 'HIGH', type: 'SHORT_ANSWER', content: '$0.3x+0.7=1.3$을 풀어라.', choices: null, answer: '2', explanation: '$0.3x=0.6, x=2$', domain: 'CALCULATION' },
    { bookCode: 'M1-2', chapter: '3. 일차방정식', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$x-4=2x+1$의 해는?', choices: ['$x=-5$', '$x=-3$', '$x=3$', '$x=5$', '$x=-1$'], answer: '1', explanation: '$-x=5, x=-5$', domain: 'CALCULATION' },

    // M2-1 함수 (15개)
    { bookCode: 'M2-1', chapter: '4. 함수', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$y=2x$에서 $x=3$일 때 $y$는?', choices: ['$2$', '$4$', '$5$', '$6$', '$8$'], answer: '4', explanation: '$y=2 \\times 3=6$', domain: 'CALCULATION' },
    { bookCode: 'M2-1', chapter: '4. 함수', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '함수 $y=x+1$에서 $x$의 값이 정해지면 $y$는?', choices: ['무한개', '0개', '하나', '두 개', '알 수 없다'], answer: '3', explanation: '함수의 정의', domain: 'UNDERSTANDING' },
    { bookCode: 'M2-1', chapter: '4. 함수', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '$y=3x-2$에서 $y=7$일 때 $x$는?', choices: null, answer: '3', explanation: '$3x-2=7, 3x=9, x=3$', domain: 'CALCULATION' },
    { bookCode: 'M2-1', chapter: '5. 일차함수', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$y=2x+3$의 기울기는?', choices: ['$1$', '$2$', '$3$', '$5$', '$6$'], answer: '2', explanation: '$y=ax+b$에서 $a=2$', domain: 'UNDERSTANDING' },
    { bookCode: 'M2-1', chapter: '5. 일차함수', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$y=2x+3$의 y절편은?', choices: ['$0$', '$1$', '$2$', '$3$', '$5$'], answer: '4', explanation: '$y=ax+b$에서 $b=3$', domain: 'UNDERSTANDING' },
    { bookCode: 'M2-1', chapter: '5. 일차함수', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '기울기가 $-1$인 일차함수의 그래프는?', choices: ['오른쪽 위로', '오른쪽 아래로', '수평', '수직', '원점 통과'], answer: '2', explanation: '기울기 음수→우하향', domain: 'UNDERSTANDING' },
    { bookCode: 'M2-1', chapter: '5. 일차함수', difficulty: 'HIGH', type: 'SHORT_ANSWER', content: '두 점 $(1,3)$과 $(3,7)$을 지나는 직선의 기울기는?', choices: null, answer: '2', explanation: '$(7-3)/(3-1)=2$', domain: 'CALCULATION' },
    { bookCode: 'M2-1', chapter: '5. 일차함수', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '$y=2x+1$과 $y=2x-3$의 관계는?', choices: ['같은 직선', '평행', '수직', '한 점에서 만남', '일치'], answer: '2', explanation: '기울기 같으면 평행', domain: 'UNDERSTANDING' },
    { bookCode: 'M2-1', chapter: '5. 일차함수', difficulty: 'HIGHEST', type: 'SHORT_ANSWER', content: '$y=ax+1$이 점 $(2,5)$를 지날 때 $a$는?', choices: null, answer: '2', explanation: '$5=2a+1, a=2$', domain: 'PROBLEM_SOLVING' },
    { bookCode: 'M2-1', chapter: '4. 함수', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '다음 중 함수가 아닌 것은?', choices: ['$y=x$', '$y=3$', '$x^2+y^2=1$', '$y=2x+1$', '$y=-x$'], answer: '3', explanation: '원은 x에 대해 y가 두 개', domain: 'UNDERSTANDING' },
    { bookCode: 'M2-1', chapter: '5. 일차함수', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$y=-3x+6$의 x절편은?', choices: ['$-3$', '$-2$', '$2$', '$3$', '$6$'], answer: '3', explanation: '$0=-3x+6, x=2$', domain: 'CALCULATION' },
    { bookCode: 'M2-1', chapter: '5. 일차함수', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '기울기 $\\frac{1}{2}$, y절편 $-1$인 일차함수는?', choices: ['$y=\\frac{1}{2}x-1$', '$y=-\\frac{1}{2}x+1$', '$y=2x-1$', '$y=-x+\\frac{1}{2}$', '$y=\\frac{1}{2}x+1$'], answer: '1', explanation: '$y=ax+b$ 대입', domain: 'CALCULATION' },
    { bookCode: 'M2-1', chapter: '5. 일차함수', difficulty: 'HIGHEST', type: 'MULTIPLE_CHOICE', content: '$y=2x+a$와 $y=-x+b$의 교점이 $(1,3)$일 때 $a+b$는?', choices: ['$3$', '$4$', '$5$', '$6$', '$7$'], answer: '3', explanation: '$a=3-2=1, b=3+1=4, a+b=5$', domain: 'REASONING' },
    { bookCode: 'M2-1', chapter: '4. 함수', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '$f(x)=2x-1$일 때 $f(4)$는?', choices: null, answer: '7', explanation: '$2(4)-1=7$', domain: 'CALCULATION' },
    { bookCode: 'M2-1', chapter: '5. 일차함수', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '일차함수의 그래프 모양은?', choices: ['직선', '포물선', '원', '곡선', '점'], answer: '1', explanation: '일차함수=직선', domain: 'UNDERSTANDING' },

    // H1 고등 수와 식 (15개)
    { bookCode: 'H1-1', chapter: '1. 다항식의 연산', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$(3x+2)+(2x-1)$을 계산하면?', choices: ['$5x+1$', '$5x+3$', '$x+1$', '$x+3$', '$6x+1$'], answer: '1', explanation: '동류항끼리 더함', domain: 'CALCULATION' },
    { bookCode: 'H1-1', chapter: '1. 다항식의 연산', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$(4x^2-3x)-(2x^2+x)$을 계산하면?', choices: ['$2x^2-2x$', '$2x^2-4x$', '$6x^2-2x$', '$2x^2+4x$', '$6x^2-4x$'], answer: '2', explanation: '$(4x^2-2x^2)+(-3x-x)=2x^2-4x$', domain: 'CALCULATION' },
    { bookCode: 'H1-1', chapter: '1. 다항식의 연산', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$(x+3)(x+2)$를 전개하면?', choices: ['$x^2+5x+6$', '$x^2+5x+5$', '$x^2+6x+5$', '$x^2+6x+6$', '$2x^2+5x+6$'], answer: '1', explanation: '분배법칙', domain: 'CALCULATION' },
    { bookCode: 'H1-1', chapter: '1. 다항식의 연산', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '$(x+4)^2$을 전개하시오. (형태: x^2+ax+b)', choices: null, answer: 'x^2+8x+16', explanation: '$(x+4)^2=x^2+8x+16$', domain: 'CALCULATION' },
    { bookCode: 'H1-1', chapter: '1. 다항식의 연산', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '$(x+2)(x-2)$의 결과는?', choices: ['$x^2-4$', '$x^2+4$', '$x^2-2x-4$', '$x^2+2x-4$', '$x^2-2$'], answer: '1', explanation: '합차 공식', domain: 'CALCULATION' },
    { bookCode: 'H1-1', chapter: '2. 인수분해', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$x^2-9$를 인수분해하면?', choices: ['$(x-3)^2$', '$(x+3)^2$', '$(x+3)(x-3)$', '$(x-9)(x+1)$', '인수분해 불가'], answer: '3', explanation: '$a^2-b^2=(a+b)(a-b)$', domain: 'CALCULATION' },
    { bookCode: 'H1-1', chapter: '2. 인수분해', difficulty: 'MEDIUM', type: 'SHORT_ANSWER', content: '$x^2+6x+9$를 인수분해하시오.', choices: null, answer: '(x+3)^2', explanation: '완전제곱식', domain: 'CALCULATION' },
    { bookCode: 'H1-1', chapter: '2. 인수분해', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$x^2+5x+6$을 인수분해하면?', choices: ['$(x+1)(x+6)$', '$(x+2)(x+3)$', '$(x+2)(x+4)$', '$(x+1)(x+5)$', '$(x+3)(x+3)$'], answer: '2', explanation: '합이 5, 곱이 6인 두 수: 2, 3', domain: 'CALCULATION' },
    { bookCode: 'H1-1', chapter: '2. 인수분해', difficulty: 'HIGH', type: 'MULTIPLE_CHOICE', content: '$2x^2+7x+3$을 인수분해하면?', choices: ['$(2x+1)(x+3)$', '$(2x+3)(x+1)$', '$(2x-1)(x-3)$', '$(x+1)(2x+3)$', '$(2x+1)(x+3)$과 $(x+3)(2x+1)$'], answer: '1', explanation: '교차곱 확인', domain: 'CALCULATION' },
    { bookCode: 'H1-1', chapter: '1. 다항식의 연산', difficulty: 'HIGHEST', type: 'SHORT_ANSWER', content: '$(2x-1)(x+3)-(x+2)(x-1)$을 계산하시오.', choices: null, answer: 'x^2+3x-1', explanation: '$(2x^2+5x-3)-(x^2+x-2)=x^2+4x-1$... 재계산: $2x^2+5x-3-x^2-x+2=x^2+4x-1$', domain: 'CALCULATION' },
    { bookCode: 'H1-1', chapter: '2. 인수분해', difficulty: 'HIGHEST', type: 'MULTIPLE_CHOICE', content: '$x^4-1$을 인수분해하면?', choices: ['$(x^2+1)(x+1)(x-1)$', '$(x^2-1)^2$', '$(x+1)^2(x-1)^2$', '$(x^2+1)(x^2-1)$', '$(x^2+1)(x+1)(x-1)$과 같음'], answer: '1', explanation: '$(x^2+1)(x^2-1)=(x^2+1)(x+1)(x-1)$', domain: 'REASONING' },
    { bookCode: 'H1-1', chapter: '1. 다항식의 연산', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '동류항이란?', choices: ['차수가 같은 항', '계수가 같은 항', '문자와 차수가 같은 항', '상수항끼리', '모든 항'], answer: '3', explanation: '문자와 차수가 같은 항', domain: 'UNDERSTANDING' },
    { bookCode: 'H1-1', chapter: '2. 인수분해', difficulty: 'HIGH', type: 'SHORT_ANSWER', content: '$3x^2-12$를 인수분해하시오.', choices: null, answer: '3(x+2)(x-2)', explanation: '$3(x^2-4)=3(x+2)(x-2)$', domain: 'CALCULATION' },
    { bookCode: 'H1-1', chapter: '1. 다항식의 연산', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', content: '$(a+b)(a-b)$를 전개하면?', choices: ['$a^2+b^2$', '$a^2-b^2$', '$a^2-2ab+b^2$', '$a^2+2ab-b^2$', '$2a^2-2b^2$'], answer: '2', explanation: '합차 공식', domain: 'CALCULATION' },
    { bookCode: 'H1-1', chapter: '2. 인수분해', difficulty: 'BASIC', type: 'MULTIPLE_CHOICE', content: '$2x^2+4x$의 공통인수는?', choices: ['$x$', '$2$', '$2x$', '$4x$', '$x^2$'], answer: '3', explanation: '$2x(x+2)$', domain: 'CALCULATION' },
  ];

  // bookCode → conceptIds 매핑 (과목당 개념 3개, 문제 15개 → 5문제씩 분배)
  const bookCodeToConceptBase: Record<string, number> = {
    'E5-1': 0,  'E5-2': 3,  'E6-1': 6,  'E6-2': 9,
    'M1-1': 12, 'M1-2': 15, 'M2-1': 18, 'H1-1': 21,
  };

  const questionIds: string[] = [];
  const bookCodeCounter: Record<string, number> = {};
  for (let i = 0; i < questionSeeds.length; i++) {
    const q = questionSeeds[i];
    const qId = uuid();
    questionIds.push(qId);

    // 같은 bookCode 내에서 몇 번째 문제인지 카운트 → 개념 3개에 라운드로빈 분배
    const withinIdx = bookCodeCounter[q.bookCode] ?? 0;
    bookCodeCounter[q.bookCode] = withinIdx + 1;
    const base = bookCodeToConceptBase[q.bookCode];
    const conceptId = base !== undefined ? conceptIds[base + (withinIdx % 3)] : null;

    await prisma.question.create({
      data: {
        id: qId, bookCode: q.bookCode, chapter: q.chapter, questionNum: i + 1,
        difficulty: q.difficulty, type: q.type, content: q.content, choices: q.choices,
        answer: q.answer, explanation: q.explanation, domain: q.domain, conceptId, updatedAt: now,
      },
    });
  }
  count('Question', questionSeeds.length);

  // ════════════════════════════════════════════════════════
  // 9. Tests (8개)
  // ════════════════════════════════════════════════════════
  console.log('8. Tests 생성...');

  interface TestDef { id: string; title: string; grade: number; type: string; qSlice: [number, number]; teacher: number; tid: string; isLevel?: boolean }
  const testDefs: TestDef[] = [
    { id: uuid(), title: '초5 분수 단원평가', grade: 5, type: 'unit', qSlice: [0, 15], teacher: 0, tid: T1 },
    { id: uuid(), title: '초5 도형 단원평가', grade: 5, type: 'unit', qSlice: [15, 30], teacher: 0, tid: T1 },
    { id: uuid(), title: '초6 비율 중간고사', grade: 6, type: 'midterm', qSlice: [30, 45], teacher: 1, tid: T1 },
    { id: uuid(), title: '중1 정수/유리수 시험', grade: 7, type: 'unit', qSlice: [45, 60], teacher: 2, tid: T1 },
    { id: uuid(), title: '중1 일차방정식 시험', grade: 7, type: 'unit', qSlice: [60, 75], teacher: 2, tid: T1 },
    { id: uuid(), title: '중1 진단 레벨테스트', grade: 7, type: 'level_test', qSlice: [45, 60], teacher: 0, tid: T1, isLevel: true },
    { id: uuid(), title: '강남점 초등 영재 시험', grade: 5, type: 'unit', qSlice: [0, 10], teacher: 3, tid: T2 },
    { id: uuid(), title: '강남점 중등 함수 시험', grade: 8, type: 'unit', qSlice: [75, 90], teacher: 4, tid: T2 },
  ];

  for (const td of testDefs) {
    const qIds = questionIds.slice(td.qSlice[0], td.qSlice[1]);
    await prisma.test.create({
      data: {
        id: td.id, title: td.title, grade: td.grade, testType: td.type,
        questionIds: qIds, questionCount: qIds.length, timeLimitMin: 40,
        createdBy: teacherIds[td.teacher], tenantId: td.tid, updatedAt: now,
      },
    });
    for (let i = 0; i < qIds.length; i++) {
      await prisma.testQuestion.create({
        data: { id: uuid(), testId: td.id, questionId: qIds[i], sortOrder: i + 1 },
      });
    }
  }
  count('Test', testDefs.length);

  // LevelTestConfig
  await prisma.levelTestConfig.create({
    data: {
      id: uuid(), testId: testDefs[5].id,
      questionDomains: [
        { domain: 'CALCULATION', count: 6 },
        { domain: 'UNDERSTANDING', count: 4 },
        { domain: 'PROBLEM_SOLVING', count: 3 },
        { domain: 'REASONING', count: 2 },
      ],
    },
  });
  count('LevelTestConfig', 1);

  // ════════════════════════════════════════════════════════
  // 10. TestAssignment + TestAttempt + AnswerLog
  // ════════════════════════════════════════════════════════
  console.log('9. TestAssignment + Attempt + AnswerLog 생성...');

  const assignConfigs = [
    { testIdx: 0, students: t1StudentIds.slice(0, 5) },   // 분수: A반
    { testIdx: 1, students: t1StudentIds.slice(0, 5) },   // 도형: A반
    { testIdx: 2, students: t1StudentIds.slice(5, 10) },  // 비율: B반
    { testIdx: 3, students: t1StudentIds.slice(10, 14) },  // 정수: 중등반
    { testIdx: 4, students: t1StudentIds.slice(10, 14) },  // 일차방정식: 중등반
    { testIdx: 5, students: t1StudentIds.slice(10, 15) },  // 레벨테스트: 중등+고등
    { testIdx: 6, students: t2StudentIds.slice(0, 4) },   // 강남 초등
    { testIdx: 7, students: t2StudentIds.slice(4, 8) },   // 강남 중등
  ];

  const statusCycle: ('COMPLETED' | 'COMPLETED' | 'COMPLETED' | 'ASSIGNED' | 'IN_PROGRESS')[] = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'ASSIGNED', 'IN_PROGRESS'];

  for (const ac of assignConfigs) {
    const td = testDefs[ac.testIdx];
    const qIds = questionIds.slice(td.qSlice[0], td.qSlice[1]);

    for (let si = 0; si < ac.students.length; si++) {
      const sId = ac.students[si];
      const status = statusCycle[si % statusCycle.length];
      const assignmentId = uuid();
      const bestAttemptId = status === 'COMPLETED' ? uuid() : null;

      let bestScore: number | null = null;
      if (status === 'COMPLETED') {
        const correctCount = Math.floor(qIds.length * (0.5 + Math.random() * 0.45));
        bestScore = Math.round((correctCount / qIds.length) * 100);
      }

      await prisma.testAssignment.create({
        data: {
          id: assignmentId, testId: td.id, studentId: sId,
          status, dueDate: day(7), bestScore, bestAttemptId, updatedAt: now,
        },
      });
      count('TestAssignment');

      if (status === 'COMPLETED' && bestAttemptId) {
        const correctCount = Math.round((bestScore! / 100) * qIds.length);
        await prisma.testAttempt.create({
          data: {
            id: bestAttemptId, testId: td.id, studentId: sId,
            assignmentId, score: bestScore!, maxScore: 100,
            correctCount, totalCount: qIds.length,
            xpEarned: Math.floor(bestScore! / 10), comboMax: rand(0, 5),
            completedAt: day(-rand(1, 7)), startedAt: day(-8),
          },
        });
        count('TestAttempt');

        for (let qi = 0; qi < qIds.length; qi++) {
          const isCorrect = qi < correctCount;
          const correctAns = questionSeeds[td.qSlice[0] + qi]?.answer || '1';
          await prisma.answerLog.create({
            data: {
              id: uuid(), attemptId: bestAttemptId, questionId: qIds[qi],
              selectedAnswer: isCorrect ? correctAns : String(rand(1, 5)),
              isCorrect, timeSpentSeconds: rand(15, 180),
              comboCount: isCorrect ? qi : 0, pointsEarned: isCorrect ? 10 : 0,
            },
          });
          count('AnswerLog');
        }
      }
    }
  }

  // ════════════════════════════════════════════════════════
  // 11. Homework Plans (3종)
  // ════════════════════════════════════════════════════════
  console.log('10. ArithmeticHomeworkPlan 생성...');
  const arithPlans = [
    { id: uuid(), title: '덧셈 연습', categories: ['add_1digit', 'add_2digit'], level: 'easy', students: t1StudentIds.slice(0, 5), tid: T1, teacher: 0 },
    { id: uuid(), title: '곱셈 연습', categories: ['mul_2x1digit'], level: 'easy', students: t1StudentIds.slice(5, 10), tid: T1, teacher: 1 },
  ];
  for (const ap of arithPlans) {
    await prisma.arithmeticHomeworkPlan.create({
      data: {
        id: ap.id, title: ap.title, createdBy: teacherIds[ap.teacher],
        categories: ap.categories, level: ap.level,
        dailyCount: 10, totalDays: 5, startDate: dateOnly(-10),
        dailyProblems: [], isActive: true, tenantId: ap.tid, updatedAt: now,
      },
    });
    for (const sId of ap.students) {
      await prisma.arithmeticHomeworkEnrollment.create({
        data: { id: uuid(), planId: ap.id, studentId: sId },
      });
    }
  }
  count('ArithmeticHomeworkPlan', 2);
  count('ArithmeticHomeworkEnrollment', 10);

  // ArithmeticAttempt + Answer
  for (let i = 0; i < 5; i++) {
    const attemptId = uuid();
    const correct = rand(6, 10);
    await prisma.arithmeticAttempt.create({
      data: {
        id: attemptId, studentId: t1StudentIds[i], category: 'add_1digit',
        level: 'easy', problemCount: 10, correctCount: correct,
        score: correct * 10, xpEarned: correct * 2, comboMax: rand(3, 8),
        totalTimeSeconds: rand(60, 300), homeworkPlanId: arithPlans[0].id,
        homeworkDayIndex: 0, completedAt: day(-8),
      },
    });
    for (let j = 0; j < 3; j++) {
      const isC = j < 2;
      await prisma.arithmeticAnswer.create({
        data: {
          id: uuid(), attemptId, problemIndex: j,
          content: `$${3+j} + ${4+j}$`, choices: { options: [`${7+2*j}`, `${8+2*j}`, `${6+2*j}`] },
          selectedAnswer: isC ? `${7+2*j}` : `${8+2*j}`, correctAnswer: `${7+2*j}`,
          isCorrect: isC, timeSpentSeconds: rand(3, 20),
        },
      });
    }
    count('ArithmeticAttempt');
    count('ArithmeticAnswer', 3);
  }

  console.log('11. ConceptHomeworkPlan 생성...');
  const chPlans = [
    { id: uuid(), title: '분수 개념 복습', concepts: [conceptIds[0], conceptIds[1], conceptIds[2]], students: t1StudentIds.slice(0, 5), tid: T1, teacher: 0 },
    { id: uuid(), title: '도형 넓이 암기', concepts: [conceptIds[3], conceptIds[4], conceptIds[5]], students: t1StudentIds.slice(0, 5), tid: T1, teacher: 1 },
  ];
  for (const cp of chPlans) {
    await prisma.conceptHomeworkPlan.create({
      data: {
        id: cp.id, title: cp.title, createdBy: teacherIds[cp.teacher],
        startDate: dateOnly(-5), totalDays: 3,
        dailyConcepts: cp.concepts.map(c => [c]),
        requiredStage: 'BLANK_FULL', isActive: true, tenantId: cp.tid, updatedAt: now,
      },
    });
    for (const sId of cp.students) {
      await prisma.conceptHomeworkEnrollment.create({
        data: { id: uuid(), planId: cp.id, studentId: sId },
      });
    }
  }
  count('ConceptHomeworkPlan', 2);
  count('ConceptHomeworkEnrollment', 10);

  console.log('12. QuestionHomeworkPlan 생성...');
  const qhwPlans = [
    { id: uuid(), title: '분수 문제 풀이', qs: [questionIds.slice(0, 3), questionIds.slice(3, 6)], students: t1StudentIds.slice(0, 5), tid: T1, teacher: 0 },
    { id: uuid(), title: '정수 문제 풀이', qs: [questionIds.slice(45, 48), questionIds.slice(48, 51)], students: t1StudentIds.slice(10, 14), tid: T1, teacher: 2 },
  ];
  for (const qp of qhwPlans) {
    await prisma.questionHomeworkPlan.create({
      data: {
        id: qp.id, title: qp.title, createdBy: teacherIds[qp.teacher],
        startDate: dateOnly(-3), totalDays: 2, dailyQuestions: qp.qs,
        passingScore: 80, isActive: true, tenantId: qp.tid, updatedAt: now,
      },
    });
    for (let d = 0; d < qp.qs.length; d++) {
      for (let j = 0; j < qp.qs[d].length; j++) {
        await prisma.homeworkQuestion.create({
          data: { id: uuid(), planId: qp.id, questionId: qp.qs[d][j], dayIndex: d, sortOrder: j },
        });
      }
    }
    for (const sId of qp.students) {
      await prisma.questionHomeworkEnrollment.create({
        data: { id: uuid(), planId: qp.id, studentId: sId },
      });
    }
    // 일부 완료 데이터
    for (let i = 0; i < Math.min(3, qp.students.length); i++) {
      await prisma.questionHomeworkAttempt.create({
        data: {
          id: uuid(), planId: qp.id, studentId: qp.students[i], dayIndex: 0,
          answers: qp.qs[0].map((qId, idx) => ({ questionId: qId, selected: String(rand(1, 5)), correct: idx < 2 })),
          correctCount: 2, totalCount: 3, score: 67, completedAt: day(-1),
        },
      });
    }
  }
  count('QuestionHomeworkPlan', 2);

  // ════════════════════════════════════════════════════════
  // 12. LearningProgress + BlankAttempt
  // ════════════════════════════════════════════════════════
  console.log('13. LearningProgress + BlankAttempt 생성...');

  const stages: ('READING' | 'BLANK_EASY' | 'BLANK_HARD' | 'BLANK_FULL')[] = ['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_FULL'];

  // T1 학생들의 학습 진행 상황
  const progressConfigs = [
    // 초등 A반 (개념 0~5)
    { studentIdx: 0, conceptIdx: 0, completedStages: 4 },
    { studentIdx: 0, conceptIdx: 1, completedStages: 3 },
    { studentIdx: 0, conceptIdx: 2, completedStages: 2 },
    { studentIdx: 0, conceptIdx: 3, completedStages: 4 },
    { studentIdx: 1, conceptIdx: 0, completedStages: 4 },
    { studentIdx: 1, conceptIdx: 1, completedStages: 1 },
    { studentIdx: 2, conceptIdx: 0, completedStages: 4 },
    { studentIdx: 2, conceptIdx: 3, completedStages: 2 },
    { studentIdx: 3, conceptIdx: 0, completedStages: 1 },
    { studentIdx: 4, conceptIdx: 0, completedStages: 3 },
    { studentIdx: 4, conceptIdx: 1, completedStages: 2 },
    // 초등 B반 (개념 6~11)
    { studentIdx: 5, conceptIdx: 6, completedStages: 4 },
    { studentIdx: 5, conceptIdx: 7, completedStages: 3 },
    { studentIdx: 6, conceptIdx: 6, completedStages: 2 },
    { studentIdx: 7, conceptIdx: 6, completedStages: 1 },
    { studentIdx: 8, conceptIdx: 9, completedStages: 4 },
    { studentIdx: 9, conceptIdx: 9, completedStages: 2 },
    // 중등반 (개념 12~17)
    { studentIdx: 10, conceptIdx: 12, completedStages: 4 },
    { studentIdx: 10, conceptIdx: 13, completedStages: 3 },
    { studentIdx: 10, conceptIdx: 15, completedStages: 2 },
    { studentIdx: 11, conceptIdx: 12, completedStages: 2 },
    { studentIdx: 12, conceptIdx: 12, completedStages: 1 },
    // 고등반 (개념 21~23)
    { studentIdx: 14, conceptIdx: 21, completedStages: 4 },
    { studentIdx: 14, conceptIdx: 22, completedStages: 3 },
    // T2 학생들 (개념 0~5)
    { studentIdx: 15, conceptIdx: 0, completedStages: 4 },
    { studentIdx: 15, conceptIdx: 1, completedStages: 4 },
    { studentIdx: 16, conceptIdx: 0, completedStages: 3 },
    { studentIdx: 17, conceptIdx: 0, completedStages: 2 },
    // T2 중등 (개념 18~20)
    { studentIdx: 19, conceptIdx: 18, completedStages: 4 },
    { studentIdx: 20, conceptIdx: 18, completedStages: 2 },
    // T3 학생들
    { studentIdx: 23, conceptIdx: 6, completedStages: 3 },
    { studentIdx: 24, conceptIdx: 6, completedStages: 1 },
  ];

  for (const pc of progressConfigs) {
    for (let s = 0; s < pc.completedStages; s++) {
      const completed = s < pc.completedStages - 1 || pc.completedStages === 4;
      const score = completed ? rand(70, 100) : null;
      await prisma.learningProgress.create({
        data: {
          id: uuid(), userId: allStudentIds[pc.studentIdx], conceptId: conceptIds[pc.conceptIdx],
          stage: stages[s], completed, attempts: completed ? rand(1, 3) : 1, score,
          startedAt: day(-20 + s * 2), completedAt: completed ? day(-20 + s * 2 + 1) : null,
          updatedAt: now,
        },
      });
      count('LearningProgress');

      // BlankAttempt (BLANK_EASY 이상)
      if (s >= 1 && completed) {
        const baId = uuid();
        const allCorrect = (score ?? 0) >= 90;
        await prisma.blankAttempt.create({
          data: {
            id: baId, studentId: allStudentIds[pc.studentIdx], conceptId: conceptIds[pc.conceptIdx],
            stage: stages[s], score: score ?? 0, allCorrect, hintCount: rand(0, 3), revealCount: rand(0, 2),
            createdAt: day(-20 + s * 2 + 1),
          },
        });
        // BlankAnswerLog (2개)
        for (let b = 0; b < 2; b++) {
          await prisma.blankAnswerLog.create({
            data: {
              id: uuid(), attemptId: baId, blankPosition: b + 1,
              submittedAnswer: b === 0 ? '정답' : (allCorrect ? '정답' : '오답'),
              correctAnswer: '정답', isCorrect: b === 0 || allCorrect,
            },
          });
        }
        count('BlankAttempt');
        count('BlankAnswerLog', 2);
      }
    }
  }

  // ════════════════════════════════════════════════════════
  // 13. LearningCourse
  // ════════════════════════════════════════════════════════
  console.log('14. LearningCourse 생성...');

  const courses = [
    { id: uuid(), title: '초5 분수+도형 마스터', desc: '분수와 도형 개념 순서대로 학습', teacher: 0, tid: T1, concepts: conceptIds.slice(0, 6) },
    { id: uuid(), title: '중1 정수/유리수 기초', desc: '정수와 유리수의 기초 개념', teacher: 2, tid: T1, concepts: [conceptIds[12], conceptIds[13], conceptIds[14], conceptIds[15], conceptIds[16]] },
    { id: uuid(), title: '강남 초등 속성 코스', desc: '분수와 비율 핵심 코스', teacher: 3, tid: T2, concepts: [conceptIds[0], conceptIds[1], conceptIds[6], conceptIds[7]] },
  ];

  for (const c of courses) {
    await prisma.learningCourse.create({
      data: { id: c.id, title: c.title, description: c.desc, createdBy: teacherIds[c.teacher], isActive: true, tenantId: c.tid, updatedAt: now },
    });
    for (let i = 0; i < c.concepts.length; i++) {
      await prisma.learningCourseConcept.create({
        data: { id: uuid(), courseId: c.id, conceptId: c.concepts[i], sortOrder: i },
      });
    }
  }
  count('LearningCourse', 3);

  // 수강 등록
  const courseEnrolls: { courseId: string; studentIdx: number; status: 'ACTIVE' | 'COMPLETED' | 'LOCKED' }[] = [
    { courseId: courses[0].id, studentIdx: 0, status: 'COMPLETED' },
    { courseId: courses[0].id, studentIdx: 1, status: 'ACTIVE' },
    { courseId: courses[0].id, studentIdx: 2, status: 'ACTIVE' },
    { courseId: courses[0].id, studentIdx: 3, status: 'LOCKED' },
    { courseId: courses[1].id, studentIdx: 10, status: 'COMPLETED' },
    { courseId: courses[1].id, studentIdx: 11, status: 'ACTIVE' },
    { courseId: courses[1].id, studentIdx: 12, status: 'ACTIVE' },
    { courseId: courses[2].id, studentIdx: 15, status: 'ACTIVE' },
    { courseId: courses[2].id, studentIdx: 16, status: 'LOCKED' },
  ];
  for (const ce of courseEnrolls) {
    await prisma.learningCourseEnrollment.create({
      data: {
        id: uuid(), courseId: ce.courseId, studentId: allStudentIds[ce.studentIdx],
        status: ce.status, sortOrder: ce.studentIdx,
        startedAt: ce.status !== 'LOCKED' ? day(-15) : null,
        completedAt: ce.status === 'COMPLETED' ? day(-2) : null, updatedAt: now,
      },
    });
    count('LearningCourseEnrollment');
  }

  // ════════════════════════════════════════════════════════
  // 14. QuizSession
  // ════════════════════════════════════════════════════════
  console.log('15. QuizSession 생성...');

  const quizDefs = [
    { id: uuid(), title: '분수 퀴즈 대결', host: 0, qs: questionIds.slice(0, 5), status: 'COMPLETED' as const, code: 'AB1234', tid: T1 },
    { id: uuid(), title: '정수 스피드 퀴즈', host: 2, qs: questionIds.slice(45, 50), status: 'WAITING' as const, code: 'CD5678', tid: T1 },
    { id: uuid(), title: '비율 퀴즈', host: 1, qs: questionIds.slice(30, 35), status: 'COMPLETED' as const, code: 'EF9012', tid: T1 },
    { id: uuid(), title: '강남 수학 올림피아드', host: 3, qs: questionIds.slice(0, 8), status: 'WAITING' as const, code: 'GH3456', tid: T2 },
  ];

  for (const qd of quizDefs) {
    await prisma.quizSession.create({
      data: {
        id: qd.id, title: qd.title, hostId: teacherIds[qd.host],
        questionIds: qd.qs, status: qd.status, currentQ: qd.status === 'COMPLETED' ? qd.qs.length : 0,
        joinCode: qd.code, startedAt: qd.status === 'COMPLETED' ? day(-3) : null,
        endedAt: qd.status === 'COMPLETED' ? day(-3) : null, tenantId: qd.tid,
      },
    });
    for (let i = 0; i < qd.qs.length; i++) {
      await prisma.quizSessionQuestion.create({
        data: { id: uuid(), sessionId: qd.id, questionId: qd.qs[i], sortOrder: i },
      });
    }
  }
  count('QuizSession', quizDefs.length);

  // 완료된 퀴즈에 참가자 + 답변
  for (const qd of quizDefs.filter(q => q.status === 'COMPLETED')) {
    const participants = qd.tid === T1 ? t1StudentIds.slice(0, 5) : t2StudentIds.slice(0, 4);
    for (let pi = 0; pi < participants.length; pi++) {
      const participantId = uuid();
      const correct = rand(1, qd.qs.length);
      const sIdx = qd.tid === T1 ? pi : 15 + pi;
      await prisma.quizParticipant.create({
        data: {
          id: participantId, sessionId: qd.id, studentId: participants[pi],
          studentName: studentMeta[sIdx].name, score: correct * 100, correctCount: correct, rank: pi + 1,
        },
      });
      count('QuizParticipant');
      for (let qi = 0; qi < qd.qs.length; qi++) {
        const isCorrect = qi < correct;
        await prisma.quizAnswerLog.create({
          data: {
            id: uuid(), participantId, questionId: qd.qs[qi], questionIndex: qi,
            selectedAnswer: isCorrect ? '1' : '5', correctAnswer: '1', isCorrect,
            timeSpentSeconds: rand(3, 30), pointsEarned: isCorrect ? 100 : 0,
          },
        });
        count('QuizAnswerLog');
      }
    }
  }

  // ════════════════════════════════════════════════════════
  // 15. Badges (35개, seed-badges.ts 통합)
  // ════════════════════════════════════════════════════════
  console.log('16. Badge + UserBadge 생성...');

  const badgeData = [
    { key: 'streak_3', label: '작은 불씨', description: '연속 학습 3일 달성', icon: '/badges/streak_3.png', color: '#f59e0b', condition: { type: 'streak', value: 3 }, sortOrder: 10 },
    { key: 'streak_7', label: '타오르는 열정', description: '연속 학습 7일 달성', icon: '/badges/streak_7.png', color: '#ef4444', condition: { type: 'streak', value: 7 }, sortOrder: 11 },
    { key: 'streak_14', label: '꺾이지 않는 마음', description: '연속 학습 14일 달성', icon: '/badges/streak_14.png', color: '#b91c1c', condition: { type: 'streak', value: 14 }, sortOrder: 12 },
    { key: 'streak_30', label: '습관의 완성', description: '연속 학습 30일 달성', icon: '/badges/streak_30.png', color: '#8b5cf6', condition: { type: 'streak', value: 30 }, sortOrder: 13 },
    { key: 'streak_100', label: '백일의 기적', description: '연속 학습 100일 달성', icon: '/badges/streak_100.png', color: '#c026d3', condition: { type: 'streak', value: 100 }, sortOrder: 14 },
    { key: 'streak_365', label: '1년의 마스터', description: '연속 학습 365일 달성', icon: '/badges/streak_365.png', color: '#db2777', condition: { type: 'streak', value: 365 }, sortOrder: 15 },
    { key: 'earlybird_1', label: '얼리버드', description: '오전 6시~8시 사이 학습 완료', icon: '/badges/earlybird_1.png', color: '#fb923c', condition: { type: 'earlybird', value: 1 }, sortOrder: 16 },
    { key: 'weekend_1', label: '주말의 시작', description: '주말 1시간+ 학습 1회', icon: '/badges/weekend_1.png', color: '#2dd4bf', condition: { type: 'weekend', value: 1 }, sortOrder: 17 },
    { key: 'weekend_5', label: '주말 지킴이', description: '주말 1시간+ 학습 5회', icon: '/badges/weekend_5.png', color: '#0d9488', condition: { type: 'weekend', value: 5 }, sortOrder: 18 },
    { key: 'weekend_20', label: '주말의 전사', description: '주말 1시간+ 학습 20회', icon: '/badges/weekend_20.png', color: '#115e59', condition: { type: 'weekend', value: 20 }, sortOrder: 19 },
    { key: 'blank_1', label: '첫 발걸음', description: '개념 백지쓰기 1회 통과', icon: '/badges/blank_1.png', color: '#3b82f6', condition: { type: 'blank', value: 1 }, sortOrder: 20 },
    { key: 'blank_10', label: '지식의 탐구자', description: '개념 백지쓰기 10회 통과', icon: '/badges/blank_10.png', color: '#2563eb', condition: { type: 'blank', value: 10 }, sortOrder: 21 },
    { key: 'blank_50', label: '완벽주의자', description: '개념 백지쓰기 50회 통과', icon: '/badges/blank_50.png', color: '#1d4ed8', condition: { type: 'blank', value: 50 }, sortOrder: 22 },
    { key: 'blank_perfect', label: '결백주의', description: '오답 없이 백지쓰기 통과', icon: '/badges/blank_perfect.png', color: '#d946ef', condition: { type: 'blank_perfect', value: 1 }, sortOrder: 23 },
    { key: 'blank_100', label: '암기왕', description: '개념 백지쓰기 100회 통과', icon: '/badges/blank_100.png', color: '#1e3a8a', condition: { type: 'blank', value: 100 }, sortOrder: 24 },
    { key: 'blank_500', label: '인간 백과사전', description: '개념 백지쓰기 500회 통과', icon: '/badges/blank_500.png', color: '#312e81', condition: { type: 'blank', value: 500 }, sortOrder: 25 },
    { key: 'arithmetic_100', label: '계산의 시작', description: '연산 문제 100개 정답', icon: '/badges/arithmetic_100.png', color: '#10b981', condition: { type: 'arithmetic', value: 100 }, sortOrder: 30 },
    { key: 'arithmetic_1000', label: '인간 계산기', description: '연산 문제 1,000개 정답', icon: '/badges/arithmetic_1000.png', color: '#059669', condition: { type: 'arithmetic', value: 1000 }, sortOrder: 31 },
    { key: 'timeattack_1', label: '빛보다 빠른', description: '타임어택 최초 참여', icon: '/badges/timeattack_1.png', color: '#0ea5e9', condition: { type: 'timeattack', value: 1 }, sortOrder: 32 },
    { key: 'arithmetic_5000', label: '연산의 신', description: '연산 문제 5,000개 정답', icon: '/badges/arithmetic_5000.png', color: '#047857', condition: { type: 'arithmetic', value: 5000 }, sortOrder: 33 },
    { key: 'arithmetic_10000', label: '걸어다니는 슈퍼컴', description: '연산 문제 10,000개 정답', icon: '/badges/arithmetic_10000.png', color: '#064e3b', condition: { type: 'arithmetic', value: 10000 }, sortOrder: 34 },
    { key: 'timeattack_10', label: '스피드 러너', description: '타임어택 10개 돌파', icon: '/badges/timeattack_10.png', color: '#0284c7', condition: { type: 'timeattack', value: 10 }, sortOrder: 35 },
    { key: 'timeattack_30', label: '시간의 지배자', description: '타임어택 30개 돌파', icon: '/badges/timeattack_30.png', color: '#0369a1', condition: { type: 'timeattack', value: 30 }, sortOrder: 36 },
    { key: 'test_100_1', label: '백점 만점', description: '첫 100점 달성', icon: '/badges/test_100_1.png', color: '#ec4899', condition: { type: 'test_100', value: 1 }, sortOrder: 40 },
    { key: 'test_100_5', label: '퍼펙트 스코어', description: '100점 5회 달성', icon: '/badges/test_100_5.png', color: '#be185d', condition: { type: 'test_100', value: 5 }, sortOrder: 41 },
    { key: 'level_5', label: '폭풍 성장', description: '레벨 5 달성', icon: '/badges/level_5.png', color: '#14b8a6', condition: { type: 'level', value: 5 }, sortOrder: 42 },
    { key: 'level_10', label: '마스터의 길', description: '레벨 10 달성', icon: '/badges/level_10.png', color: '#0f766e', condition: { type: 'level', value: 10 }, sortOrder: 43 },
    { key: 'test_100_10', label: '만점 폭격기', description: '100점 10회 달성', icon: '/badges/test_100_10.png', color: '#9d174d', condition: { type: 'test_100', value: 10 }, sortOrder: 44 },
    { key: 'level_20', label: '베테랑', description: '레벨 20 달성', icon: '/badges/level_20.png', color: '#065f46', condition: { type: 'level', value: 20 }, sortOrder: 45 },
    { key: 'level_50', label: '그랜드 마스터', description: '레벨 50 달성', icon: '/badges/level_50.png', color: '#022c22', condition: { type: 'level', value: 50 }, sortOrder: 46 },
    { key: 'recovery_30', label: '불굴의 의지', description: '이전 시험 대비 30점+ 향상', icon: '/badges/recovery_30.png', color: '#ca8a04', condition: { type: 'recovery', value: 30 }, sortOrder: 47 },
    { key: 'revenge_100', label: '극복의 아이콘', description: '오답노트 복습 100문제', icon: '/badges/revenge_100.png', color: '#eab308', condition: { type: 'revenge', value: 100 }, sortOrder: 48 },
    { key: 'hidden_owl', label: '올빼미족', description: '새벽(00~04시) 학습', icon: '/badges/hidden_owl.png', color: '#4f46e5', condition: { type: 'hidden_owl', value: 1 }, sortOrder: 90 },
    { key: 'hidden_error', label: '버그 헌터', description: '에러 화면 발견', icon: '/badges/hidden_error.png', color: '#6b7280', condition: { type: 'hidden_error', value: 1 }, sortOrder: 91 },
    { key: 'hidden_marathon', label: '마라토너', description: '하루 5시간+ 로그인', icon: '/badges/hidden_marathon.png', color: '#4338ca', condition: { type: 'hidden_marathon', value: 1 }, sortOrder: 92 },
  ];

  const badgeIds: Record<string, string> = {};
  for (const b of badgeData) {
    const bId = uuid();
    badgeIds[b.key] = bId;
    await prisma.badge.create({ data: { id: bId, ...b } });
  }
  count('Badge', badgeData.length);

  // 다양한 학생에게 뱃지 수여
  const userBadges = [
    { sIdx: 0, badges: ['streak_7', 'streak_14', 'blank_1', 'blank_10', 'arithmetic_100', 'level_5', 'weekend_1'] },
    { sIdx: 2, badges: ['streak_30', 'blank_1', 'blank_10', 'blank_50', 'arithmetic_100', 'arithmetic_1000', 'test_100_1', 'level_5', 'level_10'] },
    { sIdx: 4, badges: ['streak_3', 'blank_1', 'arithmetic_100', 'timeattack_1', 'earlybird_1'] },
    { sIdx: 5, badges: ['streak_7', 'blank_1', 'blank_10', 'level_5'] },
    { sIdx: 8, badges: ['streak_14', 'blank_1', 'hidden_owl', 'timeattack_1', 'timeattack_10'] },
    { sIdx: 10, badges: ['streak_30', 'blank_1', 'blank_10', 'level_5', 'test_100_1', 'recovery_30'] },
    { sIdx: 14, badges: ['streak_7', 'blank_1', 'arithmetic_100', 'level_5'] },
    // T2
    { sIdx: 15, badges: ['streak_14', 'blank_1', 'blank_10', 'arithmetic_100', 'level_5'] },
    { sIdx: 19, badges: ['streak_7', 'blank_1', 'timeattack_1'] },
    // T3
    { sIdx: 23, badges: ['streak_3', 'blank_1', 'weekend_1'] },
  ];

  for (const ub of userBadges) {
    for (let i = 0; i < ub.badges.length; i++) {
      await prisma.userBadge.create({
        data: { id: uuid(), userId: allStudentIds[ub.sIdx], badgeId: badgeIds[ub.badges[i]], earnedAt: day(-30 + i * 3) },
      });
      count('UserBadge');
    }
  }

  // ════════════════════════════════════════════════════════
  // 16. PointTransaction
  // ════════════════════════════════════════════════════════
  console.log('17. PointTransaction 생성...');
  const ptReasons = ['개념학습 완료', '빈칸 쉬움 통과', '빈칸 어려움 통과', '통문장 암기 완료', '시험 완료', '연산 연습', '일일 미션 완료', '퀴즈 참여'];
  const ptAmounts = [5, 10, 15, 20, 30, 10, 25, 50];

  for (let i = 0; i < allStudentIds.length; i++) {
    const txCount = rand(3, 10);
    for (let j = 0; j < txCount; j++) {
      const rIdx = rand(0, ptReasons.length - 1);
      await prisma.pointTransaction.create({
        data: {
          id: uuid(), userId: allStudentIds[i], amount: ptAmounts[rIdx],
          type: 'EARN', reason: ptReasons[rIdx], createdAt: day(-rand(0, 30)),
        },
      });
      count('PointTransaction');
    }
  }

  // ════════════════════════════════════════════════════════
  // 17. DailyMission + DailyQuestion
  // ════════════════════════════════════════════════════════
  console.log('18. DailyMission + DailyQuestion 생성...');

  for (let i = 0; i < 10; i++) {
    const allComplete = i < 3;
    await prisma.dailyMission.create({
      data: {
        id: uuid(), studentId: allStudentIds[i], date: dateOnly(0),
        missions: [
          { type: 'arithmetic', label: '연산 10문제 풀기', count: 10, completed: allComplete || i < 5 },
          { type: 'concept', label: '개념 1개 학습하기', count: 1, completed: allComplete },
          { type: 'blank', label: '빈칸 연습 1회', count: 1, completed: allComplete },
        ],
        allComplete, xpAwarded: allComplete ? 25 : 0, updatedAt: now,
      },
    });
    count('DailyMission');
  }

  // DailyQuestion (오늘 + 어제)
  for (let d = 0; d < 2; d++) {
    const dqId = uuid();
    await prisma.dailyQuestion.create({
      data: { id: dqId, questionId: questionIds[4 + d * 15], date: dateOnly(-d), createdBy: teacherIds[0], tenantId: T1 },
    });
    count('DailyQuestion');
    for (let i = 0; i < 5; i++) {
      await prisma.dailyQuestionAttempt.create({
        data: {
          id: uuid(), dailyQuestionId: dqId, studentId: t1StudentIds[i],
          selectedAnswer: i < 3 ? '3' : '1', isCorrect: i < 3,
        },
      });
      count('DailyQuestionAttempt');
    }
  }

  // ════════════════════════════════════════════════════════
  // 18. TimeAttackRecord
  // ════════════════════════════════════════════════════════
  console.log('19. TimeAttackRecord 생성...');
  const taCategories = ['add_1digit', 'add_2digit', 'mul_2x1digit', 'sub_1digit', 'add_3digit'];
  for (let i = 0; i < 15; i++) {
    const recordId = uuid();
    await prisma.timeAttackRecord.create({
      data: {
        id: recordId, studentId: allStudentIds[i % allStudentIds.length],
        category: taCategories[i % taCategories.length],
        level: i < 8 ? 'easy' : 'normal',
        correctCount: rand(10, 25), totalTime: 30, createdAt: day(-rand(0, 14)),
      },
    });
    // 일부에 TimeAttackAnswer 추가
    if (i < 5) {
      for (let j = 0; j < 3; j++) {
        await prisma.timeAttackAnswer.create({
          data: {
            id: uuid(), recordId, problemIndex: j,
            content: `$${rand(1, 9)} + ${rand(1, 9)}$`, choices: [String(rand(1, 20)), String(rand(1, 20)), String(rand(1, 20))],
            selectedAnswer: String(rand(1, 20)), correctAnswer: String(rand(1, 20)),
            isCorrect: j < 2, timeSpentMs: rand(500, 5000),
          },
        });
        count('TimeAttackAnswer');
      }
    }
    count('TimeAttackRecord');
  }

  // ════════════════════════════════════════════════════════
  // 19. RevengeAttempt
  // ════════════════════════════════════════════════════════
  console.log('20. RevengeAttempt 생성...');
  for (let i = 0; i < 8; i++) {
    const raId = uuid();
    const correct = rand(3, 8);
    const total = 10;
    await prisma.revengeAttempt.create({
      data: {
        id: raId, studentId: allStudentIds[i],
        chapter: pick(['1. 분수의 덧셈과 뺄셈', '3. 도형의 넓이', '1. 정수와 유리수']),
        difficulty: pick(['BASIC', 'MEDIUM', 'HIGH']),
        correctCount: correct, totalCount: total, accuracy: correct * 10,
        xpEarned: correct * 3, isVictory: correct >= 6,
        totalTimeSeconds: rand(60, 300),
      },
    });
    for (let j = 0; j < 3; j++) {
      await prisma.revengeAnswer.create({
        data: {
          id: uuid(), attemptId: raId, questionId: questionIds[rand(0, 30)],
          problemIndex: j, selectedAnswer: String(rand(1, 5)), correctAnswer: '3',
          isCorrect: j < 2, timeSpentSeconds: rand(10, 60),
        },
      });
    }
    count('RevengeAttempt');
    count('RevengeAnswer', 3);
  }

  // ════════════════════════════════════════════════════════
  // 20. FeatureFlag (테넌트별)
  // ════════════════════════════════════════════════════════
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

  // T1: 전부 활성, T2: 일부만, T3: 전부 활성
  for (const tid of [T1, T2, T3]) {
    for (const f of flags) {
      const enabled = tid !== T2 || !['class_competition', 'enhanced_levelup'].includes(f.key);
      await prisma.featureFlag.create({
        data: { id: uuid(), key: f.key, label: f.label, enabled, tenantId: tid, updatedAt: now },
      });
      count('FeatureFlag');
    }
  }

  // ════════════════════════════════════════════════════════
  // 21. DiagnosticResult
  // ════════════════════════════════════════════════════════
  console.log('22. DiagnosticResult 생성...');
  for (let i = 10; i < 15; i++) {
    const accuracy = rand(35, 90);
    await prisma.diagnosticResult.create({
      data: {
        id: uuid(), attemptId: uuid(), studentId: allStudentIds[i],
        diagnosticType: 'level_test',
        recommendLevel: accuracy >= 70 ? 'middle_1' : 'elementary_6',
        weakAreas: ['정수의 사칙연산', '유리수의 개념'],
        strongAreas: ['정수의 개념'],
        overallAccuracy: accuracy,
        domainScores: {
          CALCULATION: rand(30, 90),
          UNDERSTANDING: rand(30, 90),
          PROBLEM_SOLVING: rand(20, 80),
          REASONING: rand(10, 70),
        },
      },
    });
    count('DiagnosticResult');
  }

  // ════════════════════════════════════════════════════════
  // 22. Inquiry
  // ════════════════════════════════════════════════════════
  console.log('23. Inquiry 생성...');
  const inquiries = [
    { user: allStudentIds[0], title: '분수 문제 풀이가 어려워요', cat: '학습 질문', content: '분수의 통분이 잘 이해가 안 돼요.', status: 'PENDING' as const },
    { user: allStudentIds[5], title: '비밀번호를 변경하고 싶어요', cat: '계정 문의', content: '비밀번호 변경은 어떻게 하나요?', status: 'PENDING' as const },
    { user: teacherIds[1], title: '시험 결과 다운로드 기능 문의', cat: '기능 문의', content: '학생 시험 결과를 엑셀로 다운로드할 수 있나요?', status: 'ANSWERED' as const },
    { user: allStudentIds[15], title: '숙제 기한이 안 보여요', cat: '기능 문의', content: '숙제 기한이 표시되지 않습니다.', status: 'PENDING' as const },
    { user: teacherIds[3], title: '강남점 퀴즈 오류', cat: '버그 신고', content: '퀴즈 시작 버튼이 안 눌려요.', status: 'ANSWERED' as const },
  ];
  for (const inq of inquiries) {
    await prisma.inquiry.create({
      data: {
        id: uuid(), userId: inq.user, title: inq.title, category: inq.cat,
        content: inq.content, status: inq.status,
        reply: inq.status === 'ANSWERED' ? '확인 후 조치하겠습니다.' : null,
        repliedAt: inq.status === 'ANSWERED' ? day(-1) : null,
        repliedBy: inq.status === 'ANSWERED' ? ownerIds[T1] : null,
        updatedAt: now,
      },
    });
  }
  count('Inquiry', inquiries.length);

  // ════════════════════════════════════════════════════════
  // 23. TeacherComment + ReportHistory + ConceptMemo
  // ════════════════════════════════════════════════════════
  console.log('24. TeacherComment + ReportHistory + ConceptMemo 생성...');

  const commentTexts = [
    '분수 개념 이해가 빠르고 연산 실력이 좋습니다.',
    '도형 넓이 공식을 잘 외우고 있습니다.',
    '정수 연산에 자신감이 붙고 있습니다.',
    '출석률이 높고 성실합니다.',
    '최근 시험 성적이 크게 올랐습니다.',
    '비율 문제에서 꾸준히 향상하고 있습니다.',
    '함수 그래프 이해도가 우수합니다.',
    '인수분해 연습을 더 하면 좋겠습니다.',
  ];

  for (let i = 0; i < 8; i++) {
    await prisma.teacherComment.create({
      data: {
        id: uuid(), teacherId: teacherIds[i % 3], studentId: allStudentIds[i],
        month: `2026-0${1 + (i % 3)}`, content: commentTexts[i], updatedAt: now,
      },
    });
    count('TeacherComment');
  }

  for (let i = 0; i < 5; i++) {
    await prisma.reportHistory.create({
      data: {
        id: uuid(), studentId: allStudentIds[i], type: 'level_test',
        content: { summary: `${studentMeta[i].name} 레벨테스트 보고서`, overallScore: rand(50, 95) },
        channel: 'web', sentAt: day(-10 + i * 2),
      },
    });
    count('ReportHistory');
  }

  const memos = [
    { sIdx: 0, cIdx: 0, content: '분모는 아래, 분자는 위! 피자로 기억하자.' },
    { sIdx: 0, cIdx: 1, content: '통분 잊지 말자. 분모를 같게!' },
    { sIdx: 1, cIdx: 0, content: '진분수: 분자 < 분모' },
    { sIdx: 2, cIdx: 3, content: '삼각형 넓이 = 밑변 x 높이 / 2' },
    { sIdx: 10, cIdx: 12, content: '양의 정수 = 자연수. 0은 양수도 음수도 아님.' },
    { sIdx: 15, cIdx: 0, content: '분수는 피자 나누기!' },
    { sIdx: 14, cIdx: 21, content: '동류항끼리 모으는 게 핵심!' },
  ];
  for (const m of memos) {
    await prisma.conceptMemo.create({
      data: { id: uuid(), userId: allStudentIds[m.sIdx], conceptId: conceptIds[m.cIdx], content: m.content, updatedAt: now },
    });
    count('ConceptMemo');
  }

  // ════════════════════════════════════════════════════════
  // 24. TenantLicense + StudentLicense (이용권)
  // ════════════════════════════════════════════════════════
  console.log('25. TenantLicense + StudentLicense 생성...');

  const ALL_FEATURES: LicenseFeature[] = ['CONCEPT', 'ARITHMETIC', 'TIME_ATTACK', 'TEST', 'REVENGE', 'DIAGNOSTIC', 'QUIZ'];

  const tenantLicenseIds: Record<string, Record<string, string>> = {};

  for (const tid of [T1, T2, T3]) {
    tenantLicenseIds[tid] = {};
    for (const feature of ALL_FEATURES) {
      const tlId = uuid();
      tenantLicenseIds[tid][feature] = tlId;
      await prisma.tenantLicense.create({
        data: { id: tlId, tenantId: tid, feature, maxSeats: 999, isActive: true },
      });
      count('TenantLicense');
    }
  }

  // 학생별 이용권 배정
  const tenantStudentMap: Record<string, string[]> = { [T1]: t1StudentIds, [T2]: t2StudentIds, [T3]: t3StudentIds };

  for (const [tid, sIds] of Object.entries(tenantStudentMap)) {
    const assignerId = ownerIds[tid];
    for (const sId of sIds) {
      for (const feature of ALL_FEATURES) {
        await prisma.studentLicense.create({
          data: {
            id: uuid(), studentId: sId, tenantLicenseId: tenantLicenseIds[tid][feature],
            feature, assignedBy: assignerId,
          },
        });
        count('StudentLicense');
      }
    }
    // usedSeats 동기화
    for (const feature of ALL_FEATURES) {
      await prisma.tenantLicense.update({
        where: { id: tenantLicenseIds[tid][feature] },
        data: { usedSeats: sIds.length },
      });
    }
  }

  // ════════════════════════════════════════════════════════
  // 완료
  // ════════════════════════════════════════════════════════
  console.log('\n=== 시드 완료! ===\n');
  console.log('── 생성 요약 ──');
  const sortedKeys = Object.keys(counts).sort();
  for (const k of sortedKeys) {
    console.log(`  ${k}: ${counts[k]}개`);
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`\n  총: ${total}개 레코드`);

  console.log('\n── 로그인 정보 ──');
  console.log('  SUPER_ADMIN: superadmin / admin1234');
  console.log('  OWNER (본원): admin / admin1234');
  console.log('  OWNER (강남): admin_gn / admin1234');
  console.log('  OWNER (서초): admin_sc / admin1234');
  console.log('  MANAGER: manager01, manager02, manager_gn / pass1234');
  console.log('  TEACHER: teacher01~03, teacher_gn1~2, teacher_sc1 / pass1234');
  console.log('  STUDENT: student01~28 / 1234\n');
}

main()
  .catch((e) => {
    console.error('시드 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
