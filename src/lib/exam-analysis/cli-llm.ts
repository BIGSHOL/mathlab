/**
 * 로컬 CLI LLM 어댑터 (dev 전용).
 *
 * 내부 Next.js 기출분석이 Gemini/Anthropic SDK 대신
 * `grok -p` / `claude -p` / `codex exec` 를 spawn 한다.
 * 벤더는 EXAM_ANALYSIS_CLI 로 고르고, `auto` 면 PATH 에서 찾는다.
 *
 * 운영(Vercel / NODE_ENV=production)에서는 절대 켜지지 않는다.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { spawn, execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  ANALYZE_STUCK_BUFFER_MS,
  CLI_ANALYZE_TIMEOUT_MS,
  CLI_CALL_TIMEOUT_MS,
  CLI_KIND_ORDER,
  GEMINI_ANALYZE_TIMEOUT_MS,
  parseCliKind,
  type CliKind,
} from './cli-kind';
import { progressFromCliNdjsonLine } from './analysis-progress';

export type { CliKind } from './cli-kind';
export { CLI_KIND_ORDER, CLI_KIND_LABEL, parseCliKind } from './cli-kind';

const execFileAsync = promisify(execFile);

export interface CliVisionCallOptions {
  images: string[];
  prompt: string;
  mimeTypeHint?: string;
  onProgress?: (msg: string) => void;
}

export interface ResolvedCli {
  kind: CliKind;
  bin: string;
}

const CLI_ROUTE_TIMEOUT_MS = CLI_ANALYZE_TIMEOUT_MS;
const GEMINI_ROUTE_TIMEOUT_MS = GEMINI_ANALYZE_TIMEOUT_MS;

const cliAls = new AsyncLocalStorage<CliKind>();
const resolvedByKey = new Map<string, ResolvedCli>();

export function runWithCliKind<T>(kind: CliKind | undefined, fn: () => Promise<T>): Promise<T> {
  if (!kind || isProductionRuntime()) return fn();
  return cliAls.run(kind, fn);
}

function requestedKind(): CliKind | 'auto' {
  const als = cliAls.getStore();
  if (als) return als;
  const pref = (process.env.EXAM_ANALYSIS_CLI ?? 'auto').trim().toLowerCase();
  return parseCliKind(pref) ?? 'auto';
}

export function isProductionRuntime(): boolean {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
}

/**
 * 기출분석이 로컬 CLI 를 탈지 여부.
 * - 운영: 항상 false
 * - EXAM_ANALYSIS_PROVIDER=gemini|google → false
 * - EXAM_ANALYSIS_PROVIDER=cli|local → true (바이너리 없으면 호출 시 에러)
 * - 미설정 + next dev → PATH 에 CLI 가 있으면 true
 */
export function isCliExamAnalysisEnabled(): boolean {
  if (isProductionRuntime()) return false;
  if (cliAls.getStore()) return true;
  const v = (process.env.EXAM_ANALYSIS_PROVIDER ?? '').trim().toLowerCase();
  if (v === 'gemini' || v === 'google') return false;
  if (v === 'cli' || v === 'local') return true;
  if (v) return false;
  return process.env.NODE_ENV !== 'production';
}

export function getExamAnalysisTimeoutMs(): number {
  return isCliExamAnalysisEnabled() ? CLI_ROUTE_TIMEOUT_MS : GEMINI_ROUTE_TIMEOUT_MS;
}

/** 이 시간 이상 ANALYZING 이고 updatedAt 이 안 바뀌면 갇힌 것으로 본다. */
export function getExamAnalysisStuckMs(): number {
  return getExamAnalysisTimeoutMs() + ANALYZE_STUCK_BUFFER_MS;
}

export function getExamAnalysisTimeoutLabel(): string {
  const ms = getExamAnalysisTimeoutMs();
  const minutes = Math.round(ms / 60_000);
  return `AI 분석 타임아웃 (${minutes}분 초과)`;
}

/** DB modelVersion 용 — 사용자 UI 는 prompt 버전만 보여야 한다 (규칙 #0). */
export function getExamAnalysisModelVersion(promptVersion: string): string {
  if (isCliExamAnalysisEnabled()) return `cli / prompt ${promptVersion}`;
  return `gemini-3.1-pro-preview / prompt ${promptVersion}`;
}

