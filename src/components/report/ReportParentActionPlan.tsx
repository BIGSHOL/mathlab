'use client';

import type { ParentAIContent } from '@/types/report';

interface Props {
  studentName: string;
  parentAi: ParentAIContent;
}

const PERIOD_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  today: { label: '오늘 할 일', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  this_week: { label: '이번 주 목표', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  next_week: { label: '다음 주 계획', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
};

const PHASE_COLORS = [
  { bg: '#eff6ff', border: '#93c5fd', accent: '#2563eb', light: '#dbeafe' },
  { bg: '#fef3c7', border: '#fcd34d', accent: '#d97706', light: '#fef9c3' },
  { bg: '#ecfdf5', border: '#6ee7b7', accent: '#059669', light: '#d1fae5' },
];

export function ReportParentActionPlan({ studentName, parentAi }: Props) {
  return (
    <div style={{ padding: '28px 32px', fontSize: '11px', lineHeight: 1.6 }}>
      {/* 타이틀 */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-block', width: 3, height: 16, background: '#3b82f6', borderRadius: 2 }} />
        학습 실천 계획
      </h2>
      <p style={{ fontSize: 10, color: '#64748b', marginBottom: 16 }}>
        {studentName} 학생을 위한 구체적인 학습 로드맵입니다
      </p>

      {/* 액션 아이템 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {parentAi.actionItems.map((ai) => {
          const style = PERIOD_LABELS[ai.period] ?? PERIOD_LABELS.today;
          return (
            <div key={ai.period} style={{
              flex: 1, padding: '10px 12px', borderRadius: 6,
              background: style.bg, border: `1px solid ${style.border}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: style.color, marginBottom: 6 }}>
                {style.label}
              </div>
              <ul style={{ margin: 0, paddingLeft: 14 }}>
                {ai.items.map((item, i) => (
                  <li key={i} style={{ fontSize: 10, color: '#374151', marginBottom: 3, lineHeight: 1.5 }}>{item}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* 3단계 학습 계획 */}
      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-block', width: 3, height: 14, background: '#8b5cf6', borderRadius: 2 }} />
        단계별 학습 계획
      </h3>

      <div style={{ position: 'relative' }}>
        {/* 연결선 */}
        <div style={{
          position: 'absolute', left: 14, top: 24, bottom: 24,
          width: 2, background: '#e2e8f0', zIndex: 0,
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {parentAi.learningPhases.map((phase, idx) => {
            const color = PHASE_COLORS[idx] ?? PHASE_COLORS[0];
            return (
              <div key={idx} style={{ display: 'flex', gap: 12, position: 'relative', zIndex: 1 }}>
                {/* 순서 원 */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: color.accent, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {idx + 1}
                </div>
                {/* 내용 */}
                <div style={{
                  flex: 1, padding: '10px 14px', borderRadius: 6,
                  background: color.bg, border: `1px solid ${color.border}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: color.accent }}>{phase.name}</span>
                    <span style={{ fontSize: 9.5, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 3 }}>
                      {phase.duration}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                    {phase.topics.map((topic, i) => (
                      <span key={i} style={{
                        fontSize: 9.5, padding: '2px 8px', borderRadius: 3,
                        background: color.light, color: color.accent, fontWeight: 500,
                      }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.5 }}>
                    <strong>완료 기준:</strong> {phase.checkpoint}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 예상 향상 */}
      <div style={{
        marginTop: 16, padding: '12px 16px', borderRadius: 6,
        background: '#f0fdf4', border: '1px solid #bbf7d0',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
          기대 효과
        </div>
        <p style={{ fontSize: 10.5, color: '#15803d', margin: 0, lineHeight: 1.6 }}>
          {parentAi.expectedImprovement}
        </p>
      </div>
    </div>
  );
}
