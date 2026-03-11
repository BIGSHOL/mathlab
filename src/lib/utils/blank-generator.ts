/**
 * Auto-generate blank exercises from concept text.
 * Extracted from prisma/seed-keywords-blanks.ts for client/server shared use.
 */

// Common Korean stop words to filter out
const STOP_WORDS = new Set([
  '것', '수', '때', '중', '등', '또', '의', '와', '을', '를', '이', '가', '에', '에서',
  '로', '으로', '는', '은', '한', '하다', '있다', '없다', '되다', '같다', '예',
  '경우', '사용', '이용', '통해', '대한', '위해', '따라', '대해', '표현',
  '개념', '계산', '방법', '문제', '풀이', '활용', '과정', '단위',
]);

// Korean particles — kept visible in 통문장 stage
const PARTICLES = new Set([
  '은', '는', '이', '가', '을', '를', '의', '에', '에서', '에게', '에게서',
  '로', '으로', '와', '과', '도', '만', '까지', '부터', '마다', '밖에',
  '라', '라고', '라는', '란', '처럼', '같이', '보다', '대로', '든지',
  '며', '고', '서', '면', '니', '니까', '거나', '지만', '아서', '어서',
  '다', '다고', '해서', '하면', '하고', '해도', '때문', '따라서',
]);

// Structural tokens kept visible in 통문장 (connectors, markers, etc.)
const KEEP_TOKENS = new Set([
  '⇨', '⇒', '→', '⟹', '∴', '∵', '=', '+', '-', '×', '÷',
  '즉', '또는', '그리고', '및', '단',
]);

