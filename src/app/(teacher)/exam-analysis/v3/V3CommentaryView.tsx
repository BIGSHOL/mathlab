/**
 * V3 통합 뷰 — NYT Science 톤
 *
 * 시안: data/handoff-exam-analysis-v3/exam-analysis-commentary-hifi.html (V3 섹션)
 * Phase 0 시안: data/handoff-exam-analysis-v3/preview/commentary-merged.html
 *
 * 본문 구조:
 *  1. 헤더 (키커 + 헤드라인 + 덱 + 메타)
 *  2. KPI 4컬럼 (검정 배경, 색상 분리)
 *  3. 피처 박스 (FeatureCallout)
 *  4. 섹션 01: 데이터 인포그래픽 3종 (난이도/형식/문항지도)
 *  5. 섹션 02~N: Q&A
 *  6. 인용구 (pull_quote)
 *  7. 차트 4종 PNG (props.charts 있을 때만)
 *  8. 결론 박스 (#FFF8E0)
 *  9. 푸터
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { weightedAverageDifficulty } from '@/lib/exam-analysis/difficulty';
import { markdownToHighlighted, normDiff, koDifficultyText } from './helpers';
import { FeatureCallout } from './FeatureCallout';
import { QASection } from './QASection';
import { DifficultyStackedBar } from './DifficultyStackedBar';
import { FormatBreakdown } from './FormatBreakdown';
import { KillerMap } from './KillerMap';
// V3 강화 (2026-05-29): V4 핵심 5개 콘텐츠를 V3 매거진 스타일로 흡수
import { V3DifficultyTable } from './V3DifficultyTable';
import { V3MainAnalysis } from './V3MainAnalysis';
import { V3KeyQuestions } from './V3KeyQuestions';
import { V3PreviousComparison } from './V3PreviousComparison';
import { V3FinalStrategy } from './V3FinalStrategy';

export interface V3Meta {
  examTitle: string;
  schoolName: string | null;
  grade: string;
  analyzedAt: string | null;
  totalQuestions: number;
  totalPoints: number;
  hasStudentData: boolean;
}

export interface V3ChartImages {
  /** base64 PNG 또는 CDN URL */
  difficulty?: string;
  abilityRadar?: string;
  topicBar?: string;
  discrimination?: string;
}

interface V3CommentaryViewProps {
  commentary: CommentaryResult;
  questions: AnalyzedQuestion[];
  meta: V3Meta;
  /** 분석 화면에서 별도 차트 컴포넌트가 이미 차트를 표시 중이면 미전달 → V3CommentaryView에선 hidden */
  charts?: V3ChartImages;
}

