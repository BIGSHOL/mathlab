/**
 * V3 데이터 연결 검증 스크립트
 *
 * 1. DB의 commentary 결과에 V3 신규 필드(blog_qa, feature_callout 등)가 있는지
 * 2. AGENT_PROMPT_VERSIONS.commentary 와 저장된 result._meta.promptVersion 일치 여부 (stale 감지)
 * 3. lazy migration이 작동할지 예측
 *
 * 사용: npx tsx scripts/check-v3-data.ts
 */

import { config as dotenvConfig } from 'dotenv';
import { join } from 'path';
dotenvConfig({ path: join(process.cwd(), '.env.local'), override: true });
dotenvConfig({ path: join(process.cwd(), '.env'), override: false });

import { prisma } from '../src/lib/db';
import { AGENT_PROMPT_VERSIONS } from '../src/lib/exam-analysis/constants';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('V3 데이터 연결 검증');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`AGENT_PROMPT_VERSIONS.commentary (현재 코드): ${AGENT_PROMPT_VERSIONS.commentary}`);
  console.log('─'.repeat(60));

  // 최근 분석본 5건의 commentary 결과 확인
  const exts = await prisma.examAnalysisExtension.findMany({
    where: { agentType: 'commentary' },
    orderBy: { lastRunAt: 'desc' },
    take: 5,
    include: { analysis: { include: { examPaper: { select: { title: true, grade: true, schoolName: true } } } } },
  });

  if (exts.length === 0) {
    console.log('❌ commentary extension 0건 — 분석본이 없거나 commentary 한 번도 안 돌림');
    return;
  }

  for (const ext of exts) {
    const result = ext.result as Record<string, unknown> | null;
    const meta = (result?._meta || {}) as Record<string, unknown>;
    const storedVersion = (meta.promptVersion as string) || '(없음)';
    const stale = storedVersion !== AGENT_PROMPT_VERSIONS.commentary;

    const v3Fields = ['blog_kicker', 'blog_headline', 'blog_dek', 'feature_callout', 'blog_qa', 'conclusion', 'pull_quote', 'grade_cuts', 'topic_performance'];
    const v3Present = v3Fields.filter((f) => {
      const v = result?.[f];
      if (v == null) return false;
      if (Array.isArray(v)) return v.length > 0;
      return true;
    });

    console.log(`\n📄 ${ext.analysis.examPaper.title}`);
    console.log(`   학년: ${ext.analysis.examPaper.grade}, 학교: ${ext.analysis.examPaper.schoolName ?? '(없음)'}`);
    console.log(`   lastRunAt: ${ext.lastRunAt?.toISOString() ?? '(없음)'}`);
    console.log(`   stored promptVersion: ${storedVersion} ${stale ? '⚠ STALE (재호출 대상)' : '✓ 최신'}`);
    console.log(`   V3 필드 ${v3Present.length}/${v3Fields.length} 채워짐:`);
    for (const f of v3Fields) {
      const v = result?.[f];
      const has = v != null && (Array.isArray(v) ? v.length > 0 : true);
      const detail = Array.isArray(v) ? `[${v.length}]` : (typeof v === 'object' ? '{...}' : typeof v);
      console.log(`     ${has ? '✓' : '✗'} ${f.padEnd(20)} ${has ? detail : ''}`);
    }
    if (result?.blog_qa && Array.isArray(result.blog_qa)) {
      console.log(`   blog_qa 질문 미리보기:`);
      for (const qa of result.blog_qa.slice(0, 3) as Array<Record<string, unknown>>) {
        console.log(`     · ${String(qa.question).slice(0, 70)}`);
      }
    }
  }

  // ── lazy migration 코드 위치 확인 안내 ──
  console.log('\n─'.repeat(60));
  console.log('🔍 lazy migration 동작 — orchestrator/extension 라우트 점검 필요');
  console.log('  분석본 페이지 진입 시 다음 흐름:');
  console.log('  1. /api/exam-analysis/[id]/analysis 가 ExamAnalysisExtension 조회');
  console.log('  2. _meta.promptVersion < AGENT_PROMPT_VERSIONS.commentary 면 stale');
  console.log('  3. orchestrator가 stale 감지 → 자동 재호출 OR 사용자 "재분석" 버튼 필요');
  console.log('\n  → 만약 자동 재호출이 없다면 사용자가 명시적으로 "재분석" 눌러야 V3 필드 생성됨.');
  console.log('  → 그 후에야 V3 UI 표시.');
}

main()
  .catch((e) => {
    console.error('실패:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
