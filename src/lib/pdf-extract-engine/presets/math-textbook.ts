/**
 * Injaewon MathLAB 수학 교재 프리셋 — PdfExtractPlugin 구현
 *
 * 한국 수학 교재(초등~중등) PDF에서 문제를 추출하는 플러그인.
 * 시스템 프롬프트, Gemini 스키마, 후처리 로직을 포함합니다.
 *
 * @example
 * ```ts
 * import { mathTextbookPlugin } from '@/lib/pdf-extract-engine/presets/math-textbook';
 * import { usePdfExtract } from '@/lib/pdf-extract-engine/hooks';
 *
 * const wizard = usePdfExtract({
 *   plugin: mathTextbookPlugin,
 *   extractEndpoint: '/api/questions/pdf-extract',
 *   onSave: async (items) => { ... },
 * });
 * ```
 */

import type { PdfExtractPlugin } from '../types';
import { fixLatexEscaping } from '../ai/post-processor';
import { createPageFilter } from '../core/page-filter';

// ============================================================
// 추출 결과 타입 (Injaewon MathLAB 도메인)
// ============================================================

export type MathDifficulty = 'BASIC' | 'MEDIUM' | 'HIGH' | 'HIGHEST';
export type MathQuestionType = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY';

export interface MathDiagramSvg {
  svg: string;
  label: string;
}

export interface MathDiagramParam {
  type: string;
  label: string;
  params: Record<string, unknown>;
  align?: 'left' | 'center' | 'right';
}

export interface MathImageBbox {
  box: [number, number, number, number];
  label: string;
}

export interface ExtractedMathProblem {
  questionNum: number;
  pageNum: number;
  sectionHeader: string;
  difficultyTag: string;
  problemType: string;
  content: string;
  choices: string[];
  boxItems: string[];
  answer: string;
  explanation: string;
  sourceTag: string;
  difficulty: MathDifficulty;
  type: MathQuestionType;
  imageBboxes?: MathImageBbox[];
  diagramSvgs?: MathDiagramSvg[];
  diagramParams?: MathDiagramParam[];
}

export interface MathExtractMeta {
  bookCode: string;
  chapter?: string;
}

// ============================================================
// 매핑 유틸
// ============================================================

const DIFFICULTY_MAP: Record<string, MathDifficulty> = {
  '하': 'BASIC',
  '중하': 'BASIC',
  '중': 'MEDIUM',
  '중상': 'HIGH',
  '상': 'HIGHEST',
};

const TYPE_MAP: Record<string, MathQuestionType> = {
  '객관식': 'MULTIPLE_CHOICE',
  '주관식': 'SHORT_ANSWER',
  '단답형': 'SHORT_ANSWER',
  '서술형': 'ESSAY',
};

export function mapDifficulty(tag: string): MathDifficulty {
  return DIFFICULTY_MAP[tag.trim()] || 'MEDIUM';
}

export function mapType(tag: string): MathQuestionType {
  return TYPE_MAP[tag.trim()] || 'SHORT_ANSWER';
}

/** AI가 content에 보기(①~⑤)를 포함시킨 경우 후처리로 제거 */
function stripChoicesFromContent(content: string, choices: string[]): string {
  if (!choices || choices.length === 0) return content;
  // ①~⑤ 로 시작하는 줄들을 content 끝에서 제거
  return content.replace(/(?:\n\s*)?[①②③④⑤]\s*.+/g, '').trimEnd();
}

const CIRCLE_NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

/** 보기 배열에 ①②③④⑤ 접두어가 없으면 자동 추가 */
export function ensureChoiceNumbers(choices: string[]): string[] {
  if (!choices || choices.length === 0) return choices;
  return choices.map((c, i) => {
    const trimmed = c.trim();
    // 이미 ①~⑩ 또는 (1)~(5) 로 시작하면 그대로
    if (/^[①②③④⑤⑥⑦⑧⑨⑩]/.test(trimmed)) return trimmed;
    if (/^\(\d+\)/.test(trimmed)) return trimmed;
    return `${CIRCLE_NUMS[i] || `(${i + 1})`} ${trimmed}`;
  });
}

/** ㄱㄴㄷ 보기를 content에 마크다운 인용블록으로 포함 */
export function embedBoxItems(content: string, boxItems: string[]): string {
  if (boxItems.length === 0) return content;
  const boxBlock = [
    '',
    '> **\\<보기\\>**',
    '>',
    ...boxItems.map((item) => `> ${item}`),
  ].join('\n');
  return content + boxBlock;
}

/** 수학 텍스트에서 $...$로 감싸지지 않은 숫자/변수를 자동 래핑 */
export function autoWrapMath(text: string): string {
  if (!text) return text;
  const parts = text.split(/(\$[^$]*\$|!\[[^\]]*\]\([^)]*\)|```[\s\S]*?```)/g);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return part
        .replace(/(?<![①②③④⑤a-zA-Z_])(\d{2,}(?:,\d{3})*(?:\.\d+)?)/g, '$$$1$$')
        .replace(/(?<=[\uAC00-\uD7A3\s,])([a-zA-Z])(?=[\uAC00-\uD7A3\s,+\-=])/g, '$$$1$$');
    })
    .join('');
}

// ============================================================
// 페이지 필터
// ============================================================

