/**
 * 네이버 블로그 V3 렌더러 (Q&A 인터뷰형 + table HTML)
 *
 * 입력: CommentaryResult + 차트 PNG URL + 메타 + 문항 배열
 * 출력: 네이버 블로그 본문에 그대로 붙여넣을 수 있는 HTML 문자열
 *
 * 절대 규칙 (handoff-exam-analysis-v3/prepare-for-naver-spec.md):
 *  - <table> + 인라인 style만 사용
 *  - 폭 720px 고정
 *  - flex/grid/li/h2 금지
 *  - 모든 컨테이너 word-break: keep-all
 *  - 폰트 폴백 명시
 *
 * 시안: data/handoff-exam-analysis-v3/exam-analysis-blog-naver-hifi.html (V3 섹션)
 * Phase 0: scripts/generate-v3-preview-html.ts::buildNaverBlogHtml 의 1:1 이식
 */

import type { CommentaryResult } from './agents/commentary-agent';
import type { AnalyzedQuestion } from './types';

export interface NaverV3ChartUrls {
  /** CDN/공개 URL (네이버는 외부 이미지 호스팅 필요) */
  difficulty?: string;
  abilityRadar?: string;
  topicBar?: string;
  discrimination?: string;
}

export interface NaverV3Meta {
  examTitle: string;
  schoolName: string | null;
  grade: string;
  analyzedAt: string | null;
}

// ── 유틸 ──

/**
 * HTML escape + 한국어 수사+의존명사 nbsp 자동 묶기.
 * 모든 사용자 노출 텍스트가 자동으로 줄바꿈 개선 처리됨.
 */
