/**
 * 총평 레이아웃(골격) — 모듈식 템플릿의 **세 번째 축**.
 *
 * 왜 필요했나: 테마(색) + 블록 variant(같은 DOM의 CSS 미세조정) 만으로는
 * 프리셋을 아무리 조합해도 "같은 문서"로 읽혔다. 사람이 지면을 볼 때 가장 먼저 인식하는 건
 * **타이포그래피와 여백 리듬**인데 그게 하나로 고정돼 있었기 때문.
 *
 * 그래서 레이아웃은 클래스 몇 개짜리 오버라이드가 아니라 **완전한 디자인 토큰 세트**를 소유한다.
 * 서체 4역할 · 타입 스케일 · 여백 · 모서리 · 괘선 두께를 전부 갈아끼우므로,
 * 색이 같아도 다른 문서로 읽힌다.
 *
 *   테마    = 팔레트   (--v3-accent, --v3-ink …)
 *   레이아웃 = 골격+활자 (--v3-font-*, --v3-h1-size, --v3-gutter …)  ← 여기
 *   variant = 블록별 표현
 *   문체    = 지면 고정 문구
 * 넷은 직교한다.
 *
 * ## 새 골격 추가하는 법 (비용: 10~15분)
 *   1) 여기에 `mk({...})` 로 토큰 오버라이드 + group/label/description/traits 추가
 *   2) `npx tsx scripts/generate-commentary-theme-css.ts` 실행 (토큰 CSS 자동 생성)
 *   3) globals.css "V3 레이아웃 크롬" 절에 구조 CSS 10~25줄 추가 (테두리·섹션번호 배치·다단 등)
 *   토큰이 활자·여백을 전부 담당하므로 3)은 '토큰으로 표현 불가능한 구조'만 쓰면 된다.
 *
 * ⚠️ 캡처 제약: `.v3` 의 **최상위 자식 = 블로그 이미지 1장**.
 *    루트를 다단(grid/column)으로 만들면 캡처가 반쪽 이미지가 된다. 다단은 블록 '내부'에서만.
 * ⚠️ 서체는 (teacher)/layout.tsx 가 로드하는 CSS 변수만 사용할 것.
 *    새 서체를 쓰려면 거기 먼저 추가해야 하고, 캡처 전 document.fonts.ready 대기가 필요하다.
 */

export interface CommentaryLayoutTokens {
  /** 제목 서체 (h1·h2·h3·인용구) */
  fontHead: string;
  /** 본문 서체 (p) */
  fontBody: string;
  /** 라벨·캡션·메타 서체 */
  fontLabel: string;
  /** 숫자 서체 (KPI·거대숫자·섹션번호) */
  fontNum: string;

  h1Size: string;
  h1Weight: string;
  h1LineHeight: string;
  h1Spacing: string;
  h3Size: string;
  h3Weight: string;
  dekSize: string;
  bodySize: string;
  bodyLineHeight: string;
  kpiSize: string;
  /** 피처 박스 거대 숫자 */
  heroNum: string;
  /** 섹션 번호 */
  secNum: string;

  /** 좌우 여백 */
  gutter: string;
  /** 섹션 상하 여백 */
  sectionY: string;
  /** 모서리 반경 */
  radius: string;
  /** 괘선 기본 두께 */
  rule: string;
}

/**
 * 계량 위젯(Q&A 데이터 박스·난이도 막대)의 **표현 패밀리**.
 *
 * 왜 별도 축인가: 서체·여백만 바꾸면 지면 절반을 차지하는 카운트 막대가 그대로라
 * "같은 문서"로 읽힌다(사용자 피드백 2026-07-23). 골격마다 계량 그래프가
 * 구조적으로 갈라져야 비로소 다른 템플릿으로 보인다.
 *
 *   blocks : 둥근 사각 칸 (기본)
 *   dots   : 원형 점 — 캐주얼·부드러움
 *   ticks  : 얇고 높은 세로 눈금 — 신문·장부
 *   slabs  : 굵고 붙은 블록 — 포스터·브루탈
 *   hollow : 빈 칸은 테두리, 채운 칸만 solid — 도면·매뉴얼
 *   rule   : 막대 제거, 괘선 + 숫자만 — 학술·공문
 *   spark  : 아주 얇은 라인 — 타이프라이터·압축
 *   stack  : 칸 구분 없는 연속 비율 막대 — 노트·미니멀
 *
 * CSS 는 globals.css "V3 데이터 표현(viz)" 절. 컴포넌트 DOM 은 공통이고
 * 루트의 `v3-viz-*` 클래스만으로 갈린다 → 캡처(DOM→PNG) 안전.
 */
