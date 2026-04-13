/**
 * 교과서 문제 다이어그램 백필 스크립트
 *
 * - 408문제(1-1, 그림 필요/diagram 없음)를 source PDF별로 묶어 Gemini Vision에 전송
 * - 1차: DiagramParam 구조화 추출 (26 타입)
 * - 2차 폴백: raw SVG 생성 (diagramSVG 필드)
 *
 * 사용:
 *   npx tsx scripts/backfill-diagrams.ts --tier=1 --limit=10                # 파일럿
 *   npx tsx scripts/backfill-diagrams.ts --tier=1 --dry-run                 # 비용 추정만
 *   npx tsx scripts/backfill-diagrams.ts --tier=all                         # 전체 408
 */
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI, Type } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DIAGRAM_PARAM_ITEM_SCHEMA } from '../src/lib/constants/diagram-schema';
import { normalizeDiagramParams } from '../src/lib/utils/diagram-param-collect';

// 26 정식 타입 — enum 강제용
const VALID_DIAGRAM_TYPES = [
  'fraction_circle', 'fraction_rect', 'number_line', 'place_value', 'dot_array',
  'flow_chart', 'bar_chart', 'line_graph', 'picture_graph', 'pie_chart', 'band_chart',
  'angle_figure', 'clock_face', 'coordinate_plane', 'circle', 'triangle', 'quadrilateral',
  'function_graph', 'venn_diagram', 'regular_polygon', 'histogram', 'stem_leaf',
  'solid_figure', 'net_diagram', 'tree_diagram', 'scatter_plot',
];

// 타입별 최소 필수 필드 (이게 비어있으면 saneityCheck 실패 → SVG 폴백)
function isParamSane(p: { type?: string; params?: Record<string, unknown> }): { ok: boolean; reason?: string } {
  if (!p?.type || !VALID_DIAGRAM_TYPES.includes(p.type)) return { ok: false, reason: `잘못된 type: ${p?.type}` };
  const r = (p.params || {}) as Record<string, unknown>;
  const arr = (k: string) => Array.isArray(r[k]) ? (r[k] as unknown[]).length : 0;
  const num = (k: string) => typeof r[k] === 'number';
  switch (p.type) {
    case 'triangle':
    case 'quadrilateral':
    case 'regular_polygon':
      if (arr('vertices') < 3) return { ok: false, reason: `${p.type}: vertices < 3` };
      return { ok: true };
    case 'circle':
      if (!num('cx') || !num('cy') || !num('radius')) return { ok: false, reason: 'circle: cx/cy/radius 누락' };
      return { ok: true };
    case 'coordinate_plane':
      if (arr('xRange') < 2 || arr('yRange') < 2) return { ok: false, reason: 'coordinate_plane: xRange/yRange 누락' };
      return { ok: true };
    case 'function_graph':
      if (arr('functions') < 1) return { ok: false, reason: 'function_graph: functions 빈 배열' };
      return { ok: true };
    case 'number_line':
      if (!num('min') || !num('max')) return { ok: false, reason: 'number_line: min/max 누락' };
      return { ok: true };
    case 'bar_chart': case 'histogram': case 'pie_chart': case 'band_chart': case 'line_graph':
      if (arr('data') < 1 && arr('values') < 1 && arr('items') < 1) return { ok: false, reason: `${p.type}: data 빈` };
      return { ok: true };
    case 'flow_chart': case 'tree_diagram':
      if (arr('nodes') < 1) return { ok: false, reason: `${p.type}: nodes 빈` };
      return { ok: true };
    case 'solid_figure':
      if (!r.shape) return { ok: false, reason: 'solid_figure: shape 누락' };
      return { ok: true };
    case 'venn_diagram':
      if (arr('sets') < 2) return { ok: false, reason: 'venn_diagram: sets < 2' };
      return { ok: true };
    case 'stem_leaf':
      if (arr('data') < 1) return { ok: false, reason: 'stem_leaf: data 빈' };
      return { ok: true };
    default:
      return { ok: true };
  }
}

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

// CLI 파싱
const args = process.argv.slice(2);
const opts = {
  tier: getArg('--tier') || 'all',
  limit: parseInt(getArg('--limit') || '0', 10),
  dryRun: args.includes('--dry-run'),
  modelOverride: getArg('--model'),
};