export async function resolveExamAnalysisCli(): Promise<ResolvedCli> {
  const pref = requestedKind();
  const cached = resolvedByKey.get(pref);
  if (cached) return cached;

  const wanted: CliKind[] = pref === 'auto' ? CLI_KIND_ORDER : [pref];
  const errors: string[] = [];
  for (const kind of wanted) {
    const byKind = resolvedByKey.get(kind);
    if (byKind) {
      resolvedByKey.set(pref, byKind);
      return byKind;
    }
    const bin = await findOnPath(kind);
    if (bin) {
      const resolved = { kind, bin };
      resolvedByKey.set(kind, resolved);
      resolvedByKey.set(pref, resolved);
      return resolved;
    }
    errors.push(kind);
  }

  throw new Error(
    `로컬 AI 실행기를 찾을 수 없습니다 (${errors.join(', ')}). 개발 환경 설정을 확인하세요.`,
  );
}

export function peekResolvedCli(): ResolvedCli | null {
  return resolvedByKey.get(requestedKind()) ?? null;
}

export async function listInstalledClis(): Promise<ResolvedCli[]> {
  const found: ResolvedCli[] = [];
  for (const kind of CLI_KIND_ORDER) {
    const cached = resolvedByKey.get(kind);
    if (cached) {
      found.push(cached);
      continue;
    }
    const bin = await findOnPath(kind);
    if (bin) {
      const resolved = { kind, bin };
      resolvedByKey.set(kind, resolved);
      found.push(resolved);
    }
  }
  return found;
}

