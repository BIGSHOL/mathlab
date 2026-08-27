/**
 * 분석 프롬프트 빌더 — **과목 디스패처**.
 *
 * 실제 조립은 과목별 빌더가 한다:
 *   - 수학: `./math/prompt-builder`   (MathExamPromptBuilder)
 *   - 영어: `./english/prompt-builder` (EnglishExamPromptBuilder)
 *   - 둘이 공유하는 하네스·조립 순서: `./shared/prompt-frame`
 *
 * 여기에는 **분기 외 로직을 두지 말 것.** 한 과목만 바꾸려면 그 과목 파일만 고치면 되고,
 * 그래야 다른 과목이 흔들리지 않는다 (회귀 감시: `scripts/parity`).
 */
import { EnglishExamPromptBuilder } from './english/prompt-builder';
import { MathExamPromptBuilder } from './math/prompt-builder';
import { isMathSubject } from './shared/subject';
import type { BuildPromptResponse, ExamContext } from './types';

export class ExamPromptBuilder {
  /** 전체 프롬프트를 조립하여 반환한다. */
  static build(context: ExamContext): BuildPromptResponse {
    return isMathSubject(context.subject)
      ? MathExamPromptBuilder.build(context)
      : EnglishExamPromptBuilder.build(context);
  }

  /** DB 템플릿 + 에러 패턴을 포함한 확장 빌드 (async). */
  static buildWithDbContext(context: ExamContext): Promise<BuildPromptResponse> {
    return isMathSubject(context.subject)
      ? MathExamPromptBuilder.buildWithDbContext(context)
      : EnglishExamPromptBuilder.buildWithDbContext(context);
  }

  /** 요구 JSON 스키마 출력 (과목별 허용값·예시가 다르다). */
  static getJsonSchema(
    paperType: string,
    subject: string,
    gradeLevel: string | null,
    category: string | null,
  ): string {
    return isMathSubject(subject)
      ? MathExamPromptBuilder.getJsonSchema(paperType, gradeLevel, category)
      : EnglishExamPromptBuilder.getJsonSchema(paperType, gradeLevel);
  }
}

export { EnglishExamPromptBuilder } from './english/prompt-builder';
export { MathExamPromptBuilder } from './math/prompt-builder';
