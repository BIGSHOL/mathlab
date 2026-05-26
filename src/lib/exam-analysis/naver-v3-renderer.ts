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

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** **bold** → <strong> (네이버 호환, 색만) */
function markdownToInlineBold(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong style="color:#121212;font-weight:700;">$1</strong>');
}

function normDiff(raw: string): string {
  const map: Record<string, string> = { concept: '1', pattern: '2', reasoning: '4', creative: '5' };
  return map[raw] || raw;
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

  // Q&A 섹션들
  if (commentary.blog_qa?.length) {
    commentary.blog_qa.forEach((qa, idx) => {
      parts.push(renderQABlock(qa, idx + 1));
    });
  }

  // 인용구
  if (commentary.pull_quote) {
    parts.push(renderPullQuote(commentary.pull_quote));
  }

  // 차트 PNG (URL 있을 때만)
  if (chartUrls) {
    parts.push(renderCharts(chartUrls));
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

  const barCells = stats.filter((s) => s.points > 0).map((s) => {
    const pct = (s.points / totalPts) * 100;
    const label = pct >= 8 ? `${Math.round(pct)}%` : '';
    return `<td width="${pct}%" height="32" align="center" style="background:${s.color};color:#fff;font-family:Pretendard,sans-serif;font-size:11px;font-weight:700;">${label}</td>`;
  }).join('');

  const legendRows = stats.map((s) => {
    const pct = totalPts > 0 ? Math.round((s.points / totalPts) * 100) : 0;
    return `
      <tr>
        <td width="16" style="padding:6px 0;"><div style="width:12px;height:12px;background:${s.color};"></div></td>
        <td width="120" style="padding:6px 8px 6px 8px;font-family:Pretendard,sans-serif;font-size:12px;font-weight:700;color:#121212;">Lv ${s.level} · ${s.label}</td>
        <td style="padding:6px 0;font-family:Pretendard,sans-serif;font-size:12px;color:#888;">${s.count}문항 · ${s.points}점 · ${pct}%</td>
      </tr>`;
  }).join('');

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;background:#fafafa;border:1px solid #ddd;">
  <tr><td style="padding:20px 22px;">
    <p style="margin:0 0 14px;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.14em;color:#888;font-weight:800;">FIGURE · 난이도별 배점 분포</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #ddd;">
      <tr>${barCells}</tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
      ${legendRows}
    </table>
    <p style="margin:12px 0 0;font-family:Pretendard,sans-serif;font-size:11px;color:#888;line-height:1.5;">막대 길이는 각 난이도의 <strong style="color:#121212;">배점 비중</strong>. 총 ${totalPts}점 · ${questions.length}문항.</p>
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
    // 네이버 SmartEditor는 3-level nested table(외층 + 행 컨테이너 + bar 셀)을 깨뜨림.
    // → 각 단원 행을 별도 1-level table로 분리. 외층 box 1개 + 각 행 별 table 1개씩 (총 nested 1 level).
    const rows = box.rows.map((r) => {
      const pct = Math.max(0, Math.min(100, parseInt(r.value, 10) || 0));
      const color = r.highlight && pct < 50 ? '#BF1722' : (pct >= 80 ? '#2F7B3A' : '#121212');
      // bar는 td 2개(색상 + 회색)로 단일 행에 배치. nested 없음.
      const greyPct = 100 - pct;
      // 라벨 + 값을 한 줄, bar를 별도 줄 stack — nested table 없는 1-level 구조.
      // 라벨이 한글 "정수와 유리수의 계산"처럼 길어도 width 가변으로 안전.
      // shortenDataLabel으로 "기본 (Level 1)" → "기본·Lv1" 압축 (네이버 한 글자씩 분리 방지).
      const shortLabel = shortenDataLabel(r.label);
      return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;">
      <tr>
        <td style="padding:6px 8px 4px 0;font-family:Pretendard,sans-serif;font-size:13px;font-weight:700;color:${color};white-space:nowrap;word-break:keep-all;">${escapeHtml(shortLabel)}</td>
        <td width="60" align="right" style="padding:6px 0 4px 8px;font-family:'Abril Fatface','Bodoni Moda',serif;font-size:14px;font-weight:700;color:${color};white-space:nowrap;">${escapeHtml(r.value)}</td>
      </tr>
      <tr>
        <td width="${pct}%" height="6" bgcolor="${color}" style="background:${color};font-size:1px;line-height:1px;">&nbsp;</td>
        <td width="${greyPct}%" height="6" bgcolor="#dddddd" style="background:#dddddd;font-size:1px;line-height:1px;">&nbsp;</td>
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
    const rows = box.rows.map((r, i) => {
      const bg = r.highlight ? 'background:#FFF8E0;' : (i === 0 ? 'background:#121212;color:#fff;' : 'background:#fff;');
      const labelColor = i === 0 ? '#fff' : '#121212';
      const valColor = i === 0 ? '#fff' : (r.highlight ? '#BF1722' : '#2A2A2A');
      const fontWeight = r.highlight || i === 0 ? '800' : '600';
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

function renderFooter(meta: NaverV3Meta): string {
  const date = meta.analyzedAt ? meta.analyzedAt.slice(0, 10) : '';
  const school = meta.schoolName ? ` · ${escapeHtml(meta.schoolName)}` : '';
  return `
<p style="margin:24px 0 0;font-family:Pretendard,sans-serif;font-size:11px;color:#888;text-align:center;">분석 · 매스랩 AI · ${date}${school}</p>`;
}
