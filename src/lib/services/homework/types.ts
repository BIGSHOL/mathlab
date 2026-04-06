import { ArithmeticCategory, ArithmeticLevel, GeneratedProblem } from '../arithmetic-generator';

export type ProgressionMode = 'sequential' | 'round_robin' | 'weekday';
export type CountMode = 'total' | 'per_category';
export type RetryMode = 'wrong_same' | 'wrong_new' | 'all_same' | 'all_new';

export interface SlotConfig {
  categories: ArithmeticCategory[];
  days: number;
}

export interface AssignmentParams {
  level: ArithmeticLevel;
  dailyCount: number;
  countMode: CountMode;
  perCatCounts?: Record<string, number>;
  startDate: string;
  /** 활성 요일 (0=일, 1=월, ..., 6=토). 미지정 시 매일 배정 */
  activeDays?: number[];
  // Mode specific
  slots?: SlotConfig[];
  categories?: ArithmeticCategory[];
  daysPerCategory?: number;
  weekdayMap?: Record<string, ArithmeticCategory[]>;
  weeks?: number;
}

export interface AssignmentResult {
  dailyProblems: GeneratedProblem[][];
  allCategories: ArithmeticCategory[];
}

/**
 * 숙제 배정 전략 인터페이스
 */
export interface AssignmentStrategy {
  generate(params: AssignmentParams): AssignmentResult;
}
