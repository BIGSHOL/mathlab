/**
 * 총평(V3 매거진) 테마 팔레트 — 모듈식 템플릿 1단계.
 *
 * 단일 소스(SoT): 여기서 정의한 토큰이
 *   ① globals.css `.v3-theme-*` 변수 오버라이드
 *   ② 템플릿 편집 UI의 팔레트 스와치
 *   ③ (향후) 서버 사이드 섹션 이미지 렌더러
 * 세 곳에서 동일하게 쓰인다.
 *
 * ⚠️ 캡처 안전 규칙 (총평은 modern-screenshot `domToPng` 로 PNG 캡처되어 블로그에 붙는다):
 *   - 색상은 **hex 리터럴만** 사용. `oklch()` / `color-mix()` / `lab()` 금지.
 *     html2canvas 계열 파서가 해석하지 못해 캡처가 검게/투명하게 깨진다.
 *   - 폰트를 테마별로 바꾸려면 캡처 경로에 `document.fonts.ready` 대기가 먼저 필요하다
 *     (AnalysisDetail::handleCopyNaverImages — 현재는 `waitForImages` 만 있음).
 *     그래서 1단계 테마는 **색상만** 교체하고 폰트는 4종 공통으로 둔다.
 */

/** 테마가 제공하는 색상 토큰 (globals.css `--v3-*` 와 1:1) */
export interface CommentaryThemeColors {
  /** 강조 — 키커/섹션번호/데이터박스 보더/결론 라벨/하락 지표 */
  accent: string;
  /** 포인트 — KPI 1번/거대 숫자/다크 배경 위 강조 */
  gold: string;
  /** 긍정 — KPI 4번/상승 지표 */
  pos: string;
  /** 헤딩·최진한 텍스트 */
  ink: string;
  /** 다크 서페이스 배경 (KPI 행/피처 박스) — ink 와 의도적으로 분리 */
  surfaceDark: string;
  /** 다크 배경 위 제목 텍스트 */
  onDark: string;
  /** 다크 배경 위 본문 텍스트 */
  onDarkSoft: string;
  /** 본문 */
  body: string;
  /** 덱·보조 본문 */
  bodySoft: string;
  /** 라벨·캡션 */
  muted: string;
  /** 기본 배경 */
  paper: string;
  /** 박스 배경 */
  paperAlt: string;
  /** 푸터 배경 */
  paperFoot: string;
  /** 구분선 */
  line: string;
  /** 약한 구분선 */
  lineSoft: string;
  /** 결론 박스 배경 */
  conclusionBg: string;
  /** 인용구 상하 라인 */
  quoteLine: string;
  /** 다크 서페이스 위 구분선 (KPI 컬럼 사이) */
  darkLine: string;
  /** 거대 숫자 글로우 (rgba — `color-mix` 금지 규칙 때문에 테마마다 직접 명시) */
  goldGlow: string;
  /**
   * 난이도 5단계 램프 (L1 차분 → L5 최고난도 경보) — 스택바·문항수 grid·도트·표 배지 공용.
   * 설계 원칙: 1~3단계 = 테마 조화색(차분한 진행), 4~5단계 = 열기 상승(골드·액센트 계열).
   * 검증: 각 단계 vs paperAlt(트랙) ≥ 2.8:1, vs onDark(스택바 % 라벨) ≥ 2.8:1, 인접 단계 RGB 거리 ≥ 45.
   * 소비처: v3/helpers.tsx V3_DIFF_COLORS(= var(--v3-diff-N)) · naver-v3-renderer(hex 직참조).
   */
  diff: [string, string, string, string, string];
}

export interface CommentaryTheme {
  id: string;
  label: string;
  /** 편집 UI 설명 */
  description: string;
  /** 스와치 미리보기용 대표 3색 (accent / surfaceDark / gold) */
  colors: CommentaryThemeColors;
}

