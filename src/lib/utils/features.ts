import { prisma } from '@/lib/db';

export type FeatureKey =
  | 'time_attack'
  | 'daily_mission'
  | 'badge_system'
  | 'quiz_speed_scoring'
  | 'revenge_challenge'
  | 'class_competition'
  | 'daily_question'
  | 'enhanced_levelup';

/** 초기 Feature Flag 시드 데이터 */
export const FEATURE_FLAG_SEEDS: Array<{ key: FeatureKey; label: string }> = [
  { key: 'time_attack', label: '연산 타임어택' },
  { key: 'daily_mission', label: '일일 미션' },
  { key: 'badge_system', label: '칭호/배지' },
  { key: 'quiz_speed_scoring', label: '퀴즈 속도 채점' },
  { key: 'revenge_challenge', label: '복수전' },
  { key: 'class_competition', label: '반 대항전' },
  { key: 'daily_question', label: '오늘의 한 문제' },
  { key: 'enhanced_levelup', label: '레벨업 연출 강화' },
];

/** 전체 Feature Flag 맵 반환 (서버용) */
export async function getFeatureFlags(): Promise<Record<string, boolean>> {
  const flags = await prisma.featureFlag.findMany();
  const map: Record<string, boolean> = {};
  for (const f of flags) map[f.key] = f.enabled;
  return map;
}

/** 특정 Feature가 활성화되어 있는지 확인 (서버용, 글로벌 tenantId=null 기준) */
export async function isFeatureEnabled(key: FeatureKey): Promise<boolean> {
  const flag = await prisma.featureFlag.findFirst({ where: { key, tenantId: null } });
  return flag?.enabled ?? true; // 미등록 = 기본 활성
}

/** Feature Flag 시드: 없는 키만 생성 (글로벌 tenantId=null) */
export async function seedFeatureFlags() {
  for (const seed of FEATURE_FLAG_SEEDS) {
    const existing = await prisma.featureFlag.findFirst({
      where: { key: seed.key, tenantId: null },
    });
    if (!existing) {
      await prisma.featureFlag.create({
        data: { key: seed.key, label: seed.label, enabled: true, tenantId: null },
      });
    }
  }
}
