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

async function main() {
  console.log('Starting concept & school seed...\n');

  await seedConcepts();
  await seedSchools();

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
