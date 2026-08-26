/**
 * 기출 분석 모듈 — Math Report에서 이식된 독립 AI 분석 시스템
 * MathLab의 기존 AI 시스템(gemini.ts, mathgen.ts)과 완전 독립
 */

export * from './constants';
export * from './types';
export * from './schemas';
export { ExamPromptBuilder } from './prompt-builder';
export { analyzeExam, callExamVision } from './ai-engine';
export { detectGradingMarks } from './mark-detector';
export {
  isCliExamAnalysisEnabled,
  getExamAnalysisTimeoutMs,
  getExamAnalysisModelVersion,
} from './cli-llm';
export { crossValidateGrading, consolidateDominantTopic } from './cross-validator';
