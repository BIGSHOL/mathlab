/**
 * 영어 출제범위·교정 드롭다운·프롬프트 허용 topic 의 단일 소스.
 * 포맷: `{학년} 영어 > {영역} > {항목}` — 항목 문자열은 ENGLISH_TOPICS 배열 원소 그대로.
 */
import { ENGLISH_TOPICS } from './prompt-config-english';

export interface EnglishTopicOption {
  value: string;
  label: string;
}

export interface EnglishTopicOptionGroup {
  label: string;
  options: EnglishTopicOption[];
}

export function getEnglishTopicOptionsGrouped(
  grade: string | null | undefined,
  opts?: { includeListening?: boolean },
): EnglishTopicOptionGroup[] {
  if (!grade) return [];
  const g = grade.trim();
  const topics = ENGLISH_TOPICS[g];
  if (!topics) return [];
  const prefix = `${g} 영어`;
  return Object.entries(topics)
    .filter(([area]) => opts?.includeListening || area !== '듣기')
    .map(([area, items]) => ({
      label: area,
      options: items.map((item) => ({
        value: `${prefix} > ${area} > ${item}`,
        label: item,
      })),
    }));
}

export function getEnglishAllowedTopicValues(grade: string | null | undefined): string[] {
  return getEnglishTopicOptionsGrouped(grade, { includeListening: true }).flatMap((g) => g.options.map((o) => o.value));
}

export function formatEnglishAllowedTopicsPrompt(grade: string | null | undefined): string | null {
  const values = getEnglishAllowedTopicValues(grade);
  if (!values.length) return null;
  const lines = getEnglishTopicOptionsGrouped(grade, { includeListening: true }).map((group) => {
    const items = group.options.map((o) => o.label).join(', ');
    return `- ${group.label}: ${items}`;
  });
  const gradeLabel = (grade ?? '').trim() || '해당 학년';
  return `📋 **[필수] 소단원 분류 목록 (topic 필드에 반드시 아래 이름만 사용)**

topic 필드는 **반드시 아래 목록의 정확한 문자열**을 사용하세요.
목록에 없는 이름을 사용하면 단원 교정 드롭다운이 일치하지 않습니다.

${lines.join('\n')}

**규칙 (엄격):**
- topic 형식: "${gradeLabel} 영어 > 영역 > 항목" (예: "${values[0]}")
- 영역은 문법 / 어휘 / 독해 (대화문은 독해). 듣기는 시험지에 듣기 전용 문항이 명시된 경우에만
- 항목은 위 목록의 **정확한 문자열**을 복사하여 사용 (변형/약어/축약 금지)
- 위 목록에 없는 항목명은 절대 만들지 마세요`;
}
