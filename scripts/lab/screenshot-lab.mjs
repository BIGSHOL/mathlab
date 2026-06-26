// 🚧 Lab — /lab 페이지 스크린샷 (시각 점검용, 개발 도구)
//   Chrome MCP 부재 시 Playwright로 로그인→이동→PNG 저장. 세션이 Read(비전)로 품질 점검.
//   사용: LAB_SHOT_PASS=... node scripts/lab/screenshot-lab.mjs <path> <outPng> [scrollText] [--full]
//     예: LAB_SHOT_PASS=*** node scripts/lab/screenshot-lab.mjs "/lab/problems?filter=real" d:/tmp/shot.png "최대공약수"
//   전제: dev 서버 가동(PORT 기본 3200) + SUPER_ADMIN 계정. ⚠️ 비밀번호는 env(LAB_SHOT_PASS)로만 — 하드코딩 금지(시크릿).
import { chromium } from '@playwright/test';

const BASE = process.env.LAB_SHOT_BASE || 'http://localhost:3200';
const USER = process.env.LAB_SHOT_USER || 'st2000423';
const PASS = process.env.LAB_SHOT_PASS;
if (!PASS) { console.error('❌ LAB_SHOT_PASS env 필요(시크릿 — 하드코딩 금지)'); process.exit(2); }

const [, , path = '/lab/problems', out = 'd:/tmp/lab-shot.png', scrollText = '', ...rest] = process.argv;
const full = rest.includes('--full') || process.argv.includes('--full');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
try {
  // 로그인
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('학원에서 부여받은 아이디').fill(USER);
  await page.getByPlaceholder('비밀번호를 입력하세요').fill(PASS);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForLoadState('networkidle').catch(() => {});

  // 대상 페이지
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200); // KaTeX/SVG 렌더 안정화

  if (scrollText) {
    const loc = page.locator(`h2:has-text("${scrollText}")`).first();
    if (await loc.count()) { await loc.scrollIntoViewIfNeeded(); await page.waitForTimeout(500); }
  }

  await page.screenshot({ path: out, fullPage: full && !scrollText });
  console.log(`✅ 스크린샷 저장: ${out}`);
} catch (e) {
  console.error('❌ 스크린샷 실패:', e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
