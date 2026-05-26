/**
 * V3 시안 HTML 빌더 (Phase 0)
 *
 * 두 산출물:
 * 1. commentary-merged.html — 앱 화면, V3 NYT Science 톤 (Tailwind/CSS 자유)
 * 2. naver-blog-merged.html — 네이버 블로그, V3 Q&A 인터뷰 (table + 인라인 style만)
 *
 * 시안 마크업 그대로 차용 (handoff-exam-analysis-v3/exam-analysis-{commentary,blog-naver}-hifi.html V3 섹션).
 * 데이터 부족 시 해당 섹션 hidden (명세 절대 규칙 4번).
 */

import type { MergedCommentary } from './generate-v3-preview';
import type { AnalyzedQuestion, BasicAnalysisResult } from '../src/lib/exam-analysis/types';
import type { ChartImages } from '../src/lib/exam-analysis/chart-image-generator';

// ── 공통 유틸 ──

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** **bold** → <strong> + 노란 형광펜 (앱 화면용, inline-block) */
function markdownToHighlighted(text: string): string {
  return escapeHtml(text).replace(
    /\*\*(.+?)\*\*/g,
    '<strong style="background:linear-gradient(180deg,transparent 65%,#FFE066 65%);padding:0 3px;color:#121212;font-weight:700;">$1</strong>',
  );
}

/** **bold** → <strong> (네이버 호환, 색만) */
function markdownToInlineBold(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong style="color:#121212;font-weight:700;">$1</strong>');
}

/** "30문항 중 '17%만' 킬러였다" 같은 텍스트에서 따옴표 내부를 황색 italic 으로 — 앱 화면용 */
function renderTitleWithEmphasis(text: string): string {
  return escapeHtml(text).replace(
    /'([^']+)'/g,
    '<span style="color:#FFA940;font-style:italic;">$1</span>',
  );
}

/** 난이도 정규화: concept/pattern/reasoning/creative → "1"~"5" */
function normDiff(raw: string): string {
  const map: Record<string, string> = { concept: '1', pattern: '2', reasoning: '4', creative: '5' };
  return map[raw] || raw;
}

// V3 톤 난이도 색상 (녹색→회색→황색→빨강 그라데이션)
const V3_DIFF_COLORS = ['#2F7B3A', '#6F9C76', '#888', '#DA8B2C', '#BF1722'];
const V3_DIFF_LABELS = ['기본', '표준', '응용', '심화', '최고난도'];

/** 인포그래픽 1: 난이도별 배점 stacked bar (수평) */
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

  const segments = stats.filter((s) => s.points > 0).map((s) => {
    const pct = (s.points / totalPts) * 100;
    const label = pct >= 8 ? `${Math.round(pct)}%` : '';
    return `<div style="background:${s.color};width:${pct}%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Pretendard Variable',sans-serif;font-size:11px;font-weight:700;">${label}</div>`;
  }).join('');

  const legend = stats.map((s) => {
    const pct = totalPts > 0 ? Math.round((s.points / totalPts) * 100) : 0;
    return `
      <div style="display:flex;align-items:center;gap:8px;font-family:'Pretendard Variable',sans-serif;font-size:12px;">
        <span style="width:12px;height:12px;background:${s.color};border-radius:2px;display:inline-block;flex-shrink:0;"></span>
        <span style="font-weight:700;color:#121212;">Lv ${s.level} ${s.label}</span>
        <span style="color:#888;">${s.count}문항 · ${s.points}점 · ${pct}%</span>
      </div>`;
  }).join('');

  return `
      <figure class="v3-info-fig">
        <figcaption class="v3-info-label">FIGURE · 난이도별 배점 분포</figcaption>
        <div class="v3-stacked-bar">${segments}</div>
        <div class="v3-stacked-legend">${legend}</div>
        <p class="v3-info-caption">막대 길이는 각 난이도의 <b>배점 비중</b>. 총 ${totalPts}점 · ${questions.length}문항.</p>
      </figure>`;
}

/** 인포그래픽 2: 문제 형식 분포 (객관식/단답형/서술형 + 배점 합) */
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

  const segments = stats.filter((s) => s.points > 0).map((s) => {
    const pct = (s.points / totalPts) * 100;
    const label = pct >= 12 ? `${Math.round(pct)}%` : '';
    return `<div style="background:${s.color};width:${pct}%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Bodoni Moda',serif;font-size:14px;font-weight:700;">${label}</div>`;
  }).join('');

  const cards = stats.map((s) => `
        <div class="v3-format-card" style="border-top-color:${s.color};">
          <p class="v3-format-label">${s.label}</p>
          <p class="v3-format-count" style="color:${s.color};">${s.count}<span class="v3-format-unit">문항</span></p>
          <p class="v3-format-points">${s.points}점</p>
        </div>`).join('');

  return `
      <figure class="v3-info-fig">
        <figcaption class="v3-info-label">FIGURE · 문제 형식 분포</figcaption>
        <div class="v3-stacked-bar" style="height:26px;margin-bottom:14px;">${segments}</div>
        <div class="v3-format-grid">${cards}</div>
      </figure>`;
}

/** 인포그래픽 3: 문항별 난이도 지도 (1번~N번 칸 색칠) */
function renderKillerMap(questions: AnalyzedQuestion[]): string {
  const list = questions
    .map((q) => ({
      num: q.question_number,
      diff: normDiff(String(q.difficulty)),
      isEssay: q.question_format === 'essay',
    }))
    .sort((a, b) => {
      const numA = Number(String(a.num).replace(/\D/g, '')) || 0;
      const numB = Number(String(b.num).replace(/\D/g, '')) || 0;
      // 서답/서술 라벨은 뒤로
      const aIsLetter = /[가-힣]/.test(String(a.num));
      const bIsLetter = /[가-힣]/.test(String(b.num));
      if (aIsLetter !== bIsLetter) return aIsLetter ? 1 : -1;
      return numA - numB;
    });
  if (list.length === 0) return '';

  const cells = list.map((q) => {
    let bg = 'transparent';
    let border = '#121212';
    let textColor = '#121212';
    if (q.diff === '5') {
      bg = '#BF1722';
      border = '#BF1722';
      textColor = '#fff';
    } else if (q.diff === '4') {
      bg = '#FDE9D7';
      border = '#DA8B2C';
    } else if (q.diff === '3') {
      border = '#888';
    }
    if (q.isEssay) bg = q.diff === '5' ? '#BF1722' : '#FFF8E0';
    return `<div class="v3-killer-cell" style="background:${bg};color:${textColor};border-color:${border};">${escapeHtml(String(q.num))}${q.isEssay ? '<sup style="font-size:8px;margin-left:2px;">✎</sup>' : ''}</div>`;
  }).join('');

  return `
      <figure class="v3-info-fig">
        <figcaption class="v3-info-label">FIGURE · 문항별 난이도 지도</figcaption>
        <div class="v3-killer-grid">${cells}</div>
        <div class="v3-killer-legend">
          <span><span class="dot" style="border-color:#121212;"></span>기본·표준 (Lv 1~2)</span>
          <span><span class="dot" style="border-color:#888;"></span>응용 (Lv 3)</span>
          <span><span class="dot" style="background:#FDE9D7;border-color:#DA8B2C;"></span>심화 (Lv 4)</span>
          <span><span class="dot" style="background:#BF1722;border-color:#BF1722;"></span>최고난도 (Lv 5)</span>
          <span><span class="dot" style="background:#FFF8E0;border-color:#DA8B2C;"></span>✎ 서술형</span>
        </div>
      </figure>`;
}

