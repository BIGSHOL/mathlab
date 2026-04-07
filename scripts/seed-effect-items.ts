/**
 * 이펙트 상점 아이템 시드 스크립트
 * Usage: npx tsx scripts/seed-effect-items.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EFFECT_ITEMS = [
  { name: '반짝반짝',    effect: 'sparkle',    price: 50,  levelReq: 1, sortOrder: 1,  description: '작은 별들이 반짝거려요' },
  { name: '물방울',      effect: 'bubbles',    price: 60,  levelReq: 1, sortOrder: 2,  description: '투명한 물방울이 올라가요' },
  { name: '하트 뿅뿅',   effect: 'hearts',     price: 80,  levelReq: 1, sortOrder: 3,  description: '사랑스러운 하트가 떠올라요' },
  { name: '눈꽃',        effect: 'snowflake',  price: 80,  levelReq: 2, sortOrder: 4,  description: '하얀 눈이 내려요' },
  { name: '음표',        effect: 'music',      price: 80,  levelReq: 2, sortOrder: 5,  description: '음표가 떠다녀요' },
  { name: '꽃비',        effect: 'petals',     price: 90,  levelReq: 2, sortOrder: 6,  description: '알록달록 꽃잎이 흩날려요' },
  { name: '벚꽃비',      effect: 'cherry',     price: 100, levelReq: 2, sortOrder: 7,  description: '벚꽃잎이 흩날려요' },
  { name: '무지개 오라', effect: 'rainbow',    price: 100, levelReq: 3, sortOrder: 8,  description: '무지개 빛이 감싸요' },
  { name: '불꽃 오라',   effect: 'fire',       price: 120, levelReq: 3, sortOrder: 9,  description: '뜨거운 불꽃이 타올라요' },
  { name: '번개',        effect: 'lightning',  price: 150, levelReq: 3, sortOrder: 10, description: '번개가 번쩍여요' },
  { name: '푸른 불꽃',   effect: 'flame-blue', price: 180, levelReq: 4, sortOrder: 11, description: '신비로운 푸른 불꽃' },
  { name: '은하',        effect: 'galaxy',     price: 200, levelReq: 5, sortOrder: 12, description: '우주 별이 빛나요' },
];

async function main() {
  console.log('🎨 이펙트 상점 아이템 시드 시작...');

  let created = 0;
  let skipped = 0;

  for (const item of EFFECT_ITEMS) {
    // 이미 같은 이름+카테고리 존재하면 스킵
    const existing = await prisma.shopItem.findFirst({
      where: { category: 'EFFECT', name: item.name },
    });
    if (existing) {
      console.log(`  ⏭️  ${item.name} — 이미 존재`);
      skipped++;
      continue;
    }

    await prisma.shopItem.create({
      data: {
        category: 'EFFECT',
        name: item.name,
        description: item.description,
        price: item.price,
        value: { effect: item.effect },
        levelReq: item.levelReq,
        sortOrder: item.sortOrder + 100, // 기존 아이템 뒤에 배치
        isActive: true,
      },
    });
    console.log(`  ✅ ${item.name} (${item.effect}) — ${item.price} XP, Lv.${item.levelReq}`);
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