export type VizFamily =
  | 'blocks' | 'dots' | 'ticks' | 'slabs' | 'hollow' | 'rule' | 'spark' | 'stack';

export interface CommentaryLayout {
  id: string;
  label: string;
  description: string;
  /** 미리보기 카드용 한 줄 특징 */
  traits: string;
  /** 편집 UI 그룹 (24종이 넘어 평면 나열이 어려움) */
  group: string;
  /** 계량 위젯 표현 패밀리 */
  viz: VizFamily;
  tokens: CommentaryLayoutTokens;
}

// ── 서체 변수 — (teacher)/layout.tsx + 루트 layout.tsx 에서 로드 ──
const SERIF = "var(--font-serif-kr, 'Noto Serif KR', serif)";
const SANS = "var(--font-display, 'Pretendard Variable', sans-serif)";
const ABRIL = "var(--font-abril, 'Abril Fatface', serif)";
const BODONI = "var(--font-bodoni, 'Bodoni Moda', serif)";
const SONG = "var(--font-song-myung, 'Song Myung', serif)";
const PLEX = "var(--font-plex-kr, 'IBM Plex Sans KR', sans-serif)";
const HAN = "var(--font-black-han, 'Black Han Sans', sans-serif)";
const GOWUN = "var(--font-gowun, 'Gowun Dodum', sans-serif)";
const MYEONGJO = "var(--font-nanum-myeongjo, 'Nanum Myeongjo', serif)";
const MONO = "var(--font-nanum-coding, 'Nanum Gothic Coding', monospace)";
const GOTHIC = "var(--font-gothic-a1, 'Gothic A1', sans-serif)";
const DOHYEON = "var(--font-do-hyeon, 'Do Hyeon', sans-serif)";

/** 기본값 = 매거진. 나머지 골격은 여기서 필요한 것만 덮어쓴다. */
const BASE: CommentaryLayoutTokens = {
  fontHead: SERIF, fontBody: SERIF, fontLabel: SANS, fontNum: ABRIL,
  h1Size: '48px', h1Weight: '700', h1LineHeight: '1.15', h1Spacing: '-0.01em',
  h3Size: '28px', h3Weight: '700', dekSize: '18px',
  bodySize: '17px', bodyLineHeight: '1.85',
  kpiSize: '36px', heroNum: '180px', secNum: '60px',
  gutter: '64px', sectionY: '40px', radius: '10px', rule: '1px',
};
const mk = (o: Partial<CommentaryLayoutTokens>): CommentaryLayoutTokens => ({ ...BASE, ...o });

type Def = Omit<CommentaryLayout, 'tokens' | 'viz'> & { tokens: CommentaryLayoutTokens };

