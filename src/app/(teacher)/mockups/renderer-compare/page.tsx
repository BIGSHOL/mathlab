'use client';

import { MathRenderer } from '@/components/math/MathRenderer';
import { EditableMathRenderer } from '@/components/math/EditableMathRenderer';

interface TestCase {
  title: string;
  description: string;
  content: string;
}

const TEST_CASES: TestCase[] = [
  {
    title: '1. HTML entity (&nbsp;)',
    description: '두 렌더러 모두 비분리 공백으로 디코딩되어야 함',
    content: '문제 A &nbsp;&nbsp; 문제 B &nbsp; 끝',
  },
  {
    title: '2. \\dfrac → \\frac 자동 변환',
    description: '인라인 수식의 \\dfrac은 거대분수 방지를 위해 \\frac으로 변환',
    content: '인라인 수식: $\\dfrac{1}{2} + \\dfrac{3}{4}$ 의 결과는?',
  },
  {
    title: '3. 인접 인라인 수식 글루 ($A$$B$)',
    description: '$A$$B$ → $A$ $B$ 자동 분리',
    content: '연속된 수식: $a+b$$c+d$ 가 분리되어야 함',
  },
  {
    title: '4. \\(\\) → $...$ 변환',
    description: 'LaTeX \\(\\) 표기를 $로 변환',
    content: '변환 대상: \\(x^2 + y^2 = z^2\\) 가 렌더링되어야 함',
  },
  {
    title: '5. 유니코드 수학 기호 (℃, Ω, ㎏)',
    description: 'KaTeX 미지원 유니코드를 LaTeX 명령어로 변환',
    content: '온도 $25℃$, 저항 $5Ω$, 무게 $3㎏$',
  },
  {
    title: '6. blockquote 계산식 (마커 없음, 1열)',
    description: '<보기> 마커가 없으면 모든 줄을 세로 1열로 렌더링',
    content: `다음 계산 과정을 보시오:

> $(+5)+(-1/3)+(-7)+(+4/3)$
> $=(+5)+(-7)+(-1/3)+(+4/3)$ ㉠
> $=\\{(+5)+(-7)\\}+\\{(-1/3)+(+4/3)\\}$ ㉡
> $=(-2)+(+1)=-1$`,
  },
  {
    title: '7. blockquote <보기> 마커 (2열 그리드)',
    description: '<보기> 마커가 있으면 항목 수에 따라 그리드',
    content: `다음 보기에서 고르시오:

> <보기>
> ㄱ. $a > 0$
> ㄴ. $b < 0$
> ㄷ. $a + b = 1$
> ㄹ. $ab \\neq 0$`,
  },
  {
    title: '8. 다단계 aligned 수식',
    description: '인라인 수식 안의 multi-line 환경은 자동으로 블록으로 승격',
    content: '계산: $\\begin{aligned} &x + y = 5 \\\\ &x - y = 1 \\\\ &\\therefore x = 3 \\end{aligned}$',
  },
  {
    title: '9. 백슬래시 이스케이프 (\\<, \\>)',
    description: '마크다운 이스케이프된 부등호',
    content: '범위: $a$ \\< $x$ \\< $b$ 일 때',
  },
  {
    title: '10. RPM #475 실제 케이스 (긴 해설)',
    description: '실제 DB 데이터 — 5개 객관식 풀이가 길게 나열',
    content: `① $\\frac{1}{2} + \\left(-\\frac{1}{2}\\right)^2 \\div \\left(\\frac{5}{6} - \\frac{4}{3}\\right) - 2 = -2$

② $\\left(-\\frac{1}{4}\\right)^2 \\times 8 - 3 \\div \\left(\\frac{2}{3} + \\frac{5}{6}\\right) = -\\frac{3}{2}$

③ $-\\frac{3}{4} - \\left[-\\frac{1}{5} - \\left\\{-\\frac{3}{4} + \\frac{1}{2}\\right\\}\\right] = -\\frac{4}{5}$

따라서 계산 결과가 가장 큰 것은 ③이다.`,
  },
  {
    title: '11. 답: 한 줄 출력',
    description: '간단한 답 표기',
    content: '답: ③',
  },
  {
    title: '12. **bold** 마크다운',
    description: '굵은 글씨 처리',
    content: '**중요한 부분**입니다. **굵은 $a^2$ 텍스트** 도 가능.',
  },
];

function CompareCard({ tc }: { tc: TestCase }) {
  return (
    <div className="border border-slate-300 rounded-sm bg-white">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="font-semibold text-slate-800">{tc.title}</div>
        <div className="text-xs text-slate-600 mt-0.5">{tc.description}</div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-slate-200">
        <div className="p-4">
          <div className="text-xs font-medium text-blue-700 mb-2">MathRenderer (조회)</div>
          <div className="border border-blue-200 rounded-sm p-3 bg-blue-50/30 min-h-[80px]">
            <MathRenderer content={tc.content} />
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs font-medium text-green-700 mb-2">EditableMathRenderer (편집 미리보기)</div>
          <div className="border border-green-200 rounded-sm p-3 bg-green-50/30 min-h-[80px]">
            <EditableMathRenderer content={tc.content} />
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50">
        <details className="text-xs">
          <summary className="cursor-pointer text-slate-600 hover:text-slate-900">원본 마크다운</summary>
          <pre className="mt-2 p-2 bg-slate-100 rounded-sm text-slate-700 whitespace-pre-wrap">{tc.content}</pre>
        </details>
      </div>
    </div>
  );
}

export default function RendererComparePage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">렌더러 비교 — 뷰 일관성 검증</h1>
        <p className="text-sm text-slate-600 mt-1">
          MathRenderer (조회 모드) vs EditableMathRenderer (편집 모드) 같은 입력에 대한 출력을 좌우 비교.
          공유 전처리 유틸 적용 후 두 렌더러의 결과가 동일해야 함.
        </p>
      </div>

      {TEST_CASES.map((tc, i) => (
        <CompareCard key={i} tc={tc} />
      ))}
    </div>
  );
}
