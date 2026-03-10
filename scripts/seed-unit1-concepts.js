const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 초5 Subject 찾기
  const subject = await prisma.subject.findFirst({
    where: { title: { contains: '5학년' } },
  });
  if (!subject) {
    console.log('초5 Subject 없음');
    return;
  }
  console.log('Subject:', subject.id, subject.title);

  // 기존 1단원 개념 삭제 (E5-NUM-07)
  const deleted = await prisma.concept.deleteMany({
    where: { conceptCode: 'E5-NUM-07' },
  });
  console.log('기존 E5-NUM-07 삭제:', deleted.count);

  const CHAPTER = '자연수의 혼합 계산';

  const concepts = [
    // ① 덧셈과 뺄셈이 섞여 있는 식
    {
      conceptCode: 'E5-1-01',
      title: '덧셈과 뺄셈 - 앞에서부터 차례로',
      chapter: CHAPTER,
      section: '덧셈과 뺄셈이 섞여 있는 식',
      sortOrder: 101,
      category: 'concept',
      grade: 'elementary_5',
      fullContent:
`덧셈과 뺄셈이 섞여 있는 식은 앞에서부터 차례로 계산합니다.

예) 37 + 14 - 6
① 37 + 14 = 51
② 51 - 6 = 45

예) 43 - 8 + 11
① 43 - 8 = 35
② 35 + 11 = 46

주의! 앞에서부터 계산하지 않으면 결과가 달라질 수 있습니다.
43 - 8 + 11에서 8 + 11 = 19를 먼저 하면 43 - 19 = 24로 틀립니다.`,
      blanks: [
        {
          level: 1,
          templateText: '덧셈과 뺄셈이 섞여 있는 식은 {{1}}부터 차례로 계산합니다.\n\n예) 37 + 14 - 6\n① 37 + 14 = {{2}}\n② {{2}} - 6 = {{3}}',
          blanks: [
            { position: 1, answer: '앞에서', hint: 'ㅇㅇㅅ' },
            { position: 2, answer: '51', hint: '37+14' },
            { position: 3, answer: '45', hint: '51-6' },
          ],
        },
        {
          level: 2,
          templateText: '덧셈과 뺄셈이 섞여 있는 식은 {{1}}부터 {{2}} 계산합니다.\n\n예) 43 - 8 + 11\n① 43 - 8 = {{3}}\n② {{3}} + 11 = {{4}}\n\n주의! 앞에서부터 계산하지 않으면 결과가 {{5}}.',
          blanks: [
            { position: 1, answer: '앞에서', hint: 'ㅇㅇㅅ' },
            { position: 2, answer: '차례로', hint: 'ㅊㄹㄹ' },
            { position: 3, answer: '35', hint: '43-8' },
            { position: 4, answer: '46', hint: '35+11' },
            { position: 5, answer: '달라질 수 있습니다', hint: 'ㄷㄹㅈ' },
          ],
        },
      ],
    },
    {
      conceptCode: 'E5-1-02',
      title: '덧셈과 뺄셈 - 괄호가 있는 경우',
      chapter: CHAPTER,
      section: '덧셈과 뺄셈이 섞여 있는 식',
      sortOrder: 102,
      category: 'concept',
      grade: 'elementary_5',
      fullContent:
`덧셈과 뺄셈이 섞여 있고 ( )가 있는 식은 ( ) 안을 먼저 계산합니다.

예) 21 + (19 - 5)
① 19 - 5 = 14  ← ( ) 안 먼저!
② 21 + 14 = 35

예) 27 - (8 + 10)
① 8 + 10 = 18  ← ( ) 안 먼저!
② 27 - 18 = 9

( )가 있으면 무조건 ( ) 안부터 계산하세요!`,
      blanks: [
        {
          level: 1,
          templateText: '( )가 있는 식은 ( ) {{1}}을 먼저 계산합니다.\n\n예) 21 + (19 - 5)\n① 19 - 5 = {{2}}\n② 21 + {{2}} = {{3}}',
          blanks: [
            { position: 1, answer: '안', hint: 'ㅇ' },
            { position: 2, answer: '14', hint: '19-5' },
            { position: 3, answer: '35', hint: '21+14' },
          ],
        },
        {
          level: 2,
          templateText: '덧셈과 뺄셈이 섞여 있고 ( )가 있는 식은 {{1}} {{2}}을 {{3}} 계산합니다.\n\n예) 27 - (8 + 10)\n① 8 + 10 = {{4}}\n② 27 - {{4}} = {{5}}',
          blanks: [
            { position: 1, answer: '( )', hint: '괄호' },
            { position: 2, answer: '안', hint: 'ㅇ' },
            { position: 3, answer: '먼저', hint: 'ㅁㅈ' },
            { position: 4, answer: '18', hint: '8+10' },
            { position: 5, answer: '9', hint: '27-18' },
          ],
        },
      ],
    },
    {
      conceptCode: 'E5-1-03',
      title: '덧셈과 뺄셈 - 괄호 유무 비교',
      chapter: CHAPTER,
      section: '덧셈과 뺄셈이 섞여 있는 식',
      sortOrder: 103,
      category: 'concept',
      grade: 'elementary_5',
      fullContent:
`( )가 있을 때와 없을 때 계산 결과를 비교해 봅시다.

괄호 없는 경우:
43 - 8 + 11
① 43 - 8 = 35  (앞에서부터)
② 35 + 11 = 46

괄호 있는 경우:
43 - (8 + 11)
① 8 + 11 = 19  (괄호 먼저)
② 43 - 19 = 24

같은 수, 같은 연산이지만 ( )의 위치에 따라 계산 순서가 달라지고 결과도 달라집니다!
46 ≠ 24`,
      blanks: [
        {
          level: 1,
          templateText: '괄호 없는 경우: 43 - 8 + 11\n① 43 - 8 = {{1}}\n② {{1}} + 11 = {{2}}\n\n괄호 있는 경우: 43 - (8 + 11)\n① 8 + 11 = {{3}}\n② 43 - {{3}} = {{4}}\n\n결과: {{2}} ≠ {{4}}',
          blanks: [
            { position: 1, answer: '35', hint: '43-8' },
            { position: 2, answer: '46', hint: '35+11' },
            { position: 3, answer: '19', hint: '8+11' },
            { position: 4, answer: '24', hint: '43-19' },
          ],
        },
        {
          level: 2,
          templateText: '( )가 있을 때와 없을 때 결과를 비교해 봅시다.\n\n43 - 8 + 11 = {{1}} ({{2}}부터 계산)\n43 - (8 + 11) = {{3}} ({{4}} 먼저 계산)\n\n같은 수, 같은 연산이지만 ( )의 위치에 따라 계산 {{5}}가 달라지고 {{6}}도 달라집니다.',
          blanks: [
            { position: 1, answer: '46', hint: '35+11' },
            { position: 2, answer: '앞에서', hint: 'ㅇㅇㅅ' },
            { position: 3, answer: '24', hint: '43-19' },
            { position: 4, answer: '괄호', hint: '( )' },
            { position: 5, answer: '순서', hint: 'ㅅㅅ' },
            { position: 6, answer: '결과', hint: 'ㄱㄱ' },
          ],
        },
      ],
    },

    // ② 곱셈과 나눗셈이 섞여 있는 식
    {
      conceptCode: 'E5-1-04',
      title: '곱셈과 나눗셈 - 앞에서부터 차례로',
      chapter: CHAPTER,
      section: '곱셈과 나눗셈이 섞여 있는 식',
      sortOrder: 104,
      category: 'concept',
      grade: 'elementary_5',
      fullContent:
`곱셈과 나눗셈이 섞여 있는 식도 앞에서부터 차례로 계산합니다.

예) 15 × 4 ÷ 6
① 15 × 4 = 60
② 60 ÷ 6 = 10

예) 48 ÷ 8 × 3
① 48 ÷ 8 = 6
② 6 × 3 = 18

덧셈·뺄셈과 마찬가지로, 곱셈과 나눗셈만 있는 식은 앞에서부터 차례로 계산합니다.`,
      blanks: [
        {
          level: 1,
          templateText: '곱셈과 나눗셈이 섞여 있는 식은 {{1}}부터 차례로 계산합니다.\n\n예) 15 × 4 ÷ 6\n① 15 × 4 = {{2}}\n② {{2}} ÷ 6 = {{3}}',
          blanks: [
            { position: 1, answer: '앞에서', hint: 'ㅇㅇㅅ' },
            { position: 2, answer: '60', hint: '15×4' },
            { position: 3, answer: '10', hint: '60÷6' },
          ],
        },
        {
          level: 2,
          templateText: '곱셈과 나눗셈이 섞여 있는 식은 {{1}}부터 {{2}} 계산합니다.\n\n예) 48 ÷ 8 × 3\n① 48 ÷ 8 = {{3}}\n② {{3}} × 3 = {{4}}',
          blanks: [
            { position: 1, answer: '앞에서', hint: 'ㅇㅇㅅ' },
            { position: 2, answer: '차례로', hint: 'ㅊㄹㄹ' },
            { position: 3, answer: '6', hint: '48÷8' },
            { position: 4, answer: '18', hint: '6×3' },
          ],
        },
      ],
    },
    {
      conceptCode: 'E5-1-05',
      title: '곱셈과 나눗셈 - 괄호가 있는 경우',
      chapter: CHAPTER,
      section: '곱셈과 나눗셈이 섞여 있는 식',
      sortOrder: 105,
      category: 'concept',
      grade: 'elementary_5',
      fullContent:
`곱셈과 나눗셈이 섞여 있고 ( )가 있으면 ( ) 안을 먼저 계산합니다.

예) 12 × (20 ÷ 4)
① 20 ÷ 4 = 5  ← ( ) 안 먼저!
② 12 × 5 = 60

예) 72 ÷ (3 × 3)
① 3 × 3 = 9  ← ( ) 안 먼저!
② 72 ÷ 9 = 8

비교) 72 ÷ 3 × 3 = 24 × 3 = 72 (괄호 없으면 앞에서부터)
      72 ÷ (3 × 3) = 72 ÷ 9 = 8 (괄호 있으면 괄호부터)`,
      blanks: [
        {
          level: 1,
          templateText: '( )가 있으면 ( ) {{1}}을 먼저 계산합니다.\n\n예) 12 × (20 ÷ 4)\n① 20 ÷ 4 = {{2}}\n② 12 × {{2}} = {{3}}',
          blanks: [
            { position: 1, answer: '안', hint: 'ㅇ' },
            { position: 2, answer: '5', hint: '20÷4' },
            { position: 3, answer: '60', hint: '12×5' },
          ],
        },
        {
          level: 2,
          templateText: '예) 72 ÷ (3 × 3)\n① 3 × 3 = {{1}}\n② 72 ÷ {{1}} = {{2}}\n\n비교) 72 ÷ 3 × 3 = {{3}} (앞에서부터)\n         72 ÷ (3 × 3) = {{2}} ({{4}}부터)',
          blanks: [
            { position: 1, answer: '9', hint: '3×3' },
            { position: 2, answer: '8', hint: '72÷9' },
            { position: 3, answer: '72', hint: '24×3' },
            { position: 4, answer: '괄호', hint: '( )' },
          ],
        },
      ],
    },

    // ③ 덧셈, 뺄셈, 곱셈이 섞여 있는 식
    {
      conceptCode: 'E5-1-06',
      title: '덧셈, 뺄셈, 곱셈이 섞인 식',
      chapter: CHAPTER,
      section: '덧셈, 뺄셈, 곱셈이 섞여 있는 식',
      sortOrder: 106,
      category: 'concept',
      grade: 'elementary_5',
      fullContent:
`덧셈, 뺄셈, 곱셈이 섞여 있는 식에서는 곱셈을 먼저 계산합니다.

예) 7 + 3 × 5
① 3 × 5 = 15  ← 곱셈 먼저!
② 7 + 15 = 22

예) 20 - 4 × 3
① 4 × 3 = 12  ← 곱셈 먼저!
② 20 - 12 = 8

주의! 7 + 3 × 5에서 앞에서부터 7 + 3 = 10, 10 × 5 = 50으로 계산하면 틀립니다.
곱셈은 덧셈·뺄셈보다 항상 먼저 계산합니다.`,
      blanks: [
        {
          level: 1,
          templateText: '덧셈, 뺄셈, 곱셈이 섞여 있으면 {{1}}을 먼저 계산합니다.\n\n예) 7 + 3 × 5\n① 3 × 5 = {{2}}\n② 7 + {{2}} = {{3}}',
          blanks: [
            { position: 1, answer: '곱셈', hint: 'ㄱㅅ' },
            { position: 2, answer: '15', hint: '3×5' },
            { position: 3, answer: '22', hint: '7+15' },
          ],
        },
        {
          level: 2,
          templateText: '덧셈, 뺄셈, {{1}}이 섞여 있으면 {{1}}을 {{2}} 계산합니다.\n\n예) 20 - 4 × 3\n① 4 × 3 = {{3}}\n② 20 - {{3}} = {{4}}\n\n주의! 앞에서부터 20 - 4 = 16, 16 × 3 = {{5}}로 계산하면 {{6}}.',
          blanks: [
            { position: 1, answer: '곱셈', hint: 'ㄱㅅ' },
            { position: 2, answer: '먼저', hint: 'ㅁㅈ' },
            { position: 3, answer: '12', hint: '4×3' },
            { position: 4, answer: '8', hint: '20-12' },
            { position: 5, answer: '48', hint: '16×3' },
            { position: 6, answer: '틀립니다', hint: 'ㅌㄹㄴㄷ' },
          ],
        },
      ],
    },
    {
      conceptCode: 'E5-1-07',
      title: '덧셈, 뺄셈, 곱셈 + 괄호',
      chapter: CHAPTER,
      section: '덧셈, 뺄셈, 곱셈이 섞여 있는 식',
      sortOrder: 107,
      category: 'concept',
      grade: 'elementary_5',
      fullContent:
`( )가 있으면 ( ) 안을 가장 먼저 계산합니다.

예) (7 + 3) × 5
① 7 + 3 = 10  ← ( ) 안 먼저!
② 10 × 5 = 50

비교)
7 + 3 × 5 = 7 + 15 = 22  (곱셈 먼저)
(7 + 3) × 5 = 10 × 5 = 50  (괄호 먼저)

계산 순서 정리:
1순위: ( ) 안
2순위: 곱셈
3순위: 덧셈, 뺄셈 (앞에서부터)`,
      blanks: [
        {
          level: 1,
          templateText: '예) (7 + 3) × 5\n① 7 + 3 = {{1}}\n② {{1}} × 5 = {{2}}\n\n계산 순서: {{3}} 안 → 곱셈 → 덧셈·뺄셈',
          blanks: [
            { position: 1, answer: '10', hint: '7+3' },
            { position: 2, answer: '50', hint: '10×5' },
            { position: 3, answer: '( )', hint: '괄호' },
          ],
        },
        {
          level: 2,
          templateText: '비교)\n7 + 3 × 5 = 7 + {{1}} = {{2}} ({{3}} 먼저)\n(7 + 3) × 5 = {{4}} × 5 = {{5}} ({{6}} 먼저)\n\n계산 순서: 1순위 {{6}}, 2순위 {{3}}, 3순위 덧셈·뺄셈',
          blanks: [
            { position: 1, answer: '15', hint: '3×5' },
            { position: 2, answer: '22', hint: '7+15' },
            { position: 3, answer: '곱셈', hint: 'ㄱㅅ' },
            { position: 4, answer: '10', hint: '7+3' },
            { position: 5, answer: '50', hint: '10×5' },
            { position: 6, answer: '괄호', hint: '( )' },
          ],
        },
      ],
    },

    // ④ 덧셈, 뺄셈, 나눗셈이 섞여 있는 식
    {
      conceptCode: 'E5-1-08',
      title: '덧셈, 뺄셈, 나눗셈이 섞인 식',
      chapter: CHAPTER,
      section: '덧셈, 뺄셈, 나눗셈이 섞여 있는 식',
      sortOrder: 108,
      category: 'concept',
      grade: 'elementary_5',
      fullContent:
`덧셈, 뺄셈, 나눗셈이 섞여 있는 식에서는 나눗셈을 먼저 계산합니다.

예) 5 + 24 ÷ 6
① 24 ÷ 6 = 4  ← 나눗셈 먼저!
② 5 + 4 = 9

예) 30 - 18 ÷ 3
① 18 ÷ 3 = 6  ← 나눗셈 먼저!
② 30 - 6 = 24

나눗셈은 곱셈과 같은 단계입니다. 덧셈·뺄셈보다 항상 먼저 계산합니다.`,
      blanks: [
        {
          level: 1,
          templateText: '덧셈, 뺄셈, 나눗셈이 섞여 있으면 {{1}}을 먼저 계산합니다.\n\n예) 5 + 24 ÷ 6\n① 24 ÷ 6 = {{2}}\n② 5 + {{2}} = {{3}}',
          blanks: [
            { position: 1, answer: '나눗셈', hint: 'ㄴㄴㅅ' },
            { position: 2, answer: '4', hint: '24÷6' },
            { position: 3, answer: '9', hint: '5+4' },
          ],
        },
        {
          level: 2,
          templateText: '덧셈, 뺄셈, {{1}}이 섞여 있으면 {{1}}을 {{2}} 계산합니다.\n\n예) 30 - 18 ÷ 3\n① 18 ÷ 3 = {{3}}\n② 30 - {{3}} = {{4}}\n\n{{1}}은 {{5}}과 같은 단계로, 덧셈·뺄셈보다 항상 먼저 계산합니다.',
          blanks: [
            { position: 1, answer: '나눗셈', hint: 'ㄴㄴㅅ' },
            { position: 2, answer: '먼저', hint: 'ㅁㅈ' },
            { position: 3, answer: '6', hint: '18÷3' },
            { position: 4, answer: '24', hint: '30-6' },
            { position: 5, answer: '곱셈', hint: 'ㄱㅅ' },
          ],
        },
      ],
    },

    // ⑤ 덧셈, 뺄셈, 곱셈, 나눗셈이 섞여 있는 식
    {
      conceptCode: 'E5-1-09',
      title: '사칙연산이 모두 섞인 식',
      chapter: CHAPTER,
      section: '덧셈, 뺄셈, 곱셈, 나눗셈이 섞여 있는 식',
      sortOrder: 109,
      category: 'concept',
      grade: 'elementary_5',
      fullContent:
`덧셈, 뺄셈, 곱셈, 나눗셈이 모두 섞여 있는 식의 계산 순서:

1순위: 곱셈(×)과 나눗셈(÷)을 먼저 계산
2순위: 덧셈(+)과 뺄셈(-)을 나중에 계산
같은 순위끼리는 앞에서부터 차례로!

예) 8 + 4 × 3 - 12 ÷ 6
① 4 × 3 = 12, 12 ÷ 6 = 2  ← ×÷ 먼저!
② 8 + 12 - 2 = 18

예) 30 ÷ 5 + 2 × 7 - 1
① 30 ÷ 5 = 6, 2 × 7 = 14  ← ×÷ 먼저!
② 6 + 14 - 1 = 19`,
      blanks: [
        {
          level: 1,
          templateText: '계산 순서:\n1순위: {{1}}과 {{2}}을 먼저\n2순위: {{3}}과 {{4}}을 나중에\n\n예) 8 + 4 × 3 - 12 ÷ 6\n① 4 × 3 = {{5}}, 12 ÷ 6 = {{6}}\n② 8 + {{5}} - {{6}} = {{7}}',
          blanks: [
            { position: 1, answer: '곱셈', hint: 'ㄱㅅ' },
            { position: 2, answer: '나눗셈', hint: 'ㄴㄴㅅ' },
            { position: 3, answer: '덧셈', hint: 'ㄷㅅ' },
            { position: 4, answer: '뺄셈', hint: 'ㅃㅅ' },
            { position: 5, answer: '12', hint: '4×3' },
            { position: 6, answer: '2', hint: '12÷6' },
            { position: 7, answer: '18', hint: '8+12-2' },
          ],
        },
        {
          level: 2,
          templateText: '사칙연산이 모두 섞인 식:\n{{1}}: ×와 ÷ 먼저\n{{2}}: +와 - 나중에\n같은 순위는 {{3}}부터!\n\n예) 30 ÷ 5 + 2 × 7 - 1\n① 30 ÷ 5 = {{4}}, 2 × 7 = {{5}}\n② {{4}} + {{5}} - 1 = {{6}}',
          blanks: [
            { position: 1, answer: '1순위', hint: '첫번째' },
            { position: 2, answer: '2순위', hint: '두번째' },
            { position: 3, answer: '앞에서', hint: 'ㅇㅇㅅ' },
            { position: 4, answer: '6', hint: '30÷5' },
            { position: 5, answer: '14', hint: '2×7' },
            { position: 6, answer: '19', hint: '6+14-1' },
          ],
        },
      ],
    },
    {
      conceptCode: 'E5-1-10',
      title: '괄호가 있는 혼합 계산',
      chapter: CHAPTER,
      section: '덧셈, 뺄셈, 곱셈, 나눗셈이 섞여 있는 식',
      sortOrder: 110,
      category: 'concept',
      grade: 'elementary_5',
      fullContent:
`사칙연산이 모두 섞이고 괄호가 있으면:

1순위: ( ) 안을 가장 먼저
2순위: 곱셈(×)과 나눗셈(÷)
3순위: 덧셈(+)과 뺄셈(-)

예) (8 + 4) × 3 - 12 ÷ 6
① 8 + 4 = 12  ← ( ) 먼저!
② 12 × 3 = 36, 12 ÷ 6 = 2  ← ×÷
③ 36 - 2 = 34

예) 50 - {(3 + 7) × 2 + 5}
① 3 + 7 = 10  ← 소괄호
② 10 × 2 + 5 = 20 + 5 = 25  ← 중괄호 안
③ 50 - 25 = 25`,
      blanks: [
        {
          level: 1,
          templateText: '계산 순서:\n1순위: {{1}} 안\n2순위: ×과 ÷\n3순위: +과 -\n\n예) (8 + 4) × 3 - 12 ÷ 6\n① 8 + 4 = {{2}}\n② {{2}} × 3 = {{3}}, 12 ÷ 6 = {{4}}\n③ {{3}} - {{4}} = {{5}}',
          blanks: [
            { position: 1, answer: '( )', hint: '괄호' },
            { position: 2, answer: '12', hint: '8+4' },
            { position: 3, answer: '36', hint: '12×3' },
            { position: 4, answer: '2', hint: '12÷6' },
            { position: 5, answer: '34', hint: '36-2' },
          ],
        },
        {
          level: 2,
          templateText: '예) 50 - {(3 + 7) × 2 + 5}\n① 3 + 7 = {{1}} ← {{2}} 먼저\n② {{1}} × 2 + 5 = {{3}} + 5 = {{4}} ← {{5}} 안\n③ 50 - {{4}} = {{6}}',
          blanks: [
            { position: 1, answer: '10', hint: '3+7' },
            { position: 2, answer: '소괄호', hint: '( )' },
            { position: 3, answer: '20', hint: '10×2' },
            { position: 4, answer: '25', hint: '20+5' },
            { position: 5, answer: '중괄호', hint: '{ }' },
            { position: 6, answer: '25', hint: '50-25' },
          ],
        },
      ],
    },
  ];

  // DB에 삽입
  let created = 0;
  for (const c of concepts) {
    const { blanks, ...conceptData } = c;
    const concept = await prisma.concept.create({
      data: {
        ...conceptData,
        subjectId: subject.id,
        part: 'calc',
      },
    });
    console.log('✓', concept.conceptCode, concept.title);

    for (const b of blanks) {
      await prisma.blankExercise.create({
        data: {
          conceptId: concept.id,
          level: b.level,
          templateText: b.templateText,
          blanks: b.blanks,
        },
      });
    }
    created++;
  }

  console.log('\n완료:', created, '개 개념 +', created * 2, '개 빈칸 연습 생성');
}

main().finally(() => prisma.$disconnect());
