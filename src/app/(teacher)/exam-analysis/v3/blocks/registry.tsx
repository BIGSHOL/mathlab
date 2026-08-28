/**
 * 총평 블록 레지스트리 — 모듈식 템플릿의 심장.
 *
 * 각 블록은 `variants` 배열을 갖고, 사용자가 고른 variant 하나가 렌더된다.
 * 새 표현을 추가하려면 해당 블록의 variants 에 항목 하나만 밀어 넣으면 된다.
 *
 * ⚠️ 캡처 단위 규칙 (blocks/types.ts 참고):
 *   render 는 **최상위 요소** 또는 여러 최상위 요소를 담은 **Fragment** 를 반환할 것.
 *   여러 요소를 <div> 로 감싸면 블로그 이미지가 하나로 합쳐진다.
 *
 * ⚠️ 색상은 반드시 CSS 토큰(var(--v3-*)) 사용. 하드코딩 hex 를 쓰면 테마 전환이 무력화된다.
 */

import { Fragment } from 'react';
import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { weightedAverageDifficulty } from '@/lib/exam-analysis/difficulty';
import { renderInlineMath } from '@/lib/exam-analysis/rendering';
import { normalizeFeatureCallout } from '@/lib/exam-analysis/feature-callout';
import type {
  BlockRenderProps,
  CommentaryBlockDef,
  BlockMeta,
} from '@/lib/exam-analysis/blocks/types';

import { markdownToHighlighted, normDiff, koDifficultyText, V3_DIFF_COLORS, V3_DIFF_LABELS } from '../helpers';
import { FeatureCallout } from '../FeatureCallout';
import { QASection } from '../QASection';
import type { DataBoxStyle } from '../DataBox';
import { DifficultyStackedBar } from '../DifficultyStackedBar';
import { FormatBreakdown } from '../FormatBreakdown';
import { KillerMap } from '../KillerMap';
import { DifficultyNumericTable } from '../DifficultyNumericTable';
import { QuestionDotMatrix } from '../QuestionDotMatrix';
import { V3DifficultyTable } from '../V3DifficultyTable';
import { V3MainAnalysis } from '../V3MainAnalysis';
import { V3KeyQuestions } from '../V3KeyQuestions';
import { V3PreviousComparison } from '../V3PreviousComparison';
import { V3FinalStrategy } from '../V3FinalStrategy';

// ── 공유 계산 ──

interface Kpis {
  weighted: number;
  killerPct: number;
  essayCount: number;
  correctRate: number | null;
}

function computeKpis(questions: AnalyzedQuestion[]): Kpis {
  const counts = [0, 0, 0, 0, 0];
  for (const q of questions) {
    const lv = Number(normDiff(String(q.difficulty)));
    if (lv >= 1 && lv <= 5) counts[lv - 1]++;
  }
  const total = counts.reduce((s, c) => s + c, 0);
  const answered = questions.filter((q) => q.is_correct !== null);
  return {
    weighted: weightedAverageDifficulty(questions).avg,
    killerPct: total > 0 ? Math.round((counts[4] / total) * 100) : 0,
    essayCount: questions.filter((q) => q.question_format === 'essay').length,
    correctRate:
      answered.length === 0
        ? null
        : Math.round((answered.filter((q) => q.is_correct === true).length / answered.length) * 100),
  };
}

function kicker(c: CommentaryResult, meta: BlockMeta): string {
  return (
    c.blog_kicker ||
    (meta.schoolName ? `시험 분석 · ${meta.schoolName} ${meta.examTitle}` : `시험 분석 · ${meta.examTitle}`)
  );
}

function analyzedDate(meta: BlockMeta): string {
  return meta.analyzedAt ? meta.analyzedAt.slice(0, 10) : '';
}

/** 차트 문자열 → img src (base64면 data URI prefix) */
function toSrc(s?: string): string | undefined {
  if (!s) return undefined;
  if (s.startsWith('data:') || s.startsWith('http')) return s;
  return `data:image/png;base64,${s}`;
}

/**
 * 블록 루트에 심는 캡처용 데이터 속성.
 *
 * 블로그 이미지 복사 시 각 이미지 아래에 붙는 **검색 노출용 텍스트**를 여기서 공급한다.
 * 없으면 캡처 쪽이 DOM 휴리스틱(heading + 첫 문장)으로 폴백하므로,
 * 레지스트리가 직접 루트 요소를 만드는 블록에만 붙이면 된다.
 * (FeatureCallout·QASection 처럼 별도 컴포넌트가 루트를 만드는 블록은 폴백에 맡긴다 —
 *  그쪽은 heading/문단이 뚜렷해서 휴리스틱 결과가 충분히 좋다.)
 */
function blockAttrs(id: string, summary: string) {
  return { 'data-block-id': id, 'data-block-summary': summary || undefined };
}

// 요약 문구는 def.summary 와 렌더 속성이 **같은 함수**를 공유한다 (두 곳에 복붙하면 반드시 어긋난다).
const summaryHeader = ({ commentary, meta }: BlockRenderProps) =>
  commentary.blog_dek ? koDifficultyText(commentary.blog_dek).slice(0, 140) : `${meta.examTitle} 시험 분석`;

