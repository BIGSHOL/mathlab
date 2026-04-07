/**
 * G드라이브 교과서 PDF → 개념(Concept) + 빈칸(BlankExercise) 자동 생성
 *
 * 교과서 본문 PDF에서 개념 설명을 추출하고, 빈칸 학습 데이터를 자동 생성합니다.
 *
 * 사용법:
 *   npx tsx scripts/import-textbook-concepts.ts --scan --id mirae-m1          # 교과서 PDF 목록
 *   npx tsx scripts/import-textbook-concepts.ts --id mirae-m1 --chapter 1     # 1단원 개념 추출
 *   npx tsx scripts/import-textbook-concepts.ts --id mirae-m1 --dry-run       # 추출만, DB 저장 안 함
 *   npx tsx scripts/import-textbook-concepts.ts --id mirae-m1 --limit 3       # 3개 파일만
 *   npx tsx scripts/import-textbook-concepts.ts --id mirae-m1 --no-blanks     # 빈칸 생성 생략
 */

import { PrismaClient } from '@prisma/client';
import { GoogleGenAI, Type } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import {
  TEXTBOOK_CATALOG,
  type TextbookEntry,
  getFullGdrivePath,
} from '../src/lib/constants/textbook-curriculum';

import {
  buildMergedExercise,
  addFullSentenceBlanks,
  type BlankDifficulty,
} from '../src/lib/utils/blank-generator';

import { fixLatexEscaping } from '../src/lib/pdf-extract-engine/ai/post-processor';

// ─────────────────────────────────────────
// CLI 인자
// ─────────────────────────────────────────

interface CliArgs {
  scan: boolean;
  id?: string;
  chapter?: number;
  dryRun: boolean;
  limit?: number;
  noBlanks: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = { scan: false, dryRun: false, noBlanks: false };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--scan': result.scan = true; break;
      case '--id': result.id = args[++i]; break;
      case '--chapter': result.chapter = parseInt(args[++i], 10); break;
      case '--dry-run': result.dryRun = true; break;
      case '--limit': result.limit = parseInt(args[++i], 10); break;
      case '--no-blanks': result.noBlanks = true; break;
      case '--help':
        console.log(`
사용법:
  npx tsx scripts/import-textbook-concepts.ts [옵션]

옵션:
  --scan              교과서 PDF 목록만 출력
  --id <textbook-id>  교과서 ID (예: mirae-m1)
  --chapter <N>       특정 대단원만
  --dry-run           추출만, DB 저장 안 함
  --limit <N>         파일 수 제한
  --no-blanks         빈칸 생성 생략 (개념만 생성)
`);
        process.exit(0);
    }
  }
  return result;
}

// ─────────────────────────────────────────
// PDF 파일 탐색 (교과서 본문 PDF만)
// ─────────────────────────────────────────

interface TextbookPdfFile {
  filePath: string;
  fileName: string;
  chapter?: number;
  subChapter?: string;
  topicName?: string;
  sizeBytes: number;
}

