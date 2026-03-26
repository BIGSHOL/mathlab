'use client';

import type { ParentAIContent } from '@/types/report';

interface Props {
  studentName: string;
  overallAccuracy: number;
  parentAi: ParentAIContent;
}

export function ReportParentEncouragement({ studentName, overallAccuracy, parentAi }: Props) {
  return (
    <div style={{ padding: '28px 32px', fontSize: '11px', lineHeight: 1.6 }}>
      {/* 성적 향상 전망 */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-block', width: 3, height: 16, background: '#059669', borderRadius: 2 }} />
        성적 향상 전망
      </h2>
      <p style={{ fontSize: 10, color: '#64748b', marginBottom: 14 }}>
        꾸준히 학습하면 이렇게 달라질 수 있어요
      </p>

      {/* 향상 시각화 */}
      <div style={{
        padding: '16px 20px', borderRadius: 6,
        background: 'linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%)',
        border: '1px solid #bae6fd', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          {/* 현재 */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#64748b', marginBottom: 2 }}>현재</div>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: overallAccuracy >= 70 ? '#dcfce7' : overallAccuracy >= 50 ? '#fef9c3' : '#fee2e2',
              border: `2px solid ${overallAccuracy >= 70 ? '#22c55e' : overallAccuracy >= 50 ? '#eab308' : '#ef4444'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800,
              color: overallAccuracy >= 70 ? '#166534' : overallAccuracy >= 50 ? '#854d0e' : '#991b1b',
            }}>
              {overallAccuracy}%
            </div>
          </div>
          {/* 화살표 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ fontSize: 20, color: '#3b82f6' }}>→</div>
            <div style={{ fontSize: 8, color: '#64748b' }}>학습 후</div>
          </div>
          {/* 목표 */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#64748b', marginBottom: 2 }}>목표</div>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#dcfce7', border: '2px solid #22c55e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: '#166534',
            }}>
              {Math.min(overallAccuracy + 20, 100)}%
            </div>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: 10.5, color: '#334155', marginTop: 12, lineHeight: 1.6 }}>
          {parentAi.improvementOutlook}
        </p>
      </div>

      {/* 취약 단원 우선순위 */}
      {parentAi.topicWeaknesses.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 3, height: 14, background: '#ef4444', borderRadius: 2 }} />
            집중 학습이 필요한 단원
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {parentAi.topicWeaknesses.slice(0, 5).map((tw, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 6,
                background: '#fff', border: '1px solid #e2e8f0',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: tw.severityScore >= 0.7 ? '#fee2e2' : tw.severityScore >= 0.4 ? '#fef9c3' : '#f1f5f9',
                  color: tw.severityScore >= 0.7 ? '#dc2626' : tw.severityScore >= 0.4 ? '#ca8a04' : '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>{tw.topic}</div>
                  <div style={{ fontSize: 9.5, color: '#64748b', lineHeight: 1.5 }}>{tw.details}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 격려 메시지 */}
      <div style={{
        padding: '16px 20px', borderRadius: 6,
        background: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 100%)',
        border: '1px solid #e9d5ff', marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', marginBottom: 8, textAlign: 'center' }}>
          {studentName} 학생에게 전하는 응원
        </div>
        <p style={{ fontSize: 11, color: '#581c87', margin: 0, lineHeight: 1.8, textAlign: 'center' }}>
          {parentAi.motivationalMessage}
        </p>
      </div>

      {/* 마지막 응원 */}
      <div style={{
        padding: '14px 20px', borderRadius: 6,
        background: '#f8fafc', border: '1px solid #e2e8f0',
      }}>
        <p style={{ fontSize: 10.5, color: '#475569', margin: 0, lineHeight: 1.7 }}>
          {parentAi.encouragement}
        </p>
      </div>

      {/* 하단 안내 */}
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 9, color: '#94a3b8', margin: 0 }}>
          본 보고서는 AI 분석 결과를 기반으로 작성되었습니다. 자세한 상담은 담당 선생님께 문의해 주세요.
        </p>
      </div>
    </div>
  );
}
