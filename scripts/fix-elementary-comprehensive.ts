/**
 * 초등 개념 종합 수정 스크립트
 *
 * 1단계: section 재배정 (16건) — 잘못 분류된 개념의 section 수정
 * 2단계: 콘텐츠 품질 개선 (5건) — fullContent 재작성
 * 3단계: 신규 개념 추가 (~15건) — 진짜 비어있는 section에 개념 생성
 * 4단계: 빈칸 재생성 — 변경된 모든 개념에 대해 BlankExercise 생성
 */

import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import { buildMergedExercise, addFullSentenceBlanks } from '../src/lib/utils/blank-generator';

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ============================================================
// 1단계: Section 재배정
// ============================================================
const sectionFixes: { conceptCode: string; newSection: string }[] = [
  // 3-1 평면도형: 각, 직각 / 직각삼각형, 직사각형, 정사각형
  { conceptCode: 'E3-GEO-01-2', newSection: '각, 직각' },
  { conceptCode: 'E3-GEO-01-3', newSection: '직각삼각형, 직사각형, 정사각형' },
  // 3-1 나눗셈: 곱셈과 나눗셈의 관계
  { conceptCode: 'E3-NUM-03-2', newSection: '곱셈과 나눗셈의 관계' },
  // 3-1 길이와 시간: 시간의 덧셈과 뺄셈
  { conceptCode: 'E3-MEA-01-3', newSection: '시간의 덧셈과 뺄셈' },
  // 3-2 들이와 무게: kg, g, t 단위
  { conceptCode: 'E3-MEA-02-2', newSection: 'kg, g, t 단위' },
  // 4-1 규칙 찾기: 도형의 배열 규칙
  { conceptCode: 'E4-ALG-01-3', newSection: '도형의 배열 규칙' },
  // 4-2 사각형: 직사각형, 정사각형
  { conceptCode: 'E4-GEO-06-3', newSection: '직사각형, 정사각형' },
  // 4-2 다각형: 대각선
  { conceptCode: 'E4-GEO-07-2', newSection: '대각선' },
  { conceptCode: 'E4-GEO-07-3', newSection: '대각선' },
  // 5-2 분수의 곱셈: (분수)×(자연수)
  { conceptCode: 'E5-NUM-13-1', newSection: '(분수)×(자연수)' },
  // 5-2 직육면체: 겨냥도와 전개도
  { conceptCode: 'E5-GEO-07-3', newSection: '겨냥도와 전개도' },
  // 6-1 각기둥과 각뿔: 각뿔
  { conceptCode: 'E6-GEO-01-2', newSection: '각뿔' },
  // 6-1 직육면체의 부피와 겉넓이: 직육면체의 겉넓이
  { conceptCode: 'E6-GEO-02-2', newSection: '직육면체의 겉넓이' },
  // 6-2 원기둥, 원뿔, 구: 원뿔
  { conceptCode: 'E6-GEO-05-3', newSection: '원뿔' },
  // 6-1 여러 가지 그래프: null → 띠그래프와 원그래프
  { conceptCode: 'E6-STA-02-1', newSection: '띠그래프와 원그래프' },
  { conceptCode: 'E6-STA-02-2', newSection: '띠그래프와 원그래프' },
];

