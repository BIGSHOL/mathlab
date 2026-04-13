/**
 * 408개 그림 필요 문제에 대해 DiagramParam 26 타입으로 표현 가능한 비율 추정
 * - 키워드 기반 분류 (실제 추출 전 사전 시뮬레이션)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DiagramParam 26 타입 → 매칭 키워드/패턴
// 우선순위: 더 구체적인 타입을 먼저 매칭
const TYPE_RULES: { type: string; keywords: RegExp; confidence: 'high' | 'mid' | 'low' }[] = [
  // 통계 (high confidence)
  { type: 'histogram', keywords: /히스토그램|도수분포다각형|도수분포표/, confidence: 'high' },
  { type: 'stem_leaf', keywords: /줄기와 잎|줄기-잎/, confidence: 'high' },
  { type: 'bar_chart', keywords: /막대그래프/, confidence: 'high' },
  { type: 'pie_chart', keywords: /원그래프/, confidence: 'high' },
  { type: 'band_chart', keywords: /띠그래프/, confidence: 'high' },
  { type: 'line_graph', keywords: /꺾은선그래프|꺾은선/, confidence: 'high' },
  { type: 'picture_graph', keywords: /그림그래프/, confidence: 'high' },
  { type: 'scatter_plot', keywords: /산점도|산포도/, confidence: 'high' },

  // 좌표/함수 (high)
  { type: 'function_graph', keywords: /함수.*그래프|y\s*=\s*[a-z\d]|정비례.*그래프|반비례.*그래프/, confidence: 'high' },
  { type: 'coordinate_plane', keywords: /좌표평면|좌표축|사분면|x축|y축|x좌표|y좌표|순서쌍/, confidence: 'high' },

  // 수직선 (high)
  { type: 'number_line', keywords: /수직선/, confidence: 'high' },

  // 평면도형 (mid - 표현 가능하지만 디테일 한계)
  { type: 'circle', keywords: /부채꼴|중심각|호의 길이|원의 둘레|원주|반지름/, confidence: 'mid' },
  { type: 'circle', keywords: /\b원\b|원에서|원 위/, confidence: 'mid' },
  { type: 'regular_polygon', keywords: /정\d+각형|정다각형|정삼각형|정사각형|정오각형|정육각형|정팔각형/, confidence: 'high' },
  { type: 'triangle', keywords: /직각삼각형|이등변삼각형|예각삼각형|둔각삼각형|삼각형/, confidence: 'mid' },
  { type: 'quadrilateral', keywords: /평행사변형|마름모|직사각형|정사각형|사다리꼴|등변사다리꼴|사각형/, confidence: 'mid' },

  // 입체 (low - 단순형만)
  { type: 'solid_figure', keywords: /정다면체|정사면체|정육면체|정팔면체|정십이면체|정이십면체/, confidence: 'high' },
  { type: 'solid_figure', keywords: /^.{0,200}(각기둥|각뿔|원기둥|원뿔|구)(?!.*(회전|단면|절단|자른|잘라))/m, confidence: 'mid' },
  { type: 'net_diagram', keywords: /전개도/, confidence: 'mid' },

  // 각/작도 (low)
  { type: 'angle_figure', keywords: /동위각|엇각|맞꼭지각|두 직선.*각|평각/, confidence: 'mid' },
  { type: 'angle_figure', keywords: /\b각\b|각의 크기|각도/, confidence: 'low' },

  // venn / tree (낮은 빈도)
  { type: 'venn_diagram', keywords: /벤다이어그램|벤 다이어그램/, confidence: 'high' },
  { type: 'tree_diagram', keywords: /수형도|나뭇가지|경우의 수.*그림/, confidence: 'high' },
];

// DiagramParam 표현 불가능한 패턴 (확실한 폴백 대상)
const UNSUPPORTED_PATTERNS = [
  /회전체|회전시킨|1회전 시킬|회전.*도형/,
  /단면|절단|잘라낸|잘라 낸|잘라 만든/,
  /작도하시오|작도 과정|작도해|컴퍼스|눈금 없는 자/,
  /입체.*조합|입체.*붙인|복합.*도형/,
  /\[그림\d?\].*\[그림\d?\]/,  // 여러 그림 합성
  /다음 도형.*같이|다음 그림과 같이.*복잡/,
];

interface ClassifyResult {
  hasMatch: boolean;
  bestType: string | null;
  confidence: 'high' | 'mid' | 'low' | 'none';
  unsupported: boolean;
}

function classify(content: string): ClassifyResult {
  // 표현 불가 우선 체크
  const isUnsupported = UNSUPPORTED_PATTERNS.some(p => p.test(content));

  // 매칭 시도 (high → mid → low 순)
  for (const conf of ['high', 'mid', 'low'] as const) {
    for (const rule of TYPE_RULES) {
      if (rule.confidence !== conf) continue;
      if (rule.keywords.test(content)) {
        return {
          hasMatch: true,
          bestType: rule.type,
          confidence: conf,
          unsupported: isUnsupported,
        };
      }
    }
  }
  return { hasMatch: false, bestType: null, confidence: 'none', unsupported: isUnsupported };
}

async function main() {
  const keywords = ['그림', '도형', '그래프', '좌표평면', '수직선', '전개도', '삼각형', '사각형', '평행사변형', '마름모', '직사각형', '사다리꼴', '히스토그램', '막대그래프', '도수분포', '입체', '각기둥', '각뿔', '원기둥', '원뿔', '다음과 같'];
  const regex = new RegExp(keywords.join('|'));

  const all = await prisma.question.findMany({
    where: {
      bookCode: '1-1',
      AND: [
        { OR: [{ diagramSpec: { equals: null as never } }, { diagramSpec: { equals: {} } }] },
        { OR: [{ diagramSVG: null }, { diagramSVG: '' }] },
      ],
    },
    select: { id: true, content: true, chapter: true, questionNum: true, difficulty: true },
  });
  const needs = all.filter(q => regex.test(q.content || ''));
  console.log('그림 필요 의심 문제:', needs.length);

  // 분류
  const results = needs.map(q => ({ q, c: classify(q.content || '') }));

  // 집계
  const total = results.length;
  const supportedHigh = results.filter(r => r.c.hasMatch && r.c.confidence === 'high' && !r.c.unsupported).length;
  const supportedMid = results.filter(r => r.c.hasMatch && r.c.confidence === 'mid' && !r.c.unsupported).length;
  const supportedLow = results.filter(r => r.c.hasMatch && r.c.confidence === 'low' && !r.c.unsupported).length;
  const noMatch = results.filter(r => !r.c.hasMatch).length;
  const unsupported = results.filter(r => r.c.unsupported).length;

  console.log('\n=== DiagramParam 표현 가능성 추정 ===');
  console.log(`전체: ${total}`);
  console.log(`✅ HIGH 신뢰 매칭: ${supportedHigh} (${pct(supportedHigh, total)}%) → 거의 확실히 표현 가능`);
  console.log(`🟡 MID 신뢰 매칭: ${supportedMid} (${pct(supportedMid, total)}%) → 표현 가능하나 디테일 한계`);
  console.log(`🟠 LOW 신뢰 매칭: ${supportedLow} (${pct(supportedLow, total)}%) → 부분적/불완전 표현`);
  console.log(`❌ 매칭 없음: ${noMatch} (${pct(noMatch, total)}%) → 키워드로 타입 추정 불가`);
  console.log(`🚫 명백히 폴백 (회전체/단면/작도 등): ${unsupported} (${pct(unsupported, total)}%)`);
  console.log(`\n→ DiagramParam 회수 가능 추정: ${supportedHigh + supportedMid} (${pct(supportedHigh + supportedMid, total)}%)`);
  console.log(`→ SVG 폴백 필요 추정: ${total - supportedHigh - supportedMid} (${pct(total - supportedHigh - supportedMid, total)}%)`);

  // 타입별 분포
  const typeMap: Record<string, number> = {};
  results.forEach(r => {
    if (r.c.bestType && !r.c.unsupported && r.c.confidence !== 'low') {
      typeMap[r.c.bestType] = (typeMap[r.c.bestType] || 0) + 1;
    }
  });
  console.log('\n[DiagramParam 타입별 분포 (HIGH+MID)]');
  Object.entries(typeMap).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k.padEnd(20)} : ${v}`));

  // 단원별 회수율
  const chapStats: Record<string, { total: number; ok: number }> = {};
  results.forEach(r => {
    const k = r.q.chapter || '(미분류)';
    if (!chapStats[k]) chapStats[k] = { total: 0, ok: 0 };
    chapStats[k].total++;
    if (r.c.hasMatch && (r.c.confidence === 'high' || r.c.confidence === 'mid') && !r.c.unsupported) {
      chapStats[k].ok++;
    }
  });
  console.log('\n[단원별 DiagramParam 회수율]');
  Object.entries(chapStats).sort((a, b) => b[1].total - a[1].total).forEach(([k, v]) => {
    const rate = pct(v.ok, v.total);
    console.log(`  ${k.padEnd(25)} : ${v.ok}/${v.total} (${rate}%)`);
  });

  // 매칭 안 된 문제 샘플
  console.log('\n[매칭 실패 샘플 5건 (수동 보기용)]');
  results.filter(r => !r.c.hasMatch && !r.c.unsupported).slice(0, 5).forEach(r => {
    console.log(`\n  #${r.q.questionNum} | ${r.q.chapter}`);
    console.log('   ', (r.q.content || '').replace(/\n/g, ' ').substring(0, 150));
  });

  // 폴백 대상 샘플
  console.log('\n[명백한 폴백 샘플 5건]');
  results.filter(r => r.c.unsupported).slice(0, 5).forEach(r => {
    console.log(`\n  #${r.q.questionNum} | ${r.q.chapter}`);
    console.log('   ', (r.q.content || '').replace(/\n/g, ' ').substring(0, 150));
  });

  await prisma.$disconnect();
}

function pct(n: number, total: number): string {
  return total ? ((n / total) * 100).toFixed(1) : '0';
}

main().catch(e => { console.error(e); process.exit(1); });
