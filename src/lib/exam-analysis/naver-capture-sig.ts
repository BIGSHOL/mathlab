/**
 * 네이버 블로그 이미지 캡처 캐시 시그니처.
 *
 * 캡처는 비싸다(14블록 기준 dev ~94초). sig 가 같고 TTL 안이면 localStorage 의 URL 을 재사용한다.
 * sig 가 화면과 어긋나면 옛 PNG 가 붙는다 — 단원 교정·학교명 변경이 그 사례였다.
 *
 * 구조 서명(블록 id + 그 블록의 variant id 전수)은 레지스트리에서 파생한다.
 * 블록·표현이 추가/삭제/개명되면 손대지 않아도 캐시가 무효화된다.
 */

/** 짧은 문자열 해시(djb2) — 캐시 시그니처용. 충돌 위험은 무시 가능 수준. */
export function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * 네이버 섹션 캡처 캐시 무효화 버전 — 캡처 로직/스타일을 바꾸거나 서버 이미지를 초기화하면 bump.
 * v2: 캡처 이미지 일괄 초기화 + 3일 TTL 도입(2026-05-30) → 기존 v1 클라 캐시 무시.
 * v3: 옆트임 강제 paste는 네이버가 무조건 fit으로 재빌드 → 불가능 확정. 옆트임 실험 제거,
 *     표준(문서너비 720px) 단일 경로로 정리(2026-05-30). 옆트임은 사용자가 네이버에서 수동 적용.
 * v4: 시그니처에 문항 단원·신뢰도·지면 메타·레지스트리 구조를 추가하고, 이번 라운드 렌더러·CSS
 *     수정으로 기존 캡처가 전부 낡아 일괄 무효화(2026-08-28). 다음 복사 때 재캡처가 돈다.
 *
 * 언제 손으로 올려야 하는가:
 *   레지스트리에 블록/variant 를 추가·삭제·개명하면 구조 서명이 자동으로 바뀌므로 bump 불필요.
 *   테마·레이아웃·문체·이 시험의 블록 on/off/variant 는 data-template-signature(layoutSig)에
 *   이미 들어 있어 마찬가지로 자동.
 *   다음만 수동 bump:
 *     (1) 블록 렌더러 본문(JSX/카피/마크업)이 바뀌었는데 블록 id·variant id 는 그대로인 경우
 *     (2) `.v3-*` CSS 의 색·타이포·간격만 바뀐 경우 — 구조 서명은 토큰 값을 보지 않는다
 *     (3) 캡처 파이프라인 자체(폭, html-to-image 옵션, 후처리, 이미지 포맷)가 바뀐 경우
 */
export const NAVER_CAPTURE_VERSION = 'v4';

/**
 * 문항 시그니처에 넣는 필드.
 * PATCH /api/exam-analysis/[id]/questions/[questionNumber] 의 교정 가능 필드 전수
 * (difficulty, points, question_type, ability_domain, topic, confidence)
 * + 캡처 지면의 정오/히트맵에 쓰이는 is_correct.
 */
export interface CaptureSigQuestion {
  difficulty?: unknown;
  points?: unknown;
  question_type?: unknown;
  ability_domain?: unknown;
  is_correct?: unknown;
  topic?: unknown;
  confidence?: unknown;
}

export function questionCaptureSig(questions: CaptureSigQuestion[]): string {
  return questions
    .map((q) =>
      [
        q.difficulty,
        q.points,
        q.question_type ?? '',
        q.ability_domain ?? '',
        q.is_correct ?? '',
        q.topic ?? '',
        q.confidence ?? '',
      ].join('|'),
    )
    .join(';');
}

/**
 * 캡처된 지면에 실제로 찍히는 BlockMeta 필드.
 * hasStudentData 는 문항 is_correct 로 이미 잡히므로 여기 넣지 않는다.
 */
export interface CaptureSigMeta {
  examTitle: string;
  schoolName: string | null;
  grade: string;
  analyzedAt: string | null;
  totalQuestions: number;
  totalPoints: number;
}

export function metaCaptureSig(meta: CaptureSigMeta): string {
  // 키 순서를 고정해 JSON.stringify 가 입력 삽입 순서에 흔들리지 않게 한다.
  return JSON.stringify({
    examTitle: meta.examTitle,
    schoolName: meta.schoolName,
    grade: meta.grade,
    analyzedAt: meta.analyzedAt,
    totalQuestions: meta.totalQuestions,
    totalPoints: meta.totalPoints,
  });
}

export interface CaptureSigRegistryBlock {
  id: string;
  variants: { id: string }[];
}

/** 레지스트리에서 블록 id + 그 블록의 variant id 전수를 뽑아 구조 서명. */
export function registryStructureSig(blocks: CaptureSigRegistryBlock[]): string {
  return blocks.map((b) => `${b.id}:${b.variants.map((v) => v.id).join(',')}`).join('|');
}

export function buildNaverCaptureSig(input: {
  commentary: unknown;
  questions: CaptureSigQuestion[];
  meta: CaptureSigMeta;
  layoutSig: string;
  registryBlocks: CaptureSigRegistryBlock[];
  version?: string;
}): string {
  const version = input.version ?? NAVER_CAPTURE_VERSION;
  return [
    version,
    hashStr(JSON.stringify(input.commentary)),
    hashStr(questionCaptureSig(input.questions)),
    hashStr(input.layoutSig),
    hashStr(metaCaptureSig(input.meta)),
    hashStr(registryStructureSig(input.registryBlocks)),
  ].join('|');
}