/** 단원 통계 — buildTopicBreakdown 와 동일 (HTML 빌더 단독 사용) */
function topicStats(questions: AnalyzedQuestion[]) {
  const stats: Record<string, { count: number; correct: number; total: number; pts: number }> = {};
  for (const q of questions) {
    const raw = q.topic || '미분류';
    const parts = raw.split('>').map((s) => s.trim());
    const t = parts[parts.length - 1];
    if (!stats[t]) stats[t] = { count: 0, correct: 0, total: 0, pts: 0 };
    stats[t].count++;
    stats[t].pts += q.points || 0;
    if (q.is_correct !== null) {
      stats[t].total++;
      if (q.is_correct === true) stats[t].correct++;
    }
  }
  return Object.entries(stats)
    .map(([topic, s]) => ({ topic, ...s }))
    .sort((a, b) => b.count - a.count);
}

// ════════════════════════════════════════════════════════════════════
// 1) 앱 화면 (V3 NYT Science 톤) — Tailwind/CSS 자유
// ════════════════════════════════════════════════════════════════════

interface BuildHtmlArgs {
  commentary: MergedCommentary;
  charts: ChartImages;
  meta: {
    examPaperId: string;
    examTitle: string;
    grade: string;
    schoolName: string | null;
    analyzedAt: string | null;
    totalQuestions: number;
    totalPoints: number;
    hasStudentData: boolean;
    hasSchool: boolean;
  };
  summary: BasicAnalysisResult['summary'];
  questions: AnalyzedQuestion[];
}

