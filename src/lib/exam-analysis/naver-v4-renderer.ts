/**
 * 네이버 블로그 V4 렌더러 (갈수학학원 스타일 — 테이블 중심)
 *
 * 입력: V4Extension 데이터 (CommentaryResult의 v4_* 필드) + 메타
 * 출력: 네이버 블로그 본문에 그대로 붙여넣을 수 있는 HTML 문자열
 *
 * 절대 규칙 (V3와 동일 — 검증된 네이버 호환 패턴):
 *  - <table> + 인라인 style만 사용
 *  - 폭 720px 고정
 *  - flex/grid/li/h2 금지
 *  - 모든 컨테이너 word-break: keep-all
 *  - 폰트 폴백 명시
 *  - 행 색상 코딩은 td bgcolor 속성 (CSS background는 네이버에서 사라짐)
 *
 * 시안: 사용자 제공 갈수학학원 시험 분석 블로그 스크린샷 (2026-05-27)
 */

import type { CommentaryResult } from './agents/commentary-agent';

export interface NaverV4Meta {
  examTitle: string;
  schoolName: string | null;
  grade: string;
  analyzedAt: string | null;
}

export interface NaverV4ChartUrls {
  difficulty?: string;
  abilityRadar?: string;
  topicBar?: string;
  discrimination?: string;
}

// ── V4 디자인 토큰 (CSS와 일치) ──

const V4_DIFF_ROW_COLORS = [
  '#E8F5E8', // 1 기본 (연녹)
  '#F5F5DC', // 2 표준 (베이지)
  '#FFF4E0', // 3 응용 (연주황)
  '#FFE0CC', // 4 심화 (살구)
  '#FFCCCC', // 5 최고난도 (연빨)
];
const V4_DIFF_LABELS = ['기본', '표준', '응용', '심화', '최고난도'];
const V4_ACCENT = '#8B4513';      // 갈색 헤딩
const V4_HIGHLIGHT = '#FFD700';   // 노란 강조
const V4_HEADER_BG = '#F8F8F8';   // 테이블 헤더 회색
const V4_BORDER = '#E5E5E5';

// ── 유틸 (V3와 공유 패턴) ──