function inferChapter(filename: string): { chapter?: number; subChapter?: string; topicName?: string } {
  // 미래엔: 미래엔_중학교수학1_교과서_1-2_소인수분해.pdf
  const miraeMatch = filename.match(/교과서_(\d+)-(\d+)_(.+)\.(?:pdf|hwp)/i);
  if (miraeMatch) {
    return {
      chapter: parseInt(miraeMatch[1], 10),
      subChapter: `${miraeMatch[1]}-${miraeMatch[2]}`,
      topicName: miraeMatch[3],
    };
  }

  // NE능률: [교과서 PDF] Ⅰ-1. 소인수분해(3).pdf
  const neMatch = filename.match(/([ⅠⅡⅢⅣⅤⅥⅦⅧ])-(\d+)\.\s*(.+?)[\s(]/);
  if (neMatch) {
    const romanMap: Record<string, number> = { 'Ⅰ': 1, 'Ⅱ': 2, 'Ⅲ': 3, 'Ⅳ': 4, 'Ⅴ': 5, 'Ⅵ': 6, 'Ⅶ': 7, 'Ⅷ': 8 };
    return {
      chapter: romanMap[neMatch[1]],
      subChapter: `${romanMap[neMatch[1]]}-${neMatch[2]}`,
      topicName: neMatch[3].trim(),
    };
  }

  // 동아: 22개정_고등_공통수학1_교과서_1단원.pdf / N단원
  const unitMatch = filename.match(/(\d+)\s*단원/);
  if (unitMatch) {
    return { chapter: parseInt(unitMatch[1], 10) };
  }

  // 일반 패턴: 숫자-숫자
  const dashMatch = filename.match(/(?:^|_)(\d+)-(\d+)/);
  if (dashMatch) {
    return {
      chapter: parseInt(dashMatch[1], 10),
      subChapter: `${dashMatch[1]}-${dashMatch[2]}`,
    };
  }

  return {};
}

function findTextbookPdfs(basePath: string): TextbookPdfFile[] {
  const results: TextbookPdfFile[] = [];

  function walk(dir: string) {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // 교과서 본문 폴더만 탐색 (평가자료 제외)
        const lower = entry.name.toLowerCase();
        if (lower.includes('평가') || lower.includes('시험') || lower.includes('쌍둥이'))
          continue;
        walk(fullPath);
      } else if (entry.name.toLowerCase().endsWith('.pdf') && !entry.name.startsWith('~')) {
        const lower = entry.name.toLowerCase();
        // 정답/해설/교사용/지도서/전체본 제외
        if (lower.includes('정답') || lower.includes('해설') || lower.includes('풀이')
            || lower.includes('교사용') || lower.includes('지도서')
            || lower.includes('교육과정') || lower.includes('계획')
            || lower.includes('총론')) continue;

        // 소단원별 분리 PDF만 (전체 합본 제외 — 보통 20MB 이상)
        const stat = fs.statSync(fullPath);
        if (stat.size > 15 * 1024 * 1024) continue;

        const info = inferChapter(entry.name);
        if (!info.chapter) continue; // 단원 추론 불가하면 스킵

        results.push({
          filePath: fullPath,
          fileName: entry.name,
          chapter: info.chapter,
          subChapter: info.subChapter,
          topicName: info.topicName,
          sizeBytes: stat.size,
        });
      }
    }
  }

  walk(basePath);
  return results.sort((a, b) => {
    if ((a.chapter || 0) !== (b.chapter || 0)) return (a.chapter || 0) - (b.chapter || 0);
    return (a.subChapter || '').localeCompare(b.subChapter || '');
  });
}

// ─────────────────────────────────────────
// Gemini: 교과서 본문 → 개념 추출
// ─────────────────────────────────────────

interface ExtractedConcept {
  title: string;
  fullContent: string;
  keywords: string[];
}

const CONCEPT_EXTRACT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    concepts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: '개념 제목 (예: "소인수분해", "최대공약수와 최소공배수")' },
          fullContent: { type: Type.STRING, description: '개념 설명 전문 — 정의, 성질, 공식을 포함한 학습용 텍스트. 마크다운+LaTeX 형식' },
          keywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '핵심 키워드 (검색용, 3~8개)',
          },
        },
        required: ['title', 'fullContent', 'keywords'],
      },
    },
  },
  required: ['concepts'],
};

const CONCEPT_SYSTEM_PROMPT = `당신은 한국 수학 교과서 분석 전문가입니다.
주어진 교과서 페이지에서 수학 개념 설명 부분을 추출하세요.

[목표]
학생이 "빈칸 채우기"로 학습할 수 있는 개념 설명 텍스트를 생성합니다.
문제/연습문제는 제외하고, 정의·성질·공식·예시 설명만 추출하세요.

[규칙]
1. 각 소단원/주제별로 하나의 concept을 생성
2. title: 소단원 제목 (예: "소인수분해", "최대공약수")
3. fullContent: 교과서의 개념 설명을 학습용 텍스트로 정리
   - 정의: "~을(를) ~라 한다" 형식 유지
   - 성질/정리: 원문 표현 그대로 포함
   - 공식: LaTeX로 작성 ($...$)
   - 예시: 핵심 예시 1~2개 포함 (너무 길면 축약)
   - 분수: $\\frac{a}{b}$ 사용 (\\dfrac 사용 금지!)
   - 모든 수식/변수는 $...$ 로 감싸기
4. 문제 풀이, 연습문제, "풀어보자" 등은 제외
5. 그림/도형 설명은 텍스트로 전환 (예: "오른쪽 그림과 같이" → 구체적 설명)
6. 한 페이지에 여러 개념이 있으면 각각 별도 concept으로 분리
7. 개념 설명이 없는 페이지(문제만 있는 경우)면 빈 배열 반환`;

