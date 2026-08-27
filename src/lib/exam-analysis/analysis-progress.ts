/**
 * 분석 진행 로그 — 같은 Next 프로세스 안에서만 유효 (로컬 CLI/dev).
 * ExamPaper.analysisStep(1~4) 과 함께 GET 상세에 실어 보낸다.
 *
 * 운영에서는 CLI 경로를 타지 않으므로(`isCliExamAnalysisEnabled` → false) 이 로그는
 * 로컬 개발 진단용이다. 그래서 "예뻐 보이는 것"보다 **무슨 일이 몇 번 일어났는지**가 중요하다.
 *
 * ## 설계 — 도착 순서가 아니라 파이프라인 순서로 보여준다
 * 실행기(CLI)가 뱉는 이벤트 순서를 그대로 옮기면 호출/결과가 번갈아 나와 "같은 로그가
 * 무한 반복"처럼 보인다. 이 로그의 목적은 스트림 재현이 아니라 **어디까지 진행됐는지**이므로,
 * 각 줄에 단계(stage)를 달아 정해진 순서로 재배열한다. 줄이 실제로 일어난 일이라는 점은
 * 그대로다 — 배열만 사람이 읽기 좋은 순서로 바꾼다.
 */
export type AnalysisProgressLog = { time: string; msg: string };

/**
 * 파이프라인 단계 — 이 순서대로 정렬해 보여준다.
 *
 * `analysisStep` 1~4 진입 로그를 10·20·30·40 에 두고, 그 사이 세부 이벤트를
 * 11·21·31~33·41 로 끼운다. 10 단위로 띄운 건 나중에 세부 단계를 추가할 때
 * 기존 값을 다시 매기지 않기 위해서다.
 */
export const PROGRESS_STAGE = {
  /** setStep(1~4) 진입 로그 */
  STEP_1: 10,
  /** 시험지 파일 로드 완료 */
  LOAD_DONE: 11,
  STEP_2: 20,
  /** 분석 규칙(프롬프트) 구성 완료 */
  RULES_DONE: 21,
  STEP_3: 30,
  /** 실행기 호출 */
  CALL: 31,
  /** 실행기가 시험지를 읽는 중 — 쪽 번호로 세부 정렬 */
  READ: 32,
  /** 문항 수신 */
  RECEIVED: 33,
  STEP_4: 40,
  /** 완료 */
  DONE: 41,
} as const;

/** `analysisStep`(1~4) → 진입 로그의 단계값 */
export function stageForStep(step: number): number {
  return step * 10;
}

/**
 * 실행기(CLI)가 보내는 진행 문구 → 단계값.
 * 문구↔단계 지식을 이 파일 한 곳에만 둔다 (호출부가 매번 판단하지 않도록).
 */
export function cliProgressStage(msg: string): number {
  if (msg.startsWith('로컬 분석기 호출')) return PROGRESS_STAGE.CALL;
  return PROGRESS_STAGE.READ;
}

type Entry = {
  t: number;
  msg: string;
  count: number;
  stage: number;
  /** 같은 단계 안의 세부 순서 (쪽 번호 등). 없으면 0 */
  sub: number;
  /** 동률일 때 안정 정렬용 도착 순번 */
  seq: number;
};

const store = new Map<string, Entry[]>();
let seqCounter = 0;

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

/**
 * 우리가 만든 문구에서 쪽 번호를 되읽어 세부 정렬 키로 쓴다.
 * (외부 데이터 파싱이 아니라 **자기 출력** 파싱이라 포맷이 보장된다 — 아래 한 곳만 대응.)
 */
function subOrderFrom(msg: string): number {
  const m = msg.match(/시험지 (\d{1,3})쪽/);
  return m ? Number(m[1]) : 0;
}

/**
 * 같은 문구가 반복되면 **줄을 늘리지 않고 횟수를 올린다.**
 *
 * 예전엔 직전 한 줄과 같을 때만 버렸는데, 실행기 이벤트가 두 문구를 오가면
 * (읽는 중 → 페이지 확인 → 읽는 중 → …) 한 번도 걸러지지 않아 "같은 로그가 계속
 * 반복되는" 화면이 됐다. 지금은 문구가 쪽 단위로 합쳐져 있어 이 카운트가 실제로
 * **한 쪽을 몇 번 다시 읽었는지**를 드러낸다(= 낭비 진단에 쓸 수 있는 정보).
 *
 * 중복 판정은 마지막 줄이 아니라 **같은 단계 안 전체**를 본다 — 재배열하면
 * "마지막 줄"이라는 개념이 도착 순서에 묶이지 않기 때문이다.
 */
