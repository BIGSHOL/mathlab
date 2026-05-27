/**
 * V4 문제 번호별 난이도 테이블
 *
 * 갈수학학원 스타일의 핵심 — 1~N번 문제별로 단원 + 난이도 + 배점을 표로 정리.
 * 각 행의 배경 색상이 난이도에 따라 자동 변화 (V4_DIFF_ROW_COLORS).
 * 학부모가 "어떤 번호가 어려운지" 즉시 파악 가능.
 */

import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { V4_DIFF_ROW_COLORS, V3_DIFF_LABELS, normDiff } from './helpers';

interface DifficultyByQuestionTableProps {
  questions: AnalyzedQuestion[];
}

export function DifficultyByQuestionTable({ questions }: DifficultyByQuestionTableProps) {
  // 문항을 번호 순으로 정렬 (서술형은 뒤에)
  const sorted = [...questions].sort((a, b) => {
    const aEssay = a.question_format === 'essay';
    const bEssay = b.question_format === 'essay';
    if (aEssay && !bEssay) return 1;
    if (!aEssay && bEssay) return -1;
    const aNum = typeof a.question_number === 'string' ? parseInt(a.question_number, 10) || 0 : a.question_number;
    const bNum = typeof b.question_number === 'string' ? parseInt(b.question_number, 10) || 0 : b.question_number;
    return aNum - bNum;
  });

  return (
    <table className="v4-diff-table">
      <thead>
        <tr>
          <th style={{ width: '10%' }}>번호</th>
          <th style={{ width: '50%' }}>단원 / 핵심 내용</th>
          <th style={{ width: '20%' }}>난이도</th>
          <th style={{ width: '20%' }}>배점</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((q) => {
          const lv = Number(normDiff(String(q.difficulty)));
          const validLv = lv >= 1 && lv <= 5 ? lv : 3;
          const rowBg = V4_DIFF_ROW_COLORS[validLv - 1];
          const diffLabel = V3_DIFF_LABELS[validLv - 1];

          // topic 파싱 — "수학 > 단원 > 소단원" → "소단원" 우선
          const topicShort = q.topic
            ? q.topic.split('>').map((s) => s.trim()).filter(Boolean).slice(-1)[0] || q.topic
            : '미분류';

          // 번호 표시 (서술형은 "서술1" 형태)
          const numLabel = String(q.question_number);
          const isEssay = q.question_format === 'essay';

          return (
            <tr key={String(q.question_number)} style={{ backgroundColor: rowBg }}>
              <td className="v4-diff-num">
                <strong>{isEssay ? numLabel : numLabel}</strong>
              </td>
              <td className="v4-diff-topic">{topicShort}</td>
              <td className="v4-diff-level">
                Lv {validLv} <span className="v4-meta-sub">{diffLabel}</span>
              </td>
              <td className="v4-diff-points">
                <strong>{q.points ?? '—'}</strong>
                {q.points !== null && <span className="v4-meta-sub"> 점</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
