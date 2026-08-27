import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toUserFacingError } from '@/lib/exam-analysis/shared/error-message';
import { requireTeacher, isResponse, notFound, badRequest } from '@/lib/api';
import { getExamScope } from '@/lib/demo/accounts';
import { assertAnalysisGate } from '@/lib/billing/guard';
import { assertDemoAnalysisLimit } from '@/lib/demo/accounts';
import { consumeExamAnalysisCredit } from '@/lib/entitlements/service';
import { analyzeExam } from '@/lib/exam-analysis/ai-engine';
import {
  getExamAnalysisModelVersion,
  getExamAnalysisTimeoutLabel,
  getExamAnalysisTimeoutMs,
  isProductionRuntime,
  parseCliKind,
  runWithCliKind,
  type CliKind,
} from '@/lib/exam-analysis/cli-llm';
import { ExamPromptBuilder } from '@/lib/exam-analysis/prompt-builder';
import { detectGradingMarks } from '@/lib/exam-analysis/mark-detector';
import { crossValidateGrading, consolidateDominantTopic } from '@/lib/exam-analysis/cross-validator';
import type { ExamContext, AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { CURRENT_PROMPT_VERSION } from '@/lib/exam-analysis/constants';
import { toExamSubjectKey } from '@/lib/exam-analysis/subject';
import { sumPoints } from '@/lib/exam-analysis/points';
import { matchSchoolByName } from '@/lib/utils/school-matcher';
import {
  clearAnalysisProgress,
  cliProgressStage,
  PROGRESS_STAGE,
  pushAnalysisProgress,
  resetAnalysisProgress,
  stageForStep,
} from '@/lib/exam-analysis/analysis-progress';
import { ANALYZING_STEP_LOGS } from '@/lib/exam-analysis/analyzing-progress-copy';
import path from 'path';
import { readFile } from 'fs/promises';

/** fileUrl이 http(s) URL이면 fetch, 로컬 경로면 readFile */
async function loadFileAsBase64(fileUrl: string): Promise<string> {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`파일 다운로드 실패: ${res.status} ${res.statusText}`);
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf).toString('base64');
  }
  // 로컬 파일
  const filePath = path.join(process.cwd(), 'public', fileUrl);
  const buffer = await readFile(filePath);
  return buffer.toString('base64');
}

type Params = { params: Promise<{ id: string }> };

/** 분석 단계 업데이트 헬퍼 */
async function setStep(id: string, step: number, subjectKey: 'MATH' | 'ENGLISH' = 'MATH') {
  await prisma.examPaper.update({
    where: { id },
    data: { analysisStep: step },
  });
  const msg = ANALYZING_STEP_LOGS[subjectKey][step - 1];
  if (msg) pushAnalysisProgress(id, msg, stageForStep(step));
}

async function readCliKindFromRequest(request: NextRequest): Promise<CliKind | undefined> {
  if (isProductionRuntime()) return undefined;
  try {
    const text = await request.text();
    if (!text.trim()) return undefined;
    const body = JSON.parse(text) as { cli?: unknown };
    return parseCliKind(body?.cli);
  } catch {
    return undefined;
  }
}

