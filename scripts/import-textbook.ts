/**
 * G드라이브 교과서 PDF → MathLab 문제은행 자동 임포트
 *
 * 사용법:
 *   npx tsx scripts/import-textbook.ts --scan                      # 모든 PDF 목록 출력
 *   npx tsx scripts/import-textbook.ts --scan --id mirae-m1        # 특정 교과서 PDF 목록
 *   npx tsx scripts/import-textbook.ts --id donga-h1 --resource sub_unit_eval  # 소단원평가 추출
 *   npx tsx scripts/import-textbook.ts --id mirae-m1 --chapter 1   # 특정 대단원만
 *   npx tsx scripts/import-textbook.ts --id donga-h1 --resource sub_unit_eval --dry-run  # 저장 안 함
 *   npx tsx scripts/import-textbook.ts --id donga-h1 --resource sub_unit_eval --limit 3  # 3개 파일만
 */

import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

// textbook-curriculum 매핑 (상대경로로 import)
import {
  TEXTBOOK_CATALOG,
  type TextbookEntry,
  type ResourceType,
  getFullGdrivePath,
} from '../src/lib/constants/textbook-curriculum';

// PDF 추출 프리셋의 후처리 로직 재사용
import {
  mapDifficulty,
  mapType,
  embedBoxItems,
  autoWrapMath,
  ensureChoiceNumbers,
  MATH_SYSTEM_PROMPT,
  MATH_EXTRACT_SCHEMA,
} from '../src/lib/pdf-extract-engine/presets/math-textbook';
import { fixLatexEscaping } from '../src/lib/pdf-extract-engine/ai/post-processor';
import {
  detectSchoolLevel,
  ELEMENTARY_CHAPTER_DOMAIN,
  HIGH_CHAPTER_DOMAIN,
  CHAPTER_DOMAIN,
  refineDomain,
} from '../src/lib/constants/question-maps';

// chapter → 5대 교육과정 영역 (question-tagger.ts와 동일)
const CHAPTER_TO_5DOMAIN: Record<string, string> = {
  // 중등
  '소인수분해': 'number', '정수와 유리수': 'number', '유리수와 순환소수': 'number',
  '실수와 그 연산': 'number',
  '문자의 사용과 식': 'algebra', '일차방정식': 'algebra', '식의 계산': 'algebra',
  '일차부등식': 'algebra', '연립일차방정식': 'algebra',
  '다항식의 곱셈과 인수분해': 'algebra', '이차방정식': 'algebra',
  '좌표와 그래프': 'function', '정비례와 반비례': 'function', '일차함수': 'function',
  '이차함수': 'function',
  '기본 도형': 'geometry', '작도와 합동': 'geometry', '입체도형': 'geometry',
  '평면도형': 'geometry', '삼각형의 성질': 'geometry', '사각형의 성질': 'geometry',
  '도형의 닮음': 'geometry', '피타고라스 정리': 'geometry',
  '삼각비': 'geometry', '원의 성질': 'geometry',
  '자료의 정리와 해석': 'statistics', '확률': 'statistics', '통계': 'statistics',
  // 고등
  '다항식': 'algebra', '방정식과 부등식': 'algebra',
  '경우의 수': 'statistics', '집합과 명제': 'algebra',
  '도형의 방정식': 'geometry', '함수와 그래프': 'function',
  '지수함수와 로그함수': 'function', '삼각함수': 'function', '수열': 'number',
  '함수의 극한과 연속': 'function', '미분': 'function', '적분': 'function',
  '이차곡선': 'geometry', '평면벡터': 'geometry', '공간도형과 공간좌표': 'geometry',
};

// ─────────────────────────────────────────
// CLI 인자 파싱
// ─────────────────────────────────────────

