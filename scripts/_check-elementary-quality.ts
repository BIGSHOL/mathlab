import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 수학 용어 사전 (초등 수준)
const MATH_TERMS = [
  // 수와 연산
  '자연수', '정수', '소수', '분수', '대분수', '진분수', '가분수', '기약분수',
  '덧셈', '뺄셈', '곱셈', '나눗셈', '혼합계산', '혼합 계산',
  '올림', '버림', '반올림', '어림', '약수', '배수', '공약수', '공배수',
  '최대공약수', '최소공배수', '소인수분해', '소인수',
  '나머지', '몫', '받아올림', '받아내림',
  // 도형/측정
  '삼각형', '사각형', '직사각형', '정사각형', '평행사변형', '마름모', '사다리꼴',
  '원', '원의 넓이', '원주', '원주율', '지름', '반지름',
  '둘레', '넓이', '부피', '들이', '무게', '길이',
  '각도', '직각', '예각', '둔각', '꼭짓점', '변', '대각선',
  '대칭', '선대칭', '점대칭', '합동', '닮음',
  '직육면체', '정육면체', '원기둥', '원뿔', '구',
  '전개도', '겨냥도', '모서리', '면',
  // 규칙/통계
  '비', '비율', '비례식', '비례', '백분율', '할인', '이익',
  '평균', '그래프', '막대그래프', '꺾은선그래프', '원그래프', '띠그래프',
  '표', '줄기와 잎',
  // 기타 수학 개념
  '수직선', '좌표', '수직', '평행', '수선',
  '단위', '환산', '시간', '시각',
  '규칙', '패턴', '식', '등식', '방정식',
  '경우의 수', '확률', '가능성',
  // KaTeX로 감싸진 수학 기호도 포함
  '\\frac', '\\times', '\\div', '\\pi',
];

interface Issue {
  id: string;
  title: string;
  grade: string | null;
  semester: number | null;
  chapter: string | null;
  section: string | null;
  blankCount: number;
  problems: string[];
}

