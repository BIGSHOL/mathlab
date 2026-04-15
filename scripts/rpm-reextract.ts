import { prisma } from '../src/lib/db';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
// @ts-expect-error legacy build
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
// @ts-expect-error napi canvas
import { createCanvas } from '@napi-rs/canvas';
import { mathSolutionPlugin } from '../src/lib/pdf-extract-engine/presets/math-textbook';
import { normalizeMathText, normalizeAnswerField, deepFixText, fixLatexEscaping } from '../src/lib/pdf-extract-engine/ai/post-processor';

const PDF_PATH = 'N:/개인/강아/교재자료/RPM/22/개념원리 RPM 중 1-1 - 정답 및 해설.pdf';
const OCR_PATH = 'D:/mathlab/rpm-solution-pdf-raw.txt';
const PROGRESS_PATH = 'D:/mathlab/rpm-reextract-progress.json';
const MAX_PAGE = 76;
const RENDER_SCALE = 2;
const APPLY = process.argv.includes('--apply');
const RETRY_ONLY = process.argv.includes('--retry');

type Solution = { questionNum: number; answer: string; explanation: string; scoringCriteria: string };

function loadOcrPages(): Map<number, string> {
  const raw = readFileSync(OCR_PATH, 'utf-8');
  const pages = new Map<number, string>();
  const parts = raw.split(/^===== PAGE (\d+) =====$/m);
  for (let i = 1; i < parts.length; i += 2) {
    pages.set(Number(parts[i]), (parts[i + 1] || '').trim());
  }
  return pages;
}

async function renderPageToPngBase64(pdfDoc: any, pageNum: number): Promise<string> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx as any, viewport, canvas: canvas as any }).promise;
  const buf = canvas.toBuffer('image/png');
  return buf.toString('base64');
}

async function extractPage(
  client: GoogleGenAI,
  imageBase64: string,
  ocrText: string,
): Promise<Solution[]> {
  const prompt = mathSolutionPlugin.buildUserPrompt!(mathSolutionPlugin.systemPrompt, ocrText);
  const res = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: imageBase64 } },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: mathSolutionPlugin.responseSchema as any,
    },
  });
  const raw = JSON.parse((res.text || '').trim());
  const fixed = deepFixText(raw, fixLatexEscaping);
  const data = fixed as { solutions?: Solution[] };
  return (data.solutions || []).map(s => ({
    questionNum: Number(s.questionNum),
    answer: normalizeAnswerField(s.answer || ''),
    explanation: normalizeMathText(s.explanation || ''),
    scoringCriteria: normalizeMathText(s.scoringCriteria || ''),
  }));
}

async function main() {
  if (!existsSync(PDF_PATH)) { console.error('PDF not found'); process.exit(1); }
  if (!process.env.GEMINI_API_KEY) {
    for (const f of ['D:/mathlab/.env.local', 'D:/mathlab/.env']) {
      try {
        const env = readFileSync(f, 'utf-8');
        const m = env.match(/GEMINI_API_KEY\s*=\s*(.+)/);
        if (m) { process.env.GEMINI_API_KEY = m[1].trim(); break; }
      } catch {}
    }
  }
  if (!process.env.GEMINI_API_KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

  const ocrPages = loadOcrPages();

  // DB questionNum 집합
  const qs = await prisma.question.findMany({
    where: { source: '22개정 RPM 중 1-1 학생용' },
    select: { id: true, questionNum: true },
  });
  const qnumToId = new Map<number, string>();
  for (const q of qs) if (q.questionNum != null) qnumToId.set(q.questionNum, q.id);
  console.log(`DB RPM: ${qnumToId.size}건, PDF 페이지: ${MAX_PAGE}`);

  // 진행 상태 로드
  let progress: { completedPages: number[]; solutions: Record<number, Solution> } = { completedPages: [], solutions: {} };
  if (existsSync(PROGRESS_PATH)) {
    progress = JSON.parse(readFileSync(PROGRESS_PATH, 'utf-8'));
    console.log(`이전 진행: 페이지 ${progress.completedPages.length}개, 해설 ${Object.keys(progress.solutions).length}건`);
  }

  const data = new Uint8Array(readFileSync(PDF_PATH));
  const pdfDoc = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const startAt = Date.now();
  for (let p = 1; p <= MAX_PAGE; p++) {
    if (progress.completedPages.includes(p)) continue;
    const ocr = ocrPages.get(p) || '';
    if (!ocr) { console.log(`p${p}: OCR 없음, 스킵`); progress.completedPages.push(p); continue; }

    // 해당 페이지의 문항번호 중 DB에 있는 게 있는지
    const nums = new Set<number>();
    for (const m of ocr.matchAll(/\b0(\d{3})\b/g)) nums.add(Number(m[1]));
    const targetNums = [...nums].filter(n => qnumToId.has(n));
    if (!targetNums.length) { console.log(`p${p}: 매칭 0건, 스킵`); progress.completedPages.push(p); continue; }

    try {
      process.stdout.write(`p${p} (대상 ${targetNums.length}건) 렌더링... `);
      const img = await renderPageToPngBase64(pdfDoc, p);
      process.stdout.write(`추출... `);
      const sols = await extractPage(client, img, ocr);
      let saved = 0;
      for (const s of sols) {
        if (!qnumToId.has(s.questionNum)) continue;
        progress.solutions[s.questionNum] = s;
        saved++;
      }
      progress.completedPages.push(p);
      writeFileSync(PROGRESS_PATH, JSON.stringify(progress), 'utf-8');
      const elapsed = ((Date.now() - startAt) / 1000).toFixed(1);
      console.log(`✓ ${saved}건 저장 (누적 ${Object.keys(progress.solutions).length}건, ${elapsed}s)`);
    } catch (e: any) {
      console.log(`✗ 실패: ${e?.message || e}`);
      writeFileSync(PROGRESS_PATH, JSON.stringify(progress), 'utf-8');
    }
  }

  console.log(`\n📊 추출 완료: ${Object.keys(progress.solutions).length}건 / ${qnumToId.size}건 매칭`);

  if (!APPLY) {
    console.log('(dry-run — 실제 DB 업데이트는 --apply 추가)');
    // 샘플 3개 출력
    const samples = Object.values(progress.solutions).slice(0, 3);
    for (const s of samples) {
      console.log(`\n--- #${s.questionNum} ---`);
      console.log(`answer: ${s.answer}`);
      console.log(`explanation: ${(s.explanation || '').slice(0, 300)}`);
      if (s.scoringCriteria) console.log(`scoring: ${s.scoringCriteria.slice(0, 200)}`);
    }
    return;
  }

  // DB 업데이트
  let updated = 0;
  for (const [numStr, s] of Object.entries(progress.solutions)) {
    const id = qnumToId.get(Number(numStr));
    if (!id) continue;
    await prisma.question.update({
      where: { id },
      data: {
        answer: s.answer || undefined,
        explanation: s.explanation || undefined,
        scoringCriteria: s.scoringCriteria || '',
      },
    });
    updated++;
  }
  console.log(`✅ DB 업데이트 ${updated}건`);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