/** NYT Science 톤 — 기존 V3 기본값. 값 변경 시 기존 분석본 캡처와 달라지므로 주의. */
const NYT: CommentaryThemeColors = {
  accent: '#BF1722',
  gold: '#FFA940',
  pos: '#2F7B3A',
  ink: '#121212',
  surfaceDark: '#121212',
  onDark: '#FFFFFF',
  onDarkSoft: '#DDDDDD',
  body: '#2A2A2A',
  bodySoft: '#444444',
  muted: '#888888',
  paper: '#FFFFFF',
  paperAlt: '#F8F8F8',
  paperFoot: '#FAFAFA',
  line: '#DDDDDD',
  lineSoft: '#EEEEEE',
  conclusionBg: '#FFF8E0',
  quoteLine: '#121212',
  darkLine: '#333333',
  goldGlow: 'rgba(255, 169, 64, 0.25)',
  diff: ['#2F7B3A', '#6F9C76', '#888888', '#DA8B2C', '#BF1722'], // 기존 시안 확정값 그대로 (캡처 호환)
};

/** 매스랩 브랜드 블루 — 서비스 primary(#135bec) 계열. 학원 자료와 톤 일치. */
const BRAND: CommentaryThemeColors = {
  accent: '#135BEC',
  gold: '#F59E0B',
  pos: '#0F766E',
  ink: '#0F172A',
  surfaceDark: '#0F172A',
  onDark: '#FFFFFF',
  onDarkSoft: '#CBD5E1',
  body: '#1E293B',
  bodySoft: '#475569',
  muted: '#627794',
  paper: '#FFFFFF',
  paperAlt: '#F6F8FC',
  paperFoot: '#F8FAFC',
  line: '#D8E0EC',
  lineSoft: '#EAEFF6',
  conclusionBg: '#EFF5FF',
  quoteLine: '#0F172A',
  darkLine: '#1E293B',
  goldGlow: 'rgba(245, 158, 11, 0.25)',
  diff: ['#0F766E', '#4C7CB0', '#6B7280', '#C2700B', '#B01B2E'], // 틸→스틸블루→슬레이트→앰버→크림슨
};

/** 미니멀 모노 — 색을 거의 쓰지 않는 정갈한 흑백. 문자 정보 밀도가 높은 시험지에 어울림. */
const MONO: CommentaryThemeColors = {
  accent: '#1A1A1A',
  gold: '#8A8A8A',
  pos: '#3F3F3F',
  ink: '#0A0A0A',
  surfaceDark: '#1A1A1A',
  onDark: '#FFFFFF',
  onDarkSoft: '#C8C8C8',
  body: '#2E2E2E',
  bodySoft: '#525252',
  muted: '#757575',
  paper: '#FFFFFF',
  paperAlt: '#F5F5F5',
  paperFoot: '#FAFAFA',
  line: '#D4D4D4',
  lineSoft: '#E8E8E8',
  conclusionBg: '#F2F2F2',
  quoteLine: '#0A0A0A',
  darkLine: '#3A3A3A',
  goldGlow: 'rgba(138, 138, 138, 0.22)',
  diff: ['#8F8F8F', '#6E6E6E', '#4E4E4E', '#2E2E2E', '#0A0A0A'], // 명도 단조 하강 — 킬러=흑
};

/** 세피아 에디토리얼 — 따뜻한 크림 지면. 인쇄물/학부모 배포 느낌. */
const SEPIA: CommentaryThemeColors = {
  accent: '#9A3412',
  gold: '#D97706',
  pos: '#4D7C0F',
  ink: '#292524',
  surfaceDark: '#292524',
  onDark: '#FDFBF7',
  onDarkSoft: '#D6D3D1',
  body: '#3F3A36',
  bodySoft: '#57534E',
  muted: '#7B746F',
  paper: '#FFFDF8',
  paperAlt: '#F7F3EA',
  paperFoot: '#F5F1E8',
  line: '#E0D8C8',
  lineSoft: '#EDE7DA',
  conclusionBg: '#FDF3D8',
  quoteLine: '#292524',
  darkLine: '#44403C',
  goldGlow: 'rgba(217, 119, 6, 0.25)',
  diff: ['#4D7C0F', '#7D815A', '#6B5844', '#B45309', '#8A2508'], // 올리브→세이지→브라운→앰버→딥러스트
};

