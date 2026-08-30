/**
 * 영어 수준별 학습 전략 선택.
 *
 * ## 왜 있는가
 * `data/english/levelStrategies.ts` 는 하위권·중위권·상위권 3단계 전략(등급·학습시간·교재·핵심원칙)을
 * 완성된 형태로 담고 있는데, **어느 화면에도 붙어 있지 않았다.** 영어 학습 대책 탭은 단어·구문
 * 목록뿐이라 "무엇을 어떻게 공부하라"가 한 줄도 없었다.
 *
 * ## 학년 게이트
 * 이 데이터는 "수능 필수 어휘 1000개", "5~6등급" 처럼 **고등 전용 언어**로 쓰여 있다.
 * 중학교 시험지에 붙이면 맞지 않는 조언이 된다 — 그래서 고등이 아니면 **빈 배열**을 돌려주고
 * 화면은 블록을 만들지 않는다. 억지로 보여 주느니 없는 편이 낫다.
 *
 * ⚠️ 어느 수준인지는 **고르지 않는다.** 이 제품은 학생 답안지를 받지 않아 학생 수준을 알 수 없다.
 * 세 가지를 모두 보여주고 선생님이 고르게 한다(수학 LevelStrategiesSection 과 같은 태도).
 */

import type { LevelStrategy } from '../data/curriculum/types';
import { ENGLISH_LEVEL_STRATEGIES } from '../data/english/levelStrategies';

/** 고등 학년인가 — '고1'·'고2'·'고3'·'고등' 등. 프로젝트 관용구(startsWith('고'))를 한곳에 모았다. */
export function isHighSchoolGrade(grade: string | null | undefined): boolean {
  return typeof grade === 'string' && grade.trim().startsWith('고');
}

/**
 * 이 학년에 보여줄 수준별 전략. **고등이 아니면 빈 배열**(중학 시험지에 수능 언어를 붙이지 않는다).
 * 반환 순서는 데이터 정의 순서(하위권 → 중위권 → 상위권)를 유지한다.
 */
export function englishLevelStrategiesFor(grade: string | null | undefined): LevelStrategy[] {
  if (!isHighSchoolGrade(grade)) return [];
  return ENGLISH_LEVEL_STRATEGIES;
}
