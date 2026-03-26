/**
 * 초등 교육과정 매칭 검증 스크립트
 * curriculum.ts의 초등 3~6학년 데이터와 DB Concept 테이블을 비교
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// curriculum.ts에서 초등 3~6학년 데이터를 직접 정의 (import가 TSX alias라 직접 복사)
const ELEMENTARY_CURRICULUM: Record<string, { name: string; subUnits: { name: string }[] }[]> = {
  '3학년 1학기': [
    { name: '덧셈과 뺄셈', subUnits: [{ name: '세 자리 수의 덧셈과 뺄셈' }] },
    { name: '평면도형', subUnits: [{ name: '선분, 반직선, 직선' }, { name: '각, 직각' }, { name: '직각삼각형, 직사각형, 정사각형' }] },
    { name: '나눗셈', subUnits: [{ name: '나눗셈의 의미' }, { name: '곱셈과 나눗셈의 관계' }] },
    { name: '곱셈', subUnits: [{ name: '(두 자리 수)×(한 자리 수)' }] },
    { name: '길이와 시간', subUnits: [{ name: 'mm, km 단위' }, { name: '시간의 덧셈과 뺄셈' }] },
    { name: '분수와 소수', subUnits: [{ name: '분수' }, { name: '소수' }] },
  ],
  '3학년 2학기': [
    { name: '곱셈', subUnits: [{ name: '(세 자리 수)×(한 자리 수)' }, { name: '(두 자리 수)×(두 자리 수)' }] },
    { name: '나눗셈', subUnits: [{ name: '(두/세 자리 수)÷(한 자리 수)' }] },
    { name: '원', subUnits: [{ name: '원의 중심, 반지름, 지름' }, { name: '컴퍼스 사용법' }] },
    { name: '분수', subUnits: [{ name: '가분수와 대분수' }] },
    { name: '들이와 무게', subUnits: [{ name: 'L, mL 단위' }, { name: 'kg, g, t 단위' }] },
    { name: '자료의 정리', subUnits: [{ name: '표와 그림그래프' }] },
  ],
  '4학년 1학기': [
    { name: '큰 수', subUnits: [{ name: '만, 억, 조' }, { name: '큰 수의 크기 비교' }] },
    { name: '각도', subUnits: [{ name: '각의 크기 재기' }, { name: '각의 합과 차' }, { name: '삼각형/사각형의 내각의 합' }] },
    { name: '곱셈과 나눗셈', subUnits: [{ name: '세 자리 수의 곱셈' }, { name: '두 자리 수로 나누기' }] },
    { name: '평면도형의 이동', subUnits: [{ name: '밀기, 뒤집기, 돌리기' }] },
    { name: '막대그래프', subUnits: [{ name: '막대그래프 그리기와 해석' }] },
    { name: '규칙 찾기', subUnits: [{ name: '수의 배열 규칙' }, { name: '도형의 배열 규칙' }] },
  ],
  '4학년 2학기': [
    { name: '분수의 덧셈과 뺄셈', subUnits: [{ name: '분모가 같은 분수의 덧셈과 뺄셈' }] },
    { name: '삼각형', subUnits: [{ name: '이등변삼각형, 정삼각형' }, { name: '예각, 직각, 둔각삼각형' }] },
    { name: '소수의 덧셈과 뺄셈', subUnits: [{ name: '소수 두/세 자리 수' }, { name: '소수의 덧셈과 뺄셈' }] },
    { name: '사각형', subUnits: [{ name: '사다리꼴, 평행사변형, 마름모' }, { name: '직사각형, 정사각형' }] },
    { name: '꺾은선그래프', subUnits: [{ name: '꺾은선그래프 그리기와 해석' }] },
    { name: '다각형', subUnits: [{ name: '다각형과 정다각형' }, { name: '대각선' }] },
  ],
  '5학년 1학기': [
    { name: '자연수의 혼합 계산', subUnits: [{ name: '덧셈, 뺄셈, 곱셈, 나눗셈의 혼합' }] },
    { name: '약수와 배수', subUnits: [{ name: '약수와 배수' }, { name: '공약수와 최대공약수' }, { name: '공배수와 최소공배수' }] },
    { name: '규칙과 대응', subUnits: [{ name: '두 양 사이의 관계' }] },
    { name: '약분과 통분', subUnits: [{ name: '크기가 같은 분수' }, { name: '약분과 통분' }, { name: '분수의 크기 비교' }] },
    { name: '분수의 덧셈과 뺄셈', subUnits: [{ name: '분모가 다른 분수의 덧셈과 뺄셈' }] },
    { name: '다각형의 둘레와 넓이', subUnits: [{ name: '둘레 구하기' }, { name: '단위넓이' }, { name: '직사각형, 평행사변형, 삼각형, 마름모, 사다리꼴의 넓이' }] },
  ],
  '5학년 2학기': [
    { name: '수의 범위와 어림하기', subUnits: [{ name: '이상, 이하, 초과, 미만' }, { name: '올림, 버림, 반올림' }] },
    { name: '분수의 곱셈', subUnits: [{ name: '(분수)×(자연수)' }, { name: '(자연수)×(분수)' }, { name: '(분수)×(분수)' }] },
    { name: '합동과 대칭', subUnits: [{ name: '도형의 합동' }, { name: '선대칭도형과 점대칭도형' }] },
    { name: '소수의 곱셈', subUnits: [{ name: '(소수)×(자연수)' }, { name: '(자연수)×(소수)' }, { name: '(소수)×(소수)' }] },
    { name: '직육면체', subUnits: [{ name: '직육면체와 정육면체' }, { name: '겨냥도와 전개도' }] },
    { name: '평균과 가능성', subUnits: [{ name: '평균' }, { name: '일이 일어날 가능성' }] },
  ],
  '6학년 1학기': [
    { name: '분수의 나눗셈', subUnits: [{ name: '(자연수)÷(자연수)' }, { name: '(분수)÷(자연수)' }] },
    { name: '각기둥과 각뿔', subUnits: [{ name: '각기둥' }, { name: '각뿔' }] },
    { name: '소수의 나눗셈', subUnits: [{ name: '(소수)÷(자연수)' }, { name: '(자연수)÷(자연수)' }] },
    { name: '비와 비율', subUnits: [{ name: '비와 비율' }, { name: '백분율' }] },
    { name: '여러 가지 그래프', subUnits: [{ name: '그림그래프' }, { name: '띠그래프와 원그래프' }] },
    { name: '직육면체의 부피와 겉넓이', subUnits: [{ name: '직육면체의 부피' }, { name: '직육면체의 겉넓이' }] },
  ],
  '6학년 2학기': [
    { name: '분수의 나눗셈', subUnits: [{ name: '(분수)÷(분수)' }] },
    { name: '소수의 나눗셈', subUnits: [{ name: '(소수)÷(소수)' }] },
    { name: '공간과 입체', subUnits: [{ name: '쌓기나무' }] },
    { name: '비례식과 비례배분', subUnits: [{ name: '비례식' }, { name: '비례배분' }] },
    { name: '원의 넓이', subUnits: [{ name: '원주와 원주율' }, { name: '원의 넓이' }] },
    { name: '원기둥, 원뿔, 구', subUnits: [{ name: '원기둥' }, { name: '원뿔' }, { name: '구' }] },
  ],
};

// grade code를 학년/학기 키로 변환
function gradeToKey(grade: string, semester: number): string | null {
  const match = grade.match(/^elementary_(\d)$/);
  if (!match) return null;
  return `${match[1]}학년 ${semester}학기`;
}

async function main() {
  console.log('=== 초등 교육과정 매칭 검증 ===\n');

  // 1. DB에서 초등 개념 조회
  const dbConcepts = await prisma.concept.findMany({
    where: { grade: { startsWith: 'elementary_' } },
    select: {
      id: true,
      title: true,
      grade: true,
      semester: true,
      chapter: true,
      section: true,
      sectionSub: true,
    },
    orderBy: [{ grade: 'asc' }, { semester: 'asc' }, { chapter: 'asc' }, { section: 'asc' }],
  });

  console.log(`DB 초등 개념 총 ${dbConcepts.length}개\n`);

  // 2. curriculum.ts에서 초등 3~6학년 chapter/section 맵 구축
  const curriculumMap = new Map<string, Set<string>>(); // key: "grade|semester|chapter", value: sections
  const curriculumChapters = new Map<string, Set<string>>(); // key: "grade|semester", value: chapters

  for (const [label, units] of Object.entries(ELEMENTARY_CURRICULUM)) {
    const match = label.match(/^(\d)학년 (\d)학기$/);
    if (!match) continue;
    const gradeNum = parseInt(match[1]);
    if (gradeNum < 3 || gradeNum > 6) continue;
    const grade = `elementary_${gradeNum}`;
    const semester = parseInt(match[2]);
    const gsKey = `${grade}|${semester}`;

    if (!curriculumChapters.has(gsKey)) curriculumChapters.set(gsKey, new Set());

    for (const unit of units) {
      curriculumChapters.get(gsKey)!.add(unit.name);
      const chapterKey = `${gsKey}|${unit.name}`;
      if (!curriculumMap.has(chapterKey)) curriculumMap.set(chapterKey, new Set());
      for (const sub of unit.subUnits) {
        curriculumMap.get(chapterKey)!.add(sub.name);
      }
    }
  }

  // 3. DB 데이터를 맵으로 정리
  const dbChapters = new Map<string, Set<string>>(); // key: "grade|semester", value: chapters
  const dbSections = new Map<string, Set<string>>(); // key: "grade|semester|chapter", value: sections
  const nullSectionConcepts: typeof dbConcepts = [];
  const nullChapterConcepts: typeof dbConcepts = [];

  for (const c of dbConcepts) {
    if (!c.grade || !c.semester) continue;
    const gsKey = `${c.grade}|${c.semester}`;

    if (!c.chapter) {
      nullChapterConcepts.push(c);
      continue;
    }

    if (!dbChapters.has(gsKey)) dbChapters.set(gsKey, new Set());
    dbChapters.get(gsKey)!.add(c.chapter);

    const chapterKey = `${gsKey}|${c.chapter}`;
    if (!dbSections.has(chapterKey)) dbSections.set(chapterKey, new Set());

    if (!c.section) {
      nullSectionConcepts.push(c);
    } else {
      dbSections.get(chapterKey)!.add(c.section);
    }
  }

  // 4. 비교 분석
  console.log('========================================');
  console.log('A. curriculum.ts에 있지만 DB에 없는 항목 (누락)');
  console.log('========================================\n');

  let missingCount = 0;
  for (const [gsKey, chapters] of curriculumChapters) {
    const [grade, sem] = gsKey.split('|');
    const gradeNum = grade.replace('elementary_', '');
    const dbChapterSet = dbChapters.get(gsKey) || new Set();

    for (const chapter of chapters) {
      if (!dbChapterSet.has(chapter)) {
        console.log(`  [누락 chapter] ${gradeNum}학년 ${sem}학기: "${chapter}"`);
        missingCount++;
        // 해당 chapter의 모든 section도 누락
        const chapterKey = `${gsKey}|${chapter}`;
        const sections = curriculumMap.get(chapterKey);
        if (sections) {
          for (const sec of sections) {
            console.log(`    └─ [누락 section] "${sec}"`);
            missingCount++;
          }
        }
      } else {
        // chapter 존재 → section 비교
        const chapterKey = `${gsKey}|${chapter}`;
        const currSections = curriculumMap.get(chapterKey) || new Set();
        const dbSecSet = dbSections.get(chapterKey) || new Set();

        for (const sec of currSections) {
          if (!dbSecSet.has(sec)) {
            console.log(`  [누락 section] ${gradeNum}학년 ${sem}학기 > "${chapter}" > "${sec}"`);
            missingCount++;
          }
        }
      }
    }
  }

  if (missingCount === 0) console.log('  (없음)\n');
  else console.log(`\n  총 ${missingCount}개 누락\n`);

  console.log('========================================');
  console.log('B. DB에 있지만 curriculum.ts에 없는 항목 (불일치)');
  console.log('========================================\n');

  let mismatchCount = 0;
  for (const [gsKey, chapters] of dbChapters) {
    const [grade, sem] = gsKey.split('|');
    const gradeNum = grade.replace('elementary_', '');
    const gradeNumInt = parseInt(gradeNum);

    // 3~6학년 이외는 curriculum에 없으므로 전부 불일치
    if (gradeNumInt < 3 || gradeNumInt > 6) {
      for (const chapter of chapters) {
        console.log(`  [범위외 chapter] ${gradeNum}학년 ${sem}학기: "${chapter}" (1~2학년은 curriculum 검증 대상 아님)`);
      }
      continue;
    }

    const currChapterSet = curriculumChapters.get(gsKey) || new Set();

    for (const chapter of chapters) {
      if (!currChapterSet.has(chapter)) {
        console.log(`  [불일치 chapter] ${gradeNum}학년 ${sem}학기: "${chapter}"`);
        mismatchCount++;

        // 유사한 chapter가 있는지 확인
        for (const currCh of currChapterSet) {
          if (currCh.includes(chapter) || chapter.includes(currCh) ||
              levenshtein(currCh, chapter) <= 3) {
            console.log(`    └─ 유사 항목: "${currCh}" (curriculum.ts)`);
          }
        }
      } else {
        // chapter 매칭 → section 비교
        const chapterKey = `${gsKey}|${chapter}`;
        const currSections = curriculumMap.get(chapterKey) || new Set();
        const dbSecSet = dbSections.get(chapterKey) || new Set();

        for (const sec of dbSecSet) {
          if (!currSections.has(sec)) {
            console.log(`  [불일치 section] ${gradeNum}학년 ${sem}학기 > "${chapter}" > "${sec}"`);
            mismatchCount++;

            // 유사한 section이 있는지 확인
            for (const currSec of currSections) {
              if (currSec.includes(sec) || sec.includes(currSec) ||
                  levenshtein(currSec, sec) <= 3) {
                console.log(`    └─ 유사 항목: "${currSec}" (curriculum.ts)`);
              }
            }
          }
        }
      }
    }
  }

  if (mismatchCount === 0) console.log('  (없음)\n');
  else console.log(`\n  총 ${mismatchCount}개 불일치\n`);

  console.log('========================================');
  console.log('C. section이 null인 개념 목록');
  console.log('========================================\n');

  if (nullSectionConcepts.length === 0) {
    console.log('  (없음)\n');
  } else {
    for (const c of nullSectionConcepts) {
      const gradeNum = c.grade!.replace('elementary_', '');
      console.log(`  [section=null] ${gradeNum}학년 ${c.semester}학기 > "${c.chapter}" — "${c.title}" (${c.id})`);
    }
    console.log(`\n  총 ${nullSectionConcepts.length}개\n`);
  }

  console.log('========================================');
  console.log('C-2. chapter가 null인 개념 목록');
  console.log('========================================\n');

  if (nullChapterConcepts.length === 0) {
    console.log('  (없음)\n');
  } else {
    for (const c of nullChapterConcepts) {
      console.log(`  [chapter=null] ${c.grade} ${c.semester}학기 — "${c.title}" (${c.id})`);
    }
    console.log(`\n  총 ${nullChapterConcepts.length}개\n`);
  }

  console.log('========================================');
  console.log('D. chapter 이름 공백/띄어쓰기 차이 분석');
  console.log('========================================\n');

  let spaceIssueCount = 0;
  for (const [gsKey, chapters] of dbChapters) {
    const [grade, sem] = gsKey.split('|');
    const gradeNum = grade.replace('elementary_', '');
    const gradeNumInt = parseInt(gradeNum);
    if (gradeNumInt < 3 || gradeNumInt > 6) continue;

    const currChapterSet = curriculumChapters.get(gsKey) || new Set();

    for (const dbChapter of chapters) {
      if (currChapterSet.has(dbChapter)) continue; // 정확 매칭

      // 공백 정규화 후 비교
      const normalizedDb = dbChapter.replace(/\s+/g, ' ').trim();
      for (const currChapter of currChapterSet) {
        const normalizedCurr = currChapter.replace(/\s+/g, ' ').trim();

        // 공백 정규화 후 일치
        if (normalizedDb === normalizedCurr && dbChapter !== currChapter) {
          console.log(`  [공백차이] ${gradeNum}학년 ${sem}학기:`);
          console.log(`    DB:         "${dbChapter}" (${JSON.stringify(dbChapter)})`);
          console.log(`    curriculum: "${currChapter}" (${JSON.stringify(currChapter)})`);
          spaceIssueCount++;
        }

        // 공백 전부 제거 후 비교
        const noSpaceDb = dbChapter.replace(/\s/g, '');
        const noSpaceCurr = currChapter.replace(/\s/g, '');
        if (noSpaceDb === noSpaceCurr && normalizedDb !== normalizedCurr) {
          console.log(`  [띄어쓰기차이] ${gradeNum}학년 ${sem}학기:`);
          console.log(`    DB:         "${dbChapter}"`);
          console.log(`    curriculum: "${currChapter}"`);
          spaceIssueCount++;
        }
      }

      // section에 대해서도 검사
      const chapterKey = `${gsKey}|${dbChapter}`;
      const dbSecSet = dbSections.get(chapterKey);
      if (!dbSecSet) continue;

      // 매칭된 chapter 찾기 (정확 또는 공백무시)
      let matchedCurrChapter: string | null = null;
      for (const currCh of currChapterSet) {
        if (currCh === dbChapter || currCh.replace(/\s/g, '') === dbChapter.replace(/\s/g, '')) {
          matchedCurrChapter = currCh;
          break;
        }
      }
      if (!matchedCurrChapter) continue;

      const currChapterKey = `${gsKey}|${matchedCurrChapter}`;
      const currSections = curriculumMap.get(currChapterKey) || new Set();

      for (const dbSec of dbSecSet) {
        if (currSections.has(dbSec)) continue;

        for (const currSec of currSections) {
          const noSpaceDbSec = dbSec.replace(/\s/g, '');
          const noSpaceCurrSec = currSec.replace(/\s/g, '');
          if (noSpaceDbSec === noSpaceCurrSec && dbSec !== currSec) {
            console.log(`  [section 공백/띄어쓰기차이] ${gradeNum}학년 ${sem}학기 > "${dbChapter}":`);
            console.log(`    DB:         "${dbSec}"`);
            console.log(`    curriculum: "${currSec}"`);
            spaceIssueCount++;
          }
        }
      }
    }
  }

  if (spaceIssueCount === 0) console.log('  (공백/띄어쓰기 차이 없음)\n');
  else console.log(`\n  총 ${spaceIssueCount}개 공백/띄어쓰기 차이\n`);

  // 요약
  console.log('========================================');
  console.log('요약');
  console.log('========================================\n');

  // DB 학년별 개념 수
  const gradeCount = new Map<string, number>();
  for (const c of dbConcepts) {
    const key = `${c.grade}|${c.semester}`;
    gradeCount.set(key, (gradeCount.get(key) || 0) + 1);
  }
  console.log('  DB 학년별 개념 수:');
  for (const [key, count] of [...gradeCount.entries()].sort()) {
    const [grade, sem] = key.split('|');
    const gradeNum = grade.replace('elementary_', '');
    console.log(`    ${gradeNum}학년 ${sem}학기: ${count}개`);
  }

  // curriculum 학년별 chapter/section 수
  console.log('\n  curriculum.ts 학년별 chapter/section 수:');
  for (const [gsKey, chapters] of [...curriculumChapters.entries()].sort()) {
    const [grade, sem] = gsKey.split('|');
    const gradeNum = grade.replace('elementary_', '');
    let totalSections = 0;
    for (const ch of chapters) {
      const chKey = `${gsKey}|${ch}`;
      totalSections += (curriculumMap.get(chKey)?.size || 0);
    }
    console.log(`    ${gradeNum}학년 ${sem}학기: ${chapters.size}개 chapter, ${totalSections}개 section`);
  }

  console.log(`\n  전체 누락: ${missingCount}개`);
  console.log(`  전체 불일치: ${mismatchCount}개`);
  console.log(`  section=null: ${nullSectionConcepts.length}개`);
  console.log(`  chapter=null: ${nullChapterConcepts.length}개`);
  console.log(`  공백/띄어쓰기 차이: ${spaceIssueCount}개`);

  await prisma.$disconnect();
}

// 간단한 레벤슈타인 거리
function levenshtein(a: string, b: string): number {
  const dp: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    dp[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) dp[i][j] = j;
      else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
  }
  return dp[a.length][b.length];
}

main().catch(console.error);
