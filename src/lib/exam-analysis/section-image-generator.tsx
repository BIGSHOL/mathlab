/**
 * V3 총평 "섹션 이미지" 생성기 (서버 전용) — 네이버 블로그 복사용.
 *
 * 파이프라인: satori(JSX → SVG, 폰트 임베드 X) → @resvg/resvg-js(SVG → PNG, 폰트 파일).
 * 네이버 SmartEditor가 매거진 HTML(div배경/flex/table)을 뭉개는 한계를 이미지로 우회.
 *
 * - 브라우저 불필요(Vercel 친화) — html2canvas는 Tailwind v4 oklch로 깨지므로 미사용.
 * - 폰트: Noto Sans KR(본문) + Noto Serif KR(헤드라인) OTF. resvg는 woff2 미지원 → OTF.
 * - 순수 블록/요약 로직은 section-blocks.ts(클라이언트-세이프)에 분리.
 *
 * ⚠️ satori는 KaTeX 렌더 불가 → 이미지 텍스트는 koImg()로 평문화(+난이도 영문→단계).
 */

import { writeFileSync, existsSync, statSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import React from 'react';
import satori from 'satori';
import { koImg, type SectionMeta, SECTION_IMAGE_VERSION, RENDERABLE_SECTION_KEYS } from './section-blocks';
export { SECTION_IMAGE_VERSION, RENDERABLE_SECTION_KEYS };
export type { SectionMeta };
// Turbopack 네이티브 모듈 정적 import 회피 → 런타임 require (chart-image-generator 패턴)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const getResvg = () => require('@resvg/resvg-js').Resvg as typeof import('@resvg/resvg-js').Resvg;

const SECTION_FONT_DIR = join(tmpdir(), 'mathlab-section-fonts');
const MIN_FONT_SIZE = 100_000;

const SECTION_FONT_SOURCES = [
  { file: 'NotoSansKR-Regular.otf', family: 'Noto Sans KR', weight: 400 as const, style: 'normal' as const,
    url: 'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk/Sans/OTF/Korean/NotoSansCJKkr-Regular.otf' },
  { file: 'NotoSansKR-Bold.otf', family: 'Noto Sans KR', weight: 700 as const, style: 'normal' as const,
    url: 'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk/Sans/OTF/Korean/NotoSansCJKkr-Bold.otf' },
  { file: 'NotoSerifKR-Bold.otf', family: 'Noto Serif KR', weight: 700 as const, style: 'normal' as const,
    url: 'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk/Serif/OTF/Korean/NotoSerifCJKkr-Bold.otf' },
  { file: 'NotoSerifKR-Medium.otf', family: 'Noto Serif KR', weight: 500 as const, style: 'normal' as const,
    url: 'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk/Serif/OTF/Korean/NotoSerifCJKkr-Medium.otf' },
];

type SatoriFont = { name: string; data: Buffer; weight: 400 | 500 | 700; style: 'normal' };

async function downloadFont(url: string, destPath: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < MIN_FONT_SIZE) return false;
    writeFileSync(destPath, buf);
    return true;
  } catch {
    return false;
  }
}

let fontsPromise: Promise<{ satoriFonts: SatoriFont[]; fontFiles: string[] }> | null = null;

async function ensureSectionFonts() {
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => {
    if (!existsSync(SECTION_FONT_DIR)) mkdirSync(SECTION_FONT_DIR, { recursive: true });
    const satoriFonts: SatoriFont[] = [];
    const fontFiles: string[] = [];
    await Promise.all(SECTION_FONT_SOURCES.map(async (src) => {
      const dest = join(SECTION_FONT_DIR, src.file);
      const valid = () => { try { return existsSync(dest) && statSync(dest).size > MIN_FONT_SIZE; } catch { return false; } };
      if (!valid()) await downloadFont(src.url, dest);
      if (valid()) {
        satoriFonts.push({ name: src.family, data: readFileSync(dest), weight: src.weight, style: src.style });
        fontFiles.push(dest);
      }
    }));
    if (satoriFonts.length === 0) { fontsPromise = null; throw new Error('섹션 이미지 폰트 로딩 실패'); }
    return { satoriFonts, fontFiles };
  })();
  return fontsPromise;
}