const DEFS: Def[] = [
  // ── 에디토리얼 ──
  {
    id: 'magazine', label: '매거진', group: '에디토리얼',
    description: '대형 명조 헤드라인 · 넓은 여백 · 거대 섹션 번호',
    traits: '명조 / 넓은 여백 / 낮은 밀도',
    tokens: BASE,
  },
  {
    id: 'journal', label: '저널', group: '에디토리얼',
    description: '명조 디스플레이 · 본문 2단 · 드롭캡',
    traits: '2단 본문 / 드롭캡 / 고전적',
    tokens: mk({ fontHead: SONG, fontBody: MYEONGJO, h1Size: '42px', h1Weight: '400', h1LineHeight: '1.2',
      h3Size: '24px', h3Weight: '400', bodySize: '15px', bodyLineHeight: '1.8', secNum: '48px',
      gutter: '58px', sectionY: '34px', radius: '0px' }),
  },
  {
    id: 'tabloid', label: '타블로이드', group: '에디토리얼',
    description: '초굵은 헤드라인 + 촘촘한 본문 · 대비 극대',
    traits: '초굵은 제목 / 촘촘한 본문',
    tokens: mk({ fontHead: HAN, fontBody: GOTHIC, fontNum: HAN, h1Size: '56px', h1Weight: '400',
      h1LineHeight: '1.03', h1Spacing: '-0.03em', h3Size: '30px', h3Weight: '400',
      bodySize: '14px', bodyLineHeight: '1.62', kpiSize: '40px', heroNum: '170px', secNum: '70px',
      gutter: '42px', sectionY: '24px', radius: '0px', rule: '2px' }),
  },
  {
    id: 'poster', label: '포스터', group: '에디토리얼',
    description: '초대형 활자 · 색 면 강조 · 여백 최소',
    traits: '초대형 활자 / 색 면 / 강렬',
    tokens: mk({ fontHead: HAN, fontBody: SANS, fontNum: HAN, h1Size: '78px', h1Weight: '400',
      h1LineHeight: '0.98', h1Spacing: '-0.04em', h3Size: '38px', h3Weight: '400', dekSize: '19px',
      bodySize: '16px', bodyLineHeight: '1.68', kpiSize: '52px', heroNum: '240px', secNum: '110px',
      gutter: '44px', sectionY: '38px', radius: '0px', rule: '4px' }),
  },
  {
    id: 'billboard', label: '빌보드', group: '에디토리얼',
    description: '섹션마다 전면 색 띠 · 큰 산세리프',
    traits: '색 띠 헤더 / 큰 산세리프',
    tokens: mk({ fontHead: GOTHIC, fontBody: SANS, fontNum: GOTHIC, h1Size: '52px', h1Weight: '900',
      h1LineHeight: '1.08', h1Spacing: '-0.03em', h3Size: '26px', h3Weight: '900',
      bodySize: '16px', bodyLineHeight: '1.75', kpiSize: '42px', heroNum: '190px', secNum: '54px',
      gutter: '48px', sectionY: '34px', radius: '0px', rule: '2px' }),
  },
  {
    id: 'zine', label: '진', group: '에디토리얼',
    description: '캐주얼 디스플레이 · 비대칭 · 거친 대비',
    traits: '캐주얼 / 비대칭 / 거친 톤',
    tokens: mk({ fontHead: DOHYEON, fontBody: GOTHIC, fontNum: DOHYEON, h1Size: '50px', h1Weight: '400',
      h1LineHeight: '1.12', h3Size: '27px', h3Weight: '400', bodySize: '15px', bodyLineHeight: '1.72',
      kpiSize: '38px', heroNum: '175px', secNum: '76px', gutter: '46px', sectionY: '32px',
      radius: '0px', rule: '3px' }),
  },

  // ── 신문·간행물 ──
  {
    id: 'newspaper', label: '신문', group: '신문·간행물',
    description: '명조 디스플레이 마스트헤드 · 본문 2단 조판 · 고밀도',
    traits: '2단 본문 / 괘선 강조 / 최고 밀도',
    tokens: mk({ fontHead: SONG, h1Size: '46px', h1Weight: '400', h1LineHeight: '1.08', h1Spacing: '-0.02em',
      h3Size: '22px', h3Weight: '400', dekSize: '15px', bodySize: '14.5px', bodyLineHeight: '1.72',
      kpiSize: '30px', heroNum: '120px', gutter: '44px', sectionY: '22px', radius: '0px' }),
  },
  {
    id: 'gazette', label: '관보', group: '신문·간행물',
    description: '이중 테두리 · 중앙 정렬 · 고전 명조',
    traits: '이중 테두리 / 중앙 정렬 / 격식',
    tokens: mk({ fontHead: MYEONGJO, fontBody: MYEONGJO, h1Size: '38px', h1Weight: '800',
      h1LineHeight: '1.25', h1Spacing: '0em', h3Size: '21px', h3Weight: '800', dekSize: '15px',
      bodySize: '15px', bodyLineHeight: '1.85', kpiSize: '30px', heroNum: '124px', secNum: '40px',
      gutter: '56px', sectionY: '30px', radius: '0px', rule: '1px' }),
  },
  {
    id: 'academic', label: '학술지', group: '신문·간행물',
    description: '좁은 단 · 절제된 괘선 · 각주 톤',
    traits: '좁은 단 / 절제 / 학술',
    tokens: mk({ fontHead: MYEONGJO, fontBody: MYEONGJO, fontNum: SERIF, h1Size: '31px', h1Weight: '700',
      h1LineHeight: '1.35', h1Spacing: '0em', h3Size: '19px', h3Weight: '700', dekSize: '14px',
      bodySize: '14px', bodyLineHeight: '1.9', kpiSize: '26px', heroNum: '96px', secNum: '28px',
      gutter: '80px', sectionY: '32px', radius: '0px' }),
  },
  {
    id: 'broadsheet', label: '대판', group: '신문·간행물',
    description: '큰 지면 감각 · 넓은 단 · 세리프 본문',
    traits: '넓은 단 / 큰 지면 / 세리프',
    tokens: mk({ fontHead: SONG, fontBody: SERIF, h1Size: '58px', h1Weight: '400', h1LineHeight: '1.05',
      h1Spacing: '-0.025em', h3Size: '25px', h3Weight: '400', dekSize: '17px',
      bodySize: '15.5px', bodyLineHeight: '1.75', kpiSize: '34px', heroNum: '150px', secNum: '64px',
      gutter: '52px', sectionY: '28px', radius: '0px' }),
  },

  // ── 문서·실무 ──
  {
    id: 'report', label: '리포트', group: '문서·실무',
    description: '전면 기술 산세리프 · 번호 배지 · 공식 문서 톤',
    traits: '산세리프 일관 / 번호 배지 / 중간 밀도',
    tokens: mk({ fontHead: PLEX, fontBody: PLEX, fontLabel: PLEX, fontNum: PLEX,
      h1Size: '30px', h1Weight: '700', h1LineHeight: '1.25', h1Spacing: '-0.02em',
      h3Size: '18px', h3Weight: '700', dekSize: '14px', bodySize: '14px', bodyLineHeight: '1.75',
      kpiSize: '30px', heroNum: '104px', secNum: '11px', gutter: '40px', sectionY: '22px', radius: '2px' }),
  },
  {
    id: 'memo', label: '메모', group: '문서·실무',
    description: '사내 문서 톤 · 좌측 라벨 정렬 · 극도로 사무적',
    traits: '사무적 / 라벨 정렬 / 무장식',
    tokens: mk({ fontHead: PLEX, fontBody: PLEX, fontLabel: PLEX, fontNum: PLEX,
      h1Size: '24px', h1Weight: '600', h1LineHeight: '1.35', h1Spacing: '-0.01em',
      h3Size: '16px', h3Weight: '600', dekSize: '13px', bodySize: '13.5px', bodyLineHeight: '1.7',
      kpiSize: '24px', heroNum: '84px', secNum: '11px', gutter: '36px', sectionY: '18px', radius: '0px' }),
  },
  {
    id: 'manual', label: '매뉴얼', group: '문서·실무',
    description: '번호 체계 강조 · 좌측 들여쓰기 · 설명서 톤',
    traits: '번호 체계 / 들여쓰기 / 설명서',
    tokens: mk({ fontHead: GOTHIC, fontBody: GOTHIC, fontLabel: PLEX, fontNum: PLEX,
      h1Size: '28px', h1Weight: '700', h1LineHeight: '1.3', h3Size: '17px', h3Weight: '700',
      dekSize: '14px', bodySize: '14px', bodyLineHeight: '1.8', kpiSize: '26px', heroNum: '92px',
      secNum: '13px', gutter: '44px', sectionY: '24px', radius: '2px' }),
  },
  {
    id: 'ledger', label: '장부', group: '문서·실무',
    description: '표 괘선 강조 · 모노 숫자 · 회계 장부 톤',
    traits: '표 괘선 / 모노 숫자 / 정렬',
    tokens: mk({ fontHead: GOTHIC, fontBody: GOTHIC, fontLabel: MONO, fontNum: MONO,
      h1Size: '26px', h1Weight: '700', h1LineHeight: '1.3', h3Size: '17px', h3Weight: '700',
      dekSize: '13px', bodySize: '13.5px', bodyLineHeight: '1.72', kpiSize: '24px', heroNum: '80px',
      secNum: '13px', gutter: '40px', sectionY: '20px', radius: '0px' }),
  },
  {
    id: 'receipt', label: '영수증', group: '문서·실무',
    description: '모노 고정폭 · 좁은 폭 · 점선 구분',
    traits: '모노 / 좁은 폭 / 점선',
    tokens: mk({ fontHead: MONO, fontBody: MONO, fontLabel: MONO, fontNum: MONO,
      h1Size: '22px', h1Weight: '700', h1LineHeight: '1.4', h1Spacing: '0em',
      h3Size: '15px', h3Weight: '700', dekSize: '12.5px', bodySize: '12.5px', bodyLineHeight: '1.75',
      kpiSize: '22px', heroNum: '72px', secNum: '13px', gutter: '54px', sectionY: '18px', radius: '0px' }),
  },
  {
    id: 'typewriter', label: '타이프라이터', group: '문서·실무',
    description: '모노 본문 · 점선 괘선 · 초고 원고 톤',
    traits: '모노 본문 / 점선 / 원고',
    tokens: mk({ fontHead: MONO, fontBody: MONO, fontLabel: MONO, fontNum: MONO,
      h1Size: '30px', h1Weight: '700', h1LineHeight: '1.35', h1Spacing: '0em',
      h3Size: '18px', h3Weight: '700', dekSize: '14px', bodySize: '13.5px', bodyLineHeight: '1.9',
      kpiSize: '26px', heroNum: '92px', secNum: '20px', gutter: '58px', sectionY: '28px', radius: '0px' }),
  },

  // ── 차분·여백 ──
  {
    id: 'quiet', label: '여백', group: '차분·여백',
    description: '여백 극대화 · 얇은 활자 · 좌측 라벨 레일',
    traits: '최대 여백 / 라벨 레일 / 최저 밀도',
    tokens: mk({ fontHead: GOWUN, fontBody: GOWUN, fontNum: SANS, h1Size: '32px', h1Weight: '400',
      h1LineHeight: '1.45', h1Spacing: '0em', h3Size: '19px', h3Weight: '400', dekSize: '15px',
      bodySize: '15px', bodyLineHeight: '2.05', kpiSize: '28px', heroNum: '112px', secNum: '38px',
      gutter: '76px', sectionY: '54px', radius: '4px' }),
  },
  {
    id: 'minimal', label: '미니멀', group: '차분·여백',
    description: '섹션 번호 없음 · 괘선 없음 · 활자만',
    traits: '무장식 / 번호 없음 / 활자만',
    tokens: mk({ fontHead: SERIF, fontBody: SERIF, fontNum: SANS, h1Size: '34px', h1Weight: '700',
      h1LineHeight: '1.32', h1Spacing: '-0.01em', h3Size: '20px', h3Weight: '700', dekSize: '16px',
      bodySize: '16px', bodyLineHeight: '1.95', kpiSize: '30px', heroNum: '124px', secNum: '0px',
      gutter: '72px', sectionY: '46px', radius: '0px' }),
  },
  {
    id: 'midcentury', label: '미드센추리', group: '차분·여백',
    description: '하이컨트라스트 세리프 · 넓은 자간 · 얇은 괘선',
    traits: '고대비 세리프 / 넓은 자간',
    tokens: mk({ fontHead: BODONI, fontBody: SERIF, fontNum: BODONI, h1Size: '44px', h1Weight: '400',
      h1LineHeight: '1.2', h1Spacing: '0.01em', h3Size: '24px', h3Weight: '400', dekSize: '17px',
      bodySize: '16px', bodyLineHeight: '1.9', kpiSize: '34px', heroNum: '160px', secNum: '52px',
      gutter: '68px', sectionY: '44px', radius: '2px' }),
  },
  {
    id: 'notebook', label: '노트', group: '차분·여백',
    description: '가로 괘선 배경 · 부드러운 고딕 · 필기 톤',
    traits: '괘선 배경 / 부드러운 활자',
    tokens: mk({ fontHead: GOWUN, fontBody: GOWUN, fontLabel: GOTHIC, fontNum: GOTHIC,
      h1Size: '33px', h1Weight: '400', h1LineHeight: '1.4', h1Spacing: '0em',
      h3Size: '20px', h3Weight: '400', dekSize: '15px', bodySize: '15px', bodyLineHeight: '1.9',
      kpiSize: '28px', heroNum: '116px', secNum: '40px', gutter: '60px', sectionY: '36px', radius: '6px' }),
  },

  // ── 실험 ──
  {
    id: 'card', label: '카드', group: '실험',
    description: '블록마다 분리된 카드 · 부드러운 고딕 본문 · 회색 지면',
    traits: '카드 분리 / 둥근 모서리 / 친근한 활자',
    tokens: mk({ fontHead: SANS, fontBody: GOWUN, fontNum: SANS, h1Size: '34px', h1Weight: '800',
      h1LineHeight: '1.22', h1Spacing: '-0.03em', h3Size: '20px', h3Weight: '800', dekSize: '15px',
      bodySize: '15px', bodyLineHeight: '1.8', kpiSize: '34px', heroNum: '132px', secNum: '44px',
      gutter: '32px', sectionY: '26px', radius: '14px' }),
  },
  {
    id: 'brutal', label: '브루탈', group: '실험',
    description: '초굵은 디스플레이 · 각진 모서리 · 채움 띠 제목',
    traits: '초굵은 제목 / 각진 / 강한 대비',
    tokens: mk({ fontHead: HAN, fontBody: SANS, fontNum: HAN, h1Size: '62px', h1Weight: '400',
      h1LineHeight: '1.02', h1Spacing: '-0.03em', h3Size: '32px', h3Weight: '400', dekSize: '17px',
      bodySize: '16px', bodyLineHeight: '1.7', kpiSize: '46px', heroNum: '210px', secNum: '86px',
      gutter: '48px', sectionY: '42px', radius: '0px', rule: '3px' }),
  },
  {
    id: 'swiss', label: '스위스', group: '실험',
    description: '강한 좌측 정렬 · 그리드 라인 노출 · 번호는 상단 소형',
    traits: '그리드 노출 / 좌측 정렬 / 기하학',
    tokens: mk({ fontHead: SANS, fontBody: SANS, fontLabel: SANS, fontNum: SANS,
      h1Size: '40px', h1Weight: '800', h1LineHeight: '1.1', h1Spacing: '-0.035em',
      h3Size: '21px', h3Weight: '800', dekSize: '15px', bodySize: '14.5px', bodyLineHeight: '1.7',
      kpiSize: '34px', heroNum: '150px', secNum: '13px', gutter: '48px', sectionY: '30px', radius: '0px' }),
  },
  {
    id: 'grid', label: '모눈', group: '실험',
    description: '모눈 배경 · 각진 테두리 · 제도 톤',
    traits: '모눈 배경 / 제도 / 각진',
    tokens: mk({ fontHead: PLEX, fontBody: PLEX, fontLabel: MONO, fontNum: MONO,
      h1Size: '30px', h1Weight: '600', h1LineHeight: '1.3', h1Spacing: '-0.01em',
      h3Size: '18px', h3Weight: '600', dekSize: '14px', bodySize: '14px', bodyLineHeight: '1.78',
      kpiSize: '28px', heroNum: '108px', secNum: '16px', gutter: '44px', sectionY: '26px', radius: '0px' }),
  },
  {
    id: 'compact', label: '압축', group: '실험',
    description: '작은 활자 · 좁은 여백 · 정보 밀도 최대',
    traits: '최소 여백 / 작은 활자 / 최대 밀도',
    tokens: mk({ fontHead: GOTHIC, fontBody: GOTHIC, fontLabel: SANS, fontNum: SANS,
      h1Size: '26px', h1Weight: '700', h1LineHeight: '1.25', h1Spacing: '-0.02em',
      h3Size: '16px', h3Weight: '700', dekSize: '13px', bodySize: '13px', bodyLineHeight: '1.62',
      kpiSize: '24px', heroNum: '78px', secNum: '26px', gutter: '30px', sectionY: '16px', radius: '3px' }),
  },
];