async function extractConcepts(
  genai: GoogleGenAI,
  pdfPath: string,
): Promise<ExtractedConcept[]> {
  const pdfBuffer = fs.readFileSync(pdfPath);
  const base64 = pdfBuffer.toString('base64');

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: base64 } },
          { text: CONCEPT_SYSTEM_PROMPT + '\n\n위 규칙에 따라 이 교과서 페이지의 개념을 추출하세요.' },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: CONCEPT_EXTRACT_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) return [];

  let parsed: { concepts?: ExtractedConcept[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    const cleaned = text.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
    parsed = JSON.parse(cleaned);
  }

  return (parsed.concepts || []).map(c => ({
    title: fixLatexEscaping(c.title || ''),
    fullContent: fixLatexEscaping(c.fullContent || ''),
    keywords: c.keywords || [],
  }));
}

// ─────────────────────────────────────────
// Gemini: 빈칸 용어 추출 + 빌드
// ─────────────────────────────────────────

const BLANK_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    blanks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING, description: '빈칸으로 만들 용어 (원문 그대로)' },
          difficulty: { type: Type.STRING, description: 'easy=핵심 키워드, hard=추가 용어' },
        },
        required: ['term', 'difficulty'],
      },
    },
  },
  required: ['blanks'],
};

function buildBlankPrompt(title: string, fullContent: string): string {
  return `당신은 한국 수학 교육 전문가입니다.

아래 수학 개념 설명을 읽고, 학생이 빈칸 채우기로 학습할 **수학적으로 의미 있는 용어**를 추출하세요.

## 학습 흐름
1. easy 빈칸만 채우기 → 핵심 키워드 복습
2. easy + hard 빈칸 채우기 → 꼼꼼한 이해
3. 통문장 빈칸 (자동 생성) → 전체 내용 복원

제목: ${title}
내용: ${fullContent}

## easy (핵심 키워드 3~8개)
- 정의명, 공식 핵심 구성요소, 분류/종류명
- 고유 용어만, 일반 서술어 제외

## hard (추가 용어 2~6개)
- 성질/조건/관계 용어, 공식 부가 요소
- easy와 다른 개수일 것

## 규칙
1. 원문에 정확히 존재하는 단어만 선택
2. 조사(은/는/이/가/을/를) 분리 제외
3. 같은 용어 중복 추출 금지
4. $...$ 수식은 $ 포함하여 통째로 선택
5. 번호(①②), 도형기호(□▢) 금지`;
}

async function generateBlanks(
  genai: GoogleGenAI,
  title: string,
  fullContent: string,
): Promise<{ templateText: string; blanks: { position: number; answer: string; hint: string; difficulty: string }[] } | null> {
  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: buildBlankPrompt(title, fullContent),
    config: {
      responseMimeType: 'application/json',
      responseSchema: BLANK_SCHEMA,
    },
  });

  if (!response.text) return null;
  let jsonStr = response.text.trim();
  if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');

  const data = JSON.parse(jsonStr) as { blanks: { term: string; difficulty: string }[] };
  if (!data.blanks || data.blanks.length === 0) return null;

  const terms = data.blanks.map(b => ({
    term: b.term,
    difficulty: (b.difficulty === 'hard' ? 'hard' : 'easy') as BlankDifficulty,
  }));

  const merged = buildMergedExercise(fullContent, terms, false);
  if (!merged) return null;

  const withFull = addFullSentenceBlanks(merged);

  return {
    templateText: withFull.templateText,
    blanks: withFull.blanks.map(b => ({
      position: b.position,
      answer: b.answer,
      hint: b.hint,
      difficulty: b.difficulty,
    })),
  };
}

// ─────────────────────────────────────────
// DB 저장
// ─────────────────────────────────────────

// gradeCode → gradeLevel 매핑
const GRADE_LEVEL_MAP: Record<string, number> = {
  'middle_1': 7, 'middle_2': 8, 'middle_3': 9,
  'high_1': 10, 'high_2': 10, 'high_algebra': 10,
  'high_calculus1': 10, 'high_calculus2': 10,
  'high_prob': 10, 'high_geo': 10,
};