const SECTION_IMG_WIDTH = 720;

/** satori React 트리 → PNG Buffer (resvg 래스터, 2x 크기) */
export async function renderNodeToPng(node: React.ReactNode, width = SECTION_IMG_WIDTH): Promise<Buffer> {
  const { satoriFonts, fontFiles } = await ensureSectionFonts();
  const svg = await satori(node as React.ReactElement, {
    width,
    fonts: satoriFonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: f.style })),
    embedFont: false, // resvg가 fontFiles로 렌더 (SVG 경량화)
  });
  const Resvg = getResvg();
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width * 2 },
    font: { fontFiles, loadSystemFonts: true, defaultFontFamily: 'Noto Sans KR' },
  });
  return Buffer.from(resvg.render().asPng());
}

// ── 색상 토큰 (V3 NYT 톤) ──
const C = { ink: '#121212', red: '#BF1722', amber: '#FFA940', green: '#2F7B3A' };

function s(v: unknown): string { return typeof v === 'string' ? v : ''; }

// ── 섹션: 인트로 (헤드라인 + dek + KPI 바) ──
function HeadlineKpiSection(props: {
  kicker: string; headline: string; dek: string;
  avgDifficulty: string; killerPct: number; essayCount: number; totalPoints: number;
}): React.ReactElement {
  const { kicker, headline, dek, avgDifficulty, killerPct, essayCount, totalPoints } = props;
  const kpi = (label: string, value: string, unit: string, color: string, border: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '22px 8px', borderRight: border ? '1px solid #333' : 'none' }}>
      <div style={{ display: 'flex', fontSize: 11, letterSpacing: 1.4, color: '#888', fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <span style={{ fontFamily: 'Noto Serif KR', fontSize: 34, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 13, color: '#888', marginLeft: 2, marginBottom: 3 }}>{unit}</span>
      </div>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: SECTION_IMG_WIDTH, backgroundColor: '#fff', padding: '34px 36px 28px' }}>
      <div style={{ display: 'flex', fontSize: 12, letterSpacing: 1.6, color: C.red, fontWeight: 700, marginBottom: 14 }}>{koImg(kicker)}</div>
      <div style={{ display: 'flex', fontFamily: 'Noto Serif KR', fontSize: 40, fontWeight: 700, color: C.ink, lineHeight: 1.25, letterSpacing: -1, marginBottom: 18 }}>{koImg(headline)}</div>
      <div style={{ display: 'flex', fontSize: 17, color: '#333', lineHeight: 1.7, marginBottom: 26 }}>{koImg(dek)}</div>
      <div style={{ display: 'flex', backgroundColor: '#121212', borderRadius: 2 }}>
        {kpi('평균 난이도', avgDifficulty, '/5', C.amber, true)}
        {kpi('킬러 비중', String(killerPct), '%', '#fff', true)}
        {kpi('서술형', String(essayCount), '문항', '#fff', true)}
        {kpi('총 배점', String(totalPoints), '점', C.green, false)}
      </div>
    </div>
  );
}

/** 섹션 key → satori PNG. (section-image 엔드포인트가 호출) */
export async function renderSectionImage(
  key: string,
  c: Record<string, unknown>,
  meta: SectionMeta,
  kpi: { avgDifficulty: string; killerPct: number; essayCount: number },
): Promise<Buffer | null> {
  switch (key) {
    case 'intro':
      return renderNodeToPng(
        HeadlineKpiSection({
          kicker: s(c.blog_kicker) || '시험 분석',
          headline: s(c.blog_headline) || '시험 총평',
          dek: s(c.blog_dek),
          avgDifficulty: kpi.avgDifficulty,
          killerPct: kpi.killerPct,
          essayCount: kpi.essayCount,
          totalPoints: meta.totalPoints,
        }),
      );
    default:
      return null;
  }
}