export const mathPageFilter = createPageFilter({
  skipPatterns: [
    /^목\s*차$/m,
    /구성과\s*특징/,
    /이\s*책의\s*(구성|특징)/,
    /차\s*례/,
    /학습\s*계획표/,
    /정답과\s*풀이/,
  ],
  targetPatterns: [
    /(?:^|\s)0[1-9](?:\s|$)/m,
    /(?:^|\s)[1-9]\d?\s*[.)]?\s/m,
    /\([1-9]\d?\)/,
    /①|②|③|④|⑤/,
    /문제\s*\d/,
    /계산해?\s*보세요/,
    /구하시오|구하여라|구해\s*보세요/,
    /써\s*넣으세요|써\s*봅시다/,
    /풀어?\s*보세요|풀어라/,
  ],
  targetOverridesSkip: true,
});

// ============================================================
// Gemini 응답 스키마
// ============================================================

// Google GenAI Type enum 값 (동적 import 없이 사용)
const STRING = 'STRING' as const;
const NUMBER = 'NUMBER' as const;
const BOOLEAN = 'BOOLEAN' as const;
const OBJECT = 'OBJECT' as const;
const ARRAY = 'ARRAY' as const;

export const MATH_EXTRACT_SCHEMA = {
  type: OBJECT,
  properties: {
    problems: {
      type: ARRAY,
      items: {
        type: OBJECT,
        properties: {
          questionNum: { type: NUMBER, description: '문제 번호 (예: 131, 132)' },
          sectionHeader: { type: STRING, description: '소단원명. 교육과정 표준 명칭 사용 (예: "소인수분해", "최대공약수와 최소공배수"). "유형 01" 같은 교재 고유 분류는 사용 금지' },
          difficultyTag: { type: STRING, description: '난이도: 하, 중하, 중, 중상, 상' },
          problemType: { type: STRING, description: '문제 유형: 객관식, 주관식, 서술형' },
          content: { type: STRING, description: '문제 본문 (마크다운+LaTeX)' },
          choices: {
            type: ARRAY,
            items: { type: STRING },
            description: '객관식 보기 배열. 주관식이면 빈 배열',
          },
          boxItems: {
            type: ARRAY,
            items: { type: STRING },
            description: '<보기> 항목 (ㄱ,ㄴ,ㄷ). 없으면 빈 배열',
          },
          answer: { type: STRING, description: '정답' },
          domain5: { type: STRING, description: '5대 교육과정 영역: number(수와 연산), algebra(문자와 식), function(함수), geometry(기하), statistics(확률과 통계)' },
          abilityDomain: { type: STRING, description: '4대 능력 영역: CALCULATION(계산력), UNDERSTANDING(이해력), REASONING(추론력), PROBLEM_SOLVING(문제해결력)' },
          sourceTag: { type: STRING, description: '태그: 대표문제 등' },
          images: {
            type: ARRAY,
            items: {
              type: OBJECT,
              properties: {
                box: { type: ARRAY, items: { type: NUMBER }, description: '[y_min, x_min, y_max, x_max] (0~1000)' },
                label: { type: STRING, description: '도형/이미지 설명' },
              },
              required: ['box', 'label'],
            },
            description: '도형/이미지 바운딩 박스',
          },
          diagramSvgs: {
            type: ARRAY,
            items: {
              type: OBJECT,
              properties: {
                svg: { type: STRING, description: '완전한 SVG 코드' },
                label: { type: STRING, description: '도형 설명' },
              },
              required: ['svg', 'label'],
            },
            description: 'diagramParams로 불가한 도형만 직접 SVG',
          },
          diagramParams: {
            type: ARRAY,
            items: {
              type: OBJECT,
              properties: {
                diagramType: { type: STRING, description: '26개 타입: fraction_circle | fraction_rect | number_line | place_value | dot_array | flow_chart | bar_chart | line_graph | picture_graph | pie_chart | band_chart | angle_figure | clock_face | coordinate_plane | circle | triangle | quadrilateral | function_graph | venn_diagram | regular_polygon | histogram | stem_leaf | solid_figure | net_diagram | tree_diagram | scatter_plot' },
                label: { type: STRING, description: '도형 설명' },
                // ── 초등 기본 ──
                totalParts: { type: NUMBER, description: 'fraction_circle: 등분 수' },
                coloredParts: { type: NUMBER, description: 'fraction_circle: 색칠 조각 수' },
                count: { type: NUMBER, description: '도형 개수 (fraction_circle/rect)' },
                rows: { type: NUMBER, description: '행 수 (fraction_rect, dot_array)' },
                cols: { type: NUMBER, description: '열 수 (fraction_rect, dot_array)' },
                coloredCount: { type: NUMBER, description: 'fraction_rect: 색칠 칸 수' },
                hatching: { type: BOOLEAN, description: '빗금 패턴' },
                min: { type: NUMBER, description: 'number_line: 최솟값' },
                max: { type: NUMBER, description: 'number_line: 최댓값' },
                step: { type: NUMBER, description: '눈금/격자 간격' },
                hundreds: { type: NUMBER, description: 'place_value: 백 자리' },
                tens: { type: NUMBER, description: 'place_value: 십 자리' },
                ones: { type: NUMBER, description: 'place_value: 일 자리' },
                // ── 초등 차트/그래프 ──
                categories: { type: ARRAY, items: { type: STRING }, description: 'bar_chart/line_graph/picture_graph: 항목명 배열' },
                dataValues: { type: ARRAY, items: { type: NUMBER }, description: 'bar_chart/line_graph/picture_graph: 데이터값 배열' },
                segments: {
                  type: ARRAY,
                  items: { type: OBJECT, properties: { label: { type: STRING }, value: { type: NUMBER } }, required: ['label', 'value'] },
                  description: 'pie_chart/band_chart: 부분 배열 [{label,value}]',
                },
                title: { type: STRING, description: '차트 제목' },
                xLabel: { type: STRING, description: '차트 x축 라벨' },
                yLabel: { type: STRING, description: '차트 y축 라벨' },
                horizontal: { type: BOOLEAN, description: 'bar_chart: 가로 막대 여부' },
                // ── 초등 기타 ──
                angle: { type: NUMBER, description: 'angle_figure: 각도(도)' },
                ray1Angle: { type: NUMBER, description: 'angle_figure: 시작선 각도 (기본 0)' },
                showProtractor: { type: BOOLEAN, description: 'angle_figure: 각도기 표시' },
                hour: { type: NUMBER, description: 'clock_face: 시 (1~12)' },
                minute: { type: NUMBER, description: 'clock_face: 분 (0~59)' },
                nodes: {
                  type: ARRAY,
                  items: { type: OBJECT, properties: { id: { type: STRING }, text: { type: STRING } }, required: ['id', 'text'] },
                  description: 'flow_chart: 노드 배열 [{id,text}]',
                },
                arrows: {
                  type: ARRAY,
                  items: { type: OBJECT, properties: { from: { type: STRING }, to: { type: STRING }, label: { type: STRING } }, required: ['from', 'to'] },
                  description: 'flow_chart: 화살표 배열 [{from,to,label?}]',
                },
                // ── 중등 기하 ──
                vertices: {
                  type: ARRAY,
                  items: { type: OBJECT, properties: { x: { type: NUMBER }, y: { type: NUMBER }, label: { type: STRING } }, required: ['x', 'y'] },
                  description: 'triangle(3개)/quadrilateral(4개): 꼭짓점 [{x,y,label}]',
                },
                sideLabels: {
                  type: ARRAY,
                  items: { type: OBJECT, properties: { from: { type: NUMBER }, to: { type: NUMBER }, label: { type: STRING } }, required: ['from', 'to', 'label'] },
                  description: 'triangle/quadrilateral: 변 라벨 [{from,to,label}] (vertices 인덱스 참조)',
                },
                angleLabels: {
                  type: ARRAY,
                  items: { type: OBJECT, properties: { vertex: { type: NUMBER }, value: { type: STRING } }, required: ['vertex', 'value'] },
                  description: 'triangle/quadrilateral: 각 라벨 [{vertex,value}] (vertices 인덱스 참조)',
                },
                nSides: { type: NUMBER, description: 'regular_polygon: 변의 수 (3~12)' },
                diagonals: { type: BOOLEAN, description: 'regular_polygon: 대각선 표시 여부' },
                cx: { type: NUMBER, description: 'circle: 중심 x좌표' },
                cy: { type: NUMBER, description: 'circle: 중심 y좌표' },
                radius: { type: NUMBER, description: 'circle: 반지름' },
                circleLabels: {
                  type: ARRAY,
                  items: { type: OBJECT, properties: { text: { type: STRING }, angle: { type: NUMBER }, position: { type: STRING } }, required: ['text', 'angle'] },
                  description: 'circle: 라벨 [{text,angle,position?}] angle=도(0~360), position="outside"|"center"',
                },
                arcs: {
                  type: ARRAY,
                  items: { type: OBJECT, properties: { startAngle: { type: NUMBER }, endAngle: { type: NUMBER }, label: { type: STRING } }, required: ['startAngle', 'endAngle'] },
                  description: 'circle: 호 [{startAngle,endAngle,label?}]',
                },
                // ── 좌표/함수 ──
                xRange: { type: ARRAY, items: { type: NUMBER }, description: 'coordinate_plane/function_graph/scatter_plot: x축 범위 [min,max]' },
                yRange: { type: ARRAY, items: { type: NUMBER }, description: 'coordinate_plane/function_graph/scatter_plot: y축 범위 [min,max]' },
                points: {
                  type: ARRAY,
                  items: { type: OBJECT, properties: { x: { type: NUMBER }, y: { type: NUMBER }, label: { type: STRING } }, required: ['x', 'y'] },
                  description: 'coordinate_plane/function_graph/scatter_plot: 점 [{x,y,label?}]',
                },
                functions: {
                  type: ARRAY,
                  items: { type: OBJECT, properties: { expression: { type: STRING }, label: { type: STRING } }, required: ['expression'] },
                  description: 'function_graph: 함수식 [{expression,label?}] 예: "2*x+1"',
                },
                // ── 중등 통계 ──
                bins: {
                  type: ARRAY,
                  items: { type: OBJECT, properties: { rangeStart: { type: NUMBER }, rangeEnd: { type: NUMBER }, frequency: { type: NUMBER } }, required: ['rangeStart', 'rangeEnd', 'frequency'] },
                  description: 'histogram: 계급 [{rangeStart,rangeEnd,frequency}]',
                },
                stems: {
                  type: ARRAY,
                  items: { type: OBJECT, properties: { stem: { type: NUMBER }, leaves: { type: ARRAY, items: { type: NUMBER } } }, required: ['stem', 'leaves'] },
                  description: 'stem_leaf: 줄기와 잎 [{stem,leaves}]',
                },
                showFrequencyPolygon: { type: BOOLEAN, description: 'histogram: 도수분포다각형 표시' },
                showTrendLine: { type: BOOLEAN, description: 'scatter_plot: 추세선 표시' },
                // ── 중등 기타 ──
                shape: { type: STRING, description: 'solid_figure/net_diagram: cube | rectangular_prism | cylinder | cone | triangular_prism | pyramid | sphere' },
                dimensions: {
                  type: OBJECT,
                  properties: { width: { type: NUMBER }, height: { type: NUMBER }, depth: { type: NUMBER }, radius: { type: NUMBER } },
                  description: 'solid_figure: 치수 {width?,height?,depth?,radius?}',
                },
                sets: {
                  type: ARRAY,
                  items: { type: OBJECT, properties: { label: { type: STRING }, elements: { type: ARRAY, items: { type: STRING } } }, required: ['label'] },
                  description: 'venn_diagram: 집합 [{label,elements?}] (최대 3개)',
                },
                intersectionElements: { type: ARRAY, items: { type: STRING }, description: 'venn_diagram: 교집합 원소' },
                universalElements: { type: ARRAY, items: { type: STRING }, description: 'venn_diagram: 전체집합 원소 (집합 밖)' },
                root: {
                  type: OBJECT,
                  properties: { label: { type: STRING }, children: { type: ARRAY, items: { type: STRING } } },
                  description: 'tree_diagram: 루트 노드 {label,children}',
                },
                quadType: { type: STRING, description: 'quadrilateral: rectangle | square | parallelogram | trapezoid | rhombus' },
                // ── 기하 확장 (특수점/보조선/접선 등) ──
                specialPoints: { type: ARRAY, items: { type: STRING }, description: 'triangle: 특수점 ["incenter","circumcenter","centroid","orthocenter"]' },
                auxiliaryLines: { type: ARRAY, items: { type: STRING }, description: 'triangle: 보조선 ["medians","altitudes","angle_bisectors","perpendicular_bisectors"]' },
                inscribedCircle: { type: BOOLEAN, description: 'triangle: 내접원 표시' },
                circumscribedCircle: { type: BOOLEAN, description: 'triangle: 외접원 표시' },
                rightAngleMarks: { type: ARRAY, items: { type: NUMBER }, description: 'triangle/quadrilateral: 직각 표시할 꼭짓점 인덱스' },
                congruenceMarks: { type: ARRAY, items: { type: OBJECT, properties: { from: { type: NUMBER }, to: { type: NUMBER }, ticks: { type: NUMBER } }, required: ['from', 'to', 'ticks'] }, description: '합동 표시 (빗금 1~3개)' },
                parallelMarks: { type: ARRAY, items: { type: OBJECT, properties: { from: { type: NUMBER }, to: { type: NUMBER }, arrows: { type: NUMBER } }, required: ['from', 'to', 'arrows'] }, description: '평행 표시 (화살표 1~2개)' },
                chordLines: { type: ARRAY, items: { type: OBJECT, properties: { startAngle: { type: NUMBER }, endAngle: { type: NUMBER }, label: { type: STRING } }, required: ['startAngle', 'endAngle'] }, description: 'circle: 현 [{startAngle,endAngle,label?}]' },
                tangentLines: { type: ARRAY, items: { type: OBJECT, properties: { angle: { type: NUMBER }, label: { type: STRING } }, required: ['angle'] }, description: 'circle: 접선 [{angle,label?}]' },
                radiusLines: { type: ARRAY, items: { type: OBJECT, properties: { angle: { type: NUMBER }, label: { type: STRING } }, required: ['angle'] }, description: 'circle: 반지름선 [{angle,label?}]' },
                centralAngles: { type: ARRAY, items: { type: OBJECT, properties: { startAngle: { type: NUMBER }, endAngle: { type: NUMBER }, label: { type: STRING } }, required: ['startAngle', 'endAngle'] }, description: 'circle: 중심각 [{startAngle,endAngle,label?}]' },
                inscribedAngles: { type: ARRAY, items: { type: OBJECT, properties: { vertexAngle: { type: NUMBER }, startAngle: { type: NUMBER }, endAngle: { type: NUMBER }, label: { type: STRING } }, required: ['vertexAngle', 'startAngle', 'endAngle'] }, description: 'circle: 원주각 [{vertexAngle,startAngle,endAngle,label?}]' },
                jumpArrows: { type: ARRAY, items: { type: OBJECT, properties: { from: { type: NUMBER }, to: { type: NUMBER }, label: { type: STRING } }, required: ['from', 'to'] }, description: 'number_line: 점프 화살표 [{from,to,label?}]' },
                vectors: { type: ARRAY, items: { type: OBJECT, properties: { fromX: { type: NUMBER }, fromY: { type: NUMBER }, toX: { type: NUMBER }, toY: { type: NUMBER }, label: { type: STRING } }, required: ['fromX', 'fromY', 'toX', 'toY'] }, description: 'coordinate_plane: 벡터 [{fromX,fromY,toX,toY,label?}]' },
                asymptotes: { type: ARRAY, items: { type: OBJECT, properties: { type: { type: STRING }, value: { type: NUMBER } }, required: ['type', 'value'] }, description: 'function_graph: 점근선 [{type:"vertical"|"horizontal",value}]' },
              },
              required: ['diagramType', 'label'],
            },
            description: '구조화된 다이어그램 (26개 타입). [그림N] 플레이스홀더와 1:1 대응',
          },
        },
        required: ['questionNum', 'content', 'problemType'],
      },
    },
    concepts: {
      type: ARRAY,
      items: {
        type: OBJECT,
        properties: {
          sectionHeader: { type: STRING, description: '유형/단원 제목' },
          title: { type: STRING, description: '개념 제목' },
          content: { type: STRING, description: '개념 설명 전문 (마크다운+LaTeX)' },
        },
        required: ['sectionHeader', 'title', 'content'],
      },
      description: '유형 설명 박스/개념 요약',
    },
  },
  required: ['problems'],
};