const summaryKpi = ({ questions, meta }: BlockRenderProps) => {
  const k = computeKpis(questions);
  const last = k.correctRate !== null ? `정답률 ${k.correctRate}%` : `총 배점 ${meta.totalPoints}점`;
  return `핵심 지표 — 평균 난이도 ${k.weighted.toFixed(1)}/5, 킬러 비중 ${k.killerPct}%, 서술형 ${k.essayCount}문항, ${last}.`;
};

const summaryInfographic = ({ meta }: BlockRenderProps) =>
  `한눈에 보는 ${meta.totalQuestions}문항의 구조 — 난이도·문제 형식·문항 위치를 시각화했습니다.`;

const summaryDifficultyTable = () =>
  '문항별 난이도·단원·배점 상세 — 어떤 문항이 어느 단원에서 몇 점인지 정리했습니다.';

const summaryPullQuote = ({ commentary }: BlockRenderProps) =>
  commentary.pull_quote?.text ? koDifficultyText(commentary.pull_quote.text).slice(0, 140) : '';

const summaryCharts = () => '분석 차트 — 난이도 분포·능력 영역·단원별 출제 현황·변별력 지수.';

/**
 * Q&A — variant 마다 데이터 박스 표현이 다르다.
 * Q&A 는 문서당 4개 섹션이고 각각 데이터 박스를 하나씩 갖는다 → 지면 면적을 가장 많이 차지한다.
 * 여기가 안 갈라지면 골격·팔레트를 바꿔도 "같은 문서" 로 읽힌다 (2026-07-23 사용자 지적).
 */
function renderQA(props: BlockRenderProps, dataBoxStyle: DataBoxStyle) {
  const start = parseInt(props.sectionNum, 10) || 2;
  return (
    <>
      {props.commentary.blog_qa?.map((qa, idx) => (
        <QASection
          key={`qa-${idx}`}
          qa={qa}
          sectionNum={String(start + idx).padStart(2, '0')}
          qaIndex={idx}
          subLabel={props.copy.qaSubLabel(idx + 1)}
          dataBoxStyle={dataBoxStyle}
        />
      ))}
    </>
  );
}

/** 결론 — 두 variant 가 수식 클래스만 다르고 내용은 동일 */
function renderConclusion(props: BlockRenderProps, extraClass: string) {
  const c = props.commentary.conclusion;
  if (!c?.body) return null;
  return (
    <div className={`v3-conclusion${extraClass}`} {...blockAttrs('conclusion', summaryConclusion(props))}>
      <div className="v3-conclusion-sub">{c.kicker || props.copy.conclusionKicker}</div>
      <h3>{props.copy.conclusionTitle}</h3>
      <p>{markdownToHighlighted(c.body, 'concl')}</p>
    </div>
  );
}

/** 인용구 — 두 variant 가 수식 클래스만 다르고 내용은 동일 */
function renderQuote(props: BlockRenderProps, extraClass: string) {
  const pq = props.commentary.pull_quote;
  if (!pq?.text) return null;
  return (
    <div className={`v3-quote-block${extraClass}`} {...blockAttrs('pullQuote', summaryPullQuote(props))}>
      <p>&quot;{renderInlineMath(pq.text, 'v3-pq', { disableHighlight: true })}&quot;</p>
      {pq.cite && <span className="v3-quote-cite">{pq.cite}</span>}
    </div>
  );
}

const summaryConclusion = ({ commentary }: BlockRenderProps) =>
  commentary.conclusion?.body ? koDifficultyText(commentary.conclusion.body).slice(0, 140) : '';

/** KPI 항목 4종 — dark/light variant 가 공유 */
function kpiItems(k: Kpis, meta: BlockMeta) {
  return [
    { key: 'diff', label: '평균 난이도', value: k.weighted.toFixed(1), unit: '/5', tone: 'gold' },
    { key: 'killer', label: '킬러 비중', value: String(k.killerPct), unit: '%', tone: 'plain' },
    { key: 'essay', label: '서술형', value: String(k.essayCount), unit: '문항', tone: 'plain' },
    k.correctRate !== null
      ? { key: 'rate', label: '정답률', value: String(k.correctRate), unit: '%', tone: 'pos' }
      : { key: 'points', label: '총 배점', value: String(meta.totalPoints), unit: '점', tone: 'pos' },
  ] as const;
}

// ── 블록 정의 ──

