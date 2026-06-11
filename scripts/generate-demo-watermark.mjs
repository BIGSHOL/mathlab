/**
 * 데모 워터마크 PNG 생성 → scripts/assets/demo-watermark.png
 * (bake-demo-naver-blocks.mjs가 합성에 사용 — 런타임 폰트 의존성 0)
 * 사용: node scripts/generate-demo-watermark.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1240, height: 200 }, deviceScaleFactor: 2 });
await page.setContent(`
<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  .band {
    width: 1200px; margin: 10px auto;
    background: rgba(15, 23, 42, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 4px;
    padding: 26px 30px;
    text-align: center;
    font-family: Pretendard, sans-serif;
    box-sizing: border-box;
  }
  .t1 { color: #fff; font-size: 30px; font-weight: 800; letter-spacing: -0.01em; }
  .t1 .lock { color: #FCA5A5; margin-right: 10px; }
  .t2 { color: rgba(255,255,255,0.75); font-size: 17px; font-weight: 500; margin-top: 9px; }
</style></head>
<body>
  <div class="band" id="band">
    <div class="t1"><span class="lock">&#128274;</span>데모 미리보기 이미지입니다</div>
    <div class="t2">실제 발행용 고화질 이미지는 도입 후 제공됩니다 &middot; 형식 확인용으로만 사용해 주세요</div>
  </div>
</body></html>`);
await page.waitForTimeout(800); // 폰트 로드 대기
const el = page.locator('#band');
const png = await el.screenshot({ omitBackground: true });
await browser.close();

mkdirSync('scripts/assets', { recursive: true });
writeFileSync('scripts/assets/demo-watermark.png', png);
console.log(`✅ scripts/assets/demo-watermark.png (${Math.round(png.length / 1024)}KB)`);
