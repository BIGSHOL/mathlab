import type { DiagramPreset, PresetSchoolLevel, PresetGradeGroup } from './types';
import { ELEMENTARY_PRESETS } from './elementary-presets';
import { MIDDLE_PRESETS } from './middle-presets';
import { HIGH_PRESETS } from './high-presets';

export type { DiagramPreset, PresetSchoolLevel, PresetGradeGroup };

/** 전체 프리셋 (flat) */
export const ALL_PRESETS: DiagramPreset[] = [
  ...ELEMENTARY_PRESETS,
  ...MIDDLE_PRESETS,
  ...HIGH_PRESETS,
];

/** 학교급별 프리셋 */
export function getPresetsForLevel(level: PresetSchoolLevel): DiagramPreset[] {
  switch (level) {
    case 'elementary': return ELEMENTARY_PRESETS;
    case 'middle': return MIDDLE_PRESETS;
    case 'high': return HIGH_PRESETS;
  }
}

/** 학교급 내 학년 키 목록 (순서 유지) */
export function getGradeKeysForLevel(level: PresetSchoolLevel): string[] {
  const presets = getPresetsForLevel(level);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of presets) {
    if (!seen.has(p.gradeKey)) {
      seen.add(p.gradeKey);
      result.push(p.gradeKey);
    }
  }
  return result;
}

/** 학년 키 → 단원별 프리셋 그룹 */
export function groupPresetsByGrade(level: PresetSchoolLevel): PresetGradeGroup[] {
  const presets = getPresetsForLevel(level);
  const gradeMap = new Map<string, Map<string, DiagramPreset[]>>();

  for (const p of presets) {
    if (!gradeMap.has(p.gradeKey)) gradeMap.set(p.gradeKey, new Map());
    const chapterMap = gradeMap.get(p.gradeKey)!;
    if (!chapterMap.has(p.chapter)) chapterMap.set(p.chapter, []);
    chapterMap.get(p.chapter)!.push(p);
  }

  return Array.from(gradeMap.entries()).map(([gradeKey, chapterMap]) => ({
    gradeKey,
    chapters: Array.from(chapterMap.entries()).map(([chapter, presets]) => ({
      chapter,
      presets,
    })),
  }));
}

/** 전체 프리셋 검색 (이름/설명/단원/타입) */
export function searchPresets(query: string): DiagramPreset[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return ALL_PRESETS.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    p.chapter.toLowerCase().includes(q) ||
    p.diagramType.includes(q)
  );
}

/** 학년 키를 짧은 라벨로 변환 */
export function gradeKeyToShortLabel(gradeKey: string): string {
  // 초중등: "3학년 1학기" → "3-1"
  const match = gradeKey.match(/(\d)학년\s*(\d)학기/);
  if (match) return `${match[1]}-${match[2]}`;
  // 고등: "공통수학1" → "공수1", "미적분I" → "미적I" 등
  const highMap: Record<string, string> = {
    '공통수학1': '공수1',
    '공통수학2': '공수2',
    '대수': '대수',
    '미적분I': '미적I',
    '미적분II': '미적II',
    '확률과 통계': '확통',
    '기하': '기하',
  };
  return highMap[gradeKey] ?? gradeKey;
}
