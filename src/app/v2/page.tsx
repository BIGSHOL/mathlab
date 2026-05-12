/**
 * v2 디자인 시스템 페이지 인덱스 (개발자/QA 용).
 *
 * data/refact 의 23 페이지 변형을 v2 라우트 트리에 카드 그리드로 노출.
 * 본 프로덕션 사이드바에는 노출하지 않음 (배포 전까지 직접 URL 진입).
 */
import Link from 'next/link';
import { AppShell, Topbar } from '@/components/layout-v2';
import '@/styles/v2-pages/index-grid.css';

type Page = {
  href: string;
  emoji: string;
  title: string;
  variant: string;
  note?: string;
};

type Section = {
  title: string;
  accent: string; // CSS color
  pages: Page[];
};

const SECTIONS: Section[] = [
  {
    title: '학생',
    accent: 'var(--primary)',
    pages: [
      { href: '/v2/dashboard', emoji: '🏠', title: '대시보드', variant: 'V2', note: '오늘의 미션·캘린더·연속 학습' },
      { href: '/v2/curriculum', emoji: '📚', title: '단원학습', variant: 'V1', note: '교과 트리 + 진도' },
      { href: '/v2/practice', emoji: '⚡', title: '연산 연습', variant: 'V2', note: '타임어택' },
      { href: '/v2/homework', emoji: '📝', title: '숙제', variant: 'V1', note: '문제 카드 + 진행률' },
      { href: '/v2/exam', emoji: '🧪', title: '시험', variant: 'V1', note: '응시 / 채점 결과' },
      { href: '/v2/results', emoji: '📊', title: '결과 분석', variant: 'V2', note: '오답 패턴 + AI 코멘트' },
      { href: '/v2/profile', emoji: '👤', title: '내 프로필', variant: 'V1', note: 'XP/뱃지/통계' },
      { href: '/v2/ranking', emoji: '🏆', title: '랭킹', variant: 'V3', note: '주간/시즌/반대항' },
      { href: '/v2/shop', emoji: '🛍', title: '마켓', variant: 'V2', note: '아바타·테마 구매' },
    ],
  },
  {
    title: '선생님',
    accent: '#0EA5E9',
    pages: [
      { href: '/v2/teacher/dashboard', emoji: '🏠', title: '대시보드', variant: 'V1', note: '트리아지 — 위험 학생 우선' },
      { href: '/v2/teacher/students', emoji: '👥', title: '학생 관리', variant: 'V2', note: '마스터-디테일' },
      { href: '/v2/teacher/homework', emoji: '📝', title: '숙제 출제', variant: 'V2', note: '4단계 빌더' },
      { href: '/v2/teacher/exam', emoji: '🧪', title: '시험 관리', variant: 'V3', note: '수기 채점 인터페이스' },
      { href: '/v2/teacher/worksheet', emoji: '📄', title: '학습지', variant: 'V3', note: 'DIY 편집기' },
      { href: '/v2/teacher/analytics', emoji: '📊', title: '학습 분석', variant: 'V1', note: '반 평균/추세' },
      { href: '/v2/teacher/exam-analysis', emoji: '📑', title: '기출 분석', variant: 'V2', note: 'AI 코멘트 + 학습 대책' },
    ],
  },
  {
    title: '관리자',
    accent: '#6366F1',
    pages: [
      { href: '/v2/admin/tenants', emoji: '🏢', title: '학원 관리', variant: 'S1', note: '테넌트 + MRR + 드로어' },
      { href: '/v2/admin/schools', emoji: '🏫', title: '학교 DB', variant: 'S2', note: '커버리지 / 기출 보유' },
      { href: '/v2/admin/features', emoji: '🎛', title: 'Feature Flags', variant: 'S3', note: '단계별 롤아웃' },
      { href: '/v2/admin/exam-uploads', emoji: '📤', title: '시험지 업로드 검수', variant: 'S4', note: '4단계 칸반' },
    ],
  },
];

export default function V2IndexPage() {
  const total = SECTIONS.reduce((s, sec) => s + sec.pages.length, 0);
  return (
    <AppShell noSide sidebar={null}>
      <Topbar
        title="MathLAB · 디자인 v2"
        subtitle={`총 ${total}개 페이지 — 개발/QA 인덱스`}
        right={
          <span className="text-3" style={{ fontSize: 11 }}>
            data/refact handoff 기반 · 본 프로덕션 사이드바 미노출
          </span>
        }
      />

      <div className="main">
        {SECTIONS.map((sec) => (
          <section key={sec.title} className="v2-index-section">
            <h2 className="v2-index-h2" style={{ borderColor: sec.accent }}>
              <span className="dot" style={{ background: sec.accent }} />
              {sec.title}
              <span className="count">{sec.pages.length}</span>
            </h2>
            <div className="v2-index-grid">
              {sec.pages.map((p) => (
                <Link key={p.href} href={p.href} className="v2-index-card">
                  <div className="v2-index-card-head">
                    <span className="emoji">{p.emoji}</span>
                    <span className="variant" style={{ background: `${sec.accent}1A`, color: sec.accent }}>
                      {p.variant}
                    </span>
                  </div>
                  <div className="v2-index-card-title">{p.title}</div>
                  {p.note && <div className="v2-index-card-note">{p.note}</div>}
                  <div className="v2-index-card-href">{p.href}</div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