// ============================================================
// 2단계: 콘텐츠 품질 개선
// ============================================================
const qualityFixes: { conceptCode: string; fullContent: string; keywords?: string }[] = [
  {
    conceptCode: 'E4-NUM-02-1',
    keywords: '억,자릿값,만,배,단위,수,자리',
    fullContent: `(1) 억의 정의
만이 $10000$개 모인 수를 억이라고 한다. 억을 숫자로 쓰면 $100000000$이다.
억은 $0$이 $8$개 붙어 있는 수이며, 만의 만 배가 되는 수이다.

(2) 억의 자릿값
수의 자리는 오른쪽부터 일의 자리, 십의 자리, 백의 자리, 천의 자리가 반복된다.
만의 자리 다음에는 십만의 자리, 백만의 자리, 천만의 자리가 오고, 그 다음이 억의 자리이다.
예) $350000000$에서 $3$은 억의 자리, $5$는 천만의 자리에 있다.

(3) 억의 크기 감각
$1$억은 $1$초에 하나씩 세면 약 $3$년이 넘게 걸리는 매우 큰 수이다.`,
  },
  {
    conceptCode: 'E4-NUM-03-1',
    keywords: '조,억,자릿값,단위,만,배,자리',
    fullContent: `(1) 조의 정의
억이 $10000$개 모인 수를 조라고 한다. 조를 숫자로 쓰면 $1000000000000$이며, $0$이 $12$개 붙어 있는 수이다.
조는 만의 자리, 억의 자리 다음으로 오는 큰 단위이다.

(2) 조의 자릿값
조의 자리 위에도 십조, 백조, 천조의 자리가 있다.
예) $23000000000000$은 $23$조이며, $2$는 십조의 자리, $3$은 조의 자리에 있는 숫자이다.

(3) 큰 수의 자릿값 체계 정리
일, 십, 백, 천이 하나의 묶음이 되어, 만 묶음, 억 묶음, 조 묶음이 차례로 반복된다.
예) $5$조 $1234$억 $5678$만 $9012$는 네 자리씩 끊어 읽으면 쉽게 읽을 수 있다.`,
  },
  {
    conceptCode: 'E3-NUM-05-1',
    keywords: '분수,분모,분자,가로선,전체,조각,단위분수',
    fullContent: `(1) 분수의 의미
전체를 똑같이 나눈 것 중의 일부를 나타낼 때 쓰는 수를 분수라고 한다.

(2) 분수의 구조
분수를 쓸 때는 가로선을 사이에 두고, 아래에는 분모, 위에는 분자를 쓴다.
분모는 전체를 똑같이 몇 조각으로 나누었는지를 나타내고, 분자는 그중에서 몇 조각인지를 나타낸다.
예) 피자 한 판을 똑같이 $4$조각으로 나눈 것 중 $1$조각은 $\\frac{1}{4}$이라고 쓴다.
이때 $4$는 분모이고, $1$은 분자이다. $\\frac{1}{4}$은 '$4$분의 $1$'이라고 읽는다.

(3) 단위분수
분자가 $1$인 분수를 단위분수라고 한다.
예) $\\frac{1}{2}$, $\\frac{1}{3}$, $\\frac{1}{5}$는 모두 단위분수이다.
단위분수는 분모가 클수록 한 조각의 크기가 작아진다.`,
  },
  {
    conceptCode: 'E5-NUM-16-3',
    keywords: '가능성,확률,반드시,불가능,사건,주사위',
    fullContent: `(1) 반드시 일어나는 일
어떤 일이 반드시 일어날 때, 그 사건의 가능성은 $1$이다.
예) 주사위를 한 번 던지면 나오는 눈의 수는 반드시 $1$부터 $6$ 사이의 수이다.
이처럼 어떤 조건 아래에서 틀림없이 일어나는 일의 가능성은 $1$이다.

(2) 불가능한 일
어떤 일이 절대로 일어나지 않을 때, 그 사건의 가능성은 $0$이다.
예) 주사위를 던져서 $7$이 나오는 것은 불가능하므로, 이 사건의 가능성은 $0$이다.

(3) 가능성의 크기 비교
$0$은 절대 일어나지 않는 일, $1$은 반드시 일어나는 일을 나타낸다.
가능성은 $0$에서 $1$ 사이의 수로 나타낼 수 있으며, $1$에 가까울수록 일어날 가능성이 높다.
예) 동전을 던져서 앞면이 나올 가능성은 $\\frac{1}{2}$이다.`,
  },
  {
    conceptCode: 'E4-NUM-02-2',
    keywords: '억,읽기,쓰기,네 자리,자릿값,십억,백억,천억',
    fullContent: `(1) 억이 있는 큰 수 읽기
억이 포함된 큰 수는 오른쪽부터 네 자리씩 끊어 읽는다.
예) $234500000000$은 $2345$억으로, 이천삼백사십오억이라고 읽는다.

(2) 억의 자리 체계
$1$억이 $10$개 모이면 $10$억이 되고, 이를 십억이라고 한다.
$1$억이 $100$개 모이면 백억, $1000$개 모이면 천억이다.
예) $52300000000$은 $523$억이며, $5$는 백억의 자리, $2$는 십억의 자리, $3$은 억의 자리에 있다.

(3) 뛰어 세기
억의 자리에서도 뛰어 세기를 할 수 있다.
$100$억, $200$억, $300$억, $400$억, ...은 $100$억씩 뛰어 센 것이다.
$10$억씩 뛰어 세면 $10$억, $20$억, $30$억, ...이 된다.`,
  },
];

// ============================================================
// 3단계: 신규 개념 추가
// ============================================================
interface NewConcept {
  title: string;
  fullContent: string;
  grade: string;
  semester: number;
  chapter: string;
  section: string;
  part: string;
  keywords: string;
  conceptCode: string;
  sortOrder: number;
  category: string;
}

