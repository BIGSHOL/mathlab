import { readFileSync } from 'fs';
import { GoogleGenAI } from '@google/genai';
// @ts-expect-error legacy build
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
// @ts-expect-error napi canvas
import { createCanvas } from '@napi-rs/canvas';
import { mathSolutionPlugin } from '../src/lib/pdf-extract-engine/presets/math-textbook';
import { normalizeMathText, normalizeAnswerField, deepFixText, fixLatexEscaping } from '../src/lib/pdf-extract-engine/ai/post-processor';

const PDF_PATH = 'N:/개인/강아/교재자료/RPM/22/개념원리 RPM 중 1-1 - 정답 및 해설.pdf';
const TEST_PAGE = 10; // #137, 138, 139... 포함 — 이전에 깨진 케이스
const RENDER_SCALE = 2;

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    for (const f of ['D:/mathlab/.env.local', 'D:/mathlab/.env']) {
      try {
        const env = readFileSync(f, 'utf-8');
        const m = env.match(/GEMINI_API_KEY\s*=\s*(.+)/);
        if (m) { process.env.GEMINI_API_KEY = m[1].trim(); break; }
      } catch {}
    }
  }
  console.log(`API KEY 로드: ${process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.slice(0, 10) + '...' : '없음'}`);

  // OCR 텍스트
  const raw = readFileSync('D:/mathlab/rpm-solution-pdf-raw.txt', 'utf-8');
  const parts = raw.split(/^===== PAGE (\d+) =====$/m);
  let ocrText = '';
  for (let i = 1; i < parts.length; i += 2) {
    if (Number(parts[i]) === TEST_PAGE) { ocrText = (parts[i + 1] || '').trim(); break; }
  }
  console.log(`OCR p${TEST_PAGE} (${ocrText.length}자)`);

  // PDF 렌더
  const data = new Uint8Array(readFileSync(PDF_PATH));
  const pdfDoc = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  const page = await pdfDoc.getPage(TEST_PAGE);
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx as any, viewport, canvas: canvas as any }).promise;
  const imageBase64 = canvas.toBuffer('image/png').toString('base64');
  console.log(`이미지 렌더 완료 (${(imageBase64.length / 1024).toFixed(0)}KB)`);

  // Gemini 호출
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = mathSolutionPlugin.buildUserPrompt!(mathSolutionPlugin.systemPrompt, ocrText);
  console.log('Gemini 호출 중...');
  const start = Date.now();
  const res = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: 'image/png', data: imageBase64 } },
        { text: prompt },
      ],
    }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: mathSolutionPlugin.responseSchema as any,
    },
  });
  console.log(`완료 (${((Date.now() - start) / 1000).toFixed(1)}s)`);
  if (res.usageMetadata) {
    console.log(`토큰: in=${res.usageMetadata.promptTokenCount}, out=${res.usageMetadata.candidatesTokenCount}`);
  }

  const parsed = JSON.parse((res.text || '').trim());
  const fixed = deepFixText(parsed, fixLatexEscaping) as { solutions: any[] };
  console.log(`\n추출된 해설 ${fixed.solutions.length}건:`);
  for (const s of fixed.solutions.slice(0, 5)) {
    console.log(`\n---- #${s.questionNum} ----`);
    console.log(`answer: ${normalizeAnswerField(s.answer || '')}`);
    const exp = normalizeMathText(s.explanation || '');
    console.log(`explanation (${exp.length}자):`);
    console.log(exp);
    if (s.scoringCriteria) console.log(`scoringCriteria: ${normalizeMathText(s.scoringCriteria).slice(0, 300)}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
