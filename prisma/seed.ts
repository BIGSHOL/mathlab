import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.pointTransaction.deleteMany();
  await prisma.learningProgress.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.blankExercise.deleteMany();
  await prisma.concept.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // === USERS ===
  const admin = await prisma.user.create({
    data: { username: 'admin', passwordHash: hash('admin1234'), name: '관리자', role: 'ADMIN' },
  });

  const teacher1 = await prisma.user.create({
    data: { username: 'teacher01', passwordHash: hash('pass1234'), name: '김선생', role: 'TEACHER' },
  });

  const teacher2 = await prisma.user.create({
    data: { username: 'teacher02', passwordHash: hash('pass1234'), name: '박선생', role: 'TEACHER' },
  });

  const studentData = [
    { username: 'student01', name: '이수학', grade: 5 },
    { username: 'student02', name: '박영희', grade: 5 },
    { username: 'student03', name: '최민수', grade: 5 },
    { username: 'student04', name: '정하늘', grade: 5 },
    { username: 'student05', name: '김서연', grade: 6 },
    { username: 'student06', name: '이준호', grade: 6 },
    { username: 'student07', name: '한미래', grade: 6 },
    { username: 'student08', name: '조은별', grade: 4 },
    { username: 'student09', name: '윤도현', grade: 4 },
    { username: 'student10', name: '강지우', grade: 4 },
  ];

  const students = [];
  for (const s of studentData) {
    const user = await prisma.user.create({
      data: {
        username: s.username,
        passwordHash: hash('1234'),
        name: s.name,
        role: 'STUDENT',
        grade: s.grade,
        profile: { create: {} },
      },
    });
    students.push(user);
  }

  // === SUBJECTS ===
  const fractionSubject = await prisma.subject.create({
    data: { title: '분수', description: '분수의 기본 개념과 연산', gradeLevel: 5, sortOrder: 1 },
  });

  const shapeSubject = await prisma.subject.create({
    data: { title: '도형', description: '기본 도형의 성질과 넓이', gradeLevel: 5, sortOrder: 2 },
  });

  const ratioSubject = await prisma.subject.create({
    data: { title: '비율', description: '비율과 비례의 이해', gradeLevel: 6, sortOrder: 1 },
  });

  // === CONCEPTS ===
  const concepts = [
    // 분수
    {
      subjectId: fractionSubject.id,
      title: '분수의 뜻',
      sortOrder: 1,
      fullContent: '# 분수의 뜻\n\n분수는 전체를 똑같이 나눈 것 중 일부를 나타내는 수입니다.\n\n예를 들어, 피자 한 판을 4조각으로 나누면 한 조각은 전체의 **1/4**입니다.\n\n## 분수의 구성\n- **분자**: 위에 있는 수 (가져간 부분)\n- **분모**: 아래에 있는 수 (전체를 나눈 수)\n\n## 진분수와 가분수\n- 진분수: 분자 < 분모 (예: 3/5)\n- 가분수: 분자 >= 분모 (예: 5/3)',
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
      subjectId: fractionSubject.id,
      title: '분수의 덧셈',
      sortOrder: 2,
      fullContent: '# 분수의 덧셈\n\n분모가 같은 분수끼리는 분자만 더하면 됩니다.\n\n예: **1/5 + 2/5 = 3/5**\n\n## 분모가 다른 경우\n분모가 다르면 먼저 통분한 후 더합니다.\n\n예: **1/3 + 1/4 = 4/12 + 3/12 = 7/12**\n\n통분이란 두 분수의 분모를 같게 만드는 것입니다.',
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
      subjectId: fractionSubject.id,
      title: '분수의 뺄셈',
      sortOrder: 3,
      fullContent: '# 분수의 뺄셈\n\n분모가 같은 분수끼리는 분자만 빼면 됩니다.\n\n예: **3/5 - 1/5 = 2/5**\n\n## 분모가 다른 경우\n분모가 다르면 먼저 통분한 후 뺍니다.\n\n예: **3/4 - 1/3 = 9/12 - 4/12 = 5/12**',
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
    // 도형
    {
      subjectId: shapeSubject.id,
      title: '삼각형의 넓이',
      sortOrder: 1,
      fullContent: '# 삼각형의 넓이\n\n삼각형의 넓이는 밑변과 높이를 이용하여 구합니다.\n\n## 공식\n**삼각형의 넓이 = 밑변 x 높이 / 2**\n\n## 예시\n밑변이 6cm, 높이가 4cm인 삼각형의 넓이:\n6 x 4 / 2 = 12(cm²)',
      blanks: [
        {
          level: 1,
          templateText: '삼각형의 넓이 = {{1}} x {{2}} / 2',
          blanks: [
            { position: 1, answer: '밑변', hint: 'ㅁㅂ' },
            { position: 2, answer: '높이', hint: 'ㄴㅇ' },
          ],
        },
        {
          level: 2,
          templateText: '{{1}}의 넓이는 {{2}}과 {{3}}를 이용하여 구합니다. 공식은 {{4}} x {{5}} / {{6}} 입니다.',
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
      subjectId: shapeSubject.id,
      title: '사각형의 넓이',
      sortOrder: 2,
      fullContent: '# 사각형의 넓이\n\n## 직사각형\n직사각형의 넓이 = 가로 x 세로\n\n## 평행사변형\n평행사변형의 넓이 = 밑변 x 높이\n\n## 사다리꼴\n사다리꼴의 넓이 = (윗변 + 아랫변) x 높이 / 2',
      blanks: [
        {
          level: 1,
          templateText: '직사각형의 넓이 = {{1}} x {{2}}. 평행사변형의 넓이 = {{3}} x {{4}}.',
          blanks: [
            { position: 1, answer: '가로', hint: 'ㄱㄹ' },
            { position: 2, answer: '세로', hint: 'ㅅㄹ' },
            { position: 3, answer: '밑변', hint: 'ㅁㅂ' },
            { position: 4, answer: '높이', hint: 'ㄴㅇ' },
          ],
        },
        {
          level: 2,
          templateText: '{{1}}의 넓이 = {{2}} x {{3}}. {{4}}의 넓이 = {{5}} x {{6}}. {{7}}의 넓이 = ({{8}} + {{9}}) x {{10}} / 2.',
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
      subjectId: shapeSubject.id,
      title: '원의 넓이',
      sortOrder: 3,
      fullContent: '# 원의 넓이\n\n원의 넓이는 반지름을 이용하여 구합니다.\n\n## 공식\n**원의 넓이 = 반지름 x 반지름 x 3.14 (원주율)**\n\n## 원주\n원주(둘레) = 지름 x 3.14\n\n원주율은 약 3.14이며, 기호로 π(파이)로 나타냅니다.',
      blanks: [
        {
          level: 1,
          templateText: '원의 넓이 = {{1}} x {{2}} x {{3}}',
          blanks: [
            { position: 1, answer: '반지름', hint: 'ㅂㅈㄹ' },
            { position: 2, answer: '반지름', hint: 'ㅂㅈㄹ' },
            { position: 3, answer: '3.14', hint: '원주율' },
          ],
        },
        {
          level: 2,
          templateText: '{{1}}의 넓이 = {{2}} x {{3}} x {{4}}. 원주(둘레) = {{5}} x {{6}}. 원주율은 약 {{7}}이며, 기호로 {{8}}로 나타냅니다.',
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
    // 비율
    {
      subjectId: ratioSubject.id,
      title: '비의 개념',
      sortOrder: 1,
      fullContent: '# 비의 개념\n\n비란 두 수를 나눗셈으로 비교하는 것입니다.\n\n예: 사과 3개, 배 2개 → 사과와 배의 비는 **3:2**\n\n## 비의 값\n비의 값 = 앞항 / 뒷항\n3:2의 비의 값 = 3/2 = 1.5',
      blanks: [
        {
          level: 1,
          templateText: '비란 두 수를 {{1}}으로 비교하는 것입니다. 비의 값 = {{2}} / {{3}}.',
          blanks: [
            { position: 1, answer: '나눗셈', hint: 'ㄴㄴㅅ' },
            { position: 2, answer: '앞항', hint: 'ㅇㅎ' },
            { position: 3, answer: '뒷항', hint: 'ㄷㅎ' },
          ],
        },
        {
          level: 2,
          templateText: '{{1}}란 두 수를 {{2}}으로 비교하는 것입니다. 사과 3개, 배 2개일 때 사과와 배의 비는 {{3}}입니다. {{4}}의 값 = {{5}} / {{6}}이며, 3:2의 비의 값은 {{7}}입니다.',
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
      subjectId: ratioSubject.id,
      title: '비율과 백분율',
      sortOrder: 2,
      fullContent: '# 비율과 백분율\n\n## 비율\n비율은 비의 값을 다른 방식으로 나타낸 것입니다.\n비율 = 비교하는 양 / 기준량\n\n## 백분율\n백분율은 비율을 100을 기준으로 나타낸 것입니다.\n백분율 = 비율 x 100\n\n예: 25명 중 5명 = 5/25 = 0.2 = 20%',
      blanks: [
        {
          level: 1,
          templateText: '비율 = {{1}} / {{2}}. 백분율 = {{3}} x 100.',
          blanks: [
            { position: 1, answer: '비교하는 양', hint: 'ㅂㄱㅎㄴ ㅇ' },
            { position: 2, answer: '기준량', hint: 'ㄱㅈㄹ' },
            { position: 3, answer: '비율', hint: 'ㅂㅇ' },
          ],
        },
        {
          level: 2,
          templateText: '{{1}}은 비의 값을 다른 방식으로 나타낸 것입니다. {{2}} = {{3}} / {{4}}. {{5}}은 비율을 {{6}}을 기준으로 나타낸 것입니다. {{7}} = {{8}} x 100.',
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
      subjectId: ratioSubject.id,
      title: '비례식',
      sortOrder: 3,
      fullContent: '# 비례식\n\n비례식은 비의 값이 같은 두 비를 등호로 연결한 식입니다.\n\n예: **2:3 = 4:6**\n\n## 비례식의 성질\n외항의 곱 = 내항의 곱\n2 x 6 = 3 x 4 = 12\n\n## 용어\n- 외항: 바깥쪽 두 항 (2와 6)\n- 내항: 안쪽 두 항 (3과 4)',
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
  ];

  for (const c of concepts) {
    const concept = await prisma.concept.create({
      data: {
        subjectId: c.subjectId,
        title: c.title,
        fullContent: c.fullContent,
        sortOrder: c.sortOrder,
      },
    });

    for (const b of c.blanks) {
      await prisma.blankExercise.create({
        data: {
          conceptId: concept.id,
          level: b.level,
          templateText: b.templateText,
          blanks: b.blanks,
        },
      });
    }
  }

  // Give some students XP for realistic data
  const xpData = [
    { idx: 0, xp: 280 },
    { idx: 1, xp: 150 },
    { idx: 2, xp: 520 },
    { idx: 3, xp: 90 },
    { idx: 4, xp: 350 },
    { idx: 5, xp: 200 },
    { idx: 6, xp: 60 },
  ];

  for (const d of xpData) {
    const s = students[d.idx];
    if (!s) continue;
    const level = d.xp >= 800 ? 5 : d.xp >= 500 ? 4 : d.xp >= 250 ? 3 : d.xp >= 100 ? 2 : 1;
    await prisma.studentProfile.update({
      where: { userId: s.id },
      data: { totalXp: d.xp, level, currentStreak: Math.floor(Math.random() * 10) + 1, longestStreak: Math.floor(Math.random() * 15) + 5 },
    });
  }

  console.log('Seed completed!');
  console.log(`Created: 1 admin, 2 teachers, ${students.length} students`);
  console.log(`Created: 3 subjects, ${concepts.length} concepts, ${concepts.length * 2} blank exercises`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