/**
 * 골격 → 계량 위젯 패밀리. 한 표에 모아 둬야 "어떤 골격끼리 그래프가 겹치는지"가 보인다.
 * 미기재 골격은 blocks(기본).
 */
const VIZ_OF: Record<string, VizFamily> = {
  // 에디토리얼
  magazine: 'blocks', journal: 'rule', tabloid: 'slabs', poster: 'slabs',
  billboard: 'slabs', zine: 'dots',
  // 신문·간행물
  newspaper: 'ticks', gazette: 'rule', academic: 'rule', broadsheet: 'ticks',
  // 문서·실무
  report: 'blocks', memo: 'rule', manual: 'hollow', ledger: 'ticks',
  receipt: 'ticks', typewriter: 'spark',
  // 차분·여백
  quiet: 'rule', minimal: 'stack', midcentury: 'dots', notebook: 'stack',
  // 실험
  card: 'dots', brutal: 'slabs', swiss: 'hollow', grid: 'hollow', compact: 'spark',
};

export const COMMENTARY_LAYOUTS: CommentaryLayout[] = DEFS.map((d) => ({
  ...d,
  viz: VIZ_OF[d.id] ?? 'blocks',
}));

/** 편집 UI 그룹 순서 */
export const LAYOUT_GROUPS: string[] = Array.from(new Set(DEFS.map((d) => d.group)));

