// 자동 생성 — scripts/bake-demo-naver-blocks.mjs (수정하지 말 것)
// 데모 [이미지 복사]용 사전 베이크(열화) 캡처 목록 — public/demo-naver/* 정적 자산 + 캡션.
export interface DemoNaverBlock {
  path: string;    // public 자산 경로 (origin 붙여 절대 URL로 사용)
  summary: string; // 이미지 아래 캡션 (실제 플로우의 summaryOf와 동일 규칙)
}

export const DEMO_NAVER_BLOCKS: Record<string, DemoNaverBlock[]> = {
  "고1": [
    {
      "path": "/demo-naver/g1/s1.jpg",
      "summary": "킬러 6문항 중 4개가 방정식과 부등식에 몰렸다 — 심화 문항의 쏠림이 뚜렷합니다."
    },
    {
      "path": "/demo-naver/g1/s2.jpg",
      "summary": ""
    },
    {
      "path": "/demo-naver/g1/s3.jpg",
      "summary": "킬러 6문항 중 4개가 한 영역에 쏠렸다 — 이번 시험의 4단계~5단계 킬러 문항은 총 6개입니다."
    },
    {
      "path": "/demo-naver/g1/s4.jpg",
      "summary": "데이터 · 시험의 얼개 — 난이도·문제 형식·문항 위치를 시각화하여 시험의 전반적 구성을 빠르게 파악할 수 있도록 정리했습니다."
    },
    {
      "path": "/demo-naver/g1/s5.jpg",
      "summary": "데이터 · 문항별 상세"
    },
    {
      "path": "/demo-naver/g1/s6.jpg",
      "summary": "Q1 — 총 20문항 100점으로, 선택형 13문항(50점)과 서술형 7문항(50점)이 정확히 반반입니다."
    },
    {
      "path": "/demo-naver/g1/s7.jpg",
      "summary": "Q2 — 배점 기준으로 가장 비중이 큰 단원은 나머지정리(16점)와 복소수의 연산(16점)으로 각각 전체의 16%를 차지합니다."
    },
    {
      "path": "/demo-naver/g1/s8.jpg",
      "summary": "Q3 — 서술형 7문항(50점)의 출제 단원은 다항식의 곱셈과 나눗셈·항등식·고차식 인수분해·나머지정리(다항식 영역)와 복소수의 연산·이차방정식의 근과 계수의 관계·이차함수의 최대·최소(방정식과 부등식 영역)로 양 영역에 고르게 분포합니다."
    },
    {
      "path": "/demo-naver/g1/s9.jpg",
      "summary": "Q4 — 첫째, 복소수의 연산과 이차함수의 최대·최소를 4단계 수준까지 완성하세요."
    },
    {
      "path": "/demo-naver/g1/s10.jpg",
      "summary": "분석 · 출제 핵심 포인트 — 3문항 16점으로 단일 단원 최고 배점을 기록했습니다."
    },
    {
      "path": "/demo-naver/g1/s11.jpg",
      "summary": "핵심 · 주요 문항 해설 — 이번 시험의 최고난도 문항입니다."
    },
    {
      "path": "/demo-naver/g1/s12.jpg",
      "summary": "\"킬러의 무게중심이 방정식과 부등식 한 곳에 쏠린 시험\""
    },
    {
      "path": "/demo-naver/g1/s13.jpg",
      "summary": "피드백 · 단원별 학습 방향"
    },
    {
      "path": "/demo-naver/g1/s14.jpg",
      "summary": "다음 시험을 준비하는 학생에게 — 이번 시험의 핵심은 '방정식과 부등식' 영역의 심화 완성도입니다."
    }
  ],
  "중2": [
    {
      "path": "/demo-naver/m2/s1.jpg",
      "summary": "일차부등식 한 단원이 변별의 무게중심을 쥐었다 — 전체 22문항 중 일차부등식이 33점(33%)을 차지하며, 심화 서술형 2문항(14점)이 이 단원에 집중됐습니다."
    },
    {
      "path": "/demo-naver/m2/s2.jpg",
      "summary": ""
    },
    {
      "path": "/demo-naver/m2/s3.jpg",
      "summary": "전체 배점의 33%가 일차부등식 한 단원에서 나온다 — 이번 시험은 22문항 100점 중 일차부등식 단원에서만 7문항 33점이 출제됐습니다."
    },
    {
      "path": "/demo-naver/m2/s4.jpg",
      "summary": "데이터 · 시험의 얼개 — 난이도·문제 형식·문항 위치를 시각화하여 시험의 전반적 구성을 빠르게 파악할 수 있도록 정리했습니다."
    },
    {
      "path": "/demo-naver/m2/s5.jpg",
      "summary": "데이터 · 문항별 상세"
    },
    {
      "path": "/demo-naver/m2/s6.jpg",
      "summary": "Q1 — 총 22문항 100점으로, 난이도는 기본(1단계) 2문항·표준(2단계) 7문항·응용(3단계) 9문항·심화(4단계) 4문항으로 구성됐습니다."
    },
    {
      "path": "/demo-naver/m2/s7.jpg",
      "summary": "Q2 — 배점 기준으로 가장 비중이 큰 단원은 일차부등식(7문항 33점)과 유리수와 순환소수(7문항 31점)입니다."
    },
    {
      "path": "/demo-naver/m2/s8.jpg",
      "summary": "Q3 — 서술형 6문항(40점)은 유리수(서답형1·5, 13점), 다항식의 계산(서답형2, 6점), 단항식의 계산(서답형3, 7점), 일차부등식(서답형4·6, 14점)에서 고르게 출제됐습니다."
    },
    {
      "path": "/demo-naver/m2/s9.jpg",
      "summary": "Q4 — 첫째, 일차부등식 서술형 풀이 형식을 반드시 훈련하세요."
    },
    {
      "path": "/demo-naver/m2/s10.jpg",
      "summary": "분석 · 출제 핵심 포인트 — 7문항 31점으로 기본 정의 확인(1번)부터 규칙성 활용(11번), 소인수분해 조건 탐구(15번), 서술형 조건 탐구(서답형5)까지 1단계~4단계 전 구간에 걸쳐 출제됐습니다."
    },
    {
      "path": "/demo-naver/m2/s11.jpg",
      "summary": "핵심 · 주요 문항 해설 — 실생활 맥락에서 조건을 부등식으로 변환하고 해를 구하는 심화 문항입니다."
    },
    {
      "path": "/demo-naver/m2/s12.jpg",
      "summary": "\"일차부등식 서술형 2문항, 14점이 이번 시험의 진짜 변별 지점이다.\""
    },
    {
      "path": "/demo-naver/m2/s13.jpg",
      "summary": "피드백 · 단원별 학습 방향"
    },
    {
      "path": "/demo-naver/m2/s14.jpg",
      "summary": "다음 시험을 준비하는 학생에게 — 이번 시험의 핵심은 일차부등식 서술형 2문항(14점)을 얼마나 안정적으로 가져가느냐입니다."
    }
  ],
  "중3": [
    {
      "path": "/demo-naver/m3/s1.jpg",
      "summary": "표준에서 시작해 심화로 가르는 응용력의 분기점 — 1단계 기본 문항이 단 한 문제도 없고, 전체 21문항이 표준~심화로만 구성됐습니다."
    },
    {
      "path": "/demo-naver/m3/s2.jpg",
      "summary": ""
    },
    {
      "path": "/demo-naver/m3/s3.jpg",
      "summary": "100점 중 40점이 풀이 과정에서 결정된다 — 이번 시험은 서술형 5문항이 각 8점씩 총 40점을 차지합니다."
    },
    {
      "path": "/demo-naver/m3/s4.jpg",
      "summary": "데이터 · 시험의 얼개 — 난이도·문제 형식·문항 위치를 시각화하여 시험의 전반적 구성을 빠르게 파악할 수 있도록 정리했습니다."
    },
    {
      "path": "/demo-naver/m3/s5.jpg",
      "summary": "데이터 · 문항별 상세"
    },
    {
      "path": "/demo-naver/m3/s6.jpg",
      "summary": "Q1 — 총 21문항 100점 만점으로, 실수와 그 연산 영역과 다항식의 곱셈·인수분해 영역이 균형 있게 출제됐습니다."
    },
    {
      "path": "/demo-naver/m3/s7.jpg",
      "summary": "Q2 — 제곱근의 계산이 6문항 29점으로 가장 큰 비중을 차지합니다."
    },
    {
      "path": "/demo-naver/m3/s8.jpg",
      "summary": "Q3 — 서술형 5문항은 모두 8점씩 배점되며, 절댓값 조건 판별(서답형1·4단계), 무리수의 정수·소수 부분 구하기(서답형2·3단계), 혼합 계산(서답형3·3단계), 잘못 본 식 유추(서답형4·4단계), 도형 활용 인수분해(서답형5·3단계)로 구성됐"
    },
    {
      "path": "/demo-naver/m3/s9.jpg",
      "summary": "Q4 — 첫째, 제곱근의 계산 반복 훈련이 최우선입니다."
    },
    {
      "path": "/demo-naver/m3/s10.jpg",
      "summary": "분석 · 출제 핵심 포인트 — 전체 시험에서 가장 큰 비중인 6문항 29점이 출제됐습니다."
    },
    {
      "path": "/demo-naver/m3/s11.jpg",
      "summary": "핵심 · 주요 문항 해설 — 이 문항은 근호를 포함한 복합 계산에서 상위권을 변별하는 핵심 문항입니다."
    },
    {
      "path": "/demo-naver/m3/s12.jpg",
      "summary": "\"1단계이 없는 시험, 표준부터 시작해 서술형 40점이 등급을 가른다.\""
    },
    {
      "path": "/demo-naver/m3/s13.jpg",
      "summary": "피드백 · 단원별 학습 방향"
    },
    {
      "path": "/demo-naver/m3/s14.jpg",
      "summary": "다음 시험을 준비하는 학생에게 — 이번 시험의 핵심은 '개념 암기'가 아니라 '원리 적용'입니다."
    }
  ]
};

export function getDemoNaverBlocks(grade: string): DemoNaverBlock[] {
  return DEMO_NAVER_BLOCKS[grade] ?? [];
}
