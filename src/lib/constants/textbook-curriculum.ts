/**
 * G드라이브 교과서 ↔ curriculum.ts 매핑 데이터 (22개정 기준)
 *
 * 용도:
 * 1. 교과서 PDF 임포트 시 단원 자동 분류
 * 2. 문제 생성(mathgen) 시 교과서 컨텍스트 제공
 * 3. 기출 분석 → 교과서 단원 역추적
 * 4. UI에서 출판사별 필터링
 */

// ─────────────────────────────────────────
// 1. 타입 정의
// ─────────────────────────────────────────

/** 자료 유형 */
export type ResourceType =
  | 'textbook'        // 교과서 PDF/HWP
  | 'teacher_book'    // 교사용 교과서
  | 'guide'           // 지도서
  | 'ppt'             // 수업 PPT
  | 'lesson_plan'     // 수업지도안
  | 'activity'        // 활동지
  | 'quiz'            // 쪽지시험
  | 'sub_unit_eval'   // 소단원 평가
  | 'mid_unit_eval'   // 중단원 평가
  | 'main_unit_eval'  // 대단원 평가
  | 'midterm_final'   // 중간/기말 대비
  | 'essay_eval'      // 서술형 평가
  | 'twin_problems'   // 쌍둥이 문제
  | 'answer_key'      // 정답 및 풀이
  | 'video';          // 영상 자료

/** 출판사 메타데이터 */
export interface PublisherInfo {
  id: string;
  name: string;
  /** 축약 표시명 */
  shortName: string;
}

/**
 * 교과서 단원 → curriculum.ts 단원 매핑
 *
 * 교과서의 대단원 번호(textbookChapter)가 curriculum.ts의
 * 어떤 gradeKey + chapter name에 해당하는지 연결합니다.
 *
 * 하나의 교과서 대단원이 curriculum.ts의 여러 단원에 걸칠 수 있습니다.
 * 예: 미래엔 중1 3단원 "문자와 식" → curriculum의 "문자의 사용과 식" + "일차방정식"
 */
export interface ChapterMapping {
  /** 교과서 대단원 번호 (1, 2, 3...) */
  textbookChapter: number;
  /** 교과서에서 사용하는 단원명 */
  textbookName: string;
  /** curriculum.ts의 gradeKey (예: '1학년 1학기', '공통수학1') */
  gradeKey: string;
  /** curriculum.ts의 CurriculumUnit.name 매칭 (1:N 가능) */
  curriculumNames: string[];
}

/** 교과서 카탈로그 항목 */
export interface TextbookEntry {
  /** 고유 ID (예: 'mirae-m1', 'chunjae-jdt-m1') */
  id: string;
  publisherId: string;
  /** 저자 */
  author: string;
  /** 과목명 (교과서 표지 기준) */
  subject: string;
  schoolLevel: 'middle' | 'high';
  /** curriculum.ts에서 사용하는 gradeKey 목록 (학기 걸침 가능) */
  gradeKeys: string[];
  /** MathLab grade 코드 (예: 'middle_1', 'high_1') */
  gradeCode: string;
  /** G드라이브 상대 경로 (G:/ 기준) */
  gdrivePath: string;
  /** 보유 자료 유형 */
  resources: ResourceType[];
  /** 대단원 ↔ curriculum 매핑 */
  chapters: ChapterMapping[];
  /** 파일명 패턴 설명 (임포트 스크립트 참고용) */
  filePattern: string;
  /** 비고 */
  note?: string;
}

// ─────────────────────────────────────────
// 2. 출판사 레지스트리
// ─────────────────────────────────────────

export const PUBLISHERS: PublisherInfo[] = [
  { id: 'mirae', name: '미래엔', shortName: '미래엔' },
  { id: 'chunjae-jdt', name: '천재교육 (김동재)', shortName: '천재(김동재)' },
  { id: 'chunjae-khk', name: '천재교육 (김화경)', shortName: '천재(김화경)' },
  { id: 'chunjae-jit', name: '천재교육 (전인태)', shortName: '천재(전인태)' },
  { id: 'chunjae-hjg', name: '천재교육 (홍진곤)', shortName: '천재(홍진곤)' },
  { id: 'donga', name: '동아출판', shortName: '동아' },
  { id: 'ne', name: 'NE능률', shortName: 'NE능률' },
  { id: 'ybm', name: 'YBM/와이비엠', shortName: 'YBM' },
  { id: 'jihak', name: '지학사', shortName: '지학사' },
  { id: 'bisang', name: '비상교과서', shortName: '비상' },
  { id: 'kyohak', name: '교학사', shortName: '교학사' },
];

export function getPublisher(id: string): PublisherInfo | undefined {
  return PUBLISHERS.find(p => p.id === id);
}

// ─────────────────────────────────────────
// 3. 교과서 카탈로그
// ─────────────────────────────────────────