const newConcepts: NewConcept[] = [
  // --- 3-2 곱셈 > (두 자리 수)×(두 자리 수) ---
  {
    title: '(두 자리 수)×(두 자리 수)의 계산 원리',
    fullContent: `(1) (두 자리 수)×(두 자리 수)의 뜻
두 자리 수끼리의 곱셈은 하나의 두 자리 수를 다른 두 자리 수만큼 곱하는 계산이다.
예) $23 \\times 15$는 $23$을 $15$번 더한 것과 같은 뜻이다.

(2) 계산 방법
두 자리 수끼리의 곱셈은 곱하는 수를 일의 자리와 십의 자리로 나누어 각각 곱한 뒤 더한다.
예) $23 \\times 15$의 계산 순서는 다음과 같다.
① 먼저 $23 \\times 5 = 115$를 구한다.
② 다음으로 $23 \\times 10 = 230$을 구한다.
③ 두 결과를 더하면 $115 + 230 = 345$이다.

따라서 $23 \\times 15 = 345$이다.`,
    grade: 'elementary_3', semester: 2, chapter: '곱셈', section: '(두 자리 수)×(두 자리 수)',
    part: 'calc', keywords: '곱셈,두 자리 수,일의 자리,십의 자리,세로셈', conceptCode: 'E3-NUM-09-1', sortOrder: 140, category: 'concept',
  },
  {
    title: '(두 자리 수)×(두 자리 수)의 세로셈과 받아올림',
    fullContent: `(1) 세로셈으로 계산하기
(두 자리 수)×(두 자리 수)는 세로셈을 이용하면 편리하다.
곱하는 수의 일의 자리 숫자로 먼저 곱하고, 십의 자리 숫자로 곱한 뒤 두 결과를 더한다.

(2) 받아올림이 있는 경우
예) $36 \\times 24$를 세로셈으로 계산하면 다음과 같다.
① $36 \\times 4 = 144$를 첫째 줄에 쓴다.
② $36 \\times 20 = 720$을 둘째 줄에 쓴다. 이때 십의 자리부터 시작하여 쓴다.
③ $144 + 720 = 864$이므로, $36 \\times 24 = 864$이다.

중간 계산에서 $10$이 넘는 수가 나오면 받아올림하여 다음 자리에 더해 준다.`,
    grade: 'elementary_3', semester: 2, chapter: '곱셈', section: '(두 자리 수)×(두 자리 수)',
    part: 'calc', keywords: '세로셈,받아올림,곱셈,일의 자리,십의 자리', conceptCode: 'E3-NUM-09-2', sortOrder: 141, category: 'concept',
  },

  // --- 3-2 원 > 컴퍼스 사용법 ---
  {
    title: '컴퍼스를 사용하여 원 그리기',
    fullContent: `(1) 컴퍼스의 구조
컴퍼스는 원을 그리는 도구이다. 컴퍼스의 한쪽 끝에는 바늘이, 다른 쪽 끝에는 연필이 달려 있다.
바늘은 원의 중심에 꽂고, 연필 쪽을 돌려서 원을 그린다.

(2) 컴퍼스로 원 그리는 방법
① 그리려는 원의 반지름 길이만큼 컴퍼스를 벌린다.
② 바늘을 종이 위의 한 점에 꽂아 원의 중심을 정한다.
③ 연필 쪽을 한 바퀴 돌리면 원이 완성된다.

(3) 컴퍼스의 활용
컴퍼스를 벌리는 길이가 반지름이 된다. 벌리는 길이를 바꾸면 크기가 다른 원을 그릴 수 있다.
예) 반지름이 $3$ cm인 원을 그리려면 컴퍼스를 $3$ cm만큼 벌리면 된다.`,
    grade: 'elementary_3', semester: 2, chapter: '원', section: '컴퍼스 사용법',
    part: 'geo', keywords: '컴퍼스,원,반지름,중심,바늘,연필', conceptCode: 'E3-GEO-03-1', sortOrder: 85, category: 'concept',
  },

  // --- 3-2 분수 > 가분수와 대분수 (chapter 전체 누락) ---
  {
    title: '가분수의 뜻과 표현',
    fullContent: `(1) 가분수의 뜻
분자가 분모와 같거나 분모보다 큰 분수를 가분수라고 한다.
예) $\\frac{3}{3}$, $\\frac{5}{4}$, $\\frac{7}{2}$는 모두 가분수이다.

(2) 가분수의 크기
분자와 분모가 같은 가분수는 $1$과 같다.
예) $\\frac{4}{4} = 1$이다.
분자가 분모보다 큰 가분수는 $1$보다 크다.
예) $\\frac{5}{3}$은 $1$보다 큰 수이다.

(3) 가분수 만들기
전체를 똑같이 $4$조각으로 나누었을 때 $4$조각을 모두 가지면 $\\frac{4}{4}$이고, $5$조각이면 $\\frac{5}{4}$이 된다.
이처럼 전체보다 같거나 많은 양을 분수로 나타내면 가분수가 된다.`,
    grade: 'elementary_3', semester: 2, chapter: '분수', section: '가분수와 대분수',
    part: 'calc', keywords: '가분수,분자,분모,분수,전체', conceptCode: 'E3-NUM-10-1', sortOrder: 150, category: 'concept',
  },
  {
    title: '대분수의 뜻과 가분수와의 변환',
    fullContent: `(1) 대분수의 뜻
자연수와 진분수로 이루어진 분수를 대분수라고 한다.
예) $1\\frac{2}{3}$은 $1$과 $\\frac{2}{3}$이 합쳐진 대분수이다.

(2) 가분수를 대분수로 바꾸기
가분수를 대분수로 바꾸려면 분자를 분모로 나눈다.
예) $\\frac{7}{3}$에서 $7 \\div 3 = 2$ ... $1$이므로, $\\frac{7}{3} = 2\\frac{1}{3}$이다.
몫 $2$가 자연수 부분이 되고, 나머지 $1$이 분자가 된다.

(3) 대분수를 가분수로 바꾸기
대분수를 가분수로 바꾸려면 자연수에 분모를 곱한 뒤 분자를 더한다.
예) $2\\frac{1}{3}$은 $2 \\times 3 + 1 = 7$이므로, $\\frac{7}{3}$이 된다.`,
    grade: 'elementary_3', semester: 2, chapter: '분수', section: '가분수와 대분수',
    part: 'calc', keywords: '대분수,가분수,자연수,진분수,분자,분모,변환', conceptCode: 'E3-NUM-10-2', sortOrder: 151, category: 'concept',
  },

  // --- 4-2 소수의 덧셈과 뺄셈 > 소수 두/세 자리 수 ---
  {
    title: '소수 두 자리 수의 이해',
    fullContent: `(1) 소수 두 자리 수의 뜻
소수점 아래 둘째 자리까지 있는 수를 소수 두 자리 수라고 한다.
소수점 아래 둘째 자리의 숫자는 $\\frac{1}{100}$의 자리를 나타낸다.
예) $0.35$는 $\\frac{1}{10}$이 $3$개, $\\frac{1}{100}$이 $5$개인 수이다.

(2) 소수 두 자리 수의 크기
$0.01$은 $1$을 $100$등분한 것 중 하나이다.
$0.1$은 $0.01$이 $10$개 모인 것과 같다.
예) $0.47$은 $0.01$이 $47$개인 수이므로, $\\frac{47}{100}$과 같다.

(3) 소수 두 자리 수의 크기 비교
소수 두 자리 수의 크기를 비교할 때는 소수점 아래 첫째 자리부터 차례로 비교한다.
예) $0.35$와 $0.38$을 비교하면, 소수 첫째 자리가 $3$으로 같고 둘째 자리에서 $5 < 8$이므로 $0.35 < 0.38$이다.`,
    grade: 'elementary_4', semester: 2, chapter: '소수의 덧셈과 뺄셈', section: '소수 두/세 자리 수',
    part: 'calc', keywords: '소수,소수점,소수 두 자리 수,자릿값,백분의 일', conceptCode: 'E4-NUM-10-1', sortOrder: 105, category: 'concept',
  },
  {
    title: '소수 세 자리 수의 이해',
    fullContent: `(1) 소수 세 자리 수의 뜻
소수점 아래 셋째 자리까지 있는 수를 소수 세 자리 수라고 한다.
소수점 아래 셋째 자리의 숫자는 $\\frac{1}{1000}$의 자리를 나타낸다.
예) $0.125$는 $\\frac{1}{10}$이 $1$개, $\\frac{1}{100}$이 $2$개, $\\frac{1}{1000}$이 $5$개인 수이다.

(2) 소수의 자릿값 체계
소수점 아래로 $\\frac{1}{10}$의 자리, $\\frac{1}{100}$의 자리, $\\frac{1}{1000}$의 자리가 차례로 놓인다.
$0.001$은 $1$을 $1000$등분한 것 중 하나이다.
예) $0.256$은 $0.001$이 $256$개인 수이므로, $\\frac{256}{1000}$과 같다.

(3) 소수 사이의 관계
$0.1$은 $0.01$이 $10$개, $0.01$은 $0.001$이 $10$개 모인 것이다.
이처럼 소수에서도 자연수와 마찬가지로 $10$배씩 커지는 자릿값 체계가 성립한다.`,
    grade: 'elementary_4', semester: 2, chapter: '소수의 덧셈과 뺄셈', section: '소수 두/세 자리 수',
    part: 'calc', keywords: '소수,소수 세 자리 수,자릿값,천분의 일,소수점', conceptCode: 'E4-NUM-10-2', sortOrder: 106, category: 'concept',
  },

  // --- 5-1 약분과 통분 > 분수의 크기 비교 ---
  {
    title: '통분을 이용한 분수의 크기 비교',
    fullContent: `(1) 분모가 같은 분수의 크기 비교
분모가 같은 분수는 분자가 큰 쪽이 더 크다.
예) $\\frac{3}{7}$과 $\\frac{5}{7}$에서 분모가 $7$로 같으므로, 분자를 비교하면 $3 < 5$이다. 따라서 $\\frac{3}{7} < \\frac{5}{7}$이다.

(2) 분모가 다른 분수의 크기 비교
분모가 다른 분수는 통분하여 분모를 같게 만든 뒤 비교한다.
예) $\\frac{2}{3}$과 $\\frac{3}{4}$를 비교하려면 두 분모의 공통분모 $12$로 통분한다.
$\\frac{2}{3} = \\frac{8}{12}$이고, $\\frac{3}{4} = \\frac{9}{12}$이다.
$8 < 9$이므로, $\\frac{2}{3} < \\frac{3}{4}$이다.

(3) 분수의 크기 비교 정리
분모가 같으면 분자끼리 비교하고, 분모가 다르면 통분한 뒤 분자끼리 비교한다.`,
    grade: 'elementary_5', semester: 1, chapter: '약분과 통분', section: '분수의 크기 비교',
    part: 'calc', keywords: '분수,크기 비교,통분,분모,분자,공통분모', conceptCode: 'E5-NUM-07-1', sortOrder: 65, category: 'concept',
  },

  // --- 5-1 다각형의 둘레와 넓이 > 단위넓이 ---
  {
    title: '넓이의 단위와 단위넓이',
    fullContent: `(1) 단위넓이의 뜻
넓이를 잴 때 기준이 되는 정사각형의 넓이를 단위넓이라고 한다.
한 변의 길이가 $1$ cm인 정사각형의 넓이를 $1$ cm²라고 쓰고, $1$ 제곱센티미터라고 읽는다.

(2) 넓이 구하기의 기본
어떤 도형의 넓이는 그 도형 안에 단위넓이가 몇 개 들어가는지를 세어 구한다.
예) 가로 $3$ cm, 세로 $2$ cm인 직사각형 안에는 $1$ cm² 정사각형이 $6$개 들어간다. 따라서 넓이는 $6$ cm²이다.

(3) 큰 넓이의 단위
한 변의 길이가 $1$ m인 정사각형의 넓이는 $1$ m²이다.
$1$ m² $= 10000$ cm²이다.
한 변의 길이가 $1$ km인 정사각형의 넓이는 $1$ km²이다.`,
    grade: 'elementary_5', semester: 1, chapter: '다각형의 둘레와 넓이', section: '단위넓이',
    part: 'geo', keywords: '단위넓이,넓이,제곱센티미터,정사각형,cm²,m²', conceptCode: 'E5-GEO-01-3', sortOrder: 175, category: 'concept',
  },

  // --- 5-2 분수의 곱셈 > (자연수)×(분수) ---
  {
    title: '(자연수)×(분수)의 계산 방법',
    fullContent: `(1) (자연수)×(분수)의 뜻
자연수에 분수를 곱하는 것은 자연수의 일부분을 구하는 것이다.
예) $6 \\times \\frac{2}{3}$은 $6$의 $\\frac{2}{3}$만큼을 구하는 것이다.

(2) 계산 방법
자연수에 분수를 곱할 때는 자연수에 분자를 곱한 뒤 분모로 나눈다.
예) $6 \\times \\frac{2}{3} = \\frac{6 \\times 2}{3} = \\frac{12}{3} = 4$

(3) 대분수의 곱셈
대분수가 포함된 곱셈은 대분수를 가분수로 바꾼 뒤 계산한다.
예) $4 \\times 1\\frac{1}{2}$에서 $1\\frac{1}{2} = \\frac{3}{2}$이므로, $4 \\times \\frac{3}{2} = \\frac{12}{2} = 6$이다.

(자연수)×(분수)는 (분수)×(자연수)와 결과가 같다. 곱셈에서는 순서를 바꾸어도 곱이 변하지 않기 때문이다.`,
    grade: 'elementary_5', semester: 2, chapter: '분수의 곱셈', section: '(자연수)×(분수)',
    part: 'calc', keywords: '자연수,분수,곱셈,분자,분모,대분수,가분수', conceptCode: 'E5-NUM-13-4', sortOrder: 133, category: 'concept',
  },

  // --- 5-2 소수의 곱셈 > (소수)×(자연수) ---
  {
    title: '(소수)×(자연수)의 계산 원리',
    fullContent: `(1) (소수)×(자연수)의 뜻
소수에 자연수를 곱하는 것은 소수를 자연수만큼 반복하여 더하는 것과 같다.
예) $0.3 \\times 4$는 $0.3$을 $4$번 더한 것이다. $0.3 + 0.3 + 0.3 + 0.3 = 1.2$

(2) 계산 방법
소수의 곱셈은 소수를 자연수처럼 계산한 뒤 소수점을 찍는다.
예) $1.2 \\times 3$을 계산하려면 먼저 $12 \\times 3 = 36$을 구한다.
$1.2$는 소수 한 자리 수이므로, 곱의 결과에서도 소수점 아래 한 자리에 점을 찍는다.
따라서 $1.2 \\times 3 = 3.6$이다.

(3) 소수 두 자리 수의 곱셈
예) $0.25 \\times 4$에서 $25 \\times 4 = 100$이고, 소수점 아래 두 자리이므로 $0.25 \\times 4 = 1.00 = 1$이다.`,
    grade: 'elementary_5', semester: 2, chapter: '소수의 곱셈', section: '(소수)×(자연수)',
    part: 'calc', keywords: '소수,자연수,곱셈,소수점,자릿수', conceptCode: 'E5-NUM-14-1', sortOrder: 12, category: 'concept',
  },

  // --- 5-2 소수의 곱셈 > (자연수)×(소수) ---
  {
    title: '(자연수)×(소수)의 계산 원리',
    fullContent: `(1) (자연수)×(소수)의 뜻
자연수에 소수를 곱하는 것은 자연수의 일부분을 구하는 것이다.
예) $4 \\times 0.3$은 $4$의 $0.3$배를 구하는 것이다.

(2) 계산 방법
자연수와 소수를 곱할 때도 소수를 자연수처럼 계산한 뒤 소수점을 찍는다.
예) $5 \\times 1.4$에서 $5 \\times 14 = 70$을 먼저 구한다.
$1.4$가 소수 한 자리 수이므로, 결과도 소수 한 자리에 점을 찍어 $5 \\times 1.4 = 7.0 = 7$이다.

(3) 곱셈의 교환법칙
(자연수)×(소수)와 (소수)×(자연수)의 결과는 같다.
예) $3 \\times 0.5 = 1.5$이고, $0.5 \\times 3 = 1.5$이다.
곱셈에서는 두 수의 순서를 바꾸어도 곱이 변하지 않는다. 이를 곱셈의 교환법칙이라고 한다.`,
    grade: 'elementary_5', semester: 2, chapter: '소수의 곱셈', section: '(자연수)×(소수)',
    part: 'calc', keywords: '자연수,소수,곱셈,소수점,교환법칙', conceptCode: 'E5-NUM-14-2', sortOrder: 13, category: 'concept',
  },

  // --- 6-1 소수의 나눗셈 > (자연수)÷(자연수) ---
  {
    title: '(자연수)÷(자연수)의 몫을 소수로 나타내기',
    fullContent: `(1) 나누어떨어지지 않는 나눗셈
자연수끼리 나눌 때 나누어떨어지지 않으면 몫을 소수로 나타낼 수 있다.
예) $7 \\div 4$에서 $7$을 $4$로 나누면 몫이 $1$이고 나머지가 $3$이다. 나머지 $3$을 $4$로 계속 나누면 소수점 아래로 계산이 이어진다.

(2) 계산 방법
① $7 \\div 4$를 세로 나눗셈으로 계산한다.
② 몫의 일의 자리는 $1$이고 나머지는 $3$이다.
③ $3$ 뒤에 $0$을 내려 $30 \\div 4 = 7$ ... $2$를 구한다.
④ $2$ 뒤에 $0$을 내려 $20 \\div 4 = 5$를 구한다.
따라서 $7 \\div 4 = 1.75$이다.

(3) 자연수 나눗셈의 활용
나누어떨어지지 않는 나눗셈의 몫을 소수로 나타내면 정확한 값을 구할 수 있다.
예) 리본 $3$ m를 $4$명이 똑같이 나누면 한 사람이 받는 길이는 $3 \\div 4 = 0.75$ m이다.`,
    grade: 'elementary_6', semester: 1, chapter: '소수의 나눗셈', section: '(자연수)÷(자연수)',
    part: 'calc', keywords: '나눗셈,소수,몫,나머지,세로 나눗셈,소수점', conceptCode: 'E6-NUM-04-3', sortOrder: 42, category: 'concept',
  },

  // --- 6-1 여러 가지 그래프 > 그림그래프 ---
  {
    title: '그림그래프의 개념과 읽는 방법',
    fullContent: `(1) 그림그래프의 뜻
그림그래프는 자료의 수량을 그림의 개수로 나타낸 그래프이다.
그림 한 개가 나타내는 수량을 정하고, 그 수량만큼 그림을 반복하여 그린다.

(2) 그림그래프 읽기
그림그래프를 읽을 때는 먼저 그림 한 개가 나타내는 수량을 확인한다.
예) 그림 한 개가 $10$명을 나타낼 때, 그림이 $3$개이면 $30$명을 뜻한다.
그림의 반쪽은 해당 수량의 절반을 나타낸다. 반쪽이 있으면 $5$명을 더한 것이다.

(3) 그림그래프의 장점
그림그래프는 자료의 많고 적음을 한눈에 비교할 수 있다.
수가 크면 그림 한 개가 나타내는 수량을 크게 정하고, 수가 작으면 작게 정하면 된다.
예) 나라별 인구를 나타낼 때 그림 하나를 $100$만 명으로 정하면 큰 수도 간단하게 나타낼 수 있다.`,
    grade: 'elementary_6', semester: 1, chapter: '여러 가지 그래프', section: '그림그래프',
    part: 'data', keywords: '그림그래프,수량,그래프,자료,비교', conceptCode: 'E6-STA-03-1', sortOrder: 145, category: 'concept',
  },

  // --- 6-2 원기둥, 원뿔, 구 > 구 ---
  {
    title: '구의 특징과 구성 요소',
    fullContent: `(1) 구의 정의
원을 지름을 기준으로 한 바퀴 돌리면 만들어지는 입체도형을 구라고 한다.
구는 어디에서 보아도 원 모양으로 보이는 둥근 입체도형이다.
예) 축구공, 지구본, 구슬 등은 구의 모양이다.

(2) 구의 구성 요소
구의 가장 안쪽 중심점을 구의 중심이라고 한다.
구의 중심에서 구의 겉면까지의 거리를 반지름이라고 한다.
구의 중심을 지나면서 겉면의 두 점을 잇는 선분을 지름이라고 한다.
지름은 반지름의 $2$배이다.

(3) 구의 특징
구는 밑면이 없으며, 꼭짓점과 모서리도 없다.
구를 어떤 방향으로 자르더라도 자른 단면은 항상 원이 된다.
구의 중심을 지나도록 자르면 가장 큰 원이 생기며, 이 원의 반지름은 구의 반지름과 같다.`,
    grade: 'elementary_6', semester: 2, chapter: '원기둥, 원뿔, 구', section: '구',
    part: 'geo', keywords: '구,중심,반지름,지름,입체도형,단면,원', conceptCode: 'E6-GEO-09-1', sortOrder: 195, category: 'concept',
  },
];