function escapeHtml(s: string): string {
  return joinKoreanCounters(String(s ?? ''))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** **bold** → <strong> (네이버 호환, 색만). escapeHtml에서 이미 nbsp 처리됨 */
function markdownToInlineBold(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong style="color:#121212;font-weight:700;">$1</strong>');
}

function normDiff(raw: string): string {
  const map: Record<string, string> = { concept: '1', pattern: '2', reasoning: '4', creative: '5' };
  return map[raw] || raw;
}

/**
 * 한국어 수사+의존명사를 non-breaking space로 묶기 — 줄바꿈 개선.
 * "단 한 개도 없다" → "단 한 개도 없다" → 줄 끝에서 "한 개도"가 한 단위로 묶임.
 */
function joinKoreanCounters(text: string): string {
  if (!text) return text;
  const NBSP = ' ';
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

/**
 * DATA 박스 라벨 압축 — AI가 "기본 (Level 1)" 같이 영문+숫자 섞어 출력하면 네이버에서
 * 한 글자씩 세로 분리됨. "기본·Lv1" 형태로 압축해 1줄로 표시.
 */
function shortenDataLabel(raw: string): string {
  return String(raw ?? '')
    .replace(/\s*\(Level\s+(\d+)\)\s*/gi, '·Lv$1')
    .replace(/\s*\(Lv\s*(\d+)\)\s*/gi, '·Lv$1')
    .replace(/^Level\s+(\d+)\s*/i, 'Lv$1 ')
    .replace(/\s+/g, ' ')
    .trim();
}

const V3_DIFF_COLORS = ['#2F7B3A', '#6F9C76', '#888', '#DA8B2C', '#BF1722'];
const V3_DIFF_LABELS = ['기본', '표준', '응용', '심화', '최고난도'];

// ── LaTeX → 유니코드 변환 (네이버 KaTeX 미렌더링 회피, naver-v4-renderer 차용) ──

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
  for (const ch of s) { if (SUPER_MAP[ch] != null) out += SUPER_MAP[ch]; else return null; }
  return out;
}
function toSubscript(s: string): string | null {
  let out = '';
  for (const ch of s) { if (SUB_MAP[ch] != null) out += SUB_MAP[ch]; else return null; }
  return out;
}
/** $...$ 안 LaTeX를 유니코드/플레인으로. 네이버 raw $ 노출 방지. */
function stripLatexForNaver(text: string): string {
  if (!text) return text;
  let out = text.replace(/\$([^$\n]+?)\$/g, (_m, tex: string) => {
    let s = tex;
    s = s.replace(/\\sqrt\s*\{([^{}]+)\}/g, '√($1)').replace(/\\sqrt\s+(\w)/g, '√$1');
    s = s.replace(/\\d?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1/$2');
    s = s.replace(/\\le(?:q)?\b/g, '≤').replace(/\\ge(?:q)?\b/g, '≥').replace(/\\ne(?:q)?\b/g, '≠');
    s = s.replace(/\\times\b/g, '×').replace(/\\cdot\b/g, '·').replace(/\\div\b/g, '÷');
    s = s.replace(/\\pm\b/g, '±').replace(/\\infty\b/g, '∞').replace(/\\pi\b/g, 'π')
      .replace(/\\theta\b/g, 'θ').replace(/\\alpha\b/g, 'α').replace(/\\beta\b/g, 'β');
    s = s.replace(/\^\{([^{}]+)\}/g, (_, e) => toSuperscript(e) ?? `^${e}`);
    s = s.replace(/\^([0-9+\-=n])/g, (_, e) => toSuperscript(e) ?? `^${e}`);
    s = s.replace(/_\{([^{}]+)\}/g, (_, u) => toSubscript(u) ?? `_${u}`);
    s = s.replace(/_([0-9nkij])/g, (_, u) => toSubscript(u) ?? `_${u}`);
    s = s.replace(/\\\\/g, '').replace(/\\([a-zA-Z]+)/g, '$1').replace(/[{}]/g, '');
    return s.trim();
  });
  out = out.replace(/\$/g, '');
  return out;
}
/** LaTeX strip + **bold** → <strong> (V3 강화 신규 섹션 본문용) */
function mdLatex(text: string): string {
  return markdownToInlineBold(stripLatexForNaver(String(text ?? '')));
}

// ── 메인 빌더 ──

export function buildNaverV3Html(args: {
  commentary: CommentaryResult;
  chartUrls?: NaverV3ChartUrls;
  meta: NaverV3Meta;
  questions: AnalyzedQuestion[];
}): string {
  const { commentary, chartUrls, meta, questions } = args;
  const parts: string[] = [];

  parts.push(renderHeader(commentary, meta));
  parts.push(renderKpiRow(questions, meta));

  if (commentary.feature_callout) {
    parts.push(renderFeatureCallout(commentary.feature_callout));
  }

  // 인포그래픽 2종 (난이도 stacked + 형식 분포) — 시안 검증
  parts.push(renderDifficultyStackedBar(questions));
  parts.push(renderFormatBreakdown(questions));

  // 문항별 난이도·단원 표 (V3 강화 — V4 흡수)
  if (commentary.v4_difficulty_rows?.length) {
    parts.push(renderQTable(commentary.v4_difficulty_rows));
  }

  // 이전 시험 비교 콜아웃 (V3 강화 — 비교 데이터 있을 때만)
  if (commentary.v4_previous_comparison?.headline) {
    parts.push(renderPreviousComparison(commentary.v4_previous_comparison));
  }

  // Q&A 섹션들
  if (commentary.blog_qa?.length) {
    commentary.blog_qa.forEach((qa, idx) => {
      parts.push(renderQABlock(qa, idx + 1));
    });
  }

  // 영역별 출제 분석 (V3 강화 — V4 흡수)
  if (commentary.v4_main_analysis?.length) {
    parts.push(renderMainAnalysis(commentary.v4_main_analysis));
  }

  // 주요 문항 해설 (V3 강화 — V4 흡수)
  if (commentary.v4_key_questions?.length) {
    parts.push(renderKeyQuestions(commentary.v4_key_questions));
  }

  // 인용구
  if (commentary.pull_quote) {
    parts.push(renderPullQuote(commentary.pull_quote));
  }

  // 차트 PNG (URL 있을 때만)
  if (chartUrls) {
    parts.push(renderCharts(chartUrls));
  }

  // 이번 시험 단원별 피드백 (V3 강화 — V4 흡수)
  if (commentary.v4_final_strategy?.length) {
    parts.push(renderFinalStrategy(commentary.v4_final_strategy));
  }

  // 결론
  if (commentary.conclusion) {
    parts.push(renderConclusion(commentary.conclusion));
  }

  parts.push(renderFooter(meta));

  return parts.filter(Boolean).join('\n\n');
}

// ── 블록 렌더러 ──

function renderHeader(commentary: CommentaryResult, meta: NaverV3Meta): string {
  const kicker = commentary.blog_kicker
    || (meta.schoolName ? `시험 분석 · ${meta.schoolName}` : `시험 분석 · ${meta.examTitle}`);
  const headline = commentary.blog_headline || meta.examTitle;
  const dek = commentary.blog_dek || '';
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
  <tr><td style="padding:0;">
    <p style="margin:0 0 8px;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.16em;color:#BF1722;font-weight:800;">${escapeHtml(kicker)}</p>
    <p style="margin:0 0 10px;font-family:'Noto Serif KR',serif;font-size:30px;font-weight:700;line-height:1.2;color:#121212;letter-spacing:-0.01em;word-break:keep-all;">${escapeHtml(headline)}</p>
    ${dek ? `<p style="margin:0;font-family:'Noto Serif KR',serif;font-size:14px;line-height:1.6;color:#666;word-break:keep-all;">${escapeHtml(dek)}</p>` : ''}
  </td></tr>
</table>`;
}

function renderKpiRow(questions: AnalyzedQuestion[], meta: NaverV3Meta): string {
  const counts = [0, 0, 0, 0, 0];
  for (const q of questions) {
    const lv = Number(normDiff(String(q.difficulty)));
    if (lv >= 1 && lv <= 5) counts[lv - 1]++;
  }
  const totalDiff = counts.reduce((s, c) => s + c, 0);
  const weighted = totalDiff > 0 ? counts.reduce((s, c, i) => s + c * (i + 1), 0) / totalDiff : 0;
  const killerPct = totalDiff > 0 ? Math.round((counts[4] / totalDiff) * 100) : 0;
  const essayCount = questions.filter((q) => q.question_format === 'essay').length;
  const totalPts = questions.reduce((s, q) => s + (q.points || 0), 0);
  void meta;
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#121212;margin:0 0 32px;">
  <tr>
    <td align="center" style="padding:20px 8px;border-right:1px solid #333;">
      <p style="margin:0 0 4px;font-family:Pretendard,sans-serif;font-size:10px;letter-spacing:0.14em;color:#888;font-weight:700;">평균 난이도</p>
      <p style="margin:0;font-family:'Abril Fatface','Bodoni Moda',serif;font-size:28px;font-weight:900;color:#FFA940;line-height:1;">${weighted.toFixed(1)}<span style="font-size:14px;color:#888;">/5</span></p>
    </td>
    <td align="center" style="padding:20px 8px;border-right:1px solid #333;">
      <p style="margin:0 0 4px;font-family:Pretendard,sans-serif;font-size:10px;letter-spacing:0.14em;color:#888;font-weight:700;">킬러 비중</p>
      <p style="margin:0;font-family:'Abril Fatface','Bodoni Moda',serif;font-size:28px;font-weight:900;color:#fff;line-height:1;">${killerPct}<span style="font-size:14px;color:#BF1722;">%</span></p>
    </td>
    <td align="center" style="padding:20px 8px;border-right:1px solid #333;">
      <p style="margin:0 0 4px;font-family:Pretendard,sans-serif;font-size:10px;letter-spacing:0.14em;color:#888;font-weight:700;">서술형</p>
      <p style="margin:0;font-family:'Abril Fatface','Bodoni Moda',serif;font-size:28px;font-weight:900;color:#fff;line-height:1;">${essayCount}<span style="font-size:14px;color:#888;">문항</span></p>
    </td>
    <td align="center" style="padding:20px 8px;">
      <p style="margin:0 0 4px;font-family:Pretendard,sans-serif;font-size:10px;letter-spacing:0.14em;color:#888;font-weight:700;">총 배점</p>
      <p style="margin:0;font-family:'Abril Fatface','Bodoni Moda',serif;font-size:28px;font-weight:900;color:#2F7B3A;line-height:1;">${totalPts}<span style="font-size:14px;color:#888;">점</span></p>
    </td>
  </tr>
</table>`;
}

function renderFeatureCallout(fc: NonNullable<CommentaryResult['feature_callout']>): string {
  const body = Array.isArray(fc.body) ? fc.body : fc.body ? [fc.body] : [];
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;">
  <tr>
    <td align="center" style="padding:36px 20px;background:#fafafa;border:1px solid #ddd;">
      <p style="margin:0;font-family:'Abril Fatface','Bodoni Moda',serif;font-size:96px;font-weight:900;line-height:1;color:#BF1722;letter-spacing:-0.04em;">${escapeHtml(fc.big_number)}${fc.big_number_unit ? `<span style="font-size:40px;color:#888;">${escapeHtml(fc.big_number_unit)}</span>` : ''}</p>
      <p style="margin:8px 0 0;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.16em;color:#888;font-weight:700;">${escapeHtml(fc.big_number_label)}</p>
      <p style="margin:18px 0 0;font-family:'Noto Serif KR',serif;font-size:18px;font-weight:700;color:#121212;line-height:1.4;max-width:520px;word-break:keep-all;">${escapeHtml(fc.title)}</p>
      ${body.map((p) => `<p style="margin:10px 0 0;font-family:'Noto Serif KR',serif;font-size:14px;color:#444;line-height:1.7;max-width:520px;word-break:keep-all;">${markdownToInlineBold(p)}</p>`).join('')}
    </td>
  </tr>
</table>`;
}

// 5카드 가로 배치 패턴으로 전환하면서 NAVER_BAR_WIDTH 사용 안 함 (inline-block span px 너비가 네이버에서 제거됨)
// td bgcolor + width% 패턴은 콘텐츠 풍부한 카드(형식 분포 패턴)에만 적용

function renderDifficultyStackedBar(questions: AnalyzedQuestion[]): string {
  const stats = [1, 2, 3, 4, 5].map((lv) => {
    const lvQ = questions.filter((q) => normDiff(String(q.difficulty)) === String(lv));
    return {
      level: lv,
      label: V3_DIFF_LABELS[lv - 1],
      count: lvQ.length,
      points: lvQ.reduce((s, q) => s + (q.points || 0), 0),
      color: V3_DIFF_COLORS[lv - 1],
    };
  });
  const totalPts = stats.reduce((s, x) => s + x.points, 0);
  if (totalPts === 0) return '';
  const totalCount = stats.reduce((s, x) => s + x.count, 0);

  // 사용자 피드백 (2026-05-27): td bgcolor grid는 네이버에서 width%가 무시되어 cell들이
  // 자기 콘텐츠 너비로 줄어들고 줄바꿈됨. 대신 형식 분포 카드 패턴(검증)으로 5카드 가로 배치.
  // 각 카드 안에 콘텐츠가 가득 차면 width="N%"가 보존됨.

  const cards = stats.map((s) => `
    <td width="19%" align="center" valign="top" style="padding:14px 4px;background:#fff;border:1px solid #eee;border-top:3px solid ${s.color};">
      <p style="margin:0;font-family:Pretendard,sans-serif;font-size:10px;letter-spacing:0.06em;color:#666;font-weight:700;white-space:nowrap;">Lv ${s.level} · ${s.label}</p>
      <p style="margin:8px 0 2px;font-family:'Abril Fatface','Bodoni Moda',serif;font-size:30px;font-weight:900;color:${s.color};line-height:1;">${s.count}<span style="font-size:12px;color:#888;font-weight:400;">문항</span></p>
      <p style="margin:0;font-family:Pretendard,sans-serif;font-size:12px;color:#444;font-weight:600;">${s.points}점</p>
    </td>`).join('<td width="1%">&nbsp;</td>');

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;background:#fafafa;border:1px solid #ddd;">
  <tr><td style="padding:20px 22px;">
    <p style="margin:0 0 14px;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.14em;color:#888;font-weight:800;">FIGURE · 난이도별 배점 분포</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>${cards}</tr>
    </table>
    <p style="margin:14px 0 0;font-family:Pretendard,sans-serif;font-size:11px;color:#888;line-height:1.5;">총 ${totalPts}점 · ${totalCount}문항. 상단 색상 보더 = 난이도(녹→황→빨 그라데이션).</p>
  </td></tr>
</table>`;
}

function renderFormatBreakdown(questions: AnalyzedQuestion[]): string {
  const formats = [
    { key: 'objective', label: '객관식', color: '#121212' },
    { key: 'short_answer', label: '단답형', color: '#888' },
    { key: 'essay', label: '서술형', color: '#BF1722' },
  ];
  const stats = formats.map((f) => {
    const fQ = questions.filter((q) => q.question_format === f.key);
    return { ...f, count: fQ.length, points: fQ.reduce((s, q) => s + (q.points || 0), 0) };
  });
  const totalPts = stats.reduce((s, x) => s + x.points, 0);
  if (totalPts === 0) return '';

  const cards = stats.map((s) => `
    <td width="33%" align="center" valign="top" style="padding:18px 8px;background:#fff;border:1px solid #eee;border-top:3px solid ${s.color};">
      <p style="margin:0;font-family:Pretendard,sans-serif;font-size:10px;letter-spacing:0.14em;color:#888;font-weight:700;">${s.label}</p>
      <p style="margin:6px 0 2px;font-family:'Abril Fatface','Bodoni Moda',serif;font-size:28px;font-weight:900;color:${s.color};line-height:1;">${s.count}<span style="font-size:13px;color:#888;font-weight:400;">문항</span></p>
      <p style="margin:0;font-family:Pretendard,sans-serif;font-size:12px;color:#444;">${s.points}점</p>
    </td>`).join('<td width="8"></td>');

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;background:#fafafa;border:1px solid #ddd;">
  <tr><td style="padding:20px 22px;">
    <p style="margin:0 0 14px;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.14em;color:#888;font-weight:800;">FIGURE · 문제 형식 분포</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>${cards}</tr>
    </table>
  </td></tr>
</table>`;
}

type QAItem = NonNullable<CommentaryResult['blog_qa']>[number];

function renderQABlock(qa: QAItem, idx: number): string {
  const answer = Array.isArray(qa.answer) ? qa.answer : qa.answer ? [qa.answer] : [];
  const dataBox = qa.data_box ? renderDataBox(qa.data_box) : '';
  // 네이버 SmartEditor는 nested table 안의 좁은 width cell을 한 글자씩 세로 분리 함.
  // → Q번호와 질문을 별도 row로 stack (좌우 분할 폐기). nested 없는 1-level table.
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 16px;border-top:1px solid #DDD;">
  <tr><td style="padding-top:18px;">
    <p style="margin:0 0 10px;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.14em;color:#BF1722;font-weight:800;">Q${idx} · 학부모 인터뷰</p>
    <p style="margin:0 0 14px;font-family:'Abril Fatface','Bodoni Moda',serif;font-size:32px;font-weight:900;color:#BF1722;line-height:1;letter-spacing:-0.02em;">Q${idx}.</p>
    <p style="margin:0 0 16px;font-family:'Noto Serif KR',serif;font-size:20px;font-weight:700;color:#121212;line-height:1.4;word-break:keep-all;">${escapeHtml(qa.question)}</p>
    ${answer.map((p) => `<p style="margin:0 0 14px;font-family:'Noto Serif KR',serif;font-size:15px;line-height:1.85;color:#2A2A2A;word-break:keep-all;">${markdownToInlineBold(p)}</p>`).join('')}
  </td></tr>
</table>
${dataBox}`;
}

type DataBoxData = NonNullable<QAItem['data_box']>;

function renderDataBox(box: DataBoxData): string {
  const label = `<p style="margin:0 0 12px;font-family:Pretendard,sans-serif;font-size:10px;letter-spacing:0.14em;color:#888;font-weight:800;">${escapeHtml(box.label)}</p>`;

  if (box.kind === 'bars') {
    // 이산적인 카운트 grid 시각화 — max 카운트가 N이면 N칸 grid, 각 row는 자기 카운트만큼 채움 + 나머지 회색.
    // 막대 비율 % 보다 직관적 (예: 7문항 중 6칸 채움 vs 7칸 채움). 사용자 피드백.
    const extractCount = (raw: string): number => {
      // "27점 / 6문항" 같은 형식에서 "문항" 또는 "개" 매치 우선, 없으면 첫 숫자
      const m = String(raw).match(/(\d+)\s*(?:문항|개|개항)/);
      if (m) return parseInt(m[1], 10);
      const fallback = parseInt(String(raw), 10);
      return Number.isFinite(fallback) ? fallback : 0;
    };
    const counts = box.rows.map((r) => extractCount(r.value));
    const allPercent = box.rows.every((r) => /%\s*$/.test(String(r.value).trim()));
    // grid는 모든 row가 "X문항"/"X개" 패턴 + max ≤ 30 일 때만 사용 (점수만 있으면 막대 비율 폴백)
    const countRegex = /(\d+)\s*(?:문항|개|개항)/;
    const allHaveCount = box.rows.every((r) => countRegex.test(String(r.value)));
    const maxCount = allPercent ? 0 : Math.max(...counts, 1);
    const useGrid = allHaveCount && !allPercent && maxCount > 0 && maxCount <= 30;

    // ⚠️ 네이버 SmartEditor는 inline-block span의 background/width를 모두 제거함.
    // 반드시 <td bgcolor="" width="" height=""> + &nbsp; 패턴을 사용해야 시각화가 살아남음.
    // 7f82e52d 패턴 — 사용자 검증 완료. aea5274e에서 inline-block으로 잘못 전환했던 것을 복원.

    if (useGrid) {
      const rows = box.rows.map((r, idx) => {
        const cnt = counts[idx];
        const color = r.highlight ? '#BF1722' : '#121212';
        const cellWidthPct = (100 / maxCount).toFixed(2);
        const cells: string[] = [];
        for (let i = 0; i < maxCount; i++) {
          const filled = i < cnt;
          const cellColor = filled ? color : '#dddddd';
          cells.push(
            `<td width="${cellWidthPct}%" height="14" bgcolor="${cellColor}" style="background:${cellColor};font-size:1px;line-height:1px;border-right:2px solid #fff;">&nbsp;</td>`,
          );
        }
        const shortLabel = shortenDataLabel(r.label);
        return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px;">
      <tr>
        <td style="padding:8px 8px 4px 0;font-family:Pretendard,sans-serif;font-size:13px;font-weight:700;color:${color};white-space:nowrap;word-break:keep-all;">${escapeHtml(shortLabel)}</td>
        <td width="120" align="right" style="padding:8px 0 4px 8px;font-family:'Abril Fatface','Bodoni Moda',serif;font-size:13px;font-weight:700;color:${color};white-space:nowrap;">${escapeHtml(r.value)}</td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;border-collapse:collapse;">
      <tr>${cells.join('')}</tr>
    </table>`;
      }).join('');
      return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;border-left:3px solid #BF1722;margin:14px 0 24px;">
  <tr><td style="padding:14px 18px;">
    ${label}
    <p style="margin:0 0 12px;font-family:Pretendard,sans-serif;font-size:10px;color:#888;">총 ${maxCount}칸 기준 · 채워진 칸 = 해당 row의 문항수</p>
    ${rows}
  </td></tr>
</table>`;
    }

    // percentage 데이터 폴백 — 막대 비율 시각화 (td bgcolor 패턴)
    const rawValues = box.rows.map((r) => parseInt(r.value, 10) || 0);
    const maxRaw = Math.max(...rawValues, 1);
    const maxVal = allPercent ? 100 : Math.max(maxRaw * 1.15, 1);
    const rows = box.rows.map((r) => {
      const v = parseInt(r.value, 10) || 0;
      const pct = allPercent
        ? Math.max(0, Math.min(100, v))
        : Math.round((v / maxVal) * 100);
      const color = allPercent
        ? (r.highlight && v < 50 ? '#BF1722' : (v >= 80 ? '#2F7B3A' : '#121212'))
        : (r.highlight ? '#BF1722' : '#121212');
      const greyPct = 100 - pct;
      const shortLabel = shortenDataLabel(r.label);
      return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;">
      <tr>
        <td style="padding:6px 8px 4px 0;font-family:Pretendard,sans-serif;font-size:13px;font-weight:700;color:${color};white-space:nowrap;word-break:keep-all;">${escapeHtml(shortLabel)}</td>
        <td width="60" align="right" style="padding:6px 0 4px 8px;font-family:'Abril Fatface','Bodoni Moda',serif;font-size:14px;font-weight:700;color:${color};white-space:nowrap;">${escapeHtml(r.value)}</td>
      </tr>
      <tr>
        ${pct > 0 ? `<td width="${pct}%" height="6" bgcolor="${color}" style="background:${color};font-size:1px;line-height:1px;">&nbsp;</td>` : ''}
        ${greyPct > 0 ? `<td width="${greyPct}%" height="6" bgcolor="#dddddd" style="background:#dddddd;font-size:1px;line-height:1px;">&nbsp;</td>` : ''}
      </tr>
    </table>`;
    }).join('');
    return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;border-left:3px solid #BF1722;margin:14px 0 24px;">
  <tr><td style="padding:14px 18px;">
    ${label}
    ${rows}
  </td></tr>
</table>`;
  }

  if (box.kind === 'table') {
    // i === 0을 헤더로 강제하지 않음 — highlight=true인 첫 행이 노란 배경+흰 글씨로 안 보이는 문제 방지.
    // 모든 row를 데이터 행으로 동일 처리 (헤더 의도면 box.label에 자연스럽게).
    const rows = box.rows.map((r) => {
      const bg = r.highlight ? 'background:#FFF8E0;' : 'background:#fff;';
      const labelColor = '#121212';
      const valColor = r.highlight ? '#BF1722' : '#2A2A2A';
      const fontWeight = r.highlight ? '800' : '600';
      return `
        <tr style="${bg}">
          <td style="padding:11px 12px;font-family:Pretendard,sans-serif;font-size:12px;font-weight:${fontWeight};color:${labelColor};border-bottom:1px solid #eee;">${escapeHtml(r.label)}</td>
          <td style="padding:11px 12px;font-family:'Abril Fatface','Bodoni Moda',serif;font-size:16px;font-weight:700;color:${valColor};text-align:right;border-bottom:1px solid #eee;">${markdownToInlineBold(r.value)}</td>
        </tr>`;
    }).join('');
    return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;border-left:3px solid #BF1722;">
  <tr><td style="padding:14px 18px;">
    ${label}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      ${rows}
    </table>
  </td></tr>
</table>`;
  }

  // comparison
  const rows = box.rows.map((r) => `
    <tr>
      <td width="80" style="padding:4px 0;font-family:Pretendard,sans-serif;font-size:12px;font-weight:700;${r.highlight ? 'color:#BF1722;' : ''}">${escapeHtml(r.label)}</td>
      <td style="padding:4px 0;font-family:Pretendard,sans-serif;font-size:12px;color:${r.highlight ? '#121212' : '#444'};">${markdownToInlineBold(r.value)}</td>
    </tr>`).join('');
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;border-left:3px solid #BF1722;">
  <tr><td style="padding:14px 18px;">
    ${label}
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${rows}
    </table>
  </td></tr>
</table>`;
}

function renderPullQuote(pq: NonNullable<CommentaryResult['pull_quote']>): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #121212;border-bottom:1px solid #121212;margin:32px 0;">
  <tr><td align="center" style="padding:30px 30px;">
    <p style="margin:0;font-family:'Noto Serif KR',serif;font-size:22px;font-style:italic;line-height:1.5;color:#121212;word-break:keep-all;">"${escapeHtml(pq.text)}"</p>
    ${pq.cite ? `<p style="margin:14px 0 0;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.14em;color:#888;font-weight:700;">${escapeHtml(pq.cite)}</p>` : ''}
  </td></tr>
</table>`;
}

function renderCharts(chartUrls: NaverV3ChartUrls): string {
  const figs: string[] = [];
  // 단원 차트와 변별력 차트만 본문에 (다른 2종은 너비 부담)
  if (chartUrls.topicBar) {
    figs.push(`
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;background:#fafafa;border:1px solid #ddd;">
  <tr><td style="padding:24px 20px;">
    <p style="margin:0 0 14px;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.12em;color:#888;font-weight:700;">FIGURE · 단원별 출제 현황 (상위 8개 단원)</p>
    <img src="${escapeHtml(chartUrls.topicBar)}" alt="단원별 출제 현황" style="max-width:100%;height:auto;display:block;margin:0 auto;" />
  </td></tr>
</table>`);
  }
  if (chartUrls.discrimination) {
    figs.push(`
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;background:#fafafa;border:1px solid #ddd;">
  <tr><td style="padding:24px 20px;">
    <p style="margin:0 0 14px;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.12em;color:#888;font-weight:700;">FIGURE · 변별력 분석</p>
    <img src="${escapeHtml(chartUrls.discrimination)}" alt="변별력 분석" style="max-width:100%;height:auto;display:block;margin:0 auto;" />
  </td></tr>
</table>`);
  }
  return figs.join('\n');
}

function renderConclusion(c: NonNullable<CommentaryResult['conclusion']>): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFF8E0;border-top:3px solid #BF1722;margin:36px 0 24px;">
  <tr><td style="padding:30px 28px;">
    <p style="margin:0 0 8px;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.14em;color:#BF1722;font-weight:800;">${escapeHtml(c.kicker || 'CONCLUSION · 다음 시험을 준비하는 학생에게')}</p>
    <p style="margin:0;font-family:'Noto Serif KR',serif;font-size:16px;line-height:1.85;color:#2A2A2A;word-break:keep-all;">${markdownToInlineBold(c.body)}</p>
  </td></tr>
</table>`;
}

// ── V3 강화 섹션 렌더러 (V4 핵심 콘텐츠 흡수, 네이버 호환 — 모두 1-level table) ──
// CLAUDE.md: nested table 2-level 금지(한글 세로 분리) → 제목/콘텐츠 형제 테이블로 분리.

/** 섹션 제목 — 독립 1-level table */
function v3SectionTitle(sub: string, title: string): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">
  <tr><td style="padding:0;">
    <p style="margin:0 0 6px;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#BF1722;font-weight:800;">${escapeHtml(sub)}</p>
    <p style="margin:0;font-family:'Noto Serif KR',serif;font-size:24px;font-weight:700;color:#121212;word-break:keep-all;">${escapeHtml(title)}</p>
  </td></tr>
</table>`;
}

/** 문항별 난이도·단원 표 — 단일 table, Lv는 색상 굵은 텍스트(네이버 safe) */
function renderQTable(rows: NonNullable<CommentaryResult['v4_difficulty_rows']>): string {
  const sorted = [...rows].sort((a, b) => {
    const aE = String(a.question_number).startsWith('서술');
    const bE = String(b.question_number).startsWith('서술');
    if (aE && !bE) return 1;
    if (!aE && bE) return -1;
    return (parseInt(String(a.question_number), 10) || 0) - (parseInt(String(b.question_number), 10) || 0);
  });
  const header = `
    <tr bgcolor="#121212">
      <td width="48" style="padding:8px 10px;font-family:Pretendard,sans-serif;font-size:11px;font-weight:800;color:#fff;letter-spacing:0.06em;">번호</td>
      <td style="padding:8px 10px;font-family:Pretendard,sans-serif;font-size:11px;font-weight:800;color:#fff;letter-spacing:0.06em;">단원 · 핵심 개념</td>
      <td width="110" style="padding:8px 10px;font-family:Pretendard,sans-serif;font-size:11px;font-weight:800;color:#fff;letter-spacing:0.06em;">난이도</td>
      <td width="52" align="right" style="padding:8px 10px;font-family:Pretendard,sans-serif;font-size:11px;font-weight:800;color:#fff;letter-spacing:0.06em;">배점</td>
    </tr>`;
  const body = sorted.map((row, i) => {
    const lv = Number(row.difficulty);
    const validLv = lv >= 1 && lv <= 5 ? lv : 3;
    const color = V3_DIFF_COLORS[validLv - 1];
    const label = V3_DIFF_LABELS[validLv - 1];
    const bg = i % 2 === 0 ? '#fff' : '#FAFAFA';
    const sub = row.analysis_short
      ? `<br><span style="font-size:12px;color:#888;word-break:keep-all;">${mdLatex(row.analysis_short)}</span>`
      : '';
    return `
    <tr bgcolor="${bg}">
      <td style="padding:9px 10px;font-family:'Abril Fatface',serif;font-size:15px;font-weight:700;color:#121212;border-bottom:1px solid #EEE;vertical-align:top;white-space:nowrap;">${escapeHtml(String(row.question_number))}</td>
      <td style="padding:9px 10px;font-family:Pretendard,sans-serif;font-size:13px;font-weight:600;color:#1A1A1A;border-bottom:1px solid #EEE;vertical-align:top;word-break:keep-all;">${mdLatex(row.topic)}${sub}</td>
      <td style="padding:9px 10px;font-family:Pretendard,sans-serif;font-size:13px;border-bottom:1px solid #EEE;vertical-align:top;white-space:nowrap;"><strong style="color:${color};font-weight:800;">Lv${validLv}</strong> <span style="color:#888;font-size:12px;">${label}</span></td>
      <td align="right" style="padding:9px 10px;font-family:Pretendard,sans-serif;font-size:14px;font-weight:700;color:#121212;border-bottom:1px solid #EEE;vertical-align:top;white-space:nowrap;">${row.points}점</td>
    </tr>`;
  }).join('');
  return `${v3SectionTitle('DATA · 문항별 상세', '문항별 난이도 · 출제 단원')}
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;border:1px solid #DDD;border-collapse:collapse;table-layout:fixed;">
  ${header}${body}
</table>`;
}

/** 이전 시험 비교 콜아웃 — 회색 박스 + 빨강 좌측 라인 */
function renderPreviousComparison(c: NonNullable<CommentaryResult['v4_previous_comparison']>): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;background:#F8F8F8;border-left:3px solid #BF1722;">
  <tr><td style="padding:22px 26px;">
    <p style="margin:0 0 8px;font-family:Pretendard,sans-serif;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#BF1722;font-weight:800;">COMPARE · 이전 시험과의 비교</p>
    <p style="margin:0 0 8px;font-family:'Noto Serif KR',serif;font-size:18px;font-weight:700;color:#121212;line-height:1.5;word-break:keep-all;">${mdLatex(c.headline)}</p>
    <p style="margin:0;font-family:'Noto Serif KR',serif;font-size:15px;line-height:1.8;color:#2A2A2A;word-break:keep-all;">${mdLatex(c.body)}</p>
  </td></tr>
</table>`;
}

/** 영역별 출제 분석 — heading + body 반복 (단일 table, tr 반복) */
function renderMainAnalysis(items: NonNullable<CommentaryResult['v4_main_analysis']>): string {
  const blocks = items.map((m) => `
  <tr><td style="padding:0 0 20px;">
    <p style="margin:0 0 6px;font-family:'Noto Serif KR',serif;font-size:18px;font-weight:700;color:#121212;word-break:keep-all;">${mdLatex(m.heading)}</p>
    <p style="margin:0;font-family:'Noto Serif KR',serif;font-size:15px;line-height:1.8;color:#2A2A2A;word-break:keep-all;">${mdLatex(m.body)}</p>
  </td></tr>`).join('');
  return `${v3SectionTitle('ANALYSIS · 출제 핵심 포인트', '영역별로 본 출제 의도')}
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;">
  ${blocks}
</table>`;
}

/** 주요 문항 해설 — 각 문항을 독립 1-level table(좌측 빨강 라인)로 */
function renderKeyQuestions(items: NonNullable<CommentaryResult['v4_key_questions']>): string {
  const blocks = items.map((kq) => `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;border-left:3px solid #BF1722;">
  <tr><td style="padding:2px 0 2px 16px;">
    <p style="margin:0 0 6px;font-family:Pretendard,sans-serif;font-size:14px;font-weight:800;color:#121212;word-break:keep-all;">${mdLatex(kq.title)}</p>
    <p style="margin:0;font-family:'Noto Serif KR',serif;font-size:15px;line-height:1.8;color:#2A2A2A;word-break:keep-all;">${mdLatex(kq.body)}</p>
  </td></tr>
</table>`).join('');
  return `${v3SectionTitle('KILLER · 주요 문항 해설', '점수를 가른 결정적 문항')}
${blocks}`;
}

/** 이번 시험 단원별 피드백 — 각 영역을 독립 1-level table(회색 박스)로 */
function renderFinalStrategy(rows: NonNullable<CommentaryResult['v4_final_strategy']>): string {
  const blocks = rows.map((r) => `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;background:#F8F8F8;border:1px solid #EEE;">
  <tr><td style="padding:16px 20px;">
    <p style="margin:0 0 10px;font-family:'Noto Serif KR',serif;font-size:17px;font-weight:700;color:#121212;word-break:keep-all;">${mdLatex(r.area)}</p>
    <p style="margin:0 0 6px;font-family:Pretendard,sans-serif;font-size:14px;line-height:1.7;color:#2A2A2A;word-break:keep-all;"><strong style="color:#888;font-weight:800;font-size:12px;">현재 상태 </strong>${mdLatex(r.current_status)}</p>
    <p style="margin:0;font-family:Pretendard,sans-serif;font-size:14px;line-height:1.7;color:#2A2A2A;word-break:keep-all;"><strong style="color:#BF1722;font-weight:800;font-size:12px;">실행 액션 </strong>${mdLatex(r.action)}</p>
  </td></tr>
</table>`).join('');
  return `${v3SectionTitle('FEEDBACK · 단원별 학습 방향', '이번 시험 단원별 피드백')}
${blocks}`;
}

function renderFooter(meta: NaverV3Meta): string {
  const date = meta.analyzedAt ? meta.analyzedAt.slice(0, 10) : '';
  const school = meta.schoolName ? ` · ${escapeHtml(meta.schoolName)}` : '';
  return `
<p style="margin:24px 0 0;font-family:Pretendard,sans-serif;font-size:11px;color:#888;text-align:center;">분석 · 매스랩 AI · ${date}${school}</p>`;
}