interface CliArgs {
  scan: boolean;
  id?: string;
  resource?: ResourceType;
  chapter?: number;
  dryRun: boolean;
  limit?: number;
  skip?: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = { scan: false, dryRun: false };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--scan': result.scan = true; break;
      case '--id': result.id = args[++i]; break;
      case '--resource': result.resource = args[++i] as ResourceType; break;
      case '--chapter': result.chapter = parseInt(args[++i], 10); break;
      case '--dry-run': result.dryRun = true; break;
      case '--limit': result.limit = parseInt(args[++i], 10); break;
      case '--skip': result.skip = parseInt(args[++i], 10); break;
      case '--help':
        console.log(`
사용법:
  npx tsx scripts/import-textbook.ts [옵션]

옵션:
  --scan              PDF 파일 목록만 출력 (추출하지 않음)
  --id <textbook-id>  교과서 ID (예: mirae-m1, donga-h1)
  --resource <type>   자료 유형 필터 (sub_unit_eval, main_unit_eval, textbook 등)
  --chapter <N>       특정 대단원 번호만 처리
  --dry-run           추출만 하고 DB 저장 안 함
  --limit <N>         처리할 PDF 파일 수 제한

교과서 ID 목록:
${TEXTBOOK_CATALOG.map(t => `  ${t.id.padEnd(22)} ${t.subject} (${t.author})`).join('\n')}
`);
        process.exit(0);
    }
  }
  return result;
}

// ─────────────────────────────────────────
// G드라이브 PDF 스캐너
// ─────────────────────────────────────────

interface PdfFileInfo {
  filePath: string;
  fileName: string;
  textbookId: string;
  inferredChapter?: number;
  resourceType: string;
  sizeBytes: number;
}

/** 자료 유형 → 폴더명 매핑 (출판사별로 다름) */
const RESOURCE_FOLDER_PATTERNS: Record<string, string[]> = {
  textbook: ['교과서', '교과서(PDF)', '02 교과서(PDF)'],
  teacher_book: ['교사용', '교사용 교과서', '교사용교과서'],
  guide: ['지도서', '지도서(PDF)', '03 지도서(PDF)'],
  ppt: ['PPT', '수업용 PPT', '수업 PPT'],
  sub_unit_eval: ['소단원', '소단원평가', '소단원 평가', '02 소단원 문제', '소단원 평가 PDF 기본', '소단원 평가 PDF 기초', '소단원 평가 PDF 발전'],
  main_unit_eval: ['대단원', '대단원평가', '대단원 평가', '대단원 평가 PDF', '대단원 기출 모의고사'],
  mid_unit_eval: ['중단원', '중단원평가'],
  quiz: ['쪽지', '쪽지 시험', '01 차시별 쪽지 시험'],
  essay_eval: ['서술형', '서술형 평가', '서술형 평가 PDF'],
  twin_problems: ['쌍둥이', '쌍둥이 문제'],
  midterm_final: ['시험 대비', '중간', '기말'],
  answer_key: ['정답', '해설'],
};

/** 파일명에서 대단원 번호 추출 (출판사별 패턴) */
function inferChapterFromFilename(filename: string): number | undefined {
  // 패턴 1: "1-1", "2-3" (미래엔 등) — 첫 번째 숫자가 대단원
  const dashMatch = filename.match(/(?:^|_)(\d+)-\d+/);
  if (dashMatch) return parseInt(dashMatch[1], 10);

  // 패턴 2: "N단원" (천재/동아 등)
  const unitMatch = filename.match(/(\d+)\s*단원/);
  if (unitMatch) return parseInt(unitMatch[1], 10);

  // 패턴 3: "22개정_고등_과목_N_" (동아출판 평가)
  const dongaMatch = filename.match(/22개정_[^_]+_[^_]+_(\d+)_/);
  if (dongaMatch) return parseInt(dongaMatch[1], 10);

  // 패턴 4: "Ⅰ", "Ⅱ", "Ⅲ"... (NE능률 등)
  const romanMap: Record<string, number> = { 'Ⅰ': 1, 'Ⅱ': 2, 'Ⅲ': 3, 'Ⅳ': 4, 'Ⅴ': 5, 'Ⅵ': 6, 'Ⅶ': 7, 'Ⅷ': 8 };
  const romanMatch = filename.match(/([ⅠⅡⅢⅣⅤⅥⅦⅧ])/);
  if (romanMatch) return romanMap[romanMatch[1]];

  // 패턴 5: "(N-M-S)" (천재교육 확통 등)
  const parenMatch = filename.match(/\((\d+)-\d+-\d+\)/);
  if (parenMatch) return parseInt(parenMatch[1], 10);

  return undefined;
}

