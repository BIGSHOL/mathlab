/**
 * 교육과정 기반 킬러 문항 패턴 및 학년별 연계 데이터
 * Math Report curriculum-strategies 모듈에서 이식
 */

import type { AnalyzedQuestion } from '../types';

// ── 킬러 문항 패턴 ──

export interface KillerPattern {
  unitName: string;
  patterns: {
    name: string;
    trapDescription: string;
    solutionKeys: string[];
    difficultyLevel: 'reasoning' | 'creative';
  }[];
}

const KILLER_PATTERNS_DB: KillerPattern[] = [
  {
    unitName: '다항식',
    patterns: [
      {
        name: '조립제법 함정',
        trapDescription: '나머지정리와 조립제법에서 나누는 식의 계수를 잘못 처리하는 함정',
        solutionKeys: [
          '나누는 식이 (ax-b) 형태일 때 a를 반드시 확인',
          '조립제법 사용 시 x=b/a를 대입',
          '나머지정리: f(b/a)가 나머지임을 숙지',
        ],
        difficultyLevel: 'reasoning',
      },
      {
        name: '인수분해 완전성',
        trapDescription: '인수분해를 끝까지 하지 않고 중간 단계에서 멈추는 실수',
        solutionKeys: [
          '인수분해 후 각 인수가 더 분해 가능한지 반드시 확인',
          '복이차식 → 치환 후 인수분해 → 재치환 과정 완료',
          '공통인수 먼저 묶고, 나머지를 계속 분해',
        ],
        difficultyLevel: 'reasoning',
      },
    ],
  },
  {
    unitName: '방정식과 부등식',
    patterns: [
      {
        name: '이차방정식 판별식 함정',
        trapDescription: '판별식 D를 사용할 때 계수 정리를 잘못하거나, D≥0과 D>0 조건을 혼동',
        solutionKeys: [
          'ax²+bx+c=0 표준형으로 정리 후 D=b²-4ac 적용',
          '실근 → D≥0, 서로 다른 실근 → D>0 구별',
          '이차항의 계수가 0이 되는 경우도 확인',
        ],
        difficultyLevel: 'creative',
      },
      {
        name: '절대값 부등식 경우 분리',
        trapDescription: '절대값 안의 식이 0이 되는 점을 경계로 경우를 나누지 않는 실수',
        solutionKeys: [
          '절대값 안의 식=0이 되는 x값 먼저 구하기',
          '각 구간에서 절대값 벗기기 (부호 주의)',
          '구간별 해를 합집합으로 결합',
        ],
        difficultyLevel: 'creative',
      },
    ],
  },
  {
    unitName: '도형의 방정식',
    patterns: [
      {
        name: '원과 직선 위치관계',
        trapDescription: '원의 중심에서 직선까지의 거리 공식 적용 시 부호나 절대값 처리 오류',
        solutionKeys: [
          '점과 직선 사이 거리 공식에서 분모의 절대값 확인',
          '판별식과 거리 공식 두 가지 방법으로 교차 검증',
          '접선 조건: d=r 또는 D=0 두 방법 모두 시도',
        ],
        difficultyLevel: 'reasoning',
      },
    ],
  },
  {
    unitName: '함수',
    patterns: [
      {
        name: '합성함수 정의역',
        trapDescription: '(f∘g)(x)=f(g(x))에서 g(x)의 치역이 f의 정의역에 포함되는지 확인하지 않는 실수',
        solutionKeys: [
          'g(x)의 치역 구하기 → f의 정의역과 비교',
          '합성 순서: 먼저 안쪽 함수 적용, 그 결과를 바깥 함수에 적용',
          '역함수 합성 시 (f∘f⁻¹)(x)=x는 f의 정의역에서만 성립',
        ],
        difficultyLevel: 'reasoning',
      },
      {
        name: '역함수 존재 조건',
        trapDescription: '일대일 대응이 아닌 함수에서 역함수를 구하려는 실수',
        solutionKeys: [
          '역함수 존재 → 원래 함수가 일대일 대응이어야 함',
          '정의역 제한으로 일대일로 만들 수 있는지 확인',
          'y=f(x) → x=f⁻¹(y) 변환 후 x, y 교환',
        ],
        difficultyLevel: 'creative',
      },
    ],
  },
  {
    unitName: '수열',
    patterns: [
      {
        name: 'Sn과 an 관계 함정',
        trapDescription: 'n=1일 때와 n≥2일 때를 분리하지 않고 일반항을 구하는 실수',
        solutionKeys: [
          'a₁=S₁, aₙ=Sₙ-Sₙ₋₁ (n≥2) 반드시 분리',
          'n=1 대입하여 일반항이 성립하는지 검증',
          '성립하지 않으면 조건 분기 서술 필수',
        ],
        difficultyLevel: 'creative',
      },
    ],
  },
  {
    unitName: '확률과 통계',
    patterns: [
      {
        name: '독립/종속 사건 혼동',
        trapDescription: '독립사건과 종속사건의 확률 계산에서 조건부확률을 누락',
        solutionKeys: [
          '독립: P(A∩B)=P(A)·P(B)',
          '종속: P(A∩B)=P(A)·P(B|A)',
          '비복원추출 → 종속사건, 복원추출 → 독립사건',
        ],
        difficultyLevel: 'reasoning',
      },
    ],
  },
  {
    unitName: '미적분',
    patterns: [
      {
        name: '미분가능성 vs 연속성',
        trapDescription: '연속이면 미분가능하다고 잘못 판단하는 실수 (역은 성립하지 않음)',
        solutionKeys: [
          '미분가능 → 연속 (참), 연속 → 미분가능 (거짓)',
          '|x| 같은 뾰족한 점에서는 연속이지만 미분불가능',
          '좌미분계수와 우미분계수가 같아야 미분가능',
        ],
        difficultyLevel: 'creative',
      },
      {
        name: '정적분 부호 처리',
        trapDescription: '적분 구간에서 함수가 음수인 부분의 넓이를 양수로 처리하지 않는 실수',
        solutionKeys: [
          '넓이 구할 때는 |f(x)|를 적분 (부호 분리 필수)',
          'f(x)=0인 점을 경계로 구간 나누기',
          '정적분 값과 넓이는 다른 개념임을 인식',
        ],
        difficultyLevel: 'reasoning',
      },
    ],
  },
  {
    unitName: '기하',
    patterns: [
      {
        name: '벡터 내적 부호',
        trapDescription: '두 벡터가 이루는 각이 90° 초과일 때 내적이 음수가 됨을 간과',
        solutionKeys: [
          'a·b=|a||b|cosθ에서 θ>90° → cosθ<0 → a·b<0',
          '내적=0 → 수직, 내적<0 → 둔각',
          '좌표 성분 계산과 공식 결과 부호 교차 검증',
        ],
        difficultyLevel: 'reasoning',
      },
    ],
  },
];

