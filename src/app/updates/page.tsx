'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Newspaper, ChevronDown, ChevronRight, Zap, Plus, Wrench, Bug, Sparkles, ArrowLeft } from 'lucide-react';

type UpdateType = 'feature' | 'add' | 'fix' | 'improve';

interface UpdateEntry {
  type: UpdateType;
  text: string;
}

interface UpdateLog {
  date: string;
  title: string;
  entries: UpdateEntry[];
}

const TYPE_CONFIG: Record<UpdateType, { label: string; color: string; icon: typeof Zap }> = {
  feature: { label: '기능', color: 'bg-blue-100 text-blue-700', icon: Zap },
  add: { label: '추가', color: 'bg-green-100 text-green-700', icon: Plus },
  fix: { label: '수정', color: 'bg-amber-100 text-amber-700', icon: Bug },
  improve: { label: '개선', color: 'bg-violet-100 text-violet-700', icon: Wrench },
};

const UPDATES: UpdateLog[] = [
  {
    date: '2025-03-11',
    title: '연산 생성기 대규모 확장 — 62개 유형 완성',
    entries: [
      { type: 'feature', text: '연산 생성기 카테고리 10개 → 62개로 대폭 확장' },
      { type: 'add', text: '초2: 단위 변환 (m↔cm, kg↔g 등)' },
      { type: 'add', text: '초3: 시간 계산 (시간+분 → 분 변환)' },
      { type: 'add', text: '초4: 각도 구하기, 규칙 찾기 (등차수열)' },
      { type: 'add', text: '초5: 최대공약수/최소공배수, 평균, 넓이 구하기' },
      { type: 'add', text: '초6: 원의 넓이/둘레, 비와 비율, 백분율' },
      { type: 'add', text: '중1: 소인수분해, 정비례/반비례, 사분면 판별' },
      { type: 'add', text: '중2: 지수법칙, 일차방정식, 피타고라스, 닮음비' },
      { type: 'add', text: '중3: 인수분해, 분모의 유리화, 판별식, 삼각비, 원주각, 중앙값, 분산' },
      { type: 'improve', text: '난이도 드롭다운 제거 → 유형 자체가 수준을 결정하는 구조로 전환' },
      { type: 'improve', text: '학년별 세부 카테고리로 교육과정(2022 개정) 정밀 매핑' },
    ],
  },
  {
    date: '2025-03-10',
    title: '연산 생성기 인쇄/미리보기 대폭 개선',
    entries: [
      { type: 'feature', text: 'A4 용지 비율 인쇄 미리보기 (CSS transform scale)' },
      { type: 'feature', text: '2열×10행 레이아웃, 페이지 자동 분할' },
      { type: 'improve', text: 'KaTeX 수식 렌더링 적용 (분수, 제곱근, 다항식)' },
      { type: 'improve', text: 'Split Panel 레이아웃 (좌측 설정 + 우측 미리보기)' },
      { type: 'add', text: '문제 수 입력 (최대 1000문제, 경고 표시)' },
      { type: 'add', text: '정답 표시/숨기기 토글' },
    ],
  },
  {
    date: '2025-03-09',
    title: '문제은행 필터링 및 네비게이션 개선',
    entries: [
      { type: 'feature', text: '문제은행 학년/단원/유형별 필터링 시스템' },
      { type: 'improve', text: '사이드바 네비게이션 아이콘 및 구조 개선' },
      { type: 'add', text: '연산 생성기 KaTeX 수식 표시 개선' },
    ],
  },
  {
    date: '2025-03-08',
    title: '경쟁사 벤치마킹 기반 14개 기능 통합 구현',
    entries: [
      { type: 'feature', text: '시험 시스템 통합 + 풀이 속도 분석' },
      { type: 'feature', text: 'MathLive 수식 편집기 통합' },
      { type: 'add', text: 'PDF 파서 개선' },
      { type: 'add', text: '대시보드, 학습 분석, 레벨테스트 등 다수 페이지 추가' },
    ],
  },
];

function UpdateTimeline() {
  const [expandedIdx, setExpandedIdx] = useState<number>(0);

  return (
    <div className="relative">
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-200" />
      <div className="flex flex-col gap-4">
        {UPDATES.map((log, idx) => {
          const isExpanded = expandedIdx === idx;
          return (
            <div key={log.date} className="relative pl-12">
              <div className={`absolute left-[14px] top-3.5 w-3 h-3 rounded-full border-2 ${idx === 0 ? 'bg-primary border-primary' : 'bg-white border-slate-300'}`} />
              <button
                onClick={() => setExpandedIdx(isExpanded ? -1 : idx)}
                className="w-full text-left bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-mono text-text-secondary">{log.date}</span>
                    <h3 className="text-sm font-semibold text-text-primary mt-0.5 truncate">{log.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className="text-xs text-text-secondary">{log.entries.length}건</span>
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-slate-400" />
                      : <ChevronRight className="w-4 h-4 text-slate-400" />
                    }
                  </div>
                </div>
              </button>
              {isExpanded && (
                <div className="mt-1 bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3">
                  <ul className="flex flex-col gap-2">
                    {log.entries.map((entry, i) => {
                      const cfg = TYPE_CONFIG[entry.type];
                      const Icon = cfg.icon;
                      return (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold shrink-0 mt-0.5 ${cfg.color}`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                          <span className="text-text-primary">{entry.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PublicUpdatesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 px-6 md:px-10 py-3 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-primary" />
          <Link href="/" className="text-lg font-bold tracking-tight text-text-primary">MathLab</Link>
        </div>
        <Link href="/" className="text-sm text-text-secondary hover:text-primary transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          홈으로
        </Link>
      </header>

      <main className="flex-1 bg-slate-50/50">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">업데이트 내역</h1>
              <p className="text-sm text-text-secondary">MathLab 개발 히스토리</p>
            </div>
          </div>
          <UpdateTimeline />
        </div>
      </main>

      <footer className="border-t border-slate-200 py-6 px-6 text-center text-sm text-text-secondary bg-white">
        &copy; 2024 MathLab. All rights reserved.
      </footer>
    </div>
  );
}