const headerBlock: CommentaryBlockDef = {
  id: 'header',
  label: '헤더',
  description: '키커 · 헤드라인 · 요약문 · 메타',
  locked: true,
  defaultEnabled: true,
  available: () => true,
  summary: summaryHeader,
  variants: [
    {
      id: 'editorial',
      label: '에디토리얼',
      hint: '좌측 정렬 대형 세리프 — 잡지 표지 톤',
      render: (props) => {
        const { commentary: c, meta } = props;
        return (
        <header className="v3-top" {...blockAttrs('header', summaryHeader(props))}>
          <span className="v3-kicker">{kicker(c, meta)}</span>
          <h1 style={{ textWrap: 'balance', wordBreak: 'keep-all' }}>
            {renderInlineMath(c.blog_headline || meta.examTitle, 'v3-hl', { disableHighlight: true })}
          </h1>
          {c.blog_dek && (
            <p className="v3-dek">
              {renderInlineMath(koDifficultyText(c.blog_dek), 'v3-dek', { disableHighlight: true })}
            </p>
          )}
          <div className="v3-meta">
            <span className="v3-author">{props.copy.author}</span>
            <span className="v3-dot">·</span>
            <span>
              총 {meta.totalQuestions}문항 {meta.totalPoints}점
            </span>
            {analyzedDate(meta) && (
              <>
                <span className="v3-dot">·</span>
                <span>{analyzedDate(meta)}</span>
              </>
            )}
          </div>
        </header>
        );
      },
    },
    {
      id: 'letterhead',
      label: '편지지 머리',
      // 헤더는 locked 라 끌 수 없다. 손편지에 대형 헤드라인이 얹히면 편지가 아니라
      // 잡지 표지가 되므로, 학교·시험명만 한 줄로 두는 '편지지 머리'를 따로 둔다.
      hint: '학교·시험명 한 줄만 — 손편지용',
      render: (props) => {
        const { meta } = props;
        return (
          <header className="v3-top v3-top-letterhead" {...blockAttrs('header', summaryHeader(props))}>
            <span className="v3-kicker">{meta.examTitle}</span>
            <div className="v3-meta">
              <span className="v3-author">{props.copy.author}</span>
              {analyzedDate(meta) && (
                <>
                  <span className="v3-dot">·</span>
                  <span>{analyzedDate(meta)}</span>
                </>
              )}
            </div>
          </header>
        );
      },
    },
    {
      id: 'centered',
      label: '센터드',
      hint: '중앙 정렬 + 상하 괘선 — 리포트 표지 톤',
      render: (props) => {
        const { commentary: c, meta } = props;
        return (
        <header className="v3-top v3-top-centered" {...blockAttrs('header', summaryHeader(props))}>
          <span className="v3-kicker">{kicker(c, meta)}</span>
          <h1 style={{ textWrap: 'balance', wordBreak: 'keep-all' }}>
            {renderInlineMath(c.blog_headline || meta.examTitle, 'v3-hl', { disableHighlight: true })}
          </h1>
          {c.blog_dek && (
            <p className="v3-dek">
              {renderInlineMath(koDifficultyText(c.blog_dek), 'v3-dek', { disableHighlight: true })}
            </p>
          )}
          <div className="v3-meta">
            <span className="v3-author">{props.copy.author}</span>
            <span className="v3-dot">·</span>
            <span>
              총 {meta.totalQuestions}문항 {meta.totalPoints}점
            </span>
            {analyzedDate(meta) && (
              <>
                <span className="v3-dot">·</span>
                <span>{analyzedDate(meta)}</span>
              </>
            )}
          </div>
        </header>
        );
      },
    },
  ],
};

