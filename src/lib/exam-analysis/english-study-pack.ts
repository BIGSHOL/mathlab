/**
 * 영어 학습 대책 — 시험지에 나온 단어·구문만 다룬다.
 * 독해 유형명(빈칸 추론, 글의 구조)이나 문항 번호는 구문이 아니다.
 */
import { simplifyExamKorean } from './simple-korean';
import type { AnalyzedQuestion } from './types';

export const ENGLISH_STUDY_AGENT = 'english-study';

export interface EnglishStudyTerm {
  word: string;
  meaning: string | null;
  count: number;
  trap: boolean;
}

export interface EnglishStudyStructure {
  pattern: string;
  meaning: string | null;
  count: number;
  trap: boolean;
}

export interface EnglishStudyExtracted {
  vocab: EnglishStudyTerm[];
  structures: EnglishStudyStructure[];
}

/** 독해 유형·문항 번호 — 구문/단어로 쓰면 안 됨 */
const NOT_AN_EXPRESSION =
  /빈칸\s*추론|글의\s*구조|주제|요지|세부\s*정보|함축|필자\s*의도|독해|서술형|어휘\s*\d|문항|객관식|글의\s*순서|문장\s*삽입/;

function hasLatin(text: string): boolean {
  return /[A-Za-z]/.test(text);
}

function hangulHeavierThanLatin(text: string): boolean {
  const hangul = (text.match(/[가-힣]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return hangul > latin;
}

function cleanText(raw: unknown): string {
  return String(raw ?? '').replace(/\s+/g, ' ').trim();
}

function cleanMeaning(raw: unknown): string | null {
  const t = simplifyExamKorean(cleanText(raw)).slice(0, 40);
  return t || null;
}

function cleanCount(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(99, Math.round(n));
}

/** 영어 형태가 없는 독해 유형명·한글 단원명은 단어/구문이 아님 */
export function isEnglishStudyJunk(text: string): boolean {
  if (!text || text.length > 60) return true;
  if (NOT_AN_EXPRESSION.test(text)) return true;
  if (/^\d+번/.test(text)) return true;
  if (!hasLatin(text)) return true;
  if (hangulHeavierThanLatin(text)) return true;
  return false;
}

function parseTerm(row: unknown): EnglishStudyTerm | null {
  if (!row || typeof row !== 'object') return null;
  const rec = row as Record<string, unknown>;
  const word = cleanText(rec.word ?? rec.text ?? rec.pattern);
  if (isEnglishStudyJunk(word)) return null;
  return {
    word,
    meaning: cleanMeaning(rec.meaning),
    count: cleanCount(rec.count),
    trap: rec.trap === true,
  };
}

function parseStructure(row: unknown): EnglishStudyStructure | null {
  if (!row || typeof row !== 'object') return null;
  const rec = row as Record<string, unknown>;
  const pattern = cleanText(rec.pattern ?? rec.text ?? rec.word);
  if (isEnglishStudyJunk(pattern)) return null;
  return {
    pattern,
    meaning: cleanMeaning(rec.meaning),
    count: cleanCount(rec.count),
    trap: rec.trap === true,
  };
}

function mergeTerms(list: EnglishStudyTerm[]): EnglishStudyTerm[] {
  const map = new Map<string, EnglishStudyTerm>();
  for (const item of list) {
    const key = item.word.toLowerCase();
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...item });
      continue;
    }
    prev.count = Math.min(99, prev.count + item.count);
    prev.trap = prev.trap || item.trap;
    if (!prev.meaning && item.meaning) prev.meaning = item.meaning;
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

function mergeStructures(list: EnglishStudyStructure[]): EnglishStudyStructure[] {
  const map = new Map<string, EnglishStudyStructure>();
  for (const item of list) {
    const key = item.pattern.toLowerCase();
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...item });
      continue;
    }
    prev.count = Math.min(99, prev.count + item.count);
    prev.trap = prev.trap || item.trap;
    if (!prev.meaning && item.meaning) prev.meaning = item.meaning;
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.pattern.localeCompare(b.pattern));
}

export function parseEnglishStudyResult(raw: unknown): EnglishStudyExtracted | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const vocabRaw = Array.isArray(rec.vocab) ? rec.vocab : [];
  const structRaw = Array.isArray(rec.structures) ? rec.structures : [];
  const vocab = mergeTerms(vocabRaw.map(parseTerm).filter((v): v is EnglishStudyTerm => v != null));
  const structures = mergeStructures(
    structRaw.map(parseStructure).filter((v): v is EnglishStudyStructure => v != null),
  );
  if (vocab.length === 0 && structures.length === 0) return null;
  return { vocab, structures };
}

function isHardQuestion(q: AnalyzedQuestion): boolean {
  const d = String(q.difficulty ?? '');
  return d === '4' || d === '5';
}

/**
 * 이미 분석된 문항의 key_vocab / key_structures 만 모은다.
 * topic(빈칸 추론 등)은 절대 넣지 않는다.
 */
export function buildEnglishStudyFromQuestions(questions: AnalyzedQuestion[]): EnglishStudyExtracted | null {
  const vocab: unknown[] = [];
  const structures: unknown[] = [];
  for (const q of questions) {
    const trap = isHardQuestion(q);
    if (Array.isArray(q.key_vocab)) {
      for (const v of q.key_vocab) {
        if (!v || typeof v !== 'object') continue;
        vocab.push({
          word: v.word,
          meaning: v.meaning,
          count: 1,
          trap,
        });
      }
    }
    if (Array.isArray(q.key_structures)) {
      for (const s of q.key_structures) {
        if (!s || typeof s !== 'object') continue;
        structures.push({
          pattern: s.pattern,
          meaning: s.meaning,
          count: 1,
          trap,
        });
      }
    }
  }
  return parseEnglishStudyResult({ vocab, structures });
}

export function splitEnglishStudy(pack: EnglishStudyExtracted): {
  frequentVocab: EnglishStudyTerm[];
  frequentStructures: EnglishStudyStructure[];
  trapVocab: EnglishStudyTerm[];
  trapStructures: EnglishStudyStructure[];
} {
  return {
    frequentVocab: pack.vocab.filter((v) => v.count >= 2),
    frequentStructures: pack.structures.filter((s) => s.count >= 2),
    trapVocab: pack.vocab.filter((v) => v.trap),
    trapStructures: pack.structures.filter((s) => s.trap),
  };
}
