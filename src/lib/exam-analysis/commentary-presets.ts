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