/** 폴더명으로 자료유형 판별 — 상위 3단계 폴더명 순차 탐색 (가장 가까운 폴더 우선) */
function inferResourceType(filePath: string): string {
  // 파일의 상위 폴더들을 가까운 순서로 검사
  const parts = filePath.replace(/\\/g, '/').split('/');
  // 파일명 제외, 가까운 폴더부터 3단계까지
  const folders = parts.slice(Math.max(0, parts.length - 4), parts.length - 1).reverse();

  for (const folder of folders) {
    // 평가자료 관련 패턴을 먼저 체크 (우선순위 높음)
    for (const [resType, patterns] of Object.entries(RESOURCE_FOLDER_PATTERNS)) {
      for (const p of patterns) {
        if (folder.includes(p)) return resType;
      }
    }
  }
  return 'unknown';
}

/** G드라이브에서 PDF 파일 재귀 탐색 */
function scanPdfs(basePath: string, textbookId: string): PdfFileInfo[] {
  const results: PdfFileInfo[] = [];

  function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.toLowerCase().endsWith('.pdf') && !entry.name.startsWith('~')) {
        const stat = fs.statSync(fullPath);
        results.push({
          filePath: fullPath,
          fileName: entry.name,
          textbookId,
          inferredChapter: inferChapterFromFilename(entry.name),
          resourceType: inferResourceType(fullPath),
          sizeBytes: stat.size,
        });
      }
    }
  }

  walk(basePath);
  return results;
}

// ─────────────────────────────────────────
// Gemini PDF 추출
// ─────────────────────────────────────────

interface ExtractedQuestion {
  questionNum: number;
  pageNum: number;
  sectionHeader: string;
  difficultyTag: string;
  problemType: string;
  content: string;
  choices: string[];
  boxItems: string[];
  answer: string;
  sourceTag: string;
  difficulty: string;
  type: string;
  domain5?: string;
  abilityDomain?: string;
  diagramParams?: { type: string; label: string; params: Record<string, unknown> }[];
}

