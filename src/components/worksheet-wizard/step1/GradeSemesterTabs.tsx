'use client';

import { useWizardStore, BOOK_CODES_BY_LEVEL, BOOK_CODE_LABELS } from '@/stores/wizardStore';
import type { SchoolLevel } from '@/stores/wizardStore';

const SCHOOL_LEVELS: { key: SchoolLevel; label: string }[] = [
  { key: 'elementary', label: '초' },
  { key: 'middle', label: '중' },
  { key: 'high', label: '고' },
];

interface QuestionCountMap {
  [bookCode: string]: number;
}

interface GradeSemesterTabsProps {
  questionCounts?: QuestionCountMap;
}

export function GradeSemesterTabs({ questionCounts }: GradeSemesterTabsProps) {
  const { schoolLevel, selectedBookCodes, setSchoolLevel, toggleBookCode } = useWizardStore();
  const bookCodes = BOOK_CODES_BY_LEVEL[schoolLevel];

  return (
    <div className="space-y-3">
      {/* 학교급 탭 */}
      <div className="flex gap-1">
        {SCHOOL_LEVELS.map((level) => (
          <button
            key={level.key}
            onClick={() => setSchoolLevel(level.key)}
            className={`px-4 py-1.5 rounded-sm text-sm font-medium transition-colors ${
              schoolLevel === level.key
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {level.label}
          </button>
        ))}
      </div>

      {/* 학년-학기 탭 */}
      {bookCodes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {bookCodes.map((code) => {
            const isSelected = selectedBookCodes.includes(code);
            const count = questionCounts?.[code];
            return (
              <button
                key={code}
                onClick={() => toggleBookCode(code)}
                className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-colors border ${
                  isSelected
                    ? 'border-primary bg-blue-50 text-primary'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {BOOK_CODE_LABELS[code] ?? code}
                {count != null && count > 0 && (
                  <span className={`ml-1 text-xs ${isSelected ? 'text-primary/70' : 'text-slate-400'}`}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-400">고등 문제은행은 준비 중입니다.</p>
      )}
    </div>
  );
}
