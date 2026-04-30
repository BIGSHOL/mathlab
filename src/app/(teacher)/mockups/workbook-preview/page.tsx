'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookText, Plus } from 'lucide-react';
import { CoverPage } from '@/components/workbook-print/CoverPage';
import { TocPage } from '@/components/workbook-print/TocPage';
import { SectionDivider } from '@/components/workbook-print/SectionDivider';
import { QuestionBlock } from '@/components/workbook-print/QuestionBlock';
import { ConceptBlock } from '@/components/workbook-print/ConceptBlock';
import { AnswerSpaceBlock } from '@/components/workbook-print/AnswerSpaceBlock';
import { Button } from '@/components/ui/Button';
import { ANSWER_SPACE_PX } from '@/lib/utils/print-estimate';
import type { AnswerSpaceSize } from '@/lib/utils/print-estimate';
import type { NormalizedItem } from '@/lib/services/workbook/sources';

const ACCENT_COLORS = [
  { name: '파랑', value: '#135bec' },
  { name: '주황', value: '#F97316' },
  { name: '초록', value: '#10b981' },
  { name: '보라', value: '#8b5cf6' },
  { name: '핑크', value: '#ec4899' },
];

const ANSWER_SIZES: { size: AnswerSpaceSize; label: string }[] = [
  { size: 'NONE', label: '없음 (0mm)' },
  { size: 'SMALL', label: '작게 (20mm)' },
  { size: 'MEDIUM', label: '보통 (45mm)' },
  { size: 'LARGE', label: '크게 (80mm)' },
  { size: 'XLARGE', label: '매우 크게 (120mm)' },
];

// 데모 데이터 — DB 없이 보여주는 샘플
const DEMO_MULTIPLE: NormalizedItem = {
  itemId: 'demo-q1',
  kind: 'QUESTION',
  displayNumber: '1.',
  questionContent: '이차방정식 $x^2 - 5x + 6 = 0$의 두 근을 $\\alpha$, $\\beta$라 할 때, $\\alpha + \\beta$의 값을 구하시오.',
  choices: ['$1$', '$3$', '$5$', '$6$', '$7$'],
  choiceColumns: 2,
  answer: '$5$',
  difficulty: 'MEDIUM',
  questionType: 'MULTIPLE_CHOICE',
  answerSpace: 'SMALL',
};

const DEMO_SHORT: NormalizedItem = {
  itemId: 'demo-q-short',
  kind: 'QUESTION',
  displayNumber: '2.',
  questionContent: '$x^2 + 4x - 12 = 0$ 의 두 근의 합을 구하시오.',
  difficulty: 'MEDIUM',
  questionType: 'SHORT_ANSWER',
  answerSpace: 'MEDIUM',
};

const DEMO_ESSAY: NormalizedItem = {
  itemId: 'demo-q2',
  kind: 'QUESTION',
  displayNumber: '3.',
  questionContent: '함수 $f(x) = x^3 - 3x^2 + 2$의 극값을 모두 구하고, 그래프의 개형을 그리시오.',
  difficulty: 'HIGH',
  questionType: 'ESSAY',
  answerSpace: 'XLARGE',
};

const CONCEPT_FULL = `이차방정식 $ax^2 + bx + c = 0$ ($a \\neq 0$)의 두 근을 $\\alpha$, $\\beta$라 할 때, 다음이 성립한다.

- 두 근의 합: $\\alpha + \\beta = -\\dfrac{b}{a}$
- 두 근의 곱: $\\alpha \\beta = \\dfrac{c}{a}$

이를 **근과 계수의 관계**라고 한다. 이 관계는 두 근을 직접 구하지 않고도 그 합과 곱을 알 수 있게 해 주는 강력한 도구이다.`;

const CONCEPT_BLANK_EASY = `이차방정식 $ax^2 + bx + c = 0$ ($a \\neq 0$)의 두 근을 $\\alpha$, $\\beta$라 할 때, 다음이 성립한다.

- 두 근의 합: $\\alpha + \\beta = -\\dfrac{b}{a}$
- 두 근의 곱: $\\alpha \\beta = \\dfrac{c}{a}$

이를 **＿＿＿＿＿**라고 한다. 이 관계는 두 근을 직접 구하지 않고도 그 합과 곱을 알 수 있게 해 주는 강력한 도구이다.`;