export async function callCliVision(opts: CliVisionCallOptions): Promise<string> {
  const cli = await resolveExamAnalysisCli();
  const dir = await mkdtemp(join(tmpdir(), 'mathlab-exam-'));
  try {
    const imageNames = await writeImages(dir, opts.images, opts.mimeTypeHint);
    if (imageNames.length === 0) {
      throw new Error('분석할 이미지가 없습니다');
    }
    const prompt = buildCliUserPrompt(imageNames, opts.prompt);
    const promptPath = join(dir, 'prompt.txt');
    await writeFile(promptPath, prompt, 'utf8');

    console.info(
      `[기출분석] CLI LLM: ${cli.kind} (${cli.bin}) images=${imageNames.length} timeout=${CLI_CALL_TIMEOUT_MS}ms`,
    );
    opts.onProgress?.(`로컬 분석기 호출 (${imageNames.length}개 파일)`);

    const onLine = (line: string) => {
      const msg = progressFromCliNdjsonLine(line);
      if (msg) opts.onProgress?.(msg);
    };

    const result =
      cli.kind === 'grok'
        ? await runGrok(cli.bin, dir, promptPath, imageNames, onLine)
        : cli.kind === 'claude'
          ? await runClaude(cli.bin, dir, prompt, onLine)
          : await runCodex(cli.bin, dir, promptPath, imageNames, onLine);

    const text = extractTextFromCliOutput(cli.kind, result.stdout, result.lastMessage);
    if (!text.trim()) {
      const errTail = (result.stderr || '').trim().slice(-800);
      throw new Error(
        errTail
          ? `AI 응답이 비어있습니다\n${errTail}`
          : 'AI 응답이 비어있습니다',
      );
    }
    return text;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function extractTextFromCliOutput(
  kind: CliKind,
  stdout: string,
  lastMessage?: string,
): string {
  if (lastMessage && lastMessage.trim()) return lastMessage.trim();

  const trimmed = stdout.trim();
  if (!trimmed) return '';

  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    const picked = pickTextField(obj);
    if (picked) return picked;
  } catch {
    // JSONL (codex --json 등)
  }

  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
  const candidates: string[] = [];
  for (const line of lines) {
    try {
      const ev = JSON.parse(line) as Record<string, unknown>;
      const picked = pickTextField(ev);
      if (picked) candidates.push(picked);
      collectJsonStrings(ev, candidates);
    } catch {
      continue;
    }
  }
  const withExam = candidates.filter((c) => c.includes('exam_info') || c.includes('"questions"'));
  if (withExam.length > 0) return withExam[withExam.length - 1];
  if (candidates.length > 0) return candidates[candidates.length - 1];

  return trimmed;
}

function collectJsonStrings(v: unknown, out: string[]): void {
  if (typeof v === 'string') {
    if (v.includes('{') && v.length > 20) out.push(v);
    return;
  }
  if (Array.isArray(v)) {
    for (const item of v) collectJsonStrings(item, out);
    return;
  }
  if (v && typeof v === 'object') {
    for (const val of Object.values(v as Record<string, unknown>)) collectJsonStrings(val, out);
  }
}

function pickTextField(obj: Record<string, unknown>): string | null {
  if (typeof obj.text === 'string' && obj.text.trim()) return obj.text;
  if (typeof obj.result === 'string' && obj.result.trim()) return obj.result;
  if (typeof obj.message === 'string' && obj.message.trim()) return obj.message;
  if (typeof obj.last_agent_message === 'string' && obj.last_agent_message.trim()) {
    return obj.last_agent_message;
  }
  const item = obj.item;
  if (item && typeof item === 'object') {
    const rec = item as Record<string, unknown>;
    if (typeof rec.text === 'string' && rec.text.trim()) return rec.text;
    if (typeof rec.content === 'string' && rec.content.trim()) return rec.content;
  }
  const msg = obj.msg;
  if (msg && typeof msg === 'object') {
    const rec = msg as Record<string, unknown>;
    if (typeof rec.text === 'string' && rec.text.trim()) return rec.text;
  }
  return null;
}

function buildCliUserPrompt(imageNames: string[], originalPrompt: string): string {
  const list = imageNames.map((n, i) => `${i + 1}. ${n}`).join('\n');
  return [
    '당신은 시험지 이미지/PDF를 읽고 JSON 객체 하나만 출력하는 분석기입니다.',
    '',
    '현재 작업 디렉터리의 아래 파일을 모두 읽으세요. 파일을 보지 않고 추측하지 마세요.',
    list,
    '',
    '최종 응답 규칙:',
    '- JSON 객체 하나만 출력',
    '- 마크다운 코드펜스·설명 문장·접두어 금지',
    '- 위에 나열된 시험지 파일만 읽을 것. SKILL.md 등 다른 문서는 읽지 말 것.',
    '',
    '===== 분석 지시 =====',
    originalPrompt,
  ].join('\n');
}

async function writeImages(
  dir: string,
  images: string[],
  mimeTypeHint?: string,
): Promise<string[]> {
  const names: string[] = [];
  for (let i = 0; i < images.length; i++) {
    const raw = images[i];
    if (!raw) continue;
    const mime = mimeTypeHint || inferMime(raw);
    const ext = extFromMime(mime);
    const name = `page-${String(i + 1).padStart(3, '0')}.${ext}`;
    const buf = Buffer.from(stripDataUriPrefix(raw), 'base64');
    if (buf.length === 0) continue;
    await writeFile(join(dir, name), buf);
    names.push(name);
  }
  return names;
}

function inferMime(input: string): string {
  if (input.startsWith('data:')) {
    const match = input.match(/^data:([^;]+);/);
    if (match) return match[1];
  }
  return 'image/png';
}

function extFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes('pdf')) return 'pdf';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  return 'png';
}

function stripDataUriPrefix(base64: string): string {
  const commaIdx = base64.indexOf(',');
  if (commaIdx !== -1 && base64.startsWith('data:')) {
    return base64.slice(commaIdx + 1);
  }
  return base64;
}

async function runGrok(
  bin: string,
  cwd: string,
  promptPath: string,
  _imageNames: string[],
  onLine?: (line: string) => void,
): Promise<ProcResult> {
  return runProcess({
    command: bin,
    args: [
      '--cwd', cwd,
      '--prompt-file', promptPath,
      '--output-format', 'streaming-json',
      '--tools', 'read_file',
      '--yolo',
      '--no-subagents',
      '--verbatim',
      '--no-auto-update',
      '--max-turns', '8',
      '--system-prompt-override',
      'You are an exam-paper vision analyzer. Read only the listed exam image/PDF files with the read_file tool. Do not read SKILL.md or any other docs. Then output a single JSON object. No markdown fences. No commentary.',
    ],
    cwd,
    timeoutMs: CLI_CALL_TIMEOUT_MS,
    onLine,
  });
}

