/**
 * 서술형 심화 가이드 데이터
 */

export interface EssayTemplate {
  situation: string;
  template: string;
  example: string;
}

export interface EssayAdvancedGuide {
  category: string;
  title: string;
  description: string;
  templates: EssayTemplate[];
  scoringTips: string[];
}

export const ESSAY_ADVANCED_GUIDE: EssayAdvancedGuide[] = [
  {
    category: 'reasoning',
    title: '근거 명시 표현',
    description: '채점자가 논리적 흐름을 따라갈 수 있도록 근거를 명확히 제시합니다.',
    templates: [
      {
        situation: '공식/정리 적용 시',
        template: '[정리명]에 의해 ~이다.',
        example: '피타고라스 정리에 의해 c² = a² + b²이다.',
      },
      {
        situation: '조건 활용 시',
        template: '문제의 조건 "~"에서 ~을 얻는다.',
        example: '문제의 조건 "x > 0"에서 x의 범위가 양수임을 얻는다.',
      },
      {
        situation: '계산 결과 도출 시',
        template: '~이므로 ~이다.',
        example: 'x² = 4이고 x > 0이므로 x = 2이다.',
      },
      {
        situation: '논리적 귀결 시',
        template: '따라서 ~가 성립한다.',
        example: '따라서 삼각형 ABC는 직각삼각형이 성립한다.',
      },
      {
        situation: '가정 설정 시',
        template: '~라 하면 ~이다.',
        example: 'AB = x라 하면 BC = 2x이다.',
      },
    ],
    scoringTips: [
      '"~에 의해", "~이므로", "따라서"를 적절히 사용하면 논리 점수 확보',
      '공식명을 생략하지 말고 명시할 것 (예: "근의 공식에 의해")',
      '조건을 인용할 때 따옴표 또는 괄호로 표시하면 명확',
    ],
  },
  {
    category: 'structure',
    title: '논리적 전개 템플릿',
    description: '서술형 답안의 기본 구조를 따르면 채점 기준에 맞는 답안이 됩니다.',
    templates: [
      {
        situation: '증명 문제',
        template: '1. 주어진 조건 정리 → 2. 목표 명시 → 3. 단계별 추론 → 4. 결론',
        example: '[조건] ABC가 직각삼각형 → [목표] c² = a² + b² 증명 → [추론] 직각의 위치... → [결론] 따라서 성립',
      },
      {
        situation: '값 구하기 문제',
        template: '1. 미지수 설정 → 2. 조건을 식으로 표현 → 3. 방정식 풀이 → 4. 검산 및 답',
        example: '[설정] x = AB의 길이 → [식] 2x + 3 = 15 → [풀이] x = 6 → [답] AB = 6',
      },
      {
        situation: '그래프 해석 문제',
        template: '1. 함수식 확인 → 2. 주요 특성 파악 → 3. 조건 대입 → 4. 결론 도출',
        example: '[함수] y = x² - 4x + 3 → [특성] 꼭짓점 (2, -1) → [조건] x = 0 대입 → [결론] y절편 3',
      },
    ],
    scoringTips: [
      '각 단계를 줄 바꿈으로 구분하면 가독성 향상',
      '단계 번호(①②③ 또는 1.2.3.)를 붙이면 구조 점수 확보',
      '마지막에 "∴ 답: ~" 형식으로 명확히 표기',
    ],
  },
  {
    category: 'scoring',
    title: '채점 기준 역설계',
    description: '교사가 채점표를 만드는 방식을 이해하면 부분점수를 최대화할 수 있습니다.',
    templates: [
      {
        situation: '일반적 채점 배점',
        template: '풀이 시작 (1점) → 핵심 공식 적용 (2점) → 중간 결과 (1점) → 최종 답 (1점)',
        example: '5점 문제: 식 세우기 1점 + 공식 적용 2점 + 계산 1점 + 답 1점',
      },
      {
        situation: '증명 문제 채점',
        template: '조건 파악 (1점) → 논리 전개 (2-3점) → 결론 도출 (1점)',
        example: '4점 증명: 가정 명시 1점 + 추론 과정 2점 + 결론 1점',
      },
      {
        situation: '도형 문제 채점',
        template: '보조선/설정 (1점) → 관계식 유도 (2점) → 계산 (1점) → 답 (1점)',
        example: '5점 도형: 직각삼각형 찾기 1점 + 피타고라스 적용 2점 + 계산 1점 + 답 1점',
      },
    ],
    scoringTips: [
      '시간이 부족해도 "식 세우기"만으로 부분점수 획득 가능',
      '답을 모르더라도 알고 있는 공식을 적용한 과정은 점수가 됨',
      '최종 답이 틀려도 풀이 과정이 맞으면 대부분 점수 부여',
      '"식만 쓰고 넘어가는 것"보다 "틀려도 끝까지 푸는 것"이 유리',
    ],
  },
  {
    category: 'common_deductions',
    title: '흔한 감점 사유',
    description: '자주 발생하는 감점 유형을 미리 파악하고 방지합니다.',
    templates: [
      {
        situation: '등호 오용',
        template: '3 = 2x = x + 1 (X) → 2x = 3, 따라서 x = 1.5 (O)',
        example: '연속 등호 사용 금지: 각 식을 개별 문장으로 분리',
      },
      {
        situation: '단위 누락',
        template: 'x = 5 (X) → x = 5 cm (O)',
        example: '길이, 넓이, 부피 등 단위가 있는 문제는 반드시 단위 표기',
      },
      {
        situation: '범위 조건 무시',
        template: 'x = ±3 (X, x > 0 조건 무시) → x = 3 (O)',
        example: '문제 조건에 명시된 범위를 항상 확인하고 적용',
      },
      {
        situation: '검산 생략',
        template: '무연근이 발생하는 문제에서 대입 검증 없이 답 제출',
        example: '분수방정식, 무리방정식은 반드시 원래 식에 대입하여 검산',
      },
    ],
    scoringTips: [
      '등호(=)를 한 줄에 하나만 사용하는 습관',
      '계산 끝나면 단위 체크',
      '조건이 있으면 답에서 필터링',
      '시간 남으면 주요 문제 검산',
    ],
  },
];

/**
 * 서술형 가이드 카테고리별 조회
 */
export function getEssayGuideByCategory(category: string): EssayAdvancedGuide | null {
  return ESSAY_ADVANCED_GUIDE.find(g => g.category === category) || null;
}
