import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, badRequest } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { getGeminiClient } from '@/lib/services/gemini';
import sharp from 'sharp';

const BUCKET = 'uploads';
const PREFIX = 'question-images/ai';
const MAX_INPUT_SIZE = 6 * 1024 * 1024; // 6MB

/**
 * 근접 흰색 배경을 투명화 — threshold 기반 픽셀 단위 처리
 * RGB 각 채널이 WHITE_THRESHOLD 이상이면 알파=0
 */
async function chromaKeyWhite(input: Buffer): Promise<Buffer> {
  const THRESHOLD = 235; // 0~255, 높을수록 아주 흰색만 제거
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += channels) {
    const r = out[i], g = out[i + 1], b = out[i + 2];
    if (r >= THRESHOLD && g >= THRESHOLD && b >= THRESHOLD) {
      out[i + 3] = 0; // 알파 0
    }
  }
  return sharp(out, { raw: { width, height, channels } }).png().toBuffer();
}

const NO_TEXT_DIRECTIVE = `
[CRITICAL - ABSOLUTELY NO TEXT IN IMAGE]
- DO NOT render ANY letters, words, numbers, or symbols in the image
- DO NOT include Korean characters (한글), English letters, Chinese characters
- DO NOT include digits (0-9), brackets [], labels like [1장], [2장]
- DO NOT render any signage, name tags, labels, captions, or written content
- If the reference image contains text/labels, REMOVE them entirely
- The output must be a pure visual illustration with ZERO textual content
- Replace any text areas with plain color/pattern/blank space
`.trim();

export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return badRequest('요청 본문이 필요합니다');

  const { sourceImageBase64, sourceImageType, userPrompt, transparentBackground } = body as {
    sourceImageBase64?: string;
    sourceImageType?: string;
    userPrompt?: string;
    transparentBackground?: boolean;
  };

  if (!sourceImageBase64 || !sourceImageType) {
    return badRequest('sourceImageBase64, sourceImageType 필수');
  }

  const cleanBase64 = sourceImageBase64.replace(/^data:image\/\w+;base64,/, '');
  if (cleanBase64.length * 0.75 > MAX_INPUT_SIZE) {
    return badRequest('입력 이미지가 너무 큽니다 (최대 6MB)');
  }

  // 하네스: 배경은 항상 순백(#FFFFFF) — 크로마키로 언제든 투명화 가능하도록 강제
  const bgDirective = `
[BACKGROUND — PURE WHITE #FFFFFF — MANDATORY]
- The background MUST be pure flat white (#FFFFFF), edge to edge
- NO gradient, NO shadow falling onto background, NO texture, NO pattern, NO scenery, NO vignette
- NO cream, beige, off-white, light gray, or any tinted background — ONLY #FFFFFF
- Objects must sit cleanly on the white with crisp edges (no soft white haze blending into object)
- Do NOT place any colored backdrop, table surface, floor, wall, or environment behind the subject
- This is required so the white can be chroma-keyed to transparent downstream — any non-white background breaks the pipeline`.trim();

  const fullPrompt = `${NO_TEXT_DIRECTIVE}

${bgDirective}

Recreate the attached reference image in the same style and composition, but as a FRESH AI-generated illustration. Preserve:
- Overall composition, object arrangement, layout
- Color palette and art style of the SUBJECT (cartoon / illustration / realistic)
- Number and type of objects

Additional user instruction: ${userPrompt?.trim() || '(none — match the reference as closely as possible)'}

REMINDER:
- NO text, NO letters, NO numbers, NO labels anywhere in the output. Pure visual only.
- Background MUST be pure white #FFFFFF (flat, no gradient, no shadow on background).`;

  try {
    const client = getGeminiClient();
    const res = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: sourceImageType, data: cleanBase64 } },
          { text: fullPrompt },
        ],
      }],
    });

    // 응답에서 이미지 part 찾기
    const parts = res.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData?.data);
    if (!imagePart?.inlineData?.data) {
      return badRequest('이미지 생성 실패 (응답에 이미지 없음)');
    }

    const generatedBase64 = imagePart.inlineData.data;
    let generatedMime = imagePart.inlineData.mimeType || 'image/png';
    let buffer: Buffer = Buffer.from(generatedBase64, 'base64');

    // 크로마키: 근접 흰색 배경을 투명하게 (transparentBackground 옵션)
    if (transparentBackground) {
      try {
        buffer = await chromaKeyWhite(buffer) as Buffer;
        generatedMime = 'image/png';
      } catch (e) {
        console.warn('[regenerate] chromaKey failed', e);
      }
    }

    const ext = generatedMime.split('/')[1] || 'png';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const storagePath = `${PREFIX}/${filename}`;
    const supabase = getSupabase();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: generatedMime, upsert: false });
    if (error) {
      console.error('[regenerate] supabase', error);
      return badRequest(`업로드 실패: ${error.message}`);
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    return NextResponse.json({ data: { url: data.publicUrl } }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI 재생성 오류';
    console.error('[regenerate] error', msg);
    return badRequest(msg);
  }
}
