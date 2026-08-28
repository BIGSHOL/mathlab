'use client';

/**
 * 총평 템플릿 비교 뷰 (클라이언트).
 *
 * 3개 섹션으로 "다양한 측면"을 한 화면에 편다.
 *   ① 테마 4종 — 같은 구성, 팔레트만 교체 (상단부만 잘라 축소)
 *   ② 프리셋 조합 — 블록 순서/표시/variant 를 다르게 짠 전체 문서
 *   ③ 블록별 variant — 같은 블록의 표현 2종을 나란히 (레지스트리 renderer 직접 호출)
 *
 * ③ 은 V3CommentaryView 를 거치지 않는다. 템플릿으로 단일 블록만 남길 수 없기 때문 —
 * 헤더/푸터가 locked 라 normalizeTemplate 이 항상 켜 버린다. 그래서 variant.render 를 직접 부른다.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import type { BlockMeta } from '@/lib/exam-analysis/blocks/types';
import { DEFAULT_TEMPLATE } from '@/lib/exam-analysis/blocks/default-template';
import { COMMENTARY_THEMES, themeClassName } from '@/lib/exam-analysis/commentary-themes';
import { COMMENTARY_LAYOUTS, VIZ_LABELS } from '@/lib/exam-analysis/commentary-layouts';
import { COMMENTARY_COPIES, getCommentaryCopy } from '@/lib/exam-analysis/commentary-copy';
import { COMMENTARY_PRESETS, presetToConfig } from '@/lib/exam-analysis/commentary-presets';
import { V3CommentaryView } from '../v3/V3CommentaryView';
import { COMMENTARY_BLOCKS } from '../v3/blocks/registry';

interface Props {
  commentary: CommentaryResult;
  questions: AnalyzedQuestion[];
  meta: BlockMeta;
  options: { id: string; label: string; grade: string }[];
  currentId: string;
}


/**
 * 고정 폭(1080px) 문서를 축소해 카드 안에 담는다 — 브라우저 줌 없이 나란히 비교하기 위함.
 *
 * ⚠️ `transform: scale()` 을 쓰면 안 된다. transform 은 **레이아웃 공간을 바꾸지 않아**
 *    보이기만 작아지고 실제로는 원본 높이(≈8000px)를 그대로 차지한다 → 카드 사이가 화면 몇 개
 *    분량으로 벌어져 뒤쪽 항목이 "없는 것처럼" 보인다.
 *    `zoom` 은 레이아웃까지 축소하므로 카드가 실제 크기대로 배치된다.
 */