async function runClaude(bin: string, cwd: string, prompt: string, onLine?: (line: string) => void): Promise<ProcResult> {
  return runProcess({
    command: bin,
    args: [
      '-p',
      '--output-format', 'stream-json',
      '--bare',
      '--dangerously-skip-permissions',
      '--allowedTools', 'Read',
      '--add-dir', cwd,
    ],
    cwd,
    timeoutMs: CLI_CALL_TIMEOUT_MS,
    stdin: prompt,
    shell: isWindowsBatch(bin),
    onLine,
  });
}

async function runCodex(
  bin: string,
  cwd: string,
  promptPath: string,
  imageNames: string[],
  onLine?: (line: string) => void,
): Promise<ProcResult> {
  const lastPath = join(cwd, 'last-message.txt');
  const imageArgs = imageNames.flatMap((n) => ['-i', join(cwd, n)]);
  const result = await runProcess({
    command: bin,
    args: [
      'exec',
      '-C', cwd,
      '--skip-git-repo-check',
      '--sandbox', 'read-only',
      '--ephemeral',
      '--color', 'never',
      '-o', lastPath,
      ...imageArgs,
      '-',
    ],
    cwd,
    timeoutMs: CLI_CALL_TIMEOUT_MS,
    stdin: await readFile(promptPath, 'utf8'),
    shell: isWindowsBatch(bin),
    onLine,
  });
  let lastMessage = '';
  try {
    lastMessage = await readFile(lastPath, 'utf8');
  } catch {
    lastMessage = '';
  }
  return { ...result, lastMessage };
}

interface ProcResult {
  stdout: string;
  stderr: string;
  code: number | null;
  lastMessage?: string;
}

function isWindowsBatch(bin: string): boolean {
  return process.platform === 'win32' && /\.(cmd|bat)$/i.test(bin);
}

function runProcess(opts: {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  stdin?: string;
  shell?: boolean;
  onLine?: (line: string) => void;
}): Promise<ProcResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(opts.command, opts.args, {
      cwd: opts.cwd,
      env: process.env,
      shell: opts.shell ?? false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let lineBuf = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      killProcessTree(child.pid);
      reject(new Error(`AI 분석 타임아웃 (${Math.round(opts.timeoutMs / 60_000)}분 초과)`));
    }, opts.timeoutMs);

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      stdout += chunk;
      if (!opts.onLine) return;
      lineBuf += chunk;
      const parts = lineBuf.split(/\r?\n/);
      lineBuf = parts.pop() ?? '';
      for (const line of parts) {
        if (line.trim()) opts.onLine(line);
      }
    });
    child.stderr?.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0 && !stdout.trim()) {
        reject(
          new Error(
            `AI 실행기가 종료되었습니다 (code ${code})${stderr.trim() ? `\n${stderr.trim().slice(-800)}` : ''}`,
          ),
        );
        return;
      }
      resolve({ stdout, stderr, code });
    });

    if (opts.stdin && child.stdin) {
      child.stdin.write(opts.stdin, 'utf8');
      child.stdin.end();
    } else {
      child.stdin?.end();
    }
  });
}

function killProcessTree(pid: number | undefined): void {
  if (!pid) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    });
    return;
  }
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    /* already gone */
  }
}

async function findOnPath(bin: string): Promise<string | null> {
  const extra = extraBinDirs();
  for (const dir of extra) {
    const hit = pickExisting(dir, bin);
    if (hit) return hit;
  }

  const whichCmd = process.platform === 'win32' ? 'where.exe' : 'which';
  try {
    const { stdout } = await execFileAsync(whichCmd, [bin], { windowsHide: true });
    const candidates = stdout
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const exe = candidates.find((p) => /\.exe$/i.test(p));
    const picked = exe ?? candidates[0];
    return picked && existsSync(picked) ? picked : null;
  } catch {
    return null;
  }
}

function extraBinDirs(): string[] {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const dirs = [
    join(home, '.grok', 'bin'),
    join(home, 'AppData', 'Roaming', 'npm'),
    join(home, '.local', 'bin'),
  ];
  return dirs.filter((d) => d && existsSync(d));
}

function pickExisting(dir: string, bin: string): string | null {
  if (process.platform === 'win32') {
    const names = [`${bin}.exe`, `${bin}.cmd`, `${bin}.bat`, bin];
    for (const name of names) {
      const p = join(dir, name);
      if (existsSync(p)) return p;
    }
    return null;
  }
  const p = join(dir, bin);
  return existsSync(p) ? p : null;
}