function getArg(key: string): string | undefined {
  const a = args.find(a => a.startsWith(key + '='));
  return a?.split('=')[1];
}

// 단원별 차등 모델
const TIER_CONFIG = {
  1: {
    name: '자료/좌표/수직선 (단순)',
    chapters: ['자료의 정리와 해석', '좌표와 그래프', '정비례와 반비례', '정수와 유리수', '문자의 사용과 식', '일차방정식', '소인수분해'],
    model: 'gemini-2.5-flash',
    thinking: false,
  },
  2: {
    name: '평면/기본도형 (중간)',
    chapters: ['평면도형', '기본 도형'],
    model: 'gemini-2.5-flash',
    thinking: true,
  },
  3: {
    name: '입체/작도 (어려움)',
    chapters: ['입체도형', '작도와 합동'],
    model: 'gemini-3-pro-preview',
    thinking: false,
  },
};

// 그림 필요 키워드 (estimate-diagram-coverage.ts 동일)
const NEED_KEYWORDS = ['그림', '도형', '그래프', '좌표평면', '수직선', '전개도', '삼각형', '사각형', '평행사변형', '마름모', '직사각형', '사다리꼴', '히스토그램', '막대그래프', '도수분포', '입체', '각기둥', '각뿔', '원기둥', '원뿔', '다음과 같'];
const NEED_REGEX = new RegExp(NEED_KEYWORDS.join('|'));

// PDF 파일명 추출 (source 필드 → 실제 파일 경로)
const PDF_INDEX = indexPdfs('G:/중등교과서/중1');

function indexPdfs(dir: string, files: string[] = []): string[] {
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) indexPdfs(full, files);
      else if (e.name.toLowerCase().endsWith('.pdf')) files.push(full);
    }
  } catch {}
  return files;
}

function findPdfPath(source: string): string | null {
  const m = source.match(/([^\\\/]+\.pdf)/i);
  if (!m) return null;
  let fname = m[1].trim();
  const dashIdx = fname.lastIndexOf(' - ');
  if (dashIdx >= 0) fname = fname.slice(dashIdx + 3);
  const sep1 = '/' + fname;
  const sep2 = path.sep + fname;
  return PDF_INDEX.find(p => p.endsWith(fname) || p.endsWith(sep1) || p.endsWith(sep2)) || null;
}

// 1차 PASS 스키마: DiagramParam만 (SVG 옵션 없음)
const PASS1_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          inputId: { type: Type.NUMBER, description: '입력에 명시된 inputId 그대로 (PDF의 표시 번호 아님)' },
          contentMatch: { type: Type.STRING, description: 'PDF에서 매칭한 문제 본문 첫 30자 (DB와 일치 검증용)' },
          status: { type: Type.STRING, description: 'has_diagram | no_diagram_needed | not_found' },
          canExpressAsDiagramParams: { type: Type.BOOLEAN, description: 'DiagramParam 26 타입으로 표현 가능한가' },
          diagramParams: {
            type: Type.ARRAY,
            items: DIAGRAM_PARAM_ITEM_SCHEMA,
            description: 'canExpressAsDiagramParams=true일 때만 채움. 26 타입의 정확한 파라미터.',
            nullable: true,
          },
          fallbackReason: { type: Type.STRING, description: 'canExpressAsDiagramParams=false인 경우 사유 (예: 회전체, 작도과정, 복합입체)', nullable: true },
        },
        required: ['inputId', 'status'],
      },
    },
  },
  required: ['results'],
};

// 2차 PASS 스키마: SVG만 생성 (1차에서 폴백 표시된 문제)
const PASS2_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          inputId: { type: Type.NUMBER },
          rawSvg: { type: Type.STRING, description: '완전한 <svg>...</svg> 마크업. viewBox 필수, 검은 선/회색 채움, 200x200 권장.', nullable: true },
        },
        required: ['inputId'],
      },
    },
  },
  required: ['results'],
};

interface Pass1Result {
  inputId: number;
  contentMatch?: string;
  status: 'has_diagram' | 'no_diagram_needed' | 'not_found';
  canExpressAsDiagramParams?: boolean;
  diagramParams?: Array<Record<string, unknown>> | null;
  fallbackReason?: string | null;
}

interface Pass2Result {
  inputId: number;
  rawSvg?: string | null;
}

