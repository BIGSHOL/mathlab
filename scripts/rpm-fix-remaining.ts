import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

const HANGUL_CIRCLED: Record<string, string> = {
  '가': '㉮', '나': '㉯', '다': '㉰', '라': '㉱', '마': '㉲',
  '바': '㉳', '사': '㉴', '아': '㉵', '자': '㉶', '차': '㉷',
  '카': '㉸', '타': '㉹', '파': '㉺', '하': '㉻',
  // 자음만
  'ㄱ': '㉠', 'ㄴ': '㉡', 'ㄷ': '㉢', 'ㄹ': '㉣', 'ㅁ': '㉤',
  'ㅂ': '㉥', 'ㅅ': '㉦', 'ㅇ': '㉧', 'ㅈ': '㉨', 'ㅊ': '㉩',
  'ㅋ': '㉪', 'ㅌ': '㉫', 'ㅍ': '㉬', 'ㅎ': '㉭',
};

function applyFixes(text: string): { out: string; changes: string[] } {
  const changes: string[] = [];
  let out = text;

  // 1) \textcircled{한글} → 유니코드
  const beforeTC = out;
  out = out.replace(/\\textcircled\{([가-힣ㄱ-ㅎ])\}/g, (m, ch: string) => HANGUL_CIRCLED[ch] || m);
  if (out !== beforeTC) changes.push('textcircled-hangul');

  // 2) =로 시작하는 라인 + $ 홀수 + 끝 $ → 맨 앞 $ 추가
  {
    const lines = out.split('\n');
    let touched = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!/^=/.test(trimmed)) continue;
      const count = (line.match(/\$/g) || []).length;
      if (count === 0 || count % 2 === 0) continue;
      if (!line.trimEnd().endsWith('$')) continue;
      const ws = line.match(/^\s*/)?.[0] || '';
      lines[i] = `${ws}$${line.slice(ws.length)}`;
      touched = true;
    }
    if (touched) { changes.push('eq-line'); out = lines.join('\n'); }
  }

  // 3) 마지막 $ 미닫힘: $가 홀수로 끝났을 때 마지막에 $ 추가
  //    단 전체에서 $$ 블록은 제외하고 검증 필요 — 단순히 전체 $ 카운트로 체크
  //    너무 위험 — 개별 처리로 대체하자
  //    SKIP: 이 규칙은 오탐 위험 커서 제외

  return { out, changes };
}

async function main() {
  const qs = await prisma.question.findMany({
    where: { source: '22개정 RPM 중 1-1 학생용' },
    select: { id: true, questionNum: true, explanation: true },
    orderBy: { questionNum: 'asc' },
  });
  let updated = 0;
  const tally: Record<string, number> = {};
  for (const q of qs) {
    const before = q.explanation || '';
    if (!before) continue;
    const { out, changes } = applyFixes(before);
    if (changes.length === 0 || before === out) continue;
    updated++;
    for (const c of changes) tally[c] = (tally[c] || 0) + 1;
    if (APPLY) await prisma.question.update({ where: { id: q.id }, data: { explanation: out } });
  }
  console.log('대상:', updated, '건');
  console.log('변경 유형:', tally);
  console.log(APPLY ? `\n✅ 적용` : '\n(dry-run — 적용: --apply)');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
