/**
 * 영어 학습 대책 — 시험지에 나온 단어·구문만 다룬다.
 * 독해 유형명(빈칸 추론, 글의 구조)이나 문항 번호는 구문이 아니다.
 *
 * ⚠️ 이 팩은 **두 경로**로 만들어지고, 경로에 따라 `count` 가 세는 대상이 다르다.
 *   - `source: 'exam'`      — AI가 시험지 본문을 훑어 센 **등장 횟수** (표시: "3회")
 *   - `source: 'questions'` — 이미 분석된 문항의 key_vocab 을 모은 **문항 수** (표시: "3문항")
 *   같은 숫자를 양쪽 다 "회"로 적으면 읽는 사람이 무엇을 센 값인지 알 수 없다 → `countUnitLabel()` 사용.
 */
import { simplifyExamKorean } from './simple-korean';
import type { AnalyzedQuestion } from './types';

export const ENGLISH_STUDY_AGENT = 'english-study';

/**
 * 학습 대책 팩 파이프라인 버전.
 * 추출 프롬프트·정규화 규칙·팩 구조가 바뀌면 **반드시 올릴 것.**
 * 저장된 팩의 버전이 이 값과 다르면 캐시를 버리고 다시 뽑는다
 * (버전이 없던 시절엔 규칙을 고쳐도 옛 결과가 영원히 반환됐다).
 */
export const ENGLISH_STUDY_PACK_VERSION = 'es-v1.1.0';

/** 팩을 만든 경로 — `count` 의 단위를 결정한다. */
export type EnglishStudySource = 'exam' | 'questions';

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
  /** 만들어진 경로. `count` 단위가 여기에 달려 있다. */
  source: EnglishStudySource;
  /** 생성 당시 파이프라인 버전. 없으면 버전 도입 이전의 구팩. */
  version?: string;
  /**
   * AI 응답 JSON 이 잘려서 자동 복구로 살려낸 결과인가.
   *
   * 학습팩에는 "응답이 완결됐는가"를 판별할 독립 총개수가 없어, 뒤가 잘려도
   * 앞쪽 몇 건만으로 검증을 통과해 정상 캐시로 굳었다 (적대적 리뷰 1.8).
   * true 면 캐시를 신뢰하지 않고 다음 요청에 다시 뽑는다.
   */
  truncated?: boolean;
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
  // AI가 "2회" / "3번" 처럼 단위를 붙여 보내는 경우가 있다. Number("2회") 는 NaN 이라
  // 그대로 두면 2가 1로 축소된다 → 앞쪽 숫자를 먼저 뽑는다.
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim().match(/^\d+(?:\.\d+)?/)?.[0] ?? NaN);
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

/**
 * 저장된 팩 / AI 응답을 공통 형태로 파싱.
 *
 * `source` 는 팩에 적혀 있으면 그대로, 없으면 `fallbackSource`(기본 'exam').
 * AI 응답에는 source·version 이 없으므로 호출부(추출기·문항 빌더)가 찍어 준다.
 */
export function parseEnglishStudyResult(
  raw: unknown,
  fallbackSource: EnglishStudySource = 'exam',
): EnglishStudyExtracted | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const vocabRaw = Array.isArray(rec.vocab) ? rec.vocab : [];
  const structRaw = Array.isArray(rec.structures) ? rec.structures : [];
  const vocab = mergeTerms(vocabRaw.map(parseTerm).filter((v): v is EnglishStudyTerm => v != null));
  const structures = mergeStructures(
    structRaw.map(parseStructure).filter((v): v is EnglishStudyStructure => v != null),
  );
  if (vocab.length === 0 && structures.length === 0) return null;
  const source: EnglishStudySource = rec.source === 'questions' || rec.source === 'exam'
    ? rec.source
    : fallbackSource;
  return {
    vocab,
    structures,
    source,
    ...(typeof rec.version === 'string' ? { version: rec.version } : {}),
  };
}

