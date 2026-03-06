/**
 * Auto-generate keywords from concept descriptions
 * and create blank exercises (level 1 easy, level 2 hard) for each concept.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Korean math keyword extraction ───

// Common stop words to filter out
const STOP_WORDS = new Set([
  '것', '수', '때', '중', '등', '또', '의', '와', '을', '를', '이', '가', '에', '에서',
  '로', '으로', '는', '은', '한', '하다', '있다', '없다', '되다', '같다', '예',
  '경우', '사용', '이용', '통해', '대한', '위해', '따라', '대해', '표현',
  '개념', '계산', '방법', '문제', '풀이', '활용', '과정', '단위',
]);

function extractKeywords(description: string): string {
  // Extract meaningful math terms from description
  // 1. Split by common delimiters
  const tokens = description
    .replace(/[()（）\[\]{}:;,，.。!?·×÷=+\-≠≤≥<>→←↔\/\n\r]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2);

  // 2. Find unique meaningful terms
  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const token of tokens) {
    const clean = token.replace(/[0-9a-zA-Z'"°%₁₂₃ⁿ^]/g, '').trim();
    if (clean.length < 2) continue;
    if (STOP_WORDS.has(clean)) continue;
    if (seen.has(clean)) continue;
    seen.add(clean);
    keywords.push(clean);
  }

  // Take top 8 most relevant keywords
  return keywords.slice(0, 8).join(', ');
}

// ─── Blank exercise generation ───

// Korean consonant initial extraction for hints
function getInitials(str: string): string {
  const initials = [
    'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'
  ];
  let result = '';
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const idx = Math.floor((code - 0xAC00) / 588);
      result += initials[idx];
    } else {
      result += ch;
    }
  }
  return result;
}

interface BlankItem {
  position: number;
  answer: string;
  hint: string;
}

interface BlankExerciseData {
  level: number;
  templateText: string;
  blanks: BlankItem[];
}

function generateBlanks(title: string, description: string): BlankExerciseData[] {
  // Parse description into sentences
  const sentences = description
    .split(/[.。]/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  if (sentences.length === 0) return [];

  // Find key terms in the description (nouns, math terms)
  // We'll use a simple approach: find terms that appear important
  const mathTermPattern = /[가-힣]{2,6}(?=[은는이가의을를에서로]|$|\s|,|\.)/g;
  const allTerms: { term: string; index: number; sentence: number }[] = [];

  sentences.forEach((sent, si) => {
    let match;
    const regex = new RegExp(mathTermPattern.source, 'g');
    while ((match = regex.exec(sent)) !== null) {
      const term = match[0];
      if (term.length >= 2 && !STOP_WORDS.has(term)) {
        allTerms.push({ term, index: match.index, sentence: si });
      }
    }
  });

  // Deduplicate terms, prefer first occurrence
  const uniqueTerms = new Map<string, typeof allTerms[0]>();
  for (const t of allTerms) {
    if (!uniqueTerms.has(t.term)) {
      uniqueTerms.set(t.term, t);
    }
  }
  const termList = Array.from(uniqueTerms.values());

  if (termList.length < 2) return [];

  // --- Level 1 (Easy): 2-4 blanks from first few sentences ---
  const easyTerms = termList.slice(0, Math.min(4, termList.length));
  const easySentences = new Set(easyTerms.map(t => t.sentence));
  let easyTemplate = '';
  let easyPosition = 1;
  const easyBlanks: BlankItem[] = [];

  for (const si of Array.from(easySentences).sort()) {
    let sent = sentences[si];
    // Replace terms with placeholders (in reverse order to maintain indices)
    const termsInSent = easyTerms
      .filter(t => t.sentence === si)
      .sort((a, b) => b.index - a.index);

    for (const t of termsInSent) {
      const before = sent.substring(0, t.index);
      const after = sent.substring(t.index + t.term.length);
      sent = before + `{{${easyPosition}}}` + after;
      easyBlanks.push({
        position: easyPosition,
        answer: t.term,
        hint: getInitials(t.term),
      });
      easyPosition++;
    }
    easyTemplate += sent + '. ';
  }
  // Reverse blanks to match position order
  easyBlanks.sort((a, b) => a.position - b.position);

  // --- Level 2 (Hard): 5-8 blanks from more sentences ---
  const hardTerms = termList.slice(0, Math.min(8, termList.length));
  const hardSentences = new Set(hardTerms.map(t => t.sentence));
  let hardTemplate = '';
  let hardPosition = 1;
  const hardBlanks: BlankItem[] = [];

  for (const si of Array.from(hardSentences).sort()) {
    let sent = sentences[si];
    const termsInSent = hardTerms
      .filter(t => t.sentence === si)
      .sort((a, b) => b.index - a.index);

    for (const t of termsInSent) {
      const before = sent.substring(0, t.index);
      const after = sent.substring(t.index + t.term.length);
      sent = before + `{{${hardPosition}}}` + after;
      hardBlanks.push({
        position: hardPosition,
        answer: t.term,
        hint: getInitials(t.term),
      });
      hardPosition++;
    }
    hardTemplate += sent + '. ';
  }
  hardBlanks.sort((a, b) => a.position - b.position);

  const results: BlankExerciseData[] = [];

  if (easyBlanks.length >= 2) {
    results.push({
      level: 1,
      templateText: easyTemplate.trim(),
      blanks: easyBlanks,
    });
  }

  if (hardBlanks.length >= 3 && hardBlanks.length > easyBlanks.length) {
    results.push({
      level: 2,
      templateText: hardTemplate.trim(),
      blanks: hardBlanks,
    });
  }

  return results;
}

// ─── Main ───

async function main() {
  console.log('=== Auto-generating Keywords & Blank Exercises ===\n');

  const concepts = await prisma.concept.findMany({
    orderBy: [{ grade: 'asc' }, { sortOrder: 'asc' }],
  });

  let keywordsUpdated = 0;
  let blanksCreated = 0;

  for (const concept of concepts) {
    // 1. Generate and update keywords
    const keywords = extractKeywords(concept.fullContent);
    if (keywords) {
      await prisma.concept.update({
        where: { id: concept.id },
        data: { keywords },
      });
      keywordsUpdated++;
    }

    // 2. Generate blank exercises
    const existingBlanks = await prisma.blankExercise.count({
      where: { conceptId: concept.id },
    });

    if (existingBlanks === 0) {
      const blankData = generateBlanks(concept.title, concept.fullContent);
      for (const b of blankData) {
        await prisma.blankExercise.create({
          data: {
            conceptId: concept.id,
            level: b.level,
            templateText: b.templateText,
            blanks: b.blanks,
          },
        });
        blanksCreated++;
      }
    }
  }

  console.log(`Keywords updated: ${keywordsUpdated}`);
  console.log(`Blank exercises created: ${blanksCreated}`);

  // Summary per grade
  const grades = await prisma.concept.groupBy({
    by: ['grade'],
    _count: true,
    orderBy: { grade: 'asc' },
  });

  const blanksByGrade = await prisma.$queryRaw<Array<{ grade: string; count: bigint }>>`
    SELECT c.grade, COUNT(b.id)::bigint as count
    FROM "Concept" c
    LEFT JOIN "BlankExercise" b ON b."conceptId" = c.id
    GROUP BY c.grade
    ORDER BY c.grade
  `;

  console.log('\n=== Summary ===');
  for (const g of grades) {
    const bc = blanksByGrade.find(b => b.grade === g.grade);
    console.log(`${g.grade}: ${g._count} concepts, ${bc?.count ?? 0} blanks`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
