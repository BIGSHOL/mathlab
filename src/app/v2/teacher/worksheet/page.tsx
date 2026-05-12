/**
 * 선생님 학습지 V3 — data/refact/pages/teacher-worksheet-hifi.html V3 변형
 * DIY 편집기 — 좌측 문제 라이브러리 + 가운데 학습지 캔버스 + 우측 설정 패널.
 * 풀스크린 (사이드바 없음).
 */
import { AppShell, Topbar } from '@/components/layout';
import { ButtonV2 } from '@/components/ui';
import '@/styles/v2-pages/teacher-worksheet.css';

type LibItem = {
  title: string;
  small?: string;
  tags: Array<{ label: string; bg?: string; color?: string }>;
  difficulty: number; // 1~5
  meta?: { label: string; color?: string };
  inWorksheet?: boolean;
};

// TODO: Prisma — Question 라이브러리 + Worksheet draft
const MOCK = {
  worksheet: { title: '중2 함수 종합 학습지', autosaved: true, selectedTopic: '일차함수 · 이차함수', count: 347 },
  filters: ['전체', '기본문제', '학교기출', '⭐ 추천', '내가 만든'],
  library: [
    { title: '일차함수 y = 2x + 3 의 그래프...', small: '(객 5지)', tags: [{ label: '일차함수' }], difficulty: 2, meta: { label: '✓ 추가됨', color: 'var(--success)' }, inWorksheet: true },
    { title: '두 점 (1, 3), (-1, -1)을 지나는 직선의...', tags: [{ label: '일차함수' }, { label: "대치중 '23기말", bg: '#FEF3C7', color: '#B45309' }], difficulty: 3 },
    { title: '일차함수 그래프가 제1, 2, 4사분면을 지날 조건은?', tags: [{ label: '일차함수' }], difficulty: 3, meta: { label: '정답률 64%' } },
    { title: 'y = ax² 의 그래프가 점 (-2, 8)을 지날 때...', small: '(단답)', tags: [{ label: '이차함수' }], difficulty: 2 },
    { title: '이차함수 y = -x² + 4x + 1 의 꼭짓점 좌표는?', tags: [{ label: '이차함수' }], difficulty: 3, meta: { label: '✓ 추가됨', color: 'var(--success)' }, inWorksheet: true },
    { title: 'y = 2(x-1)² + 3 의 그래프를 x축... 평행이동...', tags: [{ label: '이차함수' }, { label: '킬러', bg: '#FEF3C7', color: '#B45309' }], difficulty: 4 },
    { title: '직사각형 가로 (10-x), 세로 (x+4)... 최대 넓이', small: '(서술)', tags: [{ label: '함수 활용' }, { label: '⭐ AI 예측', bg: '#FEF3C7', color: '#B45309' }], difficulty: 5 },
    { title: '함수 f(x) = ax² + bx + c 와 f(0) = 3, f(1) = 6...', tags: [{ label: '이차함수' }], difficulty: 4 },
    { title: 'y = -2x + 4 와 y = x + 1 의 교점은?', small: '(객 5지)', tags: [{ label: '일차함수' }], difficulty: 2 },
    { title: '함수 그래프 해석 — 시간-거리 그래프', small: '(서술)', tags: [{ label: '함수 활용' }, { label: '박선생 작성', bg: 'var(--primary-50)', color: 'var(--primary)' }], difficulty: 3 },
  ] satisfies LibItem[],
  paper: {
    school: '강남수학학원',
    title: '중2 함수 종합 학습지',
    subtitle: '일차함수 · 이차함수 · 함수 활용',
    studentSlot: '이름:        반:      번호:',
    questions: [
      { num: 1, text: '일차함수 y = 2x + 3 의 그래프가 점 (a, 7)을 지날 때, a 의 값을 구하시오.' },
      { num: 2, text: '이차함수 y = -x² + 4x + 1 의 꼭짓점 좌표는?' },
      { num: 3, text: '두 점 (1, 3), (-1, -1)을 지나는 직선의 방정식은?' },
      { num: 4, text: '직사각형 가로 (10-x), 세로 (x+4) 인 도형의 넓이가 최대가 되는 x 값과 넓이는?', essay: true },
    ],
  },
  settings: {
    paperSize: 'A4',
    columns: '1단',
    titleVisible: true,
    answerSheet: true,
    showLevel: false,
  },
};

function Difficulty({ level }: { level: number }) {
  return (
    <span className="difficulty">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < level ? 'on' : ''} />
      ))}
    </span>
  );
}

