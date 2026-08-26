/** 로컬 CLI 종류 — 클라이언트/서버 공유 (Node API 없음). */

export type CliKind = 'grok' | 'claude' | 'codex';

export const CLI_KIND_ORDER: CliKind[] = ['grok', 'claude', 'codex'];

export const CLI_KIND_LABEL: Record<CliKind, string> = {
  grok: 'grok -p',
  claude: 'claude -p',
  codex: 'codex exec',
};

export function parseCliKind(raw: unknown): CliKind | undefined {
  if (raw === 'grok' || raw === 'claude' || raw === 'codex') return raw;
  return undefined;
}

export const EXAM_CLI_STORAGE_KEY = 'mathlab_exam_cli';

/** Gemini 경로 라우트 타임아웃 (기존 3분). */
export const GEMINI_ANALYZE_TIMEOUT_MS = 180_000;
/** 로컬 CLI 경로 라우트 타임아웃 — 비전 툴콜 + 1회 재분석 여유. */
export const CLI_ANALYZE_TIMEOUT_MS = 22 * 60 * 1000;
/** CLI 프로세스 1회 호출 타임아웃. */
export const CLI_CALL_TIMEOUT_MS = 10 * 60 * 1000;
/** ANALYZING 자동 복구는 라우트 타임아웃 + 이 버퍼 이후에만. */
export const ANALYZE_STUCK_BUFFER_MS = 60_000;