function escapeHtml(s: string): string {
  return joinKoreanCounters(String(s ?? ''))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markdownToInlineBold(text: string): string {
  return escapeHtml(text).replace(
    /\*\*(.+?)\*\*/g,
    `<strong style="color:${V4_ACCENT};font-weight:700;">$1</strong>`,
  );
}

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

// ── 메인 빌더 ──

export function buildNaverV4Html(args: {
  commentary: CommentaryResult;
  meta: NaverV4Meta;
  chartUrls?: NaverV4ChartUrls;
}): string {
  const { commentary, meta, chartUrls } = args;
  const c = commentary;
  const parts: string[] = [];

  // 외부 컨테이너 (720px 고정)
  parts.push(`<table width="720" cellpadding="0" cellspacing="0" border="0" style="width:720px;max-width:720px;margin:0 auto;background:#fff;font-family:'Noto Serif KR','맑은 고딕',serif;color:#2A2A2A;">`);

  // ① 헤더
  parts.push(renderHeader(c, meta));

  // ② 시험 개요
  if (c.v4_exam_overview) {
    parts.push(renderSectionHeading('시험 개요'));
    parts.push(renderExamOverview(c.v4_exam_overview));
  }

  // ③ 문제 번호별 난이도/단원
  if (c.v4_difficulty_rows && c.v4_difficulty_rows.length > 0) {
    parts.push(renderSectionHeading('문제 난이도 · 출제 단원', `${c.v4_difficulty_rows.length}문항`));
    parts.push(renderDifficultyTable(c.v4_difficulty_rows));
  }

  // ④ 출제 특징 요약
  if (c.v4_exam_features) {
    parts.push(renderSectionHeading('출제 특징 요약'));
    parts.push(renderExamFeatures(c.v4_exam_features));
  }

  // ⑤ 주요 공정 분석
  if (c.v4_main_analysis && c.v4_main_analysis.length > 0) {
    parts.push(renderSectionHeading('주요 공정 분석', '영역별'));
    parts.push(renderMainAnalysis(c.v4_main_analysis));
  }

  // ⑥ 차트 (선택)
  if (chartUrls && Object.values(chartUrls).some((v) => !!v)) {
    parts.push(renderSectionHeading('시각 분석', '난이도 · 능력 · 단원 · 변별력'));
    parts.push(renderCharts(chartUrls));
  }

  // ⑦ 기말 대비 전략
  if (c.v4_final_strategy && c.v4_final_strategy.length > 0) {
    parts.push(renderSectionHeading('기말고사 대비 전략', '영역별 권장'));
    parts.push(renderFinalStrategy(c.v4_final_strategy));
  }

  // 푸터
  parts.push(renderFooter(meta));

  parts.push('</table>');
  return parts.filter(Boolean).join('\n');
}

// ── 블록 렌더러 ──

function renderHeader(c: CommentaryResult, meta: NaverV4Meta): string {
  const headerTitle = c.v4_exam_overview?.title || meta.examTitle;
  const headerSchoolGrade = c.v4_exam_overview
    ? [c.v4_exam_overview.school, c.v4_exam_overview.grade].filter(Boolean).join(' · ')
    : [meta.schoolName, meta.grade].filter(Boolean).join(' · ');
  const oneLiner = c.v4_exam_overview?.one_liner;

  return `
  <tr><td style="padding:24px 0 12px;border-bottom:2px solid ${V4_ACCENT};">
    ${headerSchoolGrade ? `<p style="margin:0 0 6px;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:11px;letter-spacing:0.12em;color:${V4_ACCENT};font-weight:700;text-transform:uppercase;word-break:keep-all;">${escapeHtml(headerSchoolGrade)}</p>` : ''}
    <p style="margin:0 0 8px;font-family:'Noto Serif KR','맑은 고딕',serif;font-size:24px;font-weight:700;line-height:1.4;color:#1A1A1A;word-break:keep-all;">${escapeHtml(headerTitle)}</p>
    ${oneLiner ? `<p style="margin:0;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:14px;line-height:1.6;color:#555;word-break:keep-all;">${escapeHtml(oneLiner)}</p>` : ''}
  </td></tr>`;
}

function renderSectionHeading(title: string, subtitle?: string): string {
  return `
  <tr><td style="padding:24px 0 10px;border-bottom:1px solid ${V4_BORDER};">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td valign="baseline" style="padding-right:8px;width:24px;">
          <span style="font-size:18px;color:${V4_ACCENT};">✏</span>
        </td>
        <td valign="baseline">
          <span style="font-family:'맑은 고딕',Pretendard,sans-serif;font-size:16px;font-weight:700;color:#1A1A1A;word-break:keep-all;">${escapeHtml(title)}</span>
          ${subtitle ? `<span style="font-family:'맑은 고딕',Pretendard,sans-serif;font-size:12px;color:#888;font-weight:500;margin-left:8px;">${escapeHtml(subtitle)}</span>` : ''}
        </td>
      </tr>
    </table>
  </td></tr>`;
}

function renderExamOverview(o: NonNullable<CommentaryResult['v4_exam_overview']>): string {
  const rows: Array<[string, string]> = [
    ['시험명', o.title],
    ['학년 · 학교', o.school ? `${o.grade} · ${o.school}` : o.grade],
    ['문항 · 만점', `${o.total_questions}문항 · ${o.total_points}점`],
    ['출제 범위', o.range],
    ['전체 난이도', `<strong style="color:${V4_ACCENT};font-weight:700;">${escapeHtml(o.avg_difficulty_label)}</strong>`],
    ['최고 난이도', o.peak_difficulty],
  ];
  if (o.essay_summary) {
    rows.push(['서술형', o.essay_summary]);
  }
  rows.push(['한 줄 요약', `<strong style="color:${V4_ACCENT};font-weight:700;">${escapeHtml(o.one_liner)}</strong>`]);

  const trs = rows
    .map(
      ([label, value], i) => `
      <tr ${i < rows.length - 1 ? `style="border-bottom:1px solid #F0F0F0;"` : ''}>
        <td width="130" bgcolor="${V4_HEADER_BG}" style="background:${V4_HEADER_BG};padding:10px 14px;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:13px;font-weight:700;color:#555;vertical-align:top;border-right:1px solid ${V4_BORDER};word-break:keep-all;">${escapeHtml(label)}</td>
        <td style="padding:10px 14px;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:14px;color:#2A2A2A;line-height:1.6;word-break:keep-all;">${value.includes('<strong') ? value : escapeHtml(value)}</td>
      </tr>`,
    )
    .join('');

  return `
  <tr><td style="padding:14px 0 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${V4_BORDER};border-collapse:collapse;">
      ${trs}
    </table>
  </td></tr>`;
}

function renderDifficultyTable(rows: NonNullable<CommentaryResult['v4_difficulty_rows']>): string {
  // 번호 순으로 정렬 (서술형 뒤에)
  const sorted = [...rows].sort((a, b) => {
    const aIsEssay = String(a.question_number).startsWith('서술');
    const bIsEssay = String(b.question_number).startsWith('서술');
    if (aIsEssay && !bIsEssay) return 1;
    if (!aIsEssay && bIsEssay) return -1;
    const aNum = parseInt(String(a.question_number), 10) || 0;
    const bNum = parseInt(String(b.question_number), 10) || 0;
    return aNum - bNum;
  });

  const headerRow = `
    <tr bgcolor="${V4_HEADER_BG}" style="background:${V4_HEADER_BG};border-bottom:2px solid ${V4_BORDER};">
      <th width="60" style="padding:10px 12px;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:12px;font-weight:700;color:#555;text-align:left;">번호</th>
      <th style="padding:10px 12px;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:12px;font-weight:700;color:#555;text-align:left;">단원 · 핵심 개념</th>
      <th width="120" style="padding:10px 12px;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:12px;font-weight:700;color:#555;text-align:left;">난이도</th>
      <th width="80" style="padding:10px 12px;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:12px;font-weight:700;color:#555;text-align:right;">배점</th>
    </tr>`;

  const trs = sorted
    .map((row) => {
      const lv = Number(row.difficulty);
      const validLv = lv >= 1 && lv <= 5 ? lv : 3;
      const rowBg = V4_DIFF_ROW_COLORS[validLv - 1];
      const diffLabel = V4_DIFF_LABELS[validLv - 1];
      return `
      <tr bgcolor="${rowBg}" style="background:${rowBg};">
        <td style="padding:8px 12px;font-family:'Abril Fatface','Bodoni Moda',serif;font-size:15px;font-weight:700;color:#1A1A1A;border-bottom:1px solid rgba(0,0,0,0.05);word-break:keep-all;">${escapeHtml(String(row.question_number))}</td>
        <td style="padding:8px 12px;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:13px;color:#2A2A2A;border-bottom:1px solid rgba(0,0,0,0.05);word-break:keep-all;">
          ${escapeHtml(row.topic)}
          ${row.sub_topic ? `<div style="margin-top:2px;color:#888;font-size:12px;">${escapeHtml(row.sub_topic)}</div>` : ''}
        </td>
        <td style="padding:8px 12px;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:13px;color:#2A2A2A;font-weight:600;border-bottom:1px solid rgba(0,0,0,0.05);white-space:nowrap;">Lv${validLv} <span style="color:#888;font-size:12px;font-weight:400;">${diffLabel}</span></td>
        <td align="right" style="padding:8px 12px;font-family:'Abril Fatface','Bodoni Moda',serif;font-size:15px;font-weight:700;color:#1A1A1A;border-bottom:1px solid rgba(0,0,0,0.05);white-space:nowrap;">${row.points}<span style="color:#888;font-size:12px;font-weight:400;"> 점</span></td>
      </tr>`;
    })
    .join('');

  return `
  <tr><td style="padding:14px 0 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${V4_BORDER};border-collapse:collapse;">
      ${headerRow}
      ${trs}
    </table>
  </td></tr>`;
}

function renderExamFeatures(f: NonNullable<CommentaryResult['v4_exam_features']>): string {
  return `
  <tr><td style="padding:14px 0 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td bgcolor="${V4_HEADER_BG}" style="background:${V4_HEADER_BG};border-left:4px solid ${V4_ACCENT};padding:18px 22px;font-family:'Noto Serif KR','맑은 고딕',serif;font-size:15px;line-height:1.85;color:#2A2A2A;word-break:keep-all;">
          <p style="margin:0 0 10px;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:15px;font-weight:700;color:${V4_ACCENT};word-break:keep-all;">${markdownToInlineBold(f.headline)}</p>
          <p style="margin:0;font-family:'Noto Serif KR','맑은 고딕',serif;font-size:15px;line-height:1.85;color:#2A2A2A;word-break:keep-all;">${markdownToInlineBold(f.body)}</p>
        </td>
      </tr>
    </table>
  </td></tr>`;
}

function renderMainAnalysis(items: NonNullable<CommentaryResult['v4_main_analysis']>): string {
  const blocks = items
    .map(
      (item) => `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
      <tr>
        <td style="border-left:3px solid ${V4_HIGHLIGHT};padding:4px 0 4px 14px;">
          <p style="margin:0 0 8px;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:15px;font-weight:700;color:#1A1A1A;word-break:keep-all;">${escapeHtml(item.heading)}</p>
          <p style="margin:0;font-family:'Noto Serif KR','맑은 고딕',serif;font-size:14px;line-height:1.8;color:#2A2A2A;word-break:keep-all;">${markdownToInlineBold(item.body)}</p>
        </td>
      </tr>
    </table>`,
    )
    .join('');

  return `
  <tr><td style="padding:14px 0 0;">
    ${blocks}
  </td></tr>`;
}

function renderFinalStrategy(rows: NonNullable<CommentaryResult['v4_final_strategy']>): string {
  const headerRow = `
    <tr bgcolor="#FFF8E0" style="background:#FFF8E0;border-bottom:2px solid ${V4_HIGHLIGHT};">
      <th width="180" style="padding:10px 14px;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:12px;font-weight:700;color:${V4_ACCENT};text-align:left;">출제 영역</th>
      <th width="200" style="padding:10px 14px;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:12px;font-weight:700;color:${V4_ACCENT};text-align:left;">현재 상태</th>
      <th style="padding:10px 14px;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:12px;font-weight:700;color:${V4_ACCENT};text-align:left;">다음 시험 대비 액션</th>
    </tr>`;

  const trs = rows
    .map(
      (r) => `
      <tr style="border-bottom:1px solid #F0F0F0;">
        <td bgcolor="${V4_HEADER_BG}" style="background:${V4_HEADER_BG};padding:10px 14px;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:13px;color:${V4_ACCENT};font-weight:700;vertical-align:top;word-break:keep-all;line-height:1.5;">${escapeHtml(r.area)}</td>
        <td style="padding:10px 14px;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:13px;color:#555;vertical-align:top;word-break:keep-all;line-height:1.6;">${markdownToInlineBold(r.current_status)}</td>
        <td style="padding:10px 14px;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:13px;color:#2A2A2A;vertical-align:top;word-break:keep-all;line-height:1.6;">${markdownToInlineBold(r.action)}</td>
      </tr>`,
    )
    .join('');

  return `
  <tr><td style="padding:14px 0 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${V4_BORDER};border-collapse:collapse;">
      ${headerRow}
      ${trs}
    </table>
  </td></tr>`;
}

function renderCharts(chartUrls: NaverV4ChartUrls): string {
  const items: Array<[string, string]> = [];
  if (chartUrls.difficulty) items.push(['난이도 분포', chartUrls.difficulty]);
  if (chartUrls.abilityRadar) items.push(['능력 영역 레이더', chartUrls.abilityRadar]);
  if (chartUrls.topicBar) items.push(['단원별 출제', chartUrls.topicBar]);
  if (chartUrls.discrimination) items.push(['변별력', chartUrls.discrimination]);

  if (items.length === 0) return '';

  // 2 × 2 그리드 (table-based — flex/grid 금지)
  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const left = items[i];
    const right = items[i + 1];
    rows.push(`
      <tr>
        <td width="50%" valign="top" style="padding:6px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${V4_BORDER};">
            <tr><td style="padding:12px;text-align:center;">
              <img src="${left[1]}" alt="${escapeHtml(left[0])}" width="320" style="max-width:100%;height:auto;display:block;margin:0 auto;" />
              <p style="margin:8px 0 0;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:11px;color:#888;font-weight:600;text-align:center;">${escapeHtml(left[0])}</p>
            </td></tr>
          </table>
        </td>
        ${right
        ? `<td width="50%" valign="top" style="padding:6px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${V4_BORDER};">
            <tr><td style="padding:12px;text-align:center;">
              <img src="${right[1]}" alt="${escapeHtml(right[0])}" width="320" style="max-width:100%;height:auto;display:block;margin:0 auto;" />
              <p style="margin:8px 0 0;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:11px;color:#888;font-weight:600;text-align:center;">${escapeHtml(right[0])}</p>
            </td></tr>
          </table>
        </td>`
        : '<td width="50%" style="padding:6px;">&nbsp;</td>'}
      </tr>`);
  }

  return `
  <tr><td style="padding:14px 0 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${rows.join('')}
    </table>
  </td></tr>`;
}

function renderFooter(meta: NaverV4Meta): string {
  const date = meta.analyzedAt ? new Date(meta.analyzedAt).toLocaleDateString('ko-KR') : '';
  return `
  <tr><td style="padding:24px 0 12px;border-top:1px solid ${V4_BORDER};">
    <p style="margin:0;font-family:'맑은 고딕',Pretendard,sans-serif;font-size:11px;color:#888;text-align:center;word-break:keep-all;">
      MathLab 분석 · ${escapeHtml(meta.examTitle)}${date ? ` · ${escapeHtml(date)}` : ''}
    </p>
  </td></tr>`;
}
