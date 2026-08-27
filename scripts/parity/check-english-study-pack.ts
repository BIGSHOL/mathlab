/**
 * 영어 학습 대책 팩 — 버전 무효화 · count 단위 · trap 라벨 검증 (순수 함수, DB 불필요).
 *
 * 실행: npx tsx scripts/parity/check-english-study-pack.ts
 */
import {
  ENGLISH_STUDY_PACK_VERSION,
  buildEnglishStudyFromQuestions,
  countUnitLabel,
  frequentTitle,
  isCurrentEnglishStudyPack,
  parseEnglishStudyResult,
  trapTitle,
} from '../../src/lib/exam-analysis/english-study-pack';
import type { AnalyzedQuestion } from '../../src/lib/exam-analysis/types';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

const questions = [
  {
    question_number: 1, difficulty: '2', question_type: 'grammar',
    key_vocab: [{ word: 'however', meaning: '그러나' }],
    key_structures: [{ pattern: 'too ~ to', meaning: '너무 ~해서' }],
  },
  {
    question_number: 2, difficulty: '5', question_type: 'reading',
    key_vocab: [{ word: 'however', meaning: '그러나' }, { word: 'despite', meaning: '~에도' }],
    key_structures: [],
  },
] as unknown as AnalyzedQuestion[];

console.log('── 문항 경로: source·version 각인 + count 의미 ──');
const fromQ = buildEnglishStudyFromQuestions(questions)!;
ok(fromQ.source === 'questions', 'source = questions', fromQ.source);
ok(fromQ.version === ENGLISH_STUDY_PACK_VERSION, 'version 각인', String(fromQ.version));
const however = fromQ.vocab.find((v) => v.word === 'however')!;
ok(however.count === 2, 'however count = 2 (등장 횟수가 아니라 문항 수)', String(however.count));
ok(however.trap === true, 'trap = 난이도 5 문항 포함', String(however.trap));

console.log('\n── count 단위가 경로별로 갈리는가 (본문 오독 방지) ──');
ok(countUnitLabel('questions') === '문항', "questions → '문항'", countUnitLabel('questions'));
ok(countUnitLabel('exam') === '회', "exam → '회'", countUnitLabel('exam'));
ok(frequentTitle('questions', '단어') !== frequentTitle('exam', '단어'),
  '빈출 제목도 경로별 분기',
  `${frequentTitle('questions', '단어')} / ${frequentTitle('exam', '단어')}`);

console.log('\n── trap 라벨: "자주 틀리는" 은 근거 없는 표현 ──');
ok(!trapTitle('questions').includes('틀리'), 'questions 제목', trapTitle('questions'));
ok(!trapTitle('exam').includes('틀리'), 'exam 제목', trapTitle('exam'));

console.log('\n── 캐시 버전 무효화 ──');
const legacy = parseEnglishStudyResult({ vocab: [{ word: 'apple', meaning: '사과', count: 3 }], structures: [] });
ok(legacy !== null, '구팩 파싱은 됨');
ok(!isCurrentEnglishStudyPack(legacy), '구팩(version 없음) → 캐시 무효 → 재생성');
const fresh = parseEnglishStudyResult({
  vocab: [{ word: 'apple', meaning: '사과', count: 3 }],
  structures: [],
  source: 'exam',
  version: ENGLISH_STUDY_PACK_VERSION,
});
ok(isCurrentEnglishStudyPack(fresh), '현행팩 → 캐시 유효');
ok(fresh?.source === 'exam', '저장된 source 보존', String(fresh?.source));

console.log('\n──────────────────────────────');
if (fail) {
  console.log(`❌ ${fail}건 실패`);
  process.exit(1);
}
console.log('✅ 전부 통과');