// chapter → part 매핑
const CHAPTER_TO_PART: Record<string, string> = {
  '소인수분해': 'calc', '정수와 유리수': 'calc', '유리수와 순환소수': 'calc',
  '실수와 그 연산': 'calc', '수열': 'calc',
  '문자의 사용과 식': 'algebra', '일차방정식': 'algebra', '식의 계산': 'algebra',
  '일차부등식': 'algebra', '연립일차방정식': 'algebra',
  '다항식의 곱셈과 인수분해': 'algebra', '이차방정식': 'algebra',
  '다항식': 'algebra', '방정식과 부등식': 'algebra', '집합과 명제': 'algebra',
  '좌표와 그래프': 'func', '정비례와 반비례': 'func', '일차함수': 'func',
  '이차함수': 'func', '함수와 그래프': 'func',
  '지수함수와 로그함수': 'func', '삼각함수': 'func',
  '함수의 극한과 연속': 'func', '미분': 'func', '적분': 'func',
  '기본 도형': 'geo', '작도와 합동': 'geo', '평면도형': 'geo', '입체도형': 'geo',
  '삼각형의 성질': 'geo', '사각형의 성질': 'geo', '도형의 닮음': 'geo',
  '피타고라스 정리': 'geo', '삼각비': 'geo', '원의 성질': 'geo',
  '도형의 방정식': 'geo', '이차곡선': 'geo', '평면벡터': 'geo',
  '자료의 정리와 해석': 'data', '확률': 'data', '통계': 'data', '경우의 수': 'data',
};

// conceptCode 접두어 매핑
const PART_TO_CODE_PREFIX: Record<string, string> = {
  calc: 'NUM', algebra: 'ALG', func: 'FUNC', geo: 'GEO', data: 'STA',
};

async function saveConcept(
  prisma: PrismaClient,
  concept: ExtractedConcept,
  textbook: TextbookEntry,
  chapterNum: number,
  subChapter?: string,
): Promise<string | null> {
  const chapterMapping = textbook.chapters.find(c => c.textbookChapter === chapterNum);
  const gradeLevel = GRADE_LEVEL_MAP[textbook.gradeCode];

  const subject = await prisma.subject.findFirst({ where: { gradeLevel } });
  if (!subject) {
    console.log(`  ⚠ Subject 없음 (gradeLevel: ${gradeLevel})`);
    return null;
  }

  const curriculumChapter = chapterMapping?.curriculumNames[0] || chapterMapping?.textbookName || '';
  const part = CHAPTER_TO_PART[curriculumChapter] || 'calc';

  // ── 1. 기존 개념 유사도 체크 ──
  // 같은 학년+단원에서 제목이 동일하거나 포함 관계이면 중복
  const existingInChapter = await prisma.concept.findMany({
    where: { grade: textbook.gradeCode, chapter: curriculumChapter },
    select: { id: true, title: true, fullContent: true, conceptCode: true },
  });

  for (const ex of existingInChapter) {
    const titleA = concept.title.replace(/\s/g, '');
    const titleB = ex.title.replace(/\s/g, '');
    // 정확히 같거나, 한쪽이 다른쪽을 포함하면 중복
    if (titleA === titleB || titleA.includes(titleB) || titleB.includes(titleA)) {
      // 기존 개념의 내용이 짧으면 보강
      if (concept.fullContent.length > (ex.fullContent?.length || 0)) {
        await prisma.concept.update({
          where: { id: ex.id },
          data: {
            fullContent: concept.fullContent,
            keywords: concept.keywords.join(', '),
          },
        });
        process.stdout.write(`[보강:${ex.conceptCode}] `);
      } else {
        process.stdout.write(`[중복:${ex.conceptCode}] `);
      }
      return ex.id;
    }
  }

  // ── 2. conceptCode 자동 생성 ──
  const gradePrefix = textbook.gradeCode.replace('middle_', 'M').replace('high_', 'H');
  const codePrefix = PART_TO_CODE_PREFIX[part] || 'ETC';

  // 같은 접두어의 기존 최대 번호 찾기
  const existingCodes = existingInChapter
    .map(c => c.conceptCode)
    .filter((code): code is string => !!code && code.startsWith(`${gradePrefix}-${codePrefix}-`));

  let nextNum = 1;
  if (existingCodes.length > 0) {
    const nums = existingCodes.map(c => {
      const parts = c.split('-');
      return parseInt(parts[parts.length - 1], 10) || 0;
    });
    // 소단원 그룹 번호 결정 (기존 패턴: M1-NUM-01-1 → 01은 소단원 그룹, 1은 순번)
    nextNum = Math.max(...nums) + 1;
  }

  // 기존 코드 패턴에서 소단원 그룹 번호 추출
  const groupNums = existingCodes.map(c => {
    const m = c.match(new RegExp(`${gradePrefix}-${codePrefix}-(\\d+)`));
    return m ? parseInt(m[1], 10) : 0;
  });
  const maxGroup = groupNums.length > 0 ? Math.max(...groupNums) : 0;
  const conceptCode = `${gradePrefix}-${codePrefix}-${String(maxGroup).padStart(2, '0')}-${nextNum}`;

  // ── 3. curriculum 소단원명 결정 ──
  // subChapter "1-2" 같은 교과서 번호가 아니라, curriculum.ts의 소단원명 사용
  // chapterMapping.curriculumNames[0]이 대단원명이므로, 소단원은 별도 로직 필요
  // 단순히 대단원의 첫 소단원 사용 (정확한 매핑은 AI가 판단)
  const section = curriculumChapter; // 소단원이 대단원과 같은 경우가 많음

  // ── 4. 저장 ──
  const gradeKey = chapterMapping?.gradeKey;
  const semester = gradeKey?.includes('1학기') ? 1 : gradeKey?.includes('2학기') ? 2 : undefined;

  const created = await prisma.concept.create({
    data: {
      subjectId: subject.id,
      title: concept.title,
      fullContent: concept.fullContent,
      conceptCode,
      grade: textbook.gradeCode,
      semester,
      chapter: curriculumChapter,
      section,
      part,
      source: `${textbook.subject} (${textbook.author})`,
      keywords: concept.keywords.join(', '),
      category: 'concept',
    },
  });

  process.stdout.write(`[새로:${conceptCode}] `);
  return created.id;
}

