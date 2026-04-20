/**
 * 교과서 도형 렌더링 검증 페이지
 * - 옵션 A (fill + splitDiagonal)
 * - 옵션 B (polygon 신규 타입)
 * - 옵션 D (outlineCurve 점선 둘레)
 */

import { renderDiagram } from '@/lib/diagram/renderer';
import type { DiagramSpec } from '@/types/diagram';

interface Case {
  title: string;
  desc?: string;
  spec: DiagramSpec;
}

const cases: Case[] = [
  {
    title: '(1) 직각 2개 일반 사각형 — splitDiagonal로 두 직각삼각형 분할',
    desc: '교과서 0596(1) — 대각선(보조선)을 그어 삼각형 ①, ②로 나누어 넓이 구하기',
    spec: {
      type: 'quadrilateral',
      vertices: [
        [0, 30],     // 0: 좌상단 (직각)
        [110, 0],    // 1: 우상단
        [130, 100],  // 2: 우하단 (직각)
        [10, 120],   // 3: 좌하단
      ],
      rightAngleMarks: [0, 2],
      splitDiagonal: {
        from: 0,
        to: 2,
        fillA: '#D6F0E0',
        fillB: '#FFEDD5',
        labelA: '①',
        labelB: '②',
        style: 'dashed',
      },
      showLengths: [
        { edge: [0, 1], value: '5' },
        { edge: [1, 2], value: '4' },
        { edge: [2, 3], value: 'b' },
        { edge: [3, 0], value: 'a' },
      ],
      outlineCurve: { inflate: 14 },
    },
  },
  {
    title: '(2) 오각형(집 모양) — polygon + regions로 직사각형+삼각형 분리',
    desc: '교과서 0596(2) — 상단 삼각형과 하단 직사각형의 넓이를 따로 계산',
    spec: {
      type: 'polygon',
      vertices: [
        [0, 200],    // 0: 좌하
        [200, 200],  // 1: 우하
        [200, 80],   // 2: 우상
        [100, 0],    // 3: 꼭대기
        [0, 80],     // 4: 좌상
      ],
      rightAngleMarks: [0, 1, 2, 3, 4],
      splitLines: [
        { from: 2, to: 4, style: 'dashed' },
      ],
      regions: [
        { vertexIndices: [0, 1, 2, 4], fill: '#E0E0F0', label: '②' },
        { vertexIndices: [4, 2, 3], fill: '#FFEDD5', label: '①' },
      ],
      showLengths: [
        { edge: [0, 1], value: 'a' },
        { edge: [1, 2], value: 'b' },
        { edge: [2, 3], value: '2' },
      ],
      outlineCurve: { inflate: 14 },
    },
  },
  {
    title: '삼각형 fill + outlineCurve',
    desc: '직각삼각형에 단색 채움 + 외곽 점선 곡선',
    spec: {
      type: 'triangle',
      preset: 'right',
      sides: { a: 4, b: 3, c: 5 },
      fill: '#FEF3C7',
      outlineCurve: { inflate: 14 },
    },
  },
  {
    title: 'L자 6각형 polygon',
    desc: '6각형 L자 모양 + 모든 꼭짓점 직각 표시 + 단일 fill',
    spec: {
      type: 'polygon',
      vertices: [
        [0, 120],
        [200, 120],
        [200, 60],
        [80, 60],
        [80, 0],
        [0, 0],
      ],
      rightAngleMarks: [0, 1, 2, 3, 4, 5],
      fill: '#DBEAFE',
      showLengths: [
        { edge: [5, 0], value: 'a' },
        { edge: [0, 1], value: 'b' },
        { edge: [1, 2], value: 'c' },
        { edge: [2, 3], value: 'd' },
        { edge: [3, 4], value: 'e' },
        { edge: [4, 5], value: 'f' },
      ],
    },
  },
  {
    title: 'T자 8각형 polygon + splitLines',
    desc: 'T자 모양을 2개 직사각형으로 분할 + 모든 변 라벨 + outlineCurve',
    spec: {
      type: 'polygon',
      vertices: [
        [0, 60], [200, 60], [200, 120], [120, 120],
        [120, 200], [80, 200], [80, 120], [0, 120],
      ],
      rightAngleMarks: [0, 1, 2, 3, 4, 5, 6, 7],
      splitLines: [
        { from: 3, to: 6, style: 'dashed' },
      ],
      regions: [
        { vertexIndices: [0, 1, 2, 3, 6, 7], fill: '#FCE7F3', label: '①' },
        { vertexIndices: [6, 3, 4, 5], fill: '#CFFAFE', label: '②' },
      ],
      showLengths: [
        { edge: [7, 0], value: 'a' },
        { edge: [0, 1], value: 'b' },
        { edge: [1, 2], value: 'c' },
        { edge: [2, 3], value: 'd' },
        { edge: [3, 4], value: 'e' },
        { edge: [4, 5], value: 'f' },
        { edge: [5, 6], value: 'g' },
        { edge: [6, 7], value: 'h' },
      ],
      outlineCurve: { inflate: 12 },
    },
  },
  {
    title: 'ㄷ자 8각형 polygon (깊은 오목부)',
    desc: '오목부가 큰 ㄷ자 모양 — 라벨·외곽곡선 외측 배치 검증',
    spec: {
      type: 'polygon',
      vertices: [
        [0, 0], [200, 0], [200, 200], [140, 200],
        [140, 60], [60, 60], [60, 200], [0, 200],
      ],
      rightAngleMarks: [0, 1, 2, 3, 4, 5, 6, 7],
      fill: '#FEF3C7',
      showLengths: [
        { edge: [0, 1], value: 'a' },
        { edge: [1, 2], value: 'b' },
        { edge: [2, 3], value: 'c' },
        { edge: [3, 4], value: 'd' },
        { edge: [4, 5], value: 'e' },
        { edge: [5, 6], value: 'f' },
        { edge: [6, 7], value: 'g' },
        { edge: [7, 0], value: 'h' },
      ],
    },
  },
];

export default function TextbookShapesMockupPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">교과서 도형 렌더링 검증</h1>
        <p className="text-sm text-slate-600 mb-6">
          옵션 A (fill + splitDiagonal) + 옵션 B (polygon 신규) + 옵션 D (outlineCurve 점선 둘레)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cases.map((c, i) => (
            <div key={i} className="bg-white rounded-sm p-5 shadow-sm border border-slate-200">
              <h2 className="font-bold text-slate-800 mb-1">{c.title}</h2>
              {c.desc && <p className="text-xs text-slate-500 mb-3">{c.desc}</p>}
              <div
                className="flex justify-center p-4 bg-slate-50 rounded"
                dangerouslySetInnerHTML={{ __html: renderDiagram(c.spec) }}
                style={{ minHeight: '220px' }}
              />
              <details className="mt-3">
                <summary className="text-xs text-slate-500 cursor-pointer">spec JSON</summary>
                <pre className="mt-2 text-[10px] bg-slate-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(c.spec, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
