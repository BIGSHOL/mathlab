import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthViewAs, isResponse, badRequest, requireLicense } from '@/lib/api';
import { isFeatureEnabled } from '@/lib/utils/features';
import { XP_REWARDS, awardXp } from '@/lib/utils/xp';
import { AssemblyAI } from 'assemblyai';

// --- AssemblyAI 싱글톤 ---
let _aaiClient: AssemblyAI | null = null;
function getAssemblyAIClient(): AssemblyAI {
  if (_aaiClient) return _aaiClient;
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error('ASSEMBLYAI_API_KEY is missing');
  _aaiClient = new AssemblyAI({ apiKey });
  return _aaiClient;
}

/** 전사 텍스트와 원본의 단어 겹침 유사도 (0~100) */
function calculateSimilarity(transcript: string, original: string): number {
  // LaTeX 수식 제거 (음성으로 읽기 어려움), 마크다운 기호 제거
  const cleanOriginal = original
    .replace(/\$[^$]+\$/g, '')
    .replace(/\$\$[^$]+\$\$/g, '')
    .replace(/[#*\n\r|>-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const originalWords = cleanOriginal
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map((w) => w.toLowerCase());

  const transcriptWords = transcript
    .replace(/\s+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map((w) => w.toLowerCase());

  if (originalWords.length === 0) return 100;

  const matchCount = originalWords.filter((ow) =>
    transcriptWords.some((tw) => tw.includes(ow) || ow.includes(tw))
  ).length;

  return Math.round((matchCount / originalWords.length) * 100);
}

const PASS_THRESHOLD = 50; // 50% 유사도로 통과 (관대한 기준)
const VOICE_BONUS_XP = 3; // 음성 인증 가산점 (5 + 3 = 8 XP)

/** 개념 본문에서 핵심 한글 용어 추출 (word_boost용, 최대 100개) */
function extractKeywords(fullContent: string): string[] {
  const clean = fullContent
    .replace(/\$\$[^$]+\$\$/g, '')  // 블록 LaTeX 제거
    .replace(/\$[^$]+\$/g, '')       // 인라인 LaTeX 제거
    .replace(/[#*|>\-\n\r]/g, '')
    .replace(/\s+/g, ' ');

  const words = clean.split(/\s+/).filter((w) => w.length >= 2);
  // 2글자 이상 한글 단어만 (조사/접속사 제외)
  const koreanWords = words.filter((w) => /^[가-힣]{2,}$/.test(w));
  // 중복 제거 + 빈도순 정렬
  const freq = new Map<string, number>();
  for (const w of koreanWords) freq.set(w, (freq.get(w) ?? 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, 100);
}

// POST /api/learning/voice-check
export async function POST(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const licenseCheck = await requireLicense(user, 'concept');
  if (licenseCheck) return licenseCheck;

  // 피처플래그 체크
  if (!(await isFeatureEnabled('voice_reading_check', user.tenantId))) {
    return badRequest('비활성화된 기능입니다');
  }

  // FormData로 audio + conceptId 수신
  const formData = await request.formData();
  const conceptId = formData.get('conceptId') as string;
  const audioFile = formData.get('audio') as File | null;

  if (!conceptId || !audioFile) {
    return badRequest('conceptId와 audio 파일이 필요합니다');
  }

  const concept = await prisma.concept.findUnique({
    where: { id: conceptId },
    select: { id: true, fullContent: true },
  });
  if (!concept) return badRequest('개념을 찾을 수 없습니다');

  try {
    // AssemblyAI 전사
    const client = getAssemblyAIClient();
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // 개념 핵심 용어를 word_boost로 전달 → 수학 용어 인식률 향상
    const keywords = extractKeywords(concept.fullContent);

    const transcript = await client.transcripts.transcribe({
      audio: audioBuffer,
      language_code: 'ko',
      ...(keywords.length > 0 && { word_boost: keywords }),
    });

    if (transcript.status === 'error' || !transcript.text) {
      return NextResponse.json({
        data: {
          passed: false,
          similarity: 0,
          xpAwarded: 0,
          feedback: '음성 인식에 실패했습니다. 조용한 환경에서 다시 시도해주세요.',
        },
      });
    }

    const similarity = calculateSimilarity(transcript.text, concept.fullContent);
    const passed = similarity >= PASS_THRESHOLD;

    let xpAwarded = 0;

    // 통과 시 READING 완료 처리 + XP 지급 (기본 5 + 음성 가산 3 = 8 XP)
    if (passed) {
      xpAwarded = XP_REWARDS.READING_COMPLETE + VOICE_BONUS_XP;

      await prisma.$transaction(async (tx) => {
        const prog = await tx.learningProgress.upsert({
          where: {
            userId_conceptId_stage: { userId: user.id, conceptId, stage: 'READING' },
          },
          update: {
            completed: true,
            completedAt: new Date(),
            attempts: { increment: 1 },
          },
          create: {
            userId: user.id,
            conceptId,
            stage: 'READING',
            completed: true,
            completedAt: new Date(),
            attempts: 1,
          },
        });

        await awardXp(tx, user.id, xpAwarded, 'READING', prog.id);
      });
    }

    return NextResponse.json({
      data: {
        passed,
        similarity,
        xpAwarded,
        feedback: passed
          ? `읽기 인증 완료! (유사도 ${similarity}%)`
          : `읽기 내용이 부족합니다. (유사도 ${similarity}%, ${PASS_THRESHOLD}% 이상 필요)`,
      },
    });
  } catch (err) {
    console.error('[VoiceCheck] AssemblyAI 호출 실패:', err);
    return NextResponse.json(
      { error: { code: 'STT_FAILED', message: '음성 처리 중 오류가 발생했습니다' } },
      { status: 500 }
    );
  }
}
