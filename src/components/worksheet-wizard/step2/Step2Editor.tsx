'use client';

import { useState, useCallback, useMemo } from 'react';
import { useWizardStore } from '@/stores/wizardStore';
import { LeftPanel } from '@/components/level-test-editor/left-panel/LeftPanel';
import type { EditorTab } from '@/components/level-test-editor/left-panel/LeftPanel';
import { RightPanel } from '@/components/level-test-editor/right-panel/RightPanel';
import type { SortCriterion } from '@/components/level-test-editor/right-panel/RightPanel';
import { EditorBottomBar } from '@/components/level-test-editor/EditorBottomBar';
import type { EditorQuestion } from '@/components/level-test-editor/right-panel/QuestionCard';
import type { LevelTestDomain } from '@/types';

export function Step2Editor() {
  const {
    mode,
    questions,
    questionDomains,
    grade,
    addQuestion,
    removeQuestion,
    reorderQuestion,
    setQuestionDomain,
    setQuestions,
    setStep,
  } = useWizardStore();

  const showDomain = mode === 'level_test';

  const [activeTab, setActiveTab] = useState<EditorTab>('statistics');
  const [similarSourceId, setSimilarSourceId] = useState<string | null>(null);

  // 영역별 카운트
  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const domain of Object.values(questionDomains)) {
      counts[domain] = (counts[domain] || 0) + 1;
    }
    return counts;
  }, [questionDomains]);

  const untaggedCount = useMemo(() => {
    return questions.filter((q) => !questionDomains[q.id]).length;
  }, [questions, questionDomains]);

  // 유사 문제 소스
  const similarSourceQuestion = useMemo(() => {
    if (!similarSourceId) return null;
    return questions.find((q) => q.id === similarSourceId) ?? null;
  }, [similarSourceId, questions]);

  const similarSourceDomain = similarSourceId ? questionDomains[similarSourceId] ?? null : null;

  // 액션들
  const handleDomainChange = useCallback((questionId: string, domain: LevelTestDomain) => {
    setQuestionDomain(questionId, domain);
  }, [setQuestionDomain]);

  const handleRemove = useCallback((questionId: string) => {
    removeQuestion(questionId);
    if (similarSourceId === questionId) setSimilarSourceId(null);
  }, [removeQuestion, similarSourceId]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    reorderQuestion(fromIndex, toIndex);
  }, [reorderQuestion]);

  const handleAddQuestion = useCallback((question: EditorQuestion, domain?: LevelTestDomain) => {
    addQuestion(question, domain);
  }, [addQuestion]);

  const handleReplaceQuestion = useCallback((oldId: string, newQuestion: EditorQuestion, domain?: LevelTestDomain) => {
    // 교체 = 같은 위치에 새 문제 삽입
    const store = useWizardStore.getState();
    const idx = store.questions.findIndex((q) => q.id === oldId);
    if (idx === -1) return;
    const next = [...store.questions];
    next[idx] = newQuestion;
    setQuestions(next);
    // 도메인 업데이트
    if (domain) {
      const domains = { ...store.questionDomains };
      delete domains[oldId];
      domains[newQuestion.id] = domain;
      useWizardStore.getState().setQuestionDomains(domains);
    } else {
      removeQuestion(oldId);
      // 이미 next에 교체되었으므로 다시 setQuestions
    }
    if (similarSourceId === oldId) setSimilarSourceId(newQuestion.id);
  }, [setQuestions, removeQuestion, similarSourceId]);

  const handleFindSimilar = useCallback((questionId: string) => {
    setSimilarSourceId(questionId);
    setActiveTab('similar');
  }, []);

  const handleScrollToQuestion = useCallback((_index: number) => {
    const cardElements = document.querySelectorAll('[data-question-card]');
    if (cardElements[_index]) {
      cardElements[_index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleSort = useCallback((criteria: SortCriterion[]) => {
    const DIFF_ORDER: Record<string, number> = { BASIC: 0, MEDIUM: 1, HIGH: 2, HIGHEST: 3 };
    const TYPE_ORDER: Record<string, number> = { MULTIPLE_CHOICE: 0, SHORT_ANSWER: 1, ESSAY: 2 };
    const DOMAIN_ORD: Record<string, number> = { CALCULATION: 0, UNDERSTANDING: 1, PROBLEM_SOLVING: 2, REASONING: 3 };

    const store = useWizardStore.getState();
    const sorted = [...store.questions].sort((a, b) => {
      for (const c of criteria) {
        const dir = c.direction === 'asc' ? 1 : -1;
        let cmp = 0;
        switch (c.key) {
          case 'difficulty':
            cmp = (DIFF_ORDER[a.difficulty] ?? 99) - (DIFF_ORDER[b.difficulty] ?? 99);
            break;
          case 'type':
            cmp = (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99);
            break;
          case 'domain':
            cmp = (DOMAIN_ORD[store.questionDomains[a.id]] ?? 99) - (DOMAIN_ORD[store.questionDomains[b.id]] ?? 99);
            break;
          case 'chapter':
            cmp = a.chapter.localeCompare(b.chapter, 'ko');
            break;
          case 'curriculum':
            cmp = a.bookCode.localeCompare(b.bookCode) || a.chapter.localeCompare(b.chapter, 'ko') || a.questionNum - b.questionNum;
            break;
        }
        if (cmp !== 0) return cmp * dir;
      }
      return 0;
    });
    setQuestions(sorted);
  }, [setQuestions]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <LeftPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showDomain={showDomain}
          questions={questions}
          questionDomains={questionDomains}
          onReorder={handleReorder}
          onScrollToQuestion={handleScrollToQuestion}
          testGrade={grade}
          onAddQuestion={handleAddQuestion}
          onRemoveQuestion={handleRemove}
          onDomainChange={handleDomainChange}
          similarSourceQuestion={similarSourceQuestion}
          similarSourceDomain={similarSourceDomain}
          onReplaceQuestion={handleReplaceQuestion}
        />

        <RightPanel
          questions={questions}
          questionDomains={questionDomains}
          showDomain={showDomain}
          onDomainChange={handleDomainChange}
          onRemove={handleRemove}
          onReorder={handleReorder}
          onFindSimilar={handleFindSimilar}
          onSort={handleSort}
        />
      </div>

      <EditorBottomBar
        questionCount={questions.length}
        domainCounts={domainCounts}
        untaggedCount={untaggedCount}
        isSaving={false}
        isDirty={questions.length > 0}
        showDomain={showDomain}
        onSave={() => {}}
        onCancel={() => setStep(1)}
        onNext={() => setStep(3)}
        nextLabel="다음 단계"
      />
    </div>
  );
}
