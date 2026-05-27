/**
 * V4 통합 뷰 — 갈수학학원 스타일 (테이블 중심)
 *
 * AI 생성 v4_* 필드를 사용. 데이터 없으면 lazy 생성 안내(부모 컴포넌트 처리).
 *
 * 본문 구조:
 *  1. 헤더 (시험명 + 한 줄 요약)
 *  2. ✏ 시험 개요 (테이블)
 *  3. ✏ 문제 번호별 난이도/단원 (테이블, 행 색상 코딩)
 *  4. ✏ 출제 특징 요약 (회색 박스)
 *  5. ✏ 주요 공정 분석 (영역별 단락)
 *  6. ✏ 기말 대비 전략 (영역별 테이블)
 *  7. 차트 4종 PNG (선택)
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import type { V3Meta, V3ChartImages } from '../v3/V3CommentaryView';
import { SectionHeading } from './SectionHeading';
import { ExamOverviewTable } from './ExamOverviewTable';
import { DifficultyByQuestionTable } from './DifficultyByQuestionTable';
import { ExamFeatures } from './ExamFeatures';
import { MainAnalysis } from './MainAnalysis';
import { FinalStrategyTable } from './FinalStrategyTable';

interface V4CommentaryViewProps {
  commentary: CommentaryResult;
  /** 분석 결과 — 사용 안 함 (V4Extension 데이터만 사용) */
  questions?: AnalyzedQuestion[];
  /** 메타 정보 — V4 미생성 시 헤더 폴백용 */
  meta: V3Meta;
  /** 차트 4종 (선택) */
  charts?: V3ChartImages;
}

export function V4CommentaryView({ commentary, meta, charts }: V4CommentaryViewProps) {
  const c = commentary;

  // 차트 표시 조건
  const showCharts = !!charts && Object.values(charts).some((v) => !!v);
  const toSrc = (s?: string) => {
    if (!s) return undefined;
    if (s.startsWith('data:') || s.startsWith('http')) return s;
    return `data:image/png;base64,${s}`;
  };

  // 헤더 (V4 overview가 있으면 그것 사용, 없으면 meta 폴백)
  const headerTitle = c.v4_exam_overview?.title || meta.examTitle;
  const headerSchoolGrade = c.v4_exam_overview
    ? [c.v4_exam_overview.school, c.v4_exam_overview.grade].filter(Boolean).join(' · ')
    : [meta.schoolName, meta.grade].filter(Boolean).join(' · ');
  const headerOneLiner = c.v4_exam_overview?.one_liner;

  return (
    <div className="v4">
      {/* ① 헤더 */}
      <header className="v4-top">
        {headerSchoolGrade && <span className="v4-kicker">{headerSchoolGrade}</span>}
        <h1 className="v4-headline">{headerTitle}</h1>
        {headerOneLiner && <p className="v4-dek">{headerOneLiner}</p>}
      </header>

      {/* ② 시험 개요 */}
      {c.v4_exam_overview && (
        <section className="v4-section">
          <SectionHeading title="시험 개요" />
          <ExamOverviewTable overview={c.v4_exam_overview} />
        </section>
      )}

      {/* ③ 문제 번호별 난이도 / 출제 단원 */}
      {c.v4_difficulty_rows && c.v4_difficulty_rows.length > 0 && (
        <section className="v4-section">
          <SectionHeading
            title="문제 난이도 · 출제 단원"
            subtitle={`${c.v4_difficulty_rows.length}문항`}
          />
          <DifficultyByQuestionTable rows={c.v4_difficulty_rows} />
        </section>
      )}

      {/* ④ 출제 특징 요약 */}
      {c.v4_exam_features && (
        <section className="v4-section">
          <SectionHeading title="출제 특징 요약" />
          <ExamFeatures features={c.v4_exam_features} />
        </section>
      )}

      {/* ⑤ 주요 공정 분석 */}
      {c.v4_main_analysis && c.v4_main_analysis.length > 0 && (
        <section className="v4-section">
          <SectionHeading title="주요 공정 분석" subtitle="영역별" />
          <MainAnalysis items={c.v4_main_analysis} />
        </section>
      )}

      {/* ⑥ 차트 4종 (선택적) */}
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

      {/* ⑦ 기말 대비 전략 */}
      {c.v4_final_strategy && c.v4_final_strategy.length > 0 && (
        <section className="v4-section">
          <SectionHeading title="기말고사 대비 전략" subtitle="영역별 권장" />
          <FinalStrategyTable rows={c.v4_final_strategy} />
        </section>
      )}
    </div>
  );
}

/** V4 데이터 존재 여부 (lazy 생성 트리거용) */
export function hasV4Data(commentary: CommentaryResult): boolean {
  return !!(
    commentary.v4_exam_overview &&
    commentary.v4_difficulty_rows &&
    commentary.v4_difficulty_rows.length > 0
  );
}