/**
 * 분석된 문항들에서 킬러 패턴이 해당되는 단원을 찾아 반환
 */
export function findKillerPatterns(questions: AnalyzedQuestion[]): KillerPattern[] {
  // 문항에서 언급된 단원(topic)들 수집
  const topics = new Set(
    questions
      .filter(q => q.topic)
      .map(q => q.topic!)
      .flatMap(t => {
        // "수학 > 대단원 > 소단원" 형식에서 각 레벨 추출
        const parts = t.split(' > ').map(s => s.trim());
        return parts;
      }),
  );

  // 고난도 문항이 있는 단원 확인
  const hardTopics = new Set(
    questions
      .filter(q => q.difficulty === 'reasoning' || q.difficulty === 'creative')
      .filter(q => q.topic)
      .flatMap(q => q.topic!.split(' > ').map(s => s.trim())),
  );

  // 매칭되는 킬러 패턴 반환
  return KILLER_PATTERNS_DB.filter(kp => {
    // 단원명이 topics에 포함되거나, 부분 매칭
    return topics.has(kp.unitName) ||
      [...topics].some(t => t.includes(kp.unitName) || kp.unitName.includes(t)) ||
      [...hardTopics].some(t => t.includes(kp.unitName) || kp.unitName.includes(t));
  });
}

// ── 학년별 연계 데이터 ──

export interface GradeConnection {
  majorUnit: string;
  connections: {
    fromGrade: string;
    toGrade: string;
    importance: 'critical' | 'high' | 'recommended';
    warning: string;
  }[];
}

