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
import { sumPoints } from '@/lib/exam-analysis/points';
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
      id: 'terminal',
      label: '터미널',
      // 대형 헤드라인은 잡지 표지용. 계기판은 학교·시험·규모만 한 줄로 두고 숫자를 바로 보여 준다.
      hint: '학교·시험·문항수·만점 모노 한 줄 — 계기판',
      render: (props) => {
        const { meta } = props;
        const bits: { key: string; text: string; kind: 'k' | 'v' }[] = [];
        if (meta.schoolName) bits.push({ key: 'school', text: meta.schoolName, kind: 'k' });
        bits.push({ key: 'exam', text: meta.examTitle, kind: meta.schoolName ? 'v' : 'k' });
        bits.push({ key: 'q', text: `${meta.totalQuestions}문항`, kind: 'v' });
        bits.push({ key: 'p', text: `${meta.totalPoints}점`, kind: 'v' });
        return (
          <header className="v3-top v3-top-terminal" {...blockAttrs('header', summaryHeader(props))}>
            <div className="v3-term-line">
              {bits.map((b, i) => (
                <Fragment key={b.key}>
                  {i > 0 && <span className="sep">·</span>}
                  <span className={b.kind}>{b.text}</span>
                </Fragment>
              ))}
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
      id: 'terminal',
      label: '터미널',
      // dark 4컬럼은 거대 숫자 + 여백으로 지면을 장악한다. 계기판은 같은 4지표를
      // 모노 라벨-값 행으로 붙여 높이를 줄이고, 값을 오른쪽 고정폭에 맞춘다.
      hint: '모노 고정폭 라벨-값 행 — 계기판',
      render: (props) => {
        const items = kpiItems(computeKpis(props.questions), props.meta);
        return (
          <div className="v3-kpi-row v3-kpi-row-terminal" {...blockAttrs('kpi', summaryKpi(props))}>
            {items.map((it) => (
              <div key={it.key} className={`v3-kpi-term-row v3-kpi-tone-${it.tone}`}>
                <span className="lb">{it.label}</span>
                <span className="dots" aria-hidden="true" />
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

// ── Wrapped 스토리 ───────────────────────────────────────────────────────
// 다른 블록이 "한 지면에 모든 것"이라면 이건 **한 화면에 숫자 하나**다.
// 스크롤이 아니라 넘기며 보는 형식이라 학부모·학생에게 그대로 공유된다.
//
// ⚠️ 슬라이드를 <div> 하나로 감싸면 안 된다. 블로그 캡처가 `.v3` 의 **최상위 자식마다**
//    PNG 를 뜨므로, 감싸는 순간 8~10장이 거대한 이미지 한 장으로 합쳐진다.
//    Fragment 로 슬라이드를 최상위 형제로 흘려보내면 장마다 이미지 한 장이 된다.
//    (types.ts 가 이 반환 형태를 명시적으로 허용한다.)

interface StoryCard {
  key: string;
  /** 화면을 채우는 값 — 슬라이드당 하나 */
  big: string;
  /** big 뒤에 붙는 작은 단위 (5, %, 점 …) */
  unit?: string;
  label: string;
  body?: string;
}

/** 슬라이드 목록 — 데이터가 없는 장은 통째로 빠진다(빈 화면을 넘기게 두지 않는다) */
function buildStoryCards(props: BlockRenderProps): StoryCard[] {
  const { commentary: c, questions: qs, meta } = props;
  const cards: StoryCard[] = [];

  const total = qs.length;
  const killer = qs.filter((q) => Number(normDiff(String(q.difficulty))) >= 4);
  const essays = qs.filter((q) => q.question_format === 'essay' || /서답|서술/.test(String(q.question_number ?? '')));
  const essayPts = sumPoints(essays.map((q) => q.points));
  const avg = weightedAverageDifficulty(qs);

  if (avg.avg > 0) {
    cards.push({
      key: 'diff',
      big: avg.avg.toFixed(1),
      unit: '/5',
      label: '이번 시험 평균 난이도',
      body: c.blog_dek,
    });
  }
  if (total > 0) {
    cards.push({
      key: 'killer',
      big: String(killer.length),
      unit: `/${total}`,
      label: '심화 이상 문항',
      body: killer.length
        ? `${total}문항 중 ${killer.length}문항이 4단계 이상이었습니다.`
        : '4단계 이상 문항은 출제되지 않았습니다.',
    });
  }
  if (essays.length > 0 && meta.totalPoints > 0) {
    cards.push({
      key: 'essay',
      big: String(essayPts),
      unit: '점',
      label: `서술형 ${essays.length}문항 배점`,
      body: `만점 ${meta.totalPoints}점 가운데 ${Math.round((essayPts / meta.totalPoints) * 100)}%가 서술형입니다.`,
    });
  }

  // 가장 약했던 단원 — 정답률 데이터가 있으면 그걸, 없으면 AI 가 꼽은 보완점
  const weakest = (c.topic_performance ?? []).filter((t) => t.label === 'weak').sort((a, b) => a.correct_rate - b.correct_rate)[0];
  if (weakest) {
    cards.push({
      key: 'weak',
      big: `${Math.round(weakest.correct_rate * 100)}`,
      unit: '%',
      label: `가장 어려웠던 단원 · ${weakest.topic}`,
      body: `${weakest.question_count}문항이 나왔고 정답률이 가장 낮았습니다.`,
    });
  } else if (c.improvement_areas[0]) {
    cards.push({ key: 'weak', big: '1', unit: '순위', label: '가장 먼저 보완할 것', body: c.improvement_areas[0] });
  }

  const notable = c.notable_questions?.[0];
  if (notable?.comment) {
    cards.push({ key: 'notable', big: String(notable.question_number), unit: '번', label: '주목할 문항', body: notable.comment });
  }

  const next = c.v4_final_strategy?.[0]?.action ?? c.teaching_recommendations?.[0]?.topic;
  if (next) {
    cards.push({ key: 'next', big: '1', unit: '가지', label: '다음 시험까지 할 일', body: next });
  }

  return cards;
}

function summaryStory(props: BlockRenderProps) {
  const n = buildStoryCards(props).length;
  return n ? `${props.meta.examTitle} — 숫자로 보는 요약 ${n}장` : '';
}

const storySlideBlock: CommentaryBlockDef = {
  id: 'storySlide',
  label: '스토리 슬라이드',
  description: '한 화면에 숫자 하나 — 넘기며 보는 9:16 카드',
  defaultEnabled: false,
  // 섹션 번호를 쓰지 않는다. 한 블록이 여러 장을 뱉는데 번호는 블록당 하나만 배정되므로,
  // 번호를 받으면 첫 장에만 붙고 나머지는 비어 어긋나 보인다. 장 번호는 내부에서 센다.
  numberCount: () => 0,
  available: (_c, questions) => questions.length > 0,
  summary: summaryStory,
  variants: [
    {
      id: 'story',
      label: '9:16 스토리',
      hint: '세로 카드 — 공유용',
      render: (props) => renderStory(props, 'v3-story-portrait'),
    },
    {
      id: 'square',
      label: '정사각',
      hint: '블로그 본문에 붙이기 좋은 1:1',
      render: (props) => renderStory(props, 'v3-story-square'),
    },
  ],
};

/** big 문자열 길이 → 크기 등급. 한글은 폭이 넓어 2배로 센다. */
function bigSizeClass(big: string): 'xl' | 'lg' | 'md' | 'sm' {
  const width = [...big].reduce((n, ch) => n + (/[가-힣]/.test(ch) ? 2 : 1), 0);
  if (width <= 2) return 'xl';
  if (width <= 3) return 'lg';
  if (width <= 5) return 'md';
  return 'sm';
}

function renderStory(props: BlockRenderProps, shapeClass: string) {
  const cards = buildStoryCards(props);
  if (!cards.length) return null;
  const { meta } = props;
  const totalSlides = cards.length + 1; // 표지 포함

  return (
    <Fragment>
      {/* 표지 — 나머지 장과 같은 최상위 형제여야 캡처가 장마다 쪼개진다 */}
      <div
        className={`v3-story ${shapeClass} v3-story-cover`}
        data-block-id="storySlide-0"
        data-block-summary={summaryStory(props)}
      >
        <span className="v3-story-idx">1 / {totalSlides}</span>
        <span className="v3-story-label">{[meta.schoolName, meta.grade].filter(Boolean).join(' ')}</span>
        <strong className="v3-story-title">{meta.examTitle}</strong>
        <span className="v3-story-body">숫자로 보는 이번 시험</span>
      </div>

      {cards.map((card, i) => (
        <div
          key={card.key}
          className={`v3-story ${shapeClass}`}
          data-block-id={`storySlide-${i + 1}`}
          data-block-summary={`${card.label} — ${card.big}${card.unit ?? ''}`}
        >
          <span className="v3-story-idx">
            {i + 2} / {totalSlides}
          </span>
          {/* 숫자 크기는 길이로 나눈다 — big 이 "3.8" 일 때와 "서답형6" 일 때 같은 크기를 쓰면
              전자는 작아 보이고 후자는 카드 밖으로 넘친다. */}
          <span className={`v3-story-big v3-story-big-${bigSizeClass(card.big)}`}>
            {card.big}
            {card.unit && <em>{card.unit}</em>}
          </span>
          <span className="v3-story-label">{card.label}</span>
          {card.body && <span className="v3-story-body">{markdownToHighlighted(card.body, `v3-st-${card.key}`)}</span>}
        </div>
      ))}
    </Fragment>
  );
}

// ── 단원 묶기 (weatherStrip · subwayMap 공유) ────────────────────────────
// topic 저장 형식은 `과목 > 대단원 > 중단원`. 예보·노선은 중단원 단위로 묶는다.
// 마지막 칸(소단원으로 잘못 저장된 경우)이 아니라 **마지막에서 두 번째**를 쓰는 이유:
// 같은 중단원 문항이 소단원만 달라져 역·날씨가 쪼개지면 시험 한 장의 지도가 안 된다.

/**
 * topic 문자열 → 묶음 단위.
 *
 * AI 저장 포맷은 `과목 > 대단원 > 중단원`(예: `공통수학1 > 방정식과 부등식 > 복소수`)이라
 * **마지막 조각(중단원)**으로 묶는다. 대단원으로 묶으면 한 시험이 2~3덩어리로 뭉쳐
 * 예보는 전부 같은 날씨가 되고 노선도는 역이 두 개뿐인 그림이 된다.
 * 조각이 하나뿐인 레거시 값은 그대로 쓴다.
 */
function topicMidUnit(topic: string | null | undefined): string {
  const parts = String(topic ?? '')
    .split('>')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || '미분류';
}

function questionDiff(q: AnalyzedQuestion): number {
  if (q.difficulty == null) return 0;
  const lv = Number(normDiff(String(q.difficulty)));
  return lv >= 1 && lv <= 5 ? lv : 0;
}

function isEssayQuestion(q: AnalyzedQuestion): boolean {
  return q.question_format === 'essay' || /서답|서술/.test(String(q.question_number ?? ''));
}

// ── 시험 날씨 스트립 ─────────────────────────────────────────────────────
// 단원별 배점×난이도를 맑음/흐림/비/폭풍 4단계로 접어 **가로 예보**로 그린다.
// 표를 쓰면 인포그래픽과 같은 문서가 되므로, 스트립 + 한 줄 예보만 본문으로 둔다.

type WeatherKind = 'sunny' | 'cloudy' | 'rain' | 'storm';

const WEATHER_LABEL: Record<WeatherKind, string> = {
  sunny: '맑음',
  cloudy: '흐림',
  rain: '비',
  storm: '폭풍',
};

interface TopicWeather {
  topic: string;
  points: number;
  count: number;
  avgDiff: number;
  kind: WeatherKind;
}

function weatherFromAvg(avg: number): WeatherKind {
  // 가중평균 난이도(1~5)를 4단 예보로. 4단계(심화)부터 폭풍 — 킬러 단원이 묻히지 않게.
  if (avg >= 4) return 'storm';
  if (avg >= 3.2) return 'rain';
  if (avg >= 2.4) return 'cloudy';
  return 'sunny';
}

function collectTopicWeather(questions: AnalyzedQuestion[]): TopicWeather[] {
  const map = new Map<string, { wDiff: number; wSum: number; points: number; count: number }>();
  for (const q of questions) {
    const topic = topicMidUnit(q.topic);
    const pts = typeof q.points === 'number' && q.points > 0 ? q.points : 0;
    const lv = questionDiff(q);
    const cur = map.get(topic) ?? { wDiff: 0, wSum: 0, points: 0, count: 0 };
    cur.count += 1;
    cur.points += pts;
    // 난이도를 못 읽은 문항은 가중평균에 넣지 않는다 — 0으로 넣으면 단원이 맑음으로 둔갑한다.
    if (lv > 0) {
      const w = pts > 0 ? pts : 1;
      cur.wDiff += w * lv;
      cur.wSum += w;
    }
    map.set(topic, cur);
  }
  const rows: TopicWeather[] = [];
  for (const [topic, v] of map) {
    const avgDiff = v.wSum > 0 ? v.wDiff / v.wSum : 0;
    rows.push({
      topic,
      points: v.points,
      count: v.count,
      avgDiff,
      kind: weatherFromAvg(avgDiff > 0 ? avgDiff : 2.4),
    });
  }
  // 폭풍이 왼쪽에 오게 — 예보에서 먼저 경고하는 쪽.
  return rows.sort((a, b) => b.avgDiff - a.avgDiff || b.points - a.points);
}

function forecastLine(rows: TopicWeather[]): string {
  if (!rows.length) return '';
  const stormish = [...rows]
    .filter((r) => r.kind === 'storm' || r.kind === 'rain')
    .sort((a, b) => Number(b.kind === 'storm') - Number(a.kind === 'storm') || b.points - a.points);
  const sunnish = [...rows]
    .filter((r) => r.kind === 'sunny' || r.kind === 'cloudy')
    .sort((a, b) => Number(b.kind === 'sunny') - Number(a.kind === 'sunny') || b.points - a.points);
  const bits: string[] = [];
  if (stormish[0]) bits.push(`${stormish[0].topic} ${WEATHER_LABEL[stormish[0].kind]}`);
  if (sunnish[0] && sunnish[0].topic !== stormish[0]?.topic) {
    bits.push(`${sunnish[0].topic} ${WEATHER_LABEL[sunnish[0].kind]}`);
  }
  if (!bits.length) bits.push(`${rows[0].topic} ${WEATHER_LABEL[rows[0].kind]}`);
  return `이번 시험 날씨: ${bits.join(', ')}`;
}

/** 날씨 아이콘 — currentColor 만 써서 12 테마를 따라간다. 면 채움 글자는 올리지 않는다. */
function WeatherGlyph({ kind }: { kind: WeatherKind }) {
  if (kind === 'sunny') {
    return (
      <svg viewBox="0 0 32 32" className="v3-wx-glyph" aria-hidden>
        <circle cx="16" cy="16" r="6" fill="currentColor" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const r = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={16 + Math.cos(r) * 9}
              y1={16 + Math.sin(r) * 9}
              x2={16 + Math.cos(r) * 13}
              y2={16 + Math.sin(r) * 13}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    );
  }
  if (kind === 'cloudy') {
    return (
      <svg viewBox="0 0 32 32" className="v3-wx-glyph" aria-hidden>
        <ellipse cx="12" cy="18" rx="7" ry="5" fill="currentColor" opacity="0.85" />
        <ellipse cx="20" cy="17" rx="8" ry="6" fill="currentColor" />
      </svg>
    );
  }
  if (kind === 'rain') {
    return (
      <svg viewBox="0 0 32 32" className="v3-wx-glyph" aria-hidden>
        <ellipse cx="16" cy="13" rx="9" ry="6" fill="currentColor" />
        <line x1="10" y1="22" x2="8" y2="28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="16" y1="22" x2="14" y2="28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="22" y1="22" x2="20" y2="28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className="v3-wx-glyph" aria-hidden>
      <ellipse cx="15" cy="12" rx="9" ry="6" fill="currentColor" />
      <path d="M18 16 L12 22 H16 L13 28 L22 20 H17 Z" fill="currentColor" />
    </svg>
  );
}

function summaryWeather(props: BlockRenderProps) {
  const rows = collectTopicWeather(props.questions);
  return forecastLine(rows) || `단원 예보 ${rows.length}곳`;
}

const weatherStripBlock: CommentaryBlockDef = {
  id: 'weatherStrip',
  label: '시험 날씨',
  description: '단원별 배점×난이도를 맑음·흐림·비·폭풍 가로 예보로',
  defaultEnabled: false,
  available: (_c, questions) => questions.length > 0,
  summary: summaryWeather,
  numberCount: () => 1,
  variants: [
    {
      id: 'strip',
      label: '예보 스트립',
      hint: '한 줄 예보 + 가로 칸 — 기본',
      render: (props) => renderWeather(props, 'strip'),
    },
    {
      id: 'poster',
      label: '포스터',
      hint: '예보 문장이 크고, 칸은 아이콘만',
      render: (props) => renderWeather(props, 'poster'),
    },
  ],
};

function renderWeather(props: BlockRenderProps, variant: 'strip' | 'poster') {
  const rows = collectTopicWeather(props.questions);
  if (!rows.length) return null;
  const line = forecastLine(rows);
  const poster = variant === 'poster';

  return (
    <section className={`v3-section v3-weather${poster ? ' v3-weather-poster' : ''}`} {...blockAttrs('weatherStrip', summaryWeather(props))}>
      <span className="v3-section-num">{props.sectionNum}</span>
      <div className="v3-section-sub">단원 예보</div>
      <h3>{poster ? line : '이번 시험의 날씨'}</h3>
      {!poster && <p className="v3-weather-line">{line}</p>}

      <div className="v3-weather-strip" role="list">
        {rows.map((r) => (
          <div key={r.topic} className={`v3-weather-cell v3-weather-${r.kind}`} role="listitem" title={`${r.topic} · ${WEATHER_LABEL[r.kind]} · ${r.points}점`}>
            <span className="v3-weather-icon">
              <WeatherGlyph kind={r.kind} />
            </span>
            <span className="v3-weather-kind">{WEATHER_LABEL[r.kind]}</span>
            {!poster && <span className="v3-weather-topic">{r.topic}</span>}
            {!poster && r.points > 0 && <span className="v3-weather-pts">{r.points}점</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── 단원 노선도 ──────────────────────────────────────────────────────────
// 단원 = 역, 4단계 이상 문항이 있는 단원 = 환승(큰 원), 서술형 포함 = 급행 정차.
// 역 수는 시험마다 다르므로 좌표를 고정하지 않고, 1줄(≤6) / 2줄(U턴)로 펼친다.

interface SubwayStation {
  topic: string;
  transfer: boolean;
  express: boolean;
  count: number;
}

function collectStations(questions: AnalyzedQuestion[]): SubwayStation[] {
  const map = new Map<string, SubwayStation>();
  for (const q of questions) {
    const topic = topicMidUnit(q.topic);
    const cur = map.get(topic) ?? { topic, transfer: false, express: false, count: 0 };
    cur.count += 1;
    if (questionDiff(q) >= 4) cur.transfer = true;
    if (isEssayQuestion(q)) cur.express = true;
    map.set(topic, cur);
  }
  // 출제 순서를 유지한다 — 가나다 정렬하면 시험지 앞뒤가 노선에서 뒤집힌다.
  const order: string[] = [];
  for (const q of questions) {
    const t = topicMidUnit(q.topic);
    if (!order.includes(t)) order.push(t);
  }
  return order.flatMap((t) => {
    const s = map.get(t);
    return s ? [s] : [];
  });
}

function layoutStationPoints(n: number, width: number, height: number): { x: number; y: number }[] {
  const padX = 56;
  const padY = 38;
  const usable = Math.max(width - padX * 2, 1);
  if (n <= 1) return [{ x: width / 2, y: height / 2 }];
  if (n <= 6) {
    return Array.from({ length: n }, (_, i) => ({
      x: padX + (i * usable) / (n - 1),
      y: height / 2,
    }));
  }
  // 두 줄 U턴 — 1줄이 넘치면 라벨이 겹친다. 오른쪽에서 접어 내려가 급행처럼 이어진다.
  const n1 = Math.ceil(n / 2);
  const n2 = n - n1;
  const xs = Array.from({ length: n1 }, (_, i) => padX + (n1 === 1 ? usable / 2 : (i * usable) / (n1 - 1)));
  const y1 = padY;
  const y2 = height - padY;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n1; i++) pts.push({ x: xs[i], y: y1 });
  for (let j = 0; j < n2; j++) pts.push({ x: xs[n1 - 1 - j], y: y2 });
  return pts;
}

function summarySubway(props: BlockRenderProps) {
  const st = collectStations(props.questions);
  const tr = st.filter((s) => s.transfer).length;
  const ex = st.filter((s) => s.express).length;
  return `단원 노선 ${st.length}역 · 환승 ${tr} · 급행 ${ex}`;
}

const subwayMapBlock: CommentaryBlockDef = {
  id: 'subwayMap',
  label: '단원 노선도',
  description: '단원을 역으로 잇고, 킬러 단원은 환승, 서술형은 급행',
  defaultEnabled: false,
  available: (_c, questions) => questions.length > 0,
  summary: summarySubway,
  numberCount: () => 1,
  variants: [
    {
      id: 'line',
      label: '노선',
      hint: '가로 1~2줄 — 기본',
      render: (props) => renderSubway(props, false),
    },
    {
      id: 'compact',
      label: '압축',
      hint: '라벨을 짧게 — 단원이 많을 때',
      render: (props) => renderSubway(props, true),
    },
  ],
};

function wrapStationLabel(s: string, max: number): string[] {
  if (s.length <= max) return [s];
  return [s.slice(0, max), s.slice(max)];
}

function renderSubway(props: BlockRenderProps, compact: boolean) {
  const stations = collectStations(props.questions);
  if (!stations.length) return null;

  const twoRows = stations.length > 6;
  const width = 720;
  const height = twoRows ? 200 : 132;
  const pts = layoutStationPoints(stations.length, width, height);
  const maxChars = compact ? 5 : twoRows ? 7 : 6;
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <section className="v3-section v3-subway" {...blockAttrs('subwayMap', summarySubway(props))}>
      <span className="v3-section-num">{props.sectionNum}</span>
      <div className="v3-section-sub">출제 노선</div>
      <h3>단원 노선도</h3>

      <svg className="v3-subway-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summarySubway(props)}>
        {/* 노선 — 역보다 아래 레이어. ink 는 글자색 겸 채움이라 다크에서도 선이 보인다. */}
        <path d={d} fill="none" stroke="var(--v3-ink)" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
        {stations.map((s, i) => {
          const p = pts[i];
          const r = s.transfer ? 11 : 6;
          // 한 줄은 홀수 위/짝수 아래, 두 줄은 윗줄 위·아랫줄 아래 — 라벨이 선과 겹치지 않게.
          const labelBelow = twoRows ? p.y > height / 2 : i % 2 === 1;
          const lines = wrapStationLabel(s.topic, maxChars);
          const labelY = labelBelow ? p.y + r + 14 : p.y - r - 8 - (lines.length - 1) * 12;
          return (
            <g key={s.topic}>
              {/* 급행 링은 역 원 바깥 — 원 안에 그리면 환승 점이 가린다. */}
              {s.express && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r + 4}
                  fill="none"
                  stroke="var(--v3-accent)"
                  strokeWidth="2.5"
                />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill="var(--v3-paper)"
                stroke="var(--v3-ink)"
                strokeWidth={s.transfer ? 3.5 : 2}
              />
              {s.transfer && (
                <circle cx={p.x} cy={p.y} r={4} fill="var(--v3-ink)" />
              )}
              <text
                x={p.x}
                y={labelY}
                textAnchor="middle"
                fill="var(--v3-ink)"
                fontSize="11"
                fontFamily="var(--v3-font-label)"
                fontWeight={s.transfer ? 800 : 600}
              >
                {lines.map((ln, li) => (
                  <tspan key={li} x={p.x} dy={li === 0 ? 0 : 12}>
                    {ln}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="v3-subway-legend">
        <span>
          <i className="v3-subway-leg-xfer" />
          환승 · 4단계 이상
        </span>
        <span>
          <i className="v3-subway-leg-exp" />
          급행 · 서술형
        </span>
      </div>
    </section>
  );
}

// ── 말풍선 스레드 ────────────────────────────────────────────────────────
// 선생님↔학부모 대화. 한 버블 = 한 인사이트.
// blog_qa 가 있으면 질문=학부모 / 답변=선생님. 없으면 총평·보완점·전략으로 조립한다.
// 최상위는 채팅창 하나 — 캡처가 말풍선마다 쪼개지면 대화가 아니라 카드 더미가 된다.

type ChatWho = 'teacher' | 'parent';
interface ChatBubble {
  who: ChatWho;
  text: string;
}

function buildChatBubbles(c: CommentaryResult): ChatBubble[] {
  const out: ChatBubble[] = [];
  if (c.blog_qa?.length) {
    for (const qa of c.blog_qa) {
      if (qa.question) out.push({ who: 'parent', text: qa.question });
      const answer = (qa.answer ?? []).filter(Boolean).join('\n');
      if (answer) out.push({ who: 'teacher', text: answer });
    }
    return out;
  }
  if (c.overall_comment) {
    out.push({ who: 'parent', text: '이번 시험 전체적으로 어땠나요?' });
    out.push({ who: 'teacher', text: c.overall_comment });
  }
  const areas = (c.improvement_areas ?? []).filter(Boolean);
  if (areas.length) {
    out.push({ who: 'parent', text: '어떤 부분을 먼저 보완하면 좋을까요?' });
    for (const a of areas) out.push({ who: 'teacher', text: a });
  }
  const plans = c.v4_final_strategy ?? [];
  if (plans.length) {
    out.push({ who: 'parent', text: '다음 시험은 어떻게 준비하면 될까요?' });
    for (const p of plans) {
      const text = [p.area, p.action].filter(Boolean).join(' — ');
      if (text) out.push({ who: 'teacher', text });
    }
  }
  return out;
}

function summaryChat(props: BlockRenderProps) {
  const n = buildChatBubbles(props.commentary).length;
  return n ? `선생님과의 대화 ${n}개` : '';
}

const bubbleThreadBlock: CommentaryBlockDef = {
  id: 'bubbleThread',
  label: '대화 말풍선',
  description: '선생님↔학부모 스레드. 한 버블이 한 인사이트',
  defaultEnabled: false,
  available: (c) => buildChatBubbles(c).length > 0,
  summary: summaryChat,
  variants: [
    {
      id: 'chat',
      label: '대화방',
      hint: '학부모 오른쪽 · 선생님 왼쪽 — 기본',
      render: (props) => renderChat(props, false),
    },
    {
      id: 'thread',
      label: '스레드',
      hint: '양쪽 왼쪽 정렬 — 댓글형',
      render: (props) => renderChat(props, true),
    },
  ],
};

function renderChat(props: BlockRenderProps, leftAlign: boolean) {
  const bubbles = buildChatBubbles(props.commentary);
  if (!bubbles.length) return null;

  return (
    <div className={`v3-chat${leftAlign ? ' v3-chat-thread' : ''}`} {...blockAttrs('bubbleThread', summaryChat(props))}>
      <div className="v3-chat-head">
        <span className="v3-chat-avatar" aria-hidden>
          선
        </span>
        <div className="v3-chat-who">
          <strong>매스랩 선생님</strong>
          <span>시험 분석</span>
        </div>
      </div>
      <div className="v3-chat-body">
        {bubbles.map((b, i) => (
          <div key={`cb-${i}`} className={`v3-chat-row v3-chat-${b.who}`}>
            {b.who === 'teacher' && <span className="v3-chat-avatar v3-chat-avatar-sm" aria-hidden>선</span>}
            <div className="v3-chat-bubble">
              {b.text.split('\n').map((para, pi) => (
                <p key={pi}>{markdownToHighlighted(para, `v3-chat-${i}-${pi}`)}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 스카우트 카드 (statRadar) ────────────────────────────────────────────
// 선수 카드: SVG 레이더 + 스탯 4~5개 + 스카우트 노트 3줄.
// 시간 축을 두지 않는 이유: 문항 소요시간 필드가 없다. 없으면 가짜 축이 된다.
// 영문 enum 은 라벨 표에만 한글을 두고 raw 값은 정규화 키로만 쓴다.

const ABILITY_AXES = [
  { key: 'calculation', label: '계산력' },
  { key: 'understanding', label: '이해력' },
  { key: 'problem_solving', label: '문제해결력' },
  { key: 'reasoning', label: '추론력' },
] as const;

function normAbilityKey(v: unknown): string {
  return String(v ?? '').toLowerCase().replace(/-/g, '_');
}

interface ScoutStat {
  key: string;
  label: string;
  value: number;
}

function collectScoutStats(questions: AnalyzedQuestion[]): ScoutStat[] {
  const total = questions.length;
  if (total === 0) return [];

  const abilityCounts: Record<string, number> = {
    calculation: 0,
    understanding: 0,
    problem_solving: 0,
    reasoning: 0,
  };
  let hardCount = 0;
  let essayCount = 0;
  for (const q of questions) {
    const k = normAbilityKey(q.ability_domain);
    if (k in abilityCounts) abilityCounts[k] += 1;
    if (questionDiff(q) >= 4) hardCount += 1;
    if (isEssayQuestion(q)) essayCount += 1;
  }

  const stats: ScoutStat[] = [];
  for (const ax of ABILITY_AXES) {
    const n = abilityCounts[ax.key];
    // 실제 문항이 있는 축만 — 0% 축을 그리면 "없는 능력"이 "약한 능력"으로 읽힌다.
    if (n > 0) stats.push({ key: ax.key, label: ax.label, value: Math.round((n / total) * 100) });
  }
  if (hardCount > 0) {
    stats.push({ key: 'hard', label: '심화', value: Math.round((hardCount / total) * 100) });
  }
  if (essayCount > 0) {
    stats.push({ key: 'essay', label: '서술형', value: Math.round((essayCount / total) * 100) });
  }
  // 4~5축이 카드로 읽힌다. 6개면 서술형을 접어 심화(킬러)를 남긴다.
  return stats.slice(0, 5);
}

function clipLine(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function scoutNotes(c: CommentaryResult): { label: string; text: string }[] {
  const out: { label: string; text: string }[] = [];
  if (c.strength_areas?.[0]) out.push({ label: '강점', text: clipLine(c.strength_areas[0], 86) });
  if (c.improvement_areas?.[0]) out.push({ label: '보완', text: clipLine(c.improvement_areas[0], 86) });
  const s0 = c.v4_final_strategy?.[0];
  const next = s0 ? [s0.area, s0.action].filter(Boolean).join(' — ') : '';
  if (next) out.push({ label: '다음', text: clipLine(next, 86) });
  return out.slice(0, 3);
}

function summaryScout(props: BlockRenderProps) {
  const bits = collectScoutStats(props.questions).map((s) => `${s.label} ${s.value}%`);
  return bits.length ? `스카우트 카드 — ${bits.join(', ')}` : '';
}

function radarPolygon(values: number[], max: number, cx: number, cy: number, r: number): string {
  const n = values.length;
  if (n === 0 || max <= 0) return '';
  return values
    .map((v, i) => {
      const rr = (v / max) * r;
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
    })
    .join(' ');
}

function ScoutRadar({ stats }: { stats: ScoutStat[] }) {
  const n = stats.length;
  const cx = 100;
  const cy = 100;
  const r = 72;
  const max = Math.max(...stats.map((s) => s.value), 1);
  const rings = [0.25, 0.5, 0.75, 1];
  const dataPts = radarPolygon(
    stats.map((s) => s.value),
    max,
    cx,
    cy,
    r,
  );

  return (
    <svg
      className="v3-scout-svg"
      viewBox="0 0 200 200"
      role="img"
      aria-label={stats.map((s) => `${s.label} ${s.value}%`).join(', ')}
    >
      {rings.map((k) => (
        <polygon
          key={k}
          points={radarPolygon(Array(n).fill(max * k) as number[], max, cx, cy, r)}
          fill="none"
          stroke="var(--v3-line-soft)"
          strokeWidth="1"
        />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={(cx + r * Math.cos(a)).toFixed(1)}
            y2={(cy + r * Math.sin(a)).toFixed(1)}
            stroke="var(--v3-line-soft)"
            strokeWidth="1"
          />
        );
      })}
      {n >= 3 && dataPts ? (
        <polygon
          points={dataPts}
          fill="var(--v3-accent)"
          fillOpacity="0.18"
          stroke="var(--v3-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ) : null}
      {n >= 3
        ? stats.map((s, i) => {
            const rr = (s.value / max) * r;
            const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
            return (
              <circle
                key={s.key}
                cx={(cx + rr * Math.cos(a)).toFixed(1)}
                cy={(cy + rr * Math.sin(a)).toFixed(1)}
                r="3.5"
                fill="var(--v3-paper)"
                stroke="var(--v3-accent)"
                strokeWidth="2"
              />
            );
          })
        : null}
    </svg>
  );
}

const statRadarBlock: CommentaryBlockDef = {
  id: 'statRadar',
  label: '스카우트 카드',
  description: '능력 레이더 · 스탯 · 스카우트 노트 3줄',
  // 스카우트 프리셋 전용 — 기존 문서 하단에 선수 카드가 붙으면 총평이 두 벌이 된다
  defaultEnabled: false,
  available: (_c, questions) => collectScoutStats(questions).length > 0,
  summary: summaryScout,
  variants: [
    {
      id: 'card',
      label: '선수 카드',
      hint: '레이더와 스탯을 가로로 — 기본',
      render: (props) => renderScout(props, false),
    },
    {
      id: 'stack',
      label: '세로',
      hint: '레이더 위, 스탯 아래',
      render: (props) => renderScout(props, true),
    },
  ],
};

function renderScout(props: BlockRenderProps, stack: boolean) {
  const stats = collectScoutStats(props.questions);
  if (!stats.length) return null;
  const notes = scoutNotes(props.commentary);
  const { meta } = props;
  const ovr = weightedAverageDifficulty(props.questions).avg;
  const who = [meta.schoolName, meta.grade].filter(Boolean).join(' ');

  return (
    <div className={`v3-scout${stack ? ' v3-scout-stack' : ''}`} {...blockAttrs('statRadar', summaryScout(props))}>
      <div className="v3-scout-head">
        <span className="v3-scout-kicker">스카우트 리포트</span>
        <strong className="v3-scout-name">{meta.examTitle}</strong>
        {who ? <span className="v3-scout-who">{who}</span> : null}
        {ovr > 0 ? (
          <span className="v3-scout-ovr">
            <em>{ovr.toFixed(1)}</em>
            <small>종합</small>
          </span>
        ) : null}
      </div>
      <div className="v3-scout-body">
        {stats.length >= 3 ? (
          <div className="v3-scout-radar">
            <ScoutRadar stats={stats} />
          </div>
        ) : null}
        <ul className="v3-scout-stats">
          {stats.map((s) => (
            <li key={s.key}>
              <span>{s.label}</span>
              <b>
                {s.value}
                <i>%</i>
              </b>
            </li>
          ))}
        </ul>
      </div>
      {notes.length > 0 ? (
        <div className="v3-scout-notes">
          {notes.map((n) => (
            <p key={n.label}>
              <b>{n.label}</b>
              {markdownToHighlighted(n.text, `v3-sc-${n.label}`)}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ── 처방전 (rxCard) ─────────────────────────────────────────────────────
// 진단 / 처방 / 예후 3칸. 빈 칸은 통째로 접는다 — 빈 처방전이 되면 신뢰가 깨진다.
// 진단 단원은 topic 마지막 조각(중단원)으로 묶는다. 대단원으로 묶으면 한 시험이
// 2~3덩어리로 뭉쳐 "어디에 심화가 몰렸는지"가 안 보인다 (weatherStrip 과 같은 이유).

function collectKillerClusters(questions: AnalyzedQuestion[]): { topic: string; count: number }[] {
  const map = new Map<string, number>();
  for (const q of questions) {
    if (questionDiff(q) < 4) continue;
    const topic = topicMidUnit(q.topic);
    map.set(topic, (map.get(topic) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count);
}

function rxPrescription(c: CommentaryResult): string[] {
  const fromAreas = (c.improvement_areas ?? []).filter(Boolean).slice(0, 3);
  if (fromAreas.length) return fromAreas;
  return (c.v4_final_strategy ?? [])
    .map((s) => s.area)
    .filter(Boolean)
    .slice(0, 3);
}

function rxPrognosis(c: CommentaryResult): string {
  return (c.conclusion?.body || c.v4_final_strategy?.[0]?.action || '').trim();
}

interface RxCol {
  key: 'dx' | 'rx' | 'px';
  title: string;
  lines: string[];
}

function collectRxCols(c: CommentaryResult, questions: AnalyzedQuestion[]): RxCol[] {
  const cols: RxCol[] = [];
  const dx = collectKillerClusters(questions);
  if (dx.length) {
    cols.push({
      key: 'dx',
      title: '진단',
      lines: dx.slice(0, 4).map((d) => `${d.topic} · 심화 ${d.count}문항`),
    });
  }
  const rx = rxPrescription(c);
  if (rx.length) cols.push({ key: 'rx', title: '처방', lines: rx });
  const px = rxPrognosis(c);
  if (px) cols.push({ key: 'px', title: '예후', lines: [px] });
  return cols;
}

function summaryRx(props: BlockRenderProps) {
  const cols = collectRxCols(props.commentary, props.questions);
  return cols.length ? `처방전 — ${cols.map((c) => c.title).join(' · ')}` : '';
}

const rxCardBlock: CommentaryBlockDef = {
  id: 'rxCard',
  label: '처방전',
  description: '진단 · 처방 · 예후 3칸. 빈 칸은 접힘',
  defaultEnabled: false,
  available: (c, questions) => collectRxCols(c, questions).length > 0,
  summary: summaryRx,
  variants: [
    {
      id: 'sheet',
      label: '처방전',
      hint: '가로 3칸 — 기본',
      render: (props) => renderRx(props, false),
    },
    {
      id: 'stack',
      label: '세로',
      hint: '칸을 아래로 쌓음',
      render: (props) => renderRx(props, true),
    },
  ],
};

function renderRx(props: BlockRenderProps, stack: boolean) {
  const cols = collectRxCols(props.commentary, props.questions);
  if (!cols.length) return null;
  const { meta, copy } = props;
  const who = [meta.schoolName, meta.grade, meta.examTitle].filter(Boolean).join(' · ');

  return (
    <div className={`v3-rx${stack ? ' v3-rx-stack' : ''}`} {...blockAttrs('rxCard', summaryRx(props))}>
      <div className="v3-rx-mark" aria-hidden>
        Rx
      </div>
      <div className="v3-rx-head">
        <span className="v3-rx-kicker">처방전</span>
        {who ? <strong className="v3-rx-who">{who}</strong> : null}
      </div>
      <div className="v3-rx-cols">
        {cols.map((col) => (
          <div key={col.key} className="v3-rx-col">
            <span className="v3-rx-col-title">{col.title}</span>
            {col.lines.map((line, i) => (
              <p key={`${col.key}-${i}`}>{markdownToHighlighted(line, `v3-rx-${col.key}-${i}`)}</p>
            ))}
          </div>
        ))}
      </div>
      <div className="v3-rx-sign">
        <span>{meta.analyzedAt ? new Date(meta.analyzedAt).toLocaleDateString('ko-KR') : ''}</span>
        <span className="v3-rx-sign-line">{copy.author}</span>
      </div>
    </div>
  );
}

// ── 벤토 그리드 (bentoGrid) ──────────────────────────────────────────────
// 위계는 타일 크기만으로. 색·테두리로 중요도를 나누면 "큰 칸"이 아니라
// "빨간 칸"이 되고, 다크 테마에서 겸용 토큰이 먼저 깨진다.
// 값은 이미 있는 집계만 재조합한다 — 새 분석 필드를 만들지 않는다.

interface BentoTile {
  key: string;
  size: 'hero' | 'sm' | 'wide';
  kicker: string;
  value: string;
  unit?: string;
  caption?: string;
}

function mostTestedTopic(questions: AnalyzedQuestion[]): { topic: string; count: number; points: number } | null {
  const map = new Map<string, { count: number; points: number }>();
  for (const q of questions) {
    const topic = topicMidUnit(q.topic);
    const cur = map.get(topic) ?? { count: 0, points: 0 };
    cur.count += 1;
    cur.points += typeof q.points === 'number' ? q.points : 0;
    map.set(topic, cur);
  }
  let best: { topic: string; count: number; points: number } | null = null;
  for (const [topic, v] of map) {
    if (!best || v.count > best.count || (v.count === best.count && v.points > best.points)) {
      best = { topic, ...v };
    }
  }
  return best;
}

function collectBentoTiles(props: BlockRenderProps): BentoTile[] {
  const { questions: qs, commentary: c } = props;
  if (!qs.length) return [];
  const tiles: BentoTile[] = [];
  const used = new Set<string>();

  const clusters = collectKillerClusters(qs);
  const top = mostTestedTopic(qs);
  const avg = weightedAverageDifficulty(qs);
  const essays = qs.filter(isEssayQuestion);
  const essayPts = sumPoints(essays.map((q) => q.points));
  const hardN = qs.filter((q) => questionDiff(q) >= 4).length;
  const hardPct = Math.round((hardN / qs.length) * 100);
  const one = c.blog_dek || c.v4_exam_overview?.one_liner || c.overall_comment || '';

  if (clusters[0]) {
    tiles.push({
      key: 'killer',
      size: 'hero',
      kicker: '킬러 쏠림',
      value: clusters[0].topic,
      caption: `심화 ${clusters[0].count}문항이 이 단원에 몰렸습니다`,
    });
    used.add('killer');
  } else if (top) {
    tiles.push({
      key: 'topic',
      size: 'hero',
      kicker: '최다 출제',
      value: top.topic,
      caption: `${top.count}문항 · ${top.points}점`,
    });
    used.add('topic');
  }

  if (avg.avg > 0) {
    tiles.push({ key: 'diff', size: 'sm', kicker: '평균 난이도', value: avg.avg.toFixed(1), unit: '/5' });
  }
  tiles.push({ key: 'hard', size: 'sm', kicker: '심화 비중', value: String(hardPct), unit: '%' });
  if (essays.length > 0) {
    tiles.push({
      key: 'essay',
      size: 'sm',
      kicker: '서술형 배점',
      value: String(essayPts),
      unit: '점',
      caption: `${essays.length}문항`,
    });
  }
  if (top && !used.has('topic')) {
    tiles.push({
      key: 'topic',
      size: 'sm',
      kicker: '최다 출제',
      value: top.topic,
      caption: `${top.count}문항`,
    });
  }
  if (one) {
    tiles.push({
      key: 'line',
      size: 'wide',
      kicker: '한 줄 총평',
      value: clipLine(one, 48),
    });
  }
  return tiles;
}

function summaryBento(props: BlockRenderProps) {
  const tiles = collectBentoTiles(props);
  const hero = tiles.find((t) => t.size === 'hero');
  return hero ? `벤토 — ${hero.kicker} ${hero.value}` : tiles.length ? '벤토 요약' : '';
}

const bentoGridBlock: CommentaryBlockDef = {
  id: 'bentoGrid',
  label: '벤토 그리드',
  description: '타일 크기로만 위계. 큰 칸은 킬러, 작은 칸은 숫자',
  defaultEnabled: false,
  available: (_c, questions) => questions.length > 0,
  summary: summaryBento,
  variants: [
    {
      id: 'three',
      label: '3열',
      hint: '히어로 2×2 + KPI — 기본',
      render: (props) => renderBento(props, false),
    },
    {
      id: 'two',
      label: '2열',
      hint: '좁은 지면용',
      render: (props) => renderBento(props, true),
    },
  ],
};

function renderBento(props: BlockRenderProps, twoCol: boolean) {
  const tiles = collectBentoTiles(props);
  if (!tiles.length) return null;

  return (
    <div
      className={`v3-bento${twoCol ? ' v3-bento-two' : ''}`}
      {...blockAttrs('bentoGrid', summaryBento(props))}
    >
      {tiles.map((t) => (
        <div
          key={t.key}
          className={`v3-bento-tile v3-bento-${t.size}${t.key === 'line' ? ' v3-bento-copy' : ''}`}
        >
          <span className="v3-bento-kicker">{t.kicker}</span>
          <strong className="v3-bento-value">
            {t.key === 'line' ? markdownToHighlighted(t.value, 'v3-bento-line') : t.value}
            {t.unit ? <em>{t.unit}</em> : null}
          </strong>
          {t.caption ? <span className="v3-bento-cap">{t.caption}</span> : null}
        </div>
      ))}
    </div>
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
  storySlideBlock,
  weatherStripBlock,
  subwayMapBlock,
  bubbleThreadBlock,
  statRadarBlock,
  rxCardBlock,
  bentoGridBlock,
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
