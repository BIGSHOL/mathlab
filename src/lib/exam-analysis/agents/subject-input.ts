/**
 * 에이전트 입력에서 **과목**을 읽어내는 공용 헬퍼.
 *
 * `AgentInput` 은 인덱스 시그니처를 가지므로 orchestrator 가 `subject` 를 얹어 보낸다.
 * 값이 없으면 수학으로 폴백한다 — 과거 분석본(과목 필드 없던 시절)이 영어로 뒤집히지 않게.
 *
 * 페르소나·라벨을 과목별로 가르는 자리는 전부 이 헬퍼를 거칠 것.
 * (직접 `input.subject` 를 캐스팅하면 폴백 규칙이 파일마다 갈린다.)
 */
import { toExamSubjectKey } from '../shared/subject';
import type { AgentInput } from './base-agent';

export function inputSubject(input: AgentInput): string {
  return typeof input.subject === 'string' ? input.subject : 'MATH';
}

export function isEnglishInput(input: AgentInput): boolean {
  return toExamSubjectKey(inputSubject(input)) === 'ENGLISH';
}

/** 프롬프트 문장에 그대로 박히는 과목명 — '수학' | '영어'. */
export function subjectLabel(input: AgentInput): string {
  return isEnglishInput(input) ? '영어' : '수학';
}