async function extractFromPdf(
  genai: GoogleGenAI,
  pdfPath: string,
): Promise<ExtractedQuestion[]> {
  const pdfBuffer = fs.readFileSync(pdfPath);
  const base64 = pdfBuffer.toString('base64');

  // Gemini에 PDF 직접 전송
  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64,
            },
          },
          {
            text: MATH_SYSTEM_PROMPT + '\n\n위 규칙에 따라 이 PDF의 모든 수학 문제를 추출하세요.',
          },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: MATH_EXTRACT_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) return [];

  let parsed: { problems?: Record<string, unknown>[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    // 코드펜스 제거 후 재시도
    const cleaned = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    parsed = JSON.parse(cleaned);
  }

  if (!parsed.problems || !Array.isArray(parsed.problems)) return [];

  // 후처리 (mathTextbookPlugin.postProcess 로직 재사용)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return parsed.problems.map((p: any) => {
    const contentText = p.boxItems?.length > 0
      ? embedBoxItems(p.content || '', p.boxItems)
      : p.content || '';

    // diagramParams 정규화 — 26개 타입 전체 필드 수집
    const DIAGRAM_FLAT_KEYS = [
      // 초등 기본
      'totalParts', 'coloredParts', 'count', 'rows', 'cols',
      'coloredCount', 'hatching', 'min', 'max', 'step',
      'hundreds', 'tens', 'ones',
      // 초등 차트
      'categories', 'dataValues', 'segments', 'title', 'xLabel', 'yLabel', 'horizontal',
      // 초등 기타
      'angle', 'ray1Angle', 'showProtractor', 'hour', 'minute', 'nodes', 'arrows',
      // 중등 기하
      'vertices', 'sideLabels', 'angleLabels', 'nSides', 'diagonals',
      'cx', 'cy', 'radius', 'circleLabels', 'arcs', 'quadType',
      // 좌표/함수
      'xRange', 'yRange', 'points', 'functions',
      // 통계
      'bins', 'stems', 'showFrequencyPolygon', 'showTrendLine',
      // 기타
      'shape', 'dimensions', 'sets', 'intersectionElements', 'universalElements', 'root',
    ];
    const normalizedParams: { type: string; label: string; params: Record<string, unknown> }[] = [];
    if (Array.isArray(p.diagramParams)) {
      for (const dp of p.diagramParams) {
        const dtype = dp.diagramType || dp.type;
        if (!dtype) continue;
        const paramObj: Record<string, unknown> = dp.params || {};
        for (const key of DIAGRAM_FLAT_KEYS) {
          const val = dp[key];
          if (val !== undefined && val !== null && val !== 0 && val !== '') {
            paramObj[key] = val;
          }
        }
        // bins의 rangeStart/rangeEnd → range 변환 (렌더러 호환)
        if (dtype === 'histogram' && Array.isArray(paramObj.bins)) {
          paramObj.bins = (paramObj.bins as any[]).map(b => ({
            range: [b.rangeStart ?? b.range?.[0] ?? 0, b.rangeEnd ?? b.range?.[1] ?? 0] as [number, number],
            frequency: b.frequency ?? 0,
          }));
        }
        // dataValues → values 변환 (렌더러 호환)
        if (paramObj.dataValues && !paramObj.values) {
          paramObj.values = paramObj.dataValues;
          delete paramObj.dataValues;
        }
        // sideLabels → sides, angleLabels → angles 변환 (렌더러 호환)
        if (paramObj.sideLabels && !paramObj.sides) {
          paramObj.sides = paramObj.sideLabels;
          delete paramObj.sideLabels;
        }
        if (paramObj.angleLabels && !paramObj.angles) {
          paramObj.angles = paramObj.angleLabels;
          delete paramObj.angleLabels;
        }
        // nSides → sides 변환 (regular_polygon 렌더러 호환)
        if (dtype === 'regular_polygon' && paramObj.nSides && !paramObj.sides) {
          paramObj.sides = paramObj.nSides;
          delete paramObj.nSides;
        }
        normalizedParams.push({ type: dtype, label: dp.label || dtype, params: paramObj });
      }
    }

    const stripChoices = (c: string, choices: string[]): string => {
      if (!choices || choices.length === 0) return c;
      return c.replace(/(?:\n\s*)?[①②③④⑤]\s*.+/g, '').trimEnd();
    };

    return {
      questionNum: p.questionNum || 0,
      pageNum: p.pageNum || 0,
      sectionHeader: fixLatexEscaping(p.sectionHeader || ''),
      difficultyTag: p.difficultyTag || '',
      problemType: p.problemType || '주관식',
      content: stripChoices(autoWrapMath(fixLatexEscaping(contentText)), p.choices || []),
      choices: ensureChoiceNumbers((p.choices || []).map((c: string) => autoWrapMath(fixLatexEscaping(c)))),
      boxItems: p.boxItems || [],
      answer: fixLatexEscaping(p.answer || ''),
      sourceTag: ['서술형', '객관식', '주관식'].includes(p.sourceTag || '') ? '' : (p.sourceTag || ''),
      difficulty: mapDifficulty(p.difficultyTag || ''),
      type: mapType(p.problemType || '주관식'),
      domain5: p.domain5 || undefined,
      abilityDomain: p.abilityDomain || undefined,
      diagramParams: normalizedParams.length > 0 ? normalizedParams : undefined,
    };
  });
}

