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

// ============================================================
// PDF 파일명 파싱 — 교재 설정 자동화 + 프롬프트 주입
// ============================================================

/** 파일명에서 추출 가능한 메타데이터 */
export interface PdfFilenameMeta {
  school?: string;
  grade?: number;
  semester?: number;
  examType?: string;
  year?: number;
  publisher?: string;
  bookCode?: string;
  schoolLevel?: 'elementary' | 'middle';
}

const PUBLISHER_MAP: Record<string, string> = {
  '신사고': '신사고',
  '동아강': '동아출판', '동아김': '동아출판', '동아': '동아출판', '동아출판': '동아출판',
  '미래엔': '미래엔', '비상': '비상교육', '비상교육': '비상교육',
  '천재이': '천재교육', '천재교육': '천재교육', '천재': '천재교육',
  '전재이': '천재교육', '전재류': '천재교육', '천재이수': '천재교육', '천재류': '천재교육',
  '전재이수': '천재교육',
  '지학사': '지학사', '금성': '금성출판사', '교학사': '교학사', '대교': '대교',
};

/**
 * PDF 파일명에서 메타데이터 파싱
 *
 * 지원 패턴:
 * - `[강동중][1][24-1-중간][신사고] (완료)`
 * - `[경산여중][2][24-1-중간][비상] (완료)`
 * - `중1-1_수와연산.pdf` / `E5-2_분수.pdf`
 */
export function parsePdfFilename(filename: string): PdfFilenameMeta {
  const meta: PdfFilenameMeta = {};

  // 대괄호 패턴: [학교][학년][연도-학기-시험][출판사]
  const brackets = filename.match(/\[([^\]]+)\]/g);
  if (brackets && brackets.length >= 2) {
    const parts = brackets.map((b) => b.replace(/[\[\]]/g, ''));
    for (const part of parts) {
      if (/^[가-힣]{2,10}(중|초|고)$/.test(part)) {
        meta.school = part;
        meta.schoolLevel = part.endsWith('초') ? 'elementary' : 'middle';
        continue;
      }
      if (/^[1-9]$/.test(part)) { meta.grade = parseInt(part); continue; }
      const examMatch = part.match(/^(\d{2})-(\d)-(.+)$/);
      if (examMatch) {
        meta.year = 2000 + parseInt(examMatch[1]);
        meta.semester = parseInt(examMatch[2]);
        meta.examType = examMatch[3].replace(/고사$/, '');
        continue;
      }
      if (PUBLISHER_MAP[part]) { meta.publisher = PUBLISHER_MAP[part]; continue; }
    }
  }

  // 폴백: 중1-1, E5-2 패턴
  if (!meta.grade) {
    const mid = filename.match(/중(\d)-(\d)/);
    if (mid) { meta.schoolLevel = 'middle'; meta.grade = parseInt(mid[1]); meta.semester = parseInt(mid[2]); }
    const elem = filename.match(/E(\d)-(\d)/);
    if (elem) { meta.schoolLevel = 'elementary'; meta.grade = parseInt(elem[1]); meta.semester = parseInt(elem[2]); }
  }

  // bookCode 매핑
  if (meta.grade && meta.semester) {
    meta.bookCode = meta.schoolLevel === 'elementary'
      ? `E${meta.grade}-${meta.semester}`
      : `${meta.grade}-${meta.semester}`;
  }

  return meta;
}

/** PdfFilenameMeta → Gemini 프롬프트 삽입용 텍스트 */
export function buildFilenameContext(meta: PdfFilenameMeta): string {
  const lines: string[] = [];
  if (meta.school) lines.push(`- 학교: ${meta.school}`);
  if (meta.grade) {
    const lvl = meta.schoolLevel === 'elementary' ? '초등' : '중';
    lines.push(`- 학년: ${lvl}${meta.grade}`);
  }
  if (meta.examType && meta.year && meta.semester) {
    lines.push(`- 시험: ${meta.year}년 ${meta.semester}학기 ${meta.examType}고사`);
  }
  if (meta.publisher) lines.push(`- 출판사: ${meta.publisher}`);
  if (lines.length === 0) return '';
  return `\n[문서 정보]\n${lines.join('\n')}\n이 정보를 참고하여 난이도와 단원을 더 정확하게 분류하세요.`;
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
