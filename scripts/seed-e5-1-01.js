const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subject = await prisma.subject.findFirst({
    where: { title: { contains: '5학년' } },
  });
  if (!subject) { console.log('초5 Subject 없음'); return; }

  // 기존 E5-1-xx 개념 삭제
  const deleted = await prisma.concept.deleteMany({
    where: { conceptCode: { startsWith: 'E5-1-' } },
  });
  console.log('기존 E5-1-xx 삭제:', deleted.count);

  const fullContent = `▶ 덧셈과 뺄셈이 섞여 있는 식

(1) 덧셈과 뺄셈이 섞여 있는 경우
덧셈과 뺄셈이 괄호 없이 섞여 있을 때는 앞에서부터 순서대로 계산합니다.

【예시 1】 25 + 18 − 9
① 25 + 18 = {{1}}
② {{1}} − 9 = {{2}}

【예시 2】 56 − 17 + 8
① 56 − 17 = {{3}}
② {{3}} + 8 = {{4}}

【예시 3】 32 + 15 − 12
① 32 + 15 = {{5}}
② {{5}} − 12 = {{6}}

【예시 4】 48 − 13 + 25
① 48 − 13 = {{7}}
② {{7}} + 25 = {{8}}

✏️ 정리: 덧셈과 뺄셈이 섞여 있는 식은 {{9}}부터 차례로 계산합니다.

(2) 덧셈과 뺄셈이 섞여 있고 ( )가 있는 경우
괄호가 있으면 괄호 안의 계산을 가장 먼저 한 뒤, 나머지를 이어서 계산합니다.

【예시 1】 34 + (16 − 7)
① 16 − 7 = {{10}}
② 34 + {{10}} = {{11}}

【예시 2】 52 − (14 + 6)
① 14 + 6 = {{12}}
② 52 − {{12}} = {{13}}

【예시 3】 15 + (28 − 13)
① 28 − 13 = {{14}}
② 15 + {{14}} = {{15}}

【예시 4】 46 − (9 + 17)
① 9 + 17 = {{16}}
② 46 − {{16}} = {{17}}

✏️ 정리: 덧셈과 뺄셈이 섞여 있고 ( )가 있는 식은 {{18}} 안을 먼저 계산합니다.

(3) ( )가 있을 때와 없을 때의 계산 결과 비교
같은 숫자가 쓰인 식이라도 괄호가 있고 없고에 따라 계산 순서가 바뀌어 결과가 달라집니다.

• 56 − 17 + 8 = {{19}} + 8 = {{20}}
• 56 − (17 + 8) = 56 − {{21}} = {{22}}

→ 두 식의 계산 {{23}}가 다르므로 계산 결과는 서로 {{24}}.`;

  const blanks = [
    { position: 1,  answer: '43',       hint: '25 + 18을 계산하세요' },
    { position: 2,  answer: '34',       hint: '43 − 9를 계산하세요' },
    { position: 3,  answer: '39',       hint: '56 − 17을 계산하세요' },
    { position: 4,  answer: '47',       hint: '39 + 8을 계산하세요' },
    { position: 5,  answer: '47',       hint: '32 + 15를 계산하세요' },
    { position: 6,  answer: '35',       hint: '47 − 12를 계산하세요' },
    { position: 7,  answer: '35',       hint: '48 − 13을 계산하세요' },
    { position: 8,  answer: '60',       hint: '35 + 25를 계산하세요' },
    { position: 9,  answer: '앞',       hint: '어느 쪽부터 차례로 계산할까요?' },
    { position: 10, answer: '9',        hint: '괄호 안 16 − 7을 먼저 계산하세요' },
    { position: 11, answer: '43',       hint: '34 + 9를 계산하세요' },
    { position: 12, answer: '20',       hint: '괄호 안 14 + 6을 먼저 계산하세요' },
    { position: 13, answer: '32',       hint: '52 − 20을 계산하세요' },
    { position: 14, answer: '15',       hint: '괄호 안 28 − 13을 먼저 계산하세요' },
    { position: 15, answer: '30',       hint: '15 + 15를 계산하세요' },
    { position: 16, answer: '26',       hint: '괄호 안 9 + 17을 먼저 계산하세요' },
    { position: 17, answer: '20',       hint: '46 − 26을 계산하세요' },
    { position: 18, answer: '( )',      hint: '어디를 먼저 계산해야 할까요?' },
    { position: 19, answer: '39',       hint: '앞에서부터: 56 − 17을 먼저 계산하세요' },
    { position: 20, answer: '47',       hint: '39 + 8을 계산하세요' },
    { position: 21, answer: '25',       hint: '괄호 안 17 + 8을 먼저 계산하세요' },
    { position: 22, answer: '31',       hint: '56 − 25를 계산하세요' },
    { position: 23, answer: '순서',     hint: '무엇이 달라서 결과가 달라질까요?' },
    { position: 24, answer: '다릅니다', hint: '결과가 같을까요, 다를까요?' },
  ];

  // Concept 생성
  const concept = await prisma.concept.create({
    data: {
      conceptCode: 'E5-1-01',
      title: '덧셈과 뺄셈이 섞여 있는 식',
      chapter: '자연수의 혼합 계산',
      section: '덧셈과 뺄셈이 섞여 있는 식',
      fullContent: fullContent,
      grade: 'elementary_5',
      category: 'concept',
      part: 'calc',
      sortOrder: 101,
      subjectId: subject.id,
    },
  });
  console.log('✓ 개념 생성:', concept.conceptCode, concept.title);

  // 빈칸 쉬움 (level 1): 계산 결과 숫자만 (1~8, 10~13, 19~22)
  const easyPositions = [1,2,3,4,5,6,7,8,10,11,12,13,19,20,21,22];
  const easyBlanks = blanks.filter(b => easyPositions.includes(b.position));
  const easyTemplate = fullContent.replace(/\{\{(\d+)\}\}/g, (match, num) => {
    const pos = parseInt(num);
    if (!easyPositions.includes(pos)) {
      const blank = blanks.find(b => b.position === pos);
      return blank ? blank.answer : match;
    }
    return match;
  });

  await prisma.blankExercise.create({
    data: {
      conceptId: concept.id,
      level: 1,
      templateText: easyTemplate,
      blanks: easyBlanks,
    },
  });
  console.log('✓ 빈칸 쉬움:', easyBlanks.length, '개 빈칸');

  // 빈칸 어려움 (level 2): 전체 24개
  await prisma.blankExercise.create({
    data: {
      conceptId: concept.id,
      level: 2,
      templateText: fullContent,
      blanks: blanks,
    },
  });
  console.log('✓ 빈칸 어려움: 24개 빈칸');

  console.log('\n완료!');
}

main().finally(() => prisma.$disconnect());