// ─────────────────────────────────────────
// DB 저장
// ─────────────────────────────────────────

async function saveQuestions(
  prisma: PrismaClient,
  questions: ExtractedQuestion[],
  textbook: TextbookEntry,
  inferredChapter?: number,
  pdfFileName?: string,
): Promise<number> {
  if (questions.length === 0) return 0;

  // 교과서 매핑에서 bookCode, chapter 결정
  const chapterMapping = inferredChapter
    ? textbook.chapters.find(c => c.textbookChapter === inferredChapter)
    : undefined;

  // gradeCode → bookCode 변환 (기존 패턴과 일치: '1-1', '3-1', 'E5-1', 'H1-0')
  const GRADE_TO_BOOK: Record<string, string> = {
    'middle_1': '1-1', 'middle_2': '2-1', 'middle_3': '3-1',
    'high_1': 'H1-0', 'high_2': 'H2-0', 'high_algebra': 'HA-0',
    'high_calculus1': 'HC1-0', 'high_calculus2': 'HC2-0',
    'high_prob': 'HP-0', 'high_geo': 'HG-0',
  };
  const bookCode = GRADE_TO_BOOK[textbook.gradeCode] || textbook.gradeCode;
  const chapterName = chapterMapping?.textbookName || `대단원${inferredChapter || 0}`;
  const curriculumNames = chapterMapping?.curriculumNames || [];

  // 5대 교육과정 영역 결정 (curriculumNames → CHAPTER_TO_5DOMAIN 룩업)
  const resolve5Domain = (): string | null => {
    // 1) curriculumNames에서 매칭 시도
    for (const cn of curriculumNames) {
      if (CHAPTER_TO_5DOMAIN[cn]) return CHAPTER_TO_5DOMAIN[cn];
    }
    // 2) chapterName으로 직접 매칭
    if (CHAPTER_TO_5DOMAIN[chapterName]) return CHAPTER_TO_5DOMAIN[chapterName];
    return null;
  };
  const domain5 = resolve5Domain();

  // 4대 능력 영역 결정
  const level = detectSchoolLevel(bookCode);
  const chapterForAbility = curriculumNames[0] || chapterName;
  let baseAbility: string | undefined;
  if (level === 'elementary') {
    baseAbility = ELEMENTARY_CHAPTER_DOMAIN[chapterForAbility];
  } else if (level === 'high') {
    baseAbility = HIGH_CHAPTER_DOMAIN[chapterForAbility];
  } else {
    baseAbility = CHAPTER_DOMAIN[chapterForAbility];
  }

  const valid5 = ['number', 'algebra', 'function', 'geometry', 'statistics'];
  const valid4 = ['CALCULATION', 'UNDERSTANDING', 'REASONING', 'PROBLEM_SOLVING'];

  const data = questions
    .filter(q => q.content && q.content.length > 5) // 빈 문제 제외
    .map(q => {
      // AI 반환값 우선 → fallback으로 코드 매핑
      const resolvedDomain = (q.domain5 && valid5.includes(q.domain5)) ? q.domain5 : domain5;
      const resolvedAbility = (q.abilityDomain && valid4.includes(q.abilityDomain))
        ? q.abilityDomain
        : (baseAbility ? refineDomain(baseAbility, q.sectionHeader, q.difficulty) : null);
      return {
        bookCode,
        chapter: chapterName,
        section: q.sectionHeader || null,
        questionNum: q.questionNum || 1,
        pageNum: q.pageNum || null,
        difficulty: q.difficulty as 'BASIC' | 'MEDIUM' | 'HIGH' | 'HIGHEST',
        type: q.type as 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY',
        content: q.content,
        choices: q.choices.length > 0 ? q.choices : undefined,
        answer: q.answer || '풀이 참조',
        explanation: null,
        source: `${textbook.subject} (${textbook.author}) - ${pdfFileName || ''}`.trim(),
        sourceTag: q.sourceTag || '교과서',
        domain: resolvedDomain,
        abilityDomain: resolvedAbility,
        diagramSpec: q.diagramParams ? q.diagramParams : null,
      };
    });

  if (data.length === 0) return 0;

  const result = await prisma.question.createMany({
    data,
    skipDuplicates: true,
  });

  return result.count;
}