async function main() {
  const concepts = await prisma.concept.findMany({
    where: {
      grade: { startsWith: 'elementary_' },
    },
    select: {
      id: true,
      title: true,
      grade: true,
      semester: true,
      chapter: true,
      section: true,
      sectionSub: true,
      fullContent: true,
      _count: {
        select: { blanks: true },
      },
    },
    orderBy: [
      { grade: 'asc' },
      { semester: 'asc' },
      { chapter: 'asc' },
      { section: 'asc' },
    ],
  });

  console.log(`\n총 초등 개념 수: ${concepts.length}\n`);

  const issues: Issue[] = [];
  let totalOk = 0;

  for (const c of concepts) {
    const problems: string[] = [];
    const content = c.fullContent || '';
    const contentLen = content.length;
    const blankCount = c._count.blanks;

    // 1. fullContent가 비어있거나 너무 짧은 개념 (100자 미만)
    if (!content || contentLen < 100) {
      problems.push(`[내용 부족] fullContent ${contentLen}자 (100자 미만)`);
    }

    // 2. title과 fullContent 불일치 검사
    if (content && c.title) {
      // title의 핵심 키워드 추출 (조사/접미사 제거, 2자 이상)
      const titleKeywords = c.title
        .replace(/\$[^$]*\$/g, '') // KaTeX 제거
        .replace(/[()（）\[\]]/g, '')
        .split(/[\s,·:~\-/]+/)
        .map(w => w.replace(/(의|와|과|을|를|이|가|에서|으로|로|에|은|는|한|된|하기|하는|인|적)$/g, ''))
        .filter(w => w.length >= 2);

      const contentLower = content.toLowerCase();
      const missingKeywords = titleKeywords.filter(
        kw => kw.length >= 2 && !contentLower.includes(kw.toLowerCase())
      );

      if (missingKeywords.length > 0 && missingKeywords.length >= titleKeywords.length * 0.5) {
        problems.push(`[제목-내용 불일치] 제목 키워드 "${missingKeywords.join(', ')}"가 본문에 없음`);
      }
    }

    // 3. title과 section 논리적 일치 확인
    if (c.title && c.section) {
      // section이 title과 완전히 무관한지 확인
      const titleCore = c.title
        .replace(/\$[^$]*\$/g, '')
        .replace(/[()（）\[\]0-9]/g, '')
        .trim();
      const sectionCore = c.section
        .replace(/\$[^$]*\$/g, '')
        .replace(/[()（）\[\]0-9]/g, '')
        .trim();

      // 공통 단어가 하나도 없으면 문제
      const titleWords = titleCore.split(/[\s,·:~\-/]+/).filter(w => w.length >= 2);
      const sectionWords = sectionCore.split(/[\s,·:~\-/]+/).filter(w => w.length >= 2);

      if (titleWords.length > 0 && sectionWords.length > 0) {
        const hasOverlap = titleWords.some(tw =>
          sectionWords.some(sw => tw.includes(sw) || sw.includes(tw))
        );
        if (!hasOverlap) {
          // chapter에서도 겹치는지 확인 (chapter > section > title 관계)
          const chapterWords = (c.chapter || '')
            .replace(/\$[^$]*\$/g, '')
            .split(/[\s,·:~\-/]+/)
            .filter(w => w.length >= 2);
          const titleInChapter = titleWords.some(tw =>
            chapterWords.some(cw => tw.includes(cw) || cw.includes(tw))
          );
          if (!titleInChapter) {
            problems.push(`[제목-섹션 불일치] title="${c.title}" vs section="${c.section}" (공통 키워드 없음)`);
          }
        }
      }
    }

    // 4. 수학 용어 부족 검사 (빈칸 생성 가능 여부)
    if (content && contentLen >= 100) {
      const foundTerms = MATH_TERMS.filter(term => content.includes(term));
      if (foundTerms.length < 3) {
        problems.push(`[수학 용어 부족] 수학 용어 ${foundTerms.length}개만 발견 (최소 3개 필요). 발견: [${foundTerms.join(', ')}]`);
      }
    }

    // 5. 빈칸이 없는 개념
    if (blankCount === 0 && contentLen >= 100) {
      problems.push(`[빈칸 미생성] BlankExercise 0개`);
    }

    if (problems.length > 0) {
      issues.push({
        id: c.id,
        title: c.title,
        grade: c.grade,
        semester: c.semester,
        chapter: c.chapter,
        section: c.section,
        blankCount,
        problems,
      });
    } else {
      totalOk++;
    }
  }

  // 결과 출력
  console.log('='.repeat(120));
  console.log(`정상 개념: ${totalOk}개 | 문제 있는 개념: ${issues.length}개`);
  console.log('='.repeat(120));

  if (issues.length === 0) {
    console.log('\n모든 초등 개념이 품질 기준을 통과했습니다!\n');
    return;
  }

  // 문제 유형별 통계
  const problemStats: Record<string, number> = {};
  for (const issue of issues) {
    for (const p of issue.problems) {
      const type = p.match(/\[([^\]]+)\]/)?.[1] || '기타';
      problemStats[type] = (problemStats[type] || 0) + 1;
    }
  }

  console.log('\n📊 문제 유형별 통계:');
  for (const [type, count] of Object.entries(problemStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}개`);
  }
  console.log('');

  // 학년별로 그룹화하여 출력
  const byGrade = new Map<string, Issue[]>();
  for (const issue of issues) {
    const g = issue.grade || 'unknown';
    if (!byGrade.has(g)) byGrade.set(g, []);
    byGrade.get(g)!.push(issue);
  }

  for (const [grade, gradeIssues] of byGrade) {
    console.log(`\n${'━'.repeat(60)}`);
    console.log(`  ${grade} (문제 개념 ${gradeIssues.length}개)`);
    console.log(`${'━'.repeat(60)}`);

    for (const issue of gradeIssues) {
      console.log(`\n  ID: ${issue.id}`);
      console.log(`  제목: ${issue.title}`);
      console.log(`  학년: ${issue.grade} | 학기: ${issue.semester} | 단원: ${issue.chapter}`);
      console.log(`  섹션: ${issue.section}`);
      console.log(`  빈칸 수: ${issue.blankCount}개`);
      for (const p of issue.problems) {
        console.log(`  ⚠ ${p}`);
      }
      console.log(`  ${'─'.repeat(56)}`);
    }
  }

  console.log(`\n\n총 문제 개념: ${issues.length}개 / 전체 ${concepts.length}개\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
