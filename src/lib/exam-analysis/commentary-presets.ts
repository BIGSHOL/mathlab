/**
 * 총평 프리셋 — **레이아웃·테마·문체·블록 구성을 한 묶음으로 큐레이션한 "완성된 문서 한 종"**.
 *
 * 왜 레이아웃이 아니라 프리셋인가:
 *   `CommentaryLayout.tokens` 는 활자·여백만 바꾼다(`fontHead`·`h1Size`·`gutter`·`rule` …).
 *   그래서 레이아웃을 26번째로 늘려 봐야 **정보 순서가 같아 같은 문서로 읽힌다.**
 *   히어로가 무엇이고 블록이 어떤 순서인지를 갈라야 다른 문서가 되고, 그 축은 여기다.
 *
 * 왜 DB 가 아니라 상수인가:
 *   프리셋은 "제품이 제공하는 레시피"이고, 사용자가 고른 뒤 편집한 결과는 이미
 *   `PUT /api/exam-analysis/[id]/template` 이 분석본/지점 단위로 저장한다(스키마 변경 불필요).
 *   둘을 한 테이블에 섞으면 레시피와 인스턴스가 구분되지 않는다.
 *   나중에 사용자가 자기 프리셋을 공유하게 되면 그때 별도 모델을 추가하면 되고,
 *   config 형태가 같아 이전 비용이 작다.
 *
 * ⚠️ 작성 형식은 **델타**(기본 템플릿 대비 바뀌는 블록만)다. 14개 블록을 매번 나열하면
 *    블록이 추가될 때마다 20곳을 고쳐야 하고 반드시 어긋난다. 소비 시점에
 *    `presetToConfig()` 가 완전한 `CommentaryTemplateConfig` 로 펼친다.
 */

import type { BlockId, CommentaryTemplateConfig, TemplateBlockConfig } from './blocks/types';
import { DEFAULT_TEMPLATE } from './blocks/default-template';

/** 이 프리셋이 누구에게 보여주려고 만든 문서인지 — 편집 UI 그룹핑 + 문체 선택 근거 */
export type PresetAudience = 'parent' | 'owner' | 'teacher' | 'blog';

export const AUDIENCE_LABELS: Record<PresetAudience, string> = {
  parent: '학부모',
  owner: '원장',
  teacher: '교사',
  blog: '블로그',
};

export interface CommentaryPreset {
  /** 코드 키 — 저장된 문서에 `originPresetId` 로 기록될 수 있다 */
  id: string;
  label: string;
  /** 편집 UI 한 줄 설명 */
  hint: string;
  audience: PresetAudience;
  themeId: string;
  layoutId: string;
  copyId: string;
  /** 기본 템플릿 대비 바뀌는 블록만 */
  changes: Partial<Record<BlockId, { variant?: string; enabled?: boolean }>>;
  /** 앞쪽에 강제할 순서. 여기 없는 블록은 기본 순서를 유지한 채 뒤에 남는다 */
  order?: readonly BlockId[];
}

/**
 * 델타 → 완전한 템플릿 설정.
 *
 * ⚠️ 블록 객체를 **매번 새로 만든다**. 프리셋 상수의 객체를 그대로 넘기면
 *    편집기에서 variant 를 바꾸는 순간 원본 상수가 오염돼, 다음에 같은 프리셋을
 *    고른 사용자가 남의 수정본을 받는다.
 */
