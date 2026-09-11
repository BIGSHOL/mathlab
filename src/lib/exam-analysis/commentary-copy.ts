/**
 * 총평 문체(멘트) 팩 — 모듈식 템플릿의 **네 번째 축**.
 *
 * 왜 필요했나: 골격·팔레트를 바꿔도 지면에 박힌 문구가 글자 하나까지 같으면
 * 읽는 사람에겐 "같은 문서에 옷만 갈아입힌 것"으로 남는다.
 * 섹션 제목·소제목·안내 문장은 AI 생성물이 아니라 **레지스트리에 하드코딩된 UI 카피**였고,
 * 그래서 모든 템플릿에서 동일했다. 이 팩이 그걸 교체 가능한 데이터로 끌어낸다.
 *
 *   테마    = 팔레트
 *   레이아웃 = 골격
 *   variant = 블록별 표현
 *   문체    = 지면에 박히는 고정 문구  ← 여기
 *
 * ⚠️ AI 생성 텍스트(헤드라인·Q&A·총평 본문)는 건드리지 않는다. 그건 commentary 결과물이고,
 *    여기서 다루는 건 **템플릿이 소유한 문구**뿐이다.
 * ⚠️ 모든 문구는 CLAUDE.md 규칙에 따라 AI 모델명·벤더명을 노출하지 않는다.
 */

export interface CommentaryCopy {
  id: string;
  label: string;
  /** 편집 UI 설명 */
  description: string;
  /** 지면에 노출되는 작성자 표기 */
  author: string;
  /** 푸터 앞머리 (뒤에 날짜가 붙는다) */
  footerPrefix: string;

  infographicSub: string;
  infographicTitle: (totalQuestions: number) => string;
  infographicBodyFull: string;
  infographicBodyBars: string;

  difficultyTableSub: string;

  chartsSub: string;
  chartsTitle: string;
  chartsBodyGrid: string;
  chartsBodyStack: string;

  conclusionKicker: string;
  conclusionTitle: string;

  /** Q&A 섹션 소제목 (n = 1-based 질문 번호) */
  qaSubLabel: (n: number) => string;

  /** 손편지(letterBody) 맺음 서명. 없으면 블록이 author 로 폴백한다 */
  letterSignoff?: string;

  /**
   * 용어 풀이 — 학부모용 문체에서 본문 아래에 붙는 각주.
   *
   * ⚠️ **본문을 치환하지 않는다.** AI 본문에서 "변별력"을 "실력 차이가 드러나는 정도"로
   * 바꾸면 한국어 조사가 깨지고("변별력이" → "…정도이"), AI 생성 텍스트는 문체 팩이
   * 건드리지 않는다는 이 파일의 계약도 무너진다.
   * 대신 **본문에 실제로 등장한 용어만** 골라 아래에 뜻을 보여 준다.
   */
  glossary?: readonly { term: string; plain: string }[];
}

/** 에디토리얼 — 기존 문구 그대로 (회귀 기준선) */
const EDITORIAL: CommentaryCopy = {
  id: 'editorial',
  label: '에디토리얼',
  description: '설명형 존댓말 — 잡지 기사 톤 (기본)',
  author: '매스랩 AI 분석',
  footerPrefix: '분석 · 매스랩 AI',
  infographicSub: '데이터 · 시험의 얼개',
  infographicTitle: (n) => `한눈에 보는 ${n}문항의 구조`,
  infographicBodyFull:
    '난이도·문제 형식·문항 위치를 시각화하여 시험의 전반적 구성을 빠르게 파악할 수 있도록 정리했습니다. 어떤 구간에 변별이 집중되어 있고, 어디서 점수가 좌우되는지 한 페이지로 확인하세요.',
  infographicBodyBars: '난이도별 문항 수와 배점 비중을 한 줄로 정리했습니다.',
  difficultyTableSub: '데이터 · 문항별 상세',
  chartsSub: '그래프 · AI 분석 시각화',
  chartsTitle: '4개 차트로 본 시험의 통계',
  chartsBodyGrid:
    '분석 화면의 4개 도표 — 난이도 분포·능력 영역·단원 출제 현황·변별력 — 를 그대로 옮겨 왔습니다.',
  chartsBodyStack: '분석 화면의 4개 도표를 세로로 크게 배치했습니다.',
  conclusionKicker: 'CONCLUSION · 다음 시험을 준비하는 학생에게',
  conclusionTitle: '다음 시험을 준비하는 학생에게',
  qaSubLabel: (n) => `Q${n}`,
};

