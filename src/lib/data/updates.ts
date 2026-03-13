/**
 * 업데이트 내역 데이터
 * audience: 해당 업데이트를 볼 수 있는 대상
 *  - 'public'  → 외부(비로그인) 사용자에게 노출
 *  - 'student' → 학생에게 노출
 *  - 'teacher' → 선생님에게 노출
 *  - 'admin'   → 관리자에게만 노출
 */

export type UpdateType = 'feature' | 'add' | 'fix' | 'improve';
export type Audience = 'public' | 'student' | 'teacher' | 'admin';

export interface UpdateEntry {
  type: UpdateType;
  text: string;
}

export interface UpdateLog {
  date: string;
  title: string;
  audience: Audience[];
  entries: UpdateEntry[];
}

export const TYPE_CONFIG: Record<UpdateType, { label: string; color: string }> = {
  feature: { label: '기능', color: 'bg-blue-100 text-blue-700' },
  add: { label: '추가', color: 'bg-green-100 text-green-700' },
  fix: { label: '수정', color: 'bg-amber-100 text-amber-700' },
  improve: { label: '개선', color: 'bg-violet-100 text-violet-700' },
};

export const ALL_UPDATES: UpdateLog[] = [
  // ── 어드민 전용 ──
  {
    date: '2025-03-11',
    title: '관리자 대시보드 모니터링 추가',
    audience: ['admin'],
    entries: [
      { type: 'feature', text: '서버 상태 모니터링 패널' },
      { type: 'add', text: '사용자 활동 로그 조회 기능' },
      { type: 'add', text: '선생님 계정 관리 (승인/비활성화)' },
    ],
  },
  // ── 선생님용 ──
  {
    date: '2025-03-11',
    title: '연산 생성기 대규모 확장 — 62개 유형 완성',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: '연산 생성기 카테고리 10개 → 62개로 대폭 확장' },
      { type: 'add', text: '초2: 단위 변환 (m↔cm, kg↔g 등)' },
      { type: 'add', text: '초3: 시간 계산 (시간+분 → 분 변환)' },
      { type: 'add', text: '초4: 각도 구하기, 규칙 찾기 (등차수열)' },
      { type: 'add', text: '초5: 최대공약수/최소공배수, 평균, 넓이 구하기' },
      { type: 'add', text: '초6: 원의 넓이/둘레, 비와 비율, 백분율' },
      { type: 'add', text: '중1: 소인수분해, 정비례/반비례, 사분면 판별' },
      { type: 'add', text: '중2: 지수법칙, 일차방정식, 피타고라스, 닮음비' },
      { type: 'add', text: '중3: 인수분해, 분모의 유리화, 판별식, 삼각비, 원주각, 중앙값, 분산' },
      { type: 'improve', text: '난이도 드롭다운 제거 → 유형 자체가 수준을 결정하는 구조로 전환' },
      { type: 'improve', text: '학년별 세부 카테고리로 교육과정(2022 개정) 정밀 매핑' },
    ],
  },
  {
    date: '2025-03-10',
    title: '연산 생성기 인쇄/미리보기 대폭 개선',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: 'A4 용지 비율 인쇄 미리보기 (CSS transform scale)' },
      { type: 'feature', text: '2열×10행 레이아웃, 페이지 자동 분할' },
      { type: 'improve', text: 'KaTeX 수식 렌더링 적용 (분수, 제곱근, 다항식)' },
      { type: 'improve', text: 'Split Panel 레이아웃 (좌측 설정 + 우측 미리보기)' },
      { type: 'add', text: '문제 수 입력 (최대 1000문제, 경고 표시)' },
      { type: 'add', text: '정답 표시/숨기기 토글' },
    ],
  },
  {
    date: '2025-03-09',
    title: '문제은행 필터링 및 네비게이션 개선',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: '문제은행 학년/단원/유형별 필터링 시스템' },
      { type: 'improve', text: '사이드바 네비게이션 아이콘 및 구조 개선' },
      { type: 'add', text: '연산 생성기 KaTeX 수식 표시 개선' },
    ],
  },
  // ── 학생용 ──
  {
    date: '2025-03-11',
    title: '연산 연습 유형 대폭 추가',
    audience: ['student'],
    entries: [
      { type: 'feature', text: '연산 연습 유형 62개로 확장 (초2~중3)' },
      { type: 'add', text: '단위 변환, 시간 계산, 각도, 넓이, 통계 등 추가' },
      { type: 'improve', text: '수식 표시가 더 깔끔해졌어요 (KaTeX)' },
    ],
  },
  {
    date: '2025-03-10',
    title: '연산 연습 UI 개선',
    audience: ['student'],
    entries: [
      { type: 'improve', text: '문제 풀이 화면 레이아웃 개선' },
      { type: 'add', text: '분수, 제곱근 등 수학 기호가 예쁘게 표시돼요' },
    ],
  },
  // ── 외부(공개) ──
  {
    date: '2025-03-11',
    title: 'MathLab v1.0 — 62개 연산 유형 지원',
    audience: ['public'],
    entries: [
      { type: 'feature', text: '초등 2학년부터 중학 3학년까지 62개 연산 유형' },
      { type: 'feature', text: '4단계 학습법: 읽기 → 빈칸(쉬움) → 빈칸(어려움) → 백지 쓰기' },
      { type: 'add', text: 'A4 인쇄용 연산 문제지 생성' },
      { type: 'add', text: '실시간 학습 분석 대시보드' },
    ],
  },
  {
    date: '2025-03-08',
    title: '경쟁사 벤치마킹 기반 14개 기능 통합 구현',
    audience: ['public', 'teacher', 'admin'],
    entries: [
      { type: 'feature', text: '시험 시스템 통합 + 풀이 속도 분석' },
      { type: 'feature', text: 'MathLive 수식 편집기 통합' },
      { type: 'add', text: 'PDF 파서 개선' },
      { type: 'add', text: '대시보드, 학습 분석, 레벨테스트 등 다수 페이지 추가' },
    ],
  },
];

/** 역할에 따라 볼 수 있는 업데이트 필터링 */
export function getUpdatesByRole(role?: 'STUDENT' | 'TEACHER' | 'ADMIN' | null): UpdateLog[] {
  if (!role) {
    // 비로그인 → public만
    return ALL_UPDATES.filter((u) => u.audience.includes('public'));
  }
  switch (role) {
    case 'STUDENT':
      return ALL_UPDATES.filter((u) => u.audience.includes('student') || u.audience.includes('public'));
    case 'TEACHER':
      return ALL_UPDATES.filter((u) => u.audience.includes('teacher') || u.audience.includes('public'));
    case 'ADMIN':
      // 관리자는 모두 볼 수 있음
      return ALL_UPDATES;
    default:
      return ALL_UPDATES.filter((u) => u.audience.includes('public'));
  }
}