const GRADE_CONNECTIONS_DB: GradeConnection[] = [
  {
    majorUnit: '다항식',
    connections: [
      {
        fromGrade: '중3 인수분해',
        toGrade: '고1 다항식',
        importance: 'critical',
        warning: '중3 인수분해 공식(합차, 완전제곱식)을 모르면 고1 다항식 전체가 어려워집니다.',
      },
      {
        fromGrade: '중2 단항식·다항식',
        toGrade: '고1 다항식',
        importance: 'high',
        warning: '다항식의 덧셈·뺄셈·곱셈 기초가 부족하면 나머지정리, 인수분해 응용이 힘듭니다.',
      },
    ],
  },
  {
    majorUnit: '방정식과 부등식',
    connections: [
      {
        fromGrade: '중3 이차방정식',
        toGrade: '고1 이차방정식·부등식',
        importance: 'critical',
        warning: '근의 공식과 판별식은 고1 전 범위에서 사용됩니다. 반드시 완벽하게 숙달하세요.',
      },
      {
        fromGrade: '중2 연립방정식',
        toGrade: '고1 연립부등식',
        importance: 'high',
        warning: '연립방정식의 가감법·대입법이 부등식 풀이에서도 그대로 활용됩니다.',
      },
      {
        fromGrade: '중1 일차방정식',
        toGrade: '중2 연립방정식',
        importance: 'recommended',
        warning: '일차방정식 풀이가 불안정하면 연립방정식에서 계산 실수가 빈번해집니다.',
      },
    ],
  },
  {
    majorUnit: '함수',
    connections: [
      {
        fromGrade: '중3 이차함수',
        toGrade: '고1 이차함수 심화',
        importance: 'critical',
        warning: '이차함수의 그래프(꼭짓점, 축, 개형)를 정확히 알아야 고1 최대·최소 문제를 풀 수 있습니다.',
      },
      {
        fromGrade: '중1 정비례·반비례',
        toGrade: '중2 일차함수',
        importance: 'high',
        warning: '함수의 기본 개념(정의역, 치역, 대응)이 흔들리면 이후 모든 함수 단원에 영향을 줍니다.',
      },
      {
        fromGrade: '중2 일차함수',
        toGrade: '고1 함수',
        importance: 'recommended',
        warning: '일차함수 그래프 해석 능력은 합성함수, 역함수 학습의 기초입니다.',
      },
    ],
  },
  {
    majorUnit: '도형의 방정식',
    connections: [
      {
        fromGrade: '중3 피타고라스 정리',
        toGrade: '고1 좌표평면·원의 방정식',
        importance: 'critical',
        warning: '두 점 사이의 거리 공식이 피타고라스 정리에서 유도됩니다. 필수 선수학습입니다.',
      },
      {
        fromGrade: '중2 일차함수 그래프',
        toGrade: '고1 직선의 방정식',
        importance: 'high',
        warning: '기울기와 y절편의 개념이 직선의 방정식의 기초입니다.',
      },
    ],
  },
  {
    majorUnit: '수열',
    connections: [
      {
        fromGrade: '중1 규칙성',
        toGrade: '고1 등차·등비수열',
        importance: 'high',
        warning: '규칙 찾기와 일반항 표현이 수열의 출발점입니다.',
      },
      {
        fromGrade: '고1 등차·등비수열',
        toGrade: '수학II 급수',
        importance: 'critical',
        warning: '등차·등비급수의 합 공식을 모르면 급수 단원을 진행할 수 없습니다.',
      },
    ],
  },
  {
    majorUnit: '확률과 통계',
    connections: [
      {
        fromGrade: '중3 대표값·산포도',
        toGrade: '고1 확률·통계',
        importance: 'high',
        warning: '평균, 분산, 표준편차 계산이 고등 통계의 기본 토대입니다.',
      },
      {
        fromGrade: '중2 경우의 수',
        toGrade: '고1 순열·조합',
        importance: 'critical',
        warning: '경우의 수의 곱·합의 법칙이 순열·조합 전체에 사용됩니다.',
      },
    ],
  },
  {
    majorUnit: '미적분',
    connections: [
      {
        fromGrade: '고1 함수의 극한',
        toGrade: '미적분 미분법',
        importance: 'critical',
        warning: '극한의 개념과 계산이 미분의 정의 자체입니다. 극한이 약하면 미적분 전체가 무너집니다.',
      },
      {
        fromGrade: '고1 다항함수 미분',
        toGrade: '미적분 초월함수 미분',
        importance: 'high',
        warning: '다항함수 미분 공식이 완벽해야 삼각·지수·로그함수 미분으로 확장 가능합니다.',
      },
    ],
  },
  {
    majorUnit: '기하',
    connections: [
      {
        fromGrade: '고1 도형의 방정식',
        toGrade: '기하 벡터',
        importance: 'critical',
        warning: '좌표평면에서의 점, 직선, 원 개념이 벡터의 기하학적 해석에 필수입니다.',
      },
      {
        fromGrade: '중3 삼각비',
        toGrade: '기하 이차곡선',
        importance: 'high',
        warning: '삼각비(sin, cos, tan)와 피타고라스 정리가 이차곡선 분석에 핵심적으로 사용됩니다.',
      },
    ],
  },
];

/**
 * 분석된 문항들에서 관련 학년 연계 정보를 찾아 반환
 */
export function findGradeConnections(questions: AnalyzedQuestion[]): GradeConnection[] {
  // 문항에서 언급된 단원(topic)들 수집
  const topics = new Set(
    questions
      .filter(q => q.topic)
      .map(q => q.topic!)
      .flatMap(t => {
        const parts = t.split(' > ').map(s => s.trim());
        return parts;
      }),
  );

  // 매칭되는 학년 연계 반환
  return GRADE_CONNECTIONS_DB.filter(gc => {
    return topics.has(gc.majorUnit) ||
      [...topics].some(t => t.includes(gc.majorUnit) || gc.majorUnit.includes(t));
  });
}