export const DEFAULT_LAYOUT_ID = 'magazine';

export function getCommentaryLayout(id: string | null | undefined): CommentaryLayout {
  return COMMENTARY_LAYOUTS.find((l) => l.id === id) ?? COMMENTARY_LAYOUTS[0];
}

/** `.v3` 에 붙일 레이아웃 클래스. 기본 골격은 클래스 없음(토큰이 `.v3` 에 직접 선언됨). */
export function layoutClassName(id: string | null | undefined): string {
  const l = getCommentaryLayout(id);
  return l.id === DEFAULT_LAYOUT_ID ? '' : `v3-layout-${l.id}`;
}

/** 편집·미리보기 UI 표기용 */
export const VIZ_LABELS: Record<VizFamily, string> = {
  blocks: '사각 칸', dots: '원형 점', ticks: '세로 눈금', slabs: '굵은 블록',
  hollow: '테두리 칸', rule: '괘선만', spark: '얇은 라인', stack: '연속 막대',
};

/** `.v3` 에 붙일 계량 위젯 패밀리 클래스. 골격이 결정한다. */
export function layoutVizClassName(id: string | null | undefined): string {
  return `v3-viz-${getCommentaryLayout(id).viz}`;
}

/** 토큰 → CSS 변수 맵 (생성 스크립트가 사용) */
export function layoutCssVars(t: CommentaryLayoutTokens): Record<string, string> {
  return {
    '--v3-font-head': t.fontHead,
    '--v3-font-body': t.fontBody,
    '--v3-font-label': t.fontLabel,
    '--v3-font-num': t.fontNum,
    '--v3-h1-size': t.h1Size,
    '--v3-h1-weight': t.h1Weight,
    '--v3-h1-lh': t.h1LineHeight,
    '--v3-h1-ls': t.h1Spacing,
    '--v3-h3-size': t.h3Size,
    '--v3-h3-weight': t.h3Weight,
    '--v3-dek-size': t.dekSize,
    '--v3-body-size': t.bodySize,
    '--v3-body-lh': t.bodyLineHeight,
    '--v3-kpi-size': t.kpiSize,
    '--v3-hero-num': t.heroNum,
    '--v3-secnum-size': t.secNum,
    '--v3-gutter': t.gutter,
    '--v3-section-y': t.sectionY,
    '--v3-radius': t.radius,
    '--v3-rule': t.rule,
  };
}