/** 기사체 — 단정적 종결, 신문 골격과 어울린다 */
const PRESS: CommentaryCopy = {
  id: 'press',
  label: '기사체',
  description: '단정적 종결(~이다) — 신문 기사 톤',
  author: '매스랩 분석팀',
  footerPrefix: '취재·분석 · 매스랩',
  infographicSub: '출제 분석',
  infographicTitle: (n) => `${n}문항이 드러낸 출제 의도`,
  infographicBodyFull:
    '난이도와 문제 형식, 문항 배치를 종합하면 이번 시험의 설계가 드러난다. 변별이 몰린 구간과 점수가 갈린 지점을 아래 도표에서 확인할 수 있다.',
  infographicBodyBars: '난이도별 문항 수와 배점 비중이다.',
  difficultyTableSub: '문항별 상세',
  chartsSub: '통계',
  chartsTitle: '숫자로 본 이번 시험',
  chartsBodyGrid: '난이도 분포, 능력 영역, 단원별 출제, 변별력 네 축으로 시험을 분해했다.',
  chartsBodyStack: '네 개 도표를 세로로 배치했다.',
  conclusionKicker: '전망 · 다음 시험',
  conclusionTitle: '다음 시험은 어떻게 준비할 것인가',
  qaSubLabel: (n) => `문답 ${n}`,
};

/** 보고서체 — 사무적, 리포트 골격과 어울린다 */
const OFFICIAL: CommentaryCopy = {
  id: 'official',
  label: '보고서체',
  description: '사무적 서술 — 공식 문서 톤',
  author: '매스랩 분석 시스템',
  footerPrefix: '작성 · 매스랩 분석 시스템',
  infographicSub: '시험 구성 개요',
  infographicTitle: (n) => `출제 문항 구성 분석 (총 ${n}문항)`,
  infographicBodyFull:
    '본 절에서는 난이도, 문항 형식, 문항 배치를 기준으로 시험 구성을 분석한다. 변별 집중 구간 및 배점 분포는 하단 도표를 참조한다.',
  infographicBodyBars: '난이도별 문항 수 및 배점 비중은 다음과 같다.',
  difficultyTableSub: '문항별 세부 내역',
  chartsSub: '통계 자료',
  chartsTitle: '분석 지표 요약',
  chartsBodyGrid: '난이도 분포, 능력 영역, 단원별 출제 현황, 변별력 지수 4개 지표를 도표로 제시한다.',
  chartsBodyStack: '4개 지표를 순차 제시한다.',
  conclusionKicker: '결론 및 제언',
  conclusionTitle: '학습 방향 제언',
  qaSubLabel: (n) => `${n}. 질의응답`,
};

/** 학부모 안내 — 친근한 존댓말, 카드 골격과 어울린다 */
const PARENT: CommentaryCopy = {
  id: 'parent',
  label: '학부모 안내',
  description: '친근한 존댓말 — 가정 배포용',
  author: '매스랩 AI 분석',
  footerPrefix: '분석 · 매스랩',
  infographicSub: '한눈에 보기',
  infographicTitle: (n) => `이번 시험, ${n}문항은 이렇게 나왔어요`,
  infographicBodyFull:
    '어떤 난이도의 문제가 몇 개씩 나왔는지, 서술형은 얼마나 있었는지 그림으로 정리했어요. 아이가 어느 구간에서 점수를 얻고 잃었는지 함께 살펴보세요.',
  infographicBodyBars: '난이도별로 문제가 몇 개씩 나왔는지 정리했어요.',
  difficultyTableSub: '문항별로 자세히',
  chartsSub: '그래프로 보기',
  chartsTitle: '그래프로 정리한 이번 시험',
  chartsBodyGrid: '난이도, 능력 영역, 단원별 출제, 변별력 네 가지를 그래프로 담았어요.',
  chartsBodyStack: '네 개 그래프를 크게 보여드릴게요.',
  conclusionKicker: '마무리 · 다음 시험을 위해',
  conclusionTitle: '다음 시험, 이렇게 준비하면 좋아요',
  qaSubLabel: (n) => `궁금해요 ${n}`,
  letterSignoff: '매스랩 드림',
  // 학원 안에서는 당연한 말이지만 가정에서는 처음 듣는 말들. 본문에 나온 것만 표시된다.
  glossary: [
    { term: '변별력', plain: '학생들 사이의 실력 차이가 점수로 드러나는 정도' },
    { term: '서술형', plain: '답만 쓰는 것이 아니라 풀이 과정까지 직접 써서 내는 문제' },
    { term: '킬러', plain: '한 시험에서 정답률이 가장 낮은, 가장 어려운 문제' },
    { term: '배점', plain: '문제 하나에 걸린 점수' },
    { term: '난이도', plain: '문제가 어려운 정도. 이 분석에서는 1(기본)~5(최고난도)로 나눕니다' },
    { term: '단원', plain: '교과서에서 하나의 주제로 묶어 놓은 학습 범위' },
    { term: '출제 범위', plain: '이번 시험에 나오기로 정해져 있던 단원의 범위' },
  ],
};

export const COMMENTARY_COPIES: CommentaryCopy[] = [EDITORIAL, PRESS, OFFICIAL, PARENT];

export const DEFAULT_COPY_ID = 'editorial';

export function getCommentaryCopy(id: string | null | undefined): CommentaryCopy {
  return COMMENTARY_COPIES.find((c) => c.id === id) ?? COMMENTARY_COPIES[0];
}
