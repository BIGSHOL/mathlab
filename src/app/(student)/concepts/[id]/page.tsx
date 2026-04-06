'use client';

import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle, ChevronLeft, ChevronRight, Sparkles, Trophy, BookOpenCheck, Type, Mic, Square, FileText, AlertCircle, ThumbsUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { MathRenderer } from '@/components/math/MathRenderer';
import { InlineMathText } from '@/components/math/InlineMathText';
import { MathLivePopup } from '@/components/math/MathLivePopup';
import GemStone from '@/components/gamification/GemStone';
import { GemEvolutionModal } from '@/components/gamification/GemEvolutionModal';
import { partToGemVariant } from '@/lib/utils/gem';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { playSound } from '@/lib/sounds';
import type { LearningStage } from '@/types';

/** 정답이 LaTeX 수식($...$)인지 판별 */
function isLatexAnswer(answer: string): boolean {
  return answer.startsWith('$') && answer.endsWith('$') && answer.length > 2;
}

/** 복잡한 수식인지 판별 (MathLive 입력기 필요 여부) */
function isComplexLatex(answer: string): boolean {
  if (!isLatexAnswer(answer)) return false;
  const inner = answer.slice(1, -1);
  // 단순: 숫자, 영문자, 공백, 콤마, 점, +, -, = 만
  return !/^[0-9a-zA-Z\s,.\-+=]+$/.test(inner);
}

/** 정답에서 $...$ 를 벗겨서 표시용 텍스트로 반환 */
function stripLatexWrap(answer: string): string {
  if (answer.startsWith('$') && answer.endsWith('$') && answer.length > 2) {
    return answer.slice(1, -1);
  }
  return answer;
}

const FONT_SIZES = [
  { key: 0, label: '기본', size: '20px', readingLeading: '2.25rem', blankLeading: '2rem' },
  { key: 1, label: '크게', size: '22px', readingLeading: '2.5rem', blankLeading: '2.25rem' },
  { key: 2, label: '더크게', size: '24px', readingLeading: '2.75rem', blankLeading: '2.5rem' },
  { key: 3, label: '매우크게', size: '26px', readingLeading: '3rem', blankLeading: '2.75rem' },
] as const;

function getStoredFontSize(): number {
  if (typeof window === 'undefined') return 0;
  const v = localStorage.getItem('concept-font-size');
  const n = v ? parseInt(v, 10) : 0;
  return n >= 0 && n <= 3 ? n : 0;
}

/** Fisher-Yates 셔플 */
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** 빈칸 정답을 셔플된 칩 풀로 변환 (같은 정답 → 1칩 + xN 라벨) */
function buildChipPool(blanks: Array<{ answer: string }>): { answer: string; total: number; used: number }[] {
  const counts = new Map<string, number>();
  for (const b of blanks) {
    counts.set(b.answer, (counts.get(b.answer) ?? 0) + 1);
  }
  return shuffleArray(
    Array.from(counts.entries()).map(([answer, total]) => ({ answer, total, used: 0 }))
  );
}

const BASE_STAGES = [
  { key: 'READING' as LearningStage, label: '개념학습', color: 'bg-stage-reading', icon: '1' },
  { key: 'BLANK_EASY' as LearningStage, label: '빈칸 1단계', color: 'bg-stage-blank-easy', icon: '2' },
  { key: 'BLANK_HARD' as LearningStage, label: '빈칸 2단계', color: 'bg-stage-blank-hard', icon: '3' },
  { key: 'BLANK_FULL' as LearningStage, label: '통문장 암기', color: 'bg-stage-blank-page', icon: '4' },
];
const BLANK_PAGE_STAGE = { key: 'BLANK_PAGE' as LearningStage, label: '백지복원', color: 'bg-violet-500', icon: '5' };

interface ConceptData {
  id: string;
  title: string;
  fullContent: string;
  part: string | null;
  subject: { title: string; gradeLevel: number };
}

interface BlankData {
  id: string;
  level: number;
  templateText: string;
  blanks: Array<{ position: number; answer: string; hint: string }>;
  inputMode?: 'chip' | 'typing';
}

interface Progress {
  stage: LearningStage;
  completed: boolean;
}

interface BlankResult {
  position: number;
  correct: boolean;
  expected?: string;
}