// ============================================================
// Gemini 빈칸 추출 함수 (기존 스크립트와 동일 로직)
// ============================================================
async function extractTerms(title: string, content: string): Promise<{ term: string; difficulty: 'easy' | 'hard' }[]> {
  const prompt = `당신은 한국 수학 교육 전문가입니다.
아래 수학 개념의 본문(fullContent)을 읽고, 빈칸 학습에 적합한 핵심 용어를 추출해주세요.

## 규칙
- easy: 이 개념의 가장 핵심이 되는 고유 용어 (정의명, 공식 구성요소, 핵심 키워드). 3~8개.
- hard: 부차적이지만 학습에 중요한 용어 (성질, 조건, 관계 용어). 최소 2개.
- easy 개수와 hard 개수가 동일하면 안 됩니다.
- 원문에 정확히 등장하는 문자열만 선택하세요. 조사는 제외하세요.
- $...$ 로 감싸진 수식은 $기호를 포함하여 통째로 선택하세요.
- ①②③ 같은 번호, (1)(2) 같은 번호 패턴, □▢ 같은 도형 기호는 선택하지 마세요.
- 중복 금지: 같은 용어를 easy와 hard에 동시에 넣지 마세요.

## 개념 제목
${title}

## 본문
${content}

## 출력 형식 (JSON)
{ "blanks": [{ "term": "용어", "difficulty": "easy" }, ...] }`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object' as any,
        properties: {
          blanks: {
            type: 'array' as any,
            items: {
              type: 'object' as any,
              properties: {
                term: { type: 'string' as any },
                difficulty: { type: 'string' as any, enum: ['easy', 'hard'] },
              },
              required: ['term', 'difficulty'],
            },
          },
        },
        required: ['blanks'],
      },
    },
  });

  const text = response.text || '';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return parsed.blanks || [];
}

