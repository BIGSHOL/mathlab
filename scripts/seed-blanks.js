/**
 * 개념별 BlankExercise 시드 데이터 생성
 * - 40개 개념 각각에 대해 빈칸 연습 생성
 * - easy/hard/full 난이도 혼합
 * - 초성 힌트 자동 생성
 *
 * ★ 규칙: {{N}} 빈칸 마커는 절대 $...$ KaTeX 수식 안에 넣지 않는다!
 *   - 잘못: $6 + 8 = {{2}}$
 *   - 올바름: $6 + 8 =$ {{2}}  (answer: '$14$')
 *
 * 실행: node scripts/seed-blanks.js
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// ─── 초성 추출 ───
const INITIALS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
function getHint(str) {
  let result = '';
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      result += INITIALS[Math.floor((code - 0xAC00) / 588)];
    } else {
      result += ch;
    }
  }
  return result;
}

function blank(pos, answer, difficulty) {
  const hint = answer.startsWith('$') ? answer.replace(/\$/g, '') : getHint(answer);
  return { position: pos, answer, hint, difficulty };
}

// ─── 개념별 빈칸 정의 ───
const BLANK_DATA = {
  // ────── 초등 3학년 ──────
  'E3-C01': {
    templateText: '세 자리 수의 덧셈은 {{1}}부터 차례로 계산합니다.\n\n받아올림이 있는 덧셈 $256 + 178 = 434$\n\n일의 자리: $6 + 8 =$ {{2}} → $4$를 쓰고 $1$을 {{3}}\n십의 자리: $5 + 7 + 1 =$ {{4}} → $3$을 쓰고 $1$을 올림\n백의 자리: $2 + 1 + 1 =$ {{5}}\n\n받아내림이 있는 뺄셈에서 일의 자리에서 뺄 수 없으면 {{6}}에서 $10$을 빌려옵니다.',
    blanks: [
      blank(1, '일의 자리', 'easy'),
      blank(2, '$14$', 'easy'),
      blank(3, '올림', 'easy'),
      blank(4, '$13$', 'hard'),
      blank(5, '$4$', 'hard'),
      blank(6, '십의 자리', 'full'),
    ],
  },
  'E3-C02': {
    templateText: '두 점을 곧게 이은 선을 {{1}}이라 합니다.\n한 점에서 시작하여 한쪽으로 끝없이 뻗은 선을 {{2}}이라 합니다.\n양쪽으로 끝없이 뻗은 선을 {{3}}이라 합니다.\n\n두 반직선이 한 점에서 만날 때 생기는 도형을 {{4}}이라 합니다.\n종이를 두 번 접었을 때 생기는 각을 {{5}}이라 하고, 크기는 {{6}}입니다.',
    blanks: [
      blank(1, '선분', 'easy'),
      blank(2, '반직선', 'easy'),
      blank(3, '직선', 'easy'),
      blank(4, '각', 'hard'),
      blank(5, '직각', 'easy'),
      blank(6, '$90°$', 'hard'),
    ],
  },
  'E3-C03': {
    templateText: '나눗셈은 {{1}}입니다.\n\n$12 \\div 3 = 4$는 "$12$를 $3$묶음으로 나누면 한 묶음에 {{2}}개"라는 뜻입니다.\n\n곱셈과 나눗셈의 관계:\n$3 \\times 4 = 12$이면\n$12 \\div 3 =$ {{3}}\n$12 \\div 4 =$ {{4}}\n\n{{5}}를 이용하면 나눗셈을 쉽게 할 수 있습니다.',
    blanks: [
      blank(1, '똑같이 나누기', 'easy'),
      blank(2, '$4$', 'easy'),
      blank(3, '$4$', 'hard'),
      blank(4, '$3$', 'hard'),
      blank(5, '곱셈구구', 'full'),
    ],
  },
  'E3-C04': {
    templateText: '$(\\text{두 자리 수}) \\times (\\text{한 자리 수})$ 계산:\n$23 \\times 4$를 계산하는 방법:\n1. $20 \\times 4 =$ {{1}}\n2. $3 \\times 4 =$ {{2}}\n3. $80 + 12 =$ {{3}}\n\n올림이 있는 곱셈 $36 \\times 7 =$ {{4}}\n일의 자리: $6 \\times 7 = 42$ → $2$를 쓰고 {{5}}를 올림',
    blanks: [
      blank(1, '$80$', 'easy'),
      blank(2, '$12$', 'easy'),
      blank(3, '$92$', 'easy'),
      blank(4, '$252$', 'hard'),
      blank(5, '$4$', 'full'),
    ],
  },
  'E3-C05': {
    templateText: '전체를 똑같이 나눈 것 중 일부를 나타내는 수를 {{1}}라 합니다.\n\n피자를 $4$조각으로 나누어 $1$조각을 먹으면 $\\frac{1}{4}$입니다.\n\n위의 수를 {{2}}, 아래의 수를 {{3}}라 합니다.\n\n$0.1$은 $1$을 $10$으로 나눈 것 중 $1$이며, $0.1 =$ {{4}}입니다.\n$0.3$은 $0.1$이 {{5}}개인 수입니다.',
    blanks: [
      blank(1, '분수', 'easy'),
      blank(2, '분자', 'easy'),
      blank(3, '분모', 'easy'),
      blank(4, '$\\frac{1}{10}$', 'hard'),
      blank(5, '$3$', 'full'),
    ],
  },

  // ────── 초등 4학년 ──────
  'E4-C01': {
    templateText: '$10000$을 {{1}}이라 읽습니다.\n$10000$이 $10000$개이면 {{2}}\n$10000$이 $100000000$개이면 {{3}}\n\n큰 수의 크기 비교: {{4}}가 많은 수가 더 큽니다.\n자릿수가 같으면 {{5}}부터 비교합니다.',
    blanks: [
      blank(1, '만', 'easy'),
      blank(2, '억', 'easy'),
      blank(3, '조', 'easy'),
      blank(4, '자릿수', 'hard'),
      blank(5, '높은 자리', 'full'),
    ],
  },
  'E4-C02': {
    templateText: '각의 크기를 {{1}}라 하고, 단위는 {{2}}입니다.\n\n삼각형의 세 각의 크기의 합은 항상 {{3}}입니다.\n사각형의 네 각의 크기의 합은 항상 {{4}}입니다.\n\n삼각형에서 두 각이 $60°$, $80°$이면\n나머지 한 각 $= 180° - 60° - 80° =$ {{5}}',
    blanks: [
      blank(1, '각도', 'easy'),
      blank(2, '도(°)', 'easy'),
      blank(3, '$180°$', 'easy'),
      blank(4, '$360°$', 'hard'),
      blank(5, '$40°$', 'hard'),
    ],
  },
  'E4-C03': {
    templateText: '나누는 수가 두 자리일 때는 {{1}}하여 몫을 세웁니다.\n\n$156 \\div 12 =$ {{2}}\n$245 \\times 3 =$ {{3}}\n$84 \\div 21 =$ {{4}}',
    blanks: [
      blank(1, '어림', 'easy'),
      blank(2, '$13$', 'easy'),
      blank(3, '$735$', 'hard'),
      blank(4, '$4$', 'hard'),
    ],
  },
  'E4-C04': {
    templateText: '도형을 일정한 방향으로 일정한 거리만큼 옮기는 것을 {{1}}이라 합니다.\n도형을 한 직선을 기준으로 뒤집는 것을 {{2}}이라 합니다.\n도형을 한 점을 중심으로 일정한 각도만큼 돌리는 것을 {{3}}이라 합니다.\n\n이동 후에도 도형의 {{4}}은 변하지 않습니다.',
    blanks: [
      blank(1, '밀기', 'easy'),
      blank(2, '뒤집기', 'easy'),
      blank(3, '돌리기', 'easy'),
      blank(4, '모양과 크기', 'hard'),
    ],
  },
  'E4-C05': {
    templateText: '자료의 크기를 {{1}}로 나타낸 그래프를 막대그래프라 합니다.\n\n막대그래프 그리는 순서:\n1. {{2}}에 무엇을 나타낼지 정합니다.\n2. {{3}} 한 칸의 크기를 정합니다.\n3. 자료의 크기에 맞게 막대를 그립니다.\n4. {{4}}을 붙입니다.\n\n막대가 가장 긴 항목이 {{5}}.',
    blanks: [
      blank(1, '막대의 길이', 'easy'),
      blank(2, '가로축과 세로축', 'hard'),
      blank(3, '눈금', 'easy'),
      blank(4, '제목', 'full'),
      blank(5, '가장 많고', 'full'),
    ],
  },

  // ────── 초등 5학년 ──────
  'E5-C01': {
    templateText: '어떤 수를 나누어떨어지게 하는 수를 {{1}}라 합니다.\n어떤 수에 $1, 2, 3, \\ldots$을 곱한 수를 {{2}}라 합니다.\n\n$12$의 약수: {{3}}\n\n공통인 약수 중 가장 큰 수를 {{4}}라 합니다.\n공통인 배수 중 가장 작은 수를 {{5}}라 합니다.\n\n$12$와 $18$의 최대공약수: {{6}}\n$12$와 $18$의 최소공배수: {{7}}',
    blanks: [
      blank(1, '약수', 'easy'),
      blank(2, '배수', 'easy'),
      blank(3, '$1, 2, 3, 4, 6, 12$', 'hard'),
      blank(4, '최대공약수', 'easy'),
      blank(5, '최소공배수', 'easy'),
      blank(6, '$6$', 'hard'),
      blank(7, '$36$', 'hard'),
    ],
  },
  'E5-C02': {
    templateText: '분모와 분자에 같은 수를 곱하거나 나누면 {{1}} 분수가 됩니다.\n\n분모와 분자를 공약수로 나누는 것을 {{2}}이라 합니다.\n$\\frac{6}{8} =$ {{3}} ($2$로 나눔)\n\n분모를 같게 만드는 것을 {{4}}이라 합니다.\n$\\frac{1}{3}$과 $\\frac{1}{4}$ → $\\frac{4}{12}$과 {{5}}',
    blanks: [
      blank(1, '크기가 같은', 'easy'),
      blank(2, '약분', 'easy'),
      blank(3, '$\\frac{3}{4}$', 'hard'),
      blank(4, '통분', 'easy'),
      blank(5, '$\\frac{3}{12}$', 'hard'),
    ],
  },
  'E5-C03': {
    templateText: '분모가 다른 분수의 덧셈과 뺄셈은 {{1}}한 후 계산합니다.\n\n$\\frac{1}{3} + \\frac{1}{4} = \\frac{4}{12} + \\frac{3}{12} =$ {{2}}\n\n$\\frac{3}{4} - \\frac{1}{6} = \\frac{9}{12} - \\frac{2}{12} =$ {{3}}\n\n대분수의 계산: $1\\frac{2}{3} + 2\\frac{1}{4} =$ {{4}}',
    blanks: [
      blank(1, '통분', 'easy'),
      blank(2, '$\\frac{7}{12}$', 'easy'),
      blank(3, '$\\frac{7}{12}$', 'hard'),
      blank(4, '$3\\frac{11}{12}$', 'hard'),
    ],
  },
  'E5-C04': {
    templateText: '직사각형의 넓이 = {{1}} $\\times$ {{2}}\n\n평행사변형의 넓이 = {{3}} $\\times$ {{4}}\n\n삼각형의 넓이 = 밑변 $\\times$ 높이 $\\div$ {{5}}\n\n사다리꼴의 넓이 = (윗변 $+$ {{6}}) $\\times$ 높이 $\\div$ $2$\n\n마름모의 넓이 = {{7}} $\\times$ 다른 대각선 $\\div$ $2$',
    blanks: [
      blank(1, '가로', 'easy'),
      blank(2, '세로', 'easy'),
      blank(3, '밑변', 'easy'),
      blank(4, '높이', 'easy'),
      blank(5, '$2$', 'hard'),
      blank(6, '아랫변', 'hard'),
      blank(7, '한 대각선', 'full'),
    ],
  },
  'E5-C05': {
    templateText: '혼합 계산 순서:\n1. {{1}} 안을 먼저 계산\n2. {{2}}을 먼저 계산\n3. {{3}}을 나중에 계산\n4. 같은 순위는 {{4}}부터 계산\n\n예: $15 + 3 \\times 4 = 15 + 12 =$ {{5}} (곱셈 먼저)\n$(15 + 3) \\times 4 = 18 \\times 4 =$ {{6}} (괄호 먼저)',
    blanks: [
      blank(1, '괄호', 'easy'),
      blank(2, '곱셈과 나눗셈', 'easy'),
      blank(3, '덧셈과 뺄셈', 'easy'),
      blank(4, '왼쪽', 'hard'),
      blank(5, '$27$', 'hard'),
      blank(6, '$72$', 'full'),
    ],
  },

  // ────── 초등 6학년 ──────
  'E6-C01': {
    templateText: '분수를 자연수로 나눌 때는 자연수의 {{1}}를 곱합니다.\n$\\frac{3}{4} \\div 2 = \\frac{3}{4} \\times \\frac{1}{2} =$ {{2}}\n\n분수끼리 나눌 때는 나누는 분수를 {{3}} 곱합니다.\n$\\frac{2}{3} \\div \\frac{4}{5} = \\frac{2}{3} \\times$ {{4}} $=$ {{5}}',
    blanks: [
      blank(1, '역수', 'easy'),
      blank(2, '$\\frac{3}{8}$', 'easy'),
      blank(3, '뒤집어서', 'easy'),
      blank(4, '$\\frac{5}{4}$', 'hard'),
      blank(5, '$\\frac{5}{6}$', 'hard'),
    ],
  },
  'E6-C02': {
    templateText: '(소수)÷(자연수): 자연수의 나눗셈처럼 계산한 뒤, {{1}}을 올려 찍습니다.\n$8.4 \\div 3 =$ {{2}}\n\n(소수)÷(소수): 나누는 수를 {{3}}로 만들기 위해 양쪽에 $10$을 곱합니다.\n$6.3 \\div 0.9 = 63 \\div 9 =$ {{4}}\n\n$10 \\div 3 = 3.333\\ldots \\approx$ {{5}} (소수 둘째 자리까지)',
    blanks: [
      blank(1, '소수점', 'easy'),
      blank(2, '$2.8$', 'easy'),
      blank(3, '자연수', 'easy'),
      blank(4, '$7$', 'hard'),
      blank(5, '$3.33$', 'hard'),
    ],
  },
  'E6-C03': {
    templateText: '두 수를 나눗셈으로 비교하는 것을 {{1}}라 합니다.\n사과 $3$개, 배 $5$개 → 사과와 배의 비: {{2}}\n\n비에서 기호 : 앞의 수를 {{3}}, 뒤의 수를 {{4}}라 합니다.\n\n비교하는 양을 기준량으로 나눈 값을 {{5}}이라 합니다.\n비율에 $100$을 곱한 것을 {{6}}이라 합니다.',
    blanks: [
      blank(1, '비', 'easy'),
      blank(2, '$3 : 5$', 'easy'),
      blank(3, '전항', 'easy'),
      blank(4, '후항', 'easy'),
      blank(5, '비율', 'hard'),
      blank(6, '백분율', 'hard'),
    ],
  },
  'E6-C04': {
    templateText: '원의 둘레의 길이를 {{1}}라 합니다.\n원주 $\\div$ 지름 $=$ {{2}} $\\approx 3.14$\n\n원주 $=$ {{3}} $\\times 3.14$\n\n원의 넓이 $=$ {{4}} $\\times$ {{5}} $\\times 3.14$\n\n예) 반지름이 $5\\text{cm}$인 원의 넓이 $= 5 \\times 5 \\times 3.14 =$ {{6}}$\\text{cm}^2$',
    blanks: [
      blank(1, '원주', 'easy'),
      blank(2, '원주율', 'easy'),
      blank(3, '지름', 'easy'),
      blank(4, '반지름', 'easy'),
      blank(5, '반지름', 'hard'),
      blank(6, '$78.5$', 'hard'),
    ],
  },
  'E6-C05': {
    templateText: '비율이 같은 두 비를 등호로 연결한 식을 {{1}}이라 합니다.\n\n비례식의 성질: {{2}}의 곱 $=$ {{3}}의 곱\n$a : b = c : d$이면 $a \\times d = b \\times c$\n\n전체를 주어진 비로 나누는 것을 {{4}}이라 합니다.\n$120$을 $2 : 3$으로 비례배분:\n$120 \\times \\frac{2}{5} =$ {{5}}, $120 \\times \\frac{3}{5} =$ {{6}}',
    blanks: [
      blank(1, '비례식', 'easy'),
      blank(2, '외항', 'easy'),
      blank(3, '내항', 'easy'),
      blank(4, '비례배분', 'hard'),
      blank(5, '$48$', 'hard'),
      blank(6, '$72$', 'full'),
    ],
  },

  // ────── 중학 1학년 ──────
  'M1-C01': {
    templateText: '$1$과 자기 자신만을 약수로 가지는 자연수를 {{1}}라 합니다.\n소수가 아닌 $1$보다 큰 자연수를 {{2}}라 합니다.\n\n자연수를 소인수의 곱으로 나타내는 것을 {{3}}라 합니다.\n$60 =$ {{4}}\n\n최대공약수: 공통 소인수의 {{5}} 지수\n최소공배수: 모든 소인수의 {{6}} 지수',
    blanks: [
      blank(1, '소수', 'easy'),
      blank(2, '합성수', 'easy'),
      blank(3, '소인수분해', 'easy'),
      blank(4, '$2^2 \\times 3 \\times 5$', 'hard'),
      blank(5, '최소', 'hard'),
      blank(6, '최대', 'hard'),
    ],
  },
  'M1-C02': {
    templateText: '양의 정수, $0$, 음의 정수를 통틀어 {{1}}라 합니다.\n$\\frac{a}{b}$ ($b \\neq 0$) 꼴로 나타낼 수 있는 수를 {{2}}라 합니다.\n\n$(-3) + (-5) =$ {{3}}\n$(-3) \\times (-5) =$ {{4}} ({{5}} $\\times$ {{6}} $=$ {{7}})\n\n원점과의 거리를 {{8}}이라 합니다.\n$|{-5}| =$ {{9}}',
    blanks: [
      blank(1, '정수', 'easy'),
      blank(2, '유리수', 'easy'),
      blank(3, '$-8$', 'easy'),
      blank(4, '$15$', 'hard'),
      blank(5, '음수', 'hard'),
      blank(6, '음수', 'full'),
      blank(7, '양수', 'hard'),
      blank(8, '절댓값', 'easy'),
      blank(9, '$5$', 'hard'),
    ],
  },
  'M1-C03': {
    templateText: '차수가 $1$인 다항식을 {{1}}이라 합니다.\n\n동류항 합치기: $3x + 2x =$ {{2}}\n분배법칙: $2(3x + 1) =$ {{3}}\n\n등식의 성질:\n$a = b$이면 $a + c =$ {{4}}\n$a = b$이면 $a \\times c =$ {{5}} ($c \\neq 0$)',
    blanks: [
      blank(1, '일차식', 'easy'),
      blank(2, '$5x$', 'easy'),
      blank(3, '$6x + 2$', 'hard'),
      blank(4, '$b + c$', 'hard'),
      blank(5, '$b \\times c$', 'full'),
    ],
  },
  'M1-C04': {
    templateText: '미지수의 값에 따라 참이 되기도 하고 거짓이 되기도 하는 등식을 {{1}}이라 합니다.\n방정식을 참이 되게 하는 미지수의 값을 {{2}}라 합니다.\n\n$2x + 3 = 9$\n$2x =$ {{3}}\n$x =$ {{4}}\n\n활용: 어떤 수의 $3$배에서 $5$를 빼면 $16$ → $3x - 5 = 16$ → $x =$ {{5}}',
    blanks: [
      blank(1, '방정식', 'easy'),
      blank(2, '해', 'easy'),
      blank(3, '$6$', 'easy'),
      blank(4, '$3$', 'hard'),
      blank(5, '$7$', 'hard'),
    ],
  },
  'M1-C05': {
    templateText: '가로축($x$축)과 세로축($y$축)이 만나는 점이 {{1}} $O(0, 0)$\n\n$y = ax$ ($a \\neq 0$) → {{2}} 관계\n$x$가 $2$배가 되면 $y$도 {{3}}배\n그래프: {{4}}을 지나는 직선\n\n$y = \\frac{a}{x}$ ($a \\neq 0$) → {{5}} 관계\n$x$가 $2$배가 되면 $y$는 $\\frac{1}{2}$배\n그래프: {{6}}',
    blanks: [
      blank(1, '원점', 'easy'),
      blank(2, '정비례', 'easy'),
      blank(3, '$2$', 'hard'),
      blank(4, '원점', 'hard'),
      blank(5, '반비례', 'easy'),
      blank(6, '쌍곡선', 'full'),
    ],
  },

  // ────── 중학 2학년 ──────
  'M2-C01': {
    templateText: '소수점 아래가 끝나는 소수를 {{1}}라 합니다.\n소수점 아래에서 같은 숫자 배열이 반복되는 무한소수를 {{2}}라 합니다.\n\n$\\frac{1}{3} = 0.\\overline{3}$ → 순환마디: {{3}}\n$\\frac{1}{7} = 0.\\overline{142857}$ → 순환마디: {{4}}\n\n기약분수의 분모의 소인수가 {{5}}뿐이면 유한소수',
    blanks: [
      blank(1, '유한소수', 'easy'),
      blank(2, '순환소수', 'easy'),
      blank(3, '$3$', 'easy'),
      blank(4, '$142857$', 'hard'),
      blank(5, '$2$와 $5$', 'hard'),
    ],
  },
  'M2-C02': {
    templateText: '단항식의 곱셈: $3a^2 \\times 2a^3 =$ {{1}}\n단항식의 나눗셈: $12a^4 \\div 4a^2 =$ {{2}}\n\n다항식의 덧셈: $(3x^2 + 2x - 1) + (x^2 - 3x + 4) =$ {{3}}\n\n단항식과 다항식의 곱셈: $2x(3x + 5) =$ {{4}}\n다항식의 나눗셈: $(6x^2 + 10x) \\div 2x =$ {{5}}',
    blanks: [
      blank(1, '$6a^5$', 'easy'),
      blank(2, '$3a^2$', 'easy'),
      blank(3, '$4x^2 - x + 3$', 'hard'),
      blank(4, '$6x^2 + 10x$', 'hard'),
      blank(5, '$3x + 5$', 'hard'),
    ],
  },
  'M2-C03': {
    templateText: '부등식에서 양변에 {{1}}를 곱하거나 나누면 부등호 방향이 바뀝니다.\n\n$3x - 5 > 7$\n$3x >$ {{2}}\n$x >$ {{3}}\n\n연립부등식: $\\begin{cases} 2x + 1 \\geq 5 \\\\ x - 3 < 2 \\end{cases}$\n$x \\geq$ {{4}}이고 $x <$ {{5}}',
    blanks: [
      blank(1, '음수', 'easy'),
      blank(2, '$12$', 'easy'),
      blank(3, '$4$', 'easy'),
      blank(4, '$2$', 'hard'),
      blank(5, '$5$', 'hard'),
    ],
  },
  'M2-C04': {
    templateText: '미지수가 $2$개인 일차방정식 $2$개를 한 쌍으로 묶은 것을 {{1}}이라 합니다.\n\n{{2}}: 한 식을 다른 식에 대입하여 풀기\n{{3}}: 두 식을 더하거나 빼서 미지수 하나 소거\n\n가감법 예시:\n$\\begin{cases} 2x + 3y = 12 \\\\ 2x - y = 4 \\end{cases}$\n두 식을 빼면 $4y =$ {{4}} → $y =$ {{5}}, $x =$ {{6}}',
    blanks: [
      blank(1, '연립일차방정식', 'easy'),
      blank(2, '대입법', 'easy'),
      blank(3, '가감법', 'easy'),
      blank(4, '$8$', 'hard'),
      blank(5, '$2$', 'hard'),
      blank(6, '$3$', 'full'),
    ],
  },
  'M2-C05': {
    templateText: '$y = ax + b$ ($a \\neq 0$) 꼴의 함수를 {{1}}라 합니다.\n\n$x$가 $1$ 증가할 때 $y$의 증가량을 {{2}}라 합니다.\n그래프가 $y$축과 만나는 점의 $y$좌표를 {{3}}이라 합니다.\n\n두 점 $(x_1, y_1)$, $(x_2, y_2)$를 지나는 직선의 기울기:\n$a =$ {{4}}',
    blanks: [
      blank(1, '일차함수', 'easy'),
      blank(2, '기울기', 'easy'),
      blank(3, '$y$절편', 'easy'),
      blank(4, '$\\frac{y_2 - y_1}{x_2 - x_1}$', 'hard'),
    ],
  },

  // ────── 중학 3학년 ──────
  'M3-C01': {
    templateText: '$a^2 = b$일 때, $a$를 $b$의 {{1}}이라 합니다.\n$9$의 제곱근: {{2}}\n\n$\\sqrt{a^2} =$ {{3}}\n$\\sqrt{a} \\times \\sqrt{b} =$ {{4}}\n\n순환하지 않는 무한소수를 {{5}}라 합니다.\n{{6}} = 유리수 + 무리수',
    blanks: [
      blank(1, '제곱근', 'easy'),
      blank(2, '$\\pm 3$', 'easy'),
      blank(3, '$|a|$', 'hard'),
      blank(4, '$\\sqrt{ab}$', 'hard'),
      blank(5, '무리수', 'easy'),
      blank(6, '실수', 'easy'),
    ],
  },
  'M3-C02': {
    templateText: '곱셈 공식:\n$(a+b)^2 =$ {{1}}\n$(a-b)^2 =$ {{2}}\n$(a+b)(a-b) =$ {{3}}\n\n인수분해:\n$x^2 + 5x + 6 =$ {{4}}\n$x^2 - 9 =$ {{5}}\n$x^2 + 6x + 9 =$ {{6}}',
    blanks: [
      blank(1, '$a^2 + 2ab + b^2$', 'easy'),
      blank(2, '$a^2 - 2ab + b^2$', 'easy'),
      blank(3, '$a^2 - b^2$', 'easy'),
      blank(4, '$(x+2)(x+3)$', 'hard'),
      blank(5, '$(x+3)(x-3)$', 'hard'),
      blank(6, '$(x+3)^2$', 'hard'),
    ],
  },
  'M3-C03': {
    templateText: '이차방정식: $ax^2 + bx + c = 0$ ($a \\neq 0$)\n\n인수분해로 풀기: $x^2 - 5x + 6 = 0$ → $(x-2)(x-3) = 0$ → $x =$ {{1}} 또는 $x =$ {{2}}\n\n근의 공식: $x =$ {{3}}\n\n판별식 $D =$ {{4}}\n$D > 0$: {{5}}\n$D = 0$: {{6}}\n$D < 0$: {{7}}',
    blanks: [
      blank(1, '$2$', 'easy'),
      blank(2, '$3$', 'easy'),
      blank(3, '$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$', 'hard'),
      blank(4, '$b^2 - 4ac$', 'easy'),
      blank(5, '서로 다른 두 실근', 'hard'),
      blank(6, '중근', 'hard'),
      blank(7, '실근 없음', 'full'),
    ],
  },
  'M3-C04': {
    templateText: '$y = a(x - p)^2 + q$에서\n꼭짓점: {{1}}\n축: {{2}}\n\n$a > 0$: {{3}} (최솟값 $q$)\n$a < 0$: {{4}} (최댓값 $q$)\n\n표준형 → 꼭짓점 형: $y = x^2 - 4x + 7 =$ {{5}}\n꼭짓점 {{6}}, 축 $x = 2$',
    blanks: [
      blank(1, '$(p, q)$', 'easy'),
      blank(2, '$x = p$', 'easy'),
      blank(3, '아래로 볼록', 'easy'),
      blank(4, '위로 볼록', 'easy'),
      blank(5, '$(x-2)^2 + 3$', 'hard'),
      blank(6, '$(2, 3)$', 'hard'),
    ],
  },
  'M3-C05': {
    templateText: '직각삼각형에서 빗변의 길이를 $c$, 나머지 두 변을 $a$, $b$라 하면:\n{{1}}\n\n두 변이 $3$, $4$이면 빗변 $= \\sqrt{3^2 + 4^2} =$ {{2}}\n\n{{3}}: 세 변이 $a^2 + b^2 = c^2$을 만족하면 직각삼각형\n\n두 점 사이의 거리: $d =$ {{4}}',
    blanks: [
      blank(1, '$a^2 + b^2 = c^2$', 'easy'),
      blank(2, '$5$', 'easy'),
      blank(3, '역', 'hard'),
      blank(4, '$\\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}$', 'hard'),
    ],
  },

  // ────── 고등 공통수학1 ──────
  'H1-C01': {
    templateText: '곱셈 공식의 변형:\n$a^2 + b^2 =$ {{1}}\n$a^3 + b^3 =$ {{2}}\n$(a+b+c)^2 =$ {{3}}\n\n다항식의 나눗셈: $A =$ {{4}} (나머지 정리)\n\n$(2x + 3)(x^2 - x + 1)$의 전개에서 $x^2$의 계수: {{5}}',
    blanks: [
      blank(1, '$(a+b)^2 - 2ab$', 'easy'),
      blank(2, '$(a+b)(a^2 - ab + b^2)$', 'easy'),
      blank(3, '$a^2 + b^2 + c^2 + 2ab + 2bc + 2ca$', 'hard'),
      blank(4, '$BQ + R$', 'hard'),
      blank(5, '$1$', 'full'),
    ],
  },
  'H1-C02': {
    templateText: '다항식 $f(x)$를 $(x-a)$로 나눈 나머지는 {{1}} ({{2}})\n\n$f(a) = 0$이면 $f(x)$는 $(x-a)$를 {{3}}로 가짐 ({{4}})\n\n인수분해 공식:\n$a^3 - b^3 =$ {{5}}\n\n$(x-a)$를 대입하여 간편하게 나눗셈을 수행하는 방법을 {{6}}이라 합니다.',
    blanks: [
      blank(1, '$f(a)$', 'easy'),
      blank(2, '나머지정리', 'easy'),
      blank(3, '인수', 'easy'),
      blank(4, '인수정리', 'easy'),
      blank(5, '$(a-b)(a^2 + ab + b^2)$', 'hard'),
      blank(6, '조립제법', 'hard'),
    ],
  },
  'H1-C03': {
    templateText: '$i^2 = -1$인 수 $i$를 {{1}}라 합니다.\n\n$a + bi$에서 $b = 0$이면 {{2}}, $b \\neq 0$이면 {{3}}\n\n$(2 + 3i)(1 - i) =$ {{4}}\n\n$z = a + bi$의 켤레복소수: $\\bar{z} =$ {{5}}\n$z \\cdot \\bar{z} =$ {{6}}',
    blanks: [
      blank(1, '허수단위', 'easy'),
      blank(2, '실수', 'easy'),
      blank(3, '허수', 'easy'),
      blank(4, '$5 + i$', 'hard'),
      blank(5, '$a - bi$', 'hard'),
      blank(6, '$a^2 + b^2$', 'hard'),
    ],
  },
  'H1-C04': {
    templateText: '판별식 $D = b^2 - 4ac$\n$D > 0$: 서로 다른 두 {{1}}\n$D = 0$: {{2}}\n$D < 0$: 서로 다른 두 {{3}}\n\n근과 계수의 관계:\n$\\alpha + \\beta =$ {{4}}\n$\\alpha \\beta =$ {{5}}\n\n$y = a(x-p)^2 + q$에서 $a > 0$이면 $x = p$에서 {{6}} $q$',
    blanks: [
      blank(1, '실근', 'easy'),
      blank(2, '중근', 'easy'),
      blank(3, '허근', 'easy'),
      blank(4, '$-\\frac{b}{a}$', 'hard'),
      blank(5, '$\\frac{c}{a}$', 'hard'),
      blank(6, '최솟값', 'hard'),
    ],
  },
  'H1-C05': {
    templateText: '합의 법칙: 동시에 일어나지 않는 경우 → {{1}}\n곱의 법칙: 동시에 일어나는 경우 → {{2}}\n\n$n$개에서 $r$개를 택하여 순서 있게 나열: {{3}}\n$_nP_r =$ {{4}}\n\n$n$개에서 $r$개를 순서 없이 택함: {{5}}\n$_nC_r =$ {{6}}\n\n$_5C_3 =$ {{7}}',
    blanks: [
      blank(1, '더하기', 'easy'),
      blank(2, '곱하기', 'easy'),
      blank(3, '순열', 'easy'),
      blank(4, '$\\frac{n!}{(n-r)!}$', 'hard'),
      blank(5, '조합', 'easy'),
      blank(6, '$\\frac{n!}{r!(n-r)!}$', 'hard'),
      blank(7, '$10$', 'full'),
    ],
  },
};

async function main() {
  console.log('=== BlankExercise 시드 데이터 생성 ===\n');

  const concepts = await p.concept.findMany({
    select: { id: true, conceptCode: true, title: true },
    orderBy: { conceptCode: 'asc' },
  });

  console.log(`총 ${concepts.length}개 개념 발견\n`);

  let created = 0;
  let skipped = 0;

  for (const concept of concepts) {
    const code = concept.conceptCode;
    const data = BLANK_DATA[code];

    if (!data) {
      console.log(`  ⚠ ${code} (${concept.title}) — 빈칸 데이터 없음, 건너뜀`);
      skipped++;
      continue;
    }

    // 기존 BlankExercise 확인
    const existing = await p.blankExercise.count({ where: { conceptId: concept.id } });
    if (existing > 0) {
      console.log(`  ✓ ${code} (${concept.title}) — 이미 ${existing}개 존재, 건너뜀`);
      skipped++;
      continue;
    }

    await p.blankExercise.create({
      data: {
        conceptId: concept.id,
        level: 1,
        templateText: data.templateText,
        blanks: data.blanks,
      },
    });

    created++;
    const easyCount = data.blanks.filter(b => b.difficulty === 'easy').length;
    const hardCount = data.blanks.filter(b => b.difficulty === 'hard').length;
    const fullCount = data.blanks.filter(b => b.difficulty === 'full').length;
    console.log(`  ✓ ${code} (${concept.title}) — ${data.blanks.length}칸 (easy:${easyCount} hard:${hardCount} full:${fullCount})`);
  }

  console.log(`\n=== 완료 ===`);
  console.log(`  생성: ${created}개`);
  console.log(`  건너뜀: ${skipped}개`);
}

main()
  .catch((e) => { console.error('시드 실패:', e); process.exit(1); })
  .finally(() => p.$disconnect());
