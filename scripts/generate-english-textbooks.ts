/**
 * middle-units.md / high-units.md + *-unit-details.md
 * → src/lib/exam-analysis/english-textbooks.ts
 * 실행: npx tsx scripts/generate-english-textbooks.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd());
const DATA = join(ROOT, 'src/lib/exam-analysis/data/english-textbooks');
const OUT = join(ROOT, 'src/lib/exam-analysis/english-textbooks.ts');

const HIGH_COURSE_GRADE: Record<string, string> = {
  공통영어1: '고1',
  공통영어2: '고1',
  영어Ⅰ: '고2',
  영어Ⅱ: '고2',
  '영어 독해와 작문': '고2',
  기본영어1: '고2',
  기본영어2: '고2',
};

interface Lesson {
  title: string;
  passage?: string;
  grammar?: string;
  functions?: string;
  topicHint?: string;
}
interface Book {
  id: string;
  displayName: string;
  course: string;
  grade: string;
  lessons: Lesson[];
}

type DetailFields = Pick<Lesson, 'passage' | 'grammar' | 'functions' | 'topicHint'>;
type DetailIndex = Map<string, Map<string, DetailFields>>;

function slug(parts: string[]): string {
  return parts
    .join('-')
    .replace(/Ⅰ/g, '1')
    .replace(/Ⅱ/g, '2')
    .replace(/[^\w가-힣-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function authorOf(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? displayName;
}

function cleanLessonTitle(raw: string): string | null {
  let t = raw.trim();
  t = t.replace(/\s+\*[^*]*\*\s*$/g, '').trim();
  t = t.replace(/\s+\([^)]*미확인[^)]*\)\s*$/g, '').trim();
  t = t.replace(/\s+·\s+.+$/, '').trim();
  if (!t) return null;
  if (t === '단원 미확인' || t === '미확인') return null;
  if (/(?:Lesson|Unit|Special Lesson|Special Unit|SL)\.?\s*미확인$/i.test(t)) return null;
  return t;
}

function cleanField(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let t = raw.replace(/\*+([^*]+)\*+/g, '$1').replace(/\s+/g, ' ').trim();
  if (!t || t === '—' || t === '-' || t === '–') return undefined;
  if (t === '미확인' || t.startsWith('미확인')) return undefined;
  return t;
}

function normalizeCourse(raw: string): string {
  const compact = raw.replace(/\s+/g, '');
  if (compact === '영어I' || compact === '영어1') return '영어Ⅰ';
  if (compact === '영어II' || compact === '영어2') return '영어Ⅱ';
  if (compact === '영어독해와작문') return '영어 독해와 작문';
  return raw.trim();
}

function catalogBookKey(book: Book): string {
  const author = authorOf(book.displayName);
  if (book.grade.startsWith('중')) return `중|${book.grade}|${author}`;
  return `고|${book.course}|${author}`;
}

function lessonMatchKey(title: string): string {
  const t = title.replace(/\*+[^*]+\*/g, '').replace(/\s+·\s+.+$/, '').trim();
  if (/^(?:SL|Special\s+Lesson)\b/i.test(t)) {
    const n = t.match(/(\d+)/);
    return n ? `sl:${n[1]}` : 'sl';
  }
  if (/^SR\b/i.test(t)) {
    const n = t.match(/(\d+)/);
    return n ? `sr:${n[1]}` : 'sr';
  }
  if (/^(?:SU|Special\s+Unit)\b/i.test(t)) {
    const n = t.match(/(\d+)/);
    return n ? `su:${n[1]}` : 'su';
  }
  if (/^Project\b/i.test(t)) {
    const n = t.match(/(\d+)/);
    return n ? `p:${n[1]}` : 'p';
  }
  const n = t.match(/^(?:L|U|Lesson|Unit)\s*\.?\s*(\d+)/i);
  if (n) return `l:${n[1]}`;
  return `t:${t.toLowerCase()}`;
}