const kpiBlock: CommentaryBlockDef = {
  id: 'kpi',
  label: '핵심 지표 4종',
  description: '평균 난이도 · 킬러 비중 · 서술형 · 정답률(총배점)',
  defaultEnabled: true,
  available: (_c, questions) => questions.length > 0,
  summary: summaryKpi,
  variants: [
    {
      id: 'dark',
      label: '다크 바',
      hint: '검정 배경 4컬럼 — 강한 대비',
      render: (props) => {
        const { questions, meta } = props;
        const items = kpiItems(computeKpis(questions), meta);
        return (
          <div className="v3-kpi-row" {...blockAttrs('kpi', summaryKpi(props))}>
            {items.map((it, i) => (
              <div key={it.key} className={`v3-kpi v3-kpi-${i + 1}`}>
                <div className="v3-kpi-lb">{it.label}</div>
                <div className="v3-kpi-v">
                  {it.value}
                  <span className="v3-kpi-of">{it.unit}</span>
                </div>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      id: 'light',
      label: '라이트 카드',
      hint: '밝은 배경 카드 4개 — 담백한 지면',
      render: (props) => {
        const { questions, meta } = props;
        const items = kpiItems(computeKpis(questions), meta);
        return (
          <div className="v3-kpi-row v3-kpi-row-light" {...blockAttrs('kpi', summaryKpi(props))}>
            {items.map((it) => (
              <div key={it.key} className={`v3-kpi v3-kpi-tone-${it.tone}`}>
                <div className="v3-kpi-lb">{it.label}</div>
                <div className="v3-kpi-v">
                  {it.value}
                  <span className="v3-kpi-of">{it.unit}</span>
                </div>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      id: 'hero',
      label: '히어로',
      hint: '대표 지표 하나를 크게, 나머지는 목록 — 지면 상단을 장악',
      render: (props) => {
        const items = kpiItems(computeKpis(props.questions), props.meta);
        const [main, ...rest] = items;
        return (
          <div className="v3-kpi-row v3-kpi-row-hero" {...blockAttrs('kpi', summaryKpi(props))}>
            <div className="v3-kpi-hero-main">
              <span className="lb">{main.label}</span>
              <span className="v">
                {main.value}
                <span className="u">{main.unit}</span>
              </span>
            </div>
            <div className="v3-kpi-hero-rest">
              {rest.map((it) => (
                <div key={it.key} className="v3-kpi-hero-row">
                  <span className="lb">{it.label}</span>
                  <span className="v">
                    {it.value}
                    <span className="u">{it.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      },
    },
    {
      id: 'spec',
      label: '스펙시트',
      hint: '라벨-값 표 행 — 숫자를 앞세우지 않는 문서형',
      render: (props) => {
        const items = kpiItems(computeKpis(props.questions), props.meta);
        return (
          <div className="v3-kpi-row v3-kpi-row-spec" {...blockAttrs('kpi', summaryKpi(props))}>
            {items.map((it) => (
              <div key={it.key} className="v3-kpi-spec-row">
                <span className="lb">{it.label}</span>
                <span className="v">
                  {it.value}
                  <span className="u">{it.unit}</span>
                </span>
              </div>
            ))}
          </div>
        );
      },
    },
  ],
};

const featureBlock: CommentaryBlockDef = {
  id: 'feature',
  label: '피처 박스',
  description: '이번 시험의 한 문장 + 거대 숫자',
  defaultEnabled: true,
  available: (c) => !!c.feature_callout,
  summary: ({ commentary: c }) => {
    const fc = c.feature_callout ? normalizeFeatureCallout(c.feature_callout) : null;
    return fc?.body?.[0] ? koDifficultyText(String(fc.body[0])).slice(0, 140) : '';
  },
  variants: [
    {
      id: 'split',
      label: '2단 거대 숫자',
      hint: '좌 문장 / 우 180px 숫자 — 기본',
      render: ({ commentary: c }) => {
        const fc = c.feature_callout ? normalizeFeatureCallout(c.feature_callout) : null;
        return fc ? <FeatureCallout callout={fc} /> : null;
      },
    },
    {
      id: 'banner',
      label: '가로 배너',
      hint: '숫자를 문장 옆에 인라인 배치 — 세로 공간 절약',
      render: ({ commentary: c }) => {
        const fc = c.feature_callout ? normalizeFeatureCallout(c.feature_callout) : null;
        return fc ? <FeatureCallout callout={fc} className="v3-feature-banner" /> : null;
      },
    },
  ],
};

const infographicBlock: CommentaryBlockDef = {
  id: 'infographic',
  label: '인포그래픽',
  description: '난이도 분포 바 · 형식 분포 · 문항 지도',
  defaultEnabled: true,
  available: (_c, questions) => questions.length > 0,
  numberCount: () => 1,
  summary: summaryInfographic,
  variants: [
    {
      id: 'full',
      label: '전체 3종',
      hint: '난이도 바 + 형식 분포 + 문항 지도',
      render: (props) => {
        const { questions, meta, sectionNum } = props;
        return (
        <section className="v3-section" {...blockAttrs('infographic', summaryInfographic(props))}>
          <span className="v3-section-num">{sectionNum}</span>
          <div className="v3-section-sub">{props.copy.infographicSub}</div>
          <h3>{props.copy.infographicTitle(meta.totalQuestions)}</h3>
          <p>{props.copy.infographicBodyFull}</p>
          <DifficultyStackedBar questions={questions} />
          <div className="v3-info-grid-2">
            <FormatBreakdown questions={questions} />
            <KillerMap questions={questions} />
          </div>
        </section>
        );
      },
    },
    {
      id: 'bars-only',
      label: '난이도 바만',
      hint: '난이도 분포만 — 간결하게',
      render: (props) => {
        const { questions, meta, sectionNum } = props;
        return (
        <section className="v3-section" {...blockAttrs('infographic', summaryInfographic(props))}>
          <span className="v3-section-num">{sectionNum}</span>
          <div className="v3-section-sub">{props.copy.infographicSub}</div>
          <h3>{props.copy.infographicTitle(meta.totalQuestions)}</h3>
          <p>{props.copy.infographicBodyBars}</p>
          <DifficultyStackedBar questions={questions} />
        </section>
        );
      },
    },
    {
      id: 'table',
      label: '숫자표',
      hint: '막대 없이 수치만 — 문서·보고서 톤',
      render: (props) => {
        const { questions, meta, sectionNum } = props;
        return (
        <section className="v3-section" {...blockAttrs('infographic', summaryInfographic(props))}>
          <span className="v3-section-num">{sectionNum}</span>
          <div className="v3-section-sub">{props.copy.infographicSub}</div>
          <h3>{props.copy.infographicTitle(meta.totalQuestions)}</h3>
          <p>{props.copy.infographicBodyBars}</p>
          <DifficultyNumericTable questions={questions} />
        </section>
        );
      },
    },
    {
      id: 'dots',
      label: '도트 매트릭스',
      hint: '문항 하나가 점 하나 — 비율이 아니라 개별 문항의 나열',
      render: (props) => {
        const { questions, meta, sectionNum } = props;
        return (
        <section className="v3-section" {...blockAttrs('infographic', summaryInfographic(props))}>
          <span className="v3-section-num">{sectionNum}</span>
          <div className="v3-section-sub">{props.copy.infographicSub}</div>
          <h3>{props.copy.infographicTitle(meta.totalQuestions)}</h3>
          <p>{props.copy.infographicBodyBars}</p>
          <QuestionDotMatrix questions={questions} />
        </section>
        );
      },
    },
  ],
};

const difficultyTableBlock: CommentaryBlockDef = {
  id: 'difficultyTable',
  label: '문항별 난이도표',
  description: '문항 번호 · 난이도 · 단원 · 배점 상세 표',
  defaultEnabled: true,
  available: (c) => !!c.v4_difficulty_rows?.length,
  summary: summaryDifficultyTable,
  variants: [
    {
      id: 'table',
      label: '표',
      // 독립 블록이라 .v3-section 으로 감싼다 — V3DifficultyTable 은 <table> 만 반환하므로
      // 감싸지 않으면 지면 가장자리에 붙는다. 번호는 소비하지 않음(기존 출력과 번호 순서 유지).
      render: (props) =>
        props.commentary.v4_difficulty_rows?.length ? (
          <section className="v3-section v3-section-tight" {...blockAttrs('difficultyTable', summaryDifficultyTable())}>
            <div className="v3-section-sub">{props.copy.difficultyTableSub}</div>
            <V3DifficultyTable rows={props.commentary.v4_difficulty_rows} />
          </section>
        ) : null,
    },
  ],
};

const previousComparisonBlock: CommentaryBlockDef = {
  id: 'previousComparison',
  label: '이전 시험 비교',
  description: '작년/지난 시험 대비 변화',
  defaultEnabled: true,
  available: (c) => !!c.v4_previous_comparison?.headline,
  summary: ({ commentary: c }) =>
    c.v4_previous_comparison?.headline ? koDifficultyText(c.v4_previous_comparison.headline).slice(0, 140) : '',
  variants: [
    {
      id: 'callout',
      label: '콜아웃',
      render: ({ commentary: c }) =>
        c.v4_previous_comparison?.headline ? (
          <V3PreviousComparison comparison={c.v4_previous_comparison} />
        ) : null,
    },
  ],
};

const qaBlock: CommentaryBlockDef = {
  id: 'qa',
  label: 'Q&A 인터뷰',
  description: '질문–답변 형식의 핵심 해설',
  defaultEnabled: true,
  available: (c) => !!c.blog_qa?.length,
  numberCount: (c) => c.blog_qa?.length || 0,
  // 반복 블록이라 요약은 DOM 휴리스틱(섹션별 heading+첫문장)에 맡긴다
  summary: () => '',
  variants: [
    {
      id: 'interview',
      label: '인터뷰 (막대)',
      hint: '데이터 박스를 막대·그리드로 — 기본',
      render: (props) => renderQA(props, 'bar'),
    },
    {
      id: 'plain',
      label: '인터뷰 (담백)',
      hint: '막대를 걷어내고 수치만 정렬',
      render: (props) => renderQA(props, 'plain'),
    },
    {
      id: 'ledger',
      label: '인터뷰 (장부)',
      hint: '점선 리더로 라벨↔값 연결, 박스 배경 없음',
      render: (props) => renderQA(props, 'ledger'),
    },
    {
      id: 'chip',
      label: '인터뷰 (칩)',
      hint: '값을 색 칩으로 강조',
      render: (props) => renderQA(props, 'chip'),
    },
  ],
};

const mainAnalysisBlock: CommentaryBlockDef = {
  id: 'mainAnalysis',
  label: '영역별 출제 분석',
  description: '단원/영역별 출제 경향 해설',
  defaultEnabled: true,
  available: (c) => !!c.v4_main_analysis?.length,
  numberCount: () => 1,
  summary: () => '영역별 출제 분석 — 어느 단원에서 어떤 유형이 나왔는지 정리했습니다.',
  variants: [
    {
      id: 'list',
      label: '목록',
      render: ({ commentary: c, sectionNum }) =>
        c.v4_main_analysis?.length ? (
          <V3MainAnalysis items={c.v4_main_analysis} sectionNum={sectionNum} />
        ) : null,
    },
  ],
};

const keyQuestionsBlock: CommentaryBlockDef = {
  id: 'keyQuestions',
  label: '주요 문항 해설',
  description: '변별 문항 중심 해설',
  defaultEnabled: true,
  available: (c) => !!c.v4_key_questions?.length,
  numberCount: () => 1,
  summary: () => '주요 문항 해설 — 점수를 가른 문항의 접근법을 짚었습니다.',
  variants: [
    {
      id: 'list',
      label: '목록',
      render: ({ commentary: c, sectionNum }) =>
        c.v4_key_questions?.length ? (
          <V3KeyQuestions items={c.v4_key_questions} sectionNum={sectionNum} />
        ) : null,
    },
  ],
};

const pullQuoteBlock: CommentaryBlockDef = {
  id: 'pullQuote',
  label: '인용구',
  description: '한 문장 강조 인용',
  defaultEnabled: true,
  available: (c) => !!c.pull_quote?.text,
  summary: summaryPullQuote,
  variants: [
    {
      id: 'rule',
      label: '상하 괘선',
      hint: '중앙 정렬 + 상하 라인 — 기본',
      render: (props) => renderQuote(props, ''),
    },
    {
      id: 'accent',
      label: '좌측 강조 바',
      hint: '좌측 굵은 강조선 + 좌측 정렬',
      render: (props) => renderQuote(props, ' v3-quote-block-accent'),
    },
  ],
};

const chartsBlock: CommentaryBlockDef = {
  id: 'charts',
  label: '분석 차트 4종',
  description: '난이도 · 능력 영역 · 단원 출제 · 변별력',
  defaultEnabled: true,
  available: () => true, // 차트 주입 여부는 렌더 시점 props 로 판단
  numberCount: () => 1,
  summary: summaryCharts,
  variants: [
    {
      id: 'grid',
      label: '2열 그리드',
      render: (props) => {
        const { charts, meta, sectionNum } = props;
        if (!charts || !Object.values(charts).some(Boolean)) return null;
        return (
          <section className="v3-section" {...blockAttrs('charts', summaryCharts())}>
            <span className="v3-section-num">{sectionNum}</span>
            <div className="v3-section-sub">{props.copy.chartsSub}</div>
            <h3>{props.copy.chartsTitle}</h3>
            <p>{props.copy.chartsBodyGrid}</p>
            <div className="v3-charts-grid">
              {charts.difficulty && (
                <figure className="v3-chart-fig">
                  <img src={toSrc(charts.difficulty)} alt="난이도 분포" />
                  <figcaption>도표 1 — 난이도 분포 (총 {meta.totalQuestions}문항)</figcaption>
                </figure>
              )}
              {charts.abilityRadar && (
                <figure className="v3-chart-fig">
                  <img src={toSrc(charts.abilityRadar)} alt="능력 영역" />
                  <figcaption>도표 2 — 능력 영역 분포 (계산력·이해력·문제해결력·추론력)</figcaption>
                </figure>
              )}
              {charts.topicBar && (
                <figure className="v3-chart-fig v3-chart-fig-wide">
                  <img src={toSrc(charts.topicBar)} alt="단원별 출제 현황" />
                  <figcaption>도표 3 — 단원별 출제 현황 (상위 8개 단원)</figcaption>
                </figure>
              )}
              {charts.discrimination && (
                <figure className="v3-chart-fig v3-chart-fig-wide">
                  <img src={toSrc(charts.discrimination)} alt="변별력 분석" />
                  <figcaption>도표 4 — 변별력 분석 (난이도·배점·형식 기반 지수)</figcaption>
                </figure>
              )}
            </div>
          </section>
        );
      },
    },
    {
      id: 'stack',
      label: '1열 전폭',
      hint: '차트를 세로로 크게 — 모바일 가독성 우선',
      render: (props) => {
        const { charts, meta, sectionNum } = props;
        if (!charts || !Object.values(charts).some(Boolean)) return null;
        const figs: { src?: string; alt: string; cap: string }[] = [
          { src: charts.difficulty, alt: '난이도 분포', cap: `도표 1 — 난이도 분포 (총 ${meta.totalQuestions}문항)` },
          { src: charts.abilityRadar, alt: '능력 영역', cap: '도표 2 — 능력 영역 분포 (계산력·이해력·문제해결력·추론력)' },
          { src: charts.topicBar, alt: '단원별 출제 현황', cap: '도표 3 — 단원별 출제 현황 (상위 8개 단원)' },
          { src: charts.discrimination, alt: '변별력 분석', cap: '도표 4 — 변별력 분석 (난이도·배점·형식 기반 지수)' },
        ];
        return (
          <section className="v3-section" {...blockAttrs('charts', summaryCharts())}>
            <span className="v3-section-num">{sectionNum}</span>
            <div className="v3-section-sub">{props.copy.chartsSub}</div>
            <h3>{props.copy.chartsTitle}</h3>
            <p>{props.copy.chartsBodyStack}</p>
            <div className="v3-charts-grid v3-charts-grid-stack">
              {figs
                .filter((f) => !!f.src)
                .map((f) => (
                  <figure key={f.alt} className="v3-chart-fig v3-chart-fig-wide">
                    <img src={toSrc(f.src)} alt={f.alt} />
                    <figcaption>{f.cap}</figcaption>
                  </figure>
                ))}
            </div>
          </section>
        );
      },
    },
  ],
};

const finalStrategyBlock: CommentaryBlockDef = {
  id: 'finalStrategy',
  label: '단원별 피드백',
  description: '단원별 현재 상태 + 실행 과제',
  defaultEnabled: true,
  available: (c) => !!c.v4_final_strategy?.length,
  numberCount: () => 1,
  summary: () => '단원별 피드백 — 지금 상태와 다음 시험까지 해야 할 일을 단원별로 정리했습니다.',
  variants: [
    {
      id: 'list',
      label: '목록',
      render: ({ commentary: c, sectionNum }) =>
        c.v4_final_strategy?.length ? (
          <V3FinalStrategy rows={c.v4_final_strategy} sectionNum={sectionNum} />
        ) : null,
    },
  ],
};

const conclusionBlock: CommentaryBlockDef = {
  id: 'conclusion',
  label: '결론',
  description: '다음 시험을 준비하는 학생에게',
  defaultEnabled: true,
  available: (c) => !!c.conclusion?.body,
  summary: summaryConclusion,
  variants: [
    {
      id: 'cream',
      label: '크림 박스',
      hint: '따뜻한 배경 — 기본',
      render: (props) => renderConclusion(props, ''),
    },
    {
      id: 'ink',
      label: '다크 박스',
      hint: '다크 서페이스 — 강한 마무리',
      render: (props) => renderConclusion(props, ' v3-conclusion-ink'),
    },
  ],
};

// ── 손편지 본문 ───────────────────────────────────────────────────────────
// 기존 블록들은 "섹션 번호 + 소제목 + 데이터"를 전제로 짜여 있어, 조합만 바꿔서는
// 손편지가 되지 않는다(번호가 붙은 분석 섹션과 인터뷰 구조가 그대로 남는다).
// 그래서 같은 데이터를 **편지 한 통의 흐름**으로 다시 엮는 전용 블록을 둔다.
//   인사말 → 이번 시험 요약 → 관찰 → 준비 제안 → 맺음말 + 서명 → (학부모 문체면) 용어 풀이
// 최상위 요소 하나만 반환하므로 블로그 캡처에서도 편지 한 장 = 이미지 한 장이 된다.

function summaryLetter(props: BlockRenderProps) {
  const first = (props.commentary.blog_dek || props.commentary.overall_comment || '').split(/(?<=[.!?])\s/)[0];
  return first ? `학부모 안내 — ${first}`.slice(0, 120) : '';
}

const letterBodyBlock: CommentaryBlockDef = {
  id: 'letterBody',
  label: '손편지 본문',
  description: '인사말 · 관찰 · 준비 제안 · 맺음말을 편지 한 통으로',
  // 손편지 프리셋에서만 쓴다 — 기존 문서에 저절로 붙으면 총평이 두 번 나온다
  defaultEnabled: false,
  available: (c) => !!c.overall_comment,
  summary: summaryLetter,
  variants: [
    {
      id: 'serif',
      label: '크림지',
      hint: '세리프 본문 · 서명란 — 기본',
      render: (props) => renderLetter(props, ''),
    },
    {
      id: 'plain',
      label: '백지',
      hint: '배경 없이 활자만',
      render: (props) => renderLetter(props, ' v3-letter-plain'),
    },
  ],
};

function renderLetter(props: BlockRenderProps, extraClass: string) {
  const { commentary: c, meta, copy } = props;
  if (!c.overall_comment) return null;

  const who = [meta.schoolName, meta.grade].filter(Boolean).join(' ');
  const greeting = who ? `${who} 학부모님께` : '학부모님께';

  // 관찰 — 영역별 분석이 있으면 그 본문을, 없으면 보완점을 문장으로
  const observations: string[] = c.v4_main_analysis?.length
    ? c.v4_main_analysis.map((m) => m.body).filter(Boolean)
    : c.improvement_areas.filter(Boolean);

  // 준비 제안 — 표(area/action)를 편지에 어울리게 한 문장씩으로 편다
  const suggestions: string[] = c.v4_final_strategy?.length
    ? c.v4_final_strategy.map((r) => [r.area, r.action].filter(Boolean).join(' — '))
    : (c.teaching_recommendations ?? [])
        .map((t) => (typeof t === 'string' ? t : [t.topic, t.reason].filter(Boolean).join(' — ')))
        .filter(Boolean);

  // 용어 풀이 — 본문에 **실제로 등장한** 용어만. 안 쓴 말을 설명하면 편지가 사전이 된다.
  const haystack = [c.blog_dek, c.overall_comment, ...observations, ...suggestions, c.conclusion?.body]
    .filter(Boolean)
    .join(' ');
  const terms = (copy.glossary ?? []).filter((g) => haystack.includes(g.term));

  return (
    <div className={`v3-letter${extraClass}`} {...blockAttrs('letterBody', summaryLetter(props))}>
      <p className="v3-letter-greeting">{greeting}</p>

      {c.blog_dek && <p className="v3-letter-lead">{markdownToHighlighted(c.blog_dek, 'v3-lt-dek')}</p>}
      <p>{markdownToHighlighted(c.overall_comment, 'v3-lt-body')}</p>

      {observations.map((t, i) => (
        <p key={`obs-${i}`}>{markdownToHighlighted(t, `v3-lt-obs-${i}`)}</p>
      ))}

      {suggestions.length > 0 && (
        <>
          <p className="v3-letter-turn">다음 시험까지는 이렇게 준비하시면 좋겠습니다.</p>
          {suggestions.map((t, i) => (
            <p key={`sug-${i}`} className="v3-letter-suggest">
              {markdownToHighlighted(t, `v3-lt-sug-${i}`)}
            </p>
          ))}
        </>
      )}

      {c.conclusion?.body && <p>{markdownToHighlighted(c.conclusion.body, 'v3-lt-concl')}</p>}

      <p className="v3-letter-sign">
        <span>{meta.analyzedAt ? new Date(meta.analyzedAt).toLocaleDateString('ko-KR') : ''}</span>
        <span>{copy.letterSignoff ?? copy.author}</span>
      </p>

      {terms.length > 0 && (
        <div className="v3-letter-terms">
          <span className="v3-letter-terms-title">용어 풀이</span>
          {terms.map((g) => (
            <p key={g.term}>
              <b>{g.term}</b> {g.plain}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 시험지 히트맵 ────────────────────────────────────────────────────────
// 다른 블록이 "난이도별 몇 문항"으로 **집계**를 보여 준다면, 이건 시험지 자체를 그린다.
// 1번부터 끝까지 칸 하나가 문항 하나 — 어려운 구간이 앞에 몰렸는지 뒤에 몰렸는지,
// 서술형이 어디 붙었는지가 집계로는 안 보이고 배열로만 보인다.
//
// 격자 크기는 고정하지 않는다. 문항 수는 시험마다 다르고(20·21·22…),
// 번호도 정수가 아니라 "서답형3" 같은 문자열이 섞인다.

function summaryHeatmap(props: BlockRenderProps) {
  const qs = props.questions;
  if (!qs.length) return '';
  const hard = qs.filter((q) => Number(normDiff(String(q.difficulty))) >= 4).length;
  return `문항 배치 히트맵 — 총 ${qs.length}문항 중 심화 이상 ${hard}문항`;
}

const heatmapGridBlock: CommentaryBlockDef = {
  id: 'heatmapGrid',
  label: '시험지 히트맵',
  description: '문항을 번호 순 격자로 — 칸 색은 난이도, 테두리는 서술형',
  defaultEnabled: false,
  available: (_c, questions) => questions.length > 0,
  summary: summaryHeatmap,
  numberCount: () => 1,
  variants: [
    {
      id: 'grid',
      label: '격자',
      hint: '칸마다 번호와 배점 — 기본',
      render: (props) => renderHeatmap(props, true),
    },
    {
      id: 'compact',
      label: '압축',
      hint: '번호만 — 문항이 많을 때',
      render: (props) => renderHeatmap(props, false),
    },
  ],
};

function renderHeatmap(props: BlockRenderProps, showPoints: boolean) {
  const { questions: qs, sectionNum, copy } = props;
  if (!qs.length) return null;

  // 서술형 판별 — question_format 이 없던 시절 데이터도 있어 번호 문자열까지 본다
  const isEssay = (q: (typeof qs)[number]) =>
    q.question_format === 'essay' || /서답|서술/.test(String(q.question_number ?? ''));

  const levels = [1, 2, 3, 4, 5];
  const counts = levels.map((lv) => qs.filter((q) => Number(normDiff(String(q.difficulty))) === lv).length);

  return (
    <section className="v3-section v3-heatmap" {...blockAttrs('heatmapGrid', summaryHeatmap(props))}>
      <span className="v3-section-num">{sectionNum}</span>
      <div className="v3-section-sub">{copy.difficultyTableSub}</div>
      <h3>문항 배치 한눈에 보기</h3>

      <div className="v3-heatmap-grid">
        {qs.map((q, i) => {
          const lv = Number(normDiff(String(q.difficulty))) || 1;
          const essay = isEssay(q);
          return (
            <div
              key={`hm-${q.question_number ?? i}`}
              className={`v3-heatmap-cell${essay ? ' v3-heatmap-essay' : ''}${lv >= 4 ? ' v3-heatmap-killer' : ''}`}
              style={{ background: V3_DIFF_COLORS[lv - 1] }}
              title={`${q.question_number}번 · ${V3_DIFF_LABELS[lv - 1]} · ${q.points ?? 0}점`}
            >
              <span className="v3-heatmap-no">{q.question_number}</span>
              {showPoints && <span className="v3-heatmap-pt">{q.points ?? 0}</span>}
            </div>
          );
        })}
      </div>

      <div className="v3-heatmap-legend">
        {levels.map((lv) => (
          <span key={lv} className="v3-heatmap-leg">
            <i style={{ background: V3_DIFF_COLORS[lv - 1] }} />
            {V3_DIFF_LABELS[lv - 1]} {counts[lv - 1]}
          </span>
        ))}
        <span className="v3-heatmap-leg">
          <i className="v3-heatmap-leg-essay" />
          서술형 {qs.filter(isEssay).length}
        </span>
      </div>
    </section>
  );
}

const footerBlock: CommentaryBlockDef = {
  id: 'footer',
  label: '푸터',
  locked: true,
  defaultEnabled: true,
  available: () => true,
  summary: () => '',
  variants: [
    {
      id: 'credits',
      label: '크레딧',
      render: (props) => (
        <footer className="v3-footer">
          <div className="v3-footer-meta">{props.copy.footerPrefix} · {analyzedDate(props.meta)}</div>
        </footer>
      ),
    },
  ],
};

/** 전체 블록 레지스트리 — 배열 순서가 기본 템플릿의 기본 순서 */
export const COMMENTARY_BLOCKS: CommentaryBlockDef[] = [
  headerBlock,
  kpiBlock,
  featureBlock,
  infographicBlock,
  difficultyTableBlock,
  previousComparisonBlock,
  qaBlock,
  mainAnalysisBlock,
  keyQuestionsBlock,
  letterBodyBlock,
  heatmapGridBlock,
  pullQuoteBlock,
  chartsBlock,
  finalStrategyBlock,
  conclusionBlock,
  footerBlock,
];

export function getBlockDef(id: string): CommentaryBlockDef | undefined {
  return COMMENTARY_BLOCKS.find((b) => b.id === id);
}

export type { BlockRenderProps };
export { Fragment };