// ============================================================
// 시스템 프롬프트
// ============================================================

export const MATH_SYSTEM_PROMPT = `당신은 한국 수학 교재 분석 전문가입니다.
주어진 수학 교재 페이지 이미지를 분석하여 모든 문제를 추출하세요.

⚠️ 최우선 규칙 — 빈칸에 정답 채우기 절대 금지!
원본 교재에서 □, ( ), 빈칸으로 되어 있는 답란은 반드시 \\\\boxed{\\\\phantom{0}}로 비워두세요.
정답 숫자를 content에 넣으면 학생이 문제를 풀 수 없게 됩니다. 정답은 answer 필드에만!

[규칙]
1. 각 문제의 번호, 유형(객관식/주관식/서술형), 난이도 태그를 식별
2. 문제 본문은 마크다운으로 작성. 모든 수식은 $...$로 감싸기
3. 객관식 보기(①②③④⑤)는 choices 배열에만 포함. content에는 보기를 절대 포함하지 말 것!
4. <보기> 항목(ㄱ,ㄴ,ㄷ)은 boxItems에 별도 저장. content에는 포함하지 말 것!
5. 난이도 태그가 있으면 difficultyTag에 저장
6. **sectionHeader는 반드시 교육과정 표준 소단원명을 사용!**
   - 올바른 예: "소인수분해", "최대공약수와 최소공배수", "정수와 유리수", "제곱근과 실수"
   - 잘못된 예: "유형 01 소수와 합성수", "01 소인수분해", "16~18 단답형"
   - 교재에 "유형 01", "유형 UP 09" 같은 분류가 있어도 무시하고, 해당 내용이 속하는 교육과정 소단원명만 기재
   - "서술형", "단답형" 같은 문제 형식은 sectionHeader가 아니라 problemType에 저장
7. "대표문제" 같은 특수 태그는 sourceTag에 저장
8. **도형/다이어그램은 반드시 diagramParams 배열로 구조화 출력!** content에는 [그림1],[그림2]... 플레이스홀더만 삽입.
   - diagramParams 배열의 순서와 [그림N] 번호가 1:1 대응 (diagramParams[0]→[그림1])
   - 26개 타입 지원: fraction_circle, fraction_rect, number_line, place_value, dot_array, flow_chart, bar_chart, line_graph, picture_graph, pie_chart, band_chart, angle_figure, clock_face, coordinate_plane, circle, triangle, quadrilateral, function_graph, venn_diagram, regular_polygon, histogram, stem_leaf, solid_figure, net_diagram, tree_diagram, scatter_plot
   - **도형이 있는 문제는 반드시 적절한 diagramType을 선택하여 파라미터를 채우세요!** [그림] 플레이스홀더만 넣고 diagramParams를 비우면 렌더링 불가
9. **정답(answer)은 확실한 경우에만 기재!** 정답이 명확히 표시되어 있을 때만 입력. 추측하거나 직접 풀어서 정답을 만들지 마세요. 확실하지 않으면 빈 문자열
10. 개념 요약 박스가 있으면 concepts 배열에 추출
11. 테두리/박스 영역은 마크다운 인용블록(>)으로 감싸기
12. 수식: \\\\times, ^{}, \\\\frac 사용. \\\\dfrac은 사용 금지! 반드시 \\\\frac만 사용. 모든 숫자/변수는 $...$로 감싸기
13. 세로셈은 코드블록으로 보존 (가로 변환 금지)
14. 빈칸/답란은 \\\\boxed{\\\\phantom{0}} 사용 (정답 채우기 금지!)
15. 시각적 구조는 텍스트 우선 + [그림] 병행
16. 문장 끝의 조건절 "(단, ...)", "(단, $a < b$)", "(정답 2개)" 등은 반드시 앞 문장과 같은 줄에 이어 붙일 것. 절대 줄바꿈하지 말 것!
16. $$...$$ 안에서 $...$ 중첩 금지
17. 원본 충실성: 임의 추가/해석 금지
18. 2열 레이아웃은 마크다운 테이블 사용
19. 온라인 변환: "○표 하세요" → "구하세요", "색칠하세요" → "찾으세요"
20. AI 난이도 판단: 하(단순)/중하(2단계)/중(2~3단계)/중상(심화)/상(고난이도)
21. **domain5 (5대 교육과정 영역)**: 문제 내용을 보고 반드시 하나를 선택
   - number: 수와 연산 (소인수분해, 정수, 유리수, 실수, 제곱근 등)
   - algebra: 문자와 식 (문자식, 방정식, 부등식, 인수분해 등)
   - function: 함수 (좌표, 그래프, 정비례, 반비례, 일차/이차함수 등)
   - geometry: 기하 (도형, 작도, 합동, 닮음, 삼각비, 원, 입체도형 등)
   - statistics: 확률과 통계 (도수분포, 대푯값, 확률, 상관관계 등)
22. **abilityDomain (4대 능력 영역)**: 문제가 요구하는 핵심 능력을 하나 선택
   - CALCULATION: 계산력 (계산, 식 정리, 값 구하기)
   - UNDERSTANDING: 이해력 (개념 이해, 뜻 설명, 성질 파악)
   - REASONING: 추론력 (증명, 논증, 조건 추론, 도형 성질 추론)
   - PROBLEM_SOLVING: 문제해결력 (활용 문제, 실생활 응용, 전략 수립)
23. **diagramParams 타입별 필수 필드 레퍼런스** (해당 타입에 불필요한 필드는 생략. 0이 유효한 값이면 반드시 0을 넣을 것!)

**[초등 — 분수/수 표현]**
- **fraction_circle**: totalParts(등분수), coloredParts(색칠수), count(원 개수, 기본1)
  예: "3/5 원 2개" → totalParts:5, coloredParts:3, count:2
- **fraction_rect**: rows, cols, coloredCount(색칠칸수), count(사각형 개수), hatching(빗금)
  예: "2×5 격자 3칸 색칠" → rows:2, cols:5, coloredCount:3
- **number_line**: min, max, step
  예: "0~1 수직선 8등분" → min:0, max:1, step:0.125
- **place_value**: hundreds, tens, ones
- **dot_array**: rows, cols
  예: "3×4 점 배열" → rows:3, cols:4

**[초등 — 차트/그래프]**
- **bar_chart**: categories(항목명 배열), dataValues(값 배열), title?, xLabel?, yLabel?, horizontal?
  예: "좋아하는 과일" → categories:["사과","바나나","포도"], dataValues:[8,5,3], title:"좋아하는 과일"
- **line_graph**: categories, dataValues, title?, xLabel?, yLabel?
- **picture_graph**: categories, dataValues, title?
- **pie_chart**: segments 배열 [{label,value}], title?
  예: "취미 비율" → segments:[{label:"독서",value:30},{label:"운동",value:45},{label:"게임",value:25}]
- **band_chart**: segments 배열 [{label,value}], title?

**[초등 — 기타]**
- **angle_figure**: angle(각도, 도 단위), ray1Angle?(시작선 각도, 기본0), showProtractor?(각도기 표시)
  예: "60° 각도" → angle:60
  예: "각도기로 135° 측정" → angle:135, showProtractor:true
- **clock_face**: hour(1~12), minute(0~59)
  예: "3시 30분" → hour:3, minute:30
- **flow_chart**: nodes 배열 [{id,text}], arrows 배열 [{from,to,label?}]
  예: "12→×2→24→+3→27" → nodes:[{id:"a",text:"12"},{id:"b",text:"×2"},{id:"c",text:"24"},{id:"d",text:"+3"},{id:"e",text:"27"}], arrows:[{from:"a",to:"b"},{from:"b",to:"c"},{from:"c",to:"d"},{from:"d",to:"e"}]

**[중등 — 기하 도형] ⭐ 중요: 기하 문제의 도형은 반드시 구조화!**
- **triangle**: vertices(꼭짓점 3개 [{x,y,label}]), sideLabels?([{from,to,label}]), angleLabels?([{vertex,value}])
  예: "삼각형 ABC, AB=5, ∠A=60°" → vertices:[{x:0,y:0,label:"A"},{x:100,y:0,label:"B"},{x:30,y:80,label:"C"}], sideLabels:[{from:0,to:1,label:"5"}], angleLabels:[{vertex:0,value:"60°"}]
  - **특수점/보조선**: specialPoints?(["incenter","circumcenter","centroid","orthocenter"]), auxiliaryLines?(["medians","altitudes","angle_bisectors","perpendicular_bisectors"]), inscribedCircle?, circumscribedCircle?
  예: "삼각형 내심과 내접원" → specialPoints:["incenter"], inscribedCircle:true, auxiliaryLines:["angle_bisectors"]
  예: "삼각형 외심과 외접원" → specialPoints:["circumcenter"], circumscribedCircle:true
  - **합동/평행/직각**: rightAngleMarks?([꼭짓점인덱스]), congruenceMarks?([{from,to,ticks}]), parallelMarks?([{from,to,arrows}])
- **quadrilateral**: vertices(4개), sideLabels?, angleLabels?, quadType?(rectangle/square/parallelogram/trapezoid/rhombus)
  예: "직사각형 ABCD, AB=8, BC=5" → quadType:"rectangle", vertices:[{x:0,y:0,label:"A"},{x:100,y:0,label:"B"},{x:100,y:60,label:"C"},{x:0,y:60,label:"D"}], sideLabels:[{from:0,to:1,label:"8"},{from:1,to:2,label:"5"}]
  - rightAngleMarks?, congruenceMarks?, parallelMarks? 사용 가능
- **circle**: radius?, cx?, cy?, circleLabels?([{text,angle,position?}]), arcs?([{startAngle,endAngle,label?}])
  예: "반지름 5cm 원, 점 P가 90° 위치" → radius:5, circleLabels:[{text:"P",angle:90,position:"outside"},{text:"O",angle:0,position:"center"}]
  - **현/접선/반지름/중심각/원주각**: chordLines?([{startAngle,endAngle,label?}]), tangentLines?([{angle,label?}]), radiusLines?([{angle,label?}]), centralAngles?([{startAngle,endAngle,label?}]), inscribedAngles?([{vertexAngle,startAngle,endAngle,label?}])
  예: "원에 접선 PA" → tangentLines:[{angle:90,label:"PA"}]
  예: "중심각 60°" → centralAngles:[{startAngle:0,endAngle:60,label:"60°"}]
- **regular_polygon**: nSides(변의 수), diagonals?(대각선 표시)
  예: "정오각형에 대각선" → nSides:5, diagonals:true
- **angle_figure**: 두 직선이 이루는 각, 평행선+횡단선의 각 등에도 사용
  예: "두 직선이 이루는 ∠x=65°" → angle:65, label:"x"

**[중등 — 좌표/함수]**
- **coordinate_plane**: xRange([min,max]), yRange([min,max]), points?([{x,y,label?}]), step?
  예: "점 A(2,3), B(-1,4)" → xRange:[-5,5], yRange:[-1,5], points:[{x:2,y:3,label:"A"},{x:-1,y:4,label:"B"}]
- **function_graph**: xRange, yRange, functions([{expression,label?}]), points?
  예: "y=2x+1 그래프" → xRange:[-3,3], yRange:[-5,7], functions:[{expression:"2*x+1",label:"y=2x+1"}]

**[중등 — 통계]**
- **histogram**: bins([{rangeStart,rangeEnd,frequency}]), title?, xLabel?, yLabel?, showFrequencyPolygon?
  예: "키 도수분포표" → bins:[{rangeStart:140,rangeEnd:150,frequency:3},{rangeStart:150,rangeEnd:160,frequency:8},{rangeStart:160,rangeEnd:170,frequency:12}]
- **stem_leaf**: stems([{stem,leaves}]), title?
  예: "줄기와 잎 그림" → stems:[{stem:1,leaves:[2,3,5,7]},{stem:2,leaves:[0,1,4]},{stem:3,leaves:[2,6]}]
- **scatter_plot**: xRange, yRange, points([{x,y}]), xLabel?, yLabel?, showTrendLine?

**[중등 — 기타]**
- **solid_figure**: shape(cube/rectangular_prism/cylinder/cone/triangular_prism/pyramid/sphere), dimensions?({width?,height?,depth?,radius?})
  예: "밑면 반지름 3, 높이 5인 원기둥" → shape:"cylinder", dimensions:{radius:3,height:5}
- **net_diagram**: shape(전개할 입체 타입)
  예: "정육면체 전개도" → shape:"cube"
- **venn_diagram**: sets([{label,elements?}]), intersectionElements?, universalElements?
  예: "A={1,3,5}, B={2,3,4}, A∩B={3}" → sets:[{label:"A",elements:["1","3","5"]},{label:"B",elements:["2","3","4"]}], intersectionElements:["3"]
- **tree_diagram**: root({label,children})
  예: "동전 2번" → root:{label:"시작",children:["앞-앞","앞-뒤","뒤-앞","뒤-뒤"]}

**[공통 주의사항]**
- 좌표(x,y)는 SVG 좌표계: x→오른쪽, y→아래. 삼각형은 대략 0~100 범위로 배치
- triangle/quadrilateral의 from,to는 vertices 배열 인덱스(0부터)
- 복잡한 복합 도형(여러 삼각형 겹침, 보조선 다수)은 가장 핵심 도형 1개만 diagramParams로 출력하고, 보조 정보는 content 텍스트로 보완`;