export default function TeacherWorksheetV2Page() {
  const data = MOCK;
  const added = data.library.filter(q => q.inWorksheet).length;

  return (
    <AppShell sidebar={null} noSide>
      <Topbar
        title={<a href="#" style={{ color: 'var(--ink-3)', textDecoration: 'none', fontSize: 13 }}>← 목록</a>}
        subtitle={
          <span className="row" style={{ gap: 12 }}>
            <input
              type="text"
              defaultValue={data.worksheet.title}
              style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: 14, width: 240 }}
            />
            <span className="tg" style={{ fontSize: 10, background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 6px', borderRadius: 99 }}>
              자동 저장됨
            </span>
          </span>
        }
        right={
          <>
            <ButtonV2 style={{ fontSize: 12, padding: '5px 10px' }}>↶ 실행취소</ButtonV2>
            <ButtonV2>👁️ 미리보기</ButtonV2>
            <ButtonV2>💾 임시저장</ButtonV2>
            <ButtonV2 variant="primary">🖨️ 인쇄 / PDF</ButtonV2>
          </>
        }
      />

      <div className="diy-shell">
        {/* LEFT: 문제 라이브러리 */}
        <div className="lib-pane">
          <div className="lib-search">
            <input type="text" placeholder="🔍 문제 검색 — 단원, 키워드, 출처" />
          </div>
          <div className="lib-filters">
            {data.filters.map((f, i) => (
              <span key={f} className={`lib-tag${i === 0 ? ' on' : ''}`}>{f}</span>
            ))}
          </div>
          <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--ink-3)', background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>
            선택된 단원: <b style={{ color: 'var(--ink)' }}>{data.worksheet.selectedTopic}</b> · <b style={{ color: 'var(--primary)' }}>{data.worksheet.count}문</b> 검색됨
          </div>
          <div className="lib-list">
            {data.library.map((q, i) => (
              <div key={i} className={`q-item${q.inWorksheet ? ' in-worksheet' : ''}`}>
                <div className="drag">⋮⋮</div>
                <div className="body">
                  <div className="ttl">
                    {q.title}{q.small && <small> {q.small}</small>}
                  </div>
                  <div className="meta">
                    {q.tags.map((t, j) => {
                      const hasBg = 'bg' in t && t.bg;
                      return (
                        <span key={j} className="tg" style={hasBg ? { background: t.bg, color: t.color } : undefined}>
                          {t.label}
                        </span>
                      );
                    })}
                    <Difficulty level={q.difficulty} />
                    {q.meta && <span style={q.meta.color ? { color: q.meta.color } : undefined}>{q.meta.label}</span>}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ textAlign: 'center', padding: 14, color: 'var(--ink-3)', fontSize: 11 }}>… 337문 더보기</div>
          </div>
        </div>

        {/* CENTER: 학습지 캔버스 */}
        <div className="ws-canvas">
          <div className="ws-paper">
            <div className="ws-head">
              <div className="text-3" style={{ fontSize: 11 }}>{data.paper.school}</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '6px 0 4px' }}>{data.paper.title}</h2>
              <div className="text-3" style={{ fontSize: 12 }}>{data.paper.subtitle}</div>
              <div className="text-3 mt-8" style={{ fontSize: 11 }}>{data.paper.studentSlot}</div>
            </div>

            <ol style={{ margin: 0, paddingLeft: 22, fontSize: 13, lineHeight: 1.7 }}>
              {data.paper.questions.map(q => (
                <li key={q.num} style={{ marginBottom: q.essay ? 18 : 14 }}>
                  {q.text}
                  {q.essay && (
                    <div
                      style={{
                        marginTop: 10,
                        height: 80,
                        background: 'repeating-linear-gradient(0deg, transparent 0 23px, var(--line-2) 23px 24px)',
                      }}
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* RIGHT: 설정 */}
        <div className="ws-side">
          <h4>📄 학습지 정보</h4>
          <div className="col" style={{ gap: 8 }}>
            <div className="row between">
              <span className="text-3" style={{ fontSize: 12 }}>추가된 문제</span>
              <b>{added} / {data.paper.questions.length}</b>
            </div>
            <div className="row between">
              <span className="text-3" style={{ fontSize: 12 }}>예상 풀이 시간</span>
              <b>약 18분</b>
            </div>
          </div>

          <h4>🖨️ 인쇄 옵션</h4>
          <div className="col" style={{ gap: 8 }}>
            <div className="row between">
              <span className="text-3" style={{ fontSize: 12 }}>용지 크기</span>
              <ButtonV2 style={{ fontSize: 11, padding: '4px 10px' }}>{data.settings.paperSize} ▾</ButtonV2>
            </div>
            <div className="row between">
              <span className="text-3" style={{ fontSize: 12 }}>단 구성</span>
              <ButtonV2 style={{ fontSize: 11, padding: '4px 10px' }}>{data.settings.columns} ▾</ButtonV2>
            </div>
            <label className="row" style={{ gap: 8, fontSize: 12 }}>
              <input type="checkbox" defaultChecked={data.settings.titleVisible} />
              제목/학교명 표시
            </label>
            <label className="row" style={{ gap: 8, fontSize: 12 }}>
              <input type="checkbox" defaultChecked={data.settings.answerSheet} />
              답안지 별도 생성
            </label>
            <label className="row" style={{ gap: 8, fontSize: 12 }}>
              <input type="checkbox" defaultChecked={data.settings.showLevel} />
              난이도 표시
            </label>
          </div>

          <h4>🤖 AI 도구</h4>
          <ButtonV2 variant="primary" style={{ width: '100%' }}>AI에게 추천받기</ButtonV2>
          <ButtonV2 style={{ width: '100%', marginTop: 6 }}>난이도 자동 균형</ButtonV2>
        </div>
      </div>
    </AppShell>
  );
}
