import { PrismaClient } from '@prisma/client';
import { ALL_CONCEPTS, CROSS_GRADE_CHAINS } from '../src/lib/constants/concepts';
import { SCHOOL_DATA } from '../src/lib/constants/schools';

const prisma = new PrismaClient();

const GRADE_TO_LEVEL: Record<string, number> = {
  elementary_3: 3,
  elementary_4: 4,
  elementary_5: 5,
  elementary_6: 6,
  middle_1: 7,
  middle_2: 8,
  middle_3: 9,
  high_1: 10,
};

const GRADE_LABELS: Record<string, string> = {
  elementary_3: '초등 3학년',
  elementary_4: '초등 4학년',
  elementary_5: '초등 5학년',
  elementary_6: '초등 6학년',
  middle_1: '중학 1학년',
  middle_2: '중학 2학년',
  middle_3: '중학 3학년',
  high_1: '고등 (공통수학1)',
};

const PART_LABELS: Record<string, string> = {
  calc: '수와 연산',
  algebra: '대수',
  func: '함수',
  geo: '도형',
  data: '자료와 확률',
};

async function seedConcepts() {
  console.log('=== Seeding Concepts ===');

  // Clean existing concept prerequisites first (depends on concepts)
  await prisma.conceptPrerequisite.deleteMany();

  // Group concepts by grade to create subjects
  const gradeGroups = new Map<string, typeof ALL_CONCEPTS>();
  for (const c of ALL_CONCEPTS) {
    const group = gradeGroups.get(c.grade) || [];
    group.push(c);
    gradeGroups.set(c.grade, group);
  }

  // Create subjects for each grade if they don't exist, then create concepts
  const conceptIdMap = new Map<string, string>(); // conceptCode -> prisma ID

  for (const [grade, concepts] of gradeGroups) {
    const gradeLevel = GRADE_TO_LEVEL[grade] ?? 7;
    const gradeLabel = GRADE_LABELS[grade] ?? grade;

    // Find or create subject for this grade
    let subject = await prisma.subject.findFirst({
      where: { gradeLevel, title: { startsWith: gradeLabel } },
    });

    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          title: `${gradeLabel} 수학`,
          description: `${gradeLabel} 수학 개념`,
          gradeLevel,
          sortOrder: gradeLevel,
        },
      });
    }

    // Create concepts
    for (let i = 0; i < concepts.length; i++) {
      const c = concepts[i];

      // Check if concept already exists
      const existing = await prisma.concept.findFirst({
        where: { conceptCode: c.id },
      });

      if (existing) {
        // Update existing concept with enriched data
        await prisma.concept.update({
          where: { id: existing.id },
          data: {
            title: c.name,
            fullContent: c.description,
            grade: c.grade,
            category: c.category,
            part: c.part,
            sortOrder: i + 1,
          },
        });
        conceptIdMap.set(c.id, existing.id);
        continue;
      }

      const created = await prisma.concept.create({
        data: {
          subjectId: subject.id,
          title: c.name,
          fullContent: c.description,
          conceptCode: c.id,
          grade: c.grade,
          category: c.category,
          part: c.part,
          sortOrder: i + 1,
        },
      });
      conceptIdMap.set(c.id, created.id);
    }
  }

  console.log(`Created ${conceptIdMap.size} concepts`);

  // Create prerequisite relationships
  let prereqCount = 0;
  for (const c of ALL_CONCEPTS) {
    const conceptId = conceptIdMap.get(c.id);
    if (!conceptId || c.prerequisites.length === 0) continue;

    for (const prereqCode of c.prerequisites) {
      const prereqId = conceptIdMap.get(prereqCode);
      if (!prereqId) continue;

      // Check if relationship already exists
      const existing = await prisma.conceptPrerequisite.findUnique({
        where: { conceptId_prerequisiteId: { conceptId, prerequisiteId: prereqId } },
      });
      if (existing) continue;

      await prisma.conceptPrerequisite.create({
        data: { conceptId, prerequisiteId: prereqId },
      });
      prereqCount++;
    }
  }

  console.log(`Created ${prereqCount} prerequisite relationships`);
  console.log(`Cross-grade chains: ${Object.keys(CROSS_GRADE_CHAINS).length}`);

  return conceptIdMap;
}

