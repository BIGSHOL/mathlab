/**
 * 교차 검증 (Cross-Validation)
 * Python ai_engine.py의 _cross_validate_grading 메서드에서 1:1 이식
 *
 * 채점 마크 감지 결과와 AI 분석 결과를 교차 검증하여
 * 신뢰도가 높은 최종 결과를 도출한다.
 */

import type { AnalyzedQuestion, MarkDetectionResult, CrossValidationResult } from './types';
import { CONFIDENCE_THRESHOLDS } from './constants';

/**
 * AI 분석 결과와 채점 마크 감지 결과를 교차 검증한다.
 *
 * 규칙:
 * 1. 마크 confidence >= 0.85 이고 분석과 일치 → confidence +0.1 boost
 * 2. 마크 confidence >= 0.85 이고 분석과 불일치 → 마크가 분석을 override
 * 3. 마크가 "not_graded"인데 분석에 답이 있음 → null 처리
 * 4. 마크 confidence < 0.7 AND 분석 confidence < 0.7 → null 처리 (추측 방지)
 */
export function crossValidateGrading(
  questions: AnalyzedQuestion[],
  markDetection: MarkDetectionResult
): CrossValidationResult {
  const result: CrossValidationResult = {
    corrections_made: 0,
    confidence_boosts: 0,
    null_conversions: 0,
    details: [],
  };

  // 마크를 문항 번호별로 인덱싱
  const markByQuestion = new Map<number, (typeof markDetection.marks)[number]>();
  for (const mark of markDetection.marks) {
    markByQuestion.set(mark.question_number, mark);
  }

  for (const question of questions) {
    const qNum = typeof question.question_number === 'string'
      ? parseInt(question.question_number, 10)
      : question.question_number;

    if (isNaN(qNum)) continue;

    const mark = markByQuestion.get(qNum);
    if (!mark) continue;

    const markConfidence = mark.confidence;
    const analysisConfidence = question.confidence;

    // 규칙 4: 양쪽 모두 저신뢰 → null 처리 (추측 방지)
    if (markConfidence < CONFIDENCE_THRESHOLDS.MEDIUM && analysisConfidence < CONFIDENCE_THRESHOLDS.MEDIUM) {
      question.is_correct = null;
      question.student_answer = null;
      question.earned_points = null;
      result.null_conversions++;
      result.details.push({
        question_number: qNum,
        action: 'nulled',
        reason: `양쪽 신뢰도 모두 낮음 (마크: ${markConfidence.toFixed(2)}, 분석: ${analysisConfidence.toFixed(2)}) — 추측 방지`,
      });
      continue;
    }

    // 고신뢰 마크 처리 (confidence >= 0.85)
    if (markConfidence >= CONFIDENCE_THRESHOLDS.HIGH) {
      // 규칙 3: 마크가 "not_graded"인데 분석에 답이 있는 경우 → null 처리
      if (mark.indicates === 'not_graded') {
        if (question.student_answer !== null || question.is_correct !== null) {
          question.is_correct = null;
          question.student_answer = null;
          question.earned_points = null;
          result.null_conversions++;
          result.details.push({
            question_number: qNum,
            action: 'nulled',
            reason: `채점 마크가 미채점(not_graded)으로 감지됨 (신뢰도: ${markConfidence.toFixed(2)}) — 분석 답안 무효화`,
          });
        }
        continue;
      }

      const markIsCorrect = markIndicatesToBoolean(mark.indicates);

      // 규칙 1: 마크와 분석이 일치 → confidence boost
      if (markIsCorrect !== null && question.is_correct === markIsCorrect) {
        question.confidence = Math.min(1.0, question.confidence + 0.1);
        result.confidence_boosts++;
        result.details.push({
          question_number: qNum,
          action: 'boosted',
          reason: `마크(${mark.indicates})와 분석 일치 — 신뢰도 +0.1 (${analysisConfidence.toFixed(2)} → ${question.confidence.toFixed(2)})`,
        });
        continue;
      }

      // 규칙 2: 마크와 분석이 불일치 → 마크가 override
      if (markIsCorrect !== null && question.is_correct !== markIsCorrect) {
        const prevIsCorrect = question.is_correct;
        question.is_correct = markIsCorrect;

        // 정답으로 override된 경우 만점 부여, 오답이면 0점
        if (markIsCorrect && question.points !== null) {
          question.earned_points = question.points;
        } else if (!markIsCorrect) {
          question.earned_points = 0;
        }

        result.corrections_made++;
        result.details.push({
          question_number: qNum,
          action: 'corrected',
          reason: `마크(${mark.indicates}, 신뢰도: ${markConfidence.toFixed(2)})가 분석(${prevIsCorrect})을 override → is_correct=${markIsCorrect}`,
        });
        continue;
      }

      // mark.indicates === 'uncertain' — 고신뢰 마크이지만 결과 불확실
      // 이 경우 분석 결과를 유지
    }
  }

  return result;
}