/* ── 컬러 확장 7종 (2026-07-28) — "전부 검다" 피드백 대응.
   웹 리서치(FT 살몬지 #FFF1E5 · 이코노미스트 인쇄지면 #D5E4EB · 교육 팔레트 실측값) 기반으로
   surfaceDark 를 순흑 대신 유채색 딥톤으로, paper 를 틴트 지면으로 설계.
   대비는 WCAG 최저선이 아닌 **강화 기준**으로 검증 (hue 보존, 명도만 정밀 조정):
   헤딩 12:1 · 본문 10:1 · 보조본문 6.5:1 · 라벨 4.5:1 · 다크 위 제목 8.5:1(AAA 상회) ·
   다크 위 보조 6:1 · KPI 골드 4.5:1 · 막대 fill↔트랙 8:1. 검증 스크립트: 세션 스크래치 tune-contrast.mjs 패턴. ── */

/** FT 살몬지 — 살몬 핑크 종이 + 슬레이트 잉크 + 클라레·딥틸 포인트. FT 실측 틴트 사다리. */
const SALMON: CommentaryThemeColors = {
  accent: '#990F3D',
  gold: '#F5A73B',
  pos: '#067A42',
  ink: '#262A33',
  surfaceDark: '#084C57',
  onDark: '#FFFAF5',
  onDarkSoft: '#BCD9DC',
  body: '#33383F',
  bodySoft: '#50565F',
  muted: '#766E64',
  paper: '#FFF1E5',
  paperAlt: '#F6E9D8',
  paperFoot: '#F0E2CE',
  line: '#E4D5C2',
  lineSoft: '#EFE3D2',
  conclusionBg: '#F2DFCE',
  quoteLine: '#990F3D',
  darkLine: '#146877',
  goldGlow: 'rgba(245, 167, 59, 0.25)',
  diff: ['#0A6E5C', '#22808A', '#7E7466', '#B36A00', '#990F3D'], // FT 틸 진행 → 클라레 킬러
};

/** 이코노미스트 인쇄지면 — 페일 블루그레이 지면 + 딥페트롤. 검정 없이 경제지급 진지함. */
const SKY: CommentaryThemeColors = {
  accent: '#BC412D',
  gold: '#F5B83D',
  pos: '#00766C',
  ink: '#0A2C3D',
  surfaceDark: '#01485E',
  onDark: '#F7FBFC',
  onDarkSoft: '#ACCEDA',
  body: '#123B4D',
  bodySoft: '#395665',
  muted: '#57707D',
  paper: '#E9F1F5',
  paperAlt: '#DCE9EF',
  paperFoot: '#D5E4EB',
  line: '#BCD2DC',
  lineSoft: '#CFE0E8',
  conclusionBg: '#DCEDEA',
  quoteLine: '#BC412D',
  darkLine: '#14607A',
  goldGlow: 'rgba(245, 184, 61, 0.25)',
  diff: ['#00766C', '#2C7FB8', '#5E7E93', '#B57F00', '#BC412D'], // 이코노미스트 페트롤·블루 → 레드 킬러
};

/** 딥틸 — 아이보리 지면 + 청록 서페이스 + 번트오렌지 강조. 성장 서사·네이버 크롬과 조화. */
const TEAL: CommentaryThemeColors = {
  accent: '#B65800',
  gold: '#F6AE2D',
  pos: '#1B805F',
  ink: '#0A2E36',
  surfaceDark: '#004B5B',
  onDark: '#F7FCFD',
  onDarkSoft: '#B8DDE3',
  body: '#1F3D44',
  bodySoft: '#425D64',
  muted: '#63777B',
  paper: '#FDFBF4',
  paperAlt: '#F3F0E4',
  paperFoot: '#EFEDE0',
  line: '#DCD8C6',
  lineSoft: '#E9E6D7',
  conclusionBg: '#E2F0F0',
  quoteLine: '#B65800',
  darkLine: '#1B7487',
  goldGlow: 'rgba(246, 174, 45, 0.25)',
  diff: ['#1B805F', '#256E8C', '#5E7378', '#B06A00', '#A62B1B'], // 그린→블루틸→그레이틸→번트앰버→벽돌
};

