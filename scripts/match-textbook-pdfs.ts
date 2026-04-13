/**
 * 그림 필요 의심 문제 → G드라이브 교과서 PDF 매칭률 검증
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function walk(dir: string, files: string[] = []): string[] {
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, files);
      else if (e.name.toLowerCase().endsWith('.pdf')) files.push(full);
    }
  } catch {}
  return files;
}

async function main() {
  console.log('G드라이브 PDF 인덱싱...');
  const allPdfs = walk('G:/중등교과서/중1');
  console.log('중1 PDF 총:', allPdfs.length);

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
    select: { id: true, source: true, content: true, questionNum: true, chapter: true },
  });

  const needs = all.filter(q => regex.test(q.content || ''));
  console.log('그림 필요 의심 문제:', needs.length);

  const matched: { q: typeof needs[0]; file: string }[] = [];
  const unmatched: { q: typeof needs[0]; fname: string }[] = [];
  const noSource: typeof needs = [];

  for (const q of needs) {
    if (!q.source) { noSource.push(q); continue; }
    const m = q.source.match(/([^\\\/]+\.pdf)/i);
    if (!m) { noSource.push(q); continue; }
    let fname = m[1].trim();
    // "중학 수학1 (강옥기) - 22개정_..." 에서 " - " 뒤 부분만 추출
    const dashIdx = fname.lastIndexOf(' - ');
    if (dashIdx >= 0) fname = fname.slice(dashIdx + 3);
    const sep1 = '/' + fname;
    const sep2 = path.sep + fname;
    const found = allPdfs.find(p => p.endsWith(fname) || p.endsWith(sep1) || p.endsWith(sep2));
    if (found) matched.push({ q, file: found });
    else unmatched.push({ q, fname });
  }

  console.log('\n=== 매칭 결과 ===');
  console.log('PDF 매칭 성공:', matched.length, '/', needs.length, `(${Math.round(matched.length / needs.length * 100)}%)`);
  console.log('PDF 매칭 실패:', unmatched.length);
  console.log('source에 PDF 파일명 없음:', noSource.length);

  if (unmatched.length) {
    console.log('\n[매칭 실패 파일명 (unique)]');
    const uniq = [...new Set(unmatched.map(u => u.fname))];
    uniq.slice(0, 10).forEach(f => console.log(' ', f));
  }

  const noSourceMap: Record<string, number> = {};
  noSource.forEach(q => { const k = q.source || '(null)'; noSourceMap[k] = (noSourceMap[k] || 0) + 1; });
  console.log('\n[PDF 파일명 없는 source 분포]');
  Object.entries(noSourceMap).slice(0, 10).forEach(([k, v]) => console.log(' ', v, '|', k));

  const byChap: Record<string, number> = {};
  matched.forEach(m => { const k = m.q.chapter || '(미분류)'; byChap[k] = (byChap[k] || 0) + 1; });
  console.log('\n[매칭 성공 문제 단원별]');
  Object.entries(byChap).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(' ', v, '|', k));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
