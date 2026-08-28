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
] as const;

export function getPreset(id: string | null | undefined): CommentaryPreset | null {
  return COMMENTARY_PRESETS.find((p) => p.id === id) ?? null;
}