async function generateBlankForConcept(conceptId: string, title: string, fullContent: string) {
  try {
    const terms = await extractTerms(title, fullContent);
    if (terms.length === 0) {
      console.log(`  ⚠ ${title}: Gemini가 용어를 추출하지 못함, 건너뜀`);
      return null;
    }

    let exercise = buildMergedExercise(fullContent, terms, { mergeSameTerms: false });
    exercise = addFullSentenceBlanks(exercise);

    if (exercise.blanks.length === 0) {
      console.log(`  ⚠ ${title}: 빈칸 생성 실패, 건너뜀`);
      return null;
    }

    // 기존 빈칸 삭제 후 새로 생성
    await prisma.blankExercise.deleteMany({ where: { conceptId } });
    const created = await prisma.blankExercise.create({
      data: {
        conceptId,
        level: 1,
        templateText: exercise.templateText,
        blanks: exercise.blanks as any,
      },
    });

    const easyCount = exercise.blanks.filter((b: any) => b.difficulty === 'easy').length;
    const hardCount = exercise.blanks.filter((b: any) => b.difficulty === 'hard').length;
    const fullCount = exercise.blanks.filter((b: any) => b.difficulty === 'full').length;
    console.log(`  ✓ ${title}: easy=${easyCount}, hard=${hardCount}, full=${fullCount}`);
    return created;
  } catch (err: any) {
    console.log(`  ✗ ${title}: ${err.message}`);
    return null;
  }
}

