import {
  generateProblems,
  IMPLEMENTED_CATEGORIES,
  type ArithmeticCategory,
  type ArithmeticLevel,
  type GeneratedProblem,
} from '../arithmetic-generator';
import { AssignmentStrategy, AssignmentParams, AssignmentResult, CountMode } from './types';

/** 하루치 문제 생성 (복수 카테고리 지원) */
function generateDayProblems(
  cats: ArithmeticCategory[],
  level: ArithmeticLevel,
  dailyCount: number,
  countMode: CountMode,
  perCatCounts?: Record<string, number>,
): GeneratedProblem[] {
  if (cats.length === 0) return [];
  if (countMode === 'per_category') {
    return cats.flatMap((cat) => {
      const count = perCatCounts?.[cat] ?? dailyCount;
      return generateProblems(cat, level, count);
    });
  }
  // total mode: split evenly
  const perCat = Math.max(1, Math.ceil(dailyCount / cats.length));
  const all = cats.flatMap((cat) => generateProblems(cat, level, perCat));
  return all.slice(0, dailyCount);
}

/** 순차 배정 전략: 슬롯(구간) 기반 */
export class SequentialStrategy implements AssignmentStrategy {
  generate(params: AssignmentParams): AssignmentResult {
    const { slots, level, dailyCount, countMode, perCatCounts } = params;
    const dailyProblems: GeneratedProblem[][] = [];
    const allCategorySet = new Set<ArithmeticCategory>();

    if (!slots) throw new Error('Sequential 배정을 위한 슬롯 설정이 없습니다');

    for (const slot of slots) {
      const validCats = slot.categories.filter((c) => IMPLEMENTED_CATEGORIES.has(c));
      if (validCats.length === 0) continue;
      validCats.forEach((c) => allCategorySet.add(c));
      for (let d = 0; d < slot.days; d++) {
        dailyProblems.push(generateDayProblems(validCats, level, dailyCount, countMode, perCatCounts));
      }
    }

    return { dailyProblems, allCategories: Array.from(allCategorySet) };
  }
}

/** 라운드 로빈 전략: 카테고리 순환 */
export class RoundRobinStrategy implements AssignmentStrategy {
  generate(params: AssignmentParams): AssignmentResult {
    const { categories, daysPerCategory, level, dailyCount, countMode, perCatCounts } = params;
    const dailyProblems: GeneratedProblem[][] = [];
    const allCategorySet = new Set<ArithmeticCategory>();

    if (!categories || categories.length === 0) throw new Error('Round-robin 배정을 위한 카테고리가 없습니다');

    const validCats = categories.filter((c) => IMPLEMENTED_CATEGORIES.has(c));
    if (validCats.length === 0) throw new Error('유효한 카테고리가 없습니다');
    validCats.forEach((c) => allCategorySet.add(c));

    const dpc = Math.min(Math.max(1, daysPerCategory || 5), 30);
    const totalDays = validCats.length * dpc;

    for (let day = 0; day < totalDays; day++) {
      const cat = validCats[day % validCats.length];
      dailyProblems.push(generateDayProblems([cat], level, dailyCount, countMode, perCatCounts));
    }

    return { dailyProblems, allCategories: Array.from(allCategorySet) };
  }
}

/** 요일별 배정 전략 */
export class WeekdayStrategy implements AssignmentStrategy {
  generate(params: AssignmentParams): AssignmentResult {
    const { weekdayMap, weeks, startDate, level, dailyCount, countMode, perCatCounts } = params;
    const dailyProblems: GeneratedProblem[][] = [];
    const allCategorySet = new Set<ArithmeticCategory>();

    if (!weekdayMap) throw new Error('Weekday 배정을 위한 요일 설정이 없습니다');

    const numWeeks = Math.min(Math.max(1, weeks || 4), 52);
    const totalDays = numWeeks * 7;
    const start = new Date(startDate);

    for (let day = 0; day < totalDays; day++) {
      const date = new Date(start);
      date.setDate(date.getDate() + day);
      const wd = date.getDay();
      const cats = (weekdayMap[String(wd)] ?? []).filter((c) =>
        IMPLEMENTED_CATEGORIES.has(c as ArithmeticCategory)
      ) as ArithmeticCategory[];

      if (cats.length > 0) {
        cats.forEach((c) => allCategorySet.add(c));
        dailyProblems.push(generateDayProblems(cats, level, dailyCount, countMode, perCatCounts));
      } else {
        dailyProblems.push([]); // rest day
      }
    }

    return { dailyProblems, allCategories: Array.from(allCategorySet) };
  }
}

/** 전략 팩토리 */
export function getAssignmentStrategy(mode: string): AssignmentStrategy {
  switch (mode) {
    case 'sequential': return new SequentialStrategy();
    case 'round_robin': return new RoundRobinStrategy();
    case 'weekday': return new WeekdayStrategy();
    default: throw new Error(`지원하지 않는 배정 모드입니다: ${mode}`);
  }
}