/** 포레스트 — 딥그린 서페이스 + 라즈베리·허니골드. 에그셸 바탕의 킨포크풍 잡지 톤. */
const FOREST: CommentaryThemeColors = {
  accent: '#C93A56',
  gold: '#F0B429',
  pos: '#1C7B53',
  ink: '#183227',
  surfaceDark: '#1E4D3B',
  onDark: '#FCFBF8',
  onDarkSoft: '#BED3C6',
  body: '#303E37',
  bodySoft: '#4E5952',
  muted: '#697366',
  paper: '#F7F4EC',
  paperAlt: '#EFEADC',
  paperFoot: '#E9E3D2',
  line: '#DDD6C2',
  lineSoft: '#EAE4D2',
  conclusionBg: '#EAF0E4',
  quoteLine: '#C93A56',
  darkLine: '#35624E',
  goldGlow: 'rgba(240, 180, 41, 0.25)',
  diff: ['#1C7B53', '#4E7A58', '#857A58', '#A97710', '#C93A56'], // 그린→세이지→카키→허니→라즈베리
};

/** 테라코타 — 러스트 서페이스 + 웜 크림 지면. 세피아보다 밝고 생기 있는 웜톤. */
const TERRACOTTA: CommentaryThemeColors = {
  accent: '#C2492E',
  gold: '#F9A03F',
  pos: '#327C52',
  ink: '#3B2A21',
  surfaceDark: '#772B1D',
  onDark: '#FEF9F6',
  onDarkSoft: '#EBC5B4',
  body: '#46362E',
  bodySoft: '#64534A',
  muted: '#7F6D5D',
  paper: '#FBF5ED',
  paperAlt: '#F5EADB',
  paperFoot: '#EFE2D0',
  line: '#E8D7C3',
  lineSoft: '#F2E6D6',
  conclusionBg: '#F9E9DA',
  quoteLine: '#C2492E',
  darkLine: '#9A4530',
  goldGlow: 'rgba(249, 160, 63, 0.25)',
  diff: ['#3E7C4A', '#9C8032', '#7C6553', '#B4590E', '#8E2812'], // 그린→오커→타우프→번트오렌지→딥러스트
};

/** 버건디 — 와인 서페이스 + 블러시 지면. 프리미엄 매거진 톤. */
const BURGUNDY: CommentaryThemeColors = {
  accent: '#A0143C',
  gold: '#EFAF3F',
  pos: '#207D63',
  ink: '#57122B',
  surfaceDark: '#6D1A36',
  onDark: '#FDF1E8',
  onDarkSoft: '#E8C3CD',
  body: '#443037',
  bodySoft: '#675258',
  muted: '#83696F',
  paper: '#FBF3EE',
  paperAlt: '#F6E7DE',
  paperFoot: '#F1DED3',
  line: '#E9D3C8',
  lineSoft: '#F3E4DB',
  conclusionBg: '#F7E4E0',
  quoteLine: '#A0143C',
  darkLine: '#8A3350',
  goldGlow: 'rgba(239, 175, 63, 0.25)',
  diff: ['#207D63', '#71805F', '#927082', '#A9731E', '#A0143C'], // 그린→세이지→모브→골드→와인
};

/**
 * 터미널 — 유일한 다크 테마.
 *
 * 나머지 팔레트는 전부 밝은 지면(잡지)이다. 원장 계기판은 숫자 가독성이 최우선이라
 * paper 를 어둡게, ink/body 를 밝게 뒤집는다. 난이도 램프는 트랙(paperAlt)과
 * 스택바 라벨(onDark) 양쪽에서 2.8:1 을 동시에 맞춰야 해서 중간 명도대만 쓴다
 * (너무 밝으면 흰 글씨가, 너무 어두우면 트랙이 삼킨다).
 */