export function pushAnalysisProgress(id: string, msg: string, stage: number = PROGRESS_STAGE.READ): void {
  const trimmed = msg.replace(/\s+/g, ' ').trim();
  if (!trimmed) return;
  const list = store.get(id) ?? [];

  const dup = list.find((e) => e.msg === trimmed);
  if (dup) {
    dup.count += 1;
    // 시각은 **처음 발생한 때**를 유지한다. 갱신하면, 재배열된 목록에서 나중에 다시
    // 읽은 줄이 위쪽에 있으면서 시각만 뒤로 가 "시간이 거꾸로 흐르는" 화면이 된다.
    // 살아있다는 신호는 상단의 경과 시간과 이 횟수가 대신한다.
    store.set(id, list);
    return;
  }

  list.push({
    t: Date.now(),
    msg: trimmed,
    count: 1,
    stage,
    sub: subOrderFrom(trimmed),
    seq: seqCounter++,
  });
  store.set(id, list.slice(-50));
}

export function getAnalysisProgress(id: string): AnalysisProgressLog[] {
  const list = [...(store.get(id) ?? [])];
  // 파이프라인 순서 → 같은 단계면 쪽 번호 → 그래도 같으면 도착 순
  list.sort((a, b) => a.stage - b.stage || a.sub - b.sub || a.seq - b.seq);
  return list.map((e) => ({
    time: stamp(e.t),
    msg: e.count > 1 ? `${e.msg} (${e.count}회)` : e.msg,
  }));
}

/** 파일명 `page-001.png` → "1쪽". 실행기가 어느 쪽을 보고 있는지 살려낸다. */
function pageLabelFrom(blob: string): string | null {
  const m = blob.match(/page-(\d{1,3})\.(?:png|jpg|jpeg|webp|pdf)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? `${n}쪽` : null;
}

/**
 * CLI NDJSON 한 줄 → 사용자용 진행 문구. 모델명 없음(CLAUDE.md #0).
 *
 * 설계 원칙: **이벤트 종류가 아니라 "무엇에 대한 작업인지"로 묶는다.**
 * 실행기는 한 쪽을 읽을 때 호출 이벤트와 결과 이벤트를 따로 보내는데, 그 둘을
 * 다른 문구로 표시하면 사용자에게는 무한 반복으로 보인다. 같은 쪽에 대한 작업이면
 * 같은 문구로 만들고, 반복은 `pushAnalysisProgress` 가 횟수로 접는다.
 */
export function progressFromCliNdjsonLine(line: string): string | null {
  const raw = line.trim();
  if (!raw.startsWith('{')) return null;
  let ev: Record<string, unknown>;
  try {
    ev = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }

  // 초기화 이벤트는 **사용 가능한 도구 목록**(Read/Write/…)을 담고 있어서 단순 문자열
  // 매칭에 걸린다. 아직 아무 파일도 안 읽었는데 "읽는 중"이 찍히던 오검출을 막는다.
  const type = String(ev.type ?? '').toLowerCase();
  if (type === 'system' || type === 'init' || 'tools' in ev) return null;

  const blob = JSON.stringify(ev).toLowerCase();
  if (blob.includes('skill.md') || blob.includes('/skills/')) {
    return '시험지 파일만 읽도록 진행 중';
  }

  const page = pageLabelFrom(blob);
  if (page) return `시험지 ${page} 읽는 중`;

  if (
    blob.includes('read_file')
    || blob.includes('"read"')
    || blob.includes('tool_call')
    || blob.includes('tooluse')
  ) {
    return '시험지 파일을 읽는 중';
  }
  if (blob.includes('.pdf') || blob.includes('.png') || blob.includes('.jpg')) {
    return '시험지 페이지를 확인하는 중';
  }
  return null;
}