export function presetToConfig(preset: CommentaryPreset): CommentaryTemplateConfig {
  const blocks: TemplateBlockConfig[] = DEFAULT_TEMPLATE.blocks.map((b) => {
    const c = preset.changes[b.id];
    return { id: b.id, variant: c?.variant ?? b.variant, enabled: c?.enabled ?? b.enabled };
  });

  // 기본 템플릿에 없는 블록(letterBody 처럼 프리셋 전용으로 새로 만든 것)도 changes 에
  // 적었으면 반드시 포함시킨다. 기본 목록만 순회하면 그 지정이 **조용히 버려지고**,
  // normalizeTemplate 이 defaultEnabled=false 로 꺼진 채 다시 붙여 프리셋이 빈 껍데기가 된다.
  const present = new Set(blocks.map((b) => b.id));
  for (const [id, c] of Object.entries(preset.changes) as [BlockId, { variant?: string; enabled?: boolean }][]) {
    if (present.has(id)) continue;
    blocks.push({ id, variant: c.variant ?? '', enabled: c.enabled !== false });
  }

  const order = preset.order;
  const sorted = order
    ? [...blocks].sort((a, b) => {
        const ia = order.indexOf(a.id);
        const ib = order.indexOf(b.id);
        // order 에 없는 블록은 원래 상대 순서를 유지한 채 뒤로 (index 로 안정 정렬)
        return (ia < 0 ? 999 + blocks.indexOf(a) : ia) - (ib < 0 ? 999 + blocks.indexOf(b) : ib);
      })
    : blocks;

  return { themeId: preset.themeId, layoutId: preset.layoutId, copyId: preset.copyId, blocks: sorted };
}

