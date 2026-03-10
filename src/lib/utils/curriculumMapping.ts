import {
  ELEMENTARY_SCHOOL_CURRICULUM,
  MIDDLE_SCHOOL_CURRICULUM,
  HIGH_SCHOOL_CURRICULUM,
} from '@/lib/constants/curriculum';
import { CurriculumUnit } from '@/types/mathgen';

export interface SemesterEntry {
  semesterKey: string;
  semesterNumber: number;
  chapters: CurriculumUnit[];
}

const HIGH_SCHOOL_GRADE_MAP: Record<string, string[]> = {
  high_1: ['공통수학1'],
  high_2: ['공통수학2'],
};

export function getCurriculumForGrade(gradeCode: string): SemesterEntry[] {
  const match = gradeCode.match(/^(elementary|middle|high)_(\d+)$/);
  if (!match) return [];

  const [, level, numStr] = match;
  const num = parseInt(numStr, 10);

  if (level === 'high') {
    const keys = HIGH_SCHOOL_GRADE_MAP[gradeCode];
    if (!keys) return [];
    return keys.map((key, i) => ({
      semesterKey: key,
      semesterNumber: i + 1,
      chapters: HIGH_SCHOOL_CURRICULUM[key] ?? [],
    }));
  }

  const source = level === 'elementary'
    ? ELEMENTARY_SCHOOL_CURRICULUM
    : MIDDLE_SCHOOL_CURRICULUM;

  const results: SemesterEntry[] = [];
  for (const sem of [1, 2]) {
    const key = `${num}학년 ${sem}학기`;
    const chapters = source[key];
    if (chapters) {
      results.push({ semesterKey: key, semesterNumber: sem, chapters });
    }
  }
  return results;
}
