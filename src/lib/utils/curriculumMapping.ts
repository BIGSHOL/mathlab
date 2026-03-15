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
  high_algebra: ['대수'],
  high_calculus1: ['미적분I'],
  high_prob: ['확률과 통계'],
  high_calculus2: ['미적분II'],
  high_geo: ['기하'],
};

export function getCurriculumForGrade(gradeCode: string): SemesterEntry[] {
  // 고등학교는 high_algebra 등 비숫자 코드가 있으므로 먼저 처리
  if (gradeCode.startsWith('high_')) {
    const keys = HIGH_SCHOOL_GRADE_MAP[gradeCode];
    if (!keys) return [];
    return keys.map((key, i) => ({
      semesterKey: key,
      semesterNumber: i + 1,
      chapters: HIGH_SCHOOL_CURRICULUM[key] ?? [],
    }));
  }

  const match = gradeCode.match(/^(elementary|middle)_(\d+)$/);
  if (!match) return [];

  const [, level, numStr] = match;
  const num = parseInt(numStr, 10);

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
