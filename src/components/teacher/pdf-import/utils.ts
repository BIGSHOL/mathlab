import { getCurriculumForGrade, type SemesterEntry } from '@/lib/utils/curriculumMapping';

/** bookCode → gradeCode 변환 (예: '1-1' → 'middle_1', 'E3-2' → 'elementary_3') */
export function bookCodeToGradeCode(bookCode: string): string {
  if (bookCode.startsWith('E')) {
    const grade = bookCode.charAt(1);
    return `elementary_${grade}`;
  }
  const grade = bookCode.split('-')[0];
  return `middle_${grade}`;
}

/** bookCode → semester 추출 (예: '1-1' → 1, '2-2' → 2) */
export function bookCodeToSemester(bookCode: string): number {
  const parts = bookCode.replace(/^E/, '').split('-');
  return parseInt(parts[1]) || 1;
}

/** bookCode → gradeLevel (DB 기준: 초3=3, 중1=7 등) */
export function bookCodeToGradeLevel(bookCode: string): number {
  if (bookCode.startsWith('E')) {
    return parseInt(bookCode.charAt(1)); // E3 → 3, E4 → 4, ...
  }
  return parseInt(bookCode.split('-')[0]) + 6; // 1 → 7, 2 → 8, 3 → 9
}

/** bookCode에 해당하는 대단원 목록 반환 */
export function getChaptersForBook(bookCode: string): string[] {
  const gradeCode = bookCodeToGradeCode(bookCode);
  const semester = bookCodeToSemester(bookCode);
  const entries: SemesterEntry[] = getCurriculumForGrade(gradeCode);
  const entry = entries.find((e) => e.semesterNumber === semester);
  if (!entry) return [];
  return entry.chapters.map((c) => c.name);
}

/**
 * sectionHeader(예: "유형 01 소수와 합성수")를 선택된 대단원 목록에서 매칭.
 * 대단원명이 sectionHeader에 포함되거나, 키워드가 겹치면 매칭.
 */
export function matchChapter(sectionHeader: string, selectedChapters: string[]): string | null {
  if (selectedChapters.length === 0) return null;
  if (selectedChapters.length === 1) return selectedChapters[0];
  // 정확히 포함
  for (const ch of selectedChapters) {
    if (sectionHeader.includes(ch) || ch.includes(sectionHeader)) return ch;
  }
  // 키워드 매칭: sectionHeader에서 "유형 XX" 접두사 제거 후 비교
  const cleaned = sectionHeader.replace(/^유형\s*\d+\s*/, '').trim();
  for (const ch of selectedChapters) {
    // 대단원 키워드가 2글자 이상 겹치면 매칭
    const chWords = ch.split(/\s+/);
    for (const w of chWords) {
      if (w.length >= 2 && cleaned.includes(w)) return ch;
    }
  }
  return null;
}

/**
 * 수학 텍스트에서 $...$로 감싸지지 않은 숫자/변수를 자동 래핑
 * Gemini가 누락한 경우 후처리로 보완
 */
export function autoWrapMath(text: string): string {
  if (!text) return text;
  // $...$ 영역, 마크다운 이미지 ![...](...), 코드블록 ```...```을 보호
  const parts = text.split(/(\$[^$]*\$|!\[[^\]]*\]\([^)]*\)|```[\s\S]*?```)/g);
  return parts
    .map((part, i) => {
      // 홀수 인덱스 = 보호 영역 ($...$, 이미지, 코드블록) → 그대로
      if (i % 2 === 1) return part;
      // 일반 텍스트에서 숫자(2자리 이상 또는 소수점 포함)와 단독 변수를 $...$로 래핑
      return part
        // 숫자: 2자리 이상이거나 소수점 포함 (단, ①②③④⑤ 뒤 숫자 제외)
        .replace(/(?<![①②③④⑤a-zA-Z_])(\d{2,}(?:,\d{3})*(?:\.\d+)?)/g, '$$$1$$')
        // 단독 영문 변수 (a, b, x, y, n 등 — 한글 사이 또는 문장 내)
        .replace(/(?<=[\uAC00-\uD7A3\s,])([a-zA-Z])(?=[\uAC00-\uD7A3\s,+\-=])/g, '$$$1$$');
    })
    .join('');
}

/** 개념 내용에서 번호 항목 사이에 줄바꿈 삽입: (2), (3)... 앞에 \n */
export function formatConceptContent(text: string): string {
  if (!text) return text;
  // (2) 이상 번호 앞에 줄바꿈 (이미 줄바꿈이 있으면 스킵)
  return text.replace(/(?<!\n)\s*(\(\d+\))/g, (match, group, offset) => {
    // (1) 맨 처음은 그대로
    if (group === '(1)' && offset < 5) return match;
    return '\n' + group;
  }).trim();
}
