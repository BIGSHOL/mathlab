/**
 * V4 통합 뷰 — 갈수학학원 스타일 (테이블 중심, 9섹션)
 *
 * v1.2.0 (2026-05-27): 갈수학 일치율 90% 목표로 5섹션 추가 + 순서 재정렬.
 *
 * 섹션 순서 (갈수학 블로그 패턴):
 *  1. 헤더 (시험명 + 한 줄 요약)
 *  2. ▶ 들어가며 (시험 첫인상 단락)
 *  3. ▶ 시험 개요 (테이블 + 1등급 컷)
 *  4. 1등급 수학을 위한 학원 차별화 N가지 전략
 *  5. ▶ 문제 난이도 / 출제 단원 (행 색상 코딩 + 한 줄 해설)
 *  6. ▶ 출제 특징 요약 (회색 박스)
 *  7. ▶ 출제 핵심 포인트 (영역별 단락) — main_analysis
 *  8. ▶ 이전 시험과의 비교/대조
 *  9. ▶ 주요 문항 분석 (킬러 문항 3~5개)
 *  10. 차트 4종 PNG (선택)
 *  11. ▶ 다음 시험 대비 전략 (영역별 테이블)
 */

import { useMemo } from 'react';
import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import type { V3Meta, V3ChartImages } from '../v3/V3CommentaryView';
import { useAuth } from '@/hooks/useAuth';
import { stripCommentaryAcademyNames } from './helpers';
import { SectionHeading } from './SectionHeading';
import { IntroSection } from './IntroSection';
import { ExamOverviewTable } from './ExamOverviewTable';
import { AcademyStrategy } from './AcademyStrategy';
import { DifficultyByQuestionTable } from './DifficultyByQuestionTable';
import { ExamFeatures } from './ExamFeatures';
import { MainAnalysis } from './MainAnalysis';
import { PreviousComparison } from './PreviousComparison';
import { KeyQuestions } from './KeyQuestions';
import { FinalStrategyTable } from './FinalStrategyTable';

interface V4CommentaryViewProps {
  commentary: CommentaryResult;
  questions?: AnalyzedQuestion[];
  meta: V3Meta;
  charts?: V3ChartImages;
}

export function V4CommentaryView({ commentary, meta, charts }: V4CommentaryViewProps) {
  const { user } = useAuth();
  // 학원명 deep-strip (기존 데이터의 "갈수학학원" 잔여 + {학원명} placeholder → tenant 이름 or "우리 학원")
  // 메모이즈 — commentary/tenantName 바뀔 때만 재실행
  const c = useMemo(
    () => stripCommentaryAcademyNames(commentary, user?.tenantName ?? null),
    [commentary, user?.tenantName],
  );

  // 차트 표시 조건
  const showCharts = !!charts && Object.values(charts).some((v) => !!v);
  const toSrc = (s?: string) => {
    if (!s) return undefined;
    if (s.startsWith('data:') || s.startsWith('http')) return s;
    return `data:image/png;base64,${s}`;
  };

  // 헤더
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

      {/* ② 들어가며 */}
      {c.v4_intro && (
        <section className="v4-section">
          <SectionHeading title="들어가며" />
          <IntroSection intro={c.v4_intro} />
        </section>
      )}

      {/* ③ 시험 개요 (1등급 컷 포함) */}
      {c.v4_exam_overview && (
        <section className="v4-section">
          <SectionHeading title="시험 개요 및 1등급 컷 예상" />
          <ExamOverviewTable overview={c.v4_exam_overview} />
        </section>
      )}

      {/* ④ 학원 차별화 전략 */}
      {c.v4_academy_strategy && c.v4_academy_strategy.length > 0 && (
        <section className="v4-section">
          <SectionHeading title="1등급 수학을 위한 학원 차별화 전략" subtitle={`${c.v4_academy_strategy.length}가지`} />
          <AcademyStrategy items={c.v4_academy_strategy} />
        </section>
      )}

      {/* ⑤ 문제 번호별 난이도 / 출제 단원 */}
      {c.v4_difficulty_rows && c.v4_difficulty_rows.length > 0 && (
        <section className="v4-section">
          <SectionHeading
            title="문제 난이도 · 출제 단원"
            subtitle={`${c.v4_difficulty_rows.length}문항`}
          />
          <DifficultyByQuestionTable rows={c.v4_difficulty_rows} />
        </section>
      )}

      {/* ⑥ 출제 특징 요약 */}
      {c.v4_exam_features && (
        <section className="v4-section">
          <SectionHeading title="출제 특징 요약" />
          <ExamFeatures features={c.v4_exam_features} />
        </section>
      )}

      {/* ⑦ 출제 핵심 포인트 (영역별) */}
      {c.v4_main_analysis && c.v4_main_analysis.length > 0 && (
        <section className="v4-section">
          <SectionHeading title="출제 핵심 포인트" subtitle="영역별" />
          <MainAnalysis items={c.v4_main_analysis} />
        </section>
      )}

      {/* ⑧ 이전 시험과의 비교/대조 */}
      {c.v4_previous_comparison && (
        <section className="v4-section">
          <SectionHeading title="이전 시험과의 비교 · 대조" />
          <PreviousComparison comparison={c.v4_previous_comparison} />
        </section>
      )}

      {/* ⑨ 주요 문항 분석 (킬러 문항) */}
      {c.v4_key_questions && c.v4_key_questions.length > 0 && (
        <section className="v4-section">
          <SectionHeading title="주요 문항 분석" subtitle={`킬러 ${c.v4_key_questions.length}문항`} />
          <KeyQuestions items={c.v4_key_questions} />
        </section>
      )}

      {/* ⑩ 차트 4종 (선택) */}
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

      {/* ⑪ 이번 시험 단원별 피드백 (2026-05-28: '다음 시험 대비'에서 변경 — 의미 명확화) */}
      {c.v4_final_strategy && c.v4_final_strategy.length > 0 && (
        <section className="v4-section">
          <SectionHeading title="이번 시험 단원별 피드백" subtitle="단원별 학습 방향" />
          <FinalStrategyTable rows={c.v4_final_strategy} />
        </section>
      )}
    </div>
  );
}

/** V4 데이터 존재 여부 (lazy 생성 트리거용) — v4_exam_overview 있으면 V4로 간주 */
export function hasV4Data(commentary: CommentaryResult): boolean {
  return !!commentary.v4_exam_overview;
}
