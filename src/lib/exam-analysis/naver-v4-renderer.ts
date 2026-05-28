/**
 * 네이버 블로그 V4 렌더러 (V2 article-generator 패턴 — 100% 호환)
 *
 * V4 = 갈수학학원 스타일 (테이블 중심 앱 화면) → 네이버 복사 시 단순 HTML로 변환
 *
 * V2 article-generator의 검증된 규칙 (article-prompt-builders.ts):
 *  - <table>, <p>, <ul>, <li>, <ol>, <blockquote>, <h3>, <div> 사용 금지
 *  - 사용 가능: <h2>, <strong>, <span>, <mark>, <br>, <img>
 *  - 리스트: "• 항목<br>"
 *  - 줄바꿈: 문장 끝 <br>, 문단 사이 <br><br>
 *  - 색상: <span style='color:#XXX'> (작은따옴표)
 *
 * 네이버 SmartEditor가 외부 HTML 받을 때 schema 변환에서 table 손실 → V2 규칙으로 회피.
 *
 * 시안: 사용자 제공 갈수학학원 블로그 스크린샷 (2026-05-28)
 */

import type { CommentaryResult } from './agents/commentary-agent';

export interface NaverV4Meta {
  examTitle: string;
  schoolName: string | null;
  grade: string;
  analyzedAt: string | null;
  /** 학원명 — V4 본문 {학원명} placeholder 치환에 사용. null이면 "우리 학원" 사용. */
  academyName?: string | null;
}

export interface NaverV4ChartUrls {
  difficulty?: string;
  abilityRadar?: string;
  topicBar?: string;
  discrimination?: string;
}

// ── V4 디자인 토큰 (인라인 span background로 사용) ──

const V4_ACCENT = '#8B4513';
const V4_HIGHLIGHT_YELLOW = '#FFF3BF';
const V4_HIGHLIGHT_PINK = '#FFD8D8';
const V4_HIGHLIGHT_ORANGE = '#FFE8CC';
const V4_HIGHLIGHT_GREEN = '#D8F5A2';

// 난이도별 형광펜 배경 (span style background) — 5단계
const V4_DIFF_BG = ['#D8F5A2', '#FFF3BF', '#FFE8CC', '#FFD8D8', '#FFCCCC'];
const V4_DIFF_LABELS = ['기본', '표준', '응용', '심화', '최고난도'];

// ── LaTeX → 유니코드 변환 (네이버 호환, V2 simplifyLatexInline 차용) ──

const SUPER_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵',
  '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '=': '⁼', 'n': 'ⁿ',
};
const SUB_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅',
  '6': '₆', '7': '₇', '8': '₈', '9': '₉', 'n': 'ₙ', 'k': 'ₖ', 'i': 'ᵢ', 'j': 'ⱼ',
};

function toSuperscript(s: string): string | null {
  let out = '';
  for (const ch of s) {
    if (SUPER_MAP[ch] != null) out += SUPER_MAP[ch];
    else return null;
  }
  return out;
}

function toSubscript(s: string): string | null {
  let out = '';
  for (const ch of s) {
    if (SUB_MAP[ch] != null) out += SUB_MAP[ch];
    else return null;
  }
  return out;
}

