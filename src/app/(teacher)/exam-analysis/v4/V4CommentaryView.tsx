/**
 * V4 통합 뷰 — 갈수학학원 스타일 (테이블 중심)
 *
 * 시안: 갈수학학원 시험 분석 블로그 (사용자 제공 스크린샷 2장)
 *
 * V3와 동일한 CommentaryResult 데이터를 다른 표현으로 렌더.
 *
 * 본문 구조:
 *  1. 헤더 (시험명 + 짧은 요약)
 *  2. ✏ 시험 개요 (테이블)
 *  3. ✏ 문제 번호별 난이도 (테이블, 행 색상 코딩)
 *  4. ✏ 출제 특징 (회색 박스 자연 단락) — Phase 2
 *  5. ✏ 주요 공정 분석 (단락) — Phase 2
 *  6. ✏ 기말 대비 전략 (테이블) — Phase 2
 *  7. 차트 4종 PNG (props.charts 있을 때만)
 *  8. 결론 박스 — Phase 2
 *  9. 학원 푸터 — Phase 4
 *
 * Phase 1은 1~3 + 차트 + 헤더만 구현.
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import type { V3Meta, V3ChartImages } from '../v3/V3CommentaryView';
import { SectionHeading } from './SectionHeading';
import { ExamOverviewTable } from './ExamOverviewTable';
import { DifficultyByQuestionTable } from './DifficultyByQuestionTable';
import { markdownToHighlighted } from './helpers';

interface V4CommentaryViewProps {
  commentary: CommentaryResult;
  questions: AnalyzedQuestion[];
  meta: V3Meta;
  charts?: V3ChartImages;
}

export function V4CommentaryView({ commentary, questions, meta, charts }: V4CommentaryViewProps) {
  const c = commentary;

  // 헤더 — V3 헤드라인보다 학원 톤
  const headline = c.blog_headline || meta.examTitle;
  const dek = c.blog_dek || '';
  const schoolGrade = [meta.schoolName, meta.grade].filter(Boolean).join(' ');

  // 차트 표시 조건
  const showCharts = !!charts && Object.values(charts).some((v) => !!v);
  const toSrc = (s?: string) => {
    if (!s) return undefined;
    if (s.startsWith('data:') || s.startsWith('http')) return s;
    return `data:image/png;base64,${s}`;
  };

  return (
    <div className="v4">
      {/* ① 헤더 */}
      <header className="v4-top">
        {schoolGrade && <span className="v4-kicker">{schoolGrade}</span>}
        <h1 className="v4-headline">{headline}</h1>
        {dek && <p className="v4-dek">{markdownToHighlighted(dek, 'v4-dek')}</p>}
      </header>

      {/* ② 시험 개요 */}
      <section className="v4-section">
        <SectionHeading title="시험 개요" />
        <ExamOverviewTable commentary={c} questions={questions} meta={meta} />
      </section>

      {/* ③ 문제 번호별 난이도 */}
      <section className="v4-section">
        <SectionHeading title="문제 난이도 / 출제 단원" subtitle={`${questions.length}문항`} />
        <DifficultyByQuestionTable questions={questions} />
      </section>

      {/* ④ 출제 특징 요약 (overall_comment) — Phase 1에서도 회색 박스로 단순 표시 */}
      {c.overall_comment && (
        <section className="v4-section">
          <SectionHeading title="출제 특징 요약" />
          <div className="v4-grey-box">
            <p>{markdownToHighlighted(c.overall_comment, 'v4-overall')}</p>
          </div>
        </section>
      )}

      {/* ⑤ 차트 4종 (선택적) */}
      {showCharts && (
        <section className="v4-section">
          <SectionHeading title="시각 분석" subtitle="난이도 · 능력 · 단원 · 변별력" />
          <div className="v4-charts-grid">
            {charts?.difficulty && (
              <figure className="v4-chart">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={toSrc(charts.difficulty)} alt="난이도 분포" />
                <figcaption>난이도 분포</figcaption>
              </figure>
            )}
            {charts?.abilityRadar && (
              <figure className="v4-chart">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={toSrc(charts.abilityRadar)} alt="능력 영역 레이더" />
                <figcaption>능력 영역 레이더</figcaption>
              </figure>
            )}
            {charts?.topicBar && (
              <figure className="v4-chart">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={toSrc(charts.topicBar)} alt="단원별 출제" />
                <figcaption>단원별 출제</figcaption>
              </figure>
            )}
            {charts?.discrimination && (
              <figure className="v4-chart">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={toSrc(charts.discrimination)} alt="변별력" />
                <figcaption>변별력</figcaption>
              </figure>
            )}
          </div>
        </section>
      )}

      {/* ⑥ 결론 (conclusion.body) — Phase 1에서도 회색 박스로 표시 */}
      {c.conclusion?.body && (
        <section className="v4-section">
          <SectionHeading title="총평 및 결론" />
          <div className="v4-conclusion-box">
            {c.conclusion.kicker && <div className="v4-conclusion-title">{c.conclusion.kicker}</div>}
            <p>{markdownToHighlighted(c.conclusion.body, 'v4-conclusion')}</p>
          </div>
        </section>
      )}

      {/* Phase 2~4 자리 (StrategyTable / TopicPerformanceTable / FeatureSummary / AcademyFooter) */}
    </div>
  );
}