async function seedSchools() {
  console.log('\n=== Seeding Schools ===');

  // Check if schools already exist
  const existingCount = await prisma.school.count();
  if (existingCount > 0) {
    console.log(`Schools already exist (${existingCount}), skipping...`);
    return;
  }

  let count = 0;
  for (const school of SCHOOL_DATA) {
    await prisma.school.create({
      data: {
        name: school.name,
        city: school.city,
        district: school.district,
        schoolType: school.schoolType,
      },
    });
    count++;
  }

  console.log(`Created ${count} schools`);
}

/**
 * Question.conceptId를 Concept와 매핑 (chapter 이름 기반 매칭)
 */
async function linkQuestionsToConcepts() {
  console.log('\n=== Linking Questions to Concepts ===');

  // 모든 개념 로드 (conceptCode, title, chapter 포함)
  const concepts = await prisma.concept.findMany({
    select: { id: true, conceptCode: true, title: true, chapter: true, grade: true },
  });

  // conceptId가 없는 문제만 대상
  const questions = await prisma.question.findMany({
    where: { conceptId: null },
    select: { id: true, chapter: true, section: true, bookCode: true },
  });

  if (questions.length === 0) {
    console.log('No unlinked questions found');
    return;
  }

  // bookCode → grade 매핑 (1-1=middle_1 1학기, 2-2=middle_2 2학기 등)
  const bookCodeToGrade: Record<string, string> = {
    '1-1': 'middle_1', '1-2': 'middle_1',
    '2-1': 'middle_2', '2-2': 'middle_2',
    '3-1': 'middle_3', '3-2': 'middle_3',
  };

  let linked = 0;
  for (const q of questions) {
    const grade = bookCodeToGrade[q.bookCode];
    if (!grade) continue;

    // 같은 학년의 개념 중 chapter 또는 title에 매칭되는 것 찾기
    const gradeConcepts = concepts.filter(c => c.grade === grade);

    // 1차: chapter 이름이 개념 title에 포함되는지 확인
    let matched = gradeConcepts.find(c =>
      q.chapter && c.title && (
        q.chapter.includes(c.title) || c.title.includes(q.chapter)
      )
    );

    // 2차: section과 title 매칭
    if (!matched && q.section) {
      matched = gradeConcepts.find(c =>
        c.title && (
          q.section!.includes(c.title) || c.title.includes(q.section!)
        )
      );
    }

    // 3차: 키워드 기반 유사 매칭 (chapter의 핵심 단어)
    if (!matched && q.chapter) {
      const chapterWords = q.chapter.replace(/[^가-힣a-zA-Z]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
      for (const concept of gradeConcepts) {
        const matchCount = chapterWords.filter(w => concept.title.includes(w)).length;
        if (matchCount >= 2 || (chapterWords.length === 1 && matchCount === 1)) {
          matched = concept;
          break;
        }
      }
    }

    if (matched) {
      await prisma.question.update({
        where: { id: q.id },
        data: { conceptId: matched.id },
      });
      linked++;
    }
  }

  console.log(`Linked ${linked}/${questions.length} questions to concepts`);
}

/**
 * 기존 레벨테스트 결과 재분석 (계통도 데이터 반영)
 */
async function reanalyzeLevelTests() {
  console.log('\n=== Re-analyzing Level Test Results ===');

  const attempts = await prisma.testAttempt.findMany({
    where: {
      test: { testType: 'level_test' },
      completedAt: { not: null },
    },
    select: { id: true, studentId: true },
  });

  if (attempts.length === 0) {
    console.log('No completed level test attempts found');
    return;
  }

  console.log(`Found ${attempts.length} completed level test attempts`);

  // Dynamic import to avoid circular dependency
  const { analyzeLevelTest } = await import('../src/lib/services/level-test');

  let reanalyzed = 0;
  for (const attempt of attempts) {
    try {
      await analyzeLevelTest(attempt.id, attempt.studentId);
      reanalyzed++;
    } catch (e) {
      console.warn(`Failed to re-analyze attempt ${attempt.id}:`, (e as Error).message);
    }
  }

  console.log(`Re-analyzed ${reanalyzed}/${attempts.length} attempts`);
}

async function main() {
  console.log('Starting concept & school seed...\n');

  await seedConcepts();
  await seedSchools();
  await linkQuestionsToConcepts();
  await reanalyzeLevelTests();

  console.log('\nSeed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
