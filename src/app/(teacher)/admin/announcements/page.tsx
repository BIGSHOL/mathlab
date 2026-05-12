/**
 * /admin/announcements — Pattern G V3 (ReleaseNotes) 릴리즈 노트.
 * 시안: data/refact2/pages/pattern-g-static-doc-hifi.html § V3
 *
 * 데이터 출처: src/lib/data/updates.ts ALL_UPDATES (audience 'admin' 포함)
 * UpdateLog → Release 변환:
 *   - title → release.title
 *   - date "YYYY-MM-DD" → release.date "YYYY.MM.DD"
 *   - entries (type별 그룹핑) → release.groups
 *   - UpdateType feature/add → 'new', improve → 'imp', fix → 'fix'
 *   - 변경 수가 많은 업데이트는 'major', 적은 건 'minor', 단일 그룹 fix만 → 'patch'
 *
 * 권한: 기존 /updates 페이지가 admin 전용이라면 본 페이지도 SUPER_ADMIN 가드 추가 권장.
 *   현재는 (teacher) layout이 통제하므로 별도 가드 생략.
 */
import { requireSuperAdmin } from '@/lib/api/auth';
import { isResponse } from '@/lib/api/helpers';
import { redirect } from 'next/navigation';
import { ReleaseNotes } from '@/components/docs';
import type {
  Release,
  ReleaseChangeGroup,
  ReleaseChangeType,
  ReleaseVersionLevel,
} from '@/components/docs';
import {
  ALL_UPDATES,
  type UpdateLog,
  type UpdateType,
} from '@/lib/data/updates';

export const metadata = {
  title: '릴리즈 노트 | Injaewon MathLAB',
  description: 'MathLAB 변경 이력 · 새 기능 · 버그 픽스',
};

/* ── UpdateType → ReleaseChangeType 매핑 ── */
const TYPE_MAP: Record<UpdateType, ReleaseChangeType> = {
  feature: 'new',
  add: 'new',
  improve: 'imp',
  fix: 'fix',
};

const GROUP_LABEL: Record<ReleaseChangeType, string> = {
  new: '✨ 새 기능',
  imp: '🎨 개선',
  fix: '🐞 버그 픽스',
  brk: '🚨 호환성 변경',
};

function convertUpdateLog(log: UpdateLog, idx: number): Release {
  // 버전: 날짜 기반 (실제 SemVer 없음). idx 기반으로 v3.x.y 부여
  // 최신 = v3.{totalCount - idx}.0
  const groupsMap = new Map<ReleaseChangeType, ReleaseChangeGroup>();
  for (const e of log.entries) {
    const type = TYPE_MAP[e.type];
    if (!groupsMap.has(type)) {
      groupsMap.set(type, { type, label: GROUP_LABEL[type], items: [] });
    }
    groupsMap.get(type)!.items.push({ text: e.text });
  }
  const groups = Array.from(groupsMap.values());

  // level 판정: 새 기능 4개 이상 → major, 새 기능 1+ → minor, fix만 → patch
  let level: ReleaseVersionLevel = 'patch';
  const newCount = groupsMap.get('new')?.items.length ?? 0;
  if (newCount >= 4) level = 'major';
  else if (newCount > 0) level = 'minor';

  return {
    version: `v3.${ALL_UPDATES.length - idx}.0`,
    level,
    title: log.title,
    date: log.date.replace(/-/g, '.'),
    groups,
  };
}

export default async function AnnouncementsPage() {
  const user = await requireSuperAdmin();
  if (isResponse(user)) redirect('/overview');

  // admin audience 만 (또는 audience 무관 전부 노출 — SUPER_ADMIN)
  const adminLogs = ALL_UPDATES.filter((u) => u.audience.includes('admin'));
  const releases = adminLogs.map(convertUpdateLog);

  return (
    <main className="min-h-screen bg-[var(--bg)] overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <ReleaseNotes
          releases={releases}
          title="MathLAB 릴리즈 노트"
          subtitle="플랫폼 변경 이력 — 새 기능 · 개선 · 버그 픽스"
        />
      </div>
    </main>
  );
}
