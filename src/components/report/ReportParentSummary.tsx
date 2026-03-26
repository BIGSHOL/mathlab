'use client';

import type { ParentAIContent } from '@/types/report';

interface Props {
  studentName: string;
  overallAccuracy: number;
  correctCount: number;
  totalCount: number;
  recommendLevel: string;
  parentAi: ParentAIContent;
}

const LEVEL_HEX: Record<string, string> = {
  '1등급': '#7c3aed', '2등급': '#6366f1', '3등급': '#3b82f6',
  '4등급': '#0ea5e9', '5등급': '#22c55e', '6등급': '#84cc16',
  '7등급': '#eab308', '8등급': '#f97316', '9등급': '#ef4444',
};

export function ReportParentSummary({
  studentName,
  overallAccuracy,
  correctCount,
  totalCount,
  recommendLevel,
  parentAi,
}: Props) {
  const levelColor = LEVEL_HEX[recommendLevel] ?? '#6366f1';
  const wrongTotal = totalCount - correctCount;
  const carelessPct = wrongTotal > 0 ? Math.round((parentAi.mistakeSummary.carelessCount / wrongTotal) * 100) : 0;
  const conceptPct = wrongTotal > 0 ? Math.round((parentAi.mistakeSummary.conceptGapCount / wrongTotal) * 100) : 0;

  return (
    <div style={{ padding: '28px 32px', fontSize: '11px', lineHeight: 1.6 }}>
      {/* 타이틀 */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>
          학부모 안내 보고서
        </h2>
        <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
          {studentName} 학생의 레벨테스트 결과를 쉽게 정리했습니다
        </p>
      </div>

      {/* 종합 설명 카드 */}
      <div style={{
        background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6,
        padding: '14px 16px', marginBottom: 16,
      }}>
        <p style={{ fontSize: 11.5, color: '#0c4a6e', margin: 0, lineHeight: 1.7 }}>
          {parentAi.simpleExplanation}
        </p>
      </div>

      {/* 핵심 지표 2칸 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{
          flex: 1, textAlign: 'center', padding: '12px 8px',
          border: '1px solid #e2e8f0', borderRadius: 6,
        }}>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>진단 등급</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: levelColor }}>{recommendLevel}</div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{parentAi.characteristics.levelName}</div>
        </div>
        <div style={{
          flex: 1, textAlign: 'center', padding: '12px 8px',
          border: '1px solid #e2e8f0', borderRadius: 6,
        }}>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>정답률</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: overallAccuracy >= 70 ? '#059669' : overallAccuracy >= 50 ? '#d97706' : '#dc2626' }}>
            {overallAccuracy}%
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{correctCount}개 정답 / {totalCount}문항</div>
        </div>
      </div>

      {/* 오답 원인 분석 */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 3, height: 14, background: '#3b82f6', borderRadius: 2 }} />
          오답 원인 분석
        </h3>
        {wrongTotal === 0 ? (
          <p style={{ fontSize: 11, color: '#059669' }}>모든 문제를 맞혔습니다!</p>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            {/* 단순 실수 */}
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 6,
              background: '#fef3c7', border: '1px solid #fcd34d',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#92400e' }}>단순 실수</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#b45309' }}>{parentAi.mistakeSummary.carelessCount}개</span>
              </div>
              {/* 비율 바 */}
              <div style={{ height: 4, background: '#fde68a', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${carelessPct}%`, background: '#f59e0b', borderRadius: 2 }} />
              </div>
              <p style={{ fontSize: 9.5, color: '#78350f', marginTop: 6, lineHeight: 1.5 }}>
                {parentAi.mistakeSummary.carelessDescription}
              </p>
            </div>
            {/* 개념 부족 */}
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 6,
              background: '#fee2e2', border: '1px solid #fca5a5',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#7f1d1d' }}>개념 부족</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#dc2626' }}>{parentAi.mistakeSummary.conceptGapCount}개</span>
              </div>
              <div style={{ height: 4, background: '#fecaca', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${conceptPct}%`, background: '#ef4444', borderRadius: 2 }} />
              </div>
              <p style={{ fontSize: 9.5, color: '#7f1d1d', marginTop: 6, lineHeight: 1.5 }}>
                {parentAi.mistakeSummary.conceptGapDescription}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 강점 / 보완점 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 6 }}>
            잘하는 부분
          </h3>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {parentAi.characteristics.strengths.map((s, i) => (
              <li key={i} style={{ fontSize: 10.5, color: '#374151', marginBottom: 3, lineHeight: 1.5 }}>{s}</li>
            ))}
          </ul>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginBottom: 6 }}>
            보완이 필요한 부분
          </h3>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {parentAi.characteristics.weaknesses.map((w, i) => (
              <li key={i} style={{ fontSize: 10.5, color: '#374151', marginBottom: 3, lineHeight: 1.5 }}>{w}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 학습 도움 판단 */}
      <div style={{
        padding: '12px 16px', borderRadius: 6,
        background: parentAi.studyRecommendation === 'self' ? '#ecfdf5'
          : parentAi.studyRecommendation === 'short_course' ? '#fffbeb' : '#fef2f2',
        border: `1px solid ${parentAi.studyRecommendation === 'self' ? '#a7f3d0'
          : parentAi.studyRecommendation === 'short_course' ? '#fde68a' : '#fecaca'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
            {parentAi.studyRecommendation === 'self' ? '혼자서도 충분해요'
              : parentAi.studyRecommendation === 'short_course' ? '단기 특강을 추천해요'
                : '체계적인 학습이 필요해요'}
          </span>
        </div>
        <p style={{ fontSize: 10.5, color: '#475569', margin: 0, lineHeight: 1.6 }}>
          {parentAi.studyRecommendationReason}
        </p>
      </div>
    </div>
  );
}