interface QuestionRow {
  id: string;
  questionNum: number;
  chapter: string | null;
  source: string | null;
  content: string;
  difficulty: string;
}

function buildPass1Prompt(questions: QuestionRow[]): string {
  const list = questions.map((q, i) => `- inputId=${i + 1}: "${q.content.replace(/\n/g, ' ').replace(/\$[^$]+\$/g, '[수식]').substring(0, 150)}"`).join('\n');
  return `첨부 PDF에서 아래 문제들을 찾아 다이어그램을 DiagramParam으로 추출하라.

[대상 문제]
${list}

[중요: 식별자 규칙]
- inputId는 우리 시스템의 식별자다. PDF의 표시 번호(#1, #2 등)와 무관하다.
- 응답의 inputId는 입력의 inputId를 그대로 복사해서 사용하라. PDF에서 본 번호를 쓰지 마라.

[작업: 각 inputId마다]
1. PDF 페이지 전체를 훑어 위 content 본문 텍스트와 가장 일치하는 문제를 찾는다
2. contentMatch에 PDF에서 찾은 본문 첫 30자를 적어 검증 가능하게 함
3. status 판정:
   - "has_diagram": 그림/도형/그래프가 있음
   - "no_diagram_needed": 그림 없는 순수 텍스트/식 문제
   - "not_found": PDF에서 매칭 실패 (본문이 너무 다름)
4. has_diagram이면 canExpressAsDiagramParams를 판정:
   - true → diagramParams 배열을 정확한 수치로 채운다 (좌표/길이/각도/라벨 모두)
   - false → fallbackReason 명시 (회전체/단면/작도과정/복합입체 등)

[DiagramParam 26 타입 — 정확한 type 문자열만 사용]
fraction_circle | fraction_rect | number_line | place_value | dot_array | flow_chart | bar_chart | line_graph | picture_graph | pie_chart | band_chart | angle_figure | clock_face | coordinate_plane | circle | triangle | quadrilateral | function_graph | venn_diagram | regular_polygon | histogram | stem_leaf | solid_figure | net_diagram | tree_diagram | scatter_plot
- 위 26개 외 타입(예: "table", "rectangular_prism")은 절대 사용 금지

[타입별 필수 필드 — 누락 시 canExpressAsDiagramParams=false로 폴백]
- triangle/quadrilateral/regular_polygon: vertices [{x, y, label}] 최소 3개 필수, sideLabels [{from, to, label}] 권장
- circle: cx, cy, radius 모두 필수
- coordinate_plane: xRange [min, max], yRange [min, max] 필수
- function_graph: functions [{expression, label}] 최소 1개
- number_line: min, max, step 필수
- bar_chart/histogram/pie_chart/band_chart/line_graph: data 또는 values 또는 items 배열 필수
- flow_chart/tree_diagram: nodes 배열 + edges 권장
- solid_figure: shape 필수 (cube|cylinder|cone|sphere|prism|pyramid)
- venn_diagram: sets 배열 최소 2개
- stem_leaf: data 배열 필수

[규칙]
- 본문에 이미 마크다운 표나 식이 충분히 표현되어 있으면 needsDiagram=false
- 본문이 "달력" 같은 일반 그림인데 26 타입에 정확히 매칭 안 되면 → canExpressAsDiagramParams=false (table 같은 가짜 타입 금지)
- params 배열 필드(vertices, data, nodes 등)에 빈 배열만 채우는 것은 절대 금지 → 진짜 채울 수 없으면 canExpressAsDiagramParams=false
- 정점 라벨(A,B,C), 변 길이 라벨, 각도 표시를 PDF에서 보이는 대로 모두 채워라
- 진짜 표현 불가능한 것만 false (회전체 단면, 컴퍼스 작도 과정, 비표준 합성 입체)`;
}

function buildPass2Prompt(items: { inputId: number; q: QuestionRow; reason: string }[]): string {
  const list = items.map(it => `- inputId=${it.inputId} (${it.reason}): "${it.q.content.replace(/\n/g, ' ').replace(/\$[^$]+\$/g, '[수식]').substring(0, 150)}"`).join('\n');
  return `첨부 PDF에서 아래 문제들의 그림을 SVG로 그려라 (DiagramParam으로 표현 불가능한 케이스만).

[대상 문제]
${list}

[중요]
- 응답의 inputId는 입력의 inputId를 그대로 복사하라 (PDF 번호 아님)

[작업]
- PDF의 그림을 보고 직접 SVG 마크업으로 재현
- viewBox 필수 (예: viewBox="0 0 200 200")
- 단순 스타일: 검정 선(stroke="#000"), 회색 채움(fill="#888"), 흰 채움
- 텍스트 라벨은 <text>로 (KaTeX 금지)
- 완전한 <svg>...</svg> 형태로 반환`;
}