export function V3CommentaryView({ commentary, questions, meta, charts }: V3CommentaryViewProps) {
  const c = commentary;

  // 헤더 변수 (V3 필드 없으면 meta 폴백)
  const kicker = c.blog_kicker || (meta.schoolName ? `시험 분석 · ${meta.schoolName} ${meta.examTitle}` : `시험 분석 · ${meta.examTitle}`);
  const headline = c.blog_headline || meta.examTitle;
  const dek = c.blog_dek || '';
  const analyzedDate = meta.analyzedAt ? meta.analyzedAt.slice(0, 10) : '';

  // KPI 4컬럼 계산
  const counts = [0, 0, 0, 0, 0];
  for (const q of questions) {
    const lv = Number(normDiff(String(q.difficulty)));
    if (lv >= 1 && lv <= 5) counts[lv - 1]++;
  }
  const totalDiff = counts.reduce((s, c2) => s + c2, 0);
  const weighted = weightedAverageDifficulty(questions).avg;
  const killerPct = totalDiff > 0 ? Math.round((counts[4] / totalDiff) * 100) : 0;
  const essayCount = questions.filter((q) => q.question_format === 'essay').length;
  const correctRate = (() => {
    const answered = questions.filter((q) => q.is_correct !== null);
    if (answered.length === 0) return null;
    return Math.round((answered.filter((q) => q.is_correct === true).length / answered.length) * 100);
  })();

  // Q&A 섹션 번호 시작점 (인포그래픽 섹션이 01)
  const qaStartNum = 2;
  const qaCount = c.blog_qa?.length || 0;

  // 차트 섹션 표시 조건 — props로 차트가 들어왔고 적어도 1개 키가 있을 때
  const showCharts = !!charts && Object.values(charts).some((v) => !!v);

  // ── V3 강화 섹션 번호 (Q&A 다음부터 순차 부여) ──
  // 01 인포그래픽 → 02..(1+qaCount) Q&A → 영역분석 → 주요문항 → 차트 → 단원피드백
  const hasMainAnalysis = !!c.v4_main_analysis?.length;
  const hasKeyQuestions = !!c.v4_key_questions?.length;
  const hasFinalStrategy = !!c.v4_final_strategy?.length;
  let nextSec = 2 + qaCount;
  const mainAnalysisNum = hasMainAnalysis ? String(nextSec++).padStart(2, '0') : '';
  const keyQuestionsNum = hasKeyQuestions ? String(nextSec++).padStart(2, '0') : '';
  const chartsNum = String(nextSec++).padStart(2, '0');
  const finalStrategyNum = hasFinalStrategy ? String(nextSec++).padStart(2, '0') : '';

  // 차트 URL 변환 (base64면 data URI 자동 prefix, 이미 URL이면 그대로)
  const toSrc = (s?: string) => {
    if (!s) return undefined;
    if (s.startsWith('data:') || s.startsWith('http')) return s;
    return `data:image/png;base64,${s}`;
  };

  return (
    <div className="v3">
      {/* ① 헤더 */}
      <header className="v3-top">
        <span className="v3-kicker">{kicker}</span>
        <h1>{headline}</h1>
        {dek && <p className="v3-dek">{koDifficultyText(dek)}</p>}
        <div className="v3-meta">
          <span className="v3-author">매스랩 AI 분석</span>
          <span className="v3-dot">·</span>
          <span>
            총 {meta.totalQuestions}문항 {meta.totalPoints}점
          </span>
          {analyzedDate && (
            <>
              <span className="v3-dot">·</span>
              <span>{analyzedDate}</span>
            </>
          )}
        </div>
      </header>

      {/* ② KPI 4컬럼 (검정 배경) */}
      <div className="v3-kpi-row">
        <div className="v3-kpi v3-kpi-1">
          <div className="v3-kpi-lb">평균 난이도</div>
          <div className="v3-kpi-v">
            {weighted.toFixed(1)}
            <span className="v3-kpi-of">/5</span>
          </div>
        </div>
        <div className="v3-kpi v3-kpi-2">
          <div className="v3-kpi-lb">킬러 비중</div>
          <div className="v3-kpi-v">
            {killerPct}
            <span className="v3-kpi-of">%</span>
          </div>
        </div>
        <div className="v3-kpi v3-kpi-3">
          <div className="v3-kpi-lb">서술형</div>
          <div className="v3-kpi-v">
            {essayCount}
            <span className="v3-kpi-of">문항</span>
          </div>
        </div>
        <div className="v3-kpi v3-kpi-4">
          <div className="v3-kpi-lb">{meta.hasStudentData ? '정답률' : '총 배점'}</div>
          <div className="v3-kpi-v">
            {correctRate !== null ? (
              <>
                {correctRate}
                <span className="v3-kpi-of">%</span>
              </>
            ) : (
              <>
                {meta.totalPoints}
                <span className="v3-kpi-of">점</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ③ 피처 박스 (거대 숫자) */}
      {c.feature_callout && <FeatureCallout callout={c.feature_callout} />}

      {/* ④ 섹션 01: 인포그래픽 3종 */}
      <section className="v3-section">
        <span className="v3-section-num">01</span>
        <div className="v3-section-sub">데이터 · 시험의 얼개</div>
        <h3>한눈에 보는 {meta.totalQuestions}문항의 구조</h3>
        <p>난이도·문제 형식·문항 위치를 시각화하여 시험의 전반적 구성을 빠르게 파악할 수 있도록 정리했습니다. 어떤 구간에 변별이 집중되어 있고, 어디서 점수가 좌우되는지 한 페이지로 확인하세요.</p>
        <DifficultyStackedBar questions={questions} />
        <div className="v3-info-grid-2">
          <FormatBreakdown questions={questions} />
          <KillerMap questions={questions} />
        </div>
        {/* 문항별 난이도·단원 상세 표 (V4 흡수) */}
        {c.v4_difficulty_rows && c.v4_difficulty_rows.length > 0 && (
          <V3DifficultyTable rows={c.v4_difficulty_rows} />
        )}
      </section>

      {/* ④-b 이전 시험 비교 콜아웃 (비교 데이터 있을 때만) */}
      {c.v4_previous_comparison?.headline && (
        <V3PreviousComparison comparison={c.v4_previous_comparison} />
      )}

      {/* ⑤ Q&A 섹션들 (num 02~) */}
      {c.blog_qa?.map((qa, idx) => (
        <QASection
          key={`qa-${idx}`}
          qa={qa}
          sectionNum={String(qaStartNum + idx).padStart(2, '0')}
          qaIndex={idx}
        />
      ))}

      {/* ⑤-b 영역별 출제 분석 (V4 흡수) */}
      {hasMainAnalysis && c.v4_main_analysis && (
        <V3MainAnalysis items={c.v4_main_analysis} sectionNum={mainAnalysisNum} />
      )}

      {/* ⑤-c 주요 문항 해설 (V4 흡수) */}
      {hasKeyQuestions && c.v4_key_questions && (
        <V3KeyQuestions items={c.v4_key_questions} sectionNum={keyQuestionsNum} />
      )}

      {/* ⑥ 인용구 (검정 상하 라인) */}
      {c.pull_quote && (
        <div className="v3-quote-block">
          <p>&quot;{c.pull_quote.text}&quot;</p>
          {c.pull_quote.cite && <span className="v3-quote-cite">{c.pull_quote.cite}</span>}
        </div>
      )}

      {/* ⑦ 차트 4종 PNG (props.charts 있을 때만) */}
      {showCharts && (
        <section className="v3-section">
          <span className="v3-section-num">{chartsNum}</span>
          <div className="v3-section-sub">그래프 · AI 분석 시각화</div>
          <h3>4개 차트로 본 시험의 통계</h3>
          <p>분석 화면의 4개 도표 — 난이도 분포·능력 영역·단원 출제 현황·변별력 — 를 그대로 옮겨 왔습니다.</p>
          <div className="v3-charts-grid">
            {charts?.difficulty && (
              <figure className="v3-chart-fig">
                <img src={toSrc(charts.difficulty)} alt="난이도 분포" />
                <figcaption>도표 1 — 난이도 분포 (총 {meta.totalQuestions}문항)</figcaption>
              </figure>
            )}
            {charts?.abilityRadar && (
              <figure className="v3-chart-fig">
                <img src={toSrc(charts.abilityRadar)} alt="능력 영역" />
                <figcaption>도표 2 — 능력 영역 분포 (계산력·이해력·문제해결력·추론력)</figcaption>
              </figure>
            )}
            {charts?.topicBar && (
              <figure className="v3-chart-fig v3-chart-fig-wide">
                <img src={toSrc(charts.topicBar)} alt="단원별 출제 현황" />
                <figcaption>도표 3 — 단원별 출제 현황 (상위 8개 단원)</figcaption>
              </figure>
            )}
            {charts?.discrimination && (
              <figure className="v3-chart-fig v3-chart-fig-wide">
                <img src={toSrc(charts.discrimination)} alt="변별력 분석" />
                <figcaption>도표 4 — 변별력 분석 (난이도·배점·형식 기반 지수)</figcaption>
              </figure>
            )}
          </div>
        </section>
      )}

      {/* ⑦-b 이번 시험 단원별 피드백 (V4 흡수) */}
      {hasFinalStrategy && c.v4_final_strategy && (
        <V3FinalStrategy rows={c.v4_final_strategy} sectionNum={finalStrategyNum} />
      )}

      {/* ⑧ 결론 박스 */}
      {c.conclusion && (
        <div className="v3-conclusion">
          <div className="v3-conclusion-sub">{c.conclusion.kicker || 'CONCLUSION · 다음 시험을 준비하는 학생에게'}</div>
          <h3>다음 시험을 준비하는 학생에게</h3>
          <p>{markdownToHighlighted(c.conclusion.body, 'concl')}</p>
        </div>
      )}

      {/* ⑨ 푸터 */}
      <footer className="v3-footer">
        <div className="v3-footer-meta">
          분석 · 매스랩 AI · {analyzedDate} · commentary v1.1.0
        </div>
      </footer>
    </div>
  );
}
