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

// ── 유틸 ──

function escapeHtml(s: string): string {
  return joinKoreanCounters(String(s ?? ''))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** **bold** → <strong> (네이버 호환). 색상 강조 X. */
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

  // ⑪ 다음 시험 대비 전략
  if (c.v4_final_strategy && c.v4_final_strategy.length > 0) {
    parts.push(renderH2('다음 시험 대비 전략'));
    parts.push(renderFinalStrategy(c.v4_final_strategy));
  }

  // 푸터
  parts.push(renderFooter(meta));

  return parts.filter(Boolean).join('\n');
}

// ── 블록 렌더러 (모두 단순 HTML) ──

function renderH2(title: string): string {
  // V2 패턴: <h2> + 인라인 style. 작은따옴표 사용 (JSON 호환 + V2와 일치)
  return `<h2 style='font-size: 20px; font-weight: 700; color: #1A1A1A; border-bottom: 2px solid ${V4_ACCENT}; padding-bottom: 6px; margin: 32px 0 16px;'>▶ ${escapeHtml(title)}</h2>`;
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
  // 단순 라벨: 값 형식 + <br>. 표 사용 X (네이버 호환).
  const lines: Array<[string, string]> = [
    ['시험명', o.title],
    ['학년 · 학교', o.school ? `${o.grade} · ${o.school}` : o.grade],
    ['문항 · 만점', `${o.total_questions}문항 · ${o.total_points}점`],
    ['출제 범위', o.range],
    ['전체 난이도', o.avg_difficulty_label],
    ['최고 난이도', o.peak_difficulty],
  ];
  if (o.essay_summary) lines.push(['서술형', o.essay_summary]);
  if (o.expected_grade_cut) lines.push(['예상 등급 컷', o.expected_grade_cut]);
  lines.push(['한 줄 요약', o.one_liner]);

  return lines
    .map(
      ([label, value]) =>
        `<strong style='color: ${V4_ACCENT};'>${escapeHtml(label)}:</strong> <span style='font-size: 15px;'>${md(value)}</span><br>`,
    )
    .join('') + '<br>';
}

function renderAcademyStrategy(items: NonNullable<CommentaryResult['v4_academy_strategy']>): string {
  return items
    .map(
      (item, i) =>
        `<strong style='font-size: 17px; color: ${V4_ACCENT};'>${i + 1}. ${escapeHtml(item.title)}</strong><br>` +
        `<span style='font-size: 15px;'>${md(item.body)}</span><br><br>`,
    )
    .join('');
}

function renderDifficultyList(rows: NonNullable<CommentaryResult['v4_difficulty_rows']>): string {
  // 번호 순 정렬 (서술형 뒤)
  const sorted = [...rows].sort((a, b) => {
    const aIsEssay = String(a.question_number).startsWith('서술');
    const bIsEssay = String(b.question_number).startsWith('서술');
    if (aIsEssay && !bIsEssay) return 1;
    if (!aIsEssay && bIsEssay) return -1;
    const aNum = parseInt(String(a.question_number), 10) || 0;
    const bNum = parseInt(String(b.question_number), 10) || 0;
    return aNum - bNum;
  });

  return sorted
    .map((row) => {
      const lv = Number(row.difficulty);
      const validLv = lv >= 1 && lv <= 5 ? lv : 3;
      const bg = V4_DIFF_BG[validLv - 1];
      const diffLabel = V4_DIFF_LABELS[validLv - 1];

      // <span style='background:#XXX'> 형광펜은 네이버에서 살아남음
      const numStr = String(row.question_number);
      const topic = escapeHtml(row.topic);
      const lvBadge = `<span style='background: ${bg}; padding: 2px 6px; font-size: 13px; font-weight: 700;'>Lv${validLv} ${diffLabel}</span>`;
      const points = `<strong>${row.points}점</strong>`;

      let line = `<strong>${escapeHtml(numStr)}번</strong> ${topic} — ${lvBadge} · ${points}<br>`;
      if (row.analysis_short) {
        line += `<span style='font-size: 13px; color: #666; padding-left: 20px;'>↳ ${escapeHtml(row.analysis_short)}</span><br>`;
      }
      return line;
    })
    .join('') + '<br>';
}

function renderExamFeatures(f: NonNullable<CommentaryResult['v4_exam_features']>): string {
  // 회색 박스 → mark(노란 형광펜) + 줄바꿈
  return (
    `<mark style='background: ${V4_HIGHLIGHT_YELLOW}; padding: 2px 6px;'><strong>${md(f.headline)}</strong></mark><br><br>` +
    `<span style='font-size: 15px;'>${md(f.body)}</span><br><br>`
  );
}

function renderMainAnalysis(items: NonNullable<CommentaryResult['v4_main_analysis']>): string {
  return items
    .map(
      (item) =>
        `<strong style='font-size: 17px; color: ${V4_ACCENT};'>${escapeHtml(item.heading)}</strong><br>` +
        `<span style='font-size: 15px;'>${md(item.body)}</span><br><br>`,
    )
    .join('');
}

function renderPreviousComparison(c: NonNullable<CommentaryResult['v4_previous_comparison']>): string {
  return (
    `<mark style='background: ${V4_HIGHLIGHT_PINK}; padding: 2px 6px;'><strong>${md(c.headline)}</strong></mark><br><br>` +
    `<span style='font-size: 15px;'>${md(c.body)}</span><br><br>`
  );
}

function renderKeyQuestions(items: NonNullable<CommentaryResult['v4_key_questions']>): string {
  return items
    .map(
      (kq) =>
        `<strong style='font-size: 17px;'>${escapeHtml(kq.title)}</strong><br>` +
        `<span style='font-size: 15px;'>${md(kq.body)}</span><br><br>`,
    )
    .join('');
}

function renderFinalStrategy(rows: NonNullable<CommentaryResult['v4_final_strategy']>): string {
  // 영역별 짧은 단락
  return rows
    .map(
      (row) =>
        `<strong style='font-size: 16px; color: ${V4_ACCENT};'>${escapeHtml(row.area)}</strong><br>` +
        `<span style='font-size: 14px; color: #666;'>현재 상태:</span> <span style='font-size: 14px;'>${md(row.current_status)}</span><br>` +
        `<span style='font-size: 14px; color: #666;'>액션:</span> <span style='font-size: 14px;'>${md(row.action)}</span><br><br>`,
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