// ─────────────────────────────────────────
// 메인
// ─────────────────────────────────────────

async function main() {
  const args = parseArgs();

  if (!args.id) {
    console.error('❌ --id 필수. 사용 가능한 ID:');
    TEXTBOOK_CATALOG.forEach(t => console.log(`  ${t.id.padEnd(22)} ${t.subject} (${t.author})`));
    process.exit(1);
  }

  const textbook = TEXTBOOK_CATALOG.find(t => t.id === args.id);
  if (!textbook) {
    console.error(`❌ 교과서 ID '${args.id}'를 찾을 수 없습니다.`);
    process.exit(1);
  }

  const basePath = getFullGdrivePath(args.id);
  if (!basePath || !fs.existsSync(basePath)) {
    console.error(`❌ G드라이브 경로 없음: ${basePath}`);
    process.exit(1);
  }

  // 교과서 본문 PDF 탐색
  let pdfs = findTextbookPdfs(basePath);

  if (args.chapter !== undefined) {
    pdfs = pdfs.filter(p => p.chapter === args.chapter);
  }
  if (args.limit && args.limit > 0) {
    pdfs = pdfs.slice(0, args.limit);
  }

  if (args.scan) {
    console.log(`\n📖 ${textbook.subject} (${textbook.author}) — 교과서 본문 PDF`);
    console.log(`   경로: ${basePath}\n`);

    const groups: Record<number, TextbookPdfFile[]> = {};
    for (const pdf of pdfs) {
      const ch = pdf.chapter || 0;
      if (!groups[ch]) groups[ch] = [];
      groups[ch].push(pdf);
    }

    for (const [ch, files] of Object.entries(groups)) {
      const mapping = textbook.chapters.find(c => c.textbookChapter === parseInt(ch, 10));
      const name = mapping?.textbookName || `?단원`;
      console.log(`   ${ch}단원 "${name}" — ${files.length}개 파일`);
      for (const f of files) {
        const topic = f.topicName ? ` (${f.topicName})` : '';
        console.log(`     ${f.subChapter || '?'} ${f.fileName}${topic}`);
      }
    }
    console.log(`\n   합계: ${pdfs.length}개`);
    return;
  }

  // ── 추출 모드 ──
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY 환경변수를 설정하세요.');
    process.exit(1);
  }

  if (pdfs.length === 0) {
    console.log('⚠ 추출할 교과서 본문 PDF 없음. --scan으로 확인하세요.');
    return;
  }

  console.log(`\n📖 ${textbook.subject} (${textbook.author})`);
  console.log(`   처리할 PDF: ${pdfs.length}개${args.dryRun ? ' (DRY RUN)' : ''}${args.noBlanks ? ' (빈칸 생략)' : ''}\n`);

  const genai = new GoogleGenAI({ apiKey });
  const prisma = args.dryRun ? null : new PrismaClient();

  let conceptCount = 0;
  let blankCount = 0;
  let errorCount = 0;

  for (let i = 0; i < pdfs.length; i++) {
    const pdf = pdfs[i];
    const progress = `[${i + 1}/${pdfs.length}]`;
    const label = pdf.topicName || pdf.subChapter || `${pdf.chapter}단원`;

    process.stdout.write(`${progress} ${label} ... `);

    try {
      // 1. 개념 추출
      const concepts = await extractConcepts(genai, pdf.filePath);

      if (concepts.length === 0) {
        console.log('개념 없음 (문제 페이지?)');
        continue;
      }

      if (args.dryRun) {
        for (const c of concepts) {
          console.log(`\n  📝 "${c.title}" (${c.fullContent.length}자)`);
          console.log(`     ${c.fullContent.substring(0, 120)}...`);
          console.log(`     키워드: ${c.keywords.join(', ')}`);
          conceptCount++;
        }
      } else {
        for (const c of concepts) {
          // 2. DB 저장
          const conceptId = await saveConcept(prisma!, c, textbook, pdf.chapter || 0, pdf.subChapter);
          if (!conceptId) continue;
          conceptCount++;

          // 3. 빈칸 생성
          if (!args.noBlanks) {
            try {
              // 기존 빈칸 체크
              const existingBlank = await prisma!.blankExercise.findFirst({
                where: { conceptId },
              });
              if (existingBlank) {
                process.stdout.write(`[빈칸 존재] `);
              } else {
                const blank = await generateBlanks(genai, c.title, c.fullContent);
                if (blank && blank.blanks.length > 0) {
                  await prisma!.blankExercise.create({
                    data: {
                      conceptId,
                      level: 1,
                      templateText: blank.templateText,
                      blanks: blank.blanks,
                    },
                  });
                  blankCount++;
                  const easyN = blank.blanks.filter(b => b.difficulty === 'easy').length;
                  const hardN = blank.blanks.filter(b => b.difficulty === 'hard').length;
                  const fullN = blank.blanks.filter(b => b.difficulty === 'full').length;
                  process.stdout.write(`[빈칸 e${easyN}/h${hardN}/f${fullN}] `);
                }
                // 빈칸 생성 후 1초 대기 (rate limit)
                await new Promise(r => setTimeout(r, 1000));
              }
            } catch (blankErr) {
              process.stdout.write('[빈칸 실패] ');
            }
          }
        }
        console.log(`✅ ${concepts.length}개 개념`);
      }

      // Rate limit 방지
      if (i < pdfs.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      errorCount++;
      const errMsg = err instanceof Error ? err.message : String(err);

      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        console.log('⚠ API 한도 초과, 30초 대기...');
        await new Promise(r => setTimeout(r, 30000));
        i--;
        errorCount--;
        continue;
      }

      console.log(`❌ ${errMsg.substring(0, 80)}`);
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`📊 결과 요약`);
  console.log(`   처리 파일: ${pdfs.length}개`);
  console.log(`   생성 개념: ${conceptCount}개`);
  if (!args.noBlanks) console.log(`   생성 빈칸: ${blankCount}개`);
  if (errorCount > 0) console.log(`   에러:      ${errorCount}건`);
  console.log(`${'─'.repeat(50)}`);

  if (prisma) await prisma.$disconnect();
}

main().catch((err) => {
  console.error('치명적 에러:', err);
  process.exit(1);
});