export default function ConceptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  // 학생 시점 보기 지원: _as 파라미터를 모든 API 호출에 전달
  const viewAs = searchParams.get('_as') ?? '';
  const asSuffix = viewAs ? `&_as=${viewAs}` : '';
  const asQuery = viewAs ? `?_as=${viewAs}` : '';
  const [concept, setConcept] = useState<ConceptData | null>(null);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [blanks, setBlanks] = useState<BlankData | null>(null);
  const [blankAnswers, setBlankAnswers] = useState<Record<number, string>>({});
  const [blankResults, setBlankResults] = useState<BlankResult[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showHints, setShowHints] = useState<Record<number, boolean>>({});
  const [mathPopup, setMathPopup] = useState<{ position: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [memoContent, setMemoContent] = useState('');
  const memoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [adjacent, setAdjacent] = useState<{
    prev: { id: string; conceptCode: string | null; title: string } | null;
    next: { id: string; conceptCode: string | null; title: string } | null;
    course?: {
      courseName: string;
      courseId: string;
      courseMode?: string;
      currentPosition: number;
      totalConcepts: number;
      locked?: boolean;
      nextConcept: { id: string; title: string; conceptCode: string | null } | null;
    } | null;
  }>({ prev: null, next: null });
  const [gemModal, setGemModal] = useState<{ fromStage: number; toStage: number; xp: number } | null>(null);

  // 글씨 크기 설정
  const [fontSizeIdx, setFontSizeIdx] = useState(getStoredFontSize);
  const fontCfg = FONT_SIZES[fontSizeIdx];
  const handleFontSizeChange = useCallback((idx: number) => {
    setFontSizeIdx(idx);
    localStorage.setItem('concept-font-size', String(idx));
  }, []);

  // 정답 공개 관련 상태
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, string>>({});
  const [hintUsedPositions, setHintUsedPositions] = useState<Set<number>>(new Set());
  const [hasUsedReveal, setHasUsedReveal] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  // 칩 모드 관련 상태
  const [blankInputMode, setBlankInputMode] = useState<'chip' | 'typing'>('chip');
  const [activeBlankPos, setActiveBlankPos] = useState<number | null>(null);
  const [chipPool, setChipPool] = useState<{ answer: string; total: number; used: number }[]>([]);
  const [wrongCounts, setWrongCounts] = useState<Record<number, number>>({});
  const [autoFilledPositions, setAutoFilledPositions] = useState<Set<number>>(new Set());
  const [shakePos, setShakePos] = useState<number | null>(null);

  // 음성 읽기 인증 관련 상태
  const { isEnabled: isFeatureEnabled } = useFeatureFlags();
  const hasBlankPageStage = isFeatureEnabled('ai_blank_grading');
  const stageConfig = hasBlankPageStage ? [...BASE_STAGES, BLANK_PAGE_STAGE] : BASE_STAGES;
  const maxStageIdx = stageConfig.length - 1;

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceResult, setVoiceResult] = useState<{
    passed: boolean;
    similarity: number;
    feedback: string;
  } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkIndexRef = useRef(0);

  // 백지복원 (5단계) 관련 상태
  const [blankPageContent, setBlankPageContent] = useState('');
  const [blankPageResult, setBlankPageResult] = useState<{
    score: number;
    passed: boolean;
    feedback: string;
    xpAwarded: number;
    missingConcepts?: string[];
    strengths?: string[];
  } | null>(null);

  // --- IndexedDB 녹음 복구 헬퍼 ---
  const IDB_NAME = 'voice-recovery';
  const IDB_STORE = 'chunks';

  const openIDB = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  const saveChunkToIDB = async (index: number, data: Blob) => {
    try {
      const db = await openIDB();
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(data, index);
      db.close();
    } catch { /* 복구용이므로 실패해도 무시 */ }
  };

  const clearIDB = async () => {
    try {
      const db = await openIDB();
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
      db.close();
    } catch { /* 무시 */ }
  };

  const recoverFromIDB = async (): Promise<Blob | null> => {
    try {
      const db = await openIDB();
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.getAllKeys();
        req.onsuccess = () => {
          const keys = (req.result as number[]).sort((a, b) => a - b);
          if (keys.length === 0) { db.close(); resolve(null); return; }
          const blobs: Blob[] = [];
          let loaded = 0;
          for (const key of keys) {
            const getReq = store.get(key);
            getReq.onsuccess = () => {
              blobs[keys.indexOf(key)] = getReq.result;
              loaded++;
              if (loaded === keys.length) {
                db.close();
                resolve(new Blob(blobs, { type: 'audio/webm' }));
              }
            };
          }
        };
        req.onerror = () => { db.close(); resolve(null); };
      });
    } catch { return null; }
  };

  // 페이지 로드 시 복구 데이터 확인
  useEffect(() => {
    if (!isFeatureEnabled('voice_reading_check')) return;
    recoverFromIDB().then((blob) => {
      if (blob && blob.size > 1000) {
        setAudioBlob(blob);
        toast.info('이전 녹음이 복구되었습니다. 제출하거나 다시 녹음할 수 있습니다.');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch concept, adjacent, memo in parallel
  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/concepts/${id}${asQuery}`)
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .catch(() => null),
      fetch(`/api/concepts/${id}/adjacent${asQuery}`)
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .catch(() => null),
      fetch(`/api/concepts/${id}/memo${asQuery}`)
        .then((r) => r.ok ? r.json() : null)
        .catch(() => null),
    ]).then(([conceptJson, adjacentJson, memoJson]) => {
      if (conceptJson?.data) setConcept(conceptJson.data);
      if (adjacentJson?.data) {
        setAdjacent(adjacentJson.data);
        // 순차 과정에서 잠긴 개념이면 리다이렉트
        if (adjacentJson.data.course?.locked) {
          toast.warning('이전 개념을 완료해야 이 개념을 학습할 수 있습니다');
          router.push('/subjects');
          return;
        }
      }
      if (memoJson?.data) setMemoContent(memoJson.data);
    }).finally(() => setLoading(false));
  }, [id]);

  // Fetch progress (uses real concept ID, depends on concept)
  useEffect(() => {
    if (!concept) return;
    fetch(`/api/learning/progress?conceptId=${concept.id}${asSuffix}`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((json) => {
        const p = json.data ?? [];
        setProgress(p);
        const stages = stageConfig.map(s => s.key);
        let idx = 0;
        for (let i = 0; i < stages.length; i++) {
          const found = p.find((pr: Progress) => pr.stage === stages[i] && pr.completed);
          if (found) idx = i + 1;
        }
        setCurrentStageIdx(Math.min(idx, maxStageIdx));
      });
  }, [concept]);

  const saveMemo = useCallback((text: string) => {
    if (memoTimerRef.current) clearTimeout(memoTimerRef.current);
    memoTimerRef.current = setTimeout(() => {
      fetch(`/api/concepts/${id}/memo${asQuery}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      }).catch((err) => console.error('메모 저장 실패:', err));
    }, 1000);
  }, [id]);

  const handleMemoChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setMemoContent(text);
    saveMemo(text);
  }, [saveMemo]);

  // 칩 모드: 답변 변경 시 다음 빈 빈칸으로 자동 이동
  useEffect(() => {
    if (blankInputMode !== 'chip' || !blanks) return;
    if (activeBlankPos !== null && blankAnswers[activeBlankPos]) {
      const sorted = blanks.blanks.map(b => b.position).sort((a, b) => a - b);
      const currentIdx = sorted.indexOf(activeBlankPos);
      for (let i = 1; i <= sorted.length; i++) {
        const nextPos = sorted[(currentIdx + i) % sorted.length];
        if (!blankAnswers[nextPos]) {
          setActiveBlankPos(nextPos);
          return;
        }
      }
      setActiveBlankPos(null); // 모두 채워짐
    }
  }, [blankAnswers, blanks, blankInputMode, activeBlankPos]);

  // 칩 클릭 핸들러
  const handleChipClick = useCallback((chipAnswer: string) => {
    if (activeBlankPos === null || !blanks) return;
    const blank = blanks.blanks.find(b => b.position === activeBlankPos);
    if (!blank || blankAnswers[activeBlankPos]) return;

    if (chipAnswer === blank.answer) {
      // 정답 → 빈칸 채우기 + 칩 사용
      playSound('blank_fill');
      setBlankAnswers(prev => ({ ...prev, [activeBlankPos]: chipAnswer }));
      setChipPool(prev => prev.map(c => c.answer === chipAnswer ? { ...c, used: c.used + 1 } : c));
    } else {
      // 오답 → shake + 카운트
      playSound('wrong');
      const newCount = (wrongCounts[activeBlankPos] ?? 0) + 1;
      setWrongCounts(prev => ({ ...prev, [activeBlankPos]: newCount }));
      setShakePos(activeBlankPos);
      setTimeout(() => setShakePos(null), 600);

      if (newCount >= 3) {
        // 3회 오답 → 정답 자동 배치 + 오답으로 기록
        setBlankAnswers(prev => ({ ...prev, [activeBlankPos]: blank.answer }));
        setChipPool(prev => prev.map(c => c.answer === blank.answer ? { ...c, used: c.used + 1 } : c));
        setAutoFilledPositions(prev => new Set(prev).add(activeBlankPos));
        setHasUsedReveal(true);
        toast.info('3회 오답으로 정답이 자동 배치되었습니다.');
      }
    }
  }, [activeBlankPos, blanks, blankAnswers, wrongCounts]);

  // 빈칸 슬롯 클릭 핸들러 (칩 모드)
  const handleBlankSlotClick = useCallback((position: number) => {
    if (blankInputMode !== 'chip') return;
    if (blankAnswers[position]) {
      // 채워진 빈칸 클릭 → 칩 반환 + 재선택
      const answer = blankAnswers[position];
      setBlankAnswers(prev => {
        const next = { ...prev };
        delete next[position];
        return next;
      });
      setChipPool(prev => prev.map(c => c.answer === answer ? { ...c, used: c.used - 1 } : c));
      setActiveBlankPos(position);
    } else {
      // 빈 빈칸 클릭 → 해당 위치로 이동
      setActiveBlankPos(position);
    }
  }, [blankInputMode, blankAnswers]);

  // Fetch blanks when on blank stages
  useEffect(() => {
    const stage = stageConfig[currentStageIdx]?.key;
    if (stage === 'BLANK_EASY' || stage === 'BLANK_HARD' || stage === 'BLANK_FULL') {
      const level = stage === 'BLANK_EASY' ? 1 : stage === 'BLANK_HARD' ? 2 : 3;
      fetch(`/api/concepts/${id}/blanks?level=${level}${asSuffix}`)
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .then((json) => {
          if (json.data) {
            setBlanks(json.data);
            setBlankAnswers({});
            setBlankResults(null);
            setShowHints({});
            // 단계 전환 시 정답 공개 상태 초기화
            setRevealedAnswers({});
            setHintUsedPositions(new Set());
            setHasUsedReveal(false);
            // 칩 모드 초기화
            const mode: 'chip' | 'typing' = json.data.inputMode ?? 'chip';
            setBlankInputMode(mode);
            setWrongCounts({});
            setAutoFilledPositions(new Set());
            setShakePos(null);
            if (mode === 'chip' && json.data.blanks?.length > 0) {
              setChipPool(buildChipPool(json.data.blanks));
              const sorted = [...json.data.blanks].sort(
                (a: { position: number }, b: { position: number }) => a.position - b.position
              );
              setActiveBlankPos(sorted[0]?.position ?? null);
            } else {
              setChipPool([]);
              setActiveBlankPos(null);
            }
          }
        });
    }
  }, [id, currentStageIdx]);

  const handleCompleteStage = async () => {
    const stage = stageConfig[currentStageIdx].key;
    setSubmitting(true);
    const res = await fetch(`/api/learning/progress${asQuery}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conceptId: concept!.id,
        stage,
        ...(hasUsedReveal && { usedReveal: true }),
      }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (json.data) {
      const xpMsg = hasUsedReveal
        ? `+${json.data.xpAwarded} XP 획득! (정답 공개 사용)`
        : `+${json.data.xpAwarded} XP 획득!`;
      toast.success(xpMsg);
      playSound('stage_complete');
      // 보석 진화 모달 표시
      const fromStage = currentStageIdx;
      const toStage = currentStageIdx + 1;
      setGemModal({ fromStage, toStage, xp: json.data.xpAwarded ?? 0 });
      setProgress((prev) => [...prev, { stage, completed: true }]);
      if (currentStageIdx < maxStageIdx) {
        setTimeout(() => setCurrentStageIdx(currentStageIdx + 1), 1500);
      }
    }
  };

  // --- 음성 읽기 인증 ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          saveChunkToIDB(chunkIndexRef.current, e.data);
          chunkIndexRef.current++;
        }
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      };

      await clearIDB();
      chunkIndexRef.current = 0;
      mediaRecorder.start(1000); // 1초 간격으로 청크 저장
      setIsRecording(true);
      setRecordingTime(0);
      setVoiceResult(null);
      recordingTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast.error('마이크 접근이 거부되었습니다. 브라우저 설정을 확인하세요.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const submitVoice = async () => {
    if (!audioBlob || !concept) return;
    setSubmitting(true);
    const formData = new FormData();
    formData.append('conceptId', concept.id);
    formData.append('audio', audioBlob, 'recording.webm');

    try {
      const res = await fetch(`/api/learning/voice-check${asQuery}`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (json.data) {
        setVoiceResult(json.data);
        await clearIDB(); // 제출 완료 → 복구 데이터 삭제
        if (json.data.passed) {
          toast.success(`+${json.data.xpAwarded} XP 획득!`);
          setProgress((prev) => [...prev, { stage: 'READING' as LearningStage, completed: true }]);
          setGemModal({ fromStage: 0, toStage: 1, xp: json.data.xpAwarded ?? 0 });
          setTimeout(() => setCurrentStageIdx(1), 1500);
        } else {
          toast.warning(json.data.feedback);
        }
      }
    } catch {
      toast.error('음성 처리 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  // --- 백지복원 (5단계) 제출 ---
  const handleBlankPageSubmit = async () => {
    if (!concept || blankPageContent.trim().length < 10) {
      toast.warning('최소 10자 이상 작성해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/learning/blank-page-submit${asQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId: concept.id, content: blankPageContent }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? '제출에 실패했습니다.');
        return;
      }
      if (json.data) {
        setBlankPageResult(json.data);
        if (json.data.passed) {
          toast.success(`+${json.data.xpAwarded} XP 획득!`);
          setProgress((prev) => [...prev, { stage: 'BLANK_PAGE' as LearningStage, completed: true }]);
          setGemModal({ fromStage: 4, toStage: 5, xp: json.data.xpAwarded ?? 0 });
        } else {
          toast.warning(`점수: ${json.data.score}점 — 70점 이상 필요합니다.`);
        }
      }
    } catch {
      toast.error('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlankSubmit = async () => {
    if (!blanks) return;

    // 클라이언트 유효성 검사: 빈칸이 비어있으면 제출 차단
    const emptyBlanks = blanks.blanks.filter((b) => !blankAnswers[b.position]?.trim());
    if (emptyBlanks.length > 0) {
      toast.warning(`빈칸을 모두 채워주세요! (${emptyBlanks.length}개 남음)`);
      return;
    }

    setSubmitting(true);
    const answers = blanks.blanks.map((b) => ({
      position: b.position,
      value: blankAnswers[b.position] ?? '',
    }));

    try {
      const res = await fetch(`/api/learning/blank-submit${asQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: blanks.id,
          answers,
          hintCount: hintUsedPositions.size,
          revealCount: Object.keys(revealedAnswers).length,
          autoFilledPositions: autoFilledPositions.size > 0 ? [...autoFilledPositions] : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? '제출에 실패했습니다. 다시 시도해주세요.');
        return;
      }
      if (json.data) {
        setBlankResults(json.data.results);
        if (json.data.allCorrect) {
          await handleCompleteStage();
        } else {
          // 오답 빈칸에 정답을 플레이스홀더로 공개
          const newRevealed = { ...revealedAnswers };
          const wrongPositions: number[] = [];
          for (const r of json.data.results as BlankResult[]) {
            if (!r.correct && r.expected) {
              newRevealed[r.position] = r.expected;
              wrongPositions.push(r.position);
            }
          }
          setRevealedAnswers(newRevealed);
          if (wrongPositions.length > 0) {
            setHasUsedReveal(true);
          }

          toast.info('오답이 있습니다. 정답을 확인하고 다시 입력해보세요!');

          // 1.5초 후 오답 빈칸 초기화 → 정답 플레이스홀더가 보이게
          setTimeout(() => {
            setBlankAnswers((prev) => {
              const next = { ...prev };
              // 칩 모드: 오답 빈칸의 칩을 풀로 반환
              if (blankInputMode === 'chip') {
                const returnedAnswers: string[] = [];
                for (const pos of wrongPositions) {
                  if (next[pos]) returnedAnswers.push(next[pos]);
                }
                if (returnedAnswers.length > 0) {
                  setChipPool(pool => pool.map(c => {
                    const returnCount = returnedAnswers.filter(a => a === c.answer).length;
                    return returnCount > 0 ? { ...c, used: c.used - returnCount } : c;
                  }));
                }
              }
              for (const pos of wrongPositions) {
                delete next[pos];
              }
              return next;
            });
            // autoFilled 위치도 초기화 (재시도 시 다시 추적)
            setAutoFilledPositions(new Set());
            setWrongCounts({});
            setBlankResults(null);
          }, 1500);
        }
      }
    } catch {
      toast.error('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHintUsed = useCallback((position: number) => {
    setHintUsedPositions((prev) => new Set(prev).add(position));
  }, []);

  if (loading || !concept) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="px-4 md:px-8 py-6 md:py-8 w-full">
          {/* 상단 네비 + 스테이지 바 */}
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-8 h-8 rounded-sm" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex gap-1 mb-6">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-9 flex-1 rounded-sm" />
            ))}
          </div>
          {/* 본문 */}
          <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-4">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[75%]" />
            <Skeleton className="h-32 w-full rounded-sm mt-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[85%]" />
          </div>
        </div>
      </div>
    );
  }

  const currentStage = stageConfig[currentStageIdx];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Gem Evolution Modal */}
      {concept && (
        <GemEvolutionModal
          isOpen={!!gemModal}
          variant={partToGemVariant(concept.part)}
          fromStage={gemModal?.fromStage ?? 0}
          toStage={gemModal?.toStage ?? 1}
          conceptTitle={concept.title}
          xpEarned={gemModal?.xp ?? 0}
          onClose={() => setGemModal(null)}
        />
      )}

      {/* Sub-header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/subjects">
              <button className="p-2 rounded-sm hover:bg-slate-100 text-slate-500 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <GemStone
              variant={partToGemVariant(concept.part)}
              stage={progress.filter(p => p.completed).length}
              size="sm"
            />
            <div>
              <h1 className="text-lg font-bold text-text-primary">{concept.title}</h1>
              <p className="text-sm text-text-secondary">{concept.subject.title} &gt; {concept.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stageConfig.map((stage, i) => {
              const isCompleted = progress.some((p) => p.stage === stage.key && p.completed);
              const canClick = isCompleted || i <= currentStageIdx;
              return (
                <button
                  key={stage.key}
                  disabled={!canClick}
                  onClick={() => {
                    if (canClick) {
                      setCurrentStageIdx(i);
                      setReviewMode(isCompleted);
                      setBlankAnswers({});
                      setBlankResults(null);
                      setRevealedAnswers({});
                      setHasUsedReveal(false);
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                    canClick ? 'cursor-pointer' : 'cursor-default'
                  } ${
                    i === currentStageIdx
                      ? `${stage.color} text-white`
                      : isCompleted
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : <span>{stage.icon}</span>}
                  <span className="hidden sm:inline">{stage.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 이전/다음 개념 네비게이션 + 글씨 크기 */}
      <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-2">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {adjacent.prev ? (
              <button
                onClick={() => router.push(`/concepts/${adjacent.prev!.conceptCode ?? adjacent.prev!.id}`)}
                className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline truncate max-w-[200px]">{adjacent.prev.title}</span>
                <span className="sm:hidden">이전</span>
              </button>
            ) : <span />}
          </div>
          <div className="flex items-center gap-3">
            {/* 글씨 크기 조절 */}
            <div className="flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-slate-400" />
              {FONT_SIZES.map((f, i) => (
                <button
                  key={f.key}
                  onClick={() => handleFontSizeChange(i)}
                  className={`px-1.5 py-0.5 text-xs rounded-sm transition-colors ${
                    fontSizeIdx === i
                      ? 'bg-primary text-white font-bold'
                      : 'text-slate-500 hover:bg-slate-200'
                  }`}
                  title={`글씨 크기: ${f.label}`}
                  style={{ fontSize: `${11 + i}px` }}
                >
                  가
                </button>
              ))}
            </div>
            {adjacent.next ? (
              <button
                onClick={() => router.push(`/concepts/${adjacent.next!.conceptCode ?? adjacent.next!.id}`)}
                className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors"
              >
                <span className="hidden sm:inline truncate max-w-[200px]">{adjacent.next.title}</span>
                <span className="sm:hidden">다음</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : <span />}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto p-6 flex flex-col lg:flex-row gap-6">
        {/* Left Panel: Content / Instructions */}
        <section className="flex-1 lg:max-w-[45%] flex flex-col bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
            <div className={`w-8 h-8 rounded-full ${currentStage.color} text-white flex items-center justify-center font-bold text-sm`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold">{currentStage.label}</h2>
          </div>
          <div className="p-5 flex-1 overflow-y-auto">
            {currentStage.key === 'READING' && (
              <div
                className="prose prose-slate max-w-none "
                style={{ fontSize: fontCfg.size, lineHeight: fontCfg.readingLeading }}
              >
                <MathRenderer content={concept.fullContent.replace(/\n/g, '<br/>')} />
              </div>
            )}
            {currentStage.key === 'BLANK_PAGE' && (
              <div>
                <p className="text-text-secondary mb-4">
                  지금까지 학습한 내용을 기억에만 의존해서 작성하세요. 완벽하지 않아도 괜찮습니다!
                </p>
                <div className="bg-violet-50 p-4 rounded-sm text-sm text-violet-700 space-y-2">
                  <p>핵심 개념과 원리를 자신의 말로 작성해보세요.</p>
                  <p>맞춤법이나 표현이 달라도 괜찮습니다.</p>
                  <p>70점 이상이면 통과입니다.</p>
                </div>
                {blankPageResult && (
                  <div className={`mt-4 p-4 rounded-sm border ${blankPageResult.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-2xl font-bold ${blankPageResult.passed ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {blankPageResult.score}점
                      </span>
                      <span className={`text-sm px-2 py-0.5 rounded-full ${blankPageResult.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {blankPageResult.passed ? '통과' : '재도전 필요'}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">{blankPageResult.feedback}</p>
                    {blankPageResult.strengths && blankPageResult.strengths.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" /> 잘한 부분
                        </p>
                        <ul className="text-xs text-emerald-600 space-y-0.5">
                          {blankPageResult.strengths.map((s, i) => (
                            <li key={i}>· {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {blankPageResult.missingConcepts && blankPageResult.missingConcepts.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> 보완할 부분
                        </p>
                        <ul className="text-xs text-amber-600 space-y-0.5">
                          {blankPageResult.missingConcepts.map((m, i) => (
                            <li key={i}>· {m}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {(currentStage.key === 'BLANK_EASY' || currentStage.key === 'BLANK_HARD' || currentStage.key === 'BLANK_FULL') && (
              <div>
                <p className="text-text-secondary mb-4">
                  {currentStage.key === 'BLANK_EASY'
                    ? '핵심 키워드를 빈칸에 채워보세요.'
                    : currentStage.key === 'BLANK_HARD'
                      ? '더 많은 내용이 빈칸입니다. 기억을 더듬어 채워보세요!'
                      : '연결 글자를 제외한 거의 모든 단어가 빈칸입니다. 전체 문장을 암기해보세요!'}
                </p>
                <div className="bg-blue-50 p-4 rounded-sm text-sm text-blue-700">
                  {blankInputMode === 'chip'
                    ? '오른쪽 칩을 클릭하면 파란색 빈칸에 배치됩니다. 채워진 빈칸을 클릭하면 되돌릴 수 있어요.'
                    : '힌트가 필요하면 빈칸 옆의 ? 버튼을 눌러보세요.'}
                </div>
                {hasUsedReveal && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-sm text-sm text-amber-700 mt-3">
                    {blankInputMode === 'chip'
                      ? '3회 오답으로 정답이 자동 배치되었습니다. XP가 절반으로 지급됩니다.'
                      : '정답이 공개되었습니다. 정답을 보고 직접 입력하면 XP가 절반으로 지급됩니다.'}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Workspace */}
        <section className="flex-[1.2] flex flex-col gap-6">
          <div className="flex-1 bg-white rounded-sm shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            {currentStage.key === 'READING' && (
              <>
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-bold text-text-primary text-sm">스마트 메모</h3>
                </div>
                <div className="flex-1 p-4">
                  <textarea
                    className="w-full h-full resize-none bg-transparent border-none focus:ring-0 text-text-secondary p-0 m-0 memo-lines outline-none text-[15px]"
                    placeholder="여기에 메모를 자유롭게 작성하세요..."
                    value={memoContent}
                    onChange={handleMemoChange}
                  />
                </div>
              </>
            )}

            {currentStage.key === 'BLANK_PAGE' && (
              <>
                <div className="px-4 py-3 border-b border-slate-200 bg-violet-50">
                  <h3 className="font-bold text-text-primary text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-violet-500" /> 백지복원
                  </h3>
                </div>
                <div className="flex-1 p-4">
                  <textarea
                    className="w-full h-full resize-none bg-transparent border-none focus:ring-0 text-text-primary p-0 m-0 memo-lines outline-none text-[15px]"
                    placeholder="기억나는 내용을 모두 작성해주세요. 핵심 개념, 공식, 원리 등을 자유롭게 써보세요..."
                    value={blankPageContent}
                    onChange={(e) => setBlankPageContent(e.target.value)}
                    disabled={!!blankPageResult?.passed}
                  />
                </div>
                <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 text-right">
                  {blankPageContent.length}자
                </div>
              </>
            )}

            {(currentStage.key === 'BLANK_EASY' || currentStage.key === 'BLANK_HARD' || currentStage.key === 'BLANK_FULL') && blanks && (
              <>
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h3 className="font-bold text-text-primary text-sm">
                    {currentStage.key === 'BLANK_FULL' ? '통문장 암기' : '빈칸 채우기'}
                  </h3>
                  {blankInputMode === 'chip' && (
                    <span className="text-xs text-slate-400">
                      {Object.keys(blankAnswers).length}/{blanks.blanks.length} 완료
                    </span>
                  )}
                </div>
                {/* 칩 모드: 정답 칩 선택 영역 */}
                {blankInputMode === 'chip' && chipPool.length > 0 && (
                  <div className="px-4 py-3 border-b border-slate-100 bg-amber-50/30">
                    <p className="text-xs text-slate-500 mb-2">칩을 클릭하여 하이라이트된 빈칸에 배치하세요</p>
                    <div className="flex flex-wrap gap-1.5">
                      {chipPool.map((chip, i) => {
                        const remaining = chip.total - chip.used;
                        if (remaining <= 0) return null;
                        return (
                          <button
                            key={i}
                            disabled={activeBlankPos === null}
                            onClick={() => handleChipClick(chip.answer)}
                            className="relative inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm font-medium transition-all bg-white text-slate-700 border-slate-300 hover:border-primary hover:bg-primary/5 cursor-pointer active:scale-95 shadow-sm"
                          >
                            {isLatexAnswer(chip.answer) ? (
                              <InlineMathText text={chip.answer} />
                            ) : (
                              <span>{chip.answer}</span>
                            )}
                            {remaining >= 2 && (
                              <span className="text-xs font-bold text-primary">
                                x{remaining}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="p-4 flex-1 overflow-y-auto">
                  <div className="whitespace-pre-wrap" style={{ fontSize: fontCfg.size, lineHeight: fontCfg.blankLeading }}>
                    {renderBlanksTemplate(
                      blanks, blankAnswers, setBlankAnswers, blankResults,
                      showHints, setShowHints, mathPopup, setMathPopup,
                      revealedAnswers, handleHintUsed,
                      blankInputMode === 'chip' ? {
                        enabled: true,
                        activePos: activeBlankPos,
                        shakePos,
                        onSlotClick: handleBlankSlotClick,
                      } : undefined,
                    )}
                  </div>
                  {/* 수식 입력 팝업 (타이핑 모드 전용) */}
                  {blankInputMode === 'typing' && (
                    <MathLivePopup
                      isOpen={!!mathPopup}
                      onClose={() => setMathPopup(null)}
                      onInsert={(latex) => {
                        if (mathPopup) {
                          setBlankAnswers((prev) => ({ ...prev, [mathPopup.position]: latex }));
                        }
                        setMathPopup(null);
                      }}
                      initialLatex={mathPopup ? (blankAnswers[mathPopup.position] ?? '') : ''}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {/* Action Area */}
          {(() => {
            const allCompleted = !reviewMode && currentStageIdx === stageConfig.length - 1 && progress.some((p) => p.stage === currentStage.key && p.completed);
            // 과정 기반 다음 개념 (우선) 또는 교육과정 기반 다음 개념
            const courseNext = adjacent.course?.nextConcept;
            const nextConcept = courseNext ?? adjacent.next;

            if (allCompleted) {
              // 다음 개념 네비게이션 (공통)
              const nextNav = (
                <div className={hasBlankPageStage ? 'px-6 pb-6' : 'p-6'}>
                  {nextConcept ? (
                    <div className="space-y-4">
                      <button
                        onClick={() => router.push(`/concepts/${nextConcept.conceptCode ?? nextConcept.id}`)}
                        className="w-full flex items-center gap-4 p-4 rounded-sm border border-slate-200 hover:border-primary/40 hover:bg-primary/[0.02] transition-all group text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-text-secondary mb-0.5">다음 개념</p>
                          <p className="font-bold text-text-primary truncate">{nextConcept.title}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                      <div className="flex items-center gap-3">
                        <Button
                          size="lg"
                          className="flex-1"
                          onClick={() => router.push(`/concepts/${nextConcept.conceptCode ?? nextConcept.id}`)}
                        >
                          다음 개념 학습하기 <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                        <Button
                          size="lg"
                          variant="secondary"
                          onClick={() => { setCurrentStageIdx(0); setReviewMode(true); }}
                        >
                          복습하기
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <p className="text-text-secondary text-sm">
                        {adjacent.course
                          ? `"${adjacent.course.courseName}" 과정의 모든 개념을 완료했습니다!`
                          : '이 단원의 마지막 개념입니다.'}
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <Button size="lg" onClick={() => router.push('/subjects')}>
                          학습 목록으로 돌아가기
                        </Button>
                        <Button size="lg" variant="secondary" onClick={() => { setCurrentStageIdx(0); setReviewMode(true); }}>
                          복습하기
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );

              // 과정 진행률 (공통)
              const courseProgress = adjacent.course && (
                <div className="mt-4 bg-white/15 rounded-sm px-4 py-2.5">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <BookOpenCheck className="w-3.5 h-3.5" />
                      {adjacent.course.courseName}
                    </span>
                    <span className="font-medium">
                      {adjacent.course.currentPosition} / {adjacent.course.totalConcepts}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((adjacent.course.currentPosition / adjacent.course.totalConcepts) * 100)}%` }}
                    />
                  </div>
                </div>
              );

              if (!hasBlankPageStage) {
                // 기본 4단계: 간단한 "학습 완료!" 카드
                return (
                  <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                          <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">학습 완료!</h3>
                          <p className="text-emerald-100 text-sm">
                            &quot;{concept.title}&quot; 개념의 모든 단계를 완료했습니다
                          </p>
                        </div>
                      </div>
                      {courseProgress}
                    </div>
                    {nextNav}
                  </div>
                );
              }

              // 5단계: 종합 보고서
              const stageReport = [
                { label: '1단계 · 개념학습', key: 'READING', color: 'bg-stage-reading', xp: 5 },
                { label: '2단계 · 빈칸 기초', key: 'BLANK_EASY', color: 'bg-stage-blank-easy', xp: 10 },
                { label: '3단계 · 빈칸 심화', key: 'BLANK_HARD', color: 'bg-stage-blank-hard', xp: 15 },
                { label: '4단계 · 통문장 암기', key: 'BLANK_FULL', color: 'bg-stage-blank-page', xp: 20 },
                { label: '5단계 · 백지복원', key: 'BLANK_PAGE', color: 'bg-violet-500', xp: 30 },
              ];
              const totalXp = stageReport.reduce((sum, s) => sum + s.xp, 0);

              return (
                <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">
                  {/* 종합 보고서 헤더 */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">학습 종합 보고서</h3>
                        <p className="text-emerald-100 text-sm">
                          &quot;{concept.title}&quot; · 5단계 학습 완료
                        </p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-2xl font-bold">+{totalXp} XP</p>
                        <p className="text-xs text-emerald-200">총 획득</p>
                      </div>
                    </div>
                    {courseProgress}
                  </div>

                  {/* 단계별 결과 */}
                  <div className="p-6 space-y-3">
                    {stageReport.map((stage) => {
                      const completed = progress.some((p) => p.stage === stage.key && p.completed);
                      return (
                        <div key={stage.key} className="flex items-center gap-3 py-2">
                          <div className={`w-7 h-7 rounded-full ${stage.color} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                            {completed ? <CheckCircle className="w-3.5 h-3.5" /> : '—'}
                          </div>
                          <span className={`flex-1 text-sm font-medium ${completed ? 'text-text-primary' : 'text-slate-400'}`}>
                            {stage.label}
                          </span>
                          <span className={`text-xs font-semibold ${completed ? 'text-emerald-600' : 'text-slate-300'}`}>
                            +{stage.xp} XP
                          </span>
                        </div>
                      );
                    })}

                    {/* 백지복원 AI 피드백 */}
                    {blankPageResult && (blankPageResult.strengths?.length || blankPageResult.missingConcepts?.length) && (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-violet-500" />
                          백지복원 상세 피드백
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {blankPageResult.strengths && blankPageResult.strengths.length > 0 && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-sm p-3">
                              <p className="text-xs font-semibold text-emerald-700 mb-1.5 flex items-center gap-1">
                                <ThumbsUp className="w-3 h-3" /> 잘한 부분
                              </p>
                              <ul className="text-xs text-emerald-600 space-y-1">
                                {blankPageResult.strengths.map((s, i) => (
                                  <li key={i}>· {s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {blankPageResult.missingConcepts && blankPageResult.missingConcepts.length > 0 && (
                            <div className="bg-amber-50 border border-amber-100 rounded-sm p-3">
                              <p className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> 보완할 부분
                              </p>
                              <ul className="text-xs text-amber-600 space-y-1">
                                {blankPageResult.missingConcepts.map((m, i) => (
                                  <li key={i}>· {m}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-text-secondary mt-3">{blankPageResult.feedback}</p>
                      </div>
                    )}
                  </div>

                  {nextNav}
                </div>
              );
            }

            const stageCompleted = progress.some((p) => p.stage === currentStage.key && p.completed);
            const isBlankStage = currentStage.key === 'BLANK_EASY' || currentStage.key === 'BLANK_HARD' || currentStage.key === 'BLANK_FULL';

            return (
              <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-6">
                {reviewMode && (
                  <div className="flex items-center gap-2 mb-4 text-sm text-violet-600 bg-violet-50 border border-violet-200 rounded-sm px-3 py-2">
                    <BookOpen className="w-4 h-4" />
                    <span className="font-medium">복습 모드</span>
                  </div>
                )}
                <ProgressBar
                  value={Math.round(((currentStageIdx + (stageCompleted ? 1 : 0)) / stageConfig.length) * 100)}
                  label="학습 진행도"
                  showPercentage
                  color={currentStage.color}
                />
                <div className="flex items-center justify-end mt-6 gap-3">
                  {currentStage.key === 'BLANK_PAGE' && !stageCompleted && (
                    <>
                      {blankPageResult && !blankPageResult.passed && (
                        <Button
                          size="lg"
                          variant="secondary"
                          onClick={() => { setBlankPageContent(''); setBlankPageResult(null); }}
                        >
                          다시 쓰기
                        </Button>
                      )}
                      {!blankPageResult?.passed && (
                        <Button size="lg" onClick={handleBlankPageSubmit} disabled={submitting || blankPageContent.trim().length < 10}>
                          {submitting ? 'AI 채점 중...' : '제출하기 (+30 XP)'}
                        </Button>
                      )}
                    </>
                  )}
                  {currentStage.key === 'READING' && !stageCompleted && (
                    isFeatureEnabled('voice_reading_check') ? (
                      <div className="flex flex-col items-end gap-2">
                        {!audioBlob && !isRecording && !voiceResult && (
                          <Button size="lg" onClick={startRecording} variant="secondary">
                            <Mic className="w-4 h-4 mr-2" /> 음성으로 읽기 인증 (+8 XP)
                          </Button>
                        )}
                        {isRecording && (
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 text-sm text-red-500">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              녹음 중 {recordingTime}초
                            </span>
                            <Button size="lg" onClick={stopRecording} variant="danger">
                              <Square className="w-4 h-4 mr-2" /> 녹음 중지
                            </Button>
                          </div>
                        )}
                        {audioBlob && !voiceResult && (
                          <Button size="lg" onClick={submitVoice} disabled={submitting}>
                            {submitting ? '인증 중...' : '음성 제출'}
                          </Button>
                        )}
                        {voiceResult && !voiceResult.passed && (
                          <Button size="lg" onClick={() => { setAudioBlob(null); setVoiceResult(null); }}>
                            다시 녹음하기
                          </Button>
                        )}
                        <button
                          onClick={handleCompleteStage}
                          className="text-xs text-slate-400 hover:text-slate-600 underline"
                          disabled={submitting}
                        >
                          음성 없이 읽기 완료
                        </button>
                      </div>
                    ) : (
                      <Button size="lg" onClick={handleCompleteStage} disabled={submitting}>
                        {submitting ? '처리 중...' : '읽기 완료 (+5 XP)'}
                      </Button>
                    )
                  )}
                  {isBlankStage && !stageCompleted && (
                    <>
                      {hasUsedReveal && (
                        <span className="text-xs text-amber-600">정답 공개 사용 · XP 절반</span>
                      )}
                      <Button size="lg" onClick={handleBlankSubmit} disabled={submitting}>
                        {submitting ? '채점 중...' : '제출하기'}
                      </Button>
                    </>
                  )}
                  {isBlankStage && stageCompleted && reviewMode && (
                    <Button size="lg" onClick={handleBlankSubmit} disabled={submitting}>
                      {submitting ? '채점 중...' : '다시 풀기'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </section>
      </div>
    </div>
  );
}

function renderBlanksTemplate(
  blanks: BlankData,
  answers: Record<number, string>,
  setAnswers: (fn: (prev: Record<number, string>) => Record<number, string>) => void,
  results: BlankResult[] | null,
  showHints: Record<number, boolean>,
  setShowHints: (fn: (prev: Record<number, boolean>) => Record<number, boolean>) => void,
  mathPopup: { position: number } | null,
  setMathPopup: (v: { position: number } | null) => void,
  revealedAnswers: Record<number, string>,
  onHintUsed: (position: number) => void,
  chipMode?: {
    enabled: boolean;
    activePos: number | null;
    shakePos: number | null;
    onSlotClick: (position: number) => void;
  },
) {
  const parts = blanks.templateText.split(/(\{\{\d+\}\})/g);

  return parts.map((part, idx) => {
    const match = part.match(/\{\{(\d+)\}\}/);
    if (!match) {
      return <InlineMathText key={idx} text={part} />;
    }

    const position = parseInt(match[1], 10);
    const blank = blanks.blanks.find((b) => b.position === position);

    if (!blank) {
      return <span key={idx} className="text-slate-400 text-sm">({position})</span>;
    }

    const result = results?.find((r) => r.position === position);
    const isCorrect = result?.correct;
    const isWrong = result && !result.correct;
    const revealed = revealedAnswers[position];

    // 공통 힌트 버튼
    const hintBtn = (
      <span className="relative inline-block">
        <button
          type="button"
          onClick={() => {
            setShowHints((prev) => ({ ...prev, [position]: !prev[position] }));
            if (!showHints[position]) onHintUsed(position);
          }}
          className={`w-4 h-4 rounded-full text-xs font-bold leading-none transition-all ${
            showHints[position]
              ? 'bg-amber-400 text-white shadow-sm'
              : 'bg-amber-100 text-amber-500 hover:bg-amber-200'
          }`}
        >
          ?
        </button>
        {showHints[position] && (
          <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2.5 py-1 bg-slate-800 text-white text-xs font-medium rounded-sm shadow-lg whitespace-nowrap z-50 animate-fade-in before:content-[''] before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-slate-800">
            {blank.hint}
          </span>
        )}
      </span>
    );

    // === 칩 모드 ===
    if (chipMode?.enabled) {
      const isActive = chipMode.activePos === position;
      const isFilled = !!answers[position];
      const isShaking = chipMode.shakePos === position;

      return (
        <span key={idx} className="inline-flex items-center gap-px mx-0.5 align-baseline">
          <button
            type="button"
            onClick={() => chipMode.onSlotClick(position)}
            className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-0.5 border-2 border-dashed rounded-sm text-sm font-semibold transition-all ${
              isCorrect
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : isWrong
                  ? 'border-red-400 bg-red-50 text-red-700'
                  : isFilled
                    ? 'border-primary/40 bg-primary/5 text-slate-800 hover:bg-red-50/50 hover:border-red-300 cursor-pointer'
                    : isActive
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30 ring-offset-1 animate-pulse cursor-default'
                      : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 cursor-pointer'
            } ${isShaking ? 'animate-shake' : ''}`}
          >
            {isFilled ? (
              isLatexAnswer(answers[position]) ? (
                <InlineMathText text={answers[position]} />
              ) : (
                <span>{answers[position]}</span>
              )
            ) : (
              <span className="text-slate-400 text-xs">&nbsp;&nbsp;({position})&nbsp;&nbsp;</span>
            )}
          </button>
          {isCorrect && <span className="text-emerald-500 text-xs">&#10003;</span>}
          {isWrong && <span className="text-red-500 text-xs">&#10007;</span>}
          {hintBtn}
        </span>
      );
    }

    // === 타이핑 모드 (기존) ===
    const needsMathInput = isComplexLatex(blank.answer);

    return (
      <span key={idx} className="inline-flex items-center gap-px mx-0.5 align-baseline">
        {needsMathInput ? (
          <span className="inline-flex flex-col items-center">
            <button
              type="button"
              onClick={() => (!result || isWrong) && setMathPopup({ position })}
              className={`inline-flex items-center justify-center min-w-[72px] px-1.5 py-0.5 border-b-2 border-dashed text-center font-semibold text-sm transition-all ${
                isCorrect
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700 animate-bounce-in'
                  : isWrong
                    ? 'border-red-400 bg-red-50 text-red-700 animate-shake'
                    : answers[position]
                      ? 'border-primary/50 text-slate-800'
                      : revealed
                        ? 'border-amber-300 bg-amber-50/50'
                        : 'border-slate-300 hover:border-primary/40'
              }`}
            >
              {answers[position] ? (
                <MathRenderer content={`$${answers[position]}$`} />
              ) : (
                <span className="text-slate-400 text-xs">수식 입력</span>
              )}
            </button>
            {revealed && !isCorrect && !answers[position] && (
              <span className="text-amber-600 text-xs opacity-70">
                <MathRenderer content={revealed} />
              </span>
            )}
          </span>
        ) : (
          <input
            type="text"
            value={answers[position] ?? ''}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [position]: e.target.value }))}
            className={`inline-block w-20 px-1.5 py-0.5 border-b-2 border-dashed text-center font-semibold text-sm transition-all outline-none bg-transparent ${
              isCorrect
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700 animate-bounce-in'
                : isWrong
                  ? 'border-red-400 bg-red-50 text-red-700 animate-shake'
                  : revealed && !answers[position]
                    ? 'border-amber-300 bg-amber-50/50'
                    : 'border-slate-300 focus:border-primary'
            }`}
            placeholder={revealed ? stripLatexWrap(revealed) : `(${position})`}
          />
        )}
        {isCorrect && <span className="text-emerald-500 text-xs">&#10003;</span>}
        {isWrong && <span className="text-red-500 text-xs">&#10007;</span>}
        {hintBtn}
      </span>
    );
  });
}