export const TEXTBOOK_CATALOG: TextbookEntry[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 중1
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: 'mirae-m1',
    publisherId: 'mirae',
    author: '황선욱',
    subject: '중학 수학1',
    schoolLevel: 'middle',
    gradeKeys: ['1학년 1학기', '1학년 2학기'],
    gradeCode: 'middle_1',
    gdrivePath: '중등교과서/중1/미래엔 중학 수학1 (황선욱) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'sub_unit_eval', 'main_unit_eval', 'answer_key'],
    filePattern: '미래엔_중학교수학1_교과서_{N}-{M}_{소단원명}.pdf',
    chapters: [
      { textbookChapter: 1, textbookName: '소인수분해', gradeKey: '1학년 1학기', curriculumNames: ['소인수분해'] },
      { textbookChapter: 2, textbookName: '정수와 유리수', gradeKey: '1학년 1학기', curriculumNames: ['정수와 유리수'] },
      { textbookChapter: 3, textbookName: '문자와 식', gradeKey: '1학년 1학기', curriculumNames: ['문자의 사용과 식', '일차방정식'] },
      { textbookChapter: 4, textbookName: '좌표평면과 그래프', gradeKey: '1학년 1학기', curriculumNames: ['좌표와 그래프', '정비례와 반비례'] },
      { textbookChapter: 5, textbookName: '기본 도형과 작도', gradeKey: '1학년 2학기', curriculumNames: ['기본 도형', '작도와 합동'] },
      { textbookChapter: 6, textbookName: '평면도형의 성질', gradeKey: '1학년 2학기', curriculumNames: ['평면도형'] },
      { textbookChapter: 7, textbookName: '입체도형의 성질', gradeKey: '1학년 2학기', curriculumNames: ['입체도형'] },
      { textbookChapter: 8, textbookName: '자료의 정리와 해석', gradeKey: '1학년 2학기', curriculumNames: ['자료의 정리와 해석'] },
    ],
  },

  {
    id: 'ne-m1',
    publisherId: 'ne',
    author: '권오남',
    subject: '중학 수학1',
    schoolLevel: 'middle',
    gradeKeys: ['1학년 1학기', '1학년 2학기'],
    gradeCode: 'middle_1',
    gdrivePath: '중등교과서/중1/NE능률 중학 수학1 (권오남) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'quiz', 'sub_unit_eval', 'twin_problems', 'answer_key'],
    filePattern: '[교과서 PDF] {로마}-{M}. {단원명}({N}).pdf',
    chapters: [
      { textbookChapter: 1, textbookName: 'Ⅰ-1. 소인수분해', gradeKey: '1학년 1학기', curriculumNames: ['소인수분해'] },
      { textbookChapter: 2, textbookName: 'Ⅰ-2. 정수와 유리수', gradeKey: '1학년 1학기', curriculumNames: ['정수와 유리수'] },
      { textbookChapter: 3, textbookName: 'Ⅱ-1. 문자의 사용과 식', gradeKey: '1학년 1학기', curriculumNames: ['문자의 사용과 식'] },
      { textbookChapter: 4, textbookName: 'Ⅱ-2. 일차방정식', gradeKey: '1학년 1학기', curriculumNames: ['일차방정식'] },
      { textbookChapter: 5, textbookName: 'Ⅲ-1. 좌표평면과 그래프', gradeKey: '1학년 1학기', curriculumNames: ['좌표와 그래프'] },
      { textbookChapter: 6, textbookName: 'Ⅲ-2. 정비례와 반비례', gradeKey: '1학년 1학기', curriculumNames: ['정비례와 반비례'] },
      { textbookChapter: 7, textbookName: 'Ⅳ-1. 기본 도형', gradeKey: '1학년 2학기', curriculumNames: ['기본 도형'] },
      { textbookChapter: 8, textbookName: 'Ⅳ-2. 작도와 합동', gradeKey: '1학년 2학기', curriculumNames: ['작도와 합동'] },
      { textbookChapter: 9, textbookName: 'Ⅴ-1. 평면도형의 성질', gradeKey: '1학년 2학기', curriculumNames: ['평면도형'] },
      { textbookChapter: 10, textbookName: 'Ⅴ-2. 입체도형의 성질', gradeKey: '1학년 2학기', curriculumNames: ['입체도형'] },
      { textbookChapter: 11, textbookName: 'Ⅵ-1. 대푯값', gradeKey: '1학년 2학기', curriculumNames: ['자료의 정리와 해석'] },
      { textbookChapter: 12, textbookName: 'Ⅵ-2. 도수분포표와 상대도수', gradeKey: '1학년 2학기', curriculumNames: ['자료의 정리와 해석'] },
    ],
  },

  {
    id: 'chunjae-jdt-m1',
    publisherId: 'chunjae-jdt',
    author: '김동재',
    subject: '중학 수학1',
    schoolLevel: 'middle',
    gradeKeys: ['1학년 1학기', '1학년 2학기'],
    gradeCode: 'middle_1',
    gdrivePath: '중등교과서/중1/천재교육 중학 수학1 (김동재) (22개정)-005-003',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'lesson_plan', 'sub_unit_eval', 'main_unit_eval', 'activity', 'answer_key'],
    filePattern: '{N}단원 교과서 PDF.pdf / {N}-{M}-{S} 소단원 평가 문제.hwp',
    note: '파일 수 최대 (691개). 기초력UP, 기초연산, 실력UP 등 다양한 평가자료 보유',
    chapters: [
      { textbookChapter: 1, textbookName: '소인수분해', gradeKey: '1학년 1학기', curriculumNames: ['소인수분해'] },
      { textbookChapter: 2, textbookName: '정수와 유리수', gradeKey: '1학년 1학기', curriculumNames: ['정수와 유리수'] },
      { textbookChapter: 3, textbookName: '문자와 식', gradeKey: '1학년 1학기', curriculumNames: ['문자의 사용과 식', '일차방정식'] },
      { textbookChapter: 4, textbookName: '좌표평면과 그래프', gradeKey: '1학년 1학기', curriculumNames: ['좌표와 그래프', '정비례와 반비례'] },
      { textbookChapter: 5, textbookName: '기본 도형과 작도', gradeKey: '1학년 2학기', curriculumNames: ['기본 도형', '작도와 합동'] },
      { textbookChapter: 6, textbookName: '평면도형의 성질', gradeKey: '1학년 2학기', curriculumNames: ['평면도형'] },
      { textbookChapter: 7, textbookName: '입체도형의 성질', gradeKey: '1학년 2학기', curriculumNames: ['입체도형'] },
      { textbookChapter: 8, textbookName: '자료의 정리와 해석', gradeKey: '1학년 2학기', curriculumNames: ['자료의 정리와 해석'] },
    ],
  },

  {
    id: 'chunjae-khk-m1',
    publisherId: 'chunjae-khk',
    author: '김화경',
    subject: '중학 수학1',
    schoolLevel: 'middle',
    gradeKeys: ['1학년 1학기', '1학년 2학기'],
    gradeCode: 'middle_1',
    gdrivePath: '중등교과서/중1/천재교육 중학 수학1 (김화경) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'lesson_plan', 'sub_unit_eval', 'main_unit_eval', 'activity', 'answer_key'],
    filePattern: '천재교육 중학 수학1 (김화경) 계열',
    chapters: [
      { textbookChapter: 1, textbookName: '소인수분해', gradeKey: '1학년 1학기', curriculumNames: ['소인수분해'] },
      { textbookChapter: 2, textbookName: '정수와 유리수', gradeKey: '1학년 1학기', curriculumNames: ['정수와 유리수'] },
      { textbookChapter: 3, textbookName: '문자와 식', gradeKey: '1학년 1학기', curriculumNames: ['문자의 사용과 식', '일차방정식'] },
      { textbookChapter: 4, textbookName: '좌표평면과 그래프', gradeKey: '1학년 1학기', curriculumNames: ['좌표와 그래프', '정비례와 반비례'] },
      { textbookChapter: 5, textbookName: '기본 도형과 작도', gradeKey: '1학년 2학기', curriculumNames: ['기본 도형', '작도와 합동'] },
      { textbookChapter: 6, textbookName: '평면도형의 성질', gradeKey: '1학년 2학기', curriculumNames: ['평면도형'] },
      { textbookChapter: 7, textbookName: '입체도형의 성질', gradeKey: '1학년 2학기', curriculumNames: ['입체도형'] },
      { textbookChapter: 8, textbookName: '자료의 정리와 해석', gradeKey: '1학년 2학기', curriculumNames: ['자료의 정리와 해석'] },
    ],
  },

  {
    id: 'donga-m1',
    publisherId: 'donga',
    author: '강옥기',
    subject: '중학 수학1',
    schoolLevel: 'middle',
    gradeKeys: ['1학년 1학기', '1학년 2학기'],
    gradeCode: 'middle_1',
    gdrivePath: '중등교과서/중1/동아출판 중학 수학1 (강옥기)(22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'sub_unit_eval', 'main_unit_eval', 'twin_problems', 'answer_key'],
    filePattern: '22개정_중학_수학1_교과서_{N}단원.pdf',
    chapters: [
      { textbookChapter: 1, textbookName: '소인수분해', gradeKey: '1학년 1학기', curriculumNames: ['소인수분해'] },
      { textbookChapter: 2, textbookName: '정수와 유리수', gradeKey: '1학년 1학기', curriculumNames: ['정수와 유리수'] },
      { textbookChapter: 3, textbookName: '문자와 식', gradeKey: '1학년 1학기', curriculumNames: ['문자의 사용과 식', '일차방정식'] },
      { textbookChapter: 4, textbookName: '좌표평면과 그래프', gradeKey: '1학년 1학기', curriculumNames: ['좌표와 그래프', '정비례와 반비례'] },
      { textbookChapter: 5, textbookName: '기본 도형과 작도', gradeKey: '1학년 2학기', curriculumNames: ['기본 도형', '작도와 합동'] },
      { textbookChapter: 6, textbookName: '평면도형의 성질', gradeKey: '1학년 2학기', curriculumNames: ['평면도형'] },
      { textbookChapter: 7, textbookName: '입체도형의 성질', gradeKey: '1학년 2학기', curriculumNames: ['입체도형'] },
      { textbookChapter: 8, textbookName: '자료의 정리와 해석', gradeKey: '1학년 2학기', curriculumNames: ['자료의 정리와 해석'] },
    ],
  },

  {
    id: 'ybm-m1',
    publisherId: 'ybm',
    author: '류희찬',
    subject: '중학 수학1',
    schoolLevel: 'middle',
    gradeKeys: ['1학년 1학기', '1학년 2학기'],
    gradeCode: 'middle_1',
    gdrivePath: '중등교과서/중1/YBM 중학 수학1 (류희찬) (22개정)-002-006',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'sub_unit_eval', 'answer_key'],
    filePattern: '수학 1(류희찬)_교과서_{로마}-{M}_{단원명}.pdf',
    chapters: [
      { textbookChapter: 1, textbookName: '소인수분해', gradeKey: '1학년 1학기', curriculumNames: ['소인수분해'] },
      { textbookChapter: 2, textbookName: '정수와 유리수', gradeKey: '1학년 1학기', curriculumNames: ['정수와 유리수'] },
      { textbookChapter: 3, textbookName: '문자와 식', gradeKey: '1학년 1학기', curriculumNames: ['문자의 사용과 식', '일차방정식'] },
      { textbookChapter: 4, textbookName: '좌표평면과 그래프', gradeKey: '1학년 1학기', curriculumNames: ['좌표와 그래프', '정비례와 반비례'] },
      { textbookChapter: 5, textbookName: '기본 도형과 작도', gradeKey: '1학년 2학기', curriculumNames: ['기본 도형', '작도와 합동'] },
      { textbookChapter: 6, textbookName: '평면도형의 성질', gradeKey: '1학년 2학기', curriculumNames: ['평면도형'] },
      { textbookChapter: 7, textbookName: '입체도형의 성질', gradeKey: '1학년 2학기', curriculumNames: ['입체도형'] },
      { textbookChapter: 8, textbookName: '자료의 정리와 해석', gradeKey: '1학년 2학기', curriculumNames: ['자료의 정리와 해석'] },
    ],
  },

  {
    id: 'jihak-m1',
    publisherId: 'jihak',
    author: '장경윤',
    subject: '중학 수학1',
    schoolLevel: 'middle',
    gradeKeys: ['1학년 1학기', '1학년 2학기'],
    gradeCode: 'middle_1',
    gdrivePath: '중등교과서/중1/지학사 중학 수학1 (장경윤) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'lesson_plan', 'sub_unit_eval', 'main_unit_eval', 'activity', 'video', 'answer_key'],
    filePattern: '{N}-{MM}_{자료유형}.pdf',
    chapters: [
      { textbookChapter: 1, textbookName: '소인수분해', gradeKey: '1학년 1학기', curriculumNames: ['소인수분해'] },
      { textbookChapter: 2, textbookName: '정수와 유리수', gradeKey: '1학년 1학기', curriculumNames: ['정수와 유리수'] },
      { textbookChapter: 3, textbookName: '문자와 식', gradeKey: '1학년 1학기', curriculumNames: ['문자의 사용과 식', '일차방정식'] },
      { textbookChapter: 4, textbookName: '좌표평면과 그래프', gradeKey: '1학년 1학기', curriculumNames: ['좌표와 그래프', '정비례와 반비례'] },
      { textbookChapter: 5, textbookName: '기본 도형과 작도', gradeKey: '1학년 2학기', curriculumNames: ['기본 도형', '작도와 합동'] },
      { textbookChapter: 6, textbookName: '평면도형의 성질', gradeKey: '1학년 2학기', curriculumNames: ['평면도형'] },
      { textbookChapter: 7, textbookName: '입체도형의 성질', gradeKey: '1학년 2학기', curriculumNames: ['입체도형'] },
      { textbookChapter: 8, textbookName: '자료의 정리와 해석', gradeKey: '1학년 2학기', curriculumNames: ['자료의 정리와 해석'] },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 중2
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: 'mirae-m2',
    publisherId: 'mirae',
    author: '황선욱',
    subject: '중학 수학2',
    schoolLevel: 'middle',
    gradeKeys: ['2학년 1학기', '2학년 2학기'],
    gradeCode: 'middle_2',
    gdrivePath: '중등교과서/중2/미래엔 중학 수학2 (황선욱) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'sub_unit_eval', 'main_unit_eval', 'answer_key'],
    filePattern: '미래엔_중학교수학2_교과서_{N}-{M}_{소단원명}.pdf',
    chapters: [
      { textbookChapter: 1, textbookName: '유리수와 순환소수', gradeKey: '2학년 1학기', curriculumNames: ['유리수와 순환소수'] },
      { textbookChapter: 2, textbookName: '식의 계산', gradeKey: '2학년 1학기', curriculumNames: ['식의 계산'] },
      { textbookChapter: 3, textbookName: '일차부등식', gradeKey: '2학년 1학기', curriculumNames: ['일차부등식'] },
      { textbookChapter: 4, textbookName: '연립일차방정식', gradeKey: '2학년 1학기', curriculumNames: ['연립일차방정식'] },
      { textbookChapter: 5, textbookName: '일차함수', gradeKey: '2학년 1학기', curriculumNames: ['일차함수'] },
      { textbookChapter: 6, textbookName: '삼각형과 사각형의 성질', gradeKey: '2학년 2학기', curriculumNames: ['삼각형의 성질', '사각형의 성질'] },
      { textbookChapter: 7, textbookName: '도형의 닮음과 피타고라스 정리', gradeKey: '2학년 2학기', curriculumNames: ['도형의 닮음', '피타고라스 정리'] },
      { textbookChapter: 8, textbookName: '확률', gradeKey: '2학년 2학기', curriculumNames: ['확률'] },
    ],
  },

  {
    id: 'ne-m2',
    publisherId: 'ne',
    author: '권오남',
    subject: '중학 수학2',
    schoolLevel: 'middle',
    gradeKeys: ['2학년 1학기', '2학년 2학기'],
    gradeCode: 'middle_2',
    gdrivePath: '중등교과서/중2/NE능률 중학 수학2 (권오남) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'quiz', 'sub_unit_eval', 'twin_problems', 'answer_key'],
    filePattern: 'NE능률 중학 수학2 계열',
    chapters: [
      { textbookChapter: 1, textbookName: '유리수와 순환소수', gradeKey: '2학년 1학기', curriculumNames: ['유리수와 순환소수'] },
      { textbookChapter: 2, textbookName: '식의 계산', gradeKey: '2학년 1학기', curriculumNames: ['식의 계산'] },
      { textbookChapter: 3, textbookName: '일차부등식', gradeKey: '2학년 1학기', curriculumNames: ['일차부등식'] },
      { textbookChapter: 4, textbookName: '연립일차방정식', gradeKey: '2학년 1학기', curriculumNames: ['연립일차방정식'] },
      { textbookChapter: 5, textbookName: '일차함수', gradeKey: '2학년 1학기', curriculumNames: ['일차함수'] },
      { textbookChapter: 6, textbookName: '삼각형의 성질', gradeKey: '2학년 2학기', curriculumNames: ['삼각형의 성질'] },
      { textbookChapter: 7, textbookName: '사각형의 성질', gradeKey: '2학년 2학기', curriculumNames: ['사각형의 성질'] },
      { textbookChapter: 8, textbookName: '도형의 닮음', gradeKey: '2학년 2학기', curriculumNames: ['도형의 닮음'] },
      { textbookChapter: 9, textbookName: '피타고라스 정리', gradeKey: '2학년 2학기', curriculumNames: ['피타고라스 정리'] },
      { textbookChapter: 10, textbookName: '확률', gradeKey: '2학년 2학기', curriculumNames: ['확률'] },
    ],
  },

  {
    id: 'chunjae-jdt-m2',
    publisherId: 'chunjae-jdt',
    author: '김동재',
    subject: '중학 수학2',
    schoolLevel: 'middle',
    gradeKeys: ['2학년 1학기', '2학년 2학기'],
    gradeCode: 'middle_2',
    gdrivePath: '중등교과서/중2/천재교육 중학 수학2 (김동재) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'lesson_plan', 'sub_unit_eval', 'main_unit_eval', 'activity', 'answer_key'],
    filePattern: '천재교육 중학 수학2 (김동재) 계열',
    chapters: [
      { textbookChapter: 1, textbookName: '유리수와 순환소수', gradeKey: '2학년 1학기', curriculumNames: ['유리수와 순환소수'] },
      { textbookChapter: 2, textbookName: '식의 계산', gradeKey: '2학년 1학기', curriculumNames: ['식의 계산'] },
      { textbookChapter: 3, textbookName: '일차부등식', gradeKey: '2학년 1학기', curriculumNames: ['일차부등식'] },
      { textbookChapter: 4, textbookName: '연립일차방정식', gradeKey: '2학년 1학기', curriculumNames: ['연립일차방정식'] },
      { textbookChapter: 5, textbookName: '일차함수', gradeKey: '2학년 1학기', curriculumNames: ['일차함수'] },
      { textbookChapter: 6, textbookName: '삼각형과 사각형의 성질', gradeKey: '2학년 2학기', curriculumNames: ['삼각형의 성질', '사각형의 성질'] },
      { textbookChapter: 7, textbookName: '도형의 닮음과 피타고라스 정리', gradeKey: '2학년 2학기', curriculumNames: ['도형의 닮음', '피타고라스 정리'] },
      { textbookChapter: 8, textbookName: '확률', gradeKey: '2학년 2학기', curriculumNames: ['확률'] },
    ],
  },

  {
    id: 'chunjae-khk-m2',
    publisherId: 'chunjae-khk',
    author: '김화경',
    subject: '중학 수학2',
    schoolLevel: 'middle',
    gradeKeys: ['2학년 1학기', '2학년 2학기'],
    gradeCode: 'middle_2',
    gdrivePath: '중등교과서/중2/천재교육 중학 수학2 (김화경) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'lesson_plan', 'sub_unit_eval', 'main_unit_eval', 'activity', 'answer_key'],
    filePattern: '천재교육 중학 수학2 (김화경) 계열',
    chapters: [
      { textbookChapter: 1, textbookName: '유리수와 순환소수', gradeKey: '2학년 1학기', curriculumNames: ['유리수와 순환소수'] },
      { textbookChapter: 2, textbookName: '식의 계산', gradeKey: '2학년 1학기', curriculumNames: ['식의 계산'] },
      { textbookChapter: 3, textbookName: '일차부등식', gradeKey: '2학년 1학기', curriculumNames: ['일차부등식'] },
      { textbookChapter: 4, textbookName: '연립일차방정식', gradeKey: '2학년 1학기', curriculumNames: ['연립일차방정식'] },
      { textbookChapter: 5, textbookName: '일차함수', gradeKey: '2학년 1학기', curriculumNames: ['일차함수'] },
      { textbookChapter: 6, textbookName: '삼각형과 사각형의 성질', gradeKey: '2학년 2학기', curriculumNames: ['삼각형의 성질', '사각형의 성질'] },
      { textbookChapter: 7, textbookName: '도형의 닮음과 피타고라스 정리', gradeKey: '2학년 2학기', curriculumNames: ['도형의 닮음', '피타고라스 정리'] },
      { textbookChapter: 8, textbookName: '확률', gradeKey: '2학년 2학기', curriculumNames: ['확률'] },
    ],
  },

  {
    id: 'donga-m2',
    publisherId: 'donga',
    author: '강옥기',
    subject: '중학 수학2',
    schoolLevel: 'middle',
    gradeKeys: ['2학년 1학기', '2학년 2학기'],
    gradeCode: 'middle_2',
    gdrivePath: '중등교과서/중2/동아출판 중학 수학 2 (강옥기) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'sub_unit_eval', 'main_unit_eval', 'midterm_final', 'twin_problems', 'answer_key'],
    filePattern: '22개정_중학_수학2 계열',
    note: '중2 최대 규모 (554개)',
    chapters: [
      { textbookChapter: 1, textbookName: '유리수와 순환소수', gradeKey: '2학년 1학기', curriculumNames: ['유리수와 순환소수'] },
      { textbookChapter: 2, textbookName: '식의 계산', gradeKey: '2학년 1학기', curriculumNames: ['식의 계산'] },
      { textbookChapter: 3, textbookName: '일차부등식', gradeKey: '2학년 1학기', curriculumNames: ['일차부등식'] },
      { textbookChapter: 4, textbookName: '연립일차방정식', gradeKey: '2학년 1학기', curriculumNames: ['연립일차방정식'] },
      { textbookChapter: 5, textbookName: '일차함수', gradeKey: '2학년 1학기', curriculumNames: ['일차함수'] },
      { textbookChapter: 6, textbookName: '삼각형과 사각형의 성질', gradeKey: '2학년 2학기', curriculumNames: ['삼각형의 성질', '사각형의 성질'] },
      { textbookChapter: 7, textbookName: '도형의 닮음과 피타고라스 정리', gradeKey: '2학년 2학기', curriculumNames: ['도형의 닮음', '피타고라스 정리'] },
      { textbookChapter: 8, textbookName: '확률', gradeKey: '2학년 2학기', curriculumNames: ['확률'] },
    ],
  },

  {
    id: 'ybm-m2',
    publisherId: 'ybm',
    author: '류희찬',
    subject: '중학 수학2',
    schoolLevel: 'middle',
    gradeKeys: ['2학년 1학기', '2학년 2학기'],
    gradeCode: 'middle_2',
    gdrivePath: '중등교과서/중2/YMB 중학 수학2 (류희찬) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'sub_unit_eval', 'answer_key'],
    filePattern: 'YBM 중학 수학2 계열',
    chapters: [
      { textbookChapter: 1, textbookName: '유리수와 순환소수', gradeKey: '2학년 1학기', curriculumNames: ['유리수와 순환소수'] },
      { textbookChapter: 2, textbookName: '식의 계산', gradeKey: '2학년 1학기', curriculumNames: ['식의 계산'] },
      { textbookChapter: 3, textbookName: '일차부등식', gradeKey: '2학년 1학기', curriculumNames: ['일차부등식'] },
      { textbookChapter: 4, textbookName: '연립일차방정식', gradeKey: '2학년 1학기', curriculumNames: ['연립일차방정식'] },
      { textbookChapter: 5, textbookName: '일차함수', gradeKey: '2학년 1학기', curriculumNames: ['일차함수'] },
      { textbookChapter: 6, textbookName: '삼각형과 사각형의 성질', gradeKey: '2학년 2학기', curriculumNames: ['삼각형의 성질', '사각형의 성질'] },
      { textbookChapter: 7, textbookName: '도형의 닮음과 피타고라스 정리', gradeKey: '2학년 2학기', curriculumNames: ['도형의 닮음', '피타고라스 정리'] },
      { textbookChapter: 8, textbookName: '확률', gradeKey: '2학년 2학기', curriculumNames: ['확률'] },
    ],
  },

  {
    id: 'jihak-m2',
    publisherId: 'jihak',
    author: '장경윤',
    subject: '중학 수학2',
    schoolLevel: 'middle',
    gradeKeys: ['2학년 1학기', '2학년 2학기'],
    gradeCode: 'middle_2',
    gdrivePath: '중등교과서/중2/지학사 중학 수학2 (장경윤) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'lesson_plan', 'sub_unit_eval', 'main_unit_eval', 'activity', 'video', 'answer_key'],
    filePattern: '지학사 중학 수학2 계열',
    chapters: [
      { textbookChapter: 1, textbookName: '유리수와 순환소수', gradeKey: '2학년 1학기', curriculumNames: ['유리수와 순환소수'] },
      { textbookChapter: 2, textbookName: '식의 계산', gradeKey: '2학년 1학기', curriculumNames: ['식의 계산'] },
      { textbookChapter: 3, textbookName: '일차부등식', gradeKey: '2학년 1학기', curriculumNames: ['일차부등식'] },
      { textbookChapter: 4, textbookName: '연립일차방정식', gradeKey: '2학년 1학기', curriculumNames: ['연립일차방정식'] },
      { textbookChapter: 5, textbookName: '일차함수', gradeKey: '2학년 1학기', curriculumNames: ['일차함수'] },
      { textbookChapter: 6, textbookName: '삼각형과 사각형의 성질', gradeKey: '2학년 2학기', curriculumNames: ['삼각형의 성질', '사각형의 성질'] },
      { textbookChapter: 7, textbookName: '도형의 닮음과 피타고라스 정리', gradeKey: '2학년 2학기', curriculumNames: ['도형의 닮음', '피타고라스 정리'] },
      { textbookChapter: 8, textbookName: '확률', gradeKey: '2학년 2학기', curriculumNames: ['확률'] },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 고등 — 공통수학1
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: 'donga-h1',
    publisherId: 'donga',
    author: '고호경',
    subject: '공통수학Ⅰ',
    schoolLevel: 'high',
    gradeKeys: ['공통수학1'],
    gradeCode: 'high_1',
    gdrivePath: '고등교과서/공통수학1/동아출판 공통수학Ⅰ (고호경) (22개정)]',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'lesson_plan', 'sub_unit_eval', 'main_unit_eval', 'essay_eval', 'twin_problems', 'answer_key'],
    filePattern: '22개정_고등_공통수학1_{N}_{MM}_소단원 평가_{난이도}.pdf',
    chapters: [
      { textbookChapter: 1, textbookName: '다항식', gradeKey: '공통수학1', curriculumNames: ['다항식'] },
      { textbookChapter: 2, textbookName: '복소수와 이차방정식', gradeKey: '공통수학1', curriculumNames: ['방정식과 부등식'] },
      { textbookChapter: 3, textbookName: '이차방정식과 이차함수', gradeKey: '공통수학1', curriculumNames: ['방정식과 부등식'] },
      { textbookChapter: 4, textbookName: '여러 가지 방정식과 부등식', gradeKey: '공통수학1', curriculumNames: ['방정식과 부등식'] },
      { textbookChapter: 5, textbookName: '경우의 수', gradeKey: '공통수학1', curriculumNames: ['경우의 수'] },
      { textbookChapter: 6, textbookName: '행렬', gradeKey: '공통수학1', curriculumNames: ['행렬'] },
    ],
  },

  {
    id: 'mirae-h1',
    publisherId: 'mirae',
    author: '황선욱',
    subject: '공통수학Ⅰ',
    schoolLevel: 'high',
    gradeKeys: ['공통수학1'],
    gradeCode: 'high_1',
    gdrivePath: '고등교과서/공통수학1/미래엔 공통수학Ⅰ(황선욱)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'answer_key'],
    filePattern: '미래엔 공통수학Ⅰ 계열',
    chapters: [
      { textbookChapter: 1, textbookName: '다항식', gradeKey: '공통수학1', curriculumNames: ['다항식'] },
      { textbookChapter: 2, textbookName: '방정식과 부등식', gradeKey: '공통수학1', curriculumNames: ['방정식과 부등식'] },
      { textbookChapter: 3, textbookName: '경우의 수', gradeKey: '공통수학1', curriculumNames: ['경우의 수'] },
      { textbookChapter: 4, textbookName: '행렬', gradeKey: '공통수학1', curriculumNames: ['행렬'] },
    ],
  },

  {
    id: 'chunjae-jit-h1',
    publisherId: 'chunjae-jit',
    author: '전인태',
    subject: '공통수학1',
    schoolLevel: 'high',
    gradeKeys: ['공통수학1'],
    gradeCode: 'high_1',
    gdrivePath: '고등교과서/공통수학1/천재교육 공통수학1 (전인태) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'sub_unit_eval', 'main_unit_eval', 'answer_key'],
    filePattern: '교과서 HWP({N}단원).hwp',
    chapters: [
      { textbookChapter: 1, textbookName: '다항식', gradeKey: '공통수학1', curriculumNames: ['다항식'] },
      { textbookChapter: 2, textbookName: '방정식과 부등식', gradeKey: '공통수학1', curriculumNames: ['방정식과 부등식'] },
      { textbookChapter: 3, textbookName: '경우의 수', gradeKey: '공통수학1', curriculumNames: ['경우의 수'] },
      { textbookChapter: 4, textbookName: '행렬', gradeKey: '공통수학1', curriculumNames: ['행렬'] },
    ],
  },

  {
    id: 'chunjae-hjg-h1',
    publisherId: 'chunjae-hjg',
    author: '홍진곤',
    subject: '공통수학1',
    schoolLevel: 'high',
    gradeKeys: ['공통수학1'],
    gradeCode: 'high_1',
    gdrivePath: '고등교과서/공통수학1/천재교육 공통수학1 (홍진곤) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'sub_unit_eval', 'main_unit_eval', 'answer_key'],
    filePattern: '교과서_{자료유형}_{로마}.{단원명}.hwp',
    chapters: [
      { textbookChapter: 1, textbookName: '다항식', gradeKey: '공통수학1', curriculumNames: ['다항식'] },
      { textbookChapter: 2, textbookName: '방정식과 부등식', gradeKey: '공통수학1', curriculumNames: ['방정식과 부등식'] },
      { textbookChapter: 3, textbookName: '경우의 수', gradeKey: '공통수학1', curriculumNames: ['경우의 수'] },
      { textbookChapter: 4, textbookName: '행렬', gradeKey: '공통수학1', curriculumNames: ['행렬'] },
    ],
  },

  {
    id: 'bisang-h1',
    publisherId: 'bisang',
    author: '김원경',
    subject: '공통수학1',
    schoolLevel: 'high',
    gradeKeys: ['공통수학1'],
    gradeCode: 'high_1',
    gdrivePath: '고등교과서/공통수학1/비상교과서 공통수학1 (김원경)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'sub_unit_eval', 'answer_key'],
    filePattern: '[비상교육] 고등_공통수학1_{N}-{M}_{자료유형}.pptx',
    chapters: [
      { textbookChapter: 1, textbookName: '다항식', gradeKey: '공통수학1', curriculumNames: ['다항식'] },
      { textbookChapter: 2, textbookName: '방정식과 부등식', gradeKey: '공통수학1', curriculumNames: ['방정식과 부등식'] },
      { textbookChapter: 3, textbookName: '경우의 수', gradeKey: '공통수학1', curriculumNames: ['경우의 수'] },
      { textbookChapter: 4, textbookName: '행렬', gradeKey: '공통수학1', curriculumNames: ['행렬'] },
    ],
  },

  {
    id: 'ybm-h1',
    publisherId: 'ybm',
    author: '류희찬',
    subject: '공통수학Ⅰ',
    schoolLevel: 'high',
    gradeKeys: ['공통수학1'],
    gradeCode: 'high_1',
    gdrivePath: '고등교과서/공통수학1/와이비엠 공통수학Ⅰ(류희찬)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'answer_key'],
    filePattern: 'YBM 공통수학Ⅰ 계열',
    chapters: [
      { textbookChapter: 1, textbookName: '다항식', gradeKey: '공통수학1', curriculumNames: ['다항식'] },
      { textbookChapter: 2, textbookName: '방정식과 부등식', gradeKey: '공통수학1', curriculumNames: ['방정식과 부등식'] },
      { textbookChapter: 3, textbookName: '경우의 수', gradeKey: '공통수학1', curriculumNames: ['경우의 수'] },
      { textbookChapter: 4, textbookName: '행렬', gradeKey: '공통수학1', curriculumNames: ['행렬'] },
    ],
  },

  {
    id: 'jihak-h1',
    publisherId: 'jihak',
    author: '장윤경',
    subject: '공통수학1',
    schoolLevel: 'high',
    gradeKeys: ['공통수학1'],
    gradeCode: 'high_1',
    gdrivePath: '고등교과서/공통수학1/지학사 공통수학1 (장윤경) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'answer_key'],
    filePattern: '지학사 공통수학1 계열',
    chapters: [
      { textbookChapter: 1, textbookName: '다항식', gradeKey: '공통수학1', curriculumNames: ['다항식'] },
      { textbookChapter: 2, textbookName: '방정식과 부등식', gradeKey: '공통수학1', curriculumNames: ['방정식과 부등식'] },
      { textbookChapter: 3, textbookName: '경우의 수', gradeKey: '공통수학1', curriculumNames: ['경우의 수'] },
      { textbookChapter: 4, textbookName: '행렬', gradeKey: '공통수학1', curriculumNames: ['행렬'] },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 고등 — 공통수학2
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: 'donga-h2',
    publisherId: 'donga',
    author: '고호경',
    subject: '공통수학2',
    schoolLevel: 'high',
    gradeKeys: ['공통수학2'],
    gradeCode: 'high_2',
    gdrivePath: '고등교과서/공통수학2/동아출판 공통수학2 (고호경)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'answer_key'],
    filePattern: '동아출판 공통수학2 계열',
    chapters: [
      { textbookChapter: 1, textbookName: '도형의 방정식', gradeKey: '공통수학2', curriculumNames: ['도형의 방정식'] },
      { textbookChapter: 2, textbookName: '집합과 명제', gradeKey: '공통수학2', curriculumNames: ['집합과 명제'] },
      { textbookChapter: 3, textbookName: '함수와 그래프', gradeKey: '공통수학2', curriculumNames: ['함수와 그래프'] },
    ],
  },

  {
    id: 'chunjae-jit-h2',
    publisherId: 'chunjae-jit',
    author: '전인태',
    subject: '공통수학2',
    schoolLevel: 'high',
    gradeKeys: ['공통수학2'],
    gradeCode: 'high_2',
    gdrivePath: '고등교과서/공통수학2/천재교육 공통수학2 (전인태)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'sub_unit_eval', 'main_unit_eval', 'answer_key'],
    filePattern: '교과서 HWP({N}단원).hwp',
    note: '공통수학2 최대 규모 (234개)',
    chapters: [
      { textbookChapter: 1, textbookName: '도형의 방정식', gradeKey: '공통수학2', curriculumNames: ['도형의 방정식'] },
      { textbookChapter: 2, textbookName: '집합과 명제', gradeKey: '공통수학2', curriculumNames: ['집합과 명제'] },
      { textbookChapter: 3, textbookName: '함수와 그래프', gradeKey: '공통수학2', curriculumNames: ['함수와 그래프'] },
    ],
  },

  {
    id: 'chunjae-hjg-h2',
    publisherId: 'chunjae-hjg',
    author: '홍진곤',
    subject: '공통수학2',
    schoolLevel: 'high',
    gradeKeys: ['공통수학2'],
    gradeCode: 'high_2',
    gdrivePath: '고등교과서/공통수학2/천재교육 공통수학2 (홍진곤) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'sub_unit_eval', 'main_unit_eval', 'answer_key'],
    filePattern: '교과서_{자료유형}_{로마}.{단원명}.hwp',
    chapters: [
      { textbookChapter: 1, textbookName: '도형의 방정식', gradeKey: '공통수학2', curriculumNames: ['도형의 방정식'] },
      { textbookChapter: 2, textbookName: '집합과 명제', gradeKey: '공통수학2', curriculumNames: ['집합과 명제'] },
      { textbookChapter: 3, textbookName: '함수와 그래프', gradeKey: '공통수학2', curriculumNames: ['함수와 그래프'] },
    ],
  },

  {
    id: 'bisang-h2',
    publisherId: 'bisang',
    author: '김원경',
    subject: '공통수학2',
    schoolLevel: 'high',
    gradeKeys: ['공통수학2'],
    gradeCode: 'high_2',
    gdrivePath: '고등교과서/공통수학2/비상교과서 공통수학2 (김원경)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'sub_unit_eval', 'answer_key'],
    filePattern: '[비상교육] 고등_공통수학2 계열',
    chapters: [
      { textbookChapter: 1, textbookName: '도형의 방정식', gradeKey: '공통수학2', curriculumNames: ['도형의 방정식'] },
      { textbookChapter: 2, textbookName: '집합과 명제', gradeKey: '공통수학2', curriculumNames: ['집합과 명제'] },
      { textbookChapter: 3, textbookName: '함수와 그래프', gradeKey: '공통수학2', curriculumNames: ['함수와 그래프'] },
    ],
  },

  {
    id: 'ybm-h2',
    publisherId: 'ybm',
    author: '류희찬',
    subject: '공통수학2',
    schoolLevel: 'high',
    gradeKeys: ['공통수학2'],
    gradeCode: 'high_2',
    gdrivePath: '고등교과서/공통수학2/와이비엠 공통수학2(류희찬)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'answer_key'],
    filePattern: 'YBM 공통수학2 계열',
    chapters: [
      { textbookChapter: 1, textbookName: '도형의 방정식', gradeKey: '공통수학2', curriculumNames: ['도형의 방정식'] },
      { textbookChapter: 2, textbookName: '집합과 명제', gradeKey: '공통수학2', curriculumNames: ['집합과 명제'] },
      { textbookChapter: 3, textbookName: '함수와 그래프', gradeKey: '공통수학2', curriculumNames: ['함수와 그래프'] },
    ],
  },

  {
    id: 'jihak-h2',
    publisherId: 'jihak',
    author: '장윤경',
    subject: '공통수학2',
    schoolLevel: 'high',
    gradeKeys: ['공통수학2'],
    gradeCode: 'high_2',
    gdrivePath: '고등교과서/공통수학2/지학사 공통수학2 (장윤경) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'answer_key'],
    filePattern: '지학사 공통수학2 계열',
    chapters: [
      { textbookChapter: 1, textbookName: '도형의 방정식', gradeKey: '공통수학2', curriculumNames: ['도형의 방정식'] },
      { textbookChapter: 2, textbookName: '집합과 명제', gradeKey: '공통수학2', curriculumNames: ['집합과 명제'] },
      { textbookChapter: 3, textbookName: '함수와 그래프', gradeKey: '공통수학2', curriculumNames: ['함수와 그래프'] },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 고등 — 대수
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: 'donga-algebra',
    publisherId: 'donga',
    author: '고호경',
    subject: '대수',
    schoolLevel: 'high',
    gradeKeys: ['대수'],
    gradeCode: 'high_algebra',
    gdrivePath: '고등교과서/대수/동아출판 대수 (고호경)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'lesson_plan', 'sub_unit_eval', 'main_unit_eval', 'essay_eval', 'twin_problems', 'answer_key'],
    filePattern: '22개정_고등_대수_{N}_{MM}_소단원 평가_{난이도}.pdf',
    note: '대수 최대 규모 (324개)',
    chapters: [
      { textbookChapter: 1, textbookName: '지수와 로그', gradeKey: '대수', curriculumNames: ['지수함수와 로그함수'] },
      { textbookChapter: 2, textbookName: '지수함수와 로그함수', gradeKey: '대수', curriculumNames: ['지수함수와 로그함수'] },
      { textbookChapter: 3, textbookName: '삼각함수', gradeKey: '대수', curriculumNames: ['삼각함수'] },
      { textbookChapter: 4, textbookName: '등차수열과 등비수열', gradeKey: '대수', curriculumNames: ['수열'] },
      { textbookChapter: 5, textbookName: '수열의 합', gradeKey: '대수', curriculumNames: ['수열'] },
      { textbookChapter: 6, textbookName: '수학적 귀납법', gradeKey: '대수', curriculumNames: ['수열'] },
    ],
  },

  {
    id: 'mirae-algebra',
    publisherId: 'mirae',
    author: '황선욱',
    subject: '대수',
    schoolLevel: 'high',
    gradeKeys: ['대수'],
    gradeCode: 'high_algebra',
    gdrivePath: '고등교과서/대수/미래엔 대수 (황선욱)(22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'answer_key'],
    filePattern: '미래엔 대수 계열',
    chapters: [
      { textbookChapter: 1, textbookName: '지수함수와 로그함수', gradeKey: '대수', curriculumNames: ['지수함수와 로그함수'] },
      { textbookChapter: 2, textbookName: '삼각함수', gradeKey: '대수', curriculumNames: ['삼각함수'] },
      { textbookChapter: 3, textbookName: '수열', gradeKey: '대수', curriculumNames: ['수열'] },
    ],
  },

  {
    id: 'chunjae-jit-algebra',
    publisherId: 'chunjae-jit',
    author: '전인태',
    subject: '대수',
    schoolLevel: 'high',
    gradeKeys: ['대수'],
    gradeCode: 'high_algebra',
    gdrivePath: '고등교과서/대수/천재교육 대수 (전인태)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'sub_unit_eval', 'main_unit_eval', 'answer_key'],
    filePattern: '교과서 HWP({N}단원).hwp',
    chapters: [
      { textbookChapter: 1, textbookName: '지수함수와 로그함수', gradeKey: '대수', curriculumNames: ['지수함수와 로그함수'] },
      { textbookChapter: 2, textbookName: '삼각함수', gradeKey: '대수', curriculumNames: ['삼각함수'] },
      { textbookChapter: 3, textbookName: '수열', gradeKey: '대수', curriculumNames: ['수열'] },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 고등 — 미적분I
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: 'donga-calc1',
    publisherId: 'donga',
    author: '고호경',
    subject: '미적분Ⅰ',
    schoolLevel: 'high',
    gradeKeys: ['미적분I'],
    gradeCode: 'high_calculus1',
    gdrivePath: '고등교과서/미적분1/동아출판 미적분Ⅰ (22개정) (고호경)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'lesson_plan', 'sub_unit_eval', 'main_unit_eval', 'essay_eval', 'twin_problems', 'answer_key'],
    filePattern: '22개정_고등_미적분1_{N}_{MM}_소단원 평가_{난이도}.pdf',
    note: '미적분1 최대 규모 (270개)',
    chapters: [
      { textbookChapter: 1, textbookName: '함수의 극한', gradeKey: '미적분I', curriculumNames: ['함수의 극한과 연속'] },
      { textbookChapter: 2, textbookName: '함수의 연속', gradeKey: '미적분I', curriculumNames: ['함수의 극한과 연속'] },
      { textbookChapter: 3, textbookName: '미분계수와 도함수', gradeKey: '미적분I', curriculumNames: ['미분'] },
      { textbookChapter: 4, textbookName: '도함수의 활용', gradeKey: '미적분I', curriculumNames: ['미분'] },
      { textbookChapter: 5, textbookName: '부정적분과 정적분', gradeKey: '미적분I', curriculumNames: ['적분'] },
      { textbookChapter: 6, textbookName: '정적분의 활용', gradeKey: '미적분I', curriculumNames: ['적분'] },
    ],
  },

  {
    id: 'chunjae-hjg-calc1',
    publisherId: 'chunjae-hjg',
    author: '홍진곤',
    subject: '미적분1',
    schoolLevel: 'high',
    gradeKeys: ['미적분I'],
    gradeCode: 'high_calculus1',
    gdrivePath: '고등교과서/미적분1/천재교육 미적분1 (홍진곤)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'sub_unit_eval', 'main_unit_eval', 'answer_key'],
    filePattern: '교과서_{자료유형}_{로마}.{단원명}.hwp',
    chapters: [
      { textbookChapter: 1, textbookName: '함수의 극한과 연속', gradeKey: '미적분I', curriculumNames: ['함수의 극한과 연속'] },
      { textbookChapter: 2, textbookName: '미분', gradeKey: '미적분I', curriculumNames: ['미분'] },
      { textbookChapter: 3, textbookName: '적분', gradeKey: '미적분I', curriculumNames: ['적분'] },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 고등 — 기하
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: 'donga-geo',
    publisherId: 'donga',
    author: '고호경',
    subject: '기하',
    schoolLevel: 'high',
    gradeKeys: ['기하'],
    gradeCode: 'high_geo',
    gdrivePath: '고등교과서/기하/동아출판 기하 (고호경) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'lesson_plan', 'sub_unit_eval', 'main_unit_eval', 'essay_eval', 'twin_problems', 'answer_key'],
    filePattern: '22개정_고등_기하_{N}_{MM}_소단원 평가_{난이도}.pdf',
    chapters: [
      { textbookChapter: 1, textbookName: '이차곡선', gradeKey: '기하', curriculumNames: ['이차곡선'] },
      { textbookChapter: 2, textbookName: '이차곡선과 직선', gradeKey: '기하', curriculumNames: ['이차곡선'] },
      { textbookChapter: 3, textbookName: '평면벡터', gradeKey: '기하', curriculumNames: ['평면벡터'] },
      { textbookChapter: 4, textbookName: '공간도형과 공간좌표', gradeKey: '기하', curriculumNames: ['공간도형과 공간좌표'] },
    ],
  },

  {
    id: 'chunjae-jit-geo',
    publisherId: 'chunjae-jit',
    author: '전인태',
    subject: '기하',
    schoolLevel: 'high',
    gradeKeys: ['기하'],
    gradeCode: 'high_geo',
    gdrivePath: '고등교과서/기하/천재교육 기하 (전인태) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'sub_unit_eval', 'answer_key'],
    filePattern: '교과서 HWP({N}단원).hwp',
    chapters: [
      { textbookChapter: 1, textbookName: '이차곡선', gradeKey: '기하', curriculumNames: ['이차곡선'] },
      { textbookChapter: 2, textbookName: '평면벡터', gradeKey: '기하', curriculumNames: ['평면벡터'] },
      { textbookChapter: 3, textbookName: '공간도형과 공간좌표', gradeKey: '기하', curriculumNames: ['공간도형과 공간좌표'] },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 고등 — 확률과 통계
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: 'chunjae-jit-prob',
    publisherId: 'chunjae-jit',
    author: '전인태',
    subject: '확률과 통계',
    schoolLevel: 'high',
    gradeKeys: ['확률과 통계'],
    gradeCode: 'high_prob',
    gdrivePath: '고등교과서/확률과통계/천재교육 확률과 통계 (전인태) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'sub_unit_eval', 'main_unit_eval', 'answer_key'],
    filePattern: '소단원 평가({N}-{M}-{S}).hwp',
    note: '확통 최대 규모 (271개)',
    chapters: [
      { textbookChapter: 1, textbookName: '경우의 수', gradeKey: '확률과 통계', curriculumNames: ['경우의 수'] },
      { textbookChapter: 2, textbookName: '확률', gradeKey: '확률과 통계', curriculumNames: ['확률'] },
      { textbookChapter: 3, textbookName: '통계', gradeKey: '확률과 통계', curriculumNames: ['통계'] },
    ],
  },

  {
    id: 'bisang-prob',
    publisherId: 'bisang',
    author: '김원경',
    subject: '확률과 통계',
    schoolLevel: 'high',
    gradeKeys: ['확률과 통계'],
    gradeCode: 'high_prob',
    gdrivePath: '고등교과서/확률과통계/비상교과서 확률과 통계 (22개정) ( 김원경)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'answer_key'],
    filePattern: '비상 확률과 통계 계열',
    chapters: [
      { textbookChapter: 1, textbookName: '경우의 수', gradeKey: '확률과 통계', curriculumNames: ['경우의 수'] },
      { textbookChapter: 2, textbookName: '확률', gradeKey: '확률과 통계', curriculumNames: ['확률'] },
      { textbookChapter: 3, textbookName: '통계', gradeKey: '확률과 통계', curriculumNames: ['통계'] },
    ],
  },

  {
    id: 'ybm-prob',
    publisherId: 'ybm',
    author: '류희찬',
    subject: '확률과 통계',
    schoolLevel: 'high',
    gradeKeys: ['확률과 통계'],
    gradeCode: 'high_prob',
    gdrivePath: '고등교과서/확률과통계/와이비엠 확률과 통계 (류희찬) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'answer_key'],
    filePattern: 'YBM 확률과 통계 계열',
    chapters: [
      { textbookChapter: 1, textbookName: '경우의 수', gradeKey: '확률과 통계', curriculumNames: ['경우의 수'] },
      { textbookChapter: 2, textbookName: '확률', gradeKey: '확률과 통계', curriculumNames: ['확률'] },
      { textbookChapter: 3, textbookName: '통계', gradeKey: '확률과 통계', curriculumNames: ['통계'] },
    ],
  },

  {
    id: 'jihak-prob',
    publisherId: 'jihak',
    author: '장경윤',
    subject: '확률과 통계',
    schoolLevel: 'high',
    gradeKeys: ['확률과 통계'],
    gradeCode: 'high_prob',
    gdrivePath: '고등교과서/확률과통계/지학사 확률과 통계 (장경윤) (22개정)',
    resources: ['textbook', 'teacher_book', 'guide', 'ppt', 'answer_key'],
    filePattern: '지학사 확률과 통계 계열',
    chapters: [
      { textbookChapter: 1, textbookName: '경우의 수', gradeKey: '확률과 통계', curriculumNames: ['경우의 수'] },
      { textbookChapter: 2, textbookName: '확률', gradeKey: '확률과 통계', curriculumNames: ['확률'] },
      { textbookChapter: 3, textbookName: '통계', gradeKey: '확률과 통계', curriculumNames: ['통계'] },
    ],
  },
];

// ─────────────────────────────────────────
// 4. 헬퍼 함수
// ─────────────────────────────────────────

/** 학교급+학년으로 교과서 목록 조회 */
export function getTextbooksForGrade(
  schoolLevel: 'middle' | 'high',
  gradeKey: string,
): TextbookEntry[] {
  return TEXTBOOK_CATALOG.filter(
    t => t.schoolLevel === schoolLevel && t.gradeKeys.includes(gradeKey),
  );
}

/** 출판사 ID로 모든 교과서 조회 */
export function getTextbooksByPublisher(publisherId: string): TextbookEntry[] {
  return TEXTBOOK_CATALOG.filter(t => t.publisherId === publisherId);
}

/** 특정 자료 유형을 가진 교과서만 필터 */
export function getTextbooksWithResource(
  resource: ResourceType,
  schoolLevel?: 'middle' | 'high',
): TextbookEntry[] {
  return TEXTBOOK_CATALOG.filter(
    t =>
      t.resources.includes(resource) &&
      (!schoolLevel || t.schoolLevel === schoolLevel),
  );
}

/**
 * 교과서 대단원 번호 → curriculum.ts 단원명 변환
 *
 * @example
 * resolveCurriculumNames('mirae-m1', 3)
 * // → { gradeKey: '1학년 1학기', names: ['문자의 사용과 식', '일차방정식'] }
 */
export function resolveCurriculumNames(
  textbookId: string,
  textbookChapter: number,
): { gradeKey: string; names: string[] } | null {
  const textbook = TEXTBOOK_CATALOG.find(t => t.id === textbookId);
  if (!textbook) return null;

  const mapping = textbook.chapters.find(
    c => c.textbookChapter === textbookChapter,
  );
  if (!mapping) return null;

  return { gradeKey: mapping.gradeKey, names: mapping.curriculumNames };
}

/** G드라이브 전체 경로 생성 (G:/ 접두어 포함) */
export function getFullGdrivePath(textbookId: string): string | null {
  const textbook = TEXTBOOK_CATALOG.find(t => t.id === textbookId);
  return textbook ? `G:/${textbook.gdrivePath}` : null;
}

// ─────────────────────────────────────────
// 5. 통계 (G드라이브 현황)
// ─────────────────────────────────────────

/** 누락/미완성 목록 (임포트 스크립트에서 스킵 참고) */
export const TEXTBOOK_GAPS = {
  missing: [
    { level: '중3', note: '폴더 존재하나 파일 0개' },
    { level: '미적분II', note: '폴더 존재하나 파일 0개' },
  ],
  zipOnly: [
    { textbookId: 'mirae-h2', note: '미래엔 공통수학2 — zip 미해제' },
    { textbookId: null as string | null, path: '고등교과서/미적분1/미래엔 미적분 I (황선욱) (22개정)', note: '미래엔 미적분I — zip 미해제' },
    { textbookId: null as string | null, path: '고등교과서/확률과통계/미래엔 확률과통계 (황선욱) (22개정)', note: '미래엔 확통 — zip 미해제' },
  ],
  incomplete: [
    { path: '중등교과서/중2/교학사 중학 수학2 (김창동) (22개정) - 미완성', note: '폴더명에 미완성 명시' },
  ],
};
