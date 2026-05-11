/**
 * 기출분석 데이터 일회성 복사 스크립트
 *
 * 소스 테넌트(예: 본원)의 ExamPaper + ExamAnalysis + ExamAnalysisExtension을
 * 대상 테넌트(예: 침산점)로 독립 사본으로 복제한다.
 *
 * - 스키마 변경 없음. cuid 새로 생성, FK 재연결.
 * - School/fileUrls(Supabase Storage)은 그대로 참조 (전역 자원).
 * - studentId/extractApprovedBy는 항상 null로 초기화.
 * - 중복 감지: (title, grade, schoolName)로 대상에 같은 시험지 있으면 스킵.
 * - 트랜잭션: 시험지 1건 단위로 ExamPaper+Analysis+Extension(+Questions)을 묶음.
 *
 * Usage:
 *   npx tsx scripts/copy-exam-analysis.ts --source <slug|name> --target <slug|name>
 *   --apply             실제 실행 (기본은 dry-run)
 *   --clean             대상 테넌트의 기존 ExamPaper 모두 삭제 후 복사
 *   --include-questions Question(examPaperId 연결분)도 복사
 *   --teacher <userId>  사본 소유 선생님 명시 (미지정 시 대상 테넌트의 첫 OWNER)
 *
 * Examples:
 *   npx tsx scripts/copy-exam-analysis.ts --source mathlab --target chimsan
 *   npx tsx scripts/copy-exam-analysis.ts --source mathlab --target chimsan --apply
 *   npx tsx scripts/copy-exam-analysis.ts --source mathlab --target chimsan --apply --clean --include-questions
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface Args {
  source: string;
  target: string;
  apply: boolean;
  clean: boolean;
  includeQuestions: boolean;
  teacher?: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    if (idx === -1) return undefined;
    const next = argv[idx + 1];
    if (!next || next.startsWith('--')) return undefined;
    return next;
  };
  const has = (flag: string) => argv.includes(flag);

  const source = get('--source');
  const target = get('--target');
  if (!source || !target) {
    console.error('❌ --source 와 --target 옵션이 필요합니다.');
    console.error('   예: npx tsx scripts/copy-exam-analysis.ts --source mathlab --target chimsan');
    process.exit(1);
  }
  return {
    source,
    target,
    apply: has('--apply'),
    clean: has('--clean'),
    includeQuestions: has('--include-questions'),
    teacher: get('--teacher'),
  };
}

async function resolveTenant(query: string, label: string) {
  // slug 우선, 그다음 name (대소문자/공백 무시)
  const candidates = await prisma.tenant.findMany({
    where: {
      OR: [
        { slug: query },
        { name: query },
        { slug: { equals: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
      ],
    },
  });
  if (candidates.length === 0) {
    console.error(`❌ ${label} 테넌트를 찾을 수 없습니다: "${query}"`);
    console.error('   현재 등록된 테넌트:');
    const all = await prisma.tenant.findMany({ select: { slug: true, name: true } });
    for (const t of all) console.error(`     - ${t.slug}  (${t.name})`);
    process.exit(1);
  }
  if (candidates.length > 1) {
    console.error(`❌ ${label} 테넌트가 여러 개 매칭됩니다: "${query}"`);
    for (const t of candidates) console.error(`     - ${t.slug}  (${t.name})`);
    console.error('   더 정확한 slug나 name을 지정하세요.');
    process.exit(1);
  }
  return candidates[0];
}

async function resolveTargetTeacher(targetTenantId: string, explicitTeacherId?: string) {
  if (explicitTeacherId) {
    const t = await prisma.user.findFirst({
      where: { id: explicitTeacherId, tenantId: targetTenantId },
    });
    if (!t) {
      console.error(`❌ --teacher ${explicitTeacherId} 가 대상 테넌트에 속한 사용자가 아닙니다.`);
      process.exit(1);
    }
    return t;
  }
  // 대상 테넌트의 OWNER 우선, 없으면 가장 먼저 만들어진 TEACHER 이상
  const owner = await prisma.user.findFirst({
    where: { tenantId: targetTenantId, role: 'OWNER', deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  if (owner) return owner;
  const teacher = await prisma.user.findFirst({
    where: {
      tenantId: targetTenantId,
      role: { in: ['TEACHER', 'MANAGER', 'SUPER_ADMIN'] },
      deletedAt: null,
    },
    orderBy: { createdAt: 'asc' },
  });
  if (teacher) return teacher;
  console.error('❌ 대상 테넌트에 선생님(OWNER/TEACHER/MANAGER)이 없습니다. --teacher 옵션으로 명시하세요.');
  process.exit(1);
}

async function main() {
  const args = parseArgs();
  console.log('📋 기출분석 데이터 복사 시작\n');
  console.log(`   source: ${args.source}`);
  console.log(`   target: ${args.target}`);
  console.log(`   apply: ${args.apply ? 'YES (실제 실행)' : 'NO (dry-run)'}`);
  console.log(`   clean: ${args.clean ? 'YES (기존 데이터 삭제)' : 'NO'}`);
  console.log(`   include-questions: ${args.includeQuestions ? 'YES' : 'NO'}`);
  if (args.teacher) console.log(`   teacher: ${args.teacher}`);
  console.log('');

  const sourceTenant = await resolveTenant(args.source, '소스');
  const targetTenant = await resolveTenant(args.target, '대상');
  if (sourceTenant.id === targetTenant.id) {
    console.error('❌ 소스와 대상이 같은 테넌트입니다.');
    process.exit(1);
  }
  console.log(`🏢 소스: ${sourceTenant.name} (${sourceTenant.slug}, ${sourceTenant.id})`);
  console.log(`🏢 대상: ${targetTenant.name} (${targetTenant.slug}, ${targetTenant.id})\n`);

  const targetTeacher = await resolveTargetTeacher(targetTenant.id, args.teacher);
  console.log(`👤 대상 선생님: ${targetTeacher.name} (${targetTeacher.role}, ${targetTeacher.id})\n`);

  // --clean: 대상 ExamPaper 모두 삭제 (Analysis/Extension/Question.examPaperId는 cascade/SetNull)
  if (args.clean) {
    const existing = await prisma.examPaper.count({ where: { tenantId: targetTenant.id } });
    console.log(`🧹 --clean: 대상 테넌트의 기존 ExamPaper ${existing}건 삭제 ${args.apply ? '실행' : '예정'}`);
    if (args.apply && existing > 0) {
      await prisma.examPaper.deleteMany({ where: { tenantId: targetTenant.id } });
      console.log(`   ✅ ${existing}건 삭제 완료\n`);
    } else {
      console.log('');
    }
  }

  // 소스 시험지 로드 (Analysis + Extension 포함)
  const sourcePapers = await prisma.examPaper.findMany({
    where: { tenantId: sourceTenant.id },
    include: {
      analyses: { include: { extensions: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`📄 소스 시험지: ${sourcePapers.length}건\n`);

  let copied = 0;
  let skipped = 0;
  let failed = 0;
  const summary: Array<{ title: string; status: string; note?: string }> = [];

  for (const paper of sourcePapers) {
    // 중복 감지: (title, grade, schoolName) 동일하면 스킵
    const dup = await prisma.examPaper.findFirst({
      where: {
        tenantId: targetTenant.id,
        title: paper.title,
        grade: paper.grade,
        schoolName: paper.schoolName,
      },
      select: { id: true },
    });
    if (dup) {
      skipped++;
      summary.push({ title: paper.title, status: 'SKIP', note: '중복 (동일 title/grade/school)' });
      console.log(`⏭️  스킵: ${paper.title} — 이미 대상에 존재 (${dup.id})`);
      continue;
    }

    if (!args.apply) {
      copied++;
      const extCount = paper.analyses.reduce((acc, a) => acc + a.extensions.length, 0);
      summary.push({
        title: paper.title,
        status: 'DRY',
        note: `Analysis ${paper.analyses.length}건, Extension ${extCount}건`,
      });
      console.log(`📝 [dry-run] 복사 예정: ${paper.title}  (Analysis ${paper.analyses.length}, Extension ${extCount})`);
      continue;
    }

    // 실제 복사 (트랜잭션)
    try {
      await prisma.$transaction(async (tx) => {
        // 1. ExamPaper 복제
        const newPaper = await tx.examPaper.create({
          data: {
            tenantId: targetTenant.id,
            teacherId: targetTeacher.id,
            studentId: null,
            title: paper.title,
            subject: paper.subject,
            grade: paper.grade,
            category: paper.category,
            unit: paper.unit,
            examScope: paper.examScope ?? undefined,
            schoolName: paper.schoolName,
            schoolId: paper.schoolId,
            examType: paper.examType,
            fileUrls: paper.fileUrls,
            fileType: paper.fileType,
            status: paper.status,
            analysisStep: paper.analysisStep,
            errorMessage: paper.errorMessage,
            extractedToBankAt: paper.extractedToBankAt,
            extractedQuestionCount: paper.extractedQuestionCount,
            extractApproved: false,
            extractApprovedBy: null,
            extractApprovedAt: null,
            extractAttempts: 0,
            lastExtractError: null,
          },
        });

        // 2. ExamAnalysis 복제 (1:N)
        for (const analysis of paper.analyses) {
          const newAnalysis = await tx.examAnalysis.create({
            data: {
              examPaperId: newPaper.id,
              questions: analysis.questions as Prisma.InputJsonValue,
              summary: analysis.summary ?? undefined,
              markDetection: analysis.markDetection ?? undefined,
              crossValidation: analysis.crossValidation ?? undefined,
              modelVersion: analysis.modelVersion,
              totalQuestions: analysis.totalQuestions,
              totalPoints: analysis.totalPoints,
              earnedPoints: analysis.earnedPoints,
              analyzedAt: analysis.analyzedAt,
            },
          });

          // 3. ExamAnalysisExtension 복제 (1:N, agentType unique)
          for (const ext of analysis.extensions) {
            await tx.examAnalysisExtension.create({
              data: {
                analysisId: newAnalysis.id,
                agentType: ext.agentType,
                result: ext.result as Prisma.InputJsonValue,
                errorMessage: ext.errorMessage,
              },
            });
          }
        }

        // 4. Question 복제 (옵션)
        if (args.includeQuestions) {
          const questions = await tx.question.findMany({
            where: { examPaperId: paper.id, isDraft: false },
          });
          for (const q of questions) {
            // 대상 테넌트의 (bookCode, chapter) 범위에서 questionNum 재부여
            const maxNum = await tx.question.aggregate({
              where: { tenantId: targetTenant.id, bookCode: q.bookCode, chapter: q.chapter },
              _max: { questionNum: true },
            });
            const nextNum = (maxNum._max.questionNum ?? 0) + 1;
            await tx.question.create({
              data: {
                bookCode: q.bookCode,
                chapter: q.chapter,
                section: q.section,
                questionNum: nextNum,
                pageNum: q.pageNum,
                difficulty: q.difficulty,
                type: q.type,
                content: q.content,
                choices: q.choices ?? undefined,
                answer: q.answer,
                explanation: q.explanation,
                scoringCriteria: q.scoringCriteria,
                source: q.source,
                sourceTag: q.sourceTag,
                diagramSpec: q.diagramSpec ?? undefined,
                diagramSVG: q.diagramSVG,
                choiceColumns: q.choiceColumns,
                domain: q.domain,
                abilityDomain: q.abilityDomain,
                conceptId: q.conceptId,
                tenantId: targetTenant.id,
                createdById: targetTeacher.id,
                examPaperId: newPaper.id,
                isDraft: false,
              },
            });
          }
        }

        return newPaper;
      });

      copied++;
      const extCount = paper.analyses.reduce((acc, a) => acc + a.extensions.length, 0);
      summary.push({
        title: paper.title,
        status: 'OK',
        note: `Analysis ${paper.analyses.length}, Extension ${extCount}`,
      });
      console.log(`✅ 복사: ${paper.title}  (Analysis ${paper.analyses.length}, Extension ${extCount})`);
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      summary.push({ title: paper.title, status: 'FAIL', note: message });
      console.error(`❌ 실패: ${paper.title} — ${message}`);
    }
  }

  // 요약
  console.log('\n📊 결과 요약');
  console.log(`   대상 시험지: ${sourcePapers.length}건`);
  console.log(`   복사 ${args.apply ? '완료' : '예정'}: ${copied}건`);
  console.log(`   스킵 (중복): ${skipped}건`);
  console.log(`   실패: ${failed}건`);
  if (!args.apply && copied > 0) {
    console.log('\n💡 실제 실행하려면 --apply 옵션을 추가하세요.');
  }
}

main()
  .catch((err) => {
    console.error('\n❌ 치명적 오류:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