// ─────────────────────────────────────────
// 메인 실행
// ─────────────────────────────────────────

async function main() {
  const args = parseArgs();

  if (args.scan) {
    // ── 스캔 모드 ──
    const targets = args.id
      ? TEXTBOOK_CATALOG.filter(t => t.id === args.id)
      : TEXTBOOK_CATALOG;

    if (targets.length === 0) {
      console.error(`❌ 교과서 ID '${args.id}'를 찾을 수 없습니다.`);
      process.exit(1);
    }

    let totalFiles = 0;
    let totalSize = 0;

    for (const textbook of targets) {
      const basePath = getFullGdrivePath(textbook.id);
      if (!basePath || !fs.existsSync(basePath)) {
        console.log(`⚠ ${textbook.id}: 경로 없음 (${basePath})`);
        continue;
      }

      const pdfs = scanPdfs(basePath, textbook.id);
      const filtered = args.resource
        ? pdfs.filter(p => p.resourceType === args.resource)
        : pdfs;
      const limited = args.chapter
        ? filtered.filter(p => p.inferredChapter === args.chapter)
        : filtered;

      if (limited.length === 0) continue;

      console.log(`\n📚 ${textbook.subject} (${textbook.author}) — ${textbook.id}`);
      console.log(`   경로: ${basePath}`);
      console.log(`   PDF 파일: ${limited.length}개`);

      // 자료유형별 그룹
      const groups: Record<string, PdfFileInfo[]> = {};
      for (const pdf of limited) {
        const key = pdf.resourceType;
        if (!groups[key]) groups[key] = [];
        groups[key].push(pdf);
      }

      for (const [resType, files] of Object.entries(groups)) {
        const sizeSum = files.reduce((s, f) => s + f.sizeBytes, 0);
        console.log(`   ├─ ${resType}: ${files.length}개 (${(sizeSum / 1024 / 1024).toFixed(1)}MB)`);
        totalSize += sizeSum;

        if (files.length <= 5) {
          for (const f of files) {
            const ch = f.inferredChapter ? ` [${f.inferredChapter}단원]` : '';
            console.log(`   │  └─ ${f.fileName}${ch}`);
          }
        } else {
          for (const f of files.slice(0, 3)) {
            const ch = f.inferredChapter ? ` [${f.inferredChapter}단원]` : '';
            console.log(`   │  └─ ${f.fileName}${ch}`);
          }
          console.log(`   │  └─ ... 외 ${files.length - 3}개`);
        }
      }

      totalFiles += limited.length;
    }

    console.log(`\n📊 합계: PDF ${totalFiles}개, ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
    return;
  }

  // ── 추출 모드 ──
  if (!args.id) {
    console.error('❌ --id 필수. 사용 가능한 ID: --help 참고');
    process.exit(1);
  }

  const textbook = TEXTBOOK_CATALOG.find(t => t.id === args.id);
  if (!textbook) {
    console.error(`❌ 교과서 ID '${args.id}'를 찾을 수 없습니다.`);
    process.exit(1);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY 환경변수를 설정하세요.');
    process.exit(1);
  }

  const basePath = getFullGdrivePath(args.id);
  if (!basePath || !fs.existsSync(basePath)) {
    console.error(`❌ G드라이브 경로를 찾을 수 없습니다: ${basePath}`);
    process.exit(1);
  }

  // PDF 파일 탐색
  let pdfs = scanPdfs(basePath, args.id);

  // 자료유형 필터
  if (args.resource) {
    pdfs = pdfs.filter(p => p.resourceType === args.resource);
  } else {
    // 기본: 평가자료만 (교과서 전체 PDF 제외 — 너무 큼)
    pdfs = pdfs.filter(p =>
      ['sub_unit_eval', 'mid_unit_eval', 'main_unit_eval', 'quiz', 'essay_eval'].includes(p.resourceType)
    );
  }

  // 대단원 필터
  if (args.chapter !== undefined) {
    pdfs = pdfs.filter(p => p.inferredChapter === args.chapter);
  }

  // 정답/해설 파일 제외
  pdfs = pdfs.filter(p => {
    const lower = p.fileName.toLowerCase();
    return !lower.includes('정답') && !lower.includes('해설') && !lower.includes('풀이');
  });

  // 앞쪽 건너뛰기
  if (args.skip && args.skip > 0) {
    pdfs = pdfs.slice(args.skip);
  }

  // 파일 수 제한
  if (args.limit && args.limit > 0) {
    pdfs = pdfs.slice(0, args.limit);
  }

  if (pdfs.length === 0) {
    console.log('⚠ 추출할 PDF 파일이 없습니다. --scan으로 확인하세요.');
    return;
  }

  console.log(`\n📚 ${textbook.subject} (${textbook.author})`);
  console.log(`   처리할 PDF: ${pdfs.length}개${args.dryRun ? ' (DRY RUN)' : ''}\n`);

  const genai = new GoogleGenAI({ apiKey });
  const prisma = args.dryRun ? null : new PrismaClient();

  let totalExtracted = 0;
  let totalSaved = 0;
  let errorCount = 0;

  for (let i = 0; i < pdfs.length; i++) {
    const pdf = pdfs[i];
    const progress = `[${i + 1}/${pdfs.length}]`;
    const chapterLabel = pdf.inferredChapter ? `${pdf.inferredChapter}단원` : '?단원';

    process.stdout.write(`${progress} ${chapterLabel} ${pdf.fileName} ... `);

    try {
      // PDF 크기 체크 (20MB 제한)
      if (pdf.sizeBytes > 20 * 1024 * 1024) {
        console.log(`⚠ 스킵 (${(pdf.sizeBytes / 1024 / 1024).toFixed(1)}MB > 20MB)`);
        continue;
      }

      // Gemini로 추출
      const questions = await extractFromPdf(genai, pdf.filePath);
      totalExtracted += questions.length;

      if (questions.length === 0) {
        console.log('0문제 추출됨');
        continue;
      }

      if (args.dryRun) {
        console.log(`✅ ${questions.length}문제 추출 (저장 안 함)`);
        // 첫 문제 미리보기
        const first = questions[0];
        console.log(`      예시: [${first.difficulty}] ${first.content.substring(0, 60)}...`);
      } else {
        // DB 저장
        const saved = await saveQuestions(prisma!, questions, textbook, pdf.inferredChapter, pdf.fileName);
        totalSaved += saved;
        console.log(`✅ ${questions.length}문제 추출 → ${saved}개 저장`);
      }

      // Rate limit 방지 (2초 대기)
      if (i < pdfs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err) {
      errorCount++;
      const errMsg = err instanceof Error ? err.message : String(err);

      // Rate limit인 경우 더 오래 대기
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        console.log('⚠ API 한도 초과, 30초 대기...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        i--; // 재시도
        errorCount--; // 에러 카운트 복원
        continue;
      }

      console.log(`❌ 에러: ${errMsg.substring(0, 80)}`);
    }
  }

  // 결과 요약
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`📊 결과 요약`);
  console.log(`   처리 파일: ${pdfs.length}개`);
  console.log(`   추출 문제: ${totalExtracted}개`);
  if (!args.dryRun) console.log(`   DB 저장:   ${totalSaved}개`);
  if (errorCount > 0) console.log(`   에러:      ${errorCount}건`);
  console.log(`${'─'.repeat(50)}`);

  if (prisma) await prisma.$disconnect();
}

main().catch((err) => {
  console.error('치명적 에러:', err);
  process.exit(1);
});