export const COMMENTARY_PRESETS: readonly CommentaryPreset[] = [
  {
    id: 'magazine',
    label: '매거진',
    hint: '기존 골격 — 대형 명조 · 넓은 여백. 회귀 확인 기준',
    audience: 'blog',
    themeId: 'nyt',
    layoutId: 'magazine',
    copyId: 'editorial',
    changes: {},
  },
  {
    id: 'newspaper',
    label: '신문',
    hint: '중앙 마스트헤드 + 본문 2단 조판 + 괘선. 밀도 최대',
    audience: 'blog',
    themeId: 'mono',
    layoutId: 'newspaper',
    copyId: 'press',
    changes: {
      header: { variant: 'centered' },
      kpi: { variant: 'spec' },
      feature: { variant: 'banner' },
      infographic: { variant: 'dots' },
      qa: { variant: 'ledger' },
      pullQuote: { variant: 'rule' },
    },
  },
  {
    id: 'data-first',
    label: '리포트 (데이터 우선)',
    hint: '전면 산세리프 · 번호 배지 · 표를 앞으로, 서술을 뒤로',
    audience: 'owner',
    themeId: 'brand',
    layoutId: 'report',
    copyId: 'official',
    changes: {
      header: { variant: 'editorial' },
      kpi: { variant: 'spec' },
      infographic: { variant: 'table' },
      qa: { variant: 'plain' },
      pullQuote: { enabled: false },
      conclusion: { variant: 'ink' },
    },
    order: ['header', 'kpi', 'infographic', 'difficultyTable', 'mainAnalysis', 'feature', 'qa'],
  },
  {
    id: 'handout',
    label: '카드 (학부모 배포)',
    hint: '블록마다 분리된 카드 · 회색 지면 · 표 최소, 서술 중심',
    audience: 'parent',
    themeId: 'sepia',
    layoutId: 'card',
    copyId: 'parent',
    changes: {
      header: { variant: 'centered' },
      kpi: { variant: 'light' },
      feature: { variant: 'split' },
      infographic: { variant: 'bars-only' },
      qa: { variant: 'chip' },
      difficultyTable: { enabled: false },
      pullQuote: { variant: 'accent' },
    },
  },
  {
    id: 'brutal',
    label: '브루탈',
    hint: '초굵은 디스플레이 · 각진 테두리 · 두꺼운 괘선. 시선 강탈형',
    audience: 'blog',
    themeId: 'nyt',
    layoutId: 'brutal',
    copyId: 'press',
    changes: {
      header: { variant: 'editorial' },
      kpi: { variant: 'hero' },
      feature: { variant: 'split' },
      infographic: { variant: 'full' },
      qa: { variant: 'chip' },
      pullQuote: { variant: 'rule' },
      conclusion: { variant: 'ink' },
    },
  },
  {
    id: 'letter',
    label: '손편지',
    hint: '차트 0 · 세리프 본문 · 서명란. 가정으로 그대로 보내는 편지 한 통',
    audience: 'parent',
    themeId: 'sepia',
    layoutId: 'quiet',
    copyId: 'parent',
    changes: {
      // 편지지 머리만 남기고, 지면을 "숫자로 보여 주는" 블록을 전부 끈다.
      // 하나라도 켜져 있으면 편지가 아니라 리포트에 인사말을 붙인 것처럼 읽힌다.
      header: { variant: 'letterhead' },
      letterBody: { variant: 'serif', enabled: true },
      kpi: { enabled: false },
      feature: { enabled: false },
      infographic: { enabled: false },
      difficultyTable: { enabled: false },
      previousComparison: { enabled: false },
      qa: { enabled: false },
      // 편지 본문이 이미 이 내용을 산문으로 품고 있어 그대로 두면 같은 말이 두 번 나온다
      mainAnalysis: { enabled: false },
      keyQuestions: { enabled: false },
      pullQuote: { enabled: false },
      charts: { enabled: false },
      finalStrategy: { enabled: false },
      conclusion: { enabled: false },
    },
    order: ['header', 'letterBody'],
  },
  {
    id: 'heatmap',
    label: '시험지 히트맵',
    hint: '집계 대신 시험지 배열 자체를 그린다. 어려운 구간이 어디 몰렸는지가 한눈에',
    audience: 'teacher',
    themeId: 'nyt',
    layoutId: 'grid',
    copyId: 'official',
    changes: {
      header: { variant: 'editorial' },
      kpi: { variant: 'spec' },
      heatmapGrid: { variant: 'grid', enabled: true },
      // 히트맵이 이미 문항별 난이도·배점을 다 보여 준다. 표까지 두면 같은 걸 두 번 읽힌다.
      difficultyTable: { enabled: false },
      infographic: { enabled: false },
      feature: { enabled: false },
      qa: { enabled: false },
      pullQuote: { enabled: false },
      charts: { enabled: false },
    },
    // 히트맵이 히어로 — 헤드라인 다음에 바로 시험지가 온다
    order: ['header', 'heatmapGrid', 'kpi'],
  },
  {
    id: 'wrapped',
    label: '스토리 카드',
    hint: '한 화면에 숫자 하나. 넘기며 보는 세로 카드 — 학부모·학생에게 그대로 공유',
    audience: 'blog',
    themeId: 'nyt',
    layoutId: 'minimal',
    copyId: 'parent',
    changes: {
      // 표지 슬라이드가 곧 헤더다 — 대형 헤드라인이 앞에 있으면 카드가 아니라 기사가 된다
      header: { variant: 'letterhead' },
      storySlide: { variant: 'story', enabled: true },
      kpi: { enabled: false },
      feature: { enabled: false },
      infographic: { enabled: false },
      difficultyTable: { enabled: false },
      previousComparison: { enabled: false },
      qa: { enabled: false },
      mainAnalysis: { enabled: false },
      keyQuestions: { enabled: false },
      pullQuote: { enabled: false },
      charts: { enabled: false },
      finalStrategy: { enabled: false },
      conclusion: { enabled: false },
    },
    order: ['header', 'storySlide'],
  },
  {
    id: 'terminal',
    label: '터미널',
    hint: '다크 계기판 · 모노스페이스 · 숫자 먼저, 서술 나중',
    audience: 'owner',
    themeId: 'terminal',
    // compact = 밀도 최대 + spark(얇은 라인). 레이아웃을 새로 만들지 않고 골격만 고른다.
    layoutId: 'compact',
    copyId: 'official',
    changes: {
      header: { variant: 'terminal' },
      kpi: { variant: 'terminal' },
      // 거대숫자 피처·인용구는 잡지 장치. 켜 두면 계기판 위에 표지가 한 장 더 얹힌다.
      feature: { enabled: false },
      infographic: { variant: 'full' },
      qa: { variant: 'ledger' },
      pullQuote: { enabled: false },
    },
    // 표·지표(kpi·난이도표·인포그래픽·차트)가 서술(본분석·Q&A)보다 앞. 이 순서가 차별성 지문이다.
    order: ['header', 'kpi', 'difficultyTable', 'infographic', 'charts', 'mainAnalysis', 'qa'],
  },
  {
    id: 'briefing',
    label: '원장 브리핑',
    hint: '한 화면에 숫자 셋과 한 줄. 표·Q&A 없음 — 3초 안에 판단',
    audience: 'owner',
    themeId: 'brand',
    layoutId: 'memo',
    copyId: 'official',
    changes: {
      // 히어로 KPI 가 문서 전부다. 스크롤이 생기는 순간 "브리핑"이 아니라 리포트가 된다.
      kpi: { variant: 'hero' },
      feature: { enabled: false },
      infographic: { enabled: false },
      difficultyTable: { enabled: false },
      previousComparison: { enabled: false },
      qa: { enabled: false },
      mainAnalysis: { enabled: false },
      keyQuestions: { enabled: false },
      pullQuote: { enabled: false },
      charts: { enabled: false },
      finalStrategy: { enabled: false },
    },
    order: ['header', 'kpi', 'conclusion'],
  },
  {
    id: 'versus',
    label: '대결 슬레이트',
    hint: '작년·인근과의 비교가 맨 앞. 비교 데이터가 없으면 그 자리는 접힌다',
    audience: 'owner',
    themeId: 'burgundy',
    layoutId: 'ledger',
    copyId: 'press',
    changes: {
      // 비교를 헤드라인 다음에 바로. 데이터가 없으면 available() 이 걸러 내므로
      // 빈 비교표가 남지 않는다 — 가짜 비교를 만들지 않는다는 전제가 여기서 지켜진다.
      previousComparison: { variant: 'callout' },
      kpi: { variant: 'spec' },
      feature: { enabled: false },
      infographic: { enabled: false },
      qa: { enabled: false },
      keyQuestions: { enabled: false },
      pullQuote: { enabled: false },
      charts: { enabled: false },
      mainAnalysis: { enabled: false },
    },
    order: ['header', 'previousComparison', 'kpi', 'difficultyTable', 'finalStrategy', 'conclusion'],
  },
  {
    id: 'toss',
    label: '큰 숫자',
    hint: '밀도 최저 · 큰 숫자와 짧은 문장. 한 스크롤에 카드 서넛',
    audience: 'parent',
    themeId: 'sky',
    layoutId: 'quiet',
    copyId: 'parent',
    changes: {
      kpi: { variant: 'hero' },
      feature: { variant: 'banner' },
      // 표·차트·문항목록은 전부 뺀다. 남기는 순간 "밀도 최저"가 성립하지 않는다.
      infographic: { enabled: false },
      difficultyTable: { enabled: false },
      previousComparison: { enabled: false },
      qa: { enabled: false },
      keyQuestions: { enabled: false },
      pullQuote: { enabled: false },
      charts: { enabled: false },
      mainAnalysis: { enabled: false },
      finalStrategy: { enabled: false },
    },
    order: ['header', 'kpi', 'feature', 'conclusion'],
  },
  {
    id: 'frontpage',
    label: '호외 1면',
    hint: '마스트헤드 · 큰 인용 · 리드가 먼저. 기존 신문 프리셋과 정보 순서가 다르다',
    audience: 'blog',
    themeId: 'mono',
    layoutId: 'broadsheet',
    copyId: 'press',
    changes: {
      header: { variant: 'centered' },
      // 1면은 "무슨 일이 있었나"가 먼저다 — 인용과 서술을 앞으로, 표·차트를 뒤로.
      // 기존 newspaper 프리셋은 헤드라인 → 지표 → 표 순이라 이것과 골격이 다르다.
      pullQuote: { variant: 'rule' },
      kpi: { variant: 'spec' },
      feature: { enabled: false },
      infographic: { enabled: false },
      charts: { enabled: false },
      qa: { enabled: false },
      keyQuestions: { enabled: false },
    },
    order: ['header', 'pullQuote', 'mainAnalysis', 'kpi', 'difficultyTable', 'finalStrategy', 'conclusion'],
  },
  {
    id: 'labnote',
    label: '실험 노트',
    hint: '모눈 지면에 문항을 적어 두고 눈에 띄는 것만 짚는 관찰 기록',
    audience: 'teacher',
    themeId: 'mono',
    layoutId: 'grid',
    copyId: 'official',
    changes: {
      // 관찰 기록이므로 "무엇이 나왔나"(격자) → "무엇이 걸리나"(주요 문항) 순.
      // heatmap 프리셋은 격자 다음에 지표가 오지만, 여기선 지표를 아예 빼고 주석만 남긴다.
      heatmapGrid: { variant: 'compact', enabled: true },
      kpi: { enabled: false },
      feature: { enabled: false },
      infographic: { enabled: false },
      difficultyTable: { enabled: false },
      previousComparison: { enabled: false },
      qa: { enabled: false },
      charts: { enabled: false },
      pullQuote: { enabled: false },
    },
    order: ['header', 'heatmapGrid', 'keyQuestions', 'mainAnalysis', 'finalStrategy', 'conclusion'],
  },
  {
    id: 'chalkboard',
    label: '칠판',
    hint: '수업 직후 판서 — 초록 지면에 분필. 결론 세 줄이 먼저 온다',
    audience: 'teacher',
    themeId: 'chalkboard',
    layoutId: 'notebook',
    copyId: 'editorial',
    changes: {
      // 판서는 "오늘 이것만 기억해라"가 맨 위에 적힌다 — 결론을 헤더 바로 다음으로.
      conclusion: { variant: 'cream' },
      kpi: { variant: 'light' },
      feature: { enabled: false },
      infographic: { enabled: false },
      difficultyTable: { enabled: false },
      previousComparison: { enabled: false },
      qa: { enabled: false },
      charts: { enabled: false },
      keyQuestions: { enabled: false },
      pullQuote: { enabled: false },
    },
    order: ['header', 'conclusion', 'kpi', 'mainAnalysis', 'finalStrategy'],
  },
  {
    id: 'quiet',
    label: '여백',
    hint: '여백 극대화 · 얇은 활자 · 괘선 최소. 차분한 읽기',
    audience: 'teacher',
    themeId: 'mono',
    layoutId: 'quiet',
    copyId: 'editorial',
    changes: {
      header: { variant: 'centered' },
      kpi: { variant: 'light' },
      feature: { variant: 'banner' },
      infographic: { variant: 'table' },
      qa: { variant: 'plain' },
      difficultyTable: { enabled: false },
      pullQuote: { variant: 'accent' },
    },
  },
  {
    id: 'weather',
    label: '시험 날씨',
    hint: '단원별 배점×난이도를 맑음·흐림·비·폭풍으로. 예보 스트립이 본문',
    audience: 'parent',
    themeId: 'sky',
    layoutId: 'quiet',
    copyId: 'parent',
    changes: {
      // 표·차트는 끈다. 켜 두면 "예보"가 아니라 리포트 위에 아이콘을 얹은 것처럼 읽힌다.
      header: { variant: 'centered' },
      weatherStrip: { variant: 'strip', enabled: true },
      feature: { enabled: false },
      infographic: { enabled: false },
      difficultyTable: { enabled: false },
      qa: { enabled: false },
      pullQuote: { enabled: false },
      charts: { enabled: false },
    },
    // 예보가 히어로 — 헤드라인 다음에 바로 날씨가 온다
    order: ['header', 'weatherStrip', 'kpi'],
  },
  {
    id: 'subway',
    label: '노선도',
    hint: '단원 = 역. 4단계 이상은 환승, 서술형은 급행. 시험 한 줄의 지도',
    audience: 'teacher',
    themeId: 'mono',
    layoutId: 'grid',
    copyId: 'official',
    changes: {
      // 노선이 이미 단원·난이도·서술형을 보여 준다. 표까지 두면 같은 지도를 두 번 읽힌다.
      header: { variant: 'editorial' },
      subwayMap: { variant: 'line', enabled: true },
      feature: { enabled: false },
      infographic: { enabled: false },
      difficultyTable: { enabled: false },
      previousComparison: { enabled: false },
      qa: { enabled: false },
      pullQuote: { enabled: false },
      charts: { enabled: false },
    },
    order: ['header', 'subwayMap', 'kpi'],
  },
  {
    id: 'kakaotalk',
    label: '대화',
    hint: '선생님↔학부모 말풍선. 한 버블이 한 인사이트',
    audience: 'parent',
    themeId: 'teal',
    layoutId: 'card',
    copyId: 'parent',
    changes: {
      // 말풍선이 Q&A·총평·전략을 대화로 다시 엮는다. 같은 내용의 분석 섹션을 남겨 두면
      // 채팅 아래에 리포트가 한 장 더 붙어 "대화"가 깨진다.
      header: { variant: 'letterhead' },
      bubbleThread: { variant: 'chat', enabled: true },
      kpi: { enabled: false },
      feature: { enabled: false },
      infographic: { enabled: false },
      difficultyTable: { enabled: false },
      previousComparison: { enabled: false },
      qa: { enabled: false },
      mainAnalysis: { enabled: false },
      keyQuestions: { enabled: false },
      pullQuote: { enabled: false },
      charts: { enabled: false },
      finalStrategy: { enabled: false },
      conclusion: { enabled: false },
    },
    order: ['header', 'bubbleThread'],
  },
  {
    id: 'scout',
    label: '스카우트 카드',
    hint: '선수 카드 · 능력 레이더 · 스카우트 노트 3줄. 학부모·학생 동기부여',
    audience: 'parent',
    themeId: 'terracotta',
    layoutId: 'card',
    copyId: 'parent',
    changes: {
      // 카드가 문서 전부다. KPI·표를 남기면 같은 숫자를 두 번 읽고 선수 카드가 깨진다.
      header: { variant: 'letterhead' },
      statRadar: { variant: 'card', enabled: true },
      kpi: { enabled: false },
      feature: { enabled: false },
      infographic: { enabled: false },
      difficultyTable: { enabled: false },
      previousComparison: { enabled: false },
      qa: { enabled: false },
      mainAnalysis: { enabled: false },
      keyQuestions: { enabled: false },
      pullQuote: { enabled: false },
      charts: { enabled: false },
      finalStrategy: { enabled: false },
      conclusion: { enabled: false },
    },
    order: ['header', 'statRadar'],
  },
  {
    id: 'rx',
    label: '처방전',
    hint: '진단 · 처방 · 예후 3칸. 병원 처방전 질감',
    audience: 'parent',
    themeId: 'salmon',
    layoutId: 'receipt',
    copyId: 'parent',
    changes: {
      // 세 칸이 본문이다. 분석 섹션을 남기면 처방 아래에 리포트가 한 장 더 붙는다.
      header: { variant: 'letterhead' },
      rxCard: { variant: 'sheet', enabled: true },
      kpi: { enabled: false },
      feature: { enabled: false },
      infographic: { enabled: false },
      difficultyTable: { enabled: false },
      previousComparison: { enabled: false },
      qa: { enabled: false },
      mainAnalysis: { enabled: false },
      keyQuestions: { enabled: false },
      pullQuote: { enabled: false },
      charts: { enabled: false },
      finalStrategy: { enabled: false },
      conclusion: { enabled: false },
    },
    order: ['header', 'rxCard'],
  },
  {
    id: 'bento',
    label: '벤토',
    hint: '타일 크기로만 위계. 큰 칸은 킬러, 작은 칸은 숫자',
    audience: 'blog',
    themeId: 'plum',
    layoutId: 'swiss',
    copyId: 'editorial',
    changes: {
      // 긴 문단·표는 끈다. 켜 두면 "타일 크기 위계"가 아니라 기사 위에 격자를 얹은 것이 된다.
      header: { variant: 'editorial' },
      bentoGrid: { variant: 'three', enabled: true },
      kpi: { enabled: false },
      feature: { enabled: false },
      infographic: { enabled: false },
      difficultyTable: { enabled: false },
      previousComparison: { enabled: false },
      qa: { enabled: false },
      mainAnalysis: { enabled: false },
      keyQuestions: { enabled: false },
      pullQuote: { enabled: false },
      charts: { enabled: false },
      finalStrategy: { enabled: false },
      conclusion: { enabled: false },
    },
    order: ['header', 'bentoGrid'],
  },
  {
    id: 'gradebook',
    label: '성적표',
    hint: '칸 용지 성적표. 단원×지표 표 + 빨간 도장 + 담임 소견란',
    audience: 'teacher',
    // forest = 미사용 팔레트. 복고 성적표는 따뜻한 지면 + 관보(이중 괘선)가 맞다.
    themeId: 'forest',
    layoutId: 'gazette',
    copyId: 'official',
    changes: {
      // 표가 히어로. KPI·인포그래픽을 남기면 같은 숫자를 두 번 읽고 성적표가 리포트가 된다.
      header: { variant: 'letterhead' },
      gradeSheet: { variant: 'sheet', enabled: true },
      kpi: { enabled: false },
      feature: { enabled: false },
      infographic: { enabled: false },
      difficultyTable: { enabled: false },
      previousComparison: { enabled: false },
      qa: { enabled: false },
      mainAnalysis: { enabled: false },
      keyQuestions: { enabled: false },
      pullQuote: { enabled: false },
      charts: { enabled: false },
      finalStrategy: { enabled: false },
      conclusion: { enabled: false },
    },
    order: ['header', 'gradeSheet'],
  },
  {
    id: 'webtoon',
    label: '4컷',
    hint: '예고 → 킬러 쏠림 → 서술형 함정 → 다음 숙제. 컷마다 이미지 한 장',
    audience: 'blog',
    // zine = 거친 대비·디스플레이 활자. 4컷 만화의 뼈대와 맞는다.
    themeId: 'plum',
    layoutId: 'zine',
    copyId: 'parent',
    changes: {
      // 컷이 본문이다. 분석 섹션을 남기면 만화 아래에 리포트가 한 장 더 붙는다.
      header: { variant: 'letterhead' },
      comicStrip: { variant: 'panel', enabled: true },
      kpi: { enabled: false },
      feature: { enabled: false },
      infographic: { enabled: false },
      difficultyTable: { enabled: false },
      previousComparison: { enabled: false },
      qa: { enabled: false },
      mainAnalysis: { enabled: false },
      keyQuestions: { enabled: false },
      pullQuote: { enabled: false },
      charts: { enabled: false },
      finalStrategy: { enabled: false },
      conclusion: { enabled: false },
    },
    order: ['header', 'comicStrip'],
  },
  {
    id: 'ingredients',
    label: '레시피',
    hint: '단원별 배점 재료 목록 + 공부 순서 + 맵기. 막대·표 없음',
    audience: 'parent',
    // manual = 조리법 톤. terracotta 는 따뜻한 부엌 지면.
    themeId: 'terracotta',
    layoutId: 'manual',
    copyId: 'parent',
    changes: {
      // 재료·조리·맵기가 문서 전부다. 표를 켜면 "레시피"가 아니라 리포트 위에 목록을 얹은 것이 된다.
      header: { variant: 'letterhead' },
      recipeCard: { variant: 'card', enabled: true },
      kpi: { enabled: false },
      feature: { enabled: false },
      infographic: { enabled: false },
      difficultyTable: { enabled: false },
      previousComparison: { enabled: false },
      qa: { enabled: false },
      mainAnalysis: { enabled: false },
      keyQuestions: { enabled: false },
      pullQuote: { enabled: false },
      charts: { enabled: false },
      finalStrategy: { enabled: false },
      conclusion: { enabled: false },
    },
    order: ['header', 'recipeCard'],
  },
] as const;

export function getPreset(id: string | null | undefined): CommentaryPreset | null {
  return COMMENTARY_PRESETS.find((p) => p.id === id) ?? null;
}
