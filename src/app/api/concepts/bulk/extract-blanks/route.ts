import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, isResponse, badRequest } from '@/lib/api';
import { GoogleGenAI, Type } from '@google/genai';
import { buildMergedExercise, addFullSentenceBlanks, type BlankDifficulty } from '@/lib/utils/blank-generator';

const BLANK_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    blanks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING, description: '빈칸으로 만들 용어 (원문 그대로)' },
          difficulty: { type: Type.STRING, description: 'easy=핵심 정의 용어, hard=심화/부가 용어' },
        },
        required: ['term', 'difficulty'],
      },
    },
  },
  required: ['blanks'],
};

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
  return new GoogleGenAI({ apiKey });
}

interface ExtractRequest {
  items: { title: string; fullContent: string }[];
  mergeSameTerms?: boolean;
}

interface AiBlankResult {
  blanks: { term: string; difficulty: string }[];
}

// POST /api/concepts/bulk/extract-blanks — AI 빈칸 추출
export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const body = (await request.json()) as ExtractRequest;
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return badRequest('items 배열이 필요합니다');
  }

  const ai = getClient();

  // Process in batches to avoid rate limits (5 items per batch)
  const BATCH_SIZE = 5;
  const allResults: { templateText: string; blanks: { position: number; answer: string; hint: string; difficulty: string }[] }[] = [];

  for (let i = 0; i < body.items.length; i += BATCH_SIZE) {
    const batch = body.items.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (item) => {
      try {
        const prompt = `당신은 한국 수학 교육 전문가입니다.

아래 수학 개념 설명을 읽고, 학생이 빈칸 채우기로 학습할 용어를 추출하세요.
각 용어에 난이도(easy/hard)를 지정합니다.

제목: ${item.title}
내용: ${item.fullContent}

## easy (1단계 - 핵심 정의 암기)
이 개념의 핵심 정의를 이해하는 데 반드시 필요한 용어 4-8개.
- 정의의 핵심어: "~을(를) ~라 한다"에서 정의되는 용어
- 공식의 핵심 구성요소: 밑변, 높이, 반지름 등
- 분류/종류를 나타내는 용어: 정삼각형, 이등변삼각형 등

## hard (2단계 - 심화 암기)
easy에 포함되지 않은 추가 용어 10-20개.
- 성질, 조건, 관계를 나타내는 용어
- 공식에 나오는 부가 개념
- 개념을 설명하는 중요 수식어/동사
- 숫자가 포함된 핵심 표현 (예: "2인", "1과")

## 규칙
1. 원문에 정확히 존재하는 단어만 선택 (변형/축약 금지)
2. 조사(은/는/이/가/을/를/의/에/에서/로)는 분리하여 제외
3. "수", "값", "식", "것", "때", "경우" 같은 일반적 단어 제외
4. 같은 용어가 여러 번 나오면 한 번만 포함
5. easy 용어만으로 핵심 정의를 설명할 수 있어야 함
6. **중요**: $...$ 수식을 용어로 선택할 때는 반드시 $ 기호를 포함하여 통째로 선택 (예: "$a^2$" O, "a^2" X). $ 안의 내용만 따로 선택하면 절대 안 됩니다.
7. **절대 금지**: (1), (2) 같은 번호 매기기 숫자를 선택하지 마세요`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: BLANK_RESPONSE_SCHEMA,
          },
        });

        if (!response.text) return { templateText: '', blanks: [] };

        let jsonStr = response.text.trim();
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const data = JSON.parse(jsonStr) as AiBlankResult;

        if (!data.blanks || data.blanks.length === 0) {
          return { templateText: '', blanks: [] };
        }

        // Map AI difficulty to our type
        const terms = data.blanks.map((b) => ({
          term: b.term,
          difficulty: (b.difficulty === 'hard' ? 'hard' : 'easy') as BlankDifficulty,
        }));

        // Build merged exercise from full content
        const merged = buildMergedExercise(item.fullContent, terms, body.mergeSameTerms ?? false);
        if (!merged) return { templateText: '', blanks: [] };

        // Add 통문장 (full-sentence) blanks
        const withFull = addFullSentenceBlanks(merged);

        return {
          templateText: withFull.templateText,
          blanks: withFull.blanks.map((b) => ({
            position: b.position,
            answer: b.answer,
            hint: b.hint,
            difficulty: b.difficulty,
          })),
        };
      } catch {
        return { templateText: '', blanks: [] };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    allResults.push(...batchResults);
  }

  return NextResponse.json({ data: allResults });
}
