/**
 * 데모 네이버 복사용 섹션 이미지 사전 베이크.
 *
 * /demo의 3개 샘플 각각에 대해 (분석 연출 → 총평 생성 → V3 펼침) 후 .v3 섹션을 캡처하고,
 * 발행용으로 못 쓰도록 열화(상단 38%만 선명 + 블러 + 워터마크) 처리해 정적 자산으로 저장:
 *   public/demo-naver/<key>/s<i>.jpg
 * 캡션(요약)과 함께 src/lib/demo/naver-blocks.ts (생성 모듈)도 갱신한다.
 *
 * 데모의 [이미지 복사]는 실시간 캡처 대신 이 자산 URL을 클립보드에 쓴다 —
 * 실제 플로우(스토리지 공개 URL)와 동일한 페이로드 구조 (대용량 data URL·포커스 만료 문제 회피).
 *
 * 사용: dev 서버 실행 중 상태에서  node scripts/bake-demo-naver-blocks.mjs [--base=http://127.0.0.1:3000]
 * 선행: node scripts/generate-demo-watermark.mjs (scripts/assets/demo-watermark.png)
 */
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';

const BASE = process.argv.find((a) => a.startsWith('--base='))?.slice(7) ?? 'http://127.0.0.1:3000';
// fileName: DemoUploadForm 샘플 picker의 파일명 매칭 (실전형 플로우: 업로드 폼 → 샘플 선택)
const SAMPLES = [
  { fileName: /OO고\]\[1학년\]/, key: 'g1', grade: '고1' },
  { fileName: /OO중\]\[2학년\]/, key: 'm2', grade: '중2' },
  { fileName: /OO중\]\[3학년\]/, key: 'm3', grade: '중3' },
];

const WATERMARK = readFileSync('scripts/assets/demo-watermark.png');

// koImg 등가 (src/lib/exam-analysis/section-blocks.ts::stripMathForImage + koImg 복제 — 스크립트 전용)
function koImg(text) {
  if (!text) return '';
  return text
    .replace(/\$\$?([^$]*)\$\$?/g, '$1')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
    .replace(/\\times/g, '×').replace(/\\div/g, '÷')
    .replace(/\\leq/g, '≤').replace(/\\geq/g, '≥').replace(/\\neq/g, '≠')
    .replace(/\^\{?2\}?/g, '²').replace(/\^\{?3\}?/g, '³')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\bLv\.?\s*([1-5])(?![\d.])/gi, '$1단계')
    .replace(/\bLevel\s+([1-5])(?![\d.])/gi, '$1단계');
}

/** 캡처 PNG → 열화 JPEG (상단 38% 선명 + 블러 + 워터마크 + 720px 다운스케일) */
async function degrade(pngBuf) {
  const meta = await sharp(pngBuf).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const clearH = Math.max(1, Math.round(height * 0.38));
  const blurred = await sharp(pngBuf).blur(16).modulate({ brightness: 0.97 }).png().toBuffer();
  const topRegion = await sharp(pngBuf).extract({ left: 0, top: 0, width, height: clearH }).png().toBuffer();
  const composites = [{ input: topRegion, left: 0, top: 0 }];
  const wmWidth = Math.max(1, Math.round(width * 0.88));
  const wm = await sharp(WATERMARK).resize({ width: wmWidth }).png().toBuffer();
  const wmH = (await sharp(wm).metadata()).height ?? 0;
  const blurZoneH = height - clearH;
  if (wmH + 12 <= blurZoneH) {
    composites.push({ input: wm, left: Math.round((width - wmWidth) / 2), top: Math.round(clearH + (blurZoneH - wmH) / 2) });
  }
  // ⚠️ sharp는 체인 순서와 무관하게 resize를 composite보다 먼저 적용 → 합성과 리사이즈를 2단계로 분리
  const composed = await sharp(blurred).composite(composites).png().toBuffer();
  return sharp(composed).resize({ width: Math.min(width, 720) }).jpeg({ quality: 74, mozjpeg: true }).toBuffer();
}

