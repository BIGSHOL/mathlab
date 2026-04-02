/**
 * 기출 분석 블로그 글 SEO 점수 엔진 (클라이언트 사이드)
 *
 * NaverSEO Pro의 seo/engine.ts에서 핵심 6항목만 추출
 * 네이버 C-Rank / D.I.A. 기준에 최적화
 */

// ── 타입 ──

export interface ArticleSeoCategory {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  details: string;
}

export interface ArticleSeoScore {
  totalScore: number;   // 0~100
  categories: ArticleSeoCategory[];
  suggestions: string[];
}

// ── HTML 텍스트 추출 유틸 ──

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function countOccurrences(text: string, keyword: string): number {
  if (!keyword.trim()) return 0;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = text.match(new RegExp(escaped, 'gi'));
  return matches?.length || 0;
}

// ── 개별 분석 함수 (NaverSEO Pro에서 이식) ──

/** 1. 제목 키워드 (15점) — 키워드가 제목 앞쪽 15자 이내 */
function analyzeTitleKeyword(keyword: string, title: string): ArticleSeoCategory {
  if (!keyword.trim()) {
    return { id: 'title_keyword', name: '제목 키워드', score: 0, maxScore: 15, details: '키워드 미지정' };
  }

  const pos = title.indexOf(keyword);
  let score = 0;

  if (pos >= 0) {
    score = pos <= 15 ? 15 : 10; // 앞쪽이면 만점, 뒤쪽이면 부분점
  }

  return {
    id: 'title_keyword',
    name: '제목 키워드',
    score,
    maxScore: 15,
    details: pos >= 0 ? `키워드 위치: ${pos + 1}번째 글자` : '제목에 키워드 미포함',
  };
}

/** 2. 소제목 구조 (20점) — H2 ≥ 4개, H3 ≥ 1개 */
function analyzeHeadingStructure(html: string): ArticleSeoCategory {
  const h2Count = (html.match(/<h2[\s>]/gi) || []).length;
  const h3Count = (html.match(/<h3[\s>]/gi) || []).length;

  let score = 0;
  if (h2Count >= 4) score += 12;
  else if (h2Count >= 3) score += 9;
  else if (h2Count >= 2) score += 6;
  else if (h2Count >= 1) score += 3;

  if (h3Count >= 2) score += 8;
  else if (h3Count >= 1) score += 5;

  return {
    id: 'heading_structure',
    name: '소제목 구조',
    score: Math.min(score, 20),
    maxScore: 20,
    details: `H2: ${h2Count}개, H3: ${h3Count}개`,
  };
}

/** 3. 키워드 밀도 (15점) — 핵심 키워드 5~8회 (0.5~2%) */
function analyzeKeywordDensity(keyword: string, html: string): ArticleSeoCategory {
  const text = stripHtml(html);
  const count = countOccurrences(text, keyword);
  const charLen = text.length;
  const density = charLen > 0 ? (count * keyword.length / charLen) * 100 : 0;

  let score = 0;
  if (count >= 5 && count <= 8) score = 15;
  else if (count >= 3 && count <= 12) score = 10;
  else if (count >= 1) score = 5;

  return {
    id: 'keyword_density',
    name: '키워드 밀도',
    score,
    maxScore: 15,
    details: `키워드 ${count}회 (밀도 ${density.toFixed(1)}%)`,
  };
}

/** 4. 글 길이 (20점) — 2000~4000자 최적 */
function analyzeContentLength(html: string): ArticleSeoCategory {
  const text = stripHtml(html);
  const len = text.length;

  let score = 0;
  if (len >= 2000 && len <= 4000) score = 20;
  else if (len >= 1500 && len <= 5000) score = 15;
  else if (len >= 1000) score = 10;
  else if (len >= 500) score = 5;

  return {
    id: 'content_length',
    name: '글 길이',
    score,
    maxScore: 20,
    details: `${len.toLocaleString()}자`,
  };
}

/** 5. 이미지 (15점) — <img> 태그 3개 이상 */
function analyzeImages(html: string): ArticleSeoCategory {
  const imgCount = (html.match(/<img[\s>]/gi) || []).length;

  let score = 0;
  if (imgCount >= 5) score = 15;
  else if (imgCount >= 3) score = 12;
  else if (imgCount >= 2) score = 8;
  else if (imgCount >= 1) score = 4;

  return {
    id: 'images',
    name: '이미지',
    score,
    maxScore: 15,
    details: `이미지 ${imgCount}개`,
  };
}

/** 6. 태그 & 가독성 (15점) — 7~10개 태그, 문단 2~4문장 */
function analyzeTagsReadability(html: string, tags: string[]): ArticleSeoCategory {
  let score = 0;

  // 태그 점수 (8점)
  if (tags.length >= 7 && tags.length <= 10) score += 8;
  else if (tags.length >= 5) score += 6;
  else if (tags.length >= 3) score += 4;
  else if (tags.length >= 1) score += 2;

  // 가독성 점수 (7점) — 문단 길이 체크
  const paragraphs = html.split(/<\/p>/i).filter((p) => stripHtml(p).length > 10);
  const avgParagraphLen = paragraphs.length > 0
    ? paragraphs.reduce((s, p) => s + stripHtml(p).length, 0) / paragraphs.length
    : 0;

  if (avgParagraphLen > 0 && avgParagraphLen <= 200) score += 7; // 짧은 문단 = 좋음
  else if (avgParagraphLen <= 300) score += 5;
  else if (avgParagraphLen <= 400) score += 3;

  return {
    id: 'tags_readability',
    name: '태그 & 가독성',
    score: Math.min(score, 15),
    maxScore: 15,
    details: `태그 ${tags.length}개, 평균 문단 ${Math.round(avgParagraphLen)}자`,
  };
}

// ── 메인 분석 함수 ──

export function analyzeArticleSeo(
  keyword: string,
  title: string,
  htmlContent: string,
  tags: string[],
): ArticleSeoScore {
  const categories = [
    analyzeTitleKeyword(keyword, title),
    analyzeHeadingStructure(htmlContent),
    analyzeKeywordDensity(keyword, htmlContent),
    analyzeContentLength(htmlContent),
    analyzeImages(htmlContent),
    analyzeTagsReadability(htmlContent, tags),
  ];

  const totalScore = categories.reduce((s, c) => s + c.score, 0);

  // 개선 제안 생성
  const suggestions: string[] = [];
  for (const cat of categories) {
    const ratio = cat.score / cat.maxScore;
    if (ratio < 0.7) {
      switch (cat.id) {
        case 'title_keyword':
          suggestions.push('제목 앞쪽 15자 이내에 핵심 키워드를 배치하세요');
          break;
        case 'heading_structure':
          suggestions.push('H2 소제목을 4개 이상, H3를 1개 이상 사용하세요');
          break;
        case 'keyword_density':
          suggestions.push('핵심 키워드를 본문에 5~8회 자연스럽게 포함하세요');
          break;
        case 'content_length':
          suggestions.push('글 길이를 2,000~4,000자로 조정하세요');
          break;
        case 'images':
          suggestions.push('차트 이미지를 3장 이상 포함하세요');
          break;
        case 'tags_readability':
          suggestions.push('해시태그를 7~10개 추가하고 문단을 짧게 나누세요');
          break;
      }
    }
  }

  return { totalScore, categories, suggestions };
}