const TERMINAL: CommentaryThemeColors = {
  accent: '#3DDC97',
  gold: '#E8B84A',
  pos: '#4ADE80',
  ink: '#E8EEF4',
  surfaceDark: '#080B0E',
  onDark: '#F4F7FA',
  onDarkSoft: '#C5CDD6',
  body: '#C9D2DC',
  bodySoft: '#A3ADB8',
  muted: '#8A94A0',
  paper: '#0C1014',
  paperAlt: '#151B22',
  paperFoot: '#10151A',
  line: '#2A3340',
  lineSoft: '#1E2630',
  conclusionBg: '#14201A',
  quoteLine: '#3DDC97',
  darkLine: '#2A3340',
  goldGlow: 'rgba(232, 184, 74, 0.28)',
  // L1 그린 → L3 슬레이트 → L5 레드. vs paperAlt ≥ 3.18, vs onDark ≥ 3.24, 인접 RGB ≥ 75
  diff: ['#1F8A58', '#2A78B0', '#6E7886', '#C07A12', '#C4332A'],
};

/**
 * 칠판 — 두 번째 다크 테마. 터미널이 계기판이라면 이건 **수업 직후의 판서**다.
 *
 * 분필 톤(흰빛이 도는 회색)을 본문에, 노란 분필을 강조로. 터미널(청록 계기판)과
 * 겹치지 않게 초록 지면 + 따뜻한 강조로 갈랐다.
 * 난이도 램프는 **라벨을 지면색(어두움)으로 뒤집는 전제**로 골랐다 — globals.css 의
 * 다크 테마 라벨 보정 참조. 흰 라벨을 유지하려면 L4 가 2.76 까지 떨어져 기준(2.8)에
 * 걸리고, 그걸 맞추려면 심화 단계가 탁한 올리브가 되어 의미가 흐려진다.
 * 현재 값: 트랙(paperAlt) 대비 3.02~4.49, 지면색 라벨 대비 3.43~5.11.
 */
const CHALKBOARD: CommentaryThemeColors = {
  accent: '#F2C14E',
  gold: '#F2C14E',
  pos: '#7FBF6A',
  ink: '#F0EDE4',
  surfaceDark: '#101A14',
  onDark: '#FAF8F2',
  onDarkSoft: '#D6D2C4',
  body: '#DAD6C8',
  bodySoft: '#B8B4A6',
  muted: '#8E9A8C',
  paper: '#1B2A22',
  paperAlt: '#22342A',
  paperFoot: '#18261E',
  line: '#3A4E42',
  lineSoft: '#2C3E34',
  conclusionBg: '#243A2C',
  quoteLine: '#F2C14E',
  darkLine: '#3A4E42',
  goldGlow: 'rgba(242, 193, 78, 0.26)',
  diff: ['#4E9E5F', '#5C8FB0', '#8A93A0', '#C98A2B', '#C05A4A'],
};

/** 플럼 — 딥플럼 서페이스 + 마젠타 강조. 아이보리 바탕의 개성파 에디토리얼. */
const PLUM: CommentaryThemeColors = {
  accent: '#8E2F62',
  gold: '#F5B841',
  pos: '#2A8152',
  ink: '#3B2140',
  surfaceDark: '#4A2545',
  onDark: '#FAF3EA',
  onDarkSoft: '#D9C3D4',
  body: '#43384A',
  bodySoft: '#5E5464',
  muted: '#796C80',
  paper: '#FAF7F2',
  paperAlt: '#F2ECE2',
  paperFoot: '#EDE4DA',
  line: '#E4DACE',
  lineSoft: '#EFE7DC',
  conclusionBg: '#F4EAF1',
  quoteLine: '#8E2F62',
  darkLine: '#6A4064',
  goldGlow: 'rgba(245, 184, 65, 0.25)',
  diff: ['#2A8152', '#647B6C', '#857393', '#A67718', '#8E2F62'], // 그린→세이지그레이→그레이플럼→골드→마젠타
};

