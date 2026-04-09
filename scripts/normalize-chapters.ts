/**
 * 문제 DB의 chapter/section을 curriculum.ts 표준 단원명으로 정규화
 *
 * 실행: npx tsx scripts/normalize-chapters.ts          (dry-run)
 *       npx tsx scripts/normalize-chapters.ts --apply   (실제 적용)
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// ── 중1 chapter 매핑: DB값 → curriculum.ts 표준 ──
const CHAPTER_MAP: Record<string, string> = {
  // 1학기
  '소인수분해': '소인수분해',
  '정수와 유리수': '정수와 유리수',
  '문자와 식': '문자의 사용과 식',
  '문자의 사용과 식': '문자의 사용과 식',
  '일차방정식': '일차방정식',
  '좌표평면과 그래프': '좌표와 그래프',
  '정비례와 반비례': '정비례와 반비례',
  // 2학기
  '기본 도형': '기본 도형',
  '기본 도형과 작도': '기본 도형',  // 동아출판 통합 단원명 → 분리
  '작도와 합동': '작도와 합동',
  '평면도형': '평면도형',
  '평면도형의 성질': '평면도형',
  '입체도형': '입체도형',
  '입체도형의 성질': '입체도형',
  '자료의 정리와 해석': '자료의 정리와 해석',
  '대단원0': '',  // 별도 처리 필요
};

// ── section 매핑: DB값 → curriculum.ts 표준 ──
const SECTION_MAP: Record<string, string> = {
  // 소인수분해
  '거듭제곱': '소인수분해',
  '소수와 합성수': '소인수분해',
  '소인수분해': '소인수분해',
  '소인수분해 > 소인수분해': '소인수분해',
  '최대공약수': '최대공약수와 최소공배수',
  '최소공배수': '최대공약수와 최소공배수',
  '최대공약수와 최소공배수': '최대공약수와 최소공배수',

  // 정수와 유리수
  '정수와 유리수': '정수와 유리수',
  '정수와 유리수의 뜻': '정수와 유리수',
  '정수와 유리수의 대소 관계': '정수와 유리수',
  '정수와 유리수의 덧셈': '정수와 유리수의 덧셈과 뺄셈',
  '정수와 유리수의 뺄셈': '정수와 유리수의 덧셈과 뺄셈',
  '정수와 유리수의 곱셈': '정수와 유리수의 곱셈과 나눗셈',
  '정수와 유리수의 나눗셈': '정수와 유리수의 곱셈과 나눗셈',

  // 문자의 사용과 식
  '문자와 식': '문자의 사용과 식의 계산',
  '문자의 사용': '문자의 사용과 식의 계산',
  '문자의 사용과 식': '문자의 사용과 식의 계산',
  '문자의 사용과 식의 값': '문자의 사용과 식의 계산',
  '식의 값': '문자의 사용과 식의 계산',
  '일차식과 수의 곱셈, 나눗셈': '일차식의 덧셈과 뺄셈',
  '일차식의 덧셈과 뺄셈': '일차식의 덧셈과 뺄셈',

  // 일차방정식
  '방정식과 그 해': '일차방정식의 풀이',
  '방정식과 해': '일차방정식의 풀이',
  '일차방정식': '일차방정식의 풀이',
  '일차방정식과 항등식': '일차방정식의 풀이',
  '일차방정식과 그 해': '일차방정식의 풀이',
  '일차방정식의 풀이': '일차방정식의 풀이',
  '일차방정식의 활용': '일차방정식의 활용',

  // 좌표와 그래프
  '순서쌍과 좌표': '순서쌍과 좌표',
  '좌표와 사분면': '순서쌍과 좌표',
  '좌표평면 위의 도형': '순서쌍과 좌표',
  '그래프': '그래프',
  '그래프의 뜻과 표현': '그래프',
  '그래프의 해석': '그래프',

  // 정비례와 반비례
  '정비례': '정비례',
  '정비례와 그 그래프': '정비례',
  '반비례': '반비례',
  '반비례와 그 그래프': '반비례',
  '정비례와 반비례': '정비례',
  '정비례와 반비례의 활용': '반비례',

  // 기본 도형
  '점, 선, 면': '점·선·면·각',
  '점, 선, 면, 각': '점·선·면·각',
  '각': '점·선·면·각',
  '각의 뜻과 성질': '점·선·면·각',
  '위치 관계': '위치 관계',
  '점, 직선, 평면의 위치 관계': '위치 관계',
  '평면과 공간에서의 위치 관계': '위치 관계',
  '평행선의 성질': '평행선의 성질',
  '삼각형의 내각과 외각': '평행선의 성질',

  // 작도와 합동 (기본 도형과 작도에서 분리)
  '삼각형의 작도': '삼각형의 작도',
  '작도': '삼각형의 작도',
  '삼각형의 결정조건': '삼각형의 합동',
  '삼각형의 합동': '삼각형의 합동',
  '삼각형의 합동조건': '삼각형의 합동',
  '사각형의 성질': '삼각형의 합동', // 오분류 가능성

  // 평면도형
  '다각형의 대각선의 개수': '다각형',
  '다각형의 내각의 크기의 합': '다각형',
  '다각형의 외각의 크기의 합': '다각형',
  '다각형의 내각과 외각': '다각형',
  '원과 부채꼴': '원과 부채꼴',
  '부채꼴의 호의 길이와 넓이': '원과 부채꼴',
  '평면도형의 성질': '다각형',

  // 입체도형
  '다면체': '다면체',
  '회전체': '회전체',
  '기둥의 겉넓이와 부피': '입체도형의 겉넓이와 부피',
  '기둥과 뿔의 겉넓이': '입체도형의 겉넓이와 부피',
  '기둥과 뿔의 부피': '입체도형의 겉넓이와 부피',
  '뿔의 겉넓이와 부피': '입체도형의 겉넓이와 부피',
  '구의 겉넓이와 부피': '입체도형의 겉넓이와 부피',
  '입체도형의 성질': '다면체',

  // 자료의 정리와 해석
  '줄기와 잎 그림': '줄기와 잎 그림·도수분포표',
  '도수분포표': '줄기와 잎 그림·도수분포표',
  '자료의 정리': '줄기와 잎 그림·도수분포표',
  '히스토그램': '히스토그램과 도수분포다각형',
  '히스토그램과 도수분포다각형': '히스토그램과 도수분포다각형',
  '도수분포다각형': '히스토그램과 도수분포다각형',
  '대푯값': '상대도수',
  '상대도수': '상대도수',
  '상대도수 분포표와 그래프': '상대도수',
  '상대도수와 그 그래프': '상대도수',
};

// "기본 도형과 작도" → 작도/합동 관련 section이면 "작도와 합동"으로 chapter 변경
const JAKDO_SECTIONS = new Set(['삼각형의 작도', '작도', '삼각형의 결정조건', '삼각형의 합동', '삼각형의 합동조건']);

// "대단원0" → section 기반으로 chapter 추론
const SECTION_TO_CHAPTER: Record<string, string> = {
  '소수와 합성수': '소인수분해',
  '소인수분해': '소인수분해',
  '최소공배수': '소인수분해',
  '정수와 유리수의 대소 관계': '정수와 유리수',
  '일차식과 수의 곱셈, 나눗셈': '문자의 사용과 식',
  '일차식의 덧셈과 뺄셈': '문자의 사용과 식',
  '순서쌍과 좌표': '좌표와 그래프',
  '그래프의 뜻과 표현': '좌표와 그래프',
  '평행선의 성질': '기본 도형',
  '부채꼴의 호의 길이와 넓이': '평면도형',
  '기둥과 뿔의 겉넓이': '입체도형',
  '구의 겉넓이와 부피': '입체도형',
};

async function main() {
  const apply = process.argv.includes('--apply');

  const questions = await db.question.findMany({
    where: { bookCode: { in: ['1-1'] } },
    select: { id: true, chapter: true, section: true },
  });

  let changed = 0;
  let unchanged = 0;
  let unresolved: string[] = [];

  for (const q of questions) {
    let newChapter = q.chapter;
    let newSection = q.section;

    // 1. "기본 도형과 작도" → section에 따라 chapter 분리
    if (q.chapter === '기본 도형과 작도' && q.section && JAKDO_SECTIONS.has(q.section)) {
      newChapter = '작도와 합동';
    }

    // 2. "대단원0" → section 기반 chapter 추론
    if (q.chapter === '대단원0' && q.section) {
      const inferred = SECTION_TO_CHAPTER[q.section];
      if (inferred) {
        newChapter = inferred;
      } else {
        unresolved.push(`대단원0 | ${q.section}`);
      }
    }

    // 3. chapter 매핑
    if (newChapter && CHAPTER_MAP[newChapter] !== undefined) {
      const mapped = CHAPTER_MAP[newChapter];
      if (mapped) newChapter = mapped;
    }

    // 4. section 매핑
    if (newSection && SECTION_MAP[newSection]) {
      newSection = SECTION_MAP[newSection];
    }

    // 5. section 기반 chapter 교정 — section이 다른 chapter에 속하는 경우 이동
    const SECTION_BELONGS_TO: Record<string, string> = {
      '일차방정식의 풀이': '일차방정식',
      '일차방정식의 활용': '일차방정식',
      '삼각형의 작도': '작도와 합동',
      '삼각형의 합동': '작도와 합동',
      '정비례': '정비례와 반비례',
      '반비례': '정비례와 반비례',
      '순서쌍과 좌표': '좌표와 그래프',
      '그래프': '좌표와 그래프',
    };
    if (newSection && SECTION_BELONGS_TO[newSection]) {
      const correctChapter = SECTION_BELONGS_TO[newSection];
      if (newChapter !== correctChapter) {
        newChapter = correctChapter;
      }
    }

    // 6. null section → chapter명으로 추론
    if (!newSection && newChapter) {
      newSection = newChapter; // 최소한 chapter명을 section으로
    }

    if (newChapter !== q.chapter || newSection !== q.section) {
      changed++;
      if (!apply) {
        console.log(`[${q.id.slice(0, 8)}] "${q.chapter}" > "${q.section}" → "${newChapter}" > "${newSection}"`);
      } else {
        await db.question.update({
          where: { id: q.id },
          data: { chapter: newChapter, section: newSection },
        });
      }
    } else {
      unchanged++;
    }
  }

  console.log(`\n총 ${questions.length}개 중 변경: ${changed}개, 유지: ${unchanged}개`);
  if (unresolved.length > 0) {
    const unique = [...new Set(unresolved)];
    console.log(`\n미해결 (${unique.length}개):`);
    unique.forEach(u => console.log('  ', u));
  }
  if (!apply) console.log('\n실제 적용하려면: npx tsx scripts/normalize-chapters.ts --apply');

  await db.$disconnect();
}

main().catch(console.error);
