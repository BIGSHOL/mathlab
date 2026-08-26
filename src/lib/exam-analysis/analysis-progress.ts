/**
 * 분석 진행 로그 — 같은 Next 프로세스 안에서만 유효 (로컬 CLI/dev).
 * ExamPaper.analysisStep(1~4) 과 함께 GET 상세에 실어 보낸다.
 */
export type AnalysisProgressLog = { time: string; msg: string };

const store = new Map<string, Array<{ t: number; msg: string }>>();

function stamp(t: number): string {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function resetAnalysisProgress(id: string): void {
  store.set(id, []);
}

export function clearAnalysisProgress(id: string): void {
  store.delete(id);
}

export function pushAnalysisProgress(id: string, msg: string): void {
  const trimmed = msg.replace(/\s+/g, ' ').trim();
  if (!trimmed) return;
  const list = store.get(id) ?? [];
  const last = list[list.length - 1];
  if (last && last.msg === trimmed) return;
  list.push({ t: Date.now(), msg: trimmed });
  store.set(id, list.slice(-50));
}

export function getAnalysisProgress(id: string): AnalysisProgressLog[] {
  return (store.get(id) ?? []).map((e) => ({ time: stamp(e.t), msg: e.msg }));
}

/** CLI NDJSON 한 줄 → 사용자용 진행 문구. 모델명 없음. */
export function progressFromCliNdjsonLine(line: string): string | null {
  const raw = line.trim();
  if (!raw.startsWith('{')) return null;
  let ev: Record<string, unknown>;
  try {
    ev = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  const blob = JSON.stringify(ev).toLowerCase();
  if (blob.includes('skill.md') || blob.includes('/skills/')) {
    return '시험지 파일만 읽도록 진행 중';
  }
  if (
    blob.includes('read_file')
    || blob.includes('"read"')
    || blob.includes('tool_call')
    || blob.includes('tooluse')
  ) {
    return '시험지 파일을 읽는 중';
  }
  if (blob.includes('page-00') || blob.includes('.pdf') || blob.includes('.png') || blob.includes('.jpg')) {
    return '시험지 페이지를 확인하는 중';
  }
  return null;
}