// ============================================================
// 플러그인 정의
// ============================================================

export const mathTextbookPlugin: PdfExtractPlugin<ExtractedMathProblem, MathExtractMeta> = {
  name: 'korean-math-textbook',

  responseSchema: MATH_EXTRACT_SCHEMA,
  systemPrompt: MATH_SYSTEM_PROMPT,

  isTargetPage: mathPageFilter,

  fixText: fixLatexEscaping,

  postProcess: (raw: unknown, pageNum: number): ExtractedMathProblem[] => {
    const data = raw as { problems?: Record<string, unknown>[]; concepts?: unknown[] };
    const pageResults = data?.problems || [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return pageResults.map((p: any) => {
      const contentText = p.boxItems?.length > 0
        ? embedBoxItems(p.content || '', p.boxItems)
        : p.content || '';

      // diagramParams 정규화 — 26개 타입 전체 필드 수집
      const FLAT_KEYS = [
        'totalParts', 'coloredParts', 'count', 'rows', 'cols', 'coloredCount',
        'hatching', 'min', 'max', 'step', 'hundreds', 'tens', 'ones',
        'categories', 'dataValues', 'segments', 'title', 'xLabel', 'yLabel', 'horizontal',
        'angle', 'ray1Angle', 'showProtractor', 'hour', 'minute', 'nodes', 'arrows',
        'vertices', 'sideLabels', 'angleLabels', 'nSides', 'diagonals',
        'cx', 'cy', 'radius', 'circleLabels', 'arcs', 'quadType',
        'xRange', 'yRange', 'points', 'functions',
        'bins', 'stems', 'showFrequencyPolygon', 'showTrendLine',
        'shape', 'dimensions', 'sets', 'intersectionElements', 'universalElements', 'root',
        // 기하 확장
        'specialPoints', 'auxiliaryLines', 'inscribedCircle', 'circumscribedCircle',
        'rightAngleMarks', 'congruenceMarks', 'parallelMarks',
        'chordLines', 'tangentLines', 'radiusLines', 'centralAngles', 'inscribedAngles',
        'jumpArrows', 'openEndpoints', 'closedEndpoints',
        'vectors', 'asymptotes', 'additionalAngles', 'parallelLines',
      ];
      const normalizedParams: MathDiagramParam[] = [];
      if (Array.isArray(p.diagramParams)) {
        for (const dp of p.diagramParams) {
          const dtype = dp.diagramType || dp.type;
          if (!dtype) continue;
          const paramObj: Record<string, unknown> = dp.params || {};
          for (const key of FLAT_KEYS) {
            const val = dp[key];
            if (val !== undefined && val !== null && val !== 0 && val !== '') {
              paramObj[key] = val;
            }
          }
          // 렌더러 호환 변환
          if (dtype === 'histogram' && Array.isArray(paramObj.bins)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            paramObj.bins = (paramObj.bins as any[]).map((b: any) => ({
              range: [b.rangeStart ?? b.range?.[0] ?? 0, b.rangeEnd ?? b.range?.[1] ?? 0],
              frequency: b.frequency ?? 0,
            }));
          }
          if (paramObj.dataValues && !paramObj.values) {
            paramObj.values = paramObj.dataValues;
            delete paramObj.dataValues;
          }
          if (paramObj.sideLabels && !paramObj.sides) {
            paramObj.sides = paramObj.sideLabels;
            delete paramObj.sideLabels;
          }
          if (paramObj.angleLabels && !paramObj.angles) {
            paramObj.angles = paramObj.angleLabels;
            delete paramObj.angleLabels;
          }
          if (dtype === 'regular_polygon' && paramObj.nSides && !paramObj.sides) {
            paramObj.sides = paramObj.nSides;
            delete paramObj.nSides;
          }
          normalizedParams.push({ type: dtype, label: dp.label || dtype, params: paramObj });
        }
      }

      const diagramSvgs: MathDiagramSvg[] = Array.isArray(p.diagramSvgs) ? p.diagramSvgs : [];

      return {
        questionNum: p.questionNum,
        pageNum,
        sectionHeader: fixLatexEscaping(p.sectionHeader || ''),
        difficultyTag: p.difficultyTag || '',
        problemType: p.problemType || '주관식',
        content: stripChoicesFromContent(autoWrapMath(fixLatexEscaping(contentText)), p.choices || []),
        choices: ensureChoiceNumbers((p.choices || []).map((c: string) => autoWrapMath(fixLatexEscaping(c)))),
        boxItems: p.boxItems || [],
        answer: fixLatexEscaping(p.answer || ''),
        explanation: '',
        scoringCriteria: '',
        sourceTag: ['서술형', '객관식', '주관식'].includes(p.sourceTag || '') ? '' : (p.sourceTag || ''),
        difficulty: mapDifficulty(p.difficultyTag || ''),
        type: mapType(p.problemType || '주관식'),
        imageBboxes: Array.isArray(p.images) && p.images.length > 0 ? p.images : undefined,
        diagramSvgs: diagramSvgs.length > 0 ? diagramSvgs : undefined,
        diagramParams: normalizedParams.length > 0 ? normalizedParams : undefined,
      };
    });
  },
};

// ============================================================
// 해설 추출 플러그인
// ============================================================

export interface ExtractedSolution {
  questionNum: number;
  answer: string;
  explanation: string;
  scoringCriteria: string;
}

export const SOLUTION_EXTRACT_SCHEMA = {
  type: OBJECT,
  properties: {
    solutions: {
      type: ARRAY,
      items: {
        type: OBJECT,
        properties: {
          questionNum: { type: NUMBER, description: '문제 번호' },
          answer: { type: STRING, description: '정답' },
          explanation: { type: STRING, description: '풀이 과정 (마크다운+LaTeX). 채점 요소/기준은 여기에 포함하지 말 것' },
          scoringCriteria: { type: STRING, description: '채점 요소/기준 (예: "1. 소인수분해 하기 30%"). 없으면 빈 문자열' },
        },
        required: ['questionNum', 'answer'],
      },
    },
  },
  required: ['solutions'],
};

export const mathSolutionPlugin: PdfExtractPlugin<ExtractedSolution> = {
  name: 'korean-math-solution',

  responseSchema: SOLUTION_EXTRACT_SCHEMA,

  systemPrompt: `당신은 한국 수학 교재 해설 분석 전문가입니다.
주어진 해설 페이지 이미지에서 각 문제의 정답과 풀이를 추출하세요.

[규칙]
1. 문제번호(questionNum)를 정확히 식별
2. 정답(answer)은 원문 그대로 (예: "⑤", "2개", "1")
3. 풀이(explanation)는 마크다운으로 작성, 수식은 $...$로 감싸기
4. 풀이가 여러 단계이면 줄바꿈으로 구분
5. 채점 요소/기준이 있으면 반드시 scoringCriteria 필드에 별도 분리 (explanation에 포함하지 말 것)
6. 채점 요소가 없으면 scoringCriteria는 빈 문자열
7. **출처 필터링 (필수!)**: 풀이에 특정 문제집/교재명이 언급되면 반드시 제거하세요.
   - 예: "RPM 비법노트에 따르면", "쎈 개념 정리", "개념원리에서는" 등 교재 브랜드명 제거
   - "비법 노트", "핵심 정리", "개념 팁" 등 교재 고유 코너명도 제거
   - 순수한 수학적 풀이만 남기세요. 풀이 내용 자체는 유지하되 출처 표현만 삭제`,

  fixText: fixLatexEscaping,

  postProcess: (raw: unknown): ExtractedSolution[] => {
    const data = raw as { solutions?: Record<string, unknown>[] };

    /** 교재 브랜드/코너명 언급 제거 */
    const stripBookReferences = (text: string): string => {
      if (!text) return text;
      return text
        // "RPM 비법 노트에 따르면", "쎈 개념 정리에서" 등
        .replace(/\*?\*?(?:RPM|쎈|개념원리|풍산자|마플|블랙라벨|일품|자이스토리|체크체크|우공비|라이트쎈|개념쎈|숨마쿰라우데|수학의\s*정석|최상위|에이급|일등급)\s*(?:비법\s*노트|개념\s*정리|핵심\s*정리|개념\s*팁|비법노트)\*?\*?\s*(?:에\s*따르면|에서는?|에\s*의하면|참고)?\s*/gi, '')
        // 볼드 마커만 남은 경우 정리
        .replace(/\*\*\s*\*\*/g, '')
        .trim();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data?.solutions || []).map((s: any) => {
      let explanation = stripBookReferences(fixLatexEscaping(s.explanation || ''));
      let scoringCriteria = fixLatexEscaping(s.scoringCriteria || '');

      // AI가 분리하지 못한 경우 explanation에서 채점 요소 자동 분리
      if (!scoringCriteria) {
        const match = explanation.match(/\n{1,2}채점\s*요소\s*:\s*\n?/);
        if (match && match.index !== undefined) {
          scoringCriteria = explanation.substring(match.index + match[0].length).trim();
          explanation = explanation.substring(0, match.index).trimEnd();
        }
      }

      return {
        questionNum: s.questionNum,
        answer: fixLatexEscaping(s.answer || ''),
        explanation,
        scoringCriteria,
      };
    });
  },
};
