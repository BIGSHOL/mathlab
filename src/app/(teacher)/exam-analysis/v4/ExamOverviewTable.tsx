/**
 * V4 시험 개요 테이블
 *
 * 갈수학학원 스타일의 좌측 라벨 + 우측 내용 2열 테이블.
 * 학부모가 한눈에 시험의 정체를 파악할 수 있도록.
 *
 * 데이터: V3 CommentaryResult + meta + 계산된 ExamStats
 */

import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import type { V3Meta } from '../v3/V3CommentaryView';
import { computeExamStats, difficultyLabel, V3_DIFF_LABELS } from './helpers';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';

interface ExamOverviewTableProps {
  commentary: CommentaryResult;
  questions: AnalyzedQuestion[];
  meta: V3Meta;
}

export function ExamOverviewTable({ commentary, questions, meta }: ExamOverviewTableProps) {
  const stats = computeExamStats(questions);
  const c = commentary;

  // 가장 많이 출제된 단원 1~2개 (topic_performance 또는 questions 직접 집계)
  const topTopics = (() => {
    const topicCount: Record<string, number> = {};
    for (const q of questions) {
      if (!q.topic) continue;
      // "수학 > 단원 > 소단원" 형태에서 단원만 추출
      const parts = q.topic.split('>').map((s) => s.trim());
      const mainUnit = parts[parts.length - 2] || parts[parts.length - 1] || q.topic;
      topicCount[mainUnit] = (topicCount[mainUnit] || 0) + 1;
    }
    return Object.entries(topicCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t);
  })();

  // 가장 높은 난이도의 문제 수
  const peakDiff = stats.difficultyCounts.findLastIndex((cnt) => cnt > 0) + 1; // 1~5
  const peakDiffCount = stats.difficultyCounts[peakDiff - 1] || 0;

  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: '시험명', value: meta.examTitle },
    {
      label: '학년',
      value: `${meta.grade}${meta.schoolName ? ` · ${meta.schoolName}` : ''}`,
    },
    {
      label: '문항 수 · 만점',
      value: `${stats.totalQuestions}문항 · ${stats.totalPoints}점`,
    },
    {
      label: '출제 범위',
      value: topTopics.length > 0 ? topTopics.join(' · ') : '미분류',
    },
    {
      label: '전체 난이도',
      value: (
        <>
          <strong>{difficultyLabel(stats.weightedAvg)}</strong>
          <span className="v4-meta-sub"> (가중 평균 Lv {stats.weightedAvg.toFixed(2)})</span>
        </>
      ),
    },
    {
      label: '최고 난이도',
      value: (
        <>
          Lv {peakDiff} <strong>{V3_DIFF_LABELS[peakDiff - 1]}</strong>
          <span className="v4-meta-sub"> · {peakDiffCount}문항</span>
        </>
      ),
    },
  ];

  // 서술형이 있으면 추가
  if (stats.essayCount > 0) {
    rows.push({
      label: '서술형',
      value: `${stats.essayCount}문항 · ${stats.essayPointsTotal}점 (${Math.round((stats.essayPointsTotal / stats.totalPoints) * 100)}%)`,
    });
  }

  // 학생 답안 정답률 (학생 시험지일 때만)
  if (stats.correctRate !== null) {
    rows.push({
      label: '학생 정답률',
      value: `${stats.correctRate}%`,
    });
  }

  // dek가 있으면 1줄 요약 추가
  if (c.blog_dek) {
    rows.push({ label: '한 줄 요약', value: c.blog_dek });
  }

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
