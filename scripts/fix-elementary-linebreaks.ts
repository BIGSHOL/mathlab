/**
 * 초등 개념 본문 줄바꿈 처리 스크립트
 *
 * 문제: 236/237개 개념이 줄바꿈 없이 한 덩어리로 되어있음
 * 목표: 문장 경계에서 자연스럽게 문단 분리 (2~4문장씩)
 *
 * 규칙:
 * 1. KaTeX $...$ 내부의 마침표는 무시
 * 2. "예를 들어", "다음으로", "이때", "또한", "그리고", "마지막으로" 등
 *    전환어로 시작하는 문장 앞에서 분리
 * 3. 250~350자 이내에서 분리 (너무 짧거나 긴 문단 방지)
 * 4. 최소 2문단, 최대 5문단
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 전환어/새 주제 시작 패턴 (문장 시작 부분에서 감지)
const TRANSITION_PATTERNS = [
  // 예시 전환
  /예를 들어[,\s]/,
  /예를 들면/,
  /예시를 살펴/,
  // 순서/추가 전환
  /먼저[,\s]/,
  /다음으로[,\s]/,
  /그다음[,\s]/,
  /마지막으로[,\s]/,
  /또한[,\s]/,
  /그리고[,\s]/,
  /이런[가-힣]/,
  /이처럼[,\s]/,
  /이렇게[,\s]/,
  // 대조/보충
  /하지만[,\s]/,
  /그런데[,\s]/,
  /반대로[,\s]/,
  /한편[,\s]/,
  // 결론/정리
  /따라서[,\s]/,
  /그러므로[,\s]/,
  /결국[,\s]/,
  /정리하면[,\s]/,
  /즉[,\s]/,
  // 질문형 전환 (초등 구어체)
  /그럼[,\s]/,
  /자[,!]\s/,
  /자,\s/,
  // 새 주제 시작
  /이제[,\s]/,
  /이번에는[,\s]/,
  /여기서[,\s]/,
  /특히[,\s]/,
  /만약[,\s]/,
  /때로는[,\s]/,
];

// KaTeX 영역을 임시 마커로 치환
function protectLatex(text: string): { cleaned: string; map: Map<string, string> } {
  const map = new Map<string, string>();
  let idx = 0;
  const cleaned = text.replace(/\$[^$]+\$/g, (match) => {
    const marker = `__LATEX_${idx++}__`;
    map.set(marker, match);
    return marker;
  });
  return { cleaned, map };
}

// 임시 마커를 원래 KaTeX로 복원
function restoreLatex(text: string, map: Map<string, string>): string {
  let result = text;
  for (const [marker, original] of map) {
    result = result.replace(marker, original);
  }
  return result;
}

// 문장 경계 찾기 (마침표/물음표/느낌표 + 공백 + 다음 문장 시작)
function findSentenceBoundaries(text: string): number[] {
  const boundaries: number[] = [];
  // 문장 종결 패턴: (다/요/죠/니다/해요/어요/지요/에요/래요) + 공백
  // 또는 마침표/물음표/느낌표 뒤 공백
  const regex = /(?:[.!?]|[다요죠])\s+/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    // 경계 위치 = 공백 직후 (다음 문장 시작)
    const afterSpace = match.index + match[0].length;
    if (afterSpace < text.length) {
      boundaries.push(afterSpace);
    }
  }
  return boundaries;
}

// 전환어 경계 판별: 해당 위치에서 전환어가 시작하는지
function isTransitionPoint(text: string, pos: number): boolean {
  const remaining = text.substring(pos);
  return TRANSITION_PATTERNS.some(p => p.test(remaining));
}

// 본문에 줄바꿈 삽입
function addLineBreaks(fullContent: string): string {
  // 이미 줄바꿈이 있으면 그대로
  if (fullContent.includes('\n')) return fullContent;

  const totalLen = fullContent.length;
  if (totalLen < 150) return fullContent; // 너무 짧으면 그대로

  // KaTeX 보호
  const { cleaned, map } = protectLatex(fullContent);

  // 문장 경계 찾기
  const boundaries = findSentenceBoundaries(cleaned);

  if (boundaries.length === 0) {
    return fullContent; // 경계를 찾을 수 없으면 그대로
  }

  // 최적 분리 지점 선정
  const breakPoints: number[] = [];
  let lastBreak = 0;

  // 목표: 120~250자 간격으로 분리, 전환어 우선
  const MIN_PARA = 100;   // 최소 문단 길이
  const IDEAL_PARA = 180; // 이상적 문단 길이
  const MAX_PARA = 300;   // 최대 문단 길이

  for (const boundary of boundaries) {
    const distFromLast = boundary - lastBreak;

    // 최소 길이 미달이면 스킵
    if (distFromLast < MIN_PARA) continue;

    // 전환어 시작이면 우선 분리
    if (isTransitionPoint(cleaned, boundary)) {
      breakPoints.push(boundary);
      lastBreak = boundary;
      continue;
    }

    // 이상적 길이를 넘었으면 분리
    if (distFromLast >= IDEAL_PARA) {
      breakPoints.push(boundary);
      lastBreak = boundary;
      continue;
    }

    // 최대 길이에 근접하면 강제 분리
    if (distFromLast >= MAX_PARA) {
      breakPoints.push(boundary);
      lastBreak = boundary;
    }
  }

  // 최대 5문단 제한 (너무 많으면 뒤쪽 분리 제거)
  while (breakPoints.length > 4) {
    // 가장 짧은 문단의 분리 지점 제거
    let minLen = Infinity;
    let minIdx = -1;
    for (let i = 0; i < breakPoints.length; i++) {
      const start = i === 0 ? 0 : breakPoints[i - 1];
      const end = breakPoints[i];
      const len = end - start;
      if (len < minLen) { minLen = len; minIdx = i; }
    }
    if (minIdx >= 0) breakPoints.splice(minIdx, 1);
  }

  if (breakPoints.length === 0) {
    // 분리점을 못 찾으면 중간에서 한 번 나누기
    const mid = boundaries.find(b => b >= totalLen * 0.4 && b <= totalLen * 0.6);
    if (mid) breakPoints.push(mid);
  }

  // 줄바꿈 삽입
  let result = cleaned;
  // 역순으로 삽입 (인덱스가 밀리지 않게)
  for (let i = breakPoints.length - 1; i >= 0; i--) {
    const pos = breakPoints[i];
    result = result.substring(0, pos) + '\n' + result.substring(pos);
  }

  // KaTeX 복원
  result = restoreLatex(result, map);

  return result;
}

async function main() {
  const concepts = await prisma.concept.findMany({
    where: { grade: { startsWith: 'elementary_' } },
    select: { id: true, conceptCode: true, title: true, fullContent: true, grade: true },
    orderBy: [{ grade: 'asc' }, { conceptCode: 'asc' }],
  });

  console.log(`초등 개념 ${concepts.length}개 줄바꿈 처리 시작...\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const c of concepts) {
    const fc = c.fullContent || '';
    if (fc.includes('\n')) {
      skippedCount++;
      continue;
    }

    const formatted = addLineBreaks(fc);
    if (formatted === fc) {
      skippedCount++;
      continue;
    }

    const paragraphs = formatted.split('\n').length;
    await prisma.concept.update({
      where: { id: c.id },
      data: { fullContent: formatted },
    });
    updatedCount++;
  }

  console.log(`줄바꿈 추가: ${updatedCount}개`);
  console.log(`스킵 (이미 있거나 불필요): ${skippedCount}개`);

  // 검증: 학년별 샘플
  const grades = ['elementary_3', 'elementary_4', 'elementary_5', 'elementary_6'];
  for (const g of grades) {
    const sample = await prisma.concept.findFirst({
      where: { grade: g },
      select: { conceptCode: true, fullContent: true },
      orderBy: { conceptCode: 'asc' },
    });
    if (sample) {
      const paras = sample.fullContent!.split('\n');
      console.log(`\n--- ${g.replace('elementary_', '초')} 샘플: ${sample.conceptCode} (${paras.length}문단) ---`);
      paras.forEach((p, i) => {
        console.log(`  [${i + 1}] ${p.substring(0, 80)}${p.length > 80 ? '...' : ''}`);
      });
    }
  }

  // 전체 통계
  const all = await prisma.concept.findMany({
    where: { grade: { startsWith: 'elementary_' } },
    select: { fullContent: true, grade: true },
  });
  const paraStats: Record<string, number[]> = {};
  for (const c of all) {
    const g = c.grade!.replace('elementary_', '초');
    const count = (c.fullContent || '').split('\n').length;
    if (!paraStats[g]) paraStats[g] = [];
    paraStats[g].push(count);
  }

  console.log('\n=== 문단 수 통계 ===');
  for (const [g, counts] of Object.entries(paraStats)) {
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const noBreak = counts.filter(c => c === 1).length;
    console.log(`${g}: 평균 ${avg.toFixed(1)}문단 | 최소 ${min} | 최대 ${max} | 줄바꿈없음 ${noBreak}개`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
