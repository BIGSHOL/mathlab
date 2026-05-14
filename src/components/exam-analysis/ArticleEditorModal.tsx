'use client';

/**
 * 기출 분석 블로그 글 에디터 모달
 *
 * 풀스크린 모달: TipTap 에디터 + SEO 점수 패널 + 복사/다운로드
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { X, RefreshCw, Copy, Loader2, Clock, ChevronDown, ChevronUp, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

// TipTap은 SSR 불가 → dynamic import
const ArticleEditor = dynamic(
  () => import('./ArticleEditor').then((m) => ({ default: m.ArticleEditor })),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-slate-400">에디터 로딩 중...</div> },
);

interface ArticleEditorModalProps {
  examPaperId: string;
  schoolName?: string | null;
  onClose: () => void;
}

interface AntiPatternWarning {
  type: string;
  label: string;
  occurrences: number;
  excerpt: string;
}

interface BlueprintInfo {
  archetype: string;
  reason: string;
  tone: string;
  charts: string[];
  gradeBands: Array<{ label: string; cutDesc: string; subFocus?: string }>;
  selectedModuleIds: string[];
}

interface ArticleData {
  title: string;
  content: string;
  tags: string[];
  metaDescription: string;
  chartImages?: {
    difficulty: string;
    abilityRadar: string;
    topicBar: string;
  };
  // ── Hybrid Archetype × Composition ──
  archetype?: string;
  blueprintInfo?: BlueprintInfo;
  antiPatternWarnings?: AntiPatternWarning[];
}

interface ChartUrls {
  difficulty?: string;
  ability_radar?: string;
  topic_bar?: string;
  discrimination?: string;
}

interface ArticleVariables {
  academyName: string;
  teacherName: string;
  branchTag: string;
}

const VARIABLES_STORAGE_KEY = 'mathlab_article_variables';

const ARCHETYPE_LABELS: Record<string, string> = {
  foundation: '기본 위주',
  'top-tier': '최상위 변별',
  'essay-heavy': '서술형 중심',
  'unit-focused': '단원 집중',
  balanced: '균형형',
};

const ARCHETYPE_COLORS: Record<string, string> = {
  foundation: 'bg-green-50 text-green-700 border-green-200',
  'top-tier': 'bg-rose-50 text-rose-700 border-rose-200',
  'essay-heavy': 'bg-amber-50 text-amber-700 border-amber-200',
  'unit-focused': 'bg-blue-50 text-blue-700 border-blue-200',
  balanced: 'bg-slate-50 text-slate-700 border-slate-200',
};

export function ArticleEditorModal({ examPaperId, schoolName: _schoolName, onClose }: ArticleEditorModalProps) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // 저장된 글 첫 로드 진행 중
  const [loadError, setLoadError] = useState<string | null>(null); // fetch 실패 (네트워크/권한)
  const [elapsedSec, setElapsedSec] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [streamText, setStreamText] = useState(''); // AI 실시간 타이핑
  const [chartUrls, setChartUrls] = useState<ChartUrls>({}); // route에서 미리 송신된 차트 URL (스트림 중 토큰 치환용)
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  // ── Hybrid Archetype × Composition ──
  const [variables, setVariables] = useState<ArticleVariables>({ academyName: '', teacherName: '', branchTag: '' });
  const [blueprintInfo, setBlueprintInfo] = useState<BlueprintInfo | null>(null);
  const [showVariables, setShowVariables] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 변수 — localStorage 로드 / 저장
  useEffect(() => {
    try {
      const raw = localStorage.getItem(VARIABLES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setVariables({
            academyName: typeof parsed.academyName === 'string' ? parsed.academyName : '',
            teacherName: typeof parsed.teacherName === 'string' ? parsed.teacherName : '',
            branchTag: typeof parsed.branchTag === 'string' ? parsed.branchTag : '',
          });
        }
      }
    } catch {
      // 무시
    }
  }, []);

  const updateVariables = useCallback((partial: Partial<ArticleVariables>) => {
    setVariables((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(VARIABLES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 무시
      }
      return next;
    });
  }, []);

  // 저장된 글 로드 → 없으면 변수 입력 대기 (사용자가 명시적으로 "AI 생성" 클릭)
  const loadSavedArticle = useCallback(async () => {
    setInitialLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/exam-analysis/${examPaperId}/generate-article`);
      if (!res.ok) {
        // 403 (Vercel Protection 등) / 5xx 등 응답 실패 — 빈 글과 구분
        if (res.status === 404) {
          // 정말 글이 없는 상태 → 학원 정보 입력 UI로
          setShowVariables(true);
          return;
        }
        const text = await res.text().catch(() => '');
        const isHtml = text.trim().startsWith('<');
        throw new Error(
          isHtml
            ? `서버 응답이 비정상입니다 (HTTP ${res.status}). 새로고침 후 다시 시도해 주세요.`
            : `글을 불러오지 못했습니다 (HTTP ${res.status})`,
        );
      }
      const json = await res.json();
      if (json.data) {
        applyArticleData(json.data);
      } else {
        // 응답은 정상이지만 글이 없음 → 학원 정보 입력 UI
        setShowVariables(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '글을 불러오지 못했습니다';
      setLoadError(msg);
    } finally {
      setInitialLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examPaperId]);

  useEffect(() => {
    loadSavedArticle();
  }, [loadSavedArticle]);

  const applyArticleData = (data: ArticleData) => {
    setArticleData(data);
    setTitle(data.title);
    setTags(data.tags || []);

    let html = data.content;
    // 마크다운 폴백: AI가 HTML 대신 마크다운으로 응답한 경우
    if (!html.includes('<h2') && !html.includes('<p>') && html.includes('## ')) {
      html = markdownToBasicHtml(html);
    }
    // 구버전 마크다운 이미지 → HTML img 태그 변환
    html = html.replace(/!\[([^\]]*)\]\((data:image\/[^)]+)\)/g, '<img alt="$1" src="$2" />');
    setHtmlContent(html);
  };

  // AI 글 생성 (NDJSON 스트리밍)
  const handleGenerate = async () => {
    // 기존 글 초기화 → 스트리밍 프리뷰로 전환
    setArticleData(null);
    setHtmlContent('');
    setTitle('');
    setTags([]);
    setLoadError(null);
    setLoading(true);
    setElapsedSec(0);
    setStreamText('');
    setChartUrls({});
    setProgressMsg('준비 중...');
    setShowVariables(true); // 재작성 시 학원 정보 패널 자동 펼침
    timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);

    try {
      // 학원/강사 변수 — 빈 값은 자동으로 trim된 후 undefined로 처리 (서버가 graceful degrade)
      const body = {
        academyName: variables.academyName.trim() || undefined,
        teacherName: variables.teacherName.trim() || undefined,
        branchTag: variables.branchTag.trim() || undefined,
      };
      const res = await fetch(`/api/exam-analysis/${examPaperId}/generate-article`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: { message?: string } }).error?.message || '생성 실패');
      }

      // NDJSON 스트림 파싱
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedStream = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 마지막 불완전 라인은 버퍼에 유지

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.type === 'progress') {
              setProgressMsg(event.message);
            } else if (event.type === 'chart-urls') {
              // route가 차트 PNG 생성 직후 보내는 사전 URL — 스트림 중 토큰 치환에 사용
              setChartUrls(event.urls as ChartUrls);
            } else if (event.type === 'blueprint-info') {
              // archetype/모듈 정보 — 스트림 시작 직후 송신됨 (사용자에게 "어떤 시험으로 분류됐는지" 노출)
              setBlueprintInfo(event.info as BlueprintInfo);
            } else if (event.type === 'stream') {
              accumulatedStream += event.delta;
              setStreamText(accumulatedStream);
            } else if (event.type === 'result') {
              // 최종 결과 — 에디터에 로드
              applyArticleData(event as ArticleData);
              if ((event as ArticleData).blueprintInfo) {
                setBlueprintInfo((event as ArticleData).blueprintInfo!);
              }
              toast.success('블로그 글이 생성되었습니다');
            } else if (event.type === 'error') {
              throw new Error(event.error);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue; // JSON 파싱 실패 무시
            throw e;
          }
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '글 생성에 실패했습니다';
      toast.error(msg);
    } finally {
      setLoading(false);
      setStreamText('');
      setProgressMsg('');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // HTML 변경
  const handleHtmlChange = useCallback((html: string) => {
    setHtmlContent(html);
  }, []);

  // 네이버 SmartEditor ONE 호환 HTML 전처리
  const prepareForNaver = (html: string): string => {
    let result = html;
    // 2. <h2> → <p> 큰 글씨 + <hr> 구분선 (네이버 패턴, style 속성 보존)
    result = result.replace(/<h2(\s[^>]*)?>(([\s\S]*?))<\/h2>/gi, (_m, attrs, inner) => {
      const styleMatch = (attrs || '').match(/style="([^"]*)"/);
      const style = styleMatch ? ` style="${styleMatch[1]}"` : '';
      return `<p${style}><span style="font-size: 24px;"><b>${inner}</b></span></p><hr>`;
    });
    // 3. <h3> → <p> 중간 글씨 (style 속성 보존)
    result = result.replace(/<h3(\s[^>]*)?>(([\s\S]*?))<\/h3>/gi, (_m, attrs, inner) => {
      const styleMatch = (attrs || '').match(/style="([^"]*)"/);
      const style = styleMatch ? ` style="${styleMatch[1]}"` : '';
      return `<p${style}><span style="font-size: 18px;"><b>${inner}</b></span></p>`;
    });
    // 4. <li><p style="...">내용</p></li> → <p style="...">내용</p> (p 속성 보존!)
    result = result.replace(/<li[^>]*>(<p\s[^>]*>[\s\S]*?<\/p>)<\/li>/gi, '$1');
    result = result.replace(/<li[^>]*><p>([\s\S]*?)<\/p><\/li>/gi, '<p>$1</p>');
    result = result.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '<p>$1</p>');
    // 5. ul/ol 래퍼 제거
    result = result.replace(/<\/?[uo]l[^>]*>/gi, '');
    // 6. 빈 <p> 제거
    result = result.replace(/<p[^>]*>\s*(<br\s*\/?>)?\s*<\/p>/gi, '');
    // 7. <blockquote> 유지 (네이버가 인용구로 인식)
    // blockquote는 변환하지 않음
    // 8. data-color → style 보장
    result = result.replace(/<mark(?=[^>]*data-color="([^"]*)")(?![^>]*style)[^>]*>/gi,
      '<mark style="background-color: $1">');
    // 9. <strong> → <b> (네이버가 <b> 사용, 속성 포함 매칭)
    result = result.replace(/<strong([^>]*)>/gi, '<b$1>');
    result = result.replace(/<\/strong>/gi, '</b>');
    // 10. 보라색(#6741D9) 단원명 강조 → 검정 볼드로 변환 (네이버에서 color leak 방지)
    result = result.replace(/<span\s+style="color:\s*#6741D9;?">/gi, '<span>');
    result = result.replace(/<b\s+style="[^"]*color:\s*#6741D9[^"]*">/gi, '<b>');
    // 10. 이미지 URL: localhost → Vercel 공개 도메인으로 교체
    //     (로컬 개발 시 생성된 차트 URL이 localhost로 저장되어 네이버에서 접근 불가)
    result = result.replace(
      /(<img\s[^>]*src=")http:\/\/localhost:\d+(\/api\/exam-analysis\/)/gi,
      '$1https://mathlab-mu.vercel.app$2',
    );
    return result;
  };

  // 서식 복사 (브라우저 네이티브 렌더링 → 선택 → 복사)
  const handleCopyRichText = async () => {
    try {
      const prepared = prepareForNaver(htmlContent);

      const container = document.createElement('div');
      container.innerHTML = prepared;
      // 화면 밖에 배치하되 렌더링은 되도록 (display:none이면 선택 불가)
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.opacity = '0';
      container.style.width = '600px'; // 네이버 블로그 본문 폭과 유사하게
      container.style.fontFamily = '"NanumGothic", "나눔고딕", sans-serif';
      container.style.fontSize = '15px';
      container.style.fontWeight = 'normal';
      container.style.lineHeight = '1.7';
      container.style.color = '#333';
      container.style.textAlign = 'left';
      document.body.appendChild(container);

      // text-align 미지정 블록에만 left 기본값 부여 (네이버가 컨테이너 스타일을 무시하므로 개별 지정)
      container.querySelectorAll('p, h2, h3, blockquote, li, div').forEach((el) => {
        const blockEl = el as HTMLElement;
        if (!blockEl.style.textAlign) {
          blockEl.style.textAlign = 'left';
        }
      });

      // mark 배경색 보장
      container.querySelectorAll('mark').forEach((el) => {
        const markEl = el as HTMLElement;
        if (!markEl.style.backgroundColor) {
          markEl.style.backgroundColor = markEl.getAttribute('data-color') || '#FFF3BF';
        }
      });

      const range = document.createRange();
      range.selectNodeContents(container);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      document.execCommand('copy');

      selection?.removeAllRanges();
      document.body.removeChild(container);

      toast.success('서식이 복사되었습니다. 네이버 블로그에 Ctrl+V로 붙여넣기하세요.');
    } catch {
      // fallback — 전처리된 HTML 사용
      const fallbackHtml = prepareForNaver(htmlContent);
      try {
        const blob = new Blob([fallbackHtml], { type: 'text/html' });
        const textBlob = new Blob([fallbackHtml.replace(/<[^>]*>/g, '')], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob }),
        ]);
        toast.success('서식이 복사되었습니다.');
      } catch {
        await navigator.clipboard.writeText(fallbackHtml.replace(/<[^>]*>/g, ''));
        toast.success('텍스트가 복사되었습니다');
      }
    }
  };


  // 닫기 시 자동 저장
  const handleClose = async () => {
    if (articleData && htmlContent) {
      try {
        await fetch(`/api/exam-analysis/${examPaperId}/generate-article`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: htmlContent, title, tags }),
        });
      } catch {
        // 무시
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-sm"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-slate-800">기출 분석 글 작성</h2>
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-violet-600">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {progressMsg || '생성 중...'} ({elapsedSec}초)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleGenerate}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {articleData ? 'AI 재생성' : 'AI 생성'}
          </Button>
          {articleData && (
            <Button size="sm" variant="primary" onClick={handleCopyRichText}>
              <Copy className="w-4 h-4 mr-1" />
              서식 복사
            </Button>
          )}
        </div>
      </div>

      {/* 변수 + Blueprint 패널 (Hybrid Archetype × Composition) */}
      <div className="border-b border-slate-200 bg-slate-50/50 shrink-0">
        {/* 토글 헤더 — 항상 보임 */}
        <button
          type="button"
          onClick={() => setShowVariables(!showVariables)}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-slate-100 transition-colors"
        >
          {/* 학원/강사 상태 */}
          <span className="text-slate-500">학원 정보:</span>
          {variables.academyName.trim() ? (
            <span className="text-slate-700 font-medium">
              {variables.academyName}
              {variables.teacherName.trim() && ` · ${variables.teacherName}`}
            </span>
          ) : (
            <span className="text-amber-600">미입력 (CTA가 단순 마무리로 처리됨)</span>
          )}

          {/* archetype 배지 — 생성 후 표시 */}
          {blueprintInfo && (
            <span
              className={`ml-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-medium ${
                ARCHETYPE_COLORS[blueprintInfo.archetype] || 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title={blueprintInfo.reason}
            >
              <Sparkles className="w-3 h-3" />
              {ARCHETYPE_LABELS[blueprintInfo.archetype] || blueprintInfo.archetype}
            </span>
          )}

          {/* 안티패턴 경고 카운트 */}
          {articleData?.antiPatternWarnings && articleData.antiPatternWarnings.length > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium">
              <AlertTriangle className="w-3 h-3" />
              경고 {articleData.antiPatternWarnings.length}건
            </span>
          )}

          <span className="ml-auto flex items-center gap-1 text-slate-400">
            {showVariables ? '접기' : '펼치기'}
            {showVariables ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {/* 펼친 패널 */}
        {showVariables && (
          <div className="px-4 pb-3 pt-1 space-y-3 border-t border-slate-100">
            {/* 변수 입력 — 학원명/강사명/특색 */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">학원명</label>
                <input
                  type="text"
                  value={variables.academyName}
                  onChange={(e) => updateVariables({ academyName: e.target.value })}
                  placeholder="예: 김원장수학"
                  className="w-full text-sm px-2 py-1.5 border border-slate-200 rounded-sm focus:outline-none focus:border-violet-300"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">강사명 (선택)</label>
                <input
                  type="text"
                  value={variables.teacherName}
                  onChange={(e) => updateVariables({ teacherName: e.target.value })}
                  placeholder="예: 김수학 원장"
                  className="w-full text-sm px-2 py-1.5 border border-slate-200 rounded-sm focus:outline-none focus:border-violet-300"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">지점 특색 (선택, 1줄)</label>
                <input
                  type="text"
                  value={variables.branchTag}
                  onChange={(e) => updateVariables({ branchTag: e.target.value })}
                  placeholder="예: 상위권 1:1 맞춤"
                  className="w-full text-sm px-2 py-1.5 border border-slate-200 rounded-sm focus:outline-none focus:border-violet-300"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              입력하지 않으면 마지막 CTA가 단순 마무리로 처리됩니다. 무특색 &ldquo;문의 주시기 바랍니다&rdquo; CTA를 방지하기 위함입니다.
            </p>

            {/* Blueprint 정보 — 생성 후 */}
            {blueprintInfo && (
              <div className="border-t border-slate-100 pt-2.5 space-y-1.5">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500">분류 근거:</span>
                  <span className="text-slate-700">{blueprintInfo.reason}</span>
                </div>
                <div className="flex items-start gap-2 text-[11px]">
                  <span className="text-slate-500 shrink-0">선정된 섹션:</span>
                  <div className="flex flex-wrap gap-1">
                    {blueprintInfo.selectedModuleIds.map((id) => (
                      <span key={id} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-sm">
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500">등급 라벨:</span>
                  <span className="text-slate-700">
                    {blueprintInfo.gradeBands.map((b) => `${b.label}(${b.cutDesc})`).join(' · ')}
                  </span>
                </div>
              </div>
            )}

            {/* 안티패턴 경고 목록 */}
            {articleData?.antiPatternWarnings && articleData.antiPatternWarnings.length > 0 && (
              <div className="border-t border-slate-100 pt-2.5">
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="font-medium">생성된 글에서 감지된 anti-pattern</span>
                </div>
                <ul className="space-y-1 text-[11px]">
                  {articleData.antiPatternWarnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-600 shrink-0">·</span>
                      <span className="text-slate-700">
                        <span className="font-medium">{w.label}</span>
                        {w.occurrences > 1 && <span className="text-amber-600"> ({w.occurrences}회)</span>}
                        {w.excerpt && <span className="text-slate-400 ml-1">— &ldquo;...{w.excerpt}...&rdquo;</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  자동 차단하지 않습니다 — 에디터에서 직접 수정하거나 AI 재생성을 시도하세요.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 메인 영역 */}
      <div className="flex flex-1 min-h-0">
        {/* 에디터 */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {/* 제목 입력 */}
          {articleData && (
            <div className="px-5 py-3 border-b border-slate-100">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="블로그 제목"
                className="w-full text-xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none"
              />
            </div>
          )}

          {loading ? (
            /* 실시간 스트리밍 프리뷰 — loading이 최우선 */
            <div className="flex-1 flex flex-col min-h-0">
              {/* 프로그레스 바 */}
              <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50">
                <div className="flex items-center gap-2 mb-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                  <span className="text-sm font-medium text-violet-700">{progressMsg}</span>
                  <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {elapsedSec}초
                  </span>
                </div>
                <div className="h-1 bg-violet-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min((elapsedSec / 40) * 100, 95)}%` }}
                  />
                </div>
              </div>
              {/* AI 실시간 HTML 프리뷰 */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {streamText ? (
                  <div className="relative">
                    <div
                      className="prose prose-base max-w-none prose-h2:text-[1.4rem] prose-h2:font-bold prose-h2:text-slate-900 prose-h2:mt-6 prose-h2:mb-2 prose-h2:pb-1.5 prose-h2:border-b prose-h2:border-slate-200 prose-h3:text-[1.1rem] prose-h3:font-semibold prose-h3:text-slate-800 prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-li:text-slate-700"
                      dangerouslySetInnerHTML={{ __html: extractHtmlFromStream(streamText, chartUrls) }}
                    />
                    <span className="inline-block w-2 h-5 bg-violet-400 animate-pulse ml-0.5 align-middle" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                    <Loader2 className="w-10 h-10 animate-spin text-violet-300" />
                    <p className="text-base">AI가 데이터를 분석하고 있습니다...</p>
                  </div>
                )}
              </div>
            </div>
          ) : articleData ? (
            <ArticleEditor
              htmlContent={htmlContent}
              onHtmlChange={handleHtmlChange}
            />
          ) : initialLoading ? (
            /* 저장된 글 fetch 중 — 빈 상태 UI가 깜빡이지 않도록 명시적 로딩 표시 */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin text-slate-300" />
              <p className="text-sm">저장된 글 불러오는 중...</p>
            </div>
          ) : loadError ? (
            /* fetch 실패 — Vercel Protection, 네트워크, 5xx 등 */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="space-y-1 max-w-md">
                <p className="text-base font-medium text-slate-700">글을 불러올 수 없습니다</p>
                <p className="text-sm text-slate-500 leading-relaxed">{loadError}</p>
              </div>
              <div className="flex gap-2">
                <Button size="md" variant="secondary" onClick={loadSavedArticle}>
                  다시 시도
                </Button>
                <Button size="md" variant="primary" onClick={handleGenerate} disabled={loading}>
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  새로 작성
                </Button>
              </div>
            </div>
          ) : (
            /* 진짜 빈 상태 — 저장된 글이 없음, 학원 정보 입력 + 명시적 생성 시작 */
            <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
              <Sparkles className="w-12 h-12 text-violet-300" />
              <div className="space-y-2 max-w-lg">
                <p className="text-lg font-medium text-slate-700">
                  학원 정보를 입력하고 AI 생성을 시작하세요
                </p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  상단의 <span className="text-slate-700 font-medium">&ldquo;학원 정보&rdquo;</span> 패널에서 학원명·강사명을 입력하면 글 마지막의 CTA에 자연스럽게 반영됩니다.
                  <br />
                  미입력 시 CTA가 단순 마무리로 처리됩니다 (학원 특색이 빠진 무명 CTA를 방지하기 위함).
                </p>
              </div>
              <Button size="md" variant="primary" onClick={handleGenerate} disabled={loading}>
                <Sparkles className="w-4 h-4 mr-1.5" />
                AI 생성 시작
              </Button>
              {!variables.academyName.trim() && (
                <p className="text-xs text-amber-600">
                  💡 학원명을 비워둔 채로 생성해도 됩니다 — CTA는 단순 마무리로 처리됩니다.
                </p>
              )}
            </div>
          )}
        </div>

      </div>

      {/* 하단: 태그 + 액션 버튼 */}
      {articleData && (
        <div className="border-t border-slate-200 bg-slate-50 shrink-0">
          {/* 태그 영역 */}
          <div className="px-4 py-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-slate-500">태그</span>
              {tags.map((tag, i) => (
                <span key={i} className="text-xs bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 스트리밍 JSON에서 content HTML 추출 (실시간 프리뷰용) ──

const CHART_PLACEHOLDER_STYLE = 'display:block;width:100%;height:200px;background:#F1F5F9;border:1px dashed #CBD5E1;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#94A3B8;font-size:13px;margin:1rem 0';

const CHART_CAPTION: Record<string, string> = {
  difficulty: '난이도 분포',
  ability_radar: '능력 영역 분포',
  topic_bar: '단원별 출제 현황',
  discrimination: '변별력 분석',
};

/** 미완성 태그 잘라내기 — 마지막 '<' 이후가 '>'로 안 닫혔으면 그 직전까지만 */
function safeTrimHtml(html: string): string {
  const lastOpen = html.lastIndexOf('<');
  const lastClose = html.lastIndexOf('>');
  return lastOpen > lastClose ? html.slice(0, lastOpen) : html;
}

/** 본문에 박힌 {{CHART:*}} 토큰을 실제 <img>(URL 있음) 또는 placeholder div로 치환 */
function replaceChartTokens(html: string, urls: ChartUrls): string {
  return html.replace(/\{\{CHART:(difficulty|ability_radar|topic_bar|discrimination)\}\}/g, (_m, key: string) => {
    const url = (urls as Record<string, string | undefined>)[key];
    const caption = CHART_CAPTION[key] || '차트';
    if (url) {
      return `<img src="${url}" alt="${caption}" style="max-width:100%;height:auto;border-radius:6px;margin:1rem 0" /><p style="text-align:center;color:#64748B;font-size:13px;margin-top:-0.5rem">▲ ${caption}</p>`;
    }
    return `<div style="${CHART_PLACEHOLDER_STYLE}">${caption} 차트 생성 중…</div>`;
  });
}

function extractHtmlFromStream(raw: string, chartUrls: ChartUrls = {}): string {
  // "content": " 마커를 찾아서 그 이후 내용만 추출
  const marker = raw.match(/"content"\s*:\s*"/);
  if (!marker || marker.index === undefined) {
    // content 필드가 아직 안 나왔으면 title이라도 표시
    const titleMatch = raw.match(/"title"\s*:\s*"([^"]*)/);
    if (titleMatch) return `<h2>${titleMatch[1]}</h2><p style="color:#94A3B8">본문 작성 중...</p>`;
    return '';
  }

  const startIdx = marker.index + marker[0].length;
  let content = raw.slice(startIdx);

  // JSON 문자열의 닫는 따옴표 이후 잘라내기 (아직 안 닫혔으면 전체 사용)
  // 마지막 unescaped " 찾기
  let endIdx = -1;
  for (let i = content.length - 1; i >= 0; i--) {
    if (content[i] === '"' && (i === 0 || content[i - 1] !== '\\')) {
      // 이 뒤에 , 또는 } 가 오면 content 필드가 끝난 것
      const after = content.slice(i + 1).trim();
      if (after.startsWith(',') || after.startsWith('}')) {
        endIdx = i;
        break;
      }
    }
  }
  if (endIdx > 0) content = content.slice(0, endIdx);

  // JSON 이스케이프 해제
  content = content
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\t/g, '\t');

  // 폐지된 차트 토큰 제거 (옛 모델이 출력해도 잔재 없도록)
  content = content.replace(/\{\{CHART:(type_radar|combined_radar)\}\}/g, '');

  // 차트 토큰을 실제 <img>(URL 있음) 또는 placeholder로 치환
  content = replaceChartTokens(content, chartUrls);

  // 미완성 HTML 태그 안전 절단 (마지막 '<...' 이 '>'로 안 닫혔으면 잘라냄)
  return safeTrimHtml(content);
}

// ── 간단 마크다운 → HTML 변환 (서버에서 마크다운으로 받은 경우) ──

function markdownToBasicHtml(md: string): string {
  let html = md;

  // 마크다운 테이블 제거 (| ... | 형식 → 리스트로 변환)
  html = html.replace(/^\|[-\s|:]+\|$/gm, ''); // 구분선 행 제거
  html = html.replace(/^\|(.+)\|$/gm, (_match, content: string) => {
    const cells = content.split('|').map((c: string) => c.trim()).filter(Boolean);
    return `- ${cells.join(' / ')}`;
  });

  // 구분선
  html = html.replace(/^---+$/gm, '<hr/>');

  // 이미지 (base64)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');

  // ## 소제목
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');

  // **볼드**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // ▶ / ● 등 특수 마커가 있는 행을 볼드 처리
  html = html.replace(/^(►|▶|●|◆)\s*(.+)$/gm, '<p><strong>$1 $2</strong></p>');

  // - 리스트
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // 줄바꿈 → 문단
  html = html
    .split(/\n\n+/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^<(h[23]|ul|img|hr|p)/.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .filter(Boolean)
    .join('\n');

  return html;
}