// Korean consonant initial extraction for hints (초성)
export function getInitials(str: string): string {
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

export type BlankDifficulty = 'easy' | 'hard' | 'full';

export interface MergedBlankItem {
  position: number;
  answer: string;
  hint: string;
  difficulty: BlankDifficulty;
}

export interface MergedBlankExercise {
  templateText: string;
  blanks: MergedBlankItem[];
}

// Legacy types for backward compatibility with generateBlanks
export interface GeneratedBlankItem {
  position: number;
  answer: string;
  hint: string;
}

export interface GeneratedBlankExercise {
  level: number;
  templateText: string;
  blanks: GeneratedBlankItem[];
}

/**
 * Build a merged exercise from fullContent + terms with difficulty.
 * Finds ALL occurrences, processes longer terms first to avoid substring conflicts.
 * Returns ONE exercise with per-blank difficulty.
 *
 * @param mergeSameTerms - true: 같은 단어는 같은 빈칸번호 사용, false: 각 출현마다 별도 번호
 */
export function buildMergedExercise(
  fullContent: string,
  terms: { term: string; difficulty: BlankDifficulty }[],
  mergeSameTerms = false,
): MergedBlankExercise | null {
  if (terms.length === 0) return null;

  // Sort terms by length descending (longer terms first to avoid substring matches)
  const sortedTerms = [...terms].sort((a, b) => b.term.length - a.term.length);

  // Track which character positions are already claimed
  const used = new Set<number>();

  // Find all valid occurrences
  const occurrences: { term: string; difficulty: BlankDifficulty; idx: number }[] = [];

  for (const t of sortedTerms) {
    let searchFrom = 0;
    while (searchFrom < fullContent.length) {
      const idx = fullContent.indexOf(t.term, searchFrom);
      if (idx === -1) break;

      // Check if any char in this range is already used
      let overlap = false;
      for (let c = idx; c < idx + t.term.length; c++) {
        if (used.has(c)) { overlap = true; break; }
      }

      if (!overlap) {
        occurrences.push({ term: t.term, difficulty: t.difficulty, idx });
        for (let c = idx; c < idx + t.term.length; c++) used.add(c);
      }

      searchFrom = idx + 1;
    }
  }

  if (occurrences.length === 0) return null;

  // Sort by position in text (ascending)
  occurrences.sort((a, b) => a.idx - b.idx);

  // Build template
  let template = '';
  let lastIdx = 0;
  const blanks: MergedBlankItem[] = [];

  if (mergeSameTerms) {
    // 같은 단어 → 같은 빈칸 번호
    const termToPosition = new Map<string, number>();
    let nextPos = 1;

    for (const occ of occurrences) {
      template += fullContent.substring(lastIdx, occ.idx);
      let pos = termToPosition.get(occ.term);
      if (pos == null) {
        pos = nextPos++;
        termToPosition.set(occ.term, pos);
        blanks.push({
          position: pos,
          answer: occ.term,
          hint: getInitials(occ.term),
          difficulty: occ.difficulty,
        });
      }
      template += `{{${pos}}}`;
      lastIdx = occ.idx + occ.term.length;
    }
  } else {
    // 각 출현마다 별도 번호 (기존 동작)
    occurrences.forEach((occ, i) => {
      template += fullContent.substring(lastIdx, occ.idx);
      template += `{{${i + 1}}}`;
      blanks.push({
        position: i + 1,
        answer: occ.term,
        hint: getInitials(occ.term),
        difficulty: occ.difficulty,
      });
      lastIdx = occ.idx + occ.term.length;
    });
  }
  template += fullContent.substring(lastIdx);

  return { templateText: template, blanks };
}

/**
 * Generate "통문장" (full-sentence) blanks from the remaining text.
 * Takes an already-processed template with easy/hard blanks and adds 'full' blanks
 * for all remaining meaningful content words (keeping only particles and connectors).
 */
export function addFullSentenceBlanks(
  exercise: MergedBlankExercise,
): MergedBlankExercise {
  const { templateText, blanks } = exercise;

  // Split template into segments: existing {{N}} markers and text between them
  const segments = templateText.split(/(\{\{\d+\}\})/g);
  let newTemplate = '';
  const newBlanks = [...blanks];
  let nextPosition = blanks.length + 1;

  for (const seg of segments) {
    if (/^\{\{\d+\}\}$/.test(seg)) {
      // Existing blank marker — keep as-is
      newTemplate += seg;
      continue;
    }

    // Process remaining text: find content words to blank
    // Split into tokens by Korean word boundaries
    // Pattern: sequences of Korean chars (possibly with embedded numbers/special)
    const tokenPattern = /([가-힣\uAC00-\uD7A3]{1,}[0-9]*|[0-9]+[가-힣]*|[a-zA-Z]+)/g;
    let lastEnd = 0;
    let match;

    while ((match = tokenPattern.exec(seg)) !== null) {
      const token = match[0];
      const tokenIdx = match.index;

      // Add text before this token
      newTemplate += seg.substring(lastEnd, tokenIdx);

      // Decide if this token should be blanked
      const shouldBlank = !isParticleOrConnector(token) && token.length >= 1;

      if (shouldBlank) {
        newTemplate += `{{${nextPosition}}}`;
        newBlanks.push({
          position: nextPosition,
          answer: token,
          hint: getInitials(token),
          difficulty: 'full',
        });
        nextPosition++;
      } else {
        newTemplate += token;
      }

      lastEnd = tokenIdx + token.length;
    }

    // Add remaining text after last token
    newTemplate += seg.substring(lastEnd);
  }

  return { templateText: newTemplate, blanks: newBlanks };
}

/**
 * Check if a Korean token is a particle, connector, or structural word
 * that should remain visible in 통문장 mode.
 */
function isParticleOrConnector(token: string): boolean {
  if (PARTICLES.has(token)) return true;
  if (KEEP_TOKENS.has(token)) return true;
  // Single character Korean is usually a particle
  if (token.length === 1 && /[가-힣]/.test(token)) return true;
  return false;
}

/**
 * Convert legacy generateBlanks output to merged exercise format.
 * Used as regex fallback when AI is unavailable.
 */
export function mergeGeneratedExercises(
  fullContent: string,
  exercises: GeneratedBlankExercise[],
): MergedBlankExercise | null {
  const easyEx = exercises.find((e) => e.level === 1);
  const hardEx = exercises.find((e) => e.level === 2);

  const easyAnswers = new Set(easyEx?.blanks.map((b) => b.answer) ?? []);
  const source = hardEx || easyEx;
  if (!source) return null;

  // Collect terms with difficulty
  const terms: { term: string; difficulty: BlankDifficulty }[] = source.blanks.map((b) => ({
    term: b.answer,
    difficulty: easyAnswers.has(b.answer) ? 'easy' as const : 'hard' as const,
  }));

  // Build from full content (not the partial template from generateBlanks)
  const merged = buildMergedExercise(fullContent, terms);
  if (!merged) return null;

  // Add 통문장 blanks
  return addFullSentenceBlanks(merged);
}

/**
 * Auto-generate blank exercises from concept title and description.
 * Returns up to 2 exercises: level 1 (easy, 2-4 blanks) and level 2 (hard, 5-8 blanks).
 * @deprecated Use buildMergedExercise + addFullSentenceBlanks for new code.
 */
export function generateBlanks(title: string, description: string): GeneratedBlankExercise[] {
  // Parse description into sentences
  const sentences = description
    .split(/[.。]/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  if (sentences.length === 0) return [];

  // Find key terms (Korean math terms: 2-6 char nouns followed by particles or end)
  const mathTermPattern = /[가-힣]{2,6}(?=[은는이가의을를에서로]|$|\s|,|\.)/g;
  const allTerms: { term: string; index: number; sentence: number }[] = [];

  sentences.forEach((sent, si) => {
    const regex = new RegExp(mathTermPattern.source, 'g');
    let match;
    while ((match = regex.exec(sent)) !== null) {
      const term = match[0];
      if (term.length >= 2 && !STOP_WORDS.has(term)) {
        allTerms.push({ term, index: match.index, sentence: si });
      }
    }
  });

  // Deduplicate terms, prefer first occurrence
  const uniqueTerms = new Map<string, (typeof allTerms)[0]>();
  for (const t of allTerms) {
    if (!uniqueTerms.has(t.term)) {
      uniqueTerms.set(t.term, t);
    }
  }
  const termList = Array.from(uniqueTerms.values());

  if (termList.length < 2) return [];

  const results: GeneratedBlankExercise[] = [];

  // --- Level 1 (Easy): 2-4 blanks from first few sentences ---
  const easyTerms = termList.slice(0, Math.min(4, termList.length));
  const easyExercise = buildExercise(sentences, easyTerms, 1);
  if (easyExercise && easyExercise.blanks.length >= 2) {
    results.push(easyExercise);
  }

  // --- Level 2 (Hard): 5-8 blanks from more sentences ---
  const hardTerms = termList.slice(0, Math.min(8, termList.length));
  const hardExercise = buildExercise(sentences, hardTerms, 2);
  if (hardExercise && hardExercise.blanks.length >= 3 && hardExercise.blanks.length > (easyExercise?.blanks.length ?? 0)) {
    results.push(hardExercise);
  }

  return results;
}

function buildExercise(
  sentences: string[],
  terms: { term: string; index: number; sentence: number }[],
  level: number,
): GeneratedBlankExercise | null {
  const usedSentences = new Set(terms.map(t => t.sentence));
  let template = '';
  let position = 1;
  const blanks: GeneratedBlankItem[] = [];

  for (const si of Array.from(usedSentences).sort()) {
    let sent = sentences[si];
    // Replace terms in reverse order to maintain indices
    const termsInSent = terms
      .filter(t => t.sentence === si)
      .sort((a, b) => b.index - a.index);

    for (const t of termsInSent) {
      const before = sent.substring(0, t.index);
      const after = sent.substring(t.index + t.term.length);
      sent = before + `{{${position}}}` + after;
      blanks.push({
        position,
        answer: t.term,
        hint: getInitials(t.term),
      });
      position++;
    }
    template += sent + '. ';
  }

  blanks.sort((a, b) => a.position - b.position);

  return { level, templateText: template.trim(), blanks };
}
