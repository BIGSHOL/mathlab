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
  // ── 2026-03-18 ──
  {
    date: '2026-03-18',
    title: '빈칸 학습 정답 공개 시스템 + 대시보드 기간 필터',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: '빈칸 학습 오답 시 정답 공개 → 학생이 직접 재입력하여 다음 단계 진행 가능 (XP 절반 지급)' },
      { type: 'feature', text: '대시보드 기간 설정 — 최근 7일/30일/3개월/전체 기간 필터링' },
      { type: 'add', text: '학습 힌트/정답공개 사용 이력 DB 추적 (hintCount, revealCount, usedReveal)' },
      { type: 'fix', text: '대시보드 "기간 설정" 버튼이 인쇄(window.print)로 연결되던 버그 수정' },
      { type: 'improve', text: '활동률·학습기록·최근활동이 선택 기간에 맞게 필터링되도록 개선' },
    ],
  },
  {
    date: '2026-03-18',
    title: '빈칸 학습 개선 — 막히면 정답 확인 후 재도전',
    audience: ['student'],
    entries: [
      { type: 'feature', text: '빈칸 오답 시 정답이 플레이스홀더로 표시 — 확인 후 직접 입력하면 다음 단계로 진행' },
      { type: 'add', text: '정답 공개 사용 시 XP가 절반으로 지급 (스스로 풀면 전액 지급)' },
      { type: 'improve', text: '오답 빈칸이 amber 색상으로 강조되어 어떤 빈칸이 틀렸는지 한눈에 확인' },
    ],
  },
  // ── 2026-03-17 ──
  {
    date: '2026-03-17',
    title: 'UX 대폭 개선 — 글로벌 토스트 & 커맨드 팔레트',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: 'Ctrl+K 커맨드 팔레트 — 모든 메뉴를 키보드로 빠르게 검색/이동' },
      { type: 'feature', text: '글로벌 토스트 알림 시스템 — 성공/오류/경고/정보 알림 자동 표시' },
      { type: 'improve', text: '전체 페이지 alert() 팝업 → 토스트 알림으로 교체 (25개 파일, 67개 항목)' },
      { type: 'improve', text: '전체 UI 폰트 Pretendard로 통일 (일관된 시각 경험)' },
      { type: 'improve', text: 'API 코드 DRY 리팩터링 — Zod 스키마 재사용, 라우트 핸들러 팩토리 적용' },
    ],
  },
  // ── 2026-03-16 ──
  {
    date: '2026-03-16',
    title: '게이미피케이션 8종 기능 + 다이어그램 26종 완성',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: '게이미피케이션 8종 기능 토글 시스템 (타임어택, 일일미션, 뱃지, 복수전, 반대항전, 오늘의 문제 등)' },
      { type: 'feature', text: '관리자 기능 관리 페이지 — 각 기능 ON/OFF 실시간 토글' },
      { type: 'feature', text: '뱃지 시스템 10종 (연속출석, 연산마스터, 개념달인, 만점왕 등)' },
      { type: 'feature', text: '다이어그램 26종 지원 (막대그래프, 꺾은선, 그림그래프, 원그래프, 띠그래프, 각도, 시계, 히스토그램, 줄기와잎, 입체도형, 전개도, 수형도, 산점도 추가)' },
      { type: 'feature', text: '분수 사각형/원 조각 클릭 편집 — 개별 셀 색칠/빗금 지원' },
      { type: 'add', text: '도형 정렬 옵션 (왼쪽/가운데/오른쪽)' },
      { type: 'add', text: '수직선 마크 점 표시/숨기기 옵션 및 점 색상 커스텀' },
      { type: 'fix', text: '분수 사각형 빗금(hatching)이 미리보기에 표시되지 않던 버그 수정' },
      { type: 'fix', text: 'Backspace 키로 텍스트 삭제 시 브라우저 뒤로가기 발생하던 문제 수정' },
    ],
  },
  {
    date: '2026-03-16',
    title: '일일 미션 & 뱃지 시스템 도입',
    audience: ['student'],
    entries: [
      { type: 'feature', text: '일일 미션 — 매일 새로운 학습 미션 3개 도전' },
      { type: 'feature', text: '뱃지 시스템 — 연속출석, 연산마스터, 만점왕 등 10종 뱃지 수집' },
      { type: 'feature', text: '오늘의 문제 — 매일 선정되는 도전 문제' },
      { type: 'add', text: '복수전 — 틀린 문제 다시 도전하여 설욕' },
      { type: 'add', text: '타임어택 — 연산 속도 챌린지' },
    ],
  },
  // ── 2026-03-14~15 ──
  {
    date: '2026-03-14',
    title: 'SVG 다이어그램 렌더링 시스템 & 프리셋 도형',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: 'SVG 다이어그램 렌더링 시스템 — AI가 생성한 도형을 정확한 SVG로 변환' },
      { type: 'feature', text: '프리셋 기반 도형 시스템 — AI가 좌표 대신 프리셋(직각삼각형, 정삼각형 등)을 선택하여 정확도 향상' },
      { type: 'add', text: '초등 다이어그램 13종: 수직선, 분수원, 분수사각형, 자릿값, 점배열, 순서도 등' },
      { type: 'add', text: '중등 다이어그램 13종: 좌표평면, 원, 삼각형, 사각형, 함수그래프, 벤다이어그램 등' },
      { type: 'improve', text: 'PDF 추출 시 도형/이미지 자동 감지 및 크롭' },
    ],
  },
  // ── 2026-03-13 ──
  {
    date: '2026-03-13',
    title: 'PDF 문제 추출 기능 & 성능 최적화',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: 'PDF 문제 추출 — 수학 문제집 PDF 업로드 → AI가 문제 자동 구조화 → 문제은행 일괄 저장' },
      { type: 'feature', text: '4단계 위자드: 업로드 → 페이지 선택 → AI 추출 미리보기 → 저장' },
      { type: 'add', text: '해설 PDF 별도 업로드 → 문제번호로 정답/풀이 자동 매칭' },
      { type: 'add', text: '페이지 썸네일 그리드 + 전체선택/범위선택' },
      { type: 'improve', text: 'API 병목 30곳 최적화 — DB 쿼리 개선, 불필요한 include 제거' },
      { type: 'improve', text: 'KaTeX 수식 렌더링 전면 적용' },
    ],
  },
  // ── 2026-03-12 ──
  {
    date: '2026-03-12',
    title: '학습지 마법사 & 레벨테스트 보고서 개선',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: '3단계 학습지 마법사 — 교육과정 선택 → 문제 편집 → 설정/저장' },
      { type: 'feature', text: '레벨테스트 보고서 AI 생성 (Claude Haiku)' },
      { type: 'add', text: '보고서 9등급 스케일 평가 기준 추가' },
      { type: 'improve', text: '보고서 폰트/정렬 통일, 레이아웃 개선' },
      { type: 'improve', text: '레벨테스트 계통도 분석 강화 및 멘트 시스템' },
    ],
  },
  {
    date: '2026-03-12',
    title: '숙제 관리 시스템 개편',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: '개념 숙제 + 문제 숙제 시스템 통합' },
      { type: 'feature', text: '연산 숙제 시스템 추가' },
      { type: 'improve', text: '숙제부 그리드 대폭 개선' },
      { type: 'improve', text: '시험 + 레벨테스트 탭 통합, 네비게이션 정리' },
    ],
  },
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
