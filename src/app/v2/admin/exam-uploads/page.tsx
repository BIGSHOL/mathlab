/**
 * 관리자 시험지 업로드 검수 V4 — data/refact/pages/admin-hifi.html S4 변형
 * 4단계 칸반 보드: 대기 → OCR 처리중 → 검수 → 완료.
 */
import { AppShell, Sidebar, Topbar, ADMIN_NAV } from '@/components/layout-v2';
import { Button } from '@/components/ui-v2';
import '@/styles/v2-pages/admin.css';

interface UploadCard {
  title: string;
  tags: { label: string; tone?: 'solid'; color?: string }[];
  metaLine?: { text: string; color?: string };
  progress?: { value: number; note: string; noteColor?: string };
  owner?: string;
  urgent?: boolean;
}

// TODO: Prisma — ExamPaper.status + extractAttempts + assignedTo 집계
const MOCK = {
  admin: { name: '관리자 김', meta: 'Super Admin', avatarBg: '#6366F1' },
  kpi: [
    { lb: '오늘 처리', v: '24', meta: '목표 30 · 80%' },
    { lb: '평균 처리 시간', v: '2.4', vSmall: 'h', meta: '▼ 0.6h · 단축', metaColor: 'up' as const },
    { lb: 'OCR 정확도', v: '94.2', vSmall: '%', meta: '목표 90% 초과' },
    { lb: '검수자 활동', v: '3', vSmall: '명', meta: '권리포터·알바김·외주' },
    { lb: '⚠️ 긴급', v: '5', vColor: '#B45309', meta: '48시간 경과', lbColor: '#B45309', cardBg: 'linear-gradient(135deg,#FFFBEB,#fff)', cardBorder: '#FDE68A' },
  ],
  columns: [
    {
      key: 'pending', title: '📥 대기 (Pending)', count: 47,
      cards: [
        { title: '대치중 2024-1 기말 (가안)', urgent: true, tags: [{ label: '📷 사진 25장', tone: 'solid' as const }, { label: '강남수학학원' }], metaLine: { text: '⚠ 5/10 업로드 · 49시간 경과', color: 'var(--danger)' } },
        { title: '분당중 2023-2 중간', tags: [{ label: '📄 PDF', tone: 'solid' as const }, { label: '분당명문' }], metaLine: { text: '5/11 새벽 업로드' } },
        { title: '서초중 2024-1 중간', tags: [{ label: '📷 사진 12장', tone: 'solid' as const }, { label: '서초수학교실' }], metaLine: { text: '5/10 22시' } },
        { title: '목일중 2024-1 중간', tags: [{ label: '📄 PDF', tone: 'solid' as const }, { label: '목동학원' }], metaLine: { text: '5/10 19시' } },
        { title: '노원중 2024-1 중간', tags: [{ label: '📷 14장', tone: 'solid' as const }, { label: '중계동' }], metaLine: { text: '5/10 15시' } },
      ] as UploadCard[],
      more: '+ 42건 더',
    },
    {
      key: 'processing', title: '⚙️ OCR 처리중', count: 12,
      cards: [
        { title: '청담중 2024-1 중간', tags: [{ label: '📄 PDF', tone: 'solid' as const }, { label: '강남수학' }], progress: { value: 74, note: 'OCR 74% · 18/25 문항 추출' } },
        { title: '개원중 2023-2 기말', tags: [{ label: '📷 18장', tone: 'solid' as const }, { label: '강남수학' }], progress: { value: 42, note: '사진 정렬 · 9/18' } },
        { title: '방배중 2024-1 중간', tags: [{ label: '📄 PDF', tone: 'solid' as const }], progress: { value: 95, note: '완료 임박 · 24/25', noteColor: 'var(--success)' } },
        { title: '압구정중 2024-1 중간', tags: [{ label: '📷 22장', tone: 'solid' as const }], progress: { value: 28, note: 'OCR 진행' } },
      ] as UploadCard[],
      more: '+ 8건 더',
    },
    {
      key: 'review', title: '🧐 검수 (Review)', count: 8,
      cards: [
        { title: '강남구정중 2023-2 기말', tags: [{ label: '25문 추출 완료', tone: 'solid' as const }], metaLine: { text: '⚠ 7번 문제 수식 깨짐 · 수동 입력 필요', color: '#B45309' }, owner: '권리포터' },
        { title: '신사중 2024-1 중간', tags: [{ label: '23문 추출', tone: 'solid' as const }, { label: '검토 통과', color: 'var(--success)' }], owner: '알바김' },
        { title: '언주중 2024-1 중간', tags: [{ label: '정답 매칭 중', tone: 'solid' as const }], owner: '권리포터' },
      ] as UploadCard[],
      more: '+ 5건 더',
    },
    {
      key: 'done', title: '✅ 완료 (오늘)', count: 24,
      cards: [
        { title: '대치중 2024-1 중간', tags: [{ label: '25문 발행', tone: 'solid' as const, color: 'var(--success)' }, { label: '강남수학' }], metaLine: { text: '14:32 발행 · 라이브러리 반영', color: 'var(--ink-3)' } },
        { title: '대치중 2023-2 기말', tags: [{ label: '25문 발행', tone: 'solid' as const, color: 'var(--success)' }], metaLine: { text: '13:08 발행', color: 'var(--ink-3)' } },
        { title: '개원중 2023-2 중간', tags: [{ label: '24문 발행', tone: 'solid' as const, color: 'var(--success)' }], metaLine: { text: '11:46 발행', color: 'var(--ink-3)' } },
        { title: '청량중 2023-2 기말', tags: [{ label: '22문 발행', tone: 'solid' as const, color: 'var(--success)' }], metaLine: { text: '10:22 발행', color: 'var(--ink-3)' } },
      ] as UploadCard[],
      more: '+ 20건 더',
    },
  ],
};