function ScaledDoc({
  scale,
  maxHeight,
  children,
}: {
  scale: number;
  /** 원본 기준 최대 높이(px). 넘으면 잘라낸다 — 상단부만 비교할 때 사용 */
  maxHeight?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden bg-slate-100 border border-slate-200 rounded-sm inline-block align-top">
      <div style={{ zoom: scale, width: 1080, maxHeight, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}


export function TemplatePreviewClient({ commentary, questions, meta, options, currentId }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'layouts' | 'presets' | 'themes' | 'copy' | 'variants'>('layouts');

  const renderProps = {
    commentary, questions, meta, charts: undefined, sectionNum: '01',
    copy: getCommentaryCopy('editorial'),
  };

  // variant 가 2개 이상인 블록만 비교 대상.
  // charts 는 제외 — 이 페이지는 차트 PNG 를 전달하지 않아 두 variant 모두 null 을 렌더한다(빈 상자).
  const comparableBlocks = COMMENTARY_BLOCKS.filter(
    (b) => b.id !== 'charts' && b.variants.length > 1 && b.available(commentary, questions),
  );

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
      {/* 헤더 */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">총평 템플릿 비교</h1>
        <p className="text-[13px] text-slate-500 mt-1">
          실제 분석본에 레이아웃(골격)·테마(팔레트)·문체·블록 구성을 적용한 결과를 나란히 봅니다. 차트 4종은 분석 화면 전용이라 여기선 생략됩니다.
        </p>
      </div>

      {/* 컨트롤 */}
      <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-slate-200">
        <label className="text-[12px] text-slate-500">분석본</label>
        <select
          value={currentId}
          onChange={(e) => router.push(`/exam-analysis/template-preview?id=${e.target.value}`)}
          className="text-[12px] border border-slate-200 rounded-sm px-2 py-1.5 bg-white cursor-pointer max-w-[380px]"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              [{o.grade}] {o.label}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-slate-400">
          {meta.totalQuestions}문항 · {meta.totalPoints}점
        </span>

        <div className="ml-auto inline-flex border border-slate-200 rounded-sm overflow-hidden">
          {([
            ['layouts', `레이아웃 ${COMMENTARY_LAYOUTS.length}종`],
            ['presets', `프리셋 ${COMMENTARY_PRESETS.length}종`],
            ['themes', `테마 ${COMMENTARY_THEMES.length}종`],
            ['copy', `문체 ${COMMENTARY_COPIES.length}종`],
            ['variants', '블록별 variant'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 text-[12px] font-bold transition-colors cursor-pointer ${
                tab === key ? 'bg-primary text-white' : 'bg-white text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ⓪ 레이아웃 4종 — 팔레트·블록 구성을 고정하고 골격만 교체 (축을 분리해서 봄) */}
      {tab === 'layouts' && (
        <>
          <p className="text-[12px] text-slate-500 mb-4 -mt-2">
            팔레트(NYT)와 블록 구성을 <b>동일하게 고정</b>하고 골격만 바꾼 결과입니다 — 색이 같은데도 다른 문서로
            읽혀야 골격 축이 제대로 동작하는 것입니다. 데이터 박스·막대가 동일한 것도 의도된 것으로,
            그 차이는 <b>프리셋</b> 탭에서 봅니다.
          </p>
          <div className="flex flex-wrap gap-6">
            {COMMENTARY_LAYOUTS.map((layout) => (
              <div key={layout.id}>
                <div className="mb-1.5">
                  <span className="text-[13px] font-bold text-slate-900">{layout.label}</span>
                  <span className="ml-2 text-[10px] text-slate-400 uppercase tracking-wider">{layout.id}</span>
                  {/* 계량 위젯 패밀리 — 어떤 골격끼리 그래프가 겹치는지 한눈에 */}
                  <span className="ml-2 text-[10px] text-slate-500 bg-slate-100 rounded-sm px-1.5 py-0.5">
                    {VIZ_LABELS[layout.viz]}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-2 max-w-[320px] h-8">{layout.description}</p>
                <ScaledDoc scale={0.32}>
                  <V3CommentaryView
                    commentary={commentary}
                    questions={questions}
                    meta={meta}
                    template={{ ...DEFAULT_TEMPLATE, themeId: 'nyt', layoutId: layout.id }}
                  />
                </ScaledDoc>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ① 테마 4종 — 상단부만 잘라 팔레트 차이를 빠르게 */}
      {tab === 'themes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {COMMENTARY_THEMES.map((theme) => (
            <div key={theme.id}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex rounded-sm overflow-hidden border border-slate-200">
                  {[theme.colors.surfaceDark, theme.colors.accent, theme.colors.gold].map((c, i) => (
                    <span key={i} style={{ background: c }} className="w-2.5 h-4 block" />
                  ))}
                </span>
                <span className="text-[13px] font-bold text-slate-900">{theme.label}</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2 h-8">{theme.description}</p>
              <ScaledDoc scale={0.29} maxHeight={2600}>
                <V3CommentaryView
                  commentary={commentary}
                  questions={questions}
                  meta={meta}
                  template={{ ...DEFAULT_TEMPLATE, themeId: theme.id }}
                />
              </ScaledDoc>
            </div>
          ))}
        </div>
      )}

      {/* ② 프리셋 조합 — 전체 문서 */}
      {tab === 'presets' && (
        <div className="flex flex-wrap gap-6">
          {COMMENTARY_PRESETS.map((p) => (
            <div key={p.id}>
              <div className="mb-1.5">
                <span className="text-[13px] font-bold text-slate-900">{p.label}</span>
                <span className="ml-2 text-[10px] text-slate-400 uppercase tracking-wider">
                  {p.layoutId} · {p.themeId} · {p.copyId}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2 max-w-[300px] h-8">{p.hint}</p>
              <ScaledDoc scale={0.3}>
                <V3CommentaryView
                  commentary={commentary}
                  questions={questions}
                  meta={meta}
                  template={presetToConfig(p)}
                />
              </ScaledDoc>
            </div>
          ))}
        </div>
      )}

      {/* ②-b 문체 4종 — 지면에 박히는 고정 문구 비교. 축소하면 글자가 안 보이므로 크게 렌더 */}
      {tab === 'copy' && (
        <>
          <p className="text-[12px] text-slate-500 mb-4 -mt-2">
            골격·팔레트를 고정하고 <b>템플릿이 소유한 고정 문구</b>만 바꾼 결과입니다. 섹션 제목·안내문·작성자 표기가
            달라집니다. AI가 생성한 헤드라인·Q&amp;A·총평 본문은 문체 팩의 영향을 받지 않습니다.
          </p>
          <div className="flex flex-col gap-7">
            {COMMENTARY_COPIES.map((c) => {
              const props = { ...renderProps, copy: c };
              const info = COMMENTARY_BLOCKS.find((b) => b.id === 'infographic');
              const concl = COMMENTARY_BLOCKS.find((b) => b.id === 'conclusion');
              return (
                <section key={c.id}>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h2 className="text-[14px] font-bold text-slate-900">{c.label}</h2>
                    <span className="text-[11px] text-slate-400">{c.description}</span>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <ScaledDoc scale={0.62}>
                      <div className="v3">{info?.variants[1].render({ ...props, sectionNum: '01' })}</div>
                    </ScaledDoc>
                    {concl?.available(commentary, questions) && (
                      <ScaledDoc scale={0.62}>
                        <div className="v3">{concl.variants[0].render(props)}</div>
                      </ScaledDoc>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      {/* ③ 블록별 variant — 같은 블록의 표현 2종을 나란히 */}
      {tab === 'variants' && (
        <div className="flex flex-col gap-8">
          {comparableBlocks.map((block) => (
            <section key={block.id}>
              <div className="flex items-baseline gap-2 mb-2">
                <h2 className="text-[14px] font-bold text-slate-900">{block.label}</h2>
                {block.description && <span className="text-[11px] text-slate-400">{block.description}</span>}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {block.variants.map((v) => (
                  <div key={v.id}>
                    <div className="flex items-baseline gap-2 mb-1.5">
                      <span className="text-[12px] font-bold text-slate-700">{v.label}</span>
                      {v.hint && <span className="text-[10px] text-slate-400">{v.hint}</span>}
                    </div>
                    {/* 블록 단독 렌더 — .v3 컨텍스트(폰트/토큰)를 주기 위해 래퍼는 유지 */}
                    <ScaledDoc scale={0.5}>
                      <div className={themeClassName('nyt') ? `v3 ${themeClassName('nyt')}` : 'v3'}>
                        {v.render(renderProps)}
                      </div>
                    </ScaledDoc>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
