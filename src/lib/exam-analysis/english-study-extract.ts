/**
 * 영어 시험지에서 학습용 단어·구문만 뽑는다.
 * 문항 번호·독해 유형명은 넣지 않는다.
 */
import path from 'path';
import { readFile } from 'fs/promises';
import { callExamVision } from './ai-engine';
import type { AnalyzedQuestion } from './types';
import {
  parseEnglishStudyResult,
  type EnglishStudyExtracted,
} from './english-study-pack';
import { ENGLISH_QUESTION_TYPE_LABELS } from './constants';
import { simplifyExamKorean } from './simple-korean';

export async function loadExamUrlAsBase64(fileUrl: string): Promise<string> {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`파일 다운로드 실패: ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf).toString('base64');
  }
  const filePath = path.join(process.cwd(), 'public', fileUrl);
  const buffer = await readFile(filePath);
  return buffer.toString('base64');
}

function questionHint(questions: AnalyzedQuestion[]): string {
  const lines = questions.slice(0, 40).map((q) => {
    const type = ENGLISH_QUESTION_TYPE_LABELS[q.question_type || ''] || q.question_type || '';
    const topic = (q.topic || '').split(' > ').pop() || '';
    const comment = simplifyExamKorean(q.ai_comment || '').slice(0, 40);
    return `${q.question_number} ${type} 난이도${q.difficulty} ${topic} ${comment}`.trim();
  });
  return lines.join('\n').slice(0, 2800);
}

function buildPrompt(questions: AnalyzedQuestion[], grade?: string | null): string {
  const gradeLabel = (grade || '').trim() || '중고등';
  const hint = questionHint(questions);
  return `당신은 한국 ${gradeLabel} 영어 내신 시험지에서 학생이 외워야 할 단어와 구문만 고르는 선생님입니다.

시험지 이미지를 보고, 지문·선지·빈칸·영작에 **실제로 적혀 있는** 영어만 뽑으세요.

출력은 JSON 객체 하나만. 설명 문장, 코드펜스 금지.

형식:
{"vocab":[{"word":"nevertheless","meaning":"그럼에도","count":2,"trap":false}],"structures":[{"pattern":"too ~ to","meaning":"너무 ~해서 못 함","count":1,"trap":true}]}

단어(vocab):
- word는 시험지에 인쇄된 영어 단어 또는 숙어
- a, the, is, and 같은 기초 단어는 빼기
- 중고등 내신에서 외울 가치가 있는 것만. 최대 40개
- meaning은 쉬운 한국어, 10자 안
- count는 시험지에서 보인 횟수. 한 번이면 1
- 혼동하기 쉽거나 고난도 문항에 쓰였으면 trap true

구문(structures):
- pattern은 영어 형태가 있는 문법 구문만. 예: too ~ to, If I were, have + p.p., who/which/that, so ~ that, not only ~ but also
- 한국어 독해 유형명은 구문이 아님. 절대 넣지 말 것: 빈칸 추론, 글의 구조, 주제·요지, 세부 정보 파악, 함축적 의미, 필자 의도, 시제, 조동사
- 문항 번호를 구문으로 넣지 말 것
- pattern/word 에 한글이 영어보다 많으면 안 됨
- meaning은 쉬운 한국어, 12자 안
- 최대 25개

금지:
- 시험지에 없는 단어 만들기
- 문항 번호
- 영문 enum
- 어려운 한자어(호혜적, 함축, 환언)

문항 힌트(유형·난이도, 참고만. 단어는 반드시 시험지에서):
${hint}`;
}

export async function extractEnglishStudyFromExam(opts: {
  images: string[];
  mimeTypeHint: string;
  questions: AnalyzedQuestion[];
  grade?: string | null;
}): Promise<EnglishStudyExtracted> {
  const raw = await callExamVision<unknown>({
    images: opts.images,
    prompt: buildPrompt(opts.questions, opts.grade),
    jsonMode: true,
    temperature: 0.1,
    mimeTypeHint: opts.mimeTypeHint,
  });
  const pack = parseEnglishStudyResult(raw);
  if (!pack) throw new Error('시험지에서 단어·구문을 찾지 못했습니다');
  return pack;
}