export const COMMENTARY_THEMES: CommentaryTheme[] = [
  { id: 'nyt', label: 'NYT', description: '검정·레드·황색 매거진 톤 (기본)', colors: NYT },
  { id: 'brand', label: '브랜드', description: '매스랩 블루 계열 — 학원 자료와 통일', colors: BRAND },
  { id: 'mono', label: '미니멀', description: '흑백 위주 — 정보 밀도 높은 시험지에 적합', colors: MONO },
  { id: 'sepia', label: '크림', description: '따뜻한 세피아 지면 — 학부모 배포용', colors: SEPIA },
  { id: 'salmon', label: '살몬지', description: 'FT 핑크 지면 + 클라레·딥틸 — 따뜻한 경제지 톤', colors: SALMON },
  { id: 'sky', label: '스카이', description: '페일 블루 지면 + 딥페트롤 — 검정 없는 진지함', colors: SKY },
  { id: 'teal', label: '딥틸', description: '아이보리 지면 + 청록·번트오렌지 — 명료한 성장 톤', colors: TEAL },
  { id: 'forest', label: '포레스트', description: '딥그린·라즈베리·허니골드 — 킨포크풍 잡지 톤', colors: FOREST },
  { id: 'terracotta', label: '테라코타', description: '러스트·웜크림 — 세피아보다 밝은 생기 웜톤', colors: TERRACOTTA },
  { id: 'burgundy', label: '버건디', description: '블러시 지면 + 와인 버건디 — 프리미엄 매거진 톤', colors: BURGUNDY },
  { id: 'plum', label: '플럼', description: '아이보리 지면 + 딥플럼·골드 — 개성파 프레스티지 톤', colors: PLUM },
  { id: 'terminal', label: '터미널', description: '다크 계기판 — 모노스페이스·숫자 우선', colors: TERMINAL },
  { id: 'chalkboard', label: '칠판', description: '초록 칠판 + 분필 — 수업 직후 판서 톤', colors: CHALKBOARD },
];

export const DEFAULT_THEME_ID = 'nyt';

export function getCommentaryTheme(id: string | null | undefined): CommentaryTheme {
  return COMMENTARY_THEMES.find((t) => t.id === id) ?? COMMENTARY_THEMES[0];
}

/** 테마 → `.v3` 루트에 붙일 클래스명. 기본 테마는 클래스 없음(= :root 기본값 사용). */
export function themeClassName(id: string | null | undefined): string {
  const t = getCommentaryTheme(id);
  return t.id === DEFAULT_THEME_ID ? '' : `v3-theme-${t.id}`;
}

/** CSS 변수 선언 블록 생성 (globals.css 생성 스크립트 / 인라인 style 양쪽에서 사용) */
export function themeCssVars(colors: CommentaryThemeColors): Record<string, string> {
  return {
    '--v3-accent': colors.accent,
    '--v3-gold': colors.gold,
    '--v3-pos': colors.pos,
    '--v3-ink': colors.ink,
    '--v3-surface-dark': colors.surfaceDark,
    '--v3-on-dark': colors.onDark,
    '--v3-on-dark-soft': colors.onDarkSoft,
    '--v3-body': colors.body,
    '--v3-body-soft': colors.bodySoft,
    '--v3-muted': colors.muted,
    '--v3-paper': colors.paper,
    '--v3-paper-alt': colors.paperAlt,
    '--v3-paper-foot': colors.paperFoot,
    '--v3-line': colors.line,
    '--v3-line-soft': colors.lineSoft,
    '--v3-conclusion-bg': colors.conclusionBg,
    '--v3-quote-line': colors.quoteLine,
    '--v3-dark-line': colors.darkLine,
    '--v3-gold-glow': colors.goldGlow,
    '--v3-diff-1': colors.diff[0],
    '--v3-diff-2': colors.diff[1],
    '--v3-diff-3': colors.diff[2],
    '--v3-diff-4': colors.diff[3],
    '--v3-diff-5': colors.diff[4],
  };
}
