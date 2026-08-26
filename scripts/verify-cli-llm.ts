/**
 * 로컬 CLI LLM 어댑터 스모크.
 * 1) JSON 추출 유닛
 * 2) PATH 에서 grok/claude/codex 해석
 * 3) --ping 이면 실제 grok/claude/codex 한 번 호출 (JSON {ok:true})
 */
import {
  extractTextFromCliOutput,
  isCliExamAnalysisEnabled,
  resolveExamAnalysisCli,
} from '../src/lib/exam-analysis/cli-llm';
import { isolateJsonPayload, parseJsonResponse } from '../src/lib/exam-analysis/ai-engine';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function testExtract() {
  const grok = extractTextFromCliOutput(
    'grok',
    JSON.stringify({ text: '{"ok":true}', sessionId: 'abc' }),
  );
  assert(grok === '{"ok":true}', `grok wrap: ${grok}`);

  const claude = extractTextFromCliOutput(
    'claude',
    JSON.stringify({ type: 'result', result: '{"ok":true}' }),
  );
  assert(claude === '{"ok":true}', `claude wrap: ${claude}`);

  const jsonl = extractTextFromCliOutput(
    'codex',
    ['{"type":"start"}', '{"last_agent_message":"{\\"ok\\":true}"}'].join('\n'),
  );
  assert(jsonl.includes('ok'), `codex jsonl: ${jsonl}`);

  const last = extractTextFromCliOutput('codex', 'noise', '{"ok":true}');
  assert(last === '{"ok":true}', `last-message: ${last}`);

  const stream = extractTextFromCliOutput(
    'grok',
    [
      '{"type":"tool_call","name":"read_file"}',
      '{"type":"assistant","text":"{\\"exam_info\\":{\\"total_questions\\":2},\\"questions\\":[]}"}',
    ].join('\n'),
  );
  assert(stream.includes('exam_info'), `streaming-json extract: ${stream.slice(0, 80)}`);

  console.log('extractTextFromCliOutput: ok');
}

function testParseJsonPreamble() {
  const preamble =
    '시험지 PDF를 읽어 문항을 분석하겠습니다.페이지가 회전되어 있어 텍스트를 추출해 문항·배점을 정확히 확인하겠습니다.{"exam_info":{"total_questions":29},"questions":[]}';
  assert(
    isolateJsonPayload(preamble).startsWith('{"exam_info"'),
    `isolateJsonPayload dropped preamble: ${isolateJsonPayload(preamble).slice(0, 40)}`,
  );
  const parsed = parseJsonResponse<{ exam_info: { total_questions: number } }>(preamble);
  assert(parsed.exam_info.total_questions === 29, `preamble parse: ${JSON.stringify(parsed)}`);

  const fenced = '설명\n```json\n{"ok":true}\n```\n끝';
  assert(parseJsonResponse<{ ok: boolean }>(fenced).ok === true, 'fenced json');

  const plain = '{"ok":true}';
  assert(parseJsonResponse<{ ok: boolean }>(plain).ok === true, 'plain json');
  console.log('parseJsonResponse preamble: ok');
}

async function main() {
  testExtract();
  testParseJsonPreamble();
  console.log('isCliExamAnalysisEnabled:', isCliExamAnalysisEnabled());
  try {
    const cli = await resolveExamAnalysisCli();
    console.log('resolved:', cli.kind, cli.bin);
  } catch (e) {
    console.log('resolve failed:', e instanceof Error ? e.message : e);
  }

  if (process.argv.includes('--ping')) {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const { callCliVision } = await import('../src/lib/exam-analysis/cli-llm');
    const dir = await mkdtemp(join(tmpdir(), 'mathlab-cli-ping-'));
    try {
      // 1x1 png
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ).toString('base64');
      const text = await callCliVision({
        images: [png],
        prompt: 'Ignore the image. Reply with exactly {"ok":true} and no other text.',
        mimeTypeHint: 'image/png',
      });
      console.log('ping text:', text.slice(0, 400));
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