/**
 * 마크 감지의 indicates 값을 boolean으로 변환
 */
function markIndicatesToBoolean(indicates: string): boolean | null {
  switch (indicates) {
    case 'correct':
      return true;
    case 'incorrect':
      return false;
    case 'not_graded':
    case 'uncertain':
    default:
      return null;
  }
}

/**
 * 내신 원칙 (단일 교재 원칙) — 압도적 과목 통합
 *
 * 전체 문항 중 60% 이상이 동일한 과목 접두사를 공유하면
 * 모든 문항의 topic을 해당 과목으로 통합한다.
 *
 * 예: 문항 21개 중 15개가 "공통수학1 > ..." → 나머지 6개도 "공통수학1 > ..."로 변환
 *
 * @param questions 분석된 문항 배열
 * @param threshold 통합 임계값 (기본 0.6 = 60%)
 * @returns 통합 적용된 문항 배열 (원본 변경)
 */
export function consolidateDominantTopic(
  questions: AnalyzedQuestion[],
  threshold: number = 0.6
): AnalyzedQuestion[] {
  // topic이 있는 문항만 대상
  const questionsWithTopic = questions.filter(q => q.topic && q.topic.trim() !== '');
  if (questionsWithTopic.length === 0) return questions;

  // 과목 접두사 추출 (topic의 첫 번째 " > " 앞부분)
  const subjectCounts = new Map<string, number>();
  for (const q of questionsWithTopic) {
    const subject = extractSubjectPrefix(q.topic!);
    if (subject) {
      subjectCounts.set(subject, (subjectCounts.get(subject) ?? 0) + 1);
    }
  }

  // 가장 빈도가 높은 과목 찾기
  let dominantSubject: string | null = null;
  let maxCount = 0;
  subjectCounts.forEach((count, subject) => {
    if (count > maxCount) {
      maxCount = count;
      dominantSubject = subject;
    }
  });

  if (!dominantSubject) return questions;

  // 임계값 확인
  const ratio = maxCount / questionsWithTopic.length;
  if (ratio < threshold) return questions;

  // 모든 문항의 topic 접두사를 dominant 과목으로 통합
  for (const q of questions) {
    if (!q.topic || q.topic.trim() === '') continue;

    const currentSubject = extractSubjectPrefix(q.topic);
    if (currentSubject && currentSubject !== dominantSubject) {
      // 기존 topic에서 과목 접두사만 교체
      const rest = q.topic.substring(currentSubject.length);
      q.topic = dominantSubject + rest;
    }
  }

  return questions;
}

/**
 * topic 문자열에서 과목 접두사를 추출한다.
 * 형식: "과목명 > 대단원 > 소단원"
 *
 * @example
 * extractSubjectPrefix("공통수학1 > 다항식 > 인수분해") → "공통수학1"
 * extractSubjectPrefix("중3 수학 > 이차방정식 > 근의 공식") → "중3 수학"
 */
function extractSubjectPrefix(topic: string): string | null {
  const separatorIndex = topic.indexOf(' > ');
  if (separatorIndex === -1) {
    // " > " 구분자가 없으면 topic 전체를 과목명으로 취급
    return topic.trim() || null;
  }
  const prefix = topic.substring(0, separatorIndex).trim();
  return prefix || null;
}
