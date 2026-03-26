import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ids = [
  'cmn64ldtj003fuf7sxblgkme2',
  'cmn64lm72008ruf7s6m1ajv67',
  'cmn64laid0015uf7soxlf9jiv',
  'cmn64l8za0001uf7shmy0q7u8',
  'cmn64l91p0003uf7s3e9airuy',
  'cmn64ljbz006zuf7stas7va11',
  'cmn64le26003luf7s0idf3wrt',
  'cmn64ldmn003buf7sr4ilkv89',
  'cmn64ldvg003huf7s62p1zfjs',
  'cmn64ln81009juf7s93fex4r3',
];

async function main() {
  const concepts = await prisma.concept.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      title: true,
      grade: true,
      semester: true,
      chapter: true,
      section: true,
      conceptCode: true,
      sortOrder: true,
      keywords: true,
      fullContent: true,
    },
  });

  const sorted = ids.map(id => concepts.find(c => c.id === id)).filter(Boolean);

  for (const c of sorted) {
    console.log('='.repeat(100));
    console.log(`ID: ${c!.id}`);
    console.log(`Title: ${c!.title}`);
    console.log(`Grade: ${c!.grade}`);
    console.log(`Semester: ${c!.semester}`);
    console.log(`Chapter: ${c!.chapter}`);
    console.log(`Section: ${c!.section}`);
    console.log(`ConceptCode: ${c!.conceptCode}`);
    console.log(`SortOrder: ${c!.sortOrder}`);
    console.log(`Keywords: ${JSON.stringify(c!.keywords)}`);
    console.log(`\n--- fullContent ---\n`);
    console.log(c!.fullContent);
    console.log('\n');
  }

  console.log(`\nTotal: ${sorted.length} / ${ids.length} found`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
