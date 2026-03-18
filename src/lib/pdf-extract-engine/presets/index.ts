export {
  mathTextbookPlugin,
  mathSolutionPlugin,
  mathPageFilter,
  MATH_EXTRACT_SCHEMA,
  MATH_SYSTEM_PROMPT,
  SOLUTION_EXTRACT_SCHEMA,
  mapDifficulty,
  mapType,
  embedBoxItems,
  autoWrapMath,
} from './math-textbook';

export type {
  ExtractedMathProblem,
  ExtractedSolution,
  MathExtractMeta,
  MathDifficulty,
  MathQuestionType,
  MathDiagramSvg,
  MathDiagramParam,
  MathImageBbox,
} from './math-textbook';
