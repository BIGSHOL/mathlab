/**
 * V3 총평 "섹션 이미지" 생성기 — 네이버 블로그 복사용.
 *
 * 파이프라인: satori(JSX → SVG, 폰트 임베드 X) → @resvg/resvg-js(SVG → PNG, 폰트 파일).
 * 네이버 SmartEditor가 매거진 HTML(div배경/flex/table)을 뭉개는 한계를 이미지로 우회.
 * SEO를 위해 각 이미지 아래 핵심 텍스트를 실제 본문으로 이중첨부(클립보드 빌더가 처리).
 *
 * - 브라우저 불필요(Vercel 친화) — html2canvas는 Tailwind v4 oklch로 깨지므로 미사용.
 * - 폰트: Noto Sans KR(본문) + Noto Serif KR(헤드라인) OTF. resvg는 woff2 미지원 → OTF.
 * - 동시/후속 호출은 module-level Promise 캐시 재사용(차트 ensureFonts 패턴).
 *
 * ⚠️ satori는 KaTeX 렌더 불가 → 이미지 텍스트의 $...$ 는 stripMathForImage()로 평문화.
 */

import { writeFileSync, existsSync, statSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import React from 'react';
import satori from 'satori';
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

/** 이미지용 수식 평문화 — satori는 KaTeX 불가. 간단 $...$ 만 처리(드묾). */
export function stripMathForImage(text: string): string {
  if (!text) return '';
  return text
    .replace(/\$\$?([^$]*)\$\$?/g, '$1')   // $..$ / $$..$$ 래퍼 제거
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
    .replace(/\\times/g, '×').replace(/\\div/g, '÷')
    .replace(/\\leq/g, '≤').replace(/\\geq/g, '≥').replace(/\\neq/g, '≠')
    .replace(/\^\{?2\}?/g, '²').replace(/\^\{?3\}?/g, '³')
    .replace(/\\[a-zA-Z]+/g, '')           // 남은 LaTeX 커맨드 제거
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const SECTION_IMG_WIDTH = 720;

/** satori React 트리 → PNG Buffer (resvg 래스터, 2x 크기) */
export async function renderNodeToPng(node: React.ReactNode, width = SECTION_IMG_WIDTH): Promise<Buffer> {
  const { satoriFonts, fontFiles } = await ensureSectionFonts();
  const svg = await satori(node as React.ReactElement, {
    width,
    // 높이는 콘텐츠에 맞게 satori가 자동 계산 (height 미지정)
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

// ── POC 섹션: 헤드라인 + dek + KPI 바 ──

const C = { ink: '#121212', red: '#BF1722', amber: '#FFA940', green: '#2F7B3A', gray: '#888', cream: '#FFF8E0', line: '#E5E5E5' };

export interface SectionMeta {
  examTitle: string;
  grade: string;
  schoolName: string | null;
  totalQuestions: number;
  totalPoints: number;
}

/** POC — 헤드라인/dek/KPI 섹션 JSX (satori) */
export function HeadlineKpiSection(props: {
  kicker: string;
  headline: string;
  dek: string;
  avgDifficulty: string;   // "2.7"
  killerPct: number;       // 0~100
  essayCount: number;
  totalPoints: number;
}): React.ReactElement {
  const { kicker, headline, dek, avgDifficulty, killerPct, essayCount, totalPoints } = props;
  const kpi = (label: string, value: string, unit: string, color: string, border: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '22px 8px', borderRight: border ? `1px solid #333` : 'none' }}>
      <div style={{ display: 'flex', fontSize: 11, letterSpacing: 1.4, color: '#888', fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <span style={{ fontFamily: 'Noto Serif KR', fontSize: 34, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 13, color: '#888', marginLeft: 2, marginBottom: 3 }}>{unit}</span>
      </div>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: SECTION_IMG_WIDTH, backgroundColor: '#fff', padding: '34px 36px 0' }}>
      <div style={{ display: 'flex', fontSize: 12, letterSpacing: 1.6, color: C.red, fontWeight: 700, marginBottom: 14 }}>
        {stripMathForImage(kicker)}
      </div>
      <div style={{ display: 'flex', fontFamily: 'Noto Serif KR', fontSize: 40, fontWeight: 700, color: C.ink, lineHeight: 1.25, letterSpacing: -1, marginBottom: 18 }}>
        {stripMathForImage(headline)}
      </div>
      <div style={{ display: 'flex', fontSize: 17, color: '#333', lineHeight: 1.7, marginBottom: 26 }}>
        {stripMathForImage(dek)}
      </div>
      <div style={{ display: 'flex', backgroundColor: '#121212', borderRadius: 2 }}>
        {kpi('평균 난이도', avgDifficulty, '/5', C.amber, true)}
        {kpi('킬러 비중', String(killerPct), '%', '#fff', true)}
        {kpi('서술형', String(essayCount), '문항', '#fff', true)}
        {kpi('총 배점', String(totalPoints), '점', C.green, false)}
      </div>
    </div>
  );
}
