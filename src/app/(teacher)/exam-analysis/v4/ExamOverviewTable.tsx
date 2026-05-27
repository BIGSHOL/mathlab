/**
 * V4 시험 개요 테이블
 *
 * AI 생성 v4_exam_overview 데이터를 그대로 표시.
 * 갈수학학원 스타일의 좌측 라벨 + 우측 내용 2열 테이블.
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';

interface ExamOverviewTableProps {
  overview: NonNullable<CommentaryResult['v4_exam_overview']>;
}

export function ExamOverviewTable({ overview }: ExamOverviewTableProps) {
  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: '시험명', value: overview.title },
    {
      label: '학년 · 학교',
      value: overview.school
        ? `${overview.grade} · ${overview.school}`
        : overview.grade,
    },
    {
      label: '문항 · 만점',
      value: `${overview.total_questions}문항 · ${overview.total_points}점`,
    },
    { label: '출제 범위', value: overview.range },
    {
      label: '전체 난이도',
      value: <strong>{overview.avg_difficulty_label}</strong>,
    },
    { label: '최고 난이도', value: overview.peak_difficulty },
  ];

  if (overview.essay_summary) {
    rows.push({ label: '서술형', value: overview.essay_summary });
  }

  rows.push({
    label: '한 줄 요약',
    value: <strong>{overview.one_liner}</strong>,
  });

  return (
    <table className="v4-overview-table">
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            <th className="v4-overview-label">{row.label}</th>
            <td className="v4-overview-value">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
