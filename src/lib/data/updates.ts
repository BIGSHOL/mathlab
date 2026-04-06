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
  // ── 2026-04-06 ──
  {
    date: '2026-04-06',
    title: '이용권 시스템 확장 + 테넌트 데이터 격리 강화 + 사이드바 개선',
    audience: ['admin'],
    entries: [
      { type: 'feature', text: '이용권 3종 추가 — 숙제(HOMEWORK), 학습지(WORKSHEET), 기출분석(EXAM_ANALYSIS) 이용권 신규 등록' },
      { type: 'feature', text: '이용권 관리 2단 분리 — 좌석 기반(학생 기능) + On/Off 기반(선생님 도구) 구분 UI' },
      { type: 'feature', text: 'OWNER 사이드바 — 지점명 표시 + 활성 이용권 기반 네비게이션 자동 필터링' },
      { type: 'feature', text: '선생님 추가 기능 — OWNER가 직접 TEACHER/MANAGER 계정 생성 가능' },
      { type: 'fix', text: '테넌트 데이터 격리 전수 적용 — SA 지점 조회 시 25개 API의 데이터 소속 버그 수정' },
      { type: 'fix', text: '이용권 현황 카드 — 미사용/미등록 항목 자동 숨김 + 아이콘 가시성 개선' },
      { type: 'improve', text: '비밀번호 입력 필드 — 눈 아이콘으로 표시/숨김 전환' },
    ],
  },
  // ── 2026-04-01 ~ 04-03 ──
  {
    date: '2026-04-02',
    title: '기출 분석 블로그 시스템 + Supabase Storage 전환 + 학교 데이터 완성',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: '기출 분석 블로그 글 자동 생성 — AI 기사 작성 + 차트 이미지 생성 + TipTap 리치 에디터' },
      { type: 'feature', text: '네이버 블로그 서식 복사 — SmartEditor ONE 호환 HTML 변환 (차트 이미지 포함)' },
      { type: 'feature', text: '시험지 업로드 Supabase Storage 전환 — 20MB 제한, 삭제 시 파일 자동 정리' },
      { type: 'feature', text: 'SuperAdmin 기출 업로드 관리 페이지 — 전체 시험지 현황 조회/관리' },
      { type: 'feature', text: '능력 영역 레이더 차트 추가 — 유형(5대)+능력(4대) 레이더 차트 동시 지원' },
      { type: 'feature', text: '기출→문제은행 추출 — 분석된 기출 문항을 문제은행에 일괄 저장' },
      { type: 'improve', text: '기출 분석 목록 — 축약형 제목에서 학기 라벨 자동 추출' },
    ],
  },
  {
    date: '2026-04-01',
    title: '주변 학교 그룹 시스템 + 전국 학교 데이터 수집',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: '주변 학교 그룹 시스템 — 같은 구 우선 + 3km 인접 복합 로직으로 자동 구성' },
      { type: 'feature', text: '전국 학교 데이터 6,004개 GPS 좌표 100% 달성 (카카오 키워드 검색 활용)' },
      { type: 'feature', text: '기출 시험지 ↔ School DB 자동 매칭 — 학교명/학년 기반 자동 연결' },
      { type: 'feature', text: '지점별 학교 그룹 커스텀 오버라이드 — 제외/추가 가능' },
      { type: 'add', text: '투자자 데모 시스템 — 3가지 핵심 기능 체험 전용 모드' },
      { type: 'improve', text: 'AI 문제 생성 개선 + 문제은행 테넌트 스코핑' },
    ],
  },
  // ── 2026-03-29 ~ 03-31 ──
  {
    date: '2026-03-30',
    title: '기출 분석 대규모 고도화 — 5대 영역 + 5단계 난이도 + 134개 토픽',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: '5대 교육과정 영역 마이그레이션 — 수와 연산 / 문자와 식 / 함수 / 기하 / 확률과 통계' },
      { type: 'feature', text: '5단계 난이도 체계 — 기본 / 표준 / 응용 / 심화 / 최고난도' },
      { type: 'feature', text: '134개 토픽 1:1 정확 매칭 — 중학교·고등학교 교육과정 소단원 수준 분석' },
      { type: 'feature', text: '8개 확장 분석 에이전트 — 약점, 학습, 시험준비, 예측, 총평, 토픽전략, 점수별계획 에이전트' },
      { type: 'feature', text: 'AI 총평 (CommentarySection) — Claude Sonnet 기반 종합 분석, DB 영구 저장' },
      { type: 'feature', text: '학습 대책 탭 10개 섹션 — 토픽 분석, 킬러패턴, 타임라인, 서술형 대비, 등급별 전략 등' },
      { type: 'improve', text: '기출 분석 UI/UX 대폭 개선 — 차트, 능력 영역, 피드백 신고 시스템' },
    ],
  },
  {
    date: '2026-03-29',
    title: '기출 분석 4단계 통합 — 트렌드 + 패턴 + 분석 + 대시보드',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: '기출 분석 Phase 1~4 통합 — Math Report 프로젝트 완전 이식' },
      { type: 'feature', text: '트렌드 분석 — 연도별 출제 경향 + 대시보드 위젯' },
      { type: 'feature', text: '패턴 시스템 — 빈출 패턴 DB 템플릿 + 인쇄 지원' },
      { type: 'add', text: 'Math Report 원본 교육과정 데이터 ~20,000줄 이식' },
    ],
  },
  // ── 2026-03-27 ──
  {
    date: '2026-03-27',
    title: '간격 반복 복습 시스템 + 인쇄 템플릿 9종 + 모바일 개선',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: '간격 반복(Spaced Repetition) 복습 시스템 — 에빙하우스 망각곡선 기반 자동 복습 스케줄' },
      { type: 'feature', text: '인쇄 템플릿 9종 확장 — default, exam, minimal, csat, classic, notebook, formal, bubble, large' },
      { type: 'feature', text: '개인정보처리방침 + 이용약관 페이지 추가' },
      { type: 'add', text: '망각곡선 1일(즉시복습) 간격 추가 — 재오답 시 3일로 리셋' },
      { type: 'improve', text: '전체 페이지 모바일 반응형 개선' },
    ],
  },
  {
    date: '2026-03-27',
    title: '복습 시스템 도입 — 틀린 문제 자동 복습',
    audience: ['student'],
    entries: [
      { type: 'feature', text: '간격 반복 복습 — 에빙하우스 망각곡선에 따라 틀린 문제가 자동으로 복습 대기열에 추가' },
      { type: 'improve', text: '복습 카드에서 바로 재도전 가능' },
    ],
  },
  // ── 2026-03-26 ──
  {
    date: '2026-03-26',
    title: '빈칸 학습 칩 선택 모드 + 초등 빈칸 237개 일괄 생성 + 학습과정 구조화',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: '빈칸 학습 칩 선택 모드 — 초등학생을 위한 터치 친화적 빈칸 입력 UI (직접 타이핑 대신 보기 칩 선택)' },
      { type: 'feature', text: '학습 과정 생성 구조화 — 교육과정 트리 / 계통 범위 / 자유 선택 3가지 모드로 개념 선택' },
      { type: 'feature', text: '학습 과정 순차/자유 모드 — 순차 모드 시 이전 개념 완료 전까지 다음 개념 잠금' },
      { type: 'feature', text: '학부모용 보고서 페이지 목업 추가' },
      { type: 'add', text: '초등 빈칸 237개 일괄 생성 — 개선된 프롬프트로 고품질 빈칸 추출' },
      { type: 'add', text: '기능 플래그 2종 추가 — AI 빈칸 채점, 음성 읽기 인증' },
      { type: 'improve', text: '개념 콘텐츠 3뷰(미리보기/편집/원본) 렌더링 통일' },
      { type: 'improve', text: '기능 관리 페이지 2단 그리드 레이아웃으로 개선' },
      { type: 'fix', text: '개념 콘텐츠 편집기 개선 + 초등 개념 데이터 정리' },
    ],
  },
  {
    date: '2026-03-26',
    title: '빈칸 학습 개선 — 초등학생 친화 모드',
    audience: ['student'],
    entries: [
      { type: 'feature', text: '빈칸 칩 선택 모드 — 직접 타이핑 대신 보기 칩을 골라서 빈칸 채우기' },
      { type: 'improve', text: '개념 본문 렌더링 품질 향상 — 표, 수식, 마크다운 통일' },
    ],
  },
  // ── 2026-03-25 ──
  {
    date: '2026-03-25',
    title: '반 관리 통합 + 전체 UI 리디자인 + API 페이지네이션',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: '반 관리 + 학습 코스 통합 페이지 — 반별 학생/과정을 한 화면에서 관리' },
      { type: 'feature', text: 'MathRenderer GFM 테이블 지원 — 마크다운 표를 깔끔하게 렌더링' },
      { type: 'feature', text: '목록 API 전체 페이지네이션 적용 — 대량 데이터 효율적 조회' },
      { type: 'improve', text: '전체 디자인 일관성 통일 + 모바일 가독성 개선' },
      { type: 'improve', text: 'PDF 추출 프롬프트 개선 — 더 정확한 문제 구조화' },
      { type: 'fix', text: '학생 스켈레톤 페이지 전면 재검토 + 미사용 v2 삭제' },
      { type: 'fix', text: '랜딩페이지 프로젝트 현황과 일치시킴' },
    ],
  },
  {
    date: '2026-03-25',
    title: '학습 화면 품질 개선',
    audience: ['student'],
    entries: [
      { type: 'improve', text: '학습 페이지 스켈레톤 로딩 전면 재검토 — 더 자연스러운 로딩 화면' },
      { type: 'improve', text: '타임어택 UI 개선' },
      { type: 'fix', text: '다수 UX 수정 및 품질 개선' },
    ],
  },
  // ── 2026-03-24 ──
  {
    date: '2026-03-24',
    title: 'UI 일관성 대규모 개선 — PageContainer 통일, 스켈레톤 표준화, 중복 제거',
    audience: ['admin'],
    entries: [
      { type: 'improve', text: '중앙정렬 페이지 PageContainer 래퍼 통일 — courses, diagnostics, analytics, quiz, licenses, my-tests, subjects 등 15개+ 페이지' },
      { type: 'improve', text: '이용권 관리 페이지 — PageHeader/Button 컴포넌트 적용, rounded-lg→rounded-sm 표준화' },
      { type: 'improve', text: 'analytics/reports 중복 코드 제거 — WEEKDAYS, activityLevel, 정답률 색상 함수 공유 유틸(activity.ts) 추출' },
      { type: 'improve', text: '스켈레톤 로딩 표준화 — licenses, my-tests, 서브 페이지들의 로딩 상태를 Skeleton 컴포넌트로 통일' },
      { type: 'fix', text: 'rounded-lg 혼용 수정 — analytics, reports, licenses 페이지의 rounded-lg를 프로젝트 표준 rounded-sm으로 통일' },
      { type: 'improve', text: '학생 학습 과정 페이지 — PageContainer 래핑 + PageHeader 적용으로 패딩/폭 일관성 확보' },
    ],
  },
  // ── 2026-03-23 ──
  {
    date: '2026-03-23',
    title: '멀티테넌트 권한 체계 정비 — 역할 4단계 정리 + 지점별 데이터 격리',
    audience: ['admin'],
    entries: [
      { type: 'feature', text: '역할 체계 4단계 정리 — STUDENT / TEACHER / OWNER(원장) / SUPER_ADMIN(본사)' },
      { type: 'feature', text: '지점(테넌트) 데이터 격리 — 원장은 자기 지점의 학생/교사/반만 관리 가능' },
      { type: 'fix', text: '학생 등록 시 지점 자동 소속 — 교사가 등록한 학생이 해당 지점에 자동 연결' },
      { type: 'fix', text: '반 관리 테넌트 스코핑 — 반 목록/생성/수정/삭제에 지점 필터 적용' },
      { type: 'fix', text: '학생 배정 보안 — 다른 지점의 반에 학생 배정 시도 시 차단' },
      { type: 'improve', text: '레거시 ADMIN/MANAGER 역할 제거 — 코드 전반에서 사용되지 않던 역할 정리' },
    ],
  },
  // ── 2026-03-19 ──
  {
    date: '2026-03-19',
    title: 'UI/UX 전체 개선 — 스켈레톤 로딩, 애니메이션, AI 보고서 강화',
    audience: ['teacher', 'admin'],
    entries: [
      { type: 'feature', text: '스켈레톤 로딩 UI — 대시보드, 랭킹, 오버뷰 페이지에 로딩 스켈레톤 적용' },
      { type: 'feature', text: 'XP 획득 토스트 알림 — 학습 완료 시 XP 획득량을 실시간 표시' },
      { type: 'feature', text: 'MotionStagger 애니메이션 — 카드/리스트 순차 등장 효과' },
      { type: 'feature', text: '레벨테스트 보고서 AI 전면 전환 — Claude Sonnet 4.6으로 모든 멘트 AI 생성' },
      { type: 'improve', text: 'Claude Haiku 3.5 → 4.5 업그레이드 (보고서 품질 향상)' },
      { type: 'improve', text: 'ProgressBar 애니메이션 강화 (부드러운 진행률 표시)' },
      { type: 'improve', text: 'StatCard 마이크로 인터랙션 추가' },
    ],
  },
  {
    date: '2026-03-19',
    title: '학습 화면 개선 — 스켈레톤 로딩 & XP 알림',
    audience: ['student'],
    entries: [
      { type: 'feature', text: '페이지 로딩 시 스켈레톤 UI 표시 — 빈 화면 대신 로딩 애니메이션' },
      { type: 'feature', text: 'XP 획득 알림 — 학습 완료 시 획득 XP가 토스트로 표시' },
      { type: 'improve', text: '대시보드 카드 순차 등장 애니메이션으로 부드러운 화면 전환' },
      { type: 'improve', text: '진행률 바 애니메이션 개선' },
    ],
  },
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
      { type: 'feature', text: '레벨테스트 보고서 AI 생성' },
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
    title: 'Injaewon MathLAB v1.0 — 62개 연산 유형 지원',
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
export function getUpdatesByRole(role?: string | null): UpdateLog[] {
  if (!role) {
    return ALL_UPDATES.filter((u) => u.audience.includes('public'));
  }
  if (role === 'STUDENT') {
    return ALL_UPDATES.filter((u) => u.audience.includes('student') || u.audience.includes('public'));
  }
  // OWNER/SUPER_ADMIN → 모두 볼 수 있음
  if (role === 'OWNER' || role === 'SUPER_ADMIN') {
    return ALL_UPDATES;
  }
  // TEACHER
  return ALL_UPDATES.filter((u) => u.audience.includes('teacher') || u.audience.includes('public'));
}
