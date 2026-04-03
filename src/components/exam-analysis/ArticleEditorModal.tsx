'use client';

/**
 * 기출 분석 블로그 글 에디터 모달
 *
 * 풀스크린 모달: TipTap 에디터 + SEO 점수 패널 + 복사/다운로드
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { X, RefreshCw, Copy, Loader2, Clock } from 'lucide-react';
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

interface ArticleData {
  title: string;
  content: string;
  tags: string[];
  metaDescription: string;
  chartImages?: {
    difficulty: string;
    typeRadar: string;
    topicBar: string;
  };
}

export function ArticleEditorModal({ examPaperId, schoolName, onClose }: ArticleEditorModalProps) {
  const [loading, setLoading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [streamText, setStreamText] = useState(''); // AI 실시간 타이핑
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 저장된 글 로드 → 없으면 자동 생성 시작
  const autoStarted = useRef(false);
  useEffect(() => {
    const loadOrGenerate = async () => {
      try {
        const res = await fetch(`/api/exam-analysis/${examPaperId}/generate-article`);
        const json = await res.json();
        if (json.data) {
          applyArticleData(json.data);
          return;
        }
      } catch {
        // 무시
      }
      // 저장된 글 없음 → 자동 생성
      if (!autoStarted.current) {
        autoStarted.current = true;
        handleGenerate();
      }
    };
    loadOrGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examPaperId]);

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
    setLoading(true);
    setElapsedSec(0);
    setStreamText('');
    setProgressMsg('준비 중...');
    timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);

    try {
      const res = await fetch(`/api/exam-analysis/${examPaperId}/generate-article`, {
        method: 'POST',
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
            } else if (event.type === 'stream') {
              accumulatedStream += event.delta;
              setStreamText(accumulatedStream);
            } else if (event.type === 'result') {
              // 최종 결과 — 에디터에 로드
              applyArticleData(event as ArticleData);
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
    // 1. text-align: left만 제거 (기본값), center/right는 유지
    result = result.replace(/\s*text-align:\s*left\s*;?/gi, '');
    // 2. <h2> → <p> 큰 글씨 + <hr> 구분선 (네이버 패턴)
    result = result.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi,
      '<p><span style="font-size: 24px;"><b>$1</b></span></p><hr>');
    // 3. <h3> → <p> 중간 글씨
    result = result.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi,
      '<p><span style="font-size: 18px;"><b>$1</b></span></p>');
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
      // fallback
      try {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const textBlob = new Blob([htmlContent.replace(/<[^>]*>/g, '')], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob }),
        ]);
        toast.success('서식이 복사되었습니다.');
      } catch {
        await navigator.clipboard.writeText(htmlContent.replace(/<[^>]*>/g, ''));
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
                      dangerouslySetInnerHTML={{ __html: extractHtmlFromStream(streamText) }}
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
          ) : (
            /* 초기 상태 (자동 생성 대기) */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-violet-300" />
              <p className="text-base">준비 중...</p>
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

function extractHtmlFromStream(raw: string): string {
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

  return content;
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
