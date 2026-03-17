'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import { EditorTopBar } from './EditorTopBar';
import { EditorBottomBar } from './EditorBottomBar';
import { LeftPanel } from './left-panel/LeftPanel';
import type { EditorTab } from './left-panel/LeftPanel';
import { RightPanel } from './right-panel/RightPanel';
import type { SortCriterion } from './right-panel/RightPanel';
import type { EditorQuestion } from './right-panel/QuestionCard';
import type { LevelTestDomain } from '@/types';
import { useWizardStore } from '@/stores/wizardStore';

interface LevelTestEditorShellProps {
  testSeq: number;
  testTitle: string;
  testGrade: number;
  initialQuestions: EditorQuestion[];
  initialDomains: Record<string, LevelTestDomain>;
}

export function LevelTestEditorShell({
  testSeq,
  testTitle,
  testGrade,
  initialQuestions,
  initialDomains,
}: LevelTestEditorShellProps) {
  const router = useRouter();

  // Store 상태 및 액션
  const {
    questions,
    questionDomains,
    setQuestions,
    setQuestionDomains,
    setQuestionDomain,
    removeQuestion,
    reorderQuestion,
    addQuestion,
    replaceQuestion,
    sortQuestions,
    isDirty,
    setIsDirty,
  } = useWizardStore();

  const [activeTab, setActiveTab] = useState<EditorTab>('statistics');
  const [similarSourceId, setSimilarSourceId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 초기 데이터 로드 (Zustand 스토어 초기화)
  useEffect(() => {
    // 마운트 시 초기값 설정 (reset 호출 후 설정하여 깨끗한 상태 유지)
    // 단, 이미 스토어에 데이터가 있고 dirty한 경우 덮어쓰지 않도록 주의
    setQuestions(initialQuestions);
    setQuestionDomains(initialDomains);
    setIsDirty(false); // 초기 로드 시에는 dirty가 아님
  }, [initialQuestions, initialDomains, setQuestions, setQuestionDomains, setIsDirty]);

  // 미저장 변경 경고
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // 영역별 카운트 계산
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

  // 액션 핸들러 (Store 액션 래핑)
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
    replaceQuestion(oldId, newQuestion, domain);
    if (similarSourceId === oldId) setSimilarSourceId(newQuestion.id);
  }, [replaceQuestion, similarSourceId]);

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
    sortQuestions(criteria);
  }, [sortQuestions]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const questionIds = questions.map((q) => q.id);
      const res = await fetch(`/api/level-tests/${testSeq}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds, questionDomains }),
      });
      if (res.ok) {
        setIsDirty(false);
        router.push('/level-test');
      } else {
        const json = await res.json().catch(() => null);
        toast.error(json?.error?.message ?? '저장에 실패했습니다');
      }
    } catch {
      toast.error('저장에 실패했습니다');
    }
    setIsSaving(false);
  }, [questions, questionDomains, testSeq, router, setIsDirty]);

  const handleClose = useCallback(() => {
    if (isDirty && !window.confirm('저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?')) return;
    router.push('/level-test');
  }, [isDirty, router]);

  const handleCancel = useCallback(() => {
    if (isDirty && !window.confirm('저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?')) return;
    router.push('/level-test');
  }, [isDirty, router]);


  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <EditorTopBar
        title={testTitle}
        grade={testGrade}
        isDirty={isDirty}
        onClose={handleClose}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <LeftPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          questions={questions}
          questionDomains={questionDomains}
          onReorder={handleReorder}
          onScrollToQuestion={handleScrollToQuestion}
          testGrade={testGrade}
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
        isSaving={isSaving}
        isDirty={isDirty}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}