type Usage = { input?: number; output?: number; thinking?: number };

async function callGemini<T>(
  pdfBase64: string,
  prompt: string,
  schema: Record<string, unknown>,
  client: GoogleGenAI,
  model: string,
  thinking: boolean,
): Promise<{ data: T; usage: Usage }> {
  const config: Record<string, unknown> = {
    temperature: 0.2,
    responseMimeType: 'application/json',
    responseSchema: schema,
    // Thinking 명시적 제어 (gemini-2.5-flash 기본 thinking 자동 활성화 방지)
    thinkingConfig: thinking ? { thinkingBudget: 1024 } : { thinkingBudget: 0 },
  };

  const res = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
          { text: prompt },
        ],
      },
    ],
    config,
  });

  const usage = res.usageMetadata;
  let parsed: T;
  try {
    parsed = JSON.parse(res.text || '{}') as T;
  } catch (e) {
    console.error('  ⚠️ JSON 파싱 실패:', e instanceof Error ? e.message : e);
    parsed = {} as T;
  }

  return {
    data: parsed,
    usage: {
      input: usage?.promptTokenCount,
      output: usage?.candidatesTokenCount,
      thinking: (usage as Record<string, number> | undefined)?.thoughtsTokenCount,
    },
  };
}

async function main() {
  console.log('=== 다이어그램 백필 ===');
  console.log('Tier:', opts.tier, '| Limit:', opts.limit || '∞', '| DryRun:', opts.dryRun, '| Model override:', opts.modelOverride || '없음');
  console.log('PDF 인덱스:', PDF_INDEX.length, '개');

  // 대상 문제 조회
  const all = await prisma.question.findMany({
    where: {
      bookCode: '1-1',
      AND: [
        { OR: [{ diagramSpec: { equals: null as never } }, { diagramSpec: { equals: {} } }] },
        { OR: [{ diagramSVG: null }, { diagramSVG: '' }] },
      ],
    },
    select: { id: true, questionNum: true, chapter: true, source: true, content: true, difficulty: true },
    orderBy: [{ chapter: 'asc' }, { questionNum: 'asc' }],
  });

  const needs = all.filter(q => NEED_REGEX.test(q.content || '')) as QuestionRow[];
  console.log('그림 필요 의심 문제:', needs.length);

  // tier 필터
  const tierKey = opts.tier as 'all' | '1' | '2' | '3';
  const allowedChapters = tierKey === 'all'
    ? [...TIER_CONFIG[1].chapters, ...TIER_CONFIG[2].chapters, ...TIER_CONFIG[3].chapters]
    : TIER_CONFIG[tierKey as unknown as 1 | 2 | 3]?.chapters;

  if (!allowedChapters) {
    console.error('❌ 잘못된 tier:', opts.tier);
    process.exit(1);
  }

  let target = needs.filter(q => q.chapter && allowedChapters.includes(q.chapter));
  if (opts.limit > 0) target = target.slice(0, opts.limit);

  console.log('대상 문제:', target.length);

  // PDF별 그룹핑
  const byPdf: Record<string, QuestionRow[]> = {};
  let unmatchedPdf = 0;
  for (const q of target) {
    if (!q.source) { unmatchedPdf++; continue; }
    const pdfPath = findPdfPath(q.source);
    if (!pdfPath) { unmatchedPdf++; continue; }
    if (!byPdf[pdfPath]) byPdf[pdfPath] = [];
    byPdf[pdfPath].push(q);
  }

  const pdfList = Object.keys(byPdf);
  console.log('처리 PDF:', pdfList.length, '| 매칭 실패:', unmatchedPdf);

  if (opts.dryRun) {
    console.log('\n[Dry Run] 비용 추정만 출력');
    // 평균 가정으로 추정
    const avgInputPerPdf = 3600;
    const avgOutputPerPdf = 1600;
    const totalIn = pdfList.length * avgInputPerPdf;
    const totalOut = pdfList.length * avgOutputPerPdf;
    console.log(`예상 입력 토큰: ${totalIn.toLocaleString()}`);
    console.log(`예상 출력 토큰: ${totalOut.toLocaleString()}`);
    const inUsd = totalIn * 0.30 / 1_000_000;
    const outUsd = totalOut * 2.50 / 1_000_000;
    console.log(`예상 비용 (2.5-flash): $${(inUsd + outUsd).toFixed(3)} (≈${Math.round((inUsd + outUsd) * 1400)}원)`);
    await prisma.$disconnect();
    return;
  }

  // GoogleGenAI 클라이언트
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY 환경변수 없음');
    process.exit(1);
  }
  const client = new GoogleGenAI({ apiKey });

  // 통계
  let totalQ = 0;
  let savedParam = 0;
  let savedSvg = 0;
  let noDiagram = 0;
  let failed = 0;
  let totalIn = 0;
  let totalOut = 0;
  let totalThinking = 0;

  // 처리
  let pdfIdx = 0;
  for (const pdfPath of pdfList) {
    pdfIdx++;
    const questions = byPdf[pdfPath];

    // tier 결정 (이 PDF에 속한 첫 문제의 chapter 기준)
    const chap = questions[0].chapter || '';
    let tier: 1 | 2 | 3 = 1;
    if (TIER_CONFIG[2].chapters.includes(chap)) tier = 2;
    else if (TIER_CONFIG[3].chapters.includes(chap)) tier = 3;

    const cfg = TIER_CONFIG[tier];
    const useModel = opts.modelOverride || cfg.model;
    const useThinking = cfg.thinking;

    console.log(`\n[${pdfIdx}/${pdfList.length}] ${path.basename(pdfPath)}`);
    console.log(`  Tier ${tier} (${cfg.name}) | Model: ${useModel}${useThinking ? ' +thinking' : ''} | 문제 ${questions.length}개`);

    try {
      const buf = fs.readFileSync(pdfPath);
      const base64 = buf.toString('base64');

      // === PASS 1: DiagramParam 시도 ===
      const t1 = Date.now();
      const pass1 = await callGemini<{ results: Pass1Result[] }>(base64, buildPass1Prompt(questions), PASS1_SCHEMA, client, useModel, useThinking);
      const elapsed1 = Date.now() - t1;
      const results = pass1.data.results || [];
      if (pass1.usage.input) totalIn += pass1.usage.input;
      if (pass1.usage.output) totalOut += pass1.usage.output;
      if (pass1.usage.thinking) totalThinking += pass1.usage.thinking;
      console.log(`  [Pass1] ⏱ ${elapsed1}ms | in=${pass1.usage.input||0} out=${pass1.usage.output||0} think=${pass1.usage.thinking||0} | 결과 ${results.length}건`);
      // 디버그: 응답 inputId 비교
      const inIds = questions.map((_, i) => i + 1).join(',');
      const outIds = results.map(r => `${r.inputId}(${r.status})`).join(',');
      console.log(`    [debug] in=[${inIds}] out=[${outIds}]`);
      results.forEach(r => { if (r.contentMatch) console.log(`    [debug] inputId=${r.inputId} matched: "${r.contentMatch.substring(0, 40)}"`); });

      // 1차 결과 처리 + 2차 폴백 대상 수집 (inputId = i+1)
      const fallbackItems: { inputId: number; q: QuestionRow; reason: string }[] = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const inputId = i + 1;
        totalQ++;
        const r = results.find(rr => rr.inputId === inputId);
        if (!r) {
          console.log(`    ❓ inputId=${inputId} (DB#${q.questionNum}): 결과 누락`);
          failed++;
          continue;
        }
        if (r.status === 'not_found') {
          console.log(`    ❓ inputId=${inputId} (DB#${q.questionNum}): PDF에서 매칭 실패`);
          failed++;
          continue;
        }
        if (r.status === 'no_diagram_needed') {
          console.log(`    ⚪ inputId=${inputId} (DB#${q.questionNum}): 그림 불필요 (실제 PDF 확인)`);
          noDiagram++;
          continue;
        }
        // has_diagram
        if (r.canExpressAsDiagramParams && r.diagramParams && Array.isArray(r.diagramParams) && r.diagramParams.length > 0) {
          const normalized = normalizeDiagramParams(r.diagramParams as never) as Array<{ type?: string; params?: Record<string, unknown> }>;
          // Sanity check
          const checks = normalized.map(p => isParamSane(p));
          const allOk = checks.every(c => c.ok);
          if (allOk) {
            await prisma.question.update({
              where: { id: q.id },
              data: { diagramSpec: normalized as unknown as object },
            });
            console.log(`    ✅ inputId=${inputId} (DB#${q.questionNum}): DiagramParam ${normalized.length}개 (${normalized.map(n=>n.type).join(',')})`);
            savedParam++;
            continue;
          } else {
            const reasons = checks.filter(c => !c.ok).map(c => c.reason).join('; ');
            console.log(`    ⚠ inputId=${inputId} (DB#${q.questionNum}): Sanity 실패 → SVG 폴백 (${reasons})`);
            fallbackItems.push({ inputId, q, reason: `sanity:${reasons}` });
            continue;
          }
        }
        // 폴백 대상
        const reason = r.fallbackReason || '표현 불가';
        console.log(`    🔁 inputId=${inputId} (DB#${q.questionNum}): SVG 폴백 대기 (${reason})`);
        fallbackItems.push({ inputId, q, reason });
      }

      // === PASS 2: SVG 폴백 ===
      if (fallbackItems.length > 0) {
        const t2 = Date.now();
        const pass2 = await callGemini<{ results: Pass2Result[] }>(base64, buildPass2Prompt(fallbackItems), PASS2_SCHEMA, client, useModel, false);
        const elapsed2 = Date.now() - t2;
        const svgResults = pass2.data.results || [];
        if (pass2.usage.input) totalIn += pass2.usage.input;
        if (pass2.usage.output) totalOut += pass2.usage.output;
        if (pass2.usage.thinking) totalThinking += pass2.usage.thinking;
        console.log(`  [Pass2] ⏱ ${elapsed2}ms | in=${pass2.usage.input||0} out=${pass2.usage.output||0} | SVG ${svgResults.length}건`);

        for (const it of fallbackItems) {
          const sr = svgResults.find(rr => rr.inputId === it.inputId);
          if (sr?.rawSvg && sr.rawSvg.includes('<svg')) {
            await prisma.question.update({
              where: { id: it.q.id },
              data: { diagramSVG: sr.rawSvg },
            });
            console.log(`    🖼  inputId=${it.inputId} (DB#${it.q.questionNum}): SVG 저장 (${sr.rawSvg.length}자)`);
            savedSvg++;
          } else {
            console.log(`    ❌ inputId=${it.inputId} (DB#${it.q.questionNum}): SVG 생성 실패`);
            failed++;
          }
        }
      }
    } catch (e) {
      console.error(`  ❌ PDF 처리 실패:`, e instanceof Error ? e.message : e);
      questions.forEach(() => { totalQ++; failed++; });
    }

    // 무료 tier 보호: PDF 간 짧은 대기
    await new Promise(r => setTimeout(r, 500));
  }

  // 비용 계산
  const inUsd = totalIn * 0.30 / 1_000_000;
  const outUsd = (totalOut + totalThinking) * 2.50 / 1_000_000;
  const krw = Math.round((inUsd + outUsd) * 1400);

  console.log('\n=== 완료 ===');
  console.log(`처리 문제: ${totalQ}`);
  console.log(`✅ DiagramParam 저장: ${savedParam} (${pct(savedParam, totalQ)}%)`);
  console.log(`🖼  SVG 저장: ${savedSvg} (${pct(savedSvg, totalQ)}%)`);
  console.log(`⚪ 그림 불필요: ${noDiagram} (${pct(noDiagram, totalQ)}%)`);
  console.log(`❌ 실패: ${failed} (${pct(failed, totalQ)}%)`);
  console.log(`\n토큰: in=${totalIn.toLocaleString()} out=${totalOut.toLocaleString()} think=${totalThinking.toLocaleString()}`);
  console.log(`비용: $${(inUsd + outUsd).toFixed(3)} (≈${krw.toLocaleString()}원) — 단가는 2.5-flash 기준`);

  await prisma.$disconnect();
}

function pct(n: number, total: number): string {
  return total ? ((n / total) * 100).toFixed(1) : '0';
}

main().catch(e => { console.error(e); process.exit(1); });