export function buildCommentaryHtml(args: BuildHtmlArgs): string {
  const { commentary, charts, meta, summary, questions } = args;
  const c = commentary;

  // 차트 데이터 URI
  const chartDataUri = (b64: string) => `data:image/png;base64,${b64}`;

  // ── 헤더 ──
  const kicker = c.blog_kicker || (meta.schoolName ? `시험 분석 · ${meta.schoolName} ${meta.examTitle}` : `시험 분석 · ${meta.examTitle}`);
  const headline = c.blog_headline || meta.examTitle;
  const dek = c.blog_dek || '';
  const analyzedDate = meta.analyzedAt ? meta.analyzedAt.slice(0, 10) : '';

  // ── 피처 박스 ──
  const fc = c.feature_callout;
  const featureSection = fc
    ? `
      <div class="v3-feature">
        <div class="lhs">
          <h2>${renderTitleWithEmphasis(fc.title)}</h2>
          ${fc.body.map((p) => `<p>${markdownToHighlighted(p)}</p>`).join('\n          ')}
        </div>
        <div class="rhs">
          <div class="big-num">${escapeHtml(fc.big_number)}${fc.big_number_unit ? `<span class="of">${escapeHtml(fc.big_number_unit)}</span>` : ''}</div>
          <div class="lb">${escapeHtml(fc.big_number_label)}</div>
        </div>
      </div>`
    : '';

  // ── 신규 섹션: 데이터로 보는 시험 (인포그래픽 3종) ──
  const dataInfoSection = `
      <section class="v3-section">
        <span class="num">01</span>
        <div class="sub">DATA · 시험의 얼개</div>
        <h3>한눈에 보는 ${meta.totalQuestions}문항의 구조</h3>
        <p>난이도·문제 형식·문항 위치를 시각화하여 시험의 전반적 구성을 빠르게 파악할 수 있도록 정리했습니다. 어떤 구간에 변별이 집중되어 있고, 어디서 점수가 좌우되는지 한 페이지로 확인하세요.</p>
        ${renderDifficultyStackedBar(questions)}
        <div class="v3-info-grid-2">
          ${renderFormatBreakdown(questions)}
          ${renderKillerMap(questions)}
        </div>
      </section>`;

  // ── Q&A 4~5섹션 (num offset +1 — dataInfoSection 다음) ──
  const qaStartNum = 2;
  const qaSections = (c.blog_qa || []).map((qa, idx) => {
    const num = String(qaStartNum + idx).padStart(2, '0');
    return `
      <section class="v3-section">
        <span class="num">${num}</span>
        <div class="sub">Q${idx + 1} · 학부모 인터뷰</div>
        <h3>${escapeHtml(qa.question)}</h3>
        ${qa.answer.map((p) => `<p>${markdownToHighlighted(p)}</p>`).join('\n        ')}
        ${qa.data_box ? renderDataBoxApp(qa.data_box) : ''}
      </section>`;
  }).join('\n');

  // ── 큰 인용구 ──
  const quoteBlock = c.pull_quote
    ? `
      <div class="v3-quote-block">
        <p>"${escapeHtml(c.pull_quote.text)}"</p>
        ${c.pull_quote.cite ? `<span class="cite">${escapeHtml(c.pull_quote.cite)}</span>` : ''}
      </div>`
    : '';

  // ── 우리 차트 4종 figure 섹션 (num offset = dataInfo(1) + qaCount + 1) ──
  const chartsNum = String(qaStartNum + (c.blog_qa?.length || 0)).padStart(2, '0');
  const chartsSection = `
      <section class="v3-section">
        <span class="num">${chartsNum}</span>
        <div class="sub">CHART · AI 분석 시각화</div>
        <h3>4개 차트로 본 시험의 통계</h3>
        <p>분석 화면에서 사용되는 4개 도표 — 난이도 분포·능력 영역·단원 출제 현황·변별력 — 를 그대로 옮겨 왔습니다.</p>
        <div class="charts-grid">
          <figure class="chart-fig">
            <img src="${chartDataUri(charts.difficulty)}" alt="난이도 분포" />
            <figcaption>FIGURE 1 — 난이도 분포 (총 ${meta.totalQuestions}문항)</figcaption>
          </figure>
          <figure class="chart-fig">
            <img src="${chartDataUri(charts.abilityRadar)}" alt="능력 영역" />
            <figcaption>FIGURE 2 — 능력 영역 분포 (계산력·이해력·문제해결력·추론력)</figcaption>
          </figure>
          <figure class="chart-fig chart-fig-wide">
            <img src="${chartDataUri(charts.topicBar)}" alt="단원별 출제 현황" />
            <figcaption>FIGURE 3 — 단원별 출제 현황 (상위 8개 단원)</figcaption>
          </figure>
          <figure class="chart-fig chart-fig-wide">
            <img src="${chartDataUri(charts.discrimination)}" alt="변별력 분석" />
            <figcaption>FIGURE 4 — 변별력 분석 (난이도·배점·형식 기반 지수)</figcaption>
          </figure>
        </div>
      </section>`;

  // ── 결론 ──
  const conclusion = c.conclusion
    ? `
      <div class="v3-conclusion">
        <div class="sub">${escapeHtml(c.conclusion.kicker || 'CONCLUSION · 다음 시험을 준비하는 학생에게')}</div>
        <h3>다음 시험을 준비하는 학생에게</h3>
        <p>${markdownToHighlighted(c.conclusion.body)}</p>
      </div>`
    : '';

  // ── 기존 score_strategies (보너스) — V3 톤으로 ──
  const strategies = c.score_strategies && c.score_strategies.length > 0
    ? `
      <section class="v3-section">
        <span class="num">${String(qaStartNum + (c.blog_qa?.length || 0) + 1).padStart(2, '0')}</span>
        <div class="sub">STRATEGY · 등급별 점수 확보 전략</div>
        <h3>몇 점이 목표인가에 따라 다른 접근</h3>
        <div class="strategy-grid">
          ${c.score_strategies.map((s, i) => `
            <div class="strategy-col ${i === 0 ? 'top' : ''}">
              <div class="grade-label">${escapeHtml(s.grade)}</div>
              <div class="target">${escapeHtml(s.target)}</div>
              <ul>${(s.points || []).map((p) => `<li>${markdownToHighlighted(p)}</li>`).join('')}</ul>
            </div>`).join('')}
        </div>
      </section>`
    : '';

  // ── strength / improvement (V3 톤) ──
  const swSection = (c.strength_areas?.length || c.improvement_areas?.length)
    ? `
      <section class="v3-section">
        <span class="num">${String(qaStartNum + (c.blog_qa?.length || 0) + 2).padStart(2, '0')}</span>
        <div class="sub">ANALYSIS · 강점·주의 영역</div>
        <h3>학생이 잘하는 곳, 막힌 곳</h3>
        <div class="sw-grid">
          ${(c.strength_areas || []).length > 0 ? `
            <div class="sw-col sw-strong">
              <div class="sw-label">✦ 강점 영역</div>
              <ul>${(c.strength_areas || []).map((s) => `<li>${markdownToHighlighted(s)}</li>`).join('')}</ul>
            </div>` : ''}
          ${(c.improvement_areas || []).length > 0 ? `
            <div class="sw-col sw-weak">
              <div class="sw-label">⚠ 주의 영역</div>
              <ul>${(c.improvement_areas || []).map((s) => `<li>${markdownToHighlighted(s)}</li>`).join('')}</ul>
            </div>` : ''}
        </div>
      </section>`
    : '';

  // ── notable_questions (V3 톤) ──
  const notable = c.notable_questions && c.notable_questions.length > 0
    ? `
      <section class="v3-section v3-section-dark">
        <h3 class="notable-h">주목할 문항 ─ 출제 의도가 가장 잘 드러난 문항</h3>
        ${c.notable_questions.map((nq) => `
          <div class="notable-item">
            <div class="notable-qn">${escapeHtml(String(nq.question_number))}</div>
            <div class="notable-comment">${markdownToHighlighted(nq.comment)}</div>
          </div>`).join('')}
      </section>`
    : '';

  // ── 검정 KPI 4컬럼 (Q&A 위) ──
  const sum = questions.length > 0 ? questions.length : 1;
  const counts = [0, 0, 0, 0, 0];
  for (const q of questions) {
    const lv = Number(q.difficulty);
    if (lv >= 1 && lv <= 5) counts[lv - 1]++;
  }
  const totalDiff = counts.reduce((s, c2) => s + c2, 0);
  const weighted = totalDiff > 0 ? counts.reduce((s, c2, i) => s + c2 * (i + 1), 0) / totalDiff : 0;
  const killerPct = totalDiff > 0 ? Math.round((counts[4] / totalDiff) * 100) : 0;
  const essayCount = questions.filter((q) => q.question_format === 'essay').length;

  const correctRate = (() => {
    const answered = questions.filter((q) => q.is_correct !== null);
    if (answered.length === 0) return null;
    return Math.round((answered.filter((q) => q.is_correct === true).length / answered.length) * 100);
  })();

  const kpiRow = `
      <div class="kpi-row">
        <div class="kpi kpi-1"><div class="lb">평균 난이도</div><div class="v">${weighted.toFixed(1)}<span class="of">/5</span></div></div>
        <div class="kpi kpi-2"><div class="lb">킬러 비중</div><div class="v">${killerPct}<span class="of">%</span></div></div>
        <div class="kpi kpi-3"><div class="lb">서술형</div><div class="v">${essayCount}<span class="of">문항</span></div></div>
        <div class="kpi kpi-4"><div class="lb">${meta.hasStudentData ? '정답률' : '총 배점'}</div><div class="v">${correctRate !== null ? `${correctRate}<span class="of">%</span>` : `${meta.totalPoints}<span class="of">점</span>`}</div></div>
      </div>`;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>V3 시안 · ${escapeHtml(headline)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700&family=Bodoni+Moda:ital,wght@0,400;0,700;0,900;1,400&display=swap">
<style>
  * { box-sizing: border-box; }
  body { background: #f0eee8; margin: 0; font-family: 'Pretendard Variable', sans-serif; color: #121212; }
  .page-shell { max-width: 1240px; margin: 0 auto; padding: 32px 24px 96px; }
  .back-meta { font-size: 12px; color: #888; margin-bottom: 18px; display: flex; gap: 12px; align-items: center; }
  .back-meta b { color: #121212; }

  /* V3 컨테이너 */
  .v3 { background: #fff; border: 1px solid #DDD; border-radius: 10px; overflow: hidden; }

  /* 헤더 */
  .v3-top { background: linear-gradient(180deg, #fff 0%, #F8F8F8 100%); padding: 56px 64px 36px; border-bottom: 1px solid #DDD; }
  .v3-kicker {
    display: inline-block; font-family: 'Pretendard Variable', sans-serif;
    font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
    color: #BF1722; font-weight: 800; padding-bottom: 6px;
    border-bottom: 1.5px solid #BF1722;
  }
  .v3-top h1 {
    font-family: 'Noto Serif KR', serif; font-size: 48px; font-weight: 700;
    line-height: 1.15; margin: 14px 0 14px; color: #121212; letter-spacing: -0.01em;
    max-width: 880px; word-break: keep-all;
  }
  .v3-top .dek {
    font-family: 'Noto Serif KR', serif; font-size: 18px; line-height: 1.55;
    color: #444; font-weight: 400; max-width: 820px; margin: 0 0 18px; word-break: keep-all;
  }
  .v3-top .meta { display: flex; gap: 16px; align-items: center; font-family: 'Pretendard Variable', sans-serif; font-size: 12px; color: #888; }
  .v3-top .meta .author { color: #121212; font-weight: 700; }
  .v3-top .meta .dot { color: #BBB; }

  /* 검정 KPI 행 */
  .kpi-row { background: #121212; display: grid; grid-template-columns: repeat(4, 1fr); }
  .kpi { padding: 24px 16px; text-align: center; border-right: 1px solid #333; }
  .kpi:last-child { border-right: none; }
  .kpi .lb { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #888; font-weight: 700; }
  .kpi .v { font-family: 'Bodoni Moda', serif; font-size: 36px; font-weight: 900; line-height: 1; margin-top: 8px; }
  /* 시안 KPI 색상: 1=황색, 2·3=흰색, 4=녹색 */
  .kpi-1 .v { color: #FFA940; }
  .kpi-2 .v, .kpi-3 .v { color: #fff; }
  .kpi-4 .v { color: #2F7B3A; }
  .kpi .v .of { font-size: 16px; color: #888; font-weight: 400; }

  /* 피처 박스 */
  .v3-feature {
    background: #121212; color: #fff; padding: 48px 64px;
    display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center;
  }
  .v3-feature .lhs h2 {
    font-family: 'Noto Serif KR', serif; font-size: 36px; font-weight: 700;
    line-height: 1.2; margin: 0 0 14px; color: #fff; word-break: keep-all;
  }
  .v3-feature .lhs p { font-family: 'Noto Serif KR', serif; font-size: 16px; line-height: 1.7; color: #DDD; margin: 0 0 14px; word-break: keep-all; }
  /* 피처 박스(검정 배경)에서는 형광펜 대신 황색 굵게 — 검정 텍스트가 안 보이는 문제 방지 */
  .v3-feature .lhs p strong { background: none !important; color: #FFA940 !important; font-weight: 700; padding: 0; }
  .v3-feature .rhs { text-align: center; }
  .v3-feature .rhs .big-num {
    font-family: 'Bodoni Moda', serif; font-size: 180px; font-weight: 900; line-height: 1;
    color: #FFA940; text-shadow: 0 8px 30px rgba(255, 169, 64, 0.25); letter-spacing: -0.04em;
  }
  .v3-feature .rhs .big-num .of { font-size: 60px; color: #888; }
  .v3-feature .rhs .lb { font-family: 'Pretendard Variable', sans-serif; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #888; margin-top: 8px; }

  /* 본문 섹션 */
  .v3-section { padding: 40px 64px; border-bottom: 1px solid #EEE; max-width: 1080px; margin: 0 auto; position: relative; }
  .v3-section .num {
    font-family: 'Bodoni Moda', serif; font-size: 60px; font-weight: 900; line-height: 1;
    color: #BF1722; opacity: 0.18; float: right; margin: -10px -16px 0 0;
  }
  .v3-section h3 {
    font-family: 'Noto Serif KR', serif; font-size: 28px; font-weight: 700;
    margin: 0 0 14px; color: #121212; letter-spacing: -0.01em; word-break: keep-all;
  }
  .v3-section .sub {
    font-family: 'Pretendard Variable', sans-serif; font-size: 12px;
    letter-spacing: 0.14em; text-transform: uppercase; color: #BF1722;
    font-weight: 800; margin: 0 0 22px;
  }
  .v3-section p {
    font-family: 'Noto Serif KR', serif; font-size: 17px; line-height: 1.85;
    color: #2A2A2A; margin: 0 0 14px; word-break: keep-all;
  }

  /* 데이터 박스 */
  .data-box { background: #F8F8F8; border-left: 3px solid #BF1722; padding: 18px 22px; margin: 20px 0; }
  .data-box .lb { font-family: 'Pretendard Variable', sans-serif; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #888; font-weight: 800; margin-bottom: 12px; }
  .data-box .row { display: grid; gap: 12px; align-items: center; padding: 6px 0; }
  .data-box .row-comparison { grid-template-columns: 90px 1fr; }
  /* 우측 수치 컬럼은 최소 88px + nowrap (한 줄로 잘리지 않게) */
  .data-box .row-bars { grid-template-columns: minmax(120px, 160px) minmax(0, 1fr) minmax(88px, auto); }
  .data-box .row-table { grid-template-columns: 100px 1fr; border-bottom: 1px solid #EEE; }
  .data-box .row-table:last-child { border-bottom: none; }
  .data-box .row .nm { font-family: 'Pretendard Variable', sans-serif; font-size: 13px; font-weight: 700; word-break: keep-all; }
  .data-box .row .val { font-family: 'Pretendard Variable', sans-serif; font-size: 13px; color: #2A2A2A; word-break: keep-all; }
  .data-box .row .v-num { font-family: 'Bodoni Moda', serif; font-size: 16px; font-weight: 700; text-align: right; white-space: nowrap; }
  .data-box .row .track { height: 6px; background: #DDD; position: relative; }
  .data-box .row .track .fill { height: 100%; background: #121212; }
  .data-box .row .track .fill.up { background: #2F7B3A; }
  .data-box .row .track .fill.down { background: #BF1722; }
  .data-box .row.highlight .nm,
  .data-box .row.highlight .val,
  .data-box .row.highlight .v-num { color: #BF1722; font-weight: 800; }

  /* 인용구 */
  .v3-quote-block {
    border-top: 1px solid #121212; border-bottom: 1px solid #121212;
    padding: 30px 0; margin: 32px 64px;
  }
  .v3-quote-block p {
    font-family: 'Noto Serif KR', serif; font-size: 24px; font-style: italic;
    line-height: 1.5; color: #121212; margin: 0 auto; max-width: 720px;
    text-align: center; word-break: keep-all;
  }
  .v3-quote-block .cite {
    font-family: 'Pretendard Variable', sans-serif; font-size: 11px; letter-spacing: 0.14em;
    text-transform: uppercase; color: #888; margin-top: 14px; display: block;
    font-weight: 700; text-align: center;
  }

  /* 차트 그리드 */
  .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
  .chart-fig { margin: 0; background: #fff; border: 1px solid #EEE; border-radius: 4px; padding: 16px; }
  .chart-fig-wide { grid-column: 1 / -1; }
  .chart-fig img { width: 100%; height: auto; display: block; }
  .chart-fig figcaption { font-family: 'Pretendard Variable', sans-serif; font-size: 11px; color: #888; margin-top: 10px; font-weight: 600; letter-spacing: 0.04em; }

  /* V3 인포그래픽 (인라인 HTML) */
  .v3-info-fig { margin: 24px 0; padding: 22px 26px; background: #F8F8F8; border: 1px solid #EEE; border-radius: 4px; }
  .v3-info-label { font-family: 'Pretendard Variable', sans-serif; font-size: 11px; letter-spacing: 0.14em; color: #888; font-weight: 800; margin: 0 0 14px; text-transform: uppercase; }
  .v3-info-caption { font-family: 'Pretendard Variable', sans-serif; font-size: 11px; color: #888; margin: 12px 0 0; line-height: 1.5; }
  .v3-info-caption b { color: #121212; }
  .v3-stacked-bar { display: flex; height: 32px; border-radius: 4px; overflow: hidden; border: 1px solid #DDD; }
  .v3-stacked-legend { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; margin-top: 14px; }
  .v3-format-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .v3-format-card { text-align: center; padding: 16px 8px; background: #fff; border: 1px solid #EEE; border-top: 3px solid #121212; }
  .v3-format-label { font-family: 'Pretendard Variable', sans-serif; font-size: 10px; letter-spacing: 0.14em; color: #888; font-weight: 700; margin: 0; text-transform: uppercase; }
  .v3-format-count { font-family: 'Bodoni Moda', serif; font-size: 28px; font-weight: 900; margin: 6px 0 2px; line-height: 1; }
  .v3-format-unit { font-size: 13px; color: #888; font-weight: 400; }
  .v3-format-points { font-family: 'Pretendard Variable', sans-serif; font-size: 12px; color: #444; margin: 0; }
  .v3-info-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 24px 0; }
  .v3-info-grid-2 .v3-info-fig { margin: 0; }
  .v3-killer-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(46px, 1fr)); gap: 5px; }
  .v3-killer-cell { padding: 7px 4px; text-align: center; font-family: 'Pretendard Variable', sans-serif; font-size: 11px; font-weight: 700; border: 1px solid #121212; border-radius: 3px; }
  .v3-killer-legend { display: flex; gap: 16px; margin-top: 14px; font-family: 'Pretendard Variable', sans-serif; font-size: 11px; color: #444; flex-wrap: wrap; }
  .v3-killer-legend .dot { display: inline-block; width: 10px; height: 10px; border: 1px solid currentColor; margin-right: 6px; vertical-align: middle; }

  /* 전략 그리드 */
  .strategy-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; margin: 24px 0; border: 1px solid #121212; }
  .strategy-col { padding: 24px 20px; border-right: 1px solid #DDD; background: #FAFAFA; font-family: 'Pretendard Variable', sans-serif; }
  .strategy-col:last-child { border-right: none; }
  .strategy-col.top { background: linear-gradient(180deg, #FFF8E0, #FFE9A8); }
  .strategy-col .grade-label { font-family: 'Bodoni Moda', serif; font-size: 24px; font-weight: 900; color: #BF1722; }
  .strategy-col .target { font-family: 'Noto Serif KR', serif; font-size: 18px; font-weight: 700; margin: 6px 0 14px; }
  .strategy-col ul { list-style: none; padding: 0; margin: 0; }
  .strategy-col li { padding: 7px 0; font-size: 13px; line-height: 1.6; color: #2A2A2A; border-bottom: 1px dotted #DDD; }
  .strategy-col li:last-child { border-bottom: none; }
  .strategy-col li::before { content: '— '; color: #BF1722; font-weight: 700; }

  /* 강점/약점 */
  .sw-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 18px 0; }
  .sw-col { border-radius: 4px; padding: 22px 24px; }
  .sw-strong { background: #F0F7F2; border-left: 4px solid #2F7B3A; }
  .sw-weak { background: #FBF1F1; border-left: 4px solid #BF1722; }
  .sw-col .sw-label { font-family: 'Pretendard Variable', sans-serif; font-size: 11px; letter-spacing: 0.16em; font-weight: 800; margin-bottom: 12px; }
  .sw-strong .sw-label { color: #2F7B3A; }
  .sw-weak .sw-label { color: #BF1722; }
  .sw-col ul { list-style: none; padding: 0; margin: 0; }
  .sw-col li { padding: 10px 0; font-family: 'Pretendard Variable', sans-serif; font-size: 14px; line-height: 1.6; color: #2A2A2A; border-bottom: 1px dotted #DDD; word-break: keep-all; }
  .sw-col li:last-child { border-bottom: none; }

  /* 주목할 문항 (검정 박스) */
  .v3-section-dark { background: #121212; color: #fff; max-width: 1080px; margin: 0 auto; padding: 40px 64px; border-radius: 0; border-bottom: 1px solid #EEE; }
  .notable-h { font-family: 'Bodoni Moda', serif; font-size: 24px; font-weight: 700; margin: 0 0 22px; color: #FFA940; }
  .notable-item { display: grid; grid-template-columns: 70px 1fr; gap: 16px; padding: 16px 0; border-bottom: 1px solid #333; }
  .notable-item:last-child { border-bottom: none; }
  .notable-qn { font-family: 'Bodoni Moda', serif; font-size: 32px; font-weight: 900; color: #FFA940; line-height: 1; }
  .notable-comment { font-family: 'Pretendard Variable', sans-serif; font-size: 14px; line-height: 1.7; color: #E5E5E5; word-break: keep-all; }
  .notable-comment strong { color: #FFA940 !important; background: none !important; }

  /* 결론 */
  .v3-conclusion { background: #FFF8E0; padding: 36px 64px; margin: 0; border-top: 1px solid #DDD; }
  .v3-conclusion h3 { font-family: 'Noto Serif KR', serif; font-size: 22px; font-weight: 700; margin: 0 0 14px; }
  .v3-conclusion .sub { font-family: 'Pretendard Variable', sans-serif; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #BF1722; font-weight: 800; margin-bottom: 10px; }
  .v3-conclusion p { font-family: 'Noto Serif KR', serif; font-size: 16px; line-height: 1.85; color: #2A2A2A; margin: 0; word-break: keep-all; }

  /* 푸터 */
  .v3-footer { padding: 22px 64px; border-top: 1px solid #DDD; background: #FAFAFA; display: flex; align-items: center; justify-content: space-between; }
  .v3-footer .meta-text { font-family: 'Pretendard Variable', sans-serif; font-size: 12px; color: #888; }
  .v3-footer .actions a { font-family: 'Pretendard Variable', sans-serif; font-size: 12px; color: #BF1722; font-weight: 700; text-decoration: none; padding: 6px 12px; border: 1px solid #BF1722; border-radius: 4px; }
</style>
</head>
<body>
<div class="page-shell">
  <div class="back-meta">
    <span>📐 <b>V3 시안 · 앱 화면</b> — NYT Science 분석형 (Tailwind/CSS 자유)</span>
    <span>·</span>
    <span>${escapeHtml(meta.examTitle)} (${escapeHtml(meta.grade)})</span>
    ${meta.schoolName ? `<span>·</span><span>${escapeHtml(meta.schoolName)}</span>` : ''}
    <span>·</span>
    <span>분석일 ${analyzedDate}</span>
  </div>

  <div class="v3">
    <header class="v3-top">
      <span class="v3-kicker">${escapeHtml(kicker)}</span>
      <h1>${escapeHtml(headline)}</h1>
      ${dek ? `<p class="dek">${escapeHtml(dek)}</p>` : ''}
      <div class="meta">
        <span class="author">매스랩 AI 분석</span>
        <span class="dot">·</span>
        <span>총 ${meta.totalQuestions}문항 ${meta.totalPoints}점</span>
        <span class="dot">·</span>
        <span>${analyzedDate}</span>
      </div>
    </header>

    ${kpiRow}

    ${featureSection}

    <div class="sections-body">
      ${dataInfoSection}

      ${qaSections}

      ${quoteBlock}

      ${chartsSection}

      ${strategies}

      ${swSection}

      ${notable}
    </div>

    ${conclusion}

    <footer class="v3-footer">
      <div class="meta-text">분석 · 매스랩 AI v3.2 · ${analyzedDate} · prompt v1.1.0 (V3 시안)</div>
      <div class="actions"><a href="#">재분석</a></div>
    </footer>
  </div>
</div>
</body>
</html>`;
}

/** 앱 화면 데이터 박스 — comparison / bars / table */
function renderDataBoxApp(box: NonNullable<NonNullable<MergedCommentary['blog_qa']>[number]['data_box']>): string {
  const inner = (() => {
    if (box.kind === 'bars') {
      return box.rows.map((r) => {
        const pct = parseInt(r.value, 10) || 0;
        const tone: 'up' | 'down' | 'mid' = r.highlight && pct < 50 ? 'down' : pct >= 80 ? 'up' : 'mid';
        return `
          <div class="row row-bars${r.highlight ? ' highlight' : ''}">
            <span class="nm">${escapeHtml(r.label)}</span>
            <div class="track"><div class="fill ${tone === 'up' ? 'up' : tone === 'down' ? 'down' : ''}" style="width:${Math.max(0, Math.min(100, pct))}%;"></div></div>
            <span class="v-num">${escapeHtml(r.value)}</span>
          </div>`;
      }).join('');
    }
    if (box.kind === 'table') {
      return box.rows.map((r) => `
        <div class="row row-table${r.highlight ? ' highlight' : ''}">
          <span class="nm">${escapeHtml(r.label)}</span>
          <span class="val">${markdownToHighlighted(r.value)}</span>
        </div>`).join('');
    }
    // comparison
    return box.rows.map((r) => `
      <div class="row row-comparison${r.highlight ? ' highlight' : ''}">
        <span class="nm">${escapeHtml(r.label)}</span>
        <span class="val">${markdownToHighlighted(r.value)}</span>
      </div>`).join('');
  })();

  return `<div class="data-box">
    <div class="lb">${escapeHtml(box.label)}</div>
    ${inner}
  </div>`;
}

// ════════════════════════════════════════════════════════════════════
// 2) 네이버 블로그 (V3 Q&A 인터뷰) — table + 인라인 style만
// ════════════════════════════════════════════════════════════════════

export function buildNaverBlogHtml(args: BuildHtmlArgs): string {
  const { commentary, charts, meta, questions } = args;
  const c = commentary;

  const chartDataUri = (b64: string) => `data:image/png;base64,${b64}`;

  // 헤더 변수
  const kicker = c.blog_kicker || (meta.schoolName ? `시험 분석 · ${meta.schoolName}` : `시험 분석 · ${meta.examTitle}`);
  const headline = c.blog_headline || meta.examTitle;
  const dek = c.blog_dek || '';
  const analyzedDate = meta.analyzedAt ? meta.analyzedAt.slice(0, 10) : '';

  // KPI 4컬럼 (검정 배경)
  const counts = [0, 0, 0, 0, 0];
  for (const q of questions) {
    const lv = Number(q.difficulty);
    if (lv >= 1 && lv <= 5) counts[lv - 1]++;
  }
  const totalDiff = counts.reduce((s, c2) => s + c2, 0);
  const weighted = totalDiff > 0 ? counts.reduce((s, c2, i) => s + c2 * (i + 1), 0) / totalDiff : 0;
  const killerPct = totalDiff > 0 ? Math.round((counts[4] / totalDiff) * 100) : 0;
  const essayCount = questions.filter((q) => q.question_format === 'essay').length;

  // ── 1. 헤더 ──
  const headerBlock = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
  <tr><td style="padding:0;">
    <p style="margin:0 0 8px;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.16em;color:#BF1722;font-weight:800;">${escapeHtml(kicker)}</p>
    <p style="margin:0 0 10px;font-family:'Noto Serif KR',serif;font-size:30px;font-weight:700;line-height:1.2;color:#121212;letter-spacing:-0.01em;word-break:keep-all;">${escapeHtml(headline)}</p>
    ${dek ? `<p style="margin:0;font-family:'Noto Serif KR',serif;font-size:14px;line-height:1.6;color:#666;word-break:keep-all;">${escapeHtml(dek)}</p>` : ''}
  </td></tr>
</table>`;

  // ── 2. KPI 4컬럼 (검정 배경) ──
  const kpiBlock = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#121212;margin:0 0 32px;">
  <tr>
    <td align="center" style="padding:20px 8px;border-right:1px solid #333;">
      <p style="margin:0 0 4px;font-family:Pretendard,sans-serif;font-size:10px;letter-spacing:0.14em;color:#888;font-weight:700;">평균 난이도</p>
      <p style="margin:0;font-family:'Bodoni Moda',serif;font-size:28px;font-weight:900;color:#FFA940;line-height:1;">${weighted.toFixed(1)}<span style="font-size:14px;color:#888;">/5</span></p>
    </td>
    <td align="center" style="padding:20px 8px;border-right:1px solid #333;">
      <p style="margin:0 0 4px;font-family:Pretendard,sans-serif;font-size:10px;letter-spacing:0.14em;color:#888;font-weight:700;">킬러 비중</p>
      <p style="margin:0;font-family:'Bodoni Moda',serif;font-size:28px;font-weight:900;color:#fff;line-height:1;">${killerPct}<span style="font-size:14px;color:#BF1722;">%</span></p>
    </td>
    <td align="center" style="padding:20px 8px;border-right:1px solid #333;">
      <p style="margin:0 0 4px;font-family:Pretendard,sans-serif;font-size:10px;letter-spacing:0.14em;color:#888;font-weight:700;">서술형</p>
      <p style="margin:0;font-family:'Bodoni Moda',serif;font-size:28px;font-weight:900;color:#fff;line-height:1;">${essayCount}<span style="font-size:14px;color:#888;">문항</span></p>
    </td>
    <td align="center" style="padding:20px 8px;">
      <p style="margin:0 0 4px;font-family:Pretendard,sans-serif;font-size:10px;letter-spacing:0.14em;color:#888;font-weight:700;">총 배점</p>
      <p style="margin:0;font-family:'Bodoni Moda',serif;font-size:28px;font-weight:900;color:#2F7B3A;line-height:1;">${meta.totalPoints}<span style="font-size:14px;color:#888;">점</span></p>
    </td>
  </tr>
</table>`;

  // ── 3. 피처 박스 (거대 숫자) ──
  const fc = c.feature_callout;
  const featureBlock = fc ? `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;">
  <tr>
    <td align="center" style="padding:36px 20px;background:#fafafa;border:1px solid #ddd;">
      <p style="margin:0;font-family:'Bodoni Moda',serif;font-size:96px;font-weight:900;line-height:1;color:#BF1722;letter-spacing:-0.04em;">${escapeHtml(fc.big_number)}${fc.big_number_unit ? `<span style="font-size:40px;color:#888;">${escapeHtml(fc.big_number_unit)}</span>` : ''}</p>
      <p style="margin:8px 0 0;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.16em;color:#888;font-weight:700;">${escapeHtml(fc.big_number_label)}</p>
      <p style="margin:18px 0 0;font-family:'Noto Serif KR',serif;font-size:18px;font-weight:700;color:#121212;line-height:1.4;max-width:520px;word-break:keep-all;">${escapeHtml(fc.title)}</p>
      ${fc.body.map((p) => `<p style="margin:10px 0 0;font-family:'Noto Serif KR',serif;font-size:14px;color:#444;line-height:1.7;max-width:520px;word-break:keep-all;">${markdownToInlineBold(p)}</p>`).join('')}
    </td>
  </tr>
</table>` : '';

  // ── 4. Q&A 5블록 — Naver SmartEditor 호환을 위해 nested table 제거, 1-level stack 구조 ──
  const qaBlocks = (c.blog_qa || []).map((qa, idx) => {
    const dataBox = qa.data_box ? renderDataBoxNaver(qa.data_box) : '';
    return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 16px;border-top:1px solid #DDD;">
  <tr><td style="padding-top:18px;">
    <p style="margin:0 0 10px;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.14em;color:#BF1722;font-weight:800;">Q${idx + 1} · 학부모 인터뷰</p>
    <p style="margin:0 0 14px;font-family:'Bodoni Moda',serif;font-size:32px;font-weight:900;color:#BF1722;line-height:1;letter-spacing:-0.02em;">Q${idx + 1}.</p>
    <p style="margin:0 0 16px;font-family:'Noto Serif KR',serif;font-size:20px;font-weight:700;color:#121212;line-height:1.4;word-break:keep-all;">${escapeHtml(qa.question)}</p>
    ${qa.answer.map((p) => `<p style="margin:0 0 14px;font-family:'Noto Serif KR',serif;font-size:15px;line-height:1.85;color:#2A2A2A;word-break:keep-all;">${markdownToInlineBold(p)}</p>`).join('')}
  </td></tr>
</table>
${dataBox}`;
  }).join('\n');

  // ── 4-A. 네이버용 인포그래픽: 난이도 stacked bar + 형식 분포 (table 기반) ──
  const naverDiffBar = renderDifficultyStackedBarNaver(questions);
  const naverFormatBar = renderFormatBreakdownNaver(questions);
  const infographicsBlock = (naverDiffBar || naverFormatBar) ? `
${naverDiffBar}
${naverFormatBar}` : '';

  // ── 5. 차트 4종 인포그래픽 (단원 차트 + 변별력 차트만 임베드, 나머지는 본문 시각화로 대체) ──
  // 네이버는 외부 이미지 호스팅 권장. 시안에선 base64 사용. 실제 적용 시 CDN URL로 교체.
  const chartsBlock = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;background:#fafafa;border:1px solid #ddd;">
  <tr><td style="padding:24px 20px;">
    <p style="margin:0 0 14px;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.12em;color:#888;font-weight:700;">FIGURE · 단원별 출제 현황 (상위 8개 단원)</p>
    <img src="${chartDataUri(charts.topicBar)}" alt="단원별 출제 현황" style="max-width:100%;height:auto;display:block;margin:0 auto;" />
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;background:#fafafa;border:1px solid #ddd;">
  <tr><td style="padding:24px 20px;">
    <p style="margin:0 0 14px;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.12em;color:#888;font-weight:700;">FIGURE · 변별력 분석 (난이도·배점·형식 기반 지수)</p>
    <img src="${chartDataUri(charts.discrimination)}" alt="변별력 분석" style="max-width:100%;height:auto;display:block;margin:0 auto;" />
  </td></tr>
</table>`;

  // ── 6. 큰 인용구 ──
  const quoteBlock = c.pull_quote ? `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #121212;border-bottom:1px solid #121212;margin:32px 0;">
  <tr><td align="center" style="padding:30px 30px;">
    <p style="margin:0;font-family:'Noto Serif KR',serif;font-size:22px;font-style:italic;line-height:1.5;color:#121212;word-break:keep-all;">"${escapeHtml(c.pull_quote.text)}"</p>
    ${c.pull_quote.cite ? `<p style="margin:14px 0 0;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.14em;color:#888;font-weight:700;">${escapeHtml(c.pull_quote.cite)}</p>` : ''}
  </td></tr>
</table>` : '';

  // ── 7. 결론 박스 ──
  const conclusionBlock = c.conclusion ? `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFF8E0;border-top:3px solid #BF1722;margin:36px 0 24px;">
  <tr><td style="padding:30px 28px;">
    <p style="margin:0 0 8px;font-family:Pretendard,sans-serif;font-size:11px;letter-spacing:0.14em;color:#BF1722;font-weight:800;">${escapeHtml(c.conclusion.kicker || 'CONCLUSION · 다음 시험을 준비하는 학생에게')}</p>
    <p style="margin:0;font-family:'Noto Serif KR',serif;font-size:16px;line-height:1.85;color:#2A2A2A;word-break:keep-all;">${markdownToInlineBold(c.conclusion.body)}</p>
  </td></tr>
</table>` : '';

  // ── 8. 푸터 ──
  const footerBlock = `
<p style="margin:24px 0 0;font-family:Pretendard,sans-serif;font-size:11px;color:#888;text-align:center;">분석 · 매스랩 AI v3.2 · ${analyzedDate}${meta.schoolName ? ` · ${escapeHtml(meta.schoolName)}` : ''}</p>`;

  // ── 페이지 셸 (시안 표시용, 실제 네이버엔 들어가지 않음) ──
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>V3 시안 · 네이버 블로그 · ${escapeHtml(headline)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700&family=Bodoni+Moda:ital,wght@0,400;0,700;0,900&display=swap">
<style>
  body { background: #f0eee8; margin: 0; font-family: 'Pretendard Variable', sans-serif; color: #121212; }
  .page-shell { max-width: 1100px; margin: 0 auto; padding: 32px 24px 96px; }
  .back-meta { font-size: 12px; color: #888; margin-bottom: 18px; display: flex; gap: 12px; align-items: center; }
  .back-meta b { color: #121212; }
  .naver-note {
    background: #FFF8E0; border: 1px dashed #BF1722; padding: 12px 16px;
    font-size: 12px; color: #BF1722; font-weight: 700; margin: 0 0 18px;
    border-radius: 4px; max-width: 720px; margin-left: auto; margin-right: auto;
  }
  .naver-note b { color: #121212; }
  .naver-doc {
    background: #fff; max-width: 720px; margin: 0 auto;
    padding: 40px 20px; box-shadow: 0 0 0 1px #ddd;
  }
  .naver-doc table { border-collapse: collapse; margin: 0; padding: 0; }
  .naver-doc img { max-width: 100%; height: auto; display: block; }
</style>
</head>
<body>
<div class="page-shell">
  <div class="back-meta">
    <span>📐 <b>V3 시안 · 네이버 블로그</b> — Q&amp;A 인터뷰 (table + 인라인 style)</span>
    <span>·</span>
    <span>${escapeHtml(meta.examTitle)} (${escapeHtml(meta.grade)})</span>
    ${meta.schoolName ? `<span>·</span><span>${escapeHtml(meta.schoolName)}</span>` : ''}
    <span>·</span>
    <span>분석일 ${analyzedDate}</span>
  </div>

  <div class="naver-note">⚠ 본문 HTML은 흰 박스 안의 코드만 네이버에 붙여넣습니다. <b>모든 스타일은 인라인</b>, 표 기반 그리드 · 폭 720px 고정.</div>

  <div class="naver-doc">
<!-- ============================================== 블로그 본문 시작 ============================================== -->
${headerBlock}
${kpiBlock}
${featureBlock}
${infographicsBlock}
${qaBlocks}
${quoteBlock}
${chartsBlock}
${conclusionBlock}
${footerBlock}
<!-- ============================================== 블로그 본문 끝 ============================================== -->
  </div>
</div>
</body>
</html>`;
}

/** 네이버용 데이터 박스 (table 기반) — comparison / bars / table */
function renderDataBoxNaver(box: NonNullable<NonNullable<MergedCommentary['blog_qa']>[number]['data_box']>): string {
  const label = `<p style="margin:0 0 12px;font-family:Pretendard,sans-serif;font-size:10px;letter-spacing:0.14em;color:#888;font-weight:800;">${escapeHtml(box.label)}</p>`;

  if (box.kind === 'bars') {
    // 네이버 SmartEditor는 3-level nested table을 한 글자씩 세로 분리. 1-level로 단순화.
    const rows = box.rows.map((r) => {
      const pct = Math.max(0, Math.min(100, parseInt(r.value, 10) || 0));
      const color = r.highlight && pct < 50 ? '#BF1722' : (pct >= 80 ? '#2F7B3A' : '#121212');
      const greyPct = 100 - pct;
      // 라벨 + 값 한 줄 / bar 별도 줄 stack — nested table 없는 1-level
      return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;">
      <tr>
        <td style="padding:6px 8px 4px 0;font-family:Pretendard,sans-serif;font-size:13px;font-weight:700;color:${color};word-break:keep-all;">${escapeHtml(r.label)}</td>
        <td width="60" align="right" style="padding:6px 0 4px 8px;font-family:'Bodoni Moda',serif;font-size:14px;font-weight:700;color:${color};white-space:nowrap;">${escapeHtml(r.value)}</td>
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
      const labelColor = i === 0 ? '#fff' : (r.highlight ? '#121212' : '#121212');
      const valColor = i === 0 ? '#fff' : (r.highlight ? '#BF1722' : '#2A2A2A');
      const fontWeight = r.highlight || i === 0 ? '800' : '600';
      return `
        <tr style="${bg}">
          <td style="padding:11px 12px;font-family:Pretendard,sans-serif;font-size:12px;font-weight:${fontWeight};color:${labelColor};border-bottom:1px solid #eee;">${escapeHtml(r.label)}</td>
          <td style="padding:11px 12px;font-family:'Bodoni Moda',serif;font-size:16px;font-weight:700;color:${valColor};text-align:right;border-bottom:1px solid #eee;">${markdownToInlineBold(r.value)}</td>
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

// ── 네이버용 인포그래픽 (table 기반) ──

/** 난이도별 배점 stacked bar — 네이버 호환 (table) */
function renderDifficultyStackedBarNaver(questions: AnalyzedQuestion[]): string {
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

  // stacked bar (table 1행 + 다수 td)
  const barCells = stats.filter((s) => s.points > 0).map((s) => {
    const pct = (s.points / totalPts) * 100;
    const label = pct >= 8 ? `${Math.round(pct)}%` : '';
    return `<td width="${pct}%" height="32" align="center" style="background:${s.color};color:#fff;font-family:Pretendard,sans-serif;font-size:11px;font-weight:700;">${label}</td>`;
  }).join('');

  // legend (table 5행)
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

/** 문제 형식 분포 — 네이버 호환 (table) */
function renderFormatBreakdownNaver(questions: AnalyzedQuestion[]): string {
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

  // 카드 3개
  const cards = stats.map((s) => `
    <td width="33%" align="center" valign="top" style="padding:18px 8px;background:#fff;border:1px solid #eee;border-top:3px solid ${s.color};">
      <p style="margin:0;font-family:Pretendard,sans-serif;font-size:10px;letter-spacing:0.14em;color:#888;font-weight:700;">${s.label}</p>
      <p style="margin:6px 0 2px;font-family:'Bodoni Moda',serif;font-size:28px;font-weight:900;color:${s.color};line-height:1;">${s.count}<span style="font-size:13px;color:#888;font-weight:400;">문항</span></p>
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

// topicStats 미사용 경고 방지
void topicStats;