function parseMiddle(md: string): Book[] {
  const books: Book[] = [];
  let displayName = '';
  let grade = '';
  let lessons: Lesson[] = [];

  const flush = () => {
    if (displayName && grade && lessons.length) {
      books.push({
        id: slug(['중', grade, displayName]),
        displayName,
        course: grade,
        grade,
        lessons: [...lessons],
      });
    }
    lessons = [];
  };

  for (const line of md.split(/\r?\n/)) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      flush();
      displayName = h2[1].trim();
      grade = '';
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      flush();
      grade = h3[1].trim();
      continue;
    }
    const item = line.match(/^\s*-\s+(.+)$/);
    if (item && displayName && grade) {
      const title = cleanLessonTitle(item[1]);
      if (title) lessons.push({ title });
    }
  }
  flush();
  return books;
}

function parseHigh(md: string): Book[] {
  const books: Book[] = [];
  let course = '';
  let displayName = '';
  let lessons: Lesson[] = [];

  const flush = () => {
    if (course && displayName && lessons.length) {
      const grade = HIGH_COURSE_GRADE[course] ?? '고3';
      books.push({
        id: slug(['고', course, displayName]),
        displayName,
        course,
        grade,
        lessons: [...lessons],
      });
    }
    lessons = [];
  };

  for (const line of md.split(/\r?\n/)) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      flush();
      course = h2[1].trim();
      displayName = '';
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      flush();
      let name = h3[1].trim();
      if (/^I\s+/.test(name)) {
        if (course === '영어Ⅰ') {
          displayName = '';
          continue;
        }
        name = name.replace(/^I\s+/, '').trim();
      }
      displayName = name;
      continue;
    }
    const item = line.match(/^\s*-\s+(.+)$/);
    if (item && course && displayName) {
      const title = cleanLessonTitle(item[1]);
      if (title) lessons.push({ title });
    }
  }
  flush();
  return books;
}

function splitTableRow(line: string): string[] {
  return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function parseMiddleDetails(md: string): DetailIndex {
  const index: DetailIndex = new Map();
  let bookKey = '';
  let inTable = false;

  const ensure = (key: string) => {
    if (!index.has(key)) index.set(key, new Map());
    return index.get(key)!;
  };

  for (const line of md.split(/\r?\n/)) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      inTable = false;
      const heading = h2[1].trim();
      const parts = heading.split(/\s*·\s*/);
      if (parts.length >= 3 && /^중[12]$/.test(parts[parts.length - 1])) {
        const grade = parts[parts.length - 1];
        const author = parts[parts.length - 2];
        bookKey = `중|${grade}|${author}`;
      } else {
        bookKey = '';
      }
      continue;
    }
    if (!bookKey) continue;
    if (/^\|?\s*#\s*\|/.test(line) || /^\|?\s*---/.test(line)) {
      inTable = true;
      continue;
    }
    if (inTable && line.trim().startsWith('|')) {
      const cols = splitTableRow(line);
      if (cols.length < 4) continue;
      const [num, _title, passage, grammar, functions, topic] = cols;
      const key = lessonMatchKey(num || '');
      if (key.startsWith('t:')) continue;
      const fields: DetailFields = {};
      const p = cleanField(passage);
      const g = cleanField(grammar);
      const f = cleanField(functions);
      const th = cleanField(topic);
      if (p) fields.passage = p;
      if (g) fields.grammar = g;
      if (f) fields.functions = f;
      if (th) fields.topicHint = th;
      if (Object.keys(fields).length) ensure(bookKey).set(key, fields);
      continue;
    }
    if (inTable && !line.trim()) inTable = false;
  }
  return index;
}