/** 저장된 팩이 지금 파이프라인으로 만든 것인가 (아니면 캐시를 버리고 재생성). */
export function isCurrentEnglishStudyPack(pack: EnglishStudyExtracted | null | undefined): boolean {
  return pack?.version === ENGLISH_STUDY_PACK_VERSION;
}

/** `count` 뒤에 붙일 단위 — 경로마다 세는 대상이 다르다. */
export function countUnitLabel(source: EnglishStudySource): string {
  return source === 'questions' ? '문항' : '회';
}

/** `count >= 2` 묶음의 제목 — 단위가 다르면 제목도 달라야 한다. */
export function frequentTitle(source: EnglishStudySource, kind: '단어' | '구문'): string {
  return source === 'questions'
    ? `여러 문항에 나온 ${kind}`
    : `자주 나온 ${kind}`;
}

/** `count >= 2` 묶음이 비었을 때 문구 — 단위에 맞춰야 오해가 없다. */
export function frequentEmptyText(source: EnglishStudySource, kind: '단어' | '구문'): string {
  return source === 'questions'
    ? `두 문항 이상에 걸쳐 나온 ${kind}가 없습니다. 아래 목록을 보세요.`
    : `두 번 이상 나온 ${kind}가 없습니다. 아래 목록을 보세요.`;
}

/**
 * `trap` 묶음의 제목.
 *
 * ⚠️ 예전 제목은 "자주 틀리는 단어·구문"이었는데 **틀린 라벨**이다.
 *    이 제품은 학생 답안지를 받지 않으므로 오답률을 알 수 없다.
 *    실제 `trap` 의 근거는 경로마다 다르다:
 *      - questions: 난이도 4~5 문항에 나왔다는 사실뿐
 *      - exam:      AI가 "혼동하기 쉽거나 고난도 문항에 쓰였다"고 표시
 */
export function trapTitle(source: EnglishStudySource): string {
  return source === 'questions'
    ? '고난도 문항에 나온 단어·구문'
    : '헷갈리기 쉬운 단어·구문';
}

export function trapHint(source: EnglishStudySource): string {
  return source === 'questions'
    ? '난이도 4~5단계 문항에 등장한 표현입니다.'
    : '혼동하기 쉽거나 고난도 문항에 쓰인 표현입니다.';
}

export function trapEmptyText(source: EnglishStudySource): string {
  return source === 'questions'
    ? '난이도 4~5단계 문항에서 뽑힌 표현이 없습니다.'
    : '따로 표시된 표현이 없습니다.';
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
    // ⚠️ **문항 안에서 먼저 중복을 제거한다.** count 는 "표현이 등장한 문항 수" 계약인데,
    //    한 문항이 `however` / `However` 를 둘 다 담고 있으면 mergeTerms 가 합산해
    //    count 2 → 화면에 "2문항"으로 표시된다. 실제로는 1문항이다 (적대적 리뷰 1.6).
    const seenWords = new Set<string>();
    const seenPatterns = new Set<string>();
    if (Array.isArray(q.key_vocab)) {
      for (const v of q.key_vocab) {
        if (!v || typeof v !== 'object') continue;
        const key = cleanText(v.word).toLowerCase();
        if (!key || seenWords.has(key)) continue;
        seenWords.add(key);
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
        const key = cleanText(s.pattern).toLowerCase();
        if (!key || seenPatterns.has(key)) continue;
        seenPatterns.add(key);
        structures.push({
          pattern: s.pattern,
          meaning: s.meaning,
          count: 1,
          trap,
        });
      }
    }
  }
  // count = 해당 표현이 등장한 **문항 수** (본문 등장 횟수가 아니다) → source 로 단위를 못 박는다.
  return stampEnglishStudyPack(parseEnglishStudyResult({ vocab, structures }, 'questions'), 'questions');
}

/** 팩에 경로·버전을 찍는다. 저장·캐시 판정의 기준이 된다. */
export function stampEnglishStudyPack(
  pack: EnglishStudyExtracted | null,
  source: EnglishStudySource,
): EnglishStudyExtracted | null {
  if (!pack) return null;
  return { ...pack, source, version: ENGLISH_STUDY_PACK_VERSION };
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
