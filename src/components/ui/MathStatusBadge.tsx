'use client';

import { classifyAnswer, type AnswerStatus, type AnswerStatusInfo, getStatusInfo } from '@/lib/utils/answer-status';
import { Badge } from './Badge';

interface MathStatusBadgeProps {
  isCorrect: boolean;
  timeSpentSeconds: number;
  difficulty: string;
  showLabel?: boolean;
}

interface MathStatusBadgeFromStatusProps {
  status: AnswerStatus;
  showLabel?: boolean;
}

function StatusBadge({ info, showLabel }: { info: AnswerStatusInfo; showLabel: boolean }) {
  return (
    <Badge
      variant={info.status}
      title={info.description}
      className="cursor-default"
    >
      <span className="text-sm leading-none">{info.symbol}</span>
      {showLabel && <span className="ml-1">{info.label}</span>}
    </Badge>
  );
}

export function MathStatusBadge({ isCorrect, timeSpentSeconds, difficulty, showLabel = false }: MathStatusBadgeProps) {
  const info = classifyAnswer({ isCorrect, timeSpentSeconds, difficulty });
  return <StatusBadge info={info} showLabel={showLabel} />;
}

export function MathStatusBadgeFromStatus({ status, showLabel = false }: MathStatusBadgeFromStatusProps) {
  const info = getStatusInfo(status);
  return <StatusBadge info={info} showLabel={showLabel} />;
}
