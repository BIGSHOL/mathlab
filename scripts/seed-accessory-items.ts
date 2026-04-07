/**
 * 모자/안경 악세사리 상점 아이템 시드 스크립트
 * Usage: npx tsx scripts/seed-accessory-items.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HAT_ITEMS = [
  { name: '필승 머리띠', hat: 'headband',   price: 50,  levelReq: 1, sortOrder: 1,  description: '시험 필승!' },
  { name: '야구모자',    hat: 'baseball',    price: 60,  levelReq: 1, sortOrder: 2,  description: '스포티한 야구모자' },
  { name: '베레모',      hat: 'beret',       price: 80,  levelReq: 2, sortOrder: 3,  description: '예술가 감성' },
  { name: '토끼귀',      hat: 'bunny',       price: 90,  levelReq: 2, sortOrder: 4,  description: '깜찍한 토끼귀' },
  { name: '졸업모',      hat: 'graduation',  price: 100, levelReq: 2, sortOrder: 5,  description: '학사모' },
  { name: '산타모자',    hat: 'santa',       price: 120, levelReq: 3, sortOrder: 6,  description: '메리 크리스마스!' },
  { name: '마법사모자',  hat: 'wizard',      price: 150, levelReq: 3, sortOrder: 7,  description: '수학 마법사' },
  { name: '왕관',        hat: 'crown',       price: 200, levelReq: 4, sortOrder: 8,  description: '황금빛 왕관' },
];

const GLASSES_ITEMS = [
  { name: '둥근안경',    glasses: 'round',      price: 50,  levelReq: 1, sortOrder: 1,  description: '지적인 둥근안경' },
  { name: '선글라스',    glasses: 'sunglasses',  price: 80,  levelReq: 1, sortOrder: 2,  description: '쿨한 선글라스' },
  { name: '하트안경',    glasses: 'heart',       price: 90,  levelReq: 2, sortOrder: 3,  description: '사랑스러운 하트' },
  { name: '별안경',      glasses: 'star',        price: 100, levelReq: 2, sortOrder: 4,  description: '반짝반짝 별 모양' },
  { name: '반짝이안경',  glasses: 'sparkle',     price: 120, levelReq: 3, sortOrder: 5,  description: '파티용 반짝이' },
  { name: 'VR고글',      glasses: 'vr',          price: 150, levelReq: 3, sortOrder: 6,  description: '미래에서 온 고글' },
];

async function main() {
  console.log('🎩 모자/안경 악세사리 시드 시작...\n');

  let created = 0;
  let skipped = 0;

  console.log('── 모자 ──');
  for (const item of HAT_ITEMS) {
    const existing = await prisma.shopItem.findFirst({
      where: { category: 'HAT', name: item.name },
    });
    if (existing) {
      console.log(`  ⏭️  ${item.name} — 이미 존재`);
      skipped++;
      continue;
    }
    await prisma.shopItem.create({
      data: {
        category: 'HAT',
        name: item.name,
        description: item.description,
        price: item.price,
        value: { hat: item.hat },
        levelReq: item.levelReq,
        sortOrder: item.sortOrder + 200,
        isActive: true,
      },
    });
    console.log(`  ✅ ${item.name} (${item.hat}) — ${item.price} XP, Lv.${item.levelReq}`);
    created++;
  }

  console.log('\n── 안경 ──');
  for (const item of GLASSES_ITEMS) {
    const existing = await prisma.shopItem.findFirst({
      where: { category: 'GLASSES', name: item.name },
    });
    if (existing) {
      console.log(`  ⏭️  ${item.name} — 이미 존재`);
      skipped++;
      continue;
    }
    await prisma.shopItem.create({
      data: {
        category: 'GLASSES',
        name: item.name,
        description: item.description,
        price: item.price,
        value: { glasses: item.glasses },
        levelReq: item.levelReq,
        sortOrder: item.sortOrder + 300,
        isActive: true,
      },
    });
    console.log(`  ✅ ${item.name} (${item.glasses}) — ${item.price} XP, Lv.${item.levelReq}`);
    created++;
  }

  console.log(`\n🎉 완료: ${created}개 생성, ${skipped}개 스킵`);
}

main()
  .catch((e) => {
    console.error('❌ 에러:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
