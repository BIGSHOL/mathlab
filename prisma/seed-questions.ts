import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface RawQuestion {
  bookCode: string;
  chapter: string;
  section: string | null;
  questionNum: number;
  pageNum: number | null;
  difficulty: string;
  type: string;
  content: string;
  choices: string[] | null;
  answer: string;
  explanation: string | null;
  sourceTag: string | null;
}

const DIFFICULTY_MAP: Record<string, 'BASIC' | 'MEDIUM' | 'HIGH' | 'HIGHEST'> = {
  BASIC: 'BASIC',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  HIGHEST: 'HIGHEST',
};

const TYPE_MAP: Record<string, 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY'> = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  SHORT_ANSWER: 'SHORT_ANSWER',
  ESSAY: 'ESSAY',
};

// Strip null bytes and other invalid UTF-8 characters from strings
function sanitize(s: string | null | undefined): string | null {
  if (s == null) return null;
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim();
}

async function loadQuestions(filePath: string): Promise<RawQuestion[]> {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as RawQuestion[];
}

async function main() {
  const jsonFiles = [
    path.join(__dirname, '..', 'data', 'questions.json'),
    // 초등 큐브수학 실력
    path.join(__dirname, '..', 'data', 'questions-실력-3-1.json'),
    path.join(__dirname, '..', 'data', 'questions-실력-3-2.json'),
    path.join(__dirname, '..', 'data', 'questions-실력-4-1.json'),
    path.join(__dirname, '..', 'data', 'questions-실력-4-2.json'),
    path.join(__dirname, '..', 'data', 'questions-실력-5-1.json'),
    path.join(__dirname, '..', 'data', 'questions-실력-5-2.json'),
    path.join(__dirname, '..', 'data', 'questions-실력-6-1.json'),
    path.join(__dirname, '..', 'data', 'questions-실력-6-2.json'),
  ];

  let questions: RawQuestion[] = [];
  for (const jsonPath of jsonFiles) {
    const loaded = await loadQuestions(jsonPath);
    if (loaded.length > 0) {
      console.log(`Loaded ${loaded.length} questions from ${path.basename(jsonPath)}`);
      questions = questions.concat(loaded);
    }
  }

  if (questions.length === 0) {
    console.error('No question files found. Run PDF parsers first.');
    process.exit(1);
  }

  console.log(`Total: ${questions.length} questions`);
  console.log('Clearing existing questions...');
  await prisma.question.deleteMany();

  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);

    await prisma.question.createMany({
      data: batch.map((q) => ({
        bookCode: sanitize(q.bookCode)!,
        chapter: sanitize(q.chapter)!,
        section: sanitize(q.section),
        questionNum: q.questionNum,
        pageNum: q.pageNum,
        difficulty: DIFFICULTY_MAP[q.difficulty] ?? 'MEDIUM',
        type: TYPE_MAP[q.type] ?? 'SHORT_ANSWER',
        content: sanitize(q.content)!,
        choices: q.choices?.map((c) => sanitize(c)!) ?? undefined,
        answer: sanitize(q.answer) || '(정답 미등록)',
        explanation: sanitize(q.explanation),
        sourceTag: sanitize(q.sourceTag),
      })),
    });

    inserted += batch.length;
    process.stdout.write(`\r  Inserted ${inserted}/${questions.length} questions`);
  }

  console.log(`\n\nSeed completed! ${inserted} questions inserted.`);

  // Print summary
  const byBook = await prisma.question.groupBy({
    by: ['bookCode'],
    _count: true,
    orderBy: { bookCode: 'asc' },
  });
  console.log('\nSummary by book:');
  for (const b of byBook) {
    const prefix = b.bookCode.startsWith('E') ? '초' : '중';
    const code = b.bookCode.startsWith('E') ? b.bookCode.slice(1) : b.bookCode;
    console.log(`  ${prefix}${code}: ${b._count} questions`);
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