// ============================================================
// 메인 실행
// ============================================================
async function main() {
  console.log('=== 초등 개념 종합 수정 시작 ===\n');

  // ---- 1단계: Section 재배정 ----
  console.log('--- 1단계: Section 재배정 ---');
  const sectionFixIds: string[] = [];
  for (const fix of sectionFixes) {
    const concept = await prisma.concept.findFirst({ where: { conceptCode: fix.conceptCode } });
    if (!concept) {
      console.log(`  ✗ ${fix.conceptCode}: 개념 없음`);
      continue;
    }
    await prisma.concept.update({
      where: { id: concept.id },
      data: { section: fix.newSection },
    });
    sectionFixIds.push(concept.id);
    console.log(`  ✓ ${fix.conceptCode} "${concept.title}" → section="${fix.newSection}"`);
  }
  console.log(`  완료: ${sectionFixIds.length}건 수정\n`);

  // ---- 2단계: 콘텐츠 품질 개선 ----
  console.log('--- 2단계: 콘텐츠 품질 개선 ---');
  const qualityFixIds: string[] = [];
  for (const fix of qualityFixes) {
    const concept = await prisma.concept.findFirst({ where: { conceptCode: fix.conceptCode } });
    if (!concept) {
      console.log(`  ✗ ${fix.conceptCode}: 개념 없음`);
      continue;
    }
    const updateData: any = { fullContent: fix.fullContent };
    if (fix.keywords) updateData.keywords = fix.keywords;
    await prisma.concept.update({ where: { id: concept.id }, data: updateData });
    qualityFixIds.push(concept.id);
    console.log(`  ✓ ${fix.conceptCode} "${concept.title}" → fullContent 업데이트 (${fix.fullContent.length}자)`);
  }
  console.log(`  완료: ${qualityFixIds.length}건 수정\n`);

  // ---- 3단계: 신규 개념 추가 ----
  console.log('--- 3단계: 신규 개념 추가 ---');

  // 학년별 subjectId 매핑
  const subjectMap: Record<string, string> = {
    elementary_3: 'cmn5vrgh00000vdjgqr6vubb5',
    elementary_4: 'cmn5vrht4000rvdjgsb823rej',
    elementary_5: 'cmn5vrk8p0026vdjgf9ysrq0h',
    elementary_6: 'cmn5vrmlc003jvdjgawtxum5b',
  };

  const newConceptIds: { id: string; title: string; fullContent: string }[] = [];
  for (const nc of newConcepts) {
    // 중복 확인
    const existing = await prisma.concept.findFirst({ where: { conceptCode: nc.conceptCode } });
    if (existing) {
      console.log(`  ⚠ ${nc.conceptCode}: 이미 존재, 건너뜀`);
      continue;
    }
    const subjectId = subjectMap[nc.grade];
    if (!subjectId) {
      console.log(`  ✗ ${nc.conceptCode}: subjectId를 찾을 수 없음 (${nc.grade})`);
      continue;
    }
    const created = await prisma.concept.create({
      data: {
        title: nc.title,
        fullContent: nc.fullContent,
        grade: nc.grade,
        semester: nc.semester,
        chapter: nc.chapter,
        section: nc.section,
        sectionSub: null,
        part: nc.part,
        keywords: nc.keywords,
        conceptCode: nc.conceptCode,
        sortOrder: nc.sortOrder,
        category: nc.category,
        source: null,
        subjectId,
      },
    });
    newConceptIds.push({ id: created.id, title: nc.title, fullContent: nc.fullContent });
    console.log(`  ✓ ${nc.conceptCode} "${nc.title}" (${nc.grade} ${nc.semester}학기 > ${nc.chapter} > ${nc.section})`);
  }
  console.log(`  완료: ${newConceptIds.length}건 추가\n`);

  // ---- 4단계: 빈칸 재생성 ----
  console.log('--- 4단계: 빈칸 재생성 ---');

  // 품질 개선 개념 + 신규 개념에 대해 빈칸 생성
  const allTargets: { id: string; title: string; fullContent: string }[] = [];

  // 품질 개선된 개념
  for (const fix of qualityFixes) {
    const concept = await prisma.concept.findFirst({
      where: { conceptCode: fix.conceptCode },
      select: { id: true, title: true, fullContent: true },
    });
    if (concept) allTargets.push(concept);
  }

  // 신규 개념
  allTargets.push(...newConceptIds);

  console.log(`  대상: ${allTargets.length}개 개념\n`);

  // 5개씩 배치 처리 (Gemini rate limit 대응)
  const BATCH_SIZE = 5;
  let successCount = 0;
  for (let i = 0; i < allTargets.length; i += BATCH_SIZE) {
    const batch = allTargets.slice(i, i + BATCH_SIZE);
    console.log(`  [배치 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allTargets.length / BATCH_SIZE)}]`);

    for (const target of batch) {
      const result = await generateBlankForConcept(target.id, target.title, target.fullContent);
      if (result) successCount++;
    }

    // 배치 간 딜레이
    if (i + BATCH_SIZE < allTargets.length) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  console.log(`\n=== 완료 ===`);
  console.log(`Section 재배정: ${sectionFixIds.length}건`);
  console.log(`품질 개선: ${qualityFixIds.length}건`);
  console.log(`신규 추가: ${newConceptIds.length}건`);
  console.log(`빈칸 생성: ${successCount}/${allTargets.length}건 성공`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