const browser = await chromium.launch();
const result = {};
try {
  for (const { fileName, key, grade } of SAMPLES) {
    // deviceScaleFactor 1 — 스케일은 domToPng({scale:2})가 담당 (production과 동일)
    const page = await browser.newPage({ viewport: { width: 1380, height: 1000 } });
    console.log(`\n── ${grade} (${key}) 진행 중...`);
    await page.goto(BASE + '/demo', { waitUntil: 'networkidle' });
    // 실전형 플로우: 빈 상태 [시험지 업로드] → 폼 → 드롭존 → 샘플 선택 → [업로드] → [분석 실행]
    await page.getByRole('button', { name: /시험지 업로드/ }).click();
    await page.getByText('클릭하거나 파일을 드래그하세요').click();
    await page.getByRole('button', { name: fileName }).click();
    await page.locator('form').getByRole('button', { name: '업로드', exact: true }).click();
    await page.getByRole('button', { name: '분석 실행', exact: true }).last().click({ timeout: 15000 });
    await page.getByText('기본 분석', { exact: true }).waitFor({ timeout: 40000 });
    await page.getByRole('button', { name: '총평 생성' }).click();
    await page.getByText('총평이 생성되었습니다').waitFor({ timeout: 30000 });
    // V3 펼침 (접힘 헤더의 chevron)
    await page.locator('button:has(svg path[d="M19 9l-7 7-7-7"])').first().click();
    await page.locator('.v3').waitFor({ timeout: 10000 });
    await page.waitForTimeout(2500); // 차트/폰트 로드 정착

    // production 캡처와 동일 엔진(modern-screenshot UMD) 주입 — element.screenshot은
    // 뷰포트 기준이라 sticky 바·토스트가 비치고 스크롤 컨테이너에서 클리핑이 깨짐
    await page.addScriptTag({ path: 'node_modules/modern-screenshot/dist/index.js' });

    // 섹션 노드 수집 + 요약 (AnalysisDetail.handleCopyNaverImages의 summaryOf와 동일 규칙)
    const sections = await page.evaluate(() => {
      const root = document.querySelector('.v3');
      if (!root) return [];
      return Array.from(root.children)
        .filter((el) => el.tagName.toLowerCase() !== 'footer' && el.offsetHeight >= 24)
        .map((el, i) => {
          const heading = el.querySelector('h1,h2,h3,h4,.v3-section-sub')?.innerText?.trim() || '';
          const para = el.querySelector('p')?.innerText?.trim() || '';
          const firstSentence = para.split(/(?<=[.?!。])\s/)[0] || '';
          el.setAttribute('data-bake-idx', String(i));
          return { idx: i, heading, firstSentence };
        });
    });
    if (!sections.length) throw new Error(`${grade}: .v3 섹션을 찾지 못했습니다`);

    mkdirSync(`public/demo-naver/${key}`, { recursive: true });
    const blocks = [];
    for (const s of sections) {
      // domToPng — production handleCopyNaverImages와 동일 옵션 (scale 2, 실제 배경색, fixed 제외)
      const dataUrl = await page.evaluate(async (idx) => {
        const node = document.querySelector(`[data-bake-idx="${idx}"]`);
        const bg = getComputedStyle(node).backgroundColor;
        const backgroundColor = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' ? bg : '#ffffff';
        return window.modernScreenshot.domToPng(node, {
          scale: 2,
          backgroundColor,
          filter: (el) => {
            if (el instanceof HTMLElement) {
              if (getComputedStyle(el).position === 'fixed') return false;
              if (el.hasAttribute('data-html2canvas-ignore')) return false;
            }
            return true;
          },
        });
      }, s.idx);
      const png = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
      const jpg = await degrade(png);
      const file = `s${s.idx + 1}.jpg`;
      writeFileSync(`public/demo-naver/${key}/${file}`, jpg);
      const summary = koImg([s.heading, s.firstSentence].filter(Boolean).join(' — ')).slice(0, 140);
      blocks.push({ path: `/demo-naver/${key}/${file}`, summary });
      console.log(`  ${file} (${Math.round(jpg.length / 1024)}KB) ${summary.slice(0, 40)}...`);
    }
    result[grade] = blocks;
    await page.close();
  }

  const ts = `// 자동 생성 — scripts/bake-demo-naver-blocks.mjs (수정하지 말 것)
// 데모 [이미지 복사]용 사전 베이크(열화) 캡처 목록 — public/demo-naver/* 정적 자산 + 캡션.
export interface DemoNaverBlock {
  path: string;    // public 자산 경로 (origin 붙여 절대 URL로 사용)
  summary: string; // 이미지 아래 캡션 (실제 플로우의 summaryOf와 동일 규칙)
}

export const DEMO_NAVER_BLOCKS: Record<string, DemoNaverBlock[]> = ${JSON.stringify(result, null, 2)};

export function getDemoNaverBlocks(grade: string): DemoNaverBlock[] {
  return DEMO_NAVER_BLOCKS[grade] ?? [];
}
`;
  writeFileSync('src/lib/demo/naver-blocks.ts', ts, 'utf8');
  console.log('\n✅ src/lib/demo/naver-blocks.ts 갱신 +', Object.values(result).flat().length, '개 이미지');
} finally {
  await browser.close();
}
