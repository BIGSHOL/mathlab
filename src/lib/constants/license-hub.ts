import {
  BookOpen, Calculator, Zap, ClipboardCheck, Swords,
  Stethoscope, Radio, FileSearch, CalendarCheck, FileSpreadsheet, Target, CheckSquare, BookText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { LicenseFeature } from '@prisma/client';

export interface LicenseFeatureInfo {
  label: string;
  description: string;
  studentCapabilities: string[];
  teacherLinks: Array<{ label: string; href: string }>;
  icon: LucideIcon;
  /** tailwind bg 색상 클래스 (예: 'bg-blue-500') */
  color: string;
  /** tailwind text 색상 클래스 (예: 'text-blue-500') */
  textColor: string;
}

export const LICENSE_FEATURE_INFO: Record<LicenseFeature, LicenseFeatureInfo> = {
  CONCEPT: {
    label: '개념 학습',
    description: '교과서 개념을 읽고, 5단계 빈칸 암기로 완벽하게 익힙니다',
    studentCapabilities: ['개념 읽기', '빈칸 1~3단계', '통문장 암기', '백지 복원', '학습 과정 수강'],
    teacherLinks: [
      { label: '개념 관리', href: '/concepts' },
      { label: '학습 과정', href: '/courses' },
    ],
    icon: BookOpen,
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
  },
  ARITHMETIC: {
    label: '연산 연습',
    description: '79개 카테고리의 무한 연산 문제로 계산력을 키웁니다',
    studentCapabilities: ['79개 연산 카테고리', '난이도별 연습', '정답률 추적'],
    teacherLinks: [
      { label: '연산 생성기', href: '/questions?tab=arithmetic' },
    ],
    icon: Calculator,
    color: 'bg-emerald-500',
    textColor: 'text-emerald-500',
  },
  TIME_ATTACK: {
    label: '타임어택',
    description: '30초 안에 최대한 많은 연산 문제를 풀어 기록에 도전합니다',
    studentCapabilities: ['30초 속도 챌린지', '랭킹 경쟁'],
    teacherLinks: [],
    icon: Zap,
    color: 'bg-amber-500',
    textColor: 'text-amber-500',
  },
  TEST: {
    label: '시험',
    description: '선생님이 출제한 시험을 온라인으로 응시하고 결과를 확인합니다',
    studentCapabilities: ['시험 응시', '결과 확인', '오답 분석'],
    teacherLinks: [
      { label: '시험 관리', href: '/tests' },
      { label: '수기채점', href: '/manual-grading' },
    ],
    icon: ClipboardCheck,
    color: 'bg-primary',
    textColor: 'text-primary',
  },
  REVENGE: {
    label: '복수전',
    description: '자주 틀리는 유형의 문제에 재도전하여 약점을 극복합니다',
    studentCapabilities: ['오답 유형 분석', '복수전 챌린지', 'XP 보상'],
    teacherLinks: [],
    icon: Swords,
    color: 'bg-red-500',
    textColor: 'text-red-500',
  },
  DIAGNOSTIC: {
    label: '레벨테스트',
    description: '학생의 수학 실력을 진단하고 취약 영역을 파악합니다',
    studentCapabilities: ['레벨 진단', '취약 영역 분석', 'AI 보고서'],
    teacherLinks: [
      { label: '진단 결과', href: '/level-test' },
    ],
    icon: Stethoscope,
    color: 'bg-teal-500',
    textColor: 'text-teal-500',
  },
  QUIZ: {
    label: '실시간 퀴즈',
    description: '선생님이 진행하는 실시간 퀴즈에 참여하여 경쟁합니다',
    studentCapabilities: ['실시간 퀴즈 참가', '순위 경쟁', '속도 점수'],
    teacherLinks: [
      { label: '실시간 퀴즈', href: '/quiz' },
    ],
    icon: Radio,
    color: 'bg-pink-500',
    textColor: 'text-pink-500',
  },
  EXAM_ANALYSIS: {
    label: '기출 분석',
    description: '시험지를 AI로 분석하여 난이도, 유형, 단원별 출제 경향을 파악합니다',
    studentCapabilities: ['시험 분석 결과 확인'],
    teacherLinks: [
      { label: '기출 분석', href: '/exam-analysis' },
    ],
    icon: FileSearch,
    color: 'bg-indigo-500',
    textColor: 'text-indigo-500',
  },
  HOMEWORK: {
    label: '숙제',
    description: '선생님이 출제한 연산/개념/문제 숙제를 매일 학습합니다',
    studentCapabilities: ['연산 숙제', '개념 숙제', '문제 숙제', '일별 진행 추적'],
    teacherLinks: [
      { label: '숙제 관리', href: '/homework' },
    ],
    icon: CalendarCheck,
    color: 'bg-teal-500',
    textColor: 'text-teal-500',
  },
  WORKSHEET: {
    label: '학습지',
    description: '교육과정 기반 문제지를 생성하여 인쇄·배포합니다',
    studentCapabilities: ['학습지 풀기'],
    teacherLinks: [
      { label: '학습지 만들기', href: '/worksheet/create' },
    ],
    icon: FileSpreadsheet,
    color: 'bg-cyan-500',
    textColor: 'text-cyan-500',
  },
  EXAM_PREP: {
    label: '내신대비',
    description: '학교별 내신 시험을 D-day까지 자동 학습 일정으로 준비합니다',
    studentCapabilities: ['D-day 자동 일정', '오늘의 학습', '모의 등급 예측', '출제 패턴 분석'],
    teacherLinks: [
      { label: '내신대비 캠페인', href: '/exam-campaigns' },
    ],
    icon: Target,
    color: 'bg-rose-500',
    textColor: 'text-rose-500',
  },
  OX_QUIZ: {
    label: 'O/X 퀴즈',
    description: '참/거짓 진술 문제로 개념 오개념을 잡습니다',
    studentCapabilities: ['진술 정오 판별', '오개념 학습', '숙제 응시', '인쇄 워크북'],
    teacherLinks: [
      { label: 'OX 출제', href: '/questions/ox' },
    ],
    icon: CheckSquare,
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
  },
  WORKBOOK: {
    label: '워크북',
    description: '인쇄 가능한 컨텐츠를 한 권의 책으로 묶고 풀이공간을 인쇄합니다',
    studentCapabilities: [],
    teacherLinks: [
      { label: '워크북 생성', href: '/workbooks' },
    ],
    icon: BookText,
    color: 'bg-indigo-500',
    textColor: 'text-indigo-500',
  },
};

/** LICENSE_FEATURE_INFO 키를 순서대로 배열 */
export const LICENSE_FEATURES_ORDERED: LicenseFeature[] = [
  'CONCEPT', 'ARITHMETIC', 'TIME_ATTACK', 'TEST', 'REVENGE', 'DIAGNOSTIC', 'QUIZ', 'EXAM_ANALYSIS', 'HOMEWORK', 'WORKSHEET', 'EXAM_PREP', 'OX_QUIZ', 'WORKBOOK',
];