const CONCEPT_BLANK_HARD = `＿＿＿＿＿ $ax^2 + bx + c = 0$ ($a \\neq 0$)의 두 근을 $\\alpha$, $\\beta$라 할 때, 다음이 ＿＿＿＿＿한다.

- 두 근의 ＿＿＿＿＿: $\\alpha + \\beta = -\\dfrac{b}{a}$
- 두 근의 ＿＿＿＿＿: $\\alpha \\beta = \\dfrac{c}{a}$

이를 **＿＿＿＿＿**라고 한다. 이 ＿＿＿＿＿는 두 근을 직접 ＿＿＿＿＿ 않고도 그 합과 곱을 알 수 있게 해 주는 강력한 도구이다.`;

const DEMO_CONCEPT: NormalizedItem = {
  itemId: 'demo-c1',
  kind: 'CONCEPT_DOC',
  displayNumber: '',
  documentTitle: '이차방정식의 근과 계수의 관계',
  documentMarkdown: CONCEPT_FULL,
  answerSpace: 'NONE',
};

type DemoTab = 'cover' | 'toc' | 'divider' | 'question' | 'concept' | 'concept-blank' | 'answer-space';

export default function WorkbookPreviewMockup() {
  const [tab, setTab] = useState<DemoTab>('answer-space');
  const [accent, setAccent] = useState('#135bec');
  const [blankLevel, setBlankLevel] = useState<0 | 1 | 2>(0);

  return (
    <div className="flex-1 p-6 md:p-10 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/mockups" className="p-1.5 rounded-sm hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <BookText className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">워크북 컴포넌트 미리보기</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              풀이공간/표지/목차/챕터구분 등 핵심 컴포넌트를 DB 없이 시연합니다
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/workbooks">
            <Button variant="ghost" size="sm">실제 워크북 목록</Button>
          </Link>
          <Link href="/workbooks/new">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              새 워크북
            </Button>
          </Link>
        </div>
      </div>

      {/* 색상 선택 */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-white rounded-sm border border-slate-200">
        <span className="text-sm font-bold text-slate-700">테마 색상</span>
        <div className="flex gap-2">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setAccent(c.value)}
              className={`w-8 h-8 rounded-sm transition ${
                accent === c.value ? 'ring-2 ring-offset-2 ring-slate-400' : ''
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
              aria-label={c.name}
            />
          ))}
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {([
          { id: 'answer-space', label: '풀이공간 4단계' },
          { id: 'cover', label: '표지' },
          { id: 'toc', label: '목차' },
          { id: 'divider', label: '챕터 구분' },
          { id: 'question', label: '문항 + 풀이공간' },
          { id: 'concept', label: '개념 문서' },
          { id: 'concept-blank', label: '개념 + 빈칸 학습' },
        ] as { id: DemoTab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-colors ${
              tab === t.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Demo Area */}
      <div className="bg-slate-100 p-6 rounded-sm">
        {tab === 'answer-space' && (
          <AnswerSpaceDemo accent={accent} />
        )}

        {tab === 'cover' && (
          <DemoFrame>
            <CoverPage
              title="1학기 중간고사 대비 워크북"
              subtitle="중2 대수 영역"
              studentLabel="중2-A반 / 김철수"
              semesterLabel="2026년 1학기"
              academyName="인재원"
              ownerName="홍길동 원장"
              accentColor={accent}
            />
          </DemoFrame>
        )}

        {tab === 'toc' && (
          <DemoFrame>
            <TocPage
              accentColor={accent}
              entries={[
                { sectionId: 's1', title: '1단원: 다항식의 곱셈', pageNumber: 3 },
                { sectionId: 's2', title: '2단원: 인수분해', pageNumber: 12 },
                { sectionId: 's3', title: '3단원: 이차방정식', pageNumber: 21 },
                { sectionId: 's4', title: '4단원: 함수의 극한', pageNumber: 35 },
                { sectionId: 's5', title: '5단원: 미분의 활용', pageNumber: 48 },
              ]}
            />
          </DemoFrame>
        )}

        {tab === 'divider' && (
          <DemoFrame>
            <SectionDivider
              index={3}
              title="이차방정식"
              description="근의 공식, 판별식, 근과 계수의 관계를 학습합니다"
              accentColor={accent}
            />
          </DemoFrame>
        )}

        {tab === 'question' && (
          <DemoFrame>
            <div className="bg-white px-12 py-8" style={{ width: '210mm' }}>
              <h3 className="font-bold text-slate-900 mb-4 pb-2 border-b" style={{ borderColor: accent }}>
                문항 유형별 답안 입력란 자동 분기 + 풀이공간
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-1.5">
                    객관식(MULTIPLE_CHOICE) → ①②③④⑤ 마킹칸 + SMALL 풀이공간
                  </div>
                  <QuestionBlock item={DEMO_MULTIPLE} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-1.5">
                    단답형(SHORT_ANSWER) → 정답 한 줄 밑줄 + MEDIUM 풀이공간
                  </div>
                  <QuestionBlock item={DEMO_SHORT} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-1.5">
                    서술형(ESSAY) → 답안란 없음, XLARGE 풀이공간이 곧 답안 영역
                  </div>
                  <QuestionBlock item={DEMO_ESSAY} />
                </div>
              </div>
            </div>
          </DemoFrame>
        )}

        {tab === 'concept' && (
          <DemoFrame>
            <div className="bg-white px-12 py-8" style={{ width: '210mm' }}>
              <ConceptBlock item={DEMO_CONCEPT} />
            </div>
          </DemoFrame>
        )}

        {tab === 'concept-blank' && (
          <div className="space-y-3">
            <div className="bg-white border border-slate-200 rounded-sm p-3 flex items-center gap-3">
              <span className="text-sm font-bold text-slate-700">빈칸 레벨</span>
              <div className="flex gap-1.5">
                {([
                  { v: 0 as const, label: '0: 없음' },
                  { v: 1 as const, label: '1: 쉬움' },
                  { v: 2 as const, label: '2: 어려움' },
                ]).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setBlankLevel(opt.v)}
                    className={`px-3 py-1.5 rounded-sm text-xs font-bold transition ${
                      blankLevel === opt.v
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-500 ml-auto">
                기존 BlankExercise 레코드 활용 (level 1=easy, 2=hard) — 인쇄 시 ＿＿＿＿＿로 치환
              </span>
            </div>
            <DemoFrame>
              <div className="bg-white px-12 py-8" style={{ width: '210mm' }}>
                <ConceptBlock
                  item={{
                    ...DEMO_CONCEPT,
                    documentMarkdown:
                      blankLevel === 0
                        ? CONCEPT_FULL
                        : blankLevel === 1
                          ? CONCEPT_BLANK_EASY
                          : CONCEPT_BLANK_HARD,
                  }}
                />
              </div>
            </DemoFrame>
          </div>
        )}
      </div>

      {/* 정보 카드 */}
      <div className="mt-6 bg-white rounded-sm border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900 mb-3">워크북 시스템 정보</h3>
        <ul className="text-sm text-slate-600 space-y-1.5">
          <li>• <strong>풀이공간 슬롯</strong>: NONE(0mm) / SMALL(20mm·76px) / MEDIUM(45mm·170px) / LARGE(80mm·302px) / XLARGE(120mm·453px)</li>
          <li>• <strong>컨텐츠 소스</strong>: MVP는 시험·문제·개념 3종 (이후 연산숙제·기출·문제숙제 추가)</li>
          <li>• <strong>책 형식</strong>: 표지 → 목차 (2-pass 페이지번호) → 챕터 구분 → 본문 + 풀이공간</li>
          <li>• <strong>인쇄</strong>: 브라우저 @media print, 서버 PDF 라이브러리 미사용</li>
          <li>• <strong>장바구니</strong>: 시험·문제·개념 페이지의 &quot;워크북에 추가&quot; 버튼으로 워크북에 담기</li>
          <li>• <strong>개념 빈칸 연동</strong>: 워크북 상세에서 개념 항목별 빈칸 레벨(0~2) 선택 → 기존 BlankExercise.templateText의 <code>{'{{N}}'}</code> placeholder를 ＿＿＿＿＿로 치환하여 인쇄</li>
          <li>• <strong>답안 입력란 자동화</strong>: Question.type 컬럼만으로 객관식 마킹칸/단답 밑줄/서술형(없음) 자동 분기</li>
        </ul>
      </div>
    </div>
  );
}

function DemoFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-white shadow-lg mx-auto overflow-hidden"
      style={{ width: '210mm', maxWidth: '100%' }}
    >
      <div style={{ height: '297mm', maxHeight: '80vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

function AnswerSpaceDemo({ accent }: { accent: string }) {
  return (
    <div className="bg-white px-12 py-8 mx-auto" style={{ width: '210mm', maxWidth: '100%' }}>
      <h3 className="font-bold text-slate-900 mb-2 pb-2 border-b" style={{ borderColor: accent }}>
        풀이공간 4단계 슬롯
      </h3>
      <p className="text-xs text-slate-500 mb-6">
        문항마다 수동으로 선택할 수 있고, 자동 추천 로직(객관식 → SMALL, 서술형 HIGH → XLARGE 등)도 제공됩니다.
      </p>
      <div className="space-y-5">
        {ANSWER_SIZES.map(({ size, label }) => (
          <div key={size}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700">{label}</span>
              <span className="text-xs text-slate-400 font-mono">{ANSWER_SPACE_PX[size]}px</span>
            </div>
            <AnswerSpaceBlock size={size} showLabel />
          </div>
        ))}
      </div>
    </div>
  );
}
