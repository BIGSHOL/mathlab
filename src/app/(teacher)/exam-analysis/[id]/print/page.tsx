'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { AnalyzedQuestion, AnalysisSummary } from '@/lib/exam-analysis/types';

// ── 타입 ──

interface ExamPaperDetail {
  id: string;
  title: string;
  subject: 'MATH' | 'ENGLISH';
  grade: string;
  examType: string;
  schoolName: string | null;
  createdAt: string;
  student: { id: string; name: string } | null;
  analyses: Array<{
    id: string;
    questions: AnalyzedQuestion[];
    summary: AnalysisSummary | null;
    totalQuestions: number | null;
    totalPoints: number | null;
    earnedPoints: number | null;
    analyzedAt: string | null;
  }>;
}

// ── 유틸 ──

const DIFFICULTY_LABEL: Record<string, string> = {
  concept: '개념',
  pattern: '유형',
  reasoning: '추론',
  creative: '창의',
  high: '상',
  medium: '중',
  low: '하',
};

const TYPE_LABEL: Record<string, string> = {
  calculation: '계산',
  geometry: '도형',
  application: '응용',
  proof: '증명',
  graph: '그래프',
  statistics: '통계',
};

const FORMAT_LABEL: Record<string, string> = {
  objective: '객관식',
  short_answer: '단답형',
  essay: '서술형',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// ── 메인 페이지 ──

export default function ExamAnalysisPrintPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<ExamPaperDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/exam-analysis/${id}`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        setData(json.data);
      } catch {
        toast.error('분석 결과를 불러오지 못했습니다');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-[794px]">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-text-secondary">
        <p className="text-lg font-semibold text-text-primary">분석 결과를 찾을 수 없습니다</p>
        <Link href="/exam-analysis" className="text-primary text-sm mt-2 hover:underline">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const analysis = data.analyses[0] ?? null;
  const questions = analysis?.questions ?? [];
  const summary = analysis?.summary ?? null;
  const isStudentExam = !!data.student;
  const totalQuestions = analysis?.totalQuestions ?? questions.length;
  const totalPoints = analysis?.totalPoints ?? null;
  const earnedPoints = analysis?.earnedPoints ?? null;

  // 난이도 분포 계산
  const diffDist = summary?.difficulty_distribution;
  const typeDist = summary?.type_distribution;

  return (
    <>
      {/* 인쇄 CSS */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-hide {
            display: none !important;
          }
          .print-page {
            width: 210mm;
            min-height: 297mm;
            padding: 15mm 20mm;
            margin: 0;
            box-shadow: none !important;
            border: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>

      {/* 상단 액션 바 (인쇄 시 숨김) */}
      <div className="print-hide sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <Link
          href={`/exam-analysis`}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </Link>
        <Button size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-1.5" />
          인쇄
        </Button>
      </div>

      {/* A4 용지 시뮬레이션 */}
      <div className="flex justify-center bg-slate-100 min-h-screen py-8 print:bg-white print:py-0">
        <div
          className="print-page bg-white shadow-lg border border-slate-200"
          style={{ width: '794px', minHeight: '1123px', padding: '48px 56px' }}
        >
          {/* 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-text-primary">{data.title}</h1>
            <div className="flex items-center justify-center gap-4 mt-2 text-sm text-text-secondary">
              {data.schoolName && <span>{data.schoolName}</span>}
              <span>{data.grade}</span>
              <span>{data.subject === 'MATH' ? '수학' : '영어'}</span>
              <span>{formatDate(data.createdAt)}</span>
            </div>
            {isStudentExam && data.student && (
              <p className="mt-1 text-sm font-medium text-primary">학생: {data.student.name}</p>
            )}
          </div>

          {/* 요약 섹션 */}
          <div className="mb-6 border border-slate-200 rounded-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
              <h2 className="text-sm font-bold text-text-primary">분석 요약</h2>
            </div>
            <div className="px-4 py-3">
              {/* 기본 통계 */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{totalQuestions}</p>
                  <p className="text-xs text-text-secondary">총 문항수</p>
                </div>
                {totalPoints !== null && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-text-primary">{totalPoints}</p>
                    <p className="text-xs text-text-secondary">총 배점</p>
                  </div>
                )}
                {isStudentExam && earnedPoints !== null && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{earnedPoints}</p>
                    <p className="text-xs text-text-secondary">취득 점수</p>
                  </div>
                )}
                {isStudentExam && totalPoints !== null && earnedPoints !== null && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-secondary">
                      {Math.round((earnedPoints / totalPoints) * 100)}%
                    </p>
                    <p className="text-xs text-text-secondary">정답률</p>
                  </div>
                )}
              </div>

              {/* 난이도 분포 */}
              {diffDist && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-text-primary mb-1.5">난이도 분포</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(diffDist)
                      .filter(([, v]) => v > 0)
                      .map(([key, val]) => (
                        <span
                          key={key}
                          className="px-2 py-0.5 text-xs bg-slate-100 rounded-sm text-text-secondary"
                        >
                          {DIFFICULTY_LABEL[key] ?? key}: {val}문항
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* 유형 분포 */}
              {typeDist && (
                <div>
                  <p className="text-xs font-semibold text-text-primary mb-1.5">유형 분포</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(typeDist)
                      .filter(([, v]) => v > 0)
                      .map(([key, val]) => (
                        <span
                          key={key}
                          className="px-2 py-0.5 text-xs bg-blue-50 rounded-sm text-blue-600"
                        >
                          {TYPE_LABEL[key] ?? key}: {val}문항
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 문항별 분석 테이블 */}
          <div className="border border-slate-200 rounded-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
              <h2 className="text-sm font-bold text-text-primary">문항별 분석</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-2 py-2 text-left font-semibold text-text-secondary w-10">번호</th>
                    <th className="px-2 py-2 text-left font-semibold text-text-secondary w-16">형식</th>
                    <th className="px-2 py-2 text-left font-semibold text-text-secondary w-14">난이도</th>
                    <th className="px-2 py-2 text-left font-semibold text-text-secondary w-14">유형</th>
                    <th className="px-2 py-2 text-right font-semibold text-text-secondary w-12">배점</th>
                    <th className="px-2 py-2 text-left font-semibold text-text-secondary">출제 영역</th>
                    {isStudentExam && (
                      <>
                        <th className="px-2 py-2 text-center font-semibold text-text-secondary w-14">
                          정답
                        </th>
                        <th className="px-2 py-2 text-right font-semibold text-text-secondary w-12">
                          취득
                        </th>
                      </>
                    )}
                    <th className="px-2 py-2 text-left font-semibold text-text-secondary">AI 코멘트</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isStudentExam ? 9 : 7}
                        className="px-4 py-8 text-center text-text-secondary"
                      >
                        분석된 문항이 없습니다
                      </td>
                    </tr>
                  ) : (
                    questions.map((q, idx) => (
                      <tr
                        key={q.id ?? idx}
                        className={`border-b border-slate-100 ${
                          isStudentExam && q.is_correct === false ? 'bg-red-50/50' : ''
                        }`}
                      >
                        <td className="px-2 py-1.5 text-text-primary font-medium">
                          {q.question_number}
                        </td>
                        <td className="px-2 py-1.5 text-text-secondary">
                          {q.question_format ? FORMAT_LABEL[q.question_format] ?? q.question_format : '-'}
                        </td>
                        <td className="px-2 py-1.5">
                          <span
                            className={`px-1 py-0.5 rounded-sm text-[10px] font-medium ${
                              q.difficulty === 'creative'
                                ? 'bg-red-100 text-red-700'
                                : q.difficulty === 'reasoning'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : q.difficulty === 'pattern'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {DIFFICULTY_LABEL[q.difficulty] ?? q.difficulty}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-text-secondary">
                          {TYPE_LABEL[q.question_type] ?? q.question_type}
                        </td>
                        <td className="px-2 py-1.5 text-right text-text-primary">
                          {q.points ?? '-'}
                        </td>
                        <td className="px-2 py-1.5 text-text-secondary max-w-[140px] truncate">
                          {q.topic ?? '-'}
                        </td>
                        {isStudentExam && (
                          <>
                            <td className="px-2 py-1.5 text-center">
                              {q.is_correct === null ? (
                                <span className="text-text-secondary">-</span>
                              ) : q.is_correct ? (
                                <span className="text-green-600 font-bold">O</span>
                              ) : (
                                <span className="text-red-500 font-bold">X</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-right text-text-primary">
                              {q.earned_points ?? '-'}
                            </td>
                          </>
                        )}
                        <td className="px-2 py-1.5 text-text-secondary max-w-[180px]">
                          <span className="line-clamp-2">{q.ai_comment ?? '-'}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 풋터 */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center">
            <p className="text-[10px] text-text-secondary">
              MathLab 기출 분석 리포트 | 생성일: {analysis?.analyzedAt ? formatDate(analysis.analyzedAt) : formatDate(data.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
