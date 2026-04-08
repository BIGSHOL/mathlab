import type { DiagramType } from '@/lib/utils/svg-diagrams/types';

/** 학교급 */
export type PresetSchoolLevel = 'elementary' | 'middle' | 'high';

/** 하나의 다이어그램 프리셋 */
export interface DiagramPreset {
  /** 고유 ID (예: 'e3-1-frac-rect') */
  id: string;
  /** 한글 프리셋 이름 (예: '분수 사각형 1/3') */
  name: string;
  /** 프리셋 설명 (예: '3등분 중 1개 색칠') */
  description: string;
  /** 학교급 */
  schoolLevel: PresetSchoolLevel;
  /** 학년+학기 키 — curriculum.ts Record 키와 동일 (예: '3학년 1학기') */
  gradeKey: string;
  /** 단원명 — CurriculumUnit.name과 동일 (예: '분수와 소수') */
  chapter: string;
  /** 소단원명 (선택) */
  section?: string;
  /** 26개 다이어그램 타입 중 하나 */
  diagramType: DiagramType;
  /** 교육적으로 의미 있는 기본 파라미터 */
  defaultParams: Record<string, unknown>;
}

/** UI 트리 구조 — 단원별 그룹 */
export interface PresetChapterGroup {
  chapter: string;
  presets: DiagramPreset[];
}

/** UI 트리 구조 — 학년별 그룹 */
export interface PresetGradeGroup {
  gradeKey: string;
  chapters: PresetChapterGroup[];
}
