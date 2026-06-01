/**
 * 학교 데이터 시딩 — src/lib/constants/schools.ts 기반
 * GPS 좌표 없는 버전 (대구/경북 지역 약 280개)
 *
 * 사용: node scripts/seed-schools.mjs
 */
import { PrismaClient } from '@prisma/client';
import { createRequire } from 'module';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

// schoolType 한글 → DB enum 매핑
function toSchoolType(t) {
  if (t === '중학교') return 'middle';
  if (t === '일반고' || t === '특목고' || t === '특성화고' || t === '자사고') return 'high';
  if (t === '초등학교') return 'elementary';
  return 'middle';
}

// schools.ts 를 문자열로 읽어서 배열만 추출
const raw = readFileSync('./src/lib/constants/schools.ts', 'utf8');
const match = raw.match(/SCHOOL_DATA[^=]*=\s*(\[[\s\S]*?\]);/);
if (!match) { console.error('파싱 실패'); process.exit(1); }

// eval 대신 JSON 변환: { name: "...", ... } → {"name": "...", ...}
const jsonStr = match[1]
  .replace(/\/\/[^\n]*/g, '')           // 주석 제거
  .replace(/(\w+):/g, '"$1":')          // 키 따옴표
  .replace(/'/g, '"')                   // 작은따옴표 → 큰따옴표
  .replace(/,\s*\]/g, ']')             // trailing comma
  .replace(/,\s*\}/g, '}');

const schools = JSON.parse(jsonStr);
console.log(`📋 총 ${schools.length}개 학교 시딩 시작...`);

const existing = await prisma.school.count();
if (existing > 0) {
  console.log(`⚠️  이미 ${existing}개 학교가 있습니다. 중복 건너뜀.`);
}

let created = 0, skipped = 0;
for (const s of schools) {
  const schoolType = toSchoolType(s.schoolType);
  const fullName = s.name.endsWith('교') ? s.name
    : s.schoolType === '중학교' ? s.name + '교'
    : s.name;

  const exists = await prisma.school.findFirst({
    where: { name: fullName, schoolType },
    select: { id: true },
  });

  if (exists) { skipped++; continue; }

  await prisma.school.create({
    data: {
      name: fullName,
      schoolType,
      city: s.city,
      district: s.district,
      address: `${s.city} ${s.district}`,
    },
  });
  created++;
}

console.log(`✅ 생성: ${created}개, 건너뜀: ${skipped}개`);
console.log('\n⚠️  GPS 좌표 없음 — 학교 검색은 가능하지만 주변 학교 비교 기능은 GPS 재등록 필요');
await prisma.$disconnect();