export default function AdminExamUploadsV2Page() {
  const data = MOCK;
  return (
    <AppShell
      className="admin"
      sidebar={
        <Sidebar
          brand="MathLAB · Admin"
          groups={ADMIN_NAV}
          user={{ name: data.admin.name, meta: data.admin.meta, avatarBg: data.admin.avatarBg }}
        />
      }
    >
      <Topbar
        title="시험지 업로드 검수"
        subtitle={<span>대기 <b>47</b> · 처리중 <b>12</b> · 검토 <b>8</b></span>}
        right={
          <>
            <span className="text-3" style={{ fontSize: 12 }}>담당:</span>
            <Button style={{ fontSize: 12, padding: '5px 10px' }}>전체 ▾</Button>
            <Button variant="primary">＋ 업로드</Button>
          </>
        }
      />

      <div className="main">
        {/* KPI */}
        <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
          {data.kpi.map((k, i) => (
            <div
              key={i}
              className="summary-card"
              style={k.cardBg ? { background: k.cardBg, borderColor: k.cardBorder } : undefined}
            >
              <div className="lb" style={k.lbColor ? { color: k.lbColor } : undefined}>{k.lb}</div>
              <div className="v" style={k.vColor ? { color: k.vColor } : undefined}>
                {k.v}
                {k.vSmall && <small> {k.vSmall}</small>}
              </div>
              <div className="meta">
                {k.metaColor === 'up' ? <b className="up">{k.meta}</b> : k.meta}
              </div>
            </div>
          ))}
        </div>

        {/* kanban */}
        <div className="upload-board">
          {data.columns.map((col) => (
            <div key={col.key} className={`col-board col-${col.key}`}>
              <div className="col-h">
                <span>{col.title}</span>
                <span className="count">{col.count}</span>
              </div>
              {col.cards.map((c, i) => (
                <div key={i} className={`upload-card${c.urgent ? ' urgent' : ''}`}>
                  <div className="ttl">{c.title}</div>
                  <div className="meta">
                    {c.tags.map((t, j) => (
                      <span
                        key={j}
                        className={`tg${t.tone === 'solid' ? ' solid' : ''}`}
                        style={{ fontSize: 10, color: t.color }}
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>
                  {c.progress && (
                    <>
                      <div className="progress"><i style={{ width: `${c.progress.value}%` }} /></div>
                      <div className="meta" style={{ marginTop: 4, color: c.progress.noteColor }}>
                        {c.progress.note}
                      </div>
                    </>
                  )}
                  {c.metaLine && (
                    <div className="meta" style={{ marginTop: 6, color: c.metaLine.color }}>
                      {c.metaLine.text}
                    </div>
                  )}
                  {c.owner && (
                    <div className="meta" style={{ marginTop: 4 }}>
                      담당: <b>{c.owner}</b>
                    </div>
                  )}
                </div>
              ))}
              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-3)', padding: 6 }}>
                {col.more}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