function parseHighDetails(md: string): DetailIndex {
  const index: DetailIndex = new Map();
  let bookKey = '';
  let lessonKey = '';
  let current: DetailFields = {};

  const ensure = (key: string) => {
    if (!index.has(key)) index.set(key, new Map());
    return index.get(key)!;
  };

  const flushLesson = () => {
    if (bookKey && lessonKey && Object.keys(current).length) {
      ensure(bookKey).set(lessonKey, { ...current });
    }
    lessonKey = '';
    current = {};
  };

  for (const line of md.split(/\r?\n/)) {
    const h4 = line.match(/^####\s+(.+)$/);
    if (h4) {
      flushLesson();
      const heading = h4[1].trim();
      const parts = heading.split('-');
      if (parts.length >= 2) {
        const author = parts[parts.length - 1];
        const course = normalizeCourse(parts[0]);
        bookKey = `고|${course}|${author}`;
      } else {
        bookKey = '';
      }
      continue;
    }
    if (!bookKey) continue;
    const lessonHead = line.match(/^\s*-\s+\*\*(.+?)\*\*/);
    if (lessonHead) {
      flushLesson();
      const title = cleanLessonTitle(lessonHead[1]);
      lessonKey = title ? lessonMatchKey(title) : '';
      current = {};
      continue;
    }
    const field = line.match(/^\s*-\s+(본문|토픽|기능|문법)\s*:\s*(.+)$/);
    if (field && lessonKey) {
      const value = cleanField(field[2]);
      if (!value) continue;
      if (field[1] === '본문') current.passage = value;
      if (field[1] === '토픽') current.topicHint = value;
      if (field[1] === '기능') current.functions = value;
      if (field[1] === '문법') current.grammar = value;
    }
  }
  flushLesson();
  return index;
}

function overlay(books: Book[], details: DetailIndex): { matched: number; filled: number } {
  let matched = 0;
  let filled = 0;
  for (const book of books) {
    const map = details.get(catalogBookKey(book));
    if (!map) continue;
    matched += 1;
    for (const lesson of book.lessons) {
      const extra = map.get(lessonMatchKey(lesson.title));
      if (!extra) continue;
      if (extra.passage) lesson.passage = extra.passage;
      if (extra.grammar) lesson.grammar = extra.grammar;
      if (extra.functions) lesson.functions = extra.functions;
      if (extra.topicHint) lesson.topicHint = extra.topicHint;
      filled += 1;
    }
  }
  return { matched, filled };
}

function tsString(s: string): string {
  return JSON.stringify(s);
}

function emitLesson(l: Lesson): string {
  const fields = [`title: ${tsString(l.title)}`];
  if (l.passage) fields.push(`passage: ${tsString(l.passage)}`);
  if (l.grammar) fields.push(`grammar: ${tsString(l.grammar)}`);
  if (l.functions) fields.push(`functions: ${tsString(l.functions)}`);
  if (l.topicHint) fields.push(`topicHint: ${tsString(l.topicHint)}`);
  return `      { ${fields.join(', ')} }`;
}

function emit(books: Book[]): string {
  const byGrade: Record<string, string[]> = {};
  for (const b of books) {
    if (!byGrade[b.grade]) byGrade[b.grade] = [];
    if (!byGrade[b.grade].includes(b.course)) byGrade[b.grade].push(b.course);
  }

  const rows = books.map((b) => {
    const lessons = b.lessons.map(emitLesson).join(',\n');
    return `  {
    id: ${tsString(b.id)},
    displayName: ${tsString(b.displayName)},
    course: ${tsString(b.course)},
    grade: ${tsString(b.grade)},
    lessons: [
${lessons},
    ],
  }`;
  });

  return `/**
 * 2022 개정 영어 교과서 Lesson/Unit 카탈로그.
 * 소스: data/english-textbooks/{middle,high}-units.md
 *        + {middle,high}-unit-details.md (본문·문법·의사소통)
 * 재생성: npx tsx scripts/generate-english-textbooks.ts
 *
 * 출제범위(업로드)용. 문항 topic 분류(문법/독해 항목)는 english-topics.ts 가 담당.
 */

export interface EnglishTextbookLesson {
  title: string;
  /** 읽기 본문 제목 */
  passage?: string;
  /** 해당 레슨 핵심 문법 */
  grammar?: string;
  /** 의사소통 기능 */
  functions?: string;
  /** 소재 힌트 (공식 Topic이 아닌 경우 포함) */
  topicHint?: string;
}

export interface EnglishTextbook {
  id: string;
  displayName: string;
  course: string;
  grade: string;
  lessons: EnglishTextbookLesson[];
}

export const ENGLISH_TEXTBOOKS: EnglishTextbook[] = [
${rows.join(',\n')},
];

const COURSE_ORDER: Record<string, string[]> = ${JSON.stringify(byGrade, null, 2)};

export function getEnglishCoursesForGrade(grade: string | null | undefined): string[] {
  if (!grade) return [];
  return COURSE_ORDER[grade.trim()] ?? [];
}

export function getEnglishTextbooks(
  grade: string | null | undefined,
  course?: string | null,
): EnglishTextbook[] {
  if (!grade) return [];
  const g = grade.trim();
  return ENGLISH_TEXTBOOKS.filter((b) => {
    if (b.grade !== g) return false;
    if (course && course.trim()) return b.course === course.trim();
    return true;
  });
}

export function getEnglishTextbookById(id: string | null | undefined): EnglishTextbook | undefined {
  if (!id) return undefined;
  return ENGLISH_TEXTBOOKS.find((b) => b.id === id);
}

/** 출제범위 value — AI 프롬프트·저장용 표시 문자열 */
export function formatEnglishLessonScopeValue(book: EnglishTextbook, lessonTitle: string): string {
  return \`\${book.course} > \${book.displayName} > \${lessonTitle}\`;
}

function lessonHint(lesson: EnglishTextbookLesson): string | undefined {
  const bits = [lesson.grammar, lesson.passage].filter(Boolean);
  return bits.length ? bits.join(' · ') : undefined;
}

export function getEnglishLessonScopeOptions(textbookId: string | null | undefined): Array<{
  value: string;
  label: string;
  hint?: string;
}> {
  const book = getEnglishTextbookById(textbookId);
  if (!book) return [];
  return book.lessons.map((l) => ({
    value: formatEnglishLessonScopeValue(book, l.title),
    hint: lessonHint(l),
    label: l.title,
  }));
}

export function findEnglishLessonByScopeValue(value: string): EnglishTextbookLesson | undefined {
  const parts = value.split(' > ').map((p) => p.trim());
  if (parts.length < 3) return undefined;
  const [course, displayName, ...rest] = parts;
  const title = rest.join(' > ');
  const book = ENGLISH_TEXTBOOKS.find((b) => b.course === course && b.displayName === displayName);
  return book?.lessons.find((l) => l.title === title);
}

/** 분석 프롬프트용 — 선택한 레슨의 본문·문법을 같이 적는다 */
export function describeEnglishExamScope(scope: string[]): string {
  return scope.map((value) => {
    const lesson = findEnglishLessonByScopeValue(value);
    if (!lesson) return \`- \${value}\`;
    const lines = [\`- \${value}\`];
    if (lesson.passage) lines.push(\`  본문: \${lesson.passage}\`);
    if (lesson.grammar) lines.push(\`  문법: \${lesson.grammar}\`);
    if (lesson.functions) lines.push(\`  의사소통: \${lesson.functions}\`);
    return lines.join('\\n');
  }).join('\\n');
}
`;
}

const middle = parseMiddle(readFileSync(join(DATA, 'middle-units.md'), 'utf8'));
const high = parseHigh(readFileSync(join(DATA, 'high-units.md'), 'utf8'));
const books = [...middle, ...high];
const midDetails = parseMiddleDetails(readFileSync(join(DATA, 'middle-unit-details.md'), 'utf8'));
const highDetails = parseHighDetails(readFileSync(join(DATA, 'high-unit-details.md'), 'utf8'));
const midStats = overlay(books, midDetails);
const highStats = overlay(books, highDetails);
writeFileSync(OUT, emit(books), 'utf8');

const byGrade: Record<string, number> = {};
for (const b of books) byGrade[b.grade] = (byGrade[b.grade] ?? 0) + 1;
const withGrammar = books.reduce((n, b) => n + b.lessons.filter((l) => l.grammar).length, 0);
const withPassage = books.reduce((n, b) => n + b.lessons.filter((l) => l.passage).length, 0);
console.log(`wrote ${books.length} textbooks → ${OUT}`);
console.log(byGrade);
console.log(`lessons: ${books.reduce((n, b) => n + b.lessons.length, 0)}`);
console.log(`details overlay middle books ${midStats.matched} lessons ${midStats.filled}`);
console.log(`details overlay high books ${highStats.matched} lessons ${highStats.filled}`);
console.log(`passage ${withPassage} / grammar ${withGrammar}`);
