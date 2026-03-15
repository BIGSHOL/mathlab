'use client';

import { BarChart3, PlusCircle, GitCompareArrows } from 'lucide-react';
import type { LevelTestDomain } from '@/types';
import type { EditorQuestion } from '../right-panel/QuestionCard';
import { TabStatistics } from './TabStatistics';
import { TabAddQuestions } from './TabAddQuestions';
import { TabSimilarQuestions } from './TabSimilarQuestions';

export type EditorTab = 'statistics' | 'add' | 'similar';

interface LeftPanelProps {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  showDomain?: boolean;
  // Statistics props
  questions: EditorQuestion[];
  questionDomains: Record<string, LevelTestDomain>;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onScrollToQuestion: (index: number) => void;
  // Add questions props
  testGrade: number;
  onAddQuestion: (question: EditorQuestion, domain?: LevelTestDomain) => void;
  onRemoveQuestion: (questionId: string) => void;
  onDomainChange: (questionId: string, domain: LevelTestDomain) => void;
  // Similar props
  similarSourceQuestion: EditorQuestion | null;
  similarSourceDomain: LevelTestDomain | null;
  onReplaceQuestion: (oldId: string, newQuestion: EditorQuestion, domain?: LevelTestDomain) => void;
}

const TABS: { key: EditorTab; label: string; icon: typeof BarChart3 }[] = [
  { key: 'statistics', label: '문제 통계', icon: BarChart3 },
  { key: 'add', label: '문제 추가', icon: PlusCircle },
  { key: 'similar', label: '유사 문제', icon: GitCompareArrows },
];

export function LeftPanel({
  activeTab,
  onTabChange,
  showDomain = true,
  questions,
  questionDomains,
  onReorder,
  onScrollToQuestion,
  testGrade,
  onAddQuestion,
  onRemoveQuestion,
  onDomainChange,
  similarSourceQuestion,
  similarSourceDomain,
  onReplaceQuestion,
}: LeftPanelProps) {
  const selectedIds = new Set(questions.map((q) => q.id));

  return (
    <div className="w-[440px] shrink-0 border-r border-slate-200 bg-white flex flex-col min-h-0">
      {/* 탭 바 */}
      <div className="shrink-0 flex border-b border-slate-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
              activeTab === key
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-text-secondary hover:text-text-primary hover:bg-slate-50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'statistics' && (
          <TabStatistics
            questions={questions}
            questionDomains={questionDomains}
            showDomain={showDomain}
            onReorder={onReorder}
            onScrollToQuestion={onScrollToQuestion}
          />
        )}
        {activeTab === 'add' && (
          <TabAddQuestions
            selectedIds={selectedIds}
            selectedDomains={questionDomains}
            showDomain={showDomain}
            testGrade={testGrade}
            onAdd={onAddQuestion}
            onRemove={onRemoveQuestion}
            onDomainChange={onDomainChange}
          />
        )}
        {activeTab === 'similar' && (
          <TabSimilarQuestions
            sourceQuestion={similarSourceQuestion}
            sourceDomain={similarSourceDomain}
            showDomain={showDomain}
            selectedIds={selectedIds}
            onReplace={onReplaceQuestion}
            onAdd={onAddQuestion}
          />
        )}
      </div>
    </div>
  );
}