/** POST /api/exam-analysis/[id]/analyze — 기본 분석 실행 */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;
  const cliKind = await readCliKindFromRequest(request);

  const tenantWhere = await getExamScope(user);
  const examPaper = await prisma.examPaper.findFirst({
    where: { id, ...tenantWhere },
  });
  if (!examPaper) return notFound('시험지를 찾을 수 없습니다');

  // 데모 전용 지점 계정 → 평생 체험 N회 게이트만 적용(일반 월 쿼터/크레딧 면제). 비-데모면 handled=false.
  const demo = await assertDemoAnalysisLimit(user, examPaper.id);
  if (demo.response) return demo.response;
  if (!demo.handled) {
    // 분석 게이트 — 시험지당 하나만 적용 (AND 아님):
    // 학생 시험지(studentId 있음) → 학생 EXAM_ANALYSIS 크레딧만 (재분석=이미 차감은 통과, 월 쿼터 면제)
    // 블랭크/템플릿 → 플랜 월 쿼터만 (재분석은 현재 시험지 제외 — 곧 deleteMany로 교체되므로)
    const gate = await assertAnalysisGate(examPaper, user.viewingTenantId ?? user.tenantId);
    if (gate) return gate;
  }

  if (examPaper.status === 'ANALYZING') {
    const elapsedMs = Date.now() - new Date(examPaper.updatedAt).getTime();
    if (elapsedMs < getExamAnalysisTimeoutMs()) {
      return badRequest('이미 분석이 진행 중입니다');
    }
  }

  // 재분석 시: 선생님 교정(ground truth)을 전 필드 보존했다가 재적용 → 기존 분석 삭제
  // 보존 필드: difficulty/points/topic/question_type/ability_domain (각 ai_<field> 존재 = 교정됨)
  const PRESERVE_FIELDS = ['difficulty', 'points', 'topic', 'question_type', 'ability_domain'] as const;
  const priorEdits: Record<string, Record<string, unknown>> = {};
  if (examPaper.status === 'COMPLETED' || examPaper.status === 'FAILED') {
    const prev = await prisma.examAnalysis.findFirst({
      where: { examPaperId: id },
      orderBy: { createdAt: 'desc' },
      select: { questions: true },
    });
    if (prev && Array.isArray(prev.questions)) {
      for (const raw of prev.questions) {
        const q = raw as Record<string, unknown>;
        if (!q.manually_edited) continue;
        const edits: Record<string, unknown> = {};
        for (const f of PRESERVE_FIELDS) {
          if (q[`ai_${f}`] != null && q[f] != null) edits[f] = q[f];
        }
        if (Object.keys(edits).length > 0) priorEdits[String(q.question_number)] = edits;
      }
    }
    await prisma.examAnalysis.deleteMany({ where: { examPaperId: id } });
  }

  // 상태 → ANALYZING, step 0
  const subjectKeyEarly = toExamSubjectKey(examPaper.subject);
  resetAnalysisProgress(id);
  await prisma.examPaper.update({
    where: { id },
    data: { status: 'ANALYZING', analysisStep: 0, errorMessage: null },
  });

  try {
    return await runWithCliKind(cliKind, async () => {
    // ── Step 1: 파일 로드 ──
    await setStep(id, 1, subjectKeyEarly);

    const fileUrls = examPaper.fileUrls.split(',');
    const imageDataList: string[] = [];

    for (const fileUrl of fileUrls) {
      imageDataList.push(await loadFileAsBase64(fileUrl));
    }
    pushAnalysisProgress(id, `시험지 파일 ${imageDataList.length}개 로드 완료`, PROGRESS_STAGE.LOAD_DONE);

    // ── Step 2: 분류 + 프롬프트 구성 ──
    await setStep(id, 2, subjectKeyEarly);

    // examPaper.examScope JSON에 저장된 메타(연도/학기/종류) 추출
    const scopeRaw = examPaper.examScope as unknown;
    let examScopeArr: string[] | null = null;
    let examYear: number | null = null;
    let examSemester: number | null = null;
    let examCategory: 'MIDTERM' | 'FINAL' | 'MOCK' | 'OTHER' | null = null;
    if (Array.isArray(scopeRaw)) {
      examScopeArr = scopeRaw as string[];
    } else if (scopeRaw && typeof scopeRaw === 'object') {
      const obj = scopeRaw as Record<string, unknown>;
      if (Array.isArray(obj.topics)) examScopeArr = obj.topics as string[];
      if (typeof obj.examYear === 'number') examYear = obj.examYear;
      if (typeof obj.examSemester === 'number') examSemester = obj.examSemester;
      if (typeof obj.examCategory === 'string') {
        const cat = obj.examCategory.toUpperCase();
        if (cat === 'MIDTERM' || cat === 'FINAL' || cat === 'MOCK' || cat === 'OTHER') {
          examCategory = cat;
        }
      }
    }

    const subjectKey = toExamSubjectKey(examPaper.subject);
    const context: ExamContext = {
      subject: subjectKey,
      grade_level: examPaper.grade,
      unit: examPaper.unit,
      category: examPaper.category,
      exam_scope: examScopeArr,
      paper_type: examPaper.examType,
      has_essay: true,
      exam_year: examYear,
      exam_semester: examSemester,
      exam_category: examCategory,
    };

    const promptResult = await ExamPromptBuilder.buildWithDbContext(context);
    pushAnalysisProgress(id, '분석 규칙 구성 완료', PROGRESS_STAGE.RULES_DONE);

    // ── Step 3: AI 문항 분석 (가장 오래 걸림) ──
    await setStep(id, 3, subjectKeyEarly);

    // PDF 만 형식이 확정이다. 이미지는 빈 힌트를 줘서 파일별 매직바이트로 판별하게 한다
    // — 'image/jpeg' 로 고정하면 PNG·WEBP 를 잘못 신고하게 된다 (적대적 리뷰 1.10).
    const mimeType = examPaper.fileType === 'pdf' ? 'application/pdf' : '';
    // ⚠️ 자가진화 자동보정 비활성(2026-06-02): 9개교·85교정 교차검증 결과 per-문항 정확도 악화
    //   (정확도 54%→40%, MAE 0.516→0.707). 난이도는 학교 상대적이라 전역 보정맵이 부적합 →
    //   calibrationSet 미전달(원본 AI값 사용). 누적 교정은 측정 벤치마크로만 사용(/admin/evolution).
    //   수동 교정은 PATCH로 이 시험 분석에 즉시 반영(아래 priorEdits 보존 로직은 그대로 유지).
    // Gemini: 3분 / 로컬 CLI: 22분(비전 툴콜 + 1회 재분석 여유)
    const analysisTimeoutMs = getExamAnalysisTimeoutMs();
    const analysisResult = await Promise.race([
      analyzeExam(
        imageDataList,
        mimeType,
        promptResult.combined_prompt,
        undefined,
        undefined,
        subjectKey,
        (msg) => pushAnalysisProgress(id, msg, cliProgressStage(msg)),
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(getExamAnalysisTimeoutLabel())), analysisTimeoutMs),
      ),
    ]);
    pushAnalysisProgress(id, `문항 ${analysisResult.questions.length}개 수신, 검증 중`, PROGRESS_STAGE.RECEIVED);

    let questions = analysisResult.questions as AnalyzedQuestion[];

    // 재분석 시 선생님 교정 재적용 (전 필드 ground truth 보존 — 새 AI값은 ai_<field> 로 갱신)
    if (Object.keys(priorEdits).length > 0) {
      const nowIso = new Date().toISOString();
      questions = questions.map((q) => {
        const edits = priorEdits[String(q.question_number)];
        if (!edits) return q;
        const next = { ...q } as Record<string, unknown>;
        let changed = false;
        for (const [field, teacherVal] of Object.entries(edits)) {
          if (teacherVal != null && String(teacherVal) !== String(next[field])) {
            // 이번 AI값을 ai_<field> 로 갱신(학습 쌍이 현 모델 반영), 선생님값 재적용
            next[`ai_${field}`] = next[`ai_${field}`] ?? next[field];
            next[field] = teacherVal;
            changed = true;
          }
        }
        if (changed) { next.manually_edited = true; next.manually_edited_at = nowIso; }
        return next as unknown as AnalyzedQuestion;
      });
    }

    // 채점 마크 감지 + 교차 검증 (학생 답안지)
    let markDetection = null;
    let crossValidation = null;

    if (examPaper.examType === 'student' && imageDataList.length > 0) {
      try {
        markDetection = await detectGradingMarks(imageDataList[0], mimeType);
        if (markDetection && markDetection.marks.length > 0) {
          crossValidation = crossValidateGrading(questions, markDetection);
        }
      } catch (e) {
        console.error('[기출분석] 채점 마크 감지 실패:', e);
      }
    }

    // 내신 원칙 통합
    questions = consolidateDominantTopic(questions);

    // ── 2단계 학교 매칭: schoolId 없고 AI가 학교명 추출했으면 자동 매칭 ──
    if (!examPaper.schoolId && analysisResult.exam_info.school_name) {
      try {
        const aiSchoolName = analysisResult.exam_info.school_name;
        const matchedId = await matchSchoolByName(aiSchoolName, examPaper.grade);
        const updateData: Record<string, unknown> = {};
        if (!examPaper.schoolName) updateData.schoolName = aiSchoolName;
        if (matchedId) updateData.schoolId = matchedId;
        if (Object.keys(updateData).length > 0) {
          await prisma.examPaper.update({ where: { id }, data: updateData });
        }
      } catch { /* 매칭 실패해도 분석은 계속 */ }
    }

    // ── Step 4: DB 저장 (Gemini 호출 후 DB 연결 재확인) ──
    // PgBouncer 유휴 연결 끊김 방지: 간단한 쿼리로 커넥션 활성화
    await prisma.$executeRaw`SELECT 1`;
    await setStep(id, 4, subjectKey);

    const totalQuestions = questions.length;
    // 부동소수점 오차 제거 — 소수 배점(4.6 등) 합산이 100.00000000000003으로 저장되어 전파되는 것 방지
    const totalPoints = sumPoints(questions.map((q) => q.points));
    const earnedPoints = sumPoints(questions.map((q) => q.earned_points));

    const analysis = await prisma.examAnalysis.create({
      data: {
        examPaperId: id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        questions: JSON.parse(JSON.stringify(questions)) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        summary: analysisResult.summary ? JSON.parse(JSON.stringify(analysisResult.summary)) as any : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        markDetection: markDetection ? JSON.parse(JSON.stringify(markDetection)) as any : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        crossValidation: crossValidation ? JSON.parse(JSON.stringify(crossValidation)) as any : null,
        modelVersion: getExamAnalysisModelVersion(CURRENT_PROMPT_VERSION[subjectKey]),
        totalQuestions,
        totalPoints: totalPoints || null,
        earnedPoints: earnedPoints || null,
        analyzedAt: new Date(),
        analyzedBy: user.id, // 분석 실행자 기록
      },
    });

    // 저신뢰/고난도 문항 레퍼런스 자동 수집
    try {
      const { collectLowConfidenceReferences } = await import('@/lib/exam-analysis/reference-collector');
      await collectLowConfidenceReferences(id, analysis.id, questions);
    } catch (e) {
      console.error('[기출분석] 레퍼런스 자동수집 실패:', e);
    }

    // ── 완료 ──
    await prisma.examPaper.update({
      where: { id },
      data: { status: 'COMPLETED', analysisStep: 4 },
    });
    pushAnalysisProgress(id, '분석 완료', PROGRESS_STAGE.DONE);
    clearAnalysisProgress(id);

    // 학생 이용권 1 차감 (학생 시험지일 때만 · 시험지 단위 멱등). 실패해도 분석 결과는 유지.
    try {
      await consumeExamAnalysisCredit(examPaper);
    } catch (e) {
      console.error('[이용권] 기출분석 차감 실패:', e);
    }

    return NextResponse.json({
      data: {
        analysisId: analysis.id,
        status: 'COMPLETED',
        totalQuestions,
        totalPoints,
        earnedPoints,
      },
    });
    });
  } catch (error) {
    // 원문은 서버 로그에만. 사용자에게는 정제 문구만 준다 — 예전엔 CLI 플래그·환경변수명이
    // 그대로 토스트에 떴다 (적대적 리뷰 2.2, CLAUDE.md #0-1).
    console.error('[기출분석] 분석 실패:', error);
    const errorMsg = toUserFacingError(error, '시험지 분석에 실패했습니다. 다시 시도해 주세요.');
    await prisma.examPaper.update({
      where: { id },
      data: { status: 'FAILED', errorMessage: errorMsg, analysisStep: 0 },
    });

    return NextResponse.json(
      { error: { code: 'ANALYSIS_FAILED', message: errorMsg } },
      { status: 500 }
    );
  }
}