/** $...$ 안 LaTeX를 유니코드/플레인 텍스트로. 네이버 KaTeX 미렌더링 회피. */
function stripLatexForNaver(text: string): string {
  if (!text) return text;
  // 1. $...$ 패턴 내부 LaTeX 변환
  let out = text.replace(/\$([^$\n]+?)\$/g, (_m, tex: string) => {
    let s = tex;
    s = s.replace(/\\sqrt\s*\{([^{}]+)\}/g, '√($1)');
    s = s.replace(/\\sqrt\s+(\w)/g, '√$1');
    s = s.replace(/\\d?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1/$2');
    s = s.replace(/\\le\b/g, '≤').replace(/\\ge\b/g, '≥').replace(/\\ne\b/g, '≠');
    s = s.replace(/\\leq\b/g, '≤').replace(/\\geq\b/g, '≥').replace(/\\neq\b/g, '≠');
    s = s.replace(/\\times\b/g, '×').replace(/\\cdot\b/g, '·').replace(/\\div\b/g, '÷');
    s = s.replace(/\\pm\b/g, '±').replace(/\\mp\b/g, '∓').replace(/\\infty\b/g, '∞');
    s = s.replace(/\\pi\b/g, 'π').replace(/\\theta\b/g, 'θ').replace(/\\sigma\b/g, 'σ')
      .replace(/\\alpha\b/g, 'α').replace(/\\beta\b/g, 'β').replace(/\\gamma\b/g, 'γ');
    s = s.replace(/\^\{([^{}]+)\}/g, (_, exp) => toSuperscript(exp) ?? `^${exp}`);
    s = s.replace(/\^([0-9+\-=n])/g, (_, exp) => toSuperscript(exp) ?? `^${exp}`);
    s = s.replace(/_\{([^{}]+)\}/g, (_, sub) => toSubscript(sub) ?? `_${sub}`);
    s = s.replace(/_([0-9nkij])/g, (_, sub) => toSubscript(sub) ?? `_${sub}`);
    s = s.replace(/\\\\/g, '');
    // 잔여 백슬래시 명령
    s = s.replace(/\\([a-zA-Z]+)/g, '$1');
    // 중괄호 제거
    s = s.replace(/[{}]/g, '');
    return s.trim();
  });
  // 2. 남은 raw $ 제거 (안전망)
  out = out.replace(/\$/g, '');
  return out;
}

// ── 학원명 치환 (V4 본문 {학원명} placeholder 또는 기존 분석본의 학원명 잔여 처리) ──
// 사용자 요청 (2026-05-28): "갈수학학원" 같은 특정 학원명 노출 금지.
// 모듈 레벨 상태 — buildNaverV4Html 진입 시 setAcademyReplacement()로 설정.
let _academyReplacement = '우리 학원';

function setAcademyReplacement(name: string | null | undefined): void {
  _academyReplacement = name?.trim() || '우리 학원';
}

function stripAcademyNames(text: string): string {
  if (!text) return text;
  let out = text;
  // 1. AI prompt placeholder
  out = out.replace(/\{학원명\}/g, _academyReplacement);
  // 2. 벤치마크 누출 학원명 (강제 치환)
  out = out.replace(/갈수학학원/g, _academyReplacement);
  out = out.replace(/갈수학(?!학원)/g, _academyReplacement);
  return out;
}

// ── 유틸 ──

function escapeHtml(s: string): string {
  // 입력 텍스트에 LaTeX/$ 가 있어도 사용자 화면에서 안 보이도록 사전 처리
  // + 학원명 placeholder/잔여를 tenant 이름 또는 "우리 학원"으로 치환
  const sanitized = stripAcademyNames(stripLatexForNaver(joinKoreanCounters(String(s ?? ''))));
  return sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** **bold** → <strong> (네이버 호환). LaTeX/학원명 자동 변환됨 (escapeHtml에서). */
function md(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/** 한국어 수사+의존명사 NBSP 묶기 */
function joinKoreanCounters(text: string): string {
  if (!text) return text;
  const NBSP = ' ';
  return text
    .replace(
      /(한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|첫|단|매)\s+(개|명|사람|곳|분|번|줄|문항|점|가지|칸|쪽|마디|학기|과목)/g,
      `$1${NBSP}$2`,
    )
    .replace(
      /(\d+)\s+(개|명|곳|분|번|줄|문항|점|가지|월|일|년|등급|학년|학기)/g,
      `$1${NBSP}$2`,
    );
}

// ── 메인 빌더 ──

export function buildNaverV4Html(args: {
  commentary: CommentaryResult;
  meta: NaverV4Meta;
  chartUrls?: NaverV4ChartUrls;
}): string {
  const { commentary, meta, chartUrls } = args;
  // 학원명 치환 기준 설정 — tenant 이름 있으면 사용, 없으면 "우리 학원"
  setAcademyReplacement(meta.academyName);
  const c = commentary;
  const parts: string[] = [];

  // ① 헤더 (학원/시험명) — h2 + strong + br
  parts.push(renderHeader(c, meta));

  // ② 들어가며
  if (c.v4_intro) {
    parts.push(renderH2('들어가며'));
    parts.push(`<span style='font-size: 16px;'>${md(c.v4_intro)}</span><br><br>`);
  }

  // ③ 시험 개요 + 1등급 컷
  if (c.v4_exam_overview) {
    parts.push(renderH2('시험 개요 및 1등급 컷 예상'));
    parts.push(renderExamOverview(c.v4_exam_overview));
  }

  // ④ 학원 차별화 전략
  if (c.v4_academy_strategy && c.v4_academy_strategy.length > 0) {
    parts.push(renderH2(`1등급 수학을 위한 학원 차별화 전략 (${c.v4_academy_strategy.length}가지)`));
    parts.push(renderAcademyStrategy(c.v4_academy_strategy));
  }

  // ⑤ 문제 번호별 난이도 / 출제 단원 (text list로)
  if (c.v4_difficulty_rows && c.v4_difficulty_rows.length > 0) {
    parts.push(renderH2(`문제 난이도 · 출제 단원 (${c.v4_difficulty_rows.length}문항)`));
    parts.push(renderDifficultyList(c.v4_difficulty_rows));
  }

  // ⑥ 출제 특징 요약
  if (c.v4_exam_features) {
    parts.push(renderH2('출제 특징 요약'));
    parts.push(renderExamFeatures(c.v4_exam_features));
  }

  // ⑦ 출제 핵심 포인트 (영역별)
  if (c.v4_main_analysis && c.v4_main_analysis.length > 0) {
    parts.push(renderH2('출제 핵심 포인트'));
    parts.push(renderMainAnalysis(c.v4_main_analysis));
  }

  // ⑧ 이전 시험과의 비교 · 대조
  if (c.v4_previous_comparison) {
    parts.push(renderH2('이전 시험과의 비교 · 대조'));
    parts.push(renderPreviousComparison(c.v4_previous_comparison));
  }

  // ⑨ 주요 문항 분석 (킬러 문항)
  if (c.v4_key_questions && c.v4_key_questions.length > 0) {
    parts.push(renderH2(`주요 문항 분석 (킬러 ${c.v4_key_questions.length}문항)`));
    parts.push(renderKeyQuestions(c.v4_key_questions));
  }

  // ⑩ 차트 (인포그래픽)
  if (chartUrls && Object.values(chartUrls).some((v) => !!v)) {
    parts.push(renderH2('시각 분석'));
    parts.push(renderCharts(chartUrls));
  }

  // ⑪ 이번 시험 단원별 피드백 (사용자 요청 2026-05-28: '다음 시험 대비'에서 변경 — 모호함 해소)
  if (c.v4_final_strategy && c.v4_final_strategy.length > 0) {
    parts.push(renderH2('이번 시험 단원별 피드백'));
    parts.push(renderFinalStrategy(c.v4_final_strategy));
  }

  // 푸터
  parts.push(renderFooter(meta));

  return parts.filter(Boolean).join('\n');
}

// ── 블록 렌더러 (모두 단순 HTML) ──

function renderH2(title: string): string {
  // V2 패턴: <h2> + 인라인 style. 작은따옴표 사용 (JSON 호환 + V2와 일치)
  // ✏ 펜 아이콘 + 갈수학 스타일 (border-left + padding)
  return `<h2 style='font-size: 21px; font-weight: 800; color: #1A1A1A; border-left: 5px solid ${V4_ACCENT}; padding: 4px 0 4px 12px; margin: 36px 0 16px;'>✏ ${escapeHtml(title)}</h2>`;
}

function renderHeader(c: CommentaryResult, meta: NaverV4Meta): string {
  const title = c.v4_exam_overview?.title || meta.examTitle;
  const grade = c.v4_exam_overview?.grade || meta.grade;
  const school = c.v4_exam_overview?.school || meta.schoolName;
  const oneLiner = c.v4_exam_overview?.one_liner;

  const out: string[] = [];
  const schoolGrade = [school, grade].filter(Boolean).join(' · ');
  if (schoolGrade) {
    out.push(`<span style='font-size: 12px; color: ${V4_ACCENT}; font-weight: 700; letter-spacing: 0.12em;'>${escapeHtml(schoolGrade)}</span><br>`);
  }
  out.push(`<strong style='font-size: 26px; color: #1A1A1A;'>${escapeHtml(title)}</strong><br><br>`);
  if (oneLiner) {
    out.push(`<span style='font-size: 15px; color: #555;'>${md(oneLiner)}</span><br>`);
  }
  return out.join('');
}

function renderExamOverview(o: NonNullable<CommentaryResult['v4_exam_overview']>): string {
  // 갈수학 스타일: 단순 라벨 + 값 + <br> (테이블 사용 X — 네이버 호환).
  // 한 줄 요약은 별도 강조 박스로 처리.
  const lines: Array<[string, string]> = [
    ['📘 시험명', o.title],
    ['🏫 학년 · 학교', o.school ? `${o.grade} · ${o.school}` : o.grade],
    ['📝 문항 · 만점', `${o.total_questions}문항 · ${o.total_points}점`],
    ['📚 출제 범위', o.range],
    ['📊 전체 난이도', o.avg_difficulty_label],
    ['⚡ 최고 난이도', o.peak_difficulty],
  ];
  if (o.essay_summary) lines.push(['✍ 서술형', o.essay_summary]);
  if (o.expected_grade_cut) lines.push(['🎯 예상 등급 컷', o.expected_grade_cut]);

  const overview = lines
    .map(
      ([label, value]) =>
        `<strong style='color: ${V4_ACCENT}; font-size: 15px;'>${escapeHtml(label)}</strong> <span style='font-size: 15px;'>${md(value)}</span><br>`,
    )
    .join('');

  // 한 줄 요약은 mark 강조 박스로
  const summary = `<br><mark style='background: ${V4_HIGHLIGHT_YELLOW}; padding: 4px 8px; font-size: 15px;'><strong>💡 한 줄 요약 ▸</strong> ${md(o.one_liner)}</mark><br><br>`;

  return overview + summary;
}

function renderAcademyStrategy(items: NonNullable<CommentaryResult['v4_academy_strategy']>): string {
  // 번호별 강조 + mark 형광펜 (갈수학 학원 차별화 포인트 스타일)
  return items
    .map(
      (item, i) => {
        const num = i + 1;
        const bg = i % 2 === 0 ? V4_HIGHLIGHT_YELLOW : V4_HIGHLIGHT_GREEN;
        return (
          `<mark style='background: ${bg}; padding: 3px 8px; font-size: 17px;'><strong style='color: ${V4_ACCENT};'>${num}. ${escapeHtml(item.title)}</strong></mark><br><br>` +
          `<span style='font-size: 15px;'>${md(item.body)}</span><br><br>`
        );
      },
    )
    .join('');
}

function renderDifficultyList(rows: NonNullable<CommentaryResult['v4_difficulty_rows']>): string {
  // 사용자 요청 (2026-05-28): 단순 텍스트 list → 표로 묶기.
  // 1-level <table>은 네이버 SmartEditor에서 정상 표시 (갈수학 블로그와 동일 패턴).
  const sorted = [...rows].sort((a, b) => {
    const aIsEssay = String(a.question_number).startsWith('서술');
    const bIsEssay = String(b.question_number).startsWith('서술');
    if (aIsEssay && !bIsEssay) return 1;
    if (!aIsEssay && bIsEssay) return -1;
    const aNum = parseInt(String(a.question_number), 10) || 0;
    const bNum = parseInt(String(b.question_number), 10) || 0;
    return aNum - bNum;
  });

  // 헤더 행 — 번호 컬럼 너비 70px ("서술형1" 한 줄 표시) + 난이도/배점 살짝 축소 → 단원 컬럼 보존
  const headerRow = `<tr bgcolor="#F8F8F8">` +
    `<th style="padding: 8px 10px; font-size: 12px; font-weight: 700; color: #555; text-align: left; border-bottom: 2px solid #DDD; width: 70px;">번호</th>` +
    `<th style="padding: 8px 10px; font-size: 12px; font-weight: 700; color: #555; text-align: left; border-bottom: 2px solid #DDD;">단원 · 핵심 개념</th>` +
    `<th style="padding: 8px 10px; font-size: 12px; font-weight: 700; color: #555; text-align: left; border-bottom: 2px solid #DDD; width: 100px;">난이도</th>` +
    `<th style="padding: 8px 10px; font-size: 12px; font-weight: 700; color: #555; text-align: right; border-bottom: 2px solid #DDD; width: 55px;">배점</th>` +
    `</tr>`;

  // 데이터 행 (난이도별 행 배경 색상 — bgcolor 속성)
  const dataRows = sorted
    .map((row) => {
      const lv = Number(row.difficulty);
      const validLv = lv >= 1 && lv <= 5 ? lv : 3;
      const bg = V4_DIFF_BG[validLv - 1];
      const diffLabel = V4_DIFF_LABELS[validLv - 1];
      const numStr = String(row.question_number);
      const topic = escapeHtml(row.topic);
      const subTopicLine = row.analysis_short
        ? `<br><span style='font-size: 12px; color: #666;'>↳ ${escapeHtml(row.analysis_short)}</span>`
        : '';

      return `<tr bgcolor="${bg}">` +
        `<td style="padding: 8px 10px; font-size: 14px; font-weight: 700; color: #1A1A1A; border-bottom: 1px solid rgba(0,0,0,0.05); vertical-align: top; white-space: nowrap;">${escapeHtml(numStr)}</td>` +
        `<td style="padding: 8px 10px; font-size: 13px; color: #2A2A2A; border-bottom: 1px solid rgba(0,0,0,0.05); vertical-align: top; word-break: keep-all;">${topic}${subTopicLine}</td>` +
        `<td style="padding: 8px 10px; font-size: 13px; font-weight: 600; color: #1A1A1A; border-bottom: 1px solid rgba(0,0,0,0.05); vertical-align: top; white-space: nowrap;">Lv${validLv} <span style='color: #888; font-size: 12px; font-weight: 400;'>${diffLabel}</span></td>` +
        `<td style="padding: 8px 10px; font-size: 14px; font-weight: 700; color: #1A1A1A; text-align: right; border-bottom: 1px solid rgba(0,0,0,0.05); vertical-align: top; white-space: nowrap;">${row.points}점</td>` +
        `</tr>`;
    })
    .join('');

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #DDD;">` +
    headerRow +
    dataRows +
    `</table><br>`;
}

function renderExamFeatures(f: NonNullable<CommentaryResult['v4_exam_features']>): string {
  // 출제 특징 헤드라인 — 노란 형광펜 + 큰 글씨
  return (
    `<mark style='background: ${V4_HIGHLIGHT_YELLOW}; padding: 4px 10px; font-size: 18px;'><strong>💡 ${md(f.headline)}</strong></mark><br><br>` +
    `<span style='font-size: 15px;'>${md(f.body)}</span><br><br>`
  );
}

function renderMainAnalysis(items: NonNullable<CommentaryResult['v4_main_analysis']>): string {
  // 영역별 헤드라인 (◆ 마커 + accent 색상) + 본문
  return items
    .map(
      (item) =>
        `<strong style='font-size: 17px; color: ${V4_ACCENT};'>◆ ${escapeHtml(item.heading)}</strong><br>` +
        `<span style='font-size: 15px;'>${md(item.body)}</span><br><br>`,
    )
    .join('');
}

function renderPreviousComparison(c: NonNullable<CommentaryResult['v4_previous_comparison']>): string {
  // 이전 시험 비교 — 핑크 형광펜 + 큰 글씨
  return (
    `<mark style='background: ${V4_HIGHLIGHT_PINK}; padding: 4px 10px; font-size: 18px;'><strong>📊 ${md(c.headline)}</strong></mark><br><br>` +
    `<span style='font-size: 15px;'>${md(c.body)}</span><br><br>`
  );
}

function renderKeyQuestions(items: NonNullable<CommentaryResult['v4_key_questions']>): string {
  // 킬러 문항 — ⚡ 아이콘 + 강조 배경 + 본문 (title과 body 빈 줄 없이 붙여 표시 — 갈수학 스타일)
  return items
    .map(
      (kq) =>
        `<mark style='background: ${V4_HIGHLIGHT_ORANGE}; padding: 3px 8px; font-size: 17px;'><strong>⚡ ${escapeHtml(kq.title)}</strong></mark><br>` +
        `<span style='font-size: 15px;'>${md(kq.body)}</span><br><br>`,
    )
    .join('');
}

function renderFinalStrategy(rows: NonNullable<CommentaryResult['v4_final_strategy']>): string {
  // 영역별: ▸ 마커 + accent 영역명 + 현재/액션 라벨 강조
  // mark 라벨은 본문보다 확실히 크게(18px) — 다른 헤드라인 mark와 동일 사이즈
  return rows
    .map(
      (row) =>
        `<strong style='font-size: 17px; color: ${V4_ACCENT};'>▸ ${escapeHtml(row.area)}</strong><br>` +
        `<mark style='background: ${V4_HIGHLIGHT_PINK}; padding: 4px 10px; font-size: 18px;'><strong>현재 상태</strong></mark> <span style='font-size: 15px;'>${md(row.current_status)}</span><br>` +
        `<mark style='background: ${V4_HIGHLIGHT_GREEN}; padding: 4px 10px; font-size: 18px;'><strong>실행 액션</strong></mark> <span style='font-size: 15px;'>${md(row.action)}</span><br><br>`,
    )
    .join('');
}

function renderCharts(chartUrls: NaverV4ChartUrls): string {
  const items: Array<[string, string]> = [];
  if (chartUrls.difficulty) items.push(['난이도 분포', chartUrls.difficulty]);
  if (chartUrls.abilityRadar) items.push(['능력 영역 레이더', chartUrls.abilityRadar]);
  if (chartUrls.topicBar) items.push(['단원별 출제', chartUrls.topicBar]);
  if (chartUrls.discrimination) items.push(['변별력', chartUrls.discrimination]);

  if (items.length === 0) return '';

  // V2 패턴: <img> + 캡션 span + <br>
  return items
    .map(
      ([label, url]) =>
        `<img src='${url}' alt='${escapeHtml(label)}' style='max-width: 100%; height: auto;' /><br>` +
        `<span style='font-size: 13px; color: #64748B; text-align: center; display: block;'>▲ ${escapeHtml(label)}</span><br><br>`,
    )
    .join('');
}

function renderFooter(meta: NaverV4Meta): string {
  const date = meta.analyzedAt ? new Date(meta.analyzedAt).toLocaleDateString('ko-KR') : '';
  return (
    `<br><span style='font-size: 11px; color: #888;'>MathLab 분석 · ${escapeHtml(meta.examTitle)}${date ? ` · ${escapeHtml(date)}` : ''}</span><br>`
  );
}

// 외부에서 가져다 쓰지 않지만 export 유지 (legacy 호환)
export { V4_ACCENT, V4_HIGHLIGHT_YELLOW, V4_HIGHLIGHT_PINK, V4_HIGHLIGHT_ORANGE, V4_HIGHLIGHT_GREEN };
