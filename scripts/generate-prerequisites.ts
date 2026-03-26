/**
 * 초등 개념 선수관계 자동 생성 스크립트
 *
 * Gemini에게 전체 개념 목록을 보내고, 각 개념의 선수 개념을 추출
 * ConceptPrerequisite 테이블에 저장
 */

import { GoogleGenAI, Type } from '@google/genai';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error('GEMINI_API_KEY 없음'); process.exit(1); }
const ai = new GoogleGenAI({ apiKey });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    relations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          conceptCode: { type: Type.STRING, description: '후속 개념 코드' },
          prerequisiteCodes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '이 개념을 배우기 전에 반드시 알아야 할 선수 개념 코드들',
          },
        },
        required: ['conceptCode', 'prerequisiteCodes'],
      },
    },
  },
  required: ['relations'],
};

async function main() {
  const concepts = await prisma.concept.findMany({
    where: { grade: { startsWith: 'elementary_' } },
    select: { id: true, conceptCode: true, title: true, grade: true },
    orderBy: [{ grade: 'asc' }, { conceptCode: 'asc' }],
  });

  console.log(`초등 개념 ${concepts.length}개 선수관계 추출 시작...\n`);

  // 개념 목록 텍스트
  const conceptList = concepts
    .map(c => `${c.conceptCode} | ${c.grade?.replace('elementary_', '초')} | ${c.title}`)
    .join('\n');

  const prompt = `당신은 한국 초등 수학 교육과정 전문가입니다.

아래는 초등 3~6학년 수학 개념 목록입니다. 각 개념을 배우기 위해 **반드시 먼저 알아야 하는 선수 개념**을 찾아주세요.

[규칙]
1. 선수관계는 **직접적인 관계만** 설정 (A→B→C일 때, C의 선수는 B만. A는 B의 선수)
2. 같은 대단원 내 소단원 순서 관계: E3-NUM-01-2는 E3-NUM-01-1이 선수
3. 학년 간 연결: 초4 분수 덧셈은 초3 분수 기초가 선수
4. 영역 간 연결: 넓이 구하기는 곱셈이 선수
5. 선수 개념이 없는 것(가장 기초)은 prerequisiteCodes를 빈 배열 []로
6. 선수 개념은 **목록에 있는 코드만** 사용 (존재하지 않는 코드 금지)
7. 선수 개념은 보통 1~3개, 최대 5개

[개념 목록]
${conceptList}

모든 개념에 대해 선수관계를 JSON으로 반환하세요.`;

  console.log('Gemini 호출 중...');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.1,
    },
  });

  if (!response.text) {
    console.error('빈 응답');
    process.exit(1);
  }

  let jsonStr = response.text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
  }

  const data = JSON.parse(jsonStr) as {
    relations: { conceptCode: string; prerequisiteCodes: string[] }[];
  };

  console.log(`응답 받음: ${data.relations.length}개 개념\n`);

  // 코드 → id 매핑
  const codeToId = new Map<string, string>();
  for (const c of concepts) {
    if (c.conceptCode) codeToId.set(c.conceptCode, c.id);
  }

  // 기존 선수관계 삭제
  const deleted = await prisma.conceptPrerequisite.deleteMany({
    where: {
      concept: { grade: { startsWith: 'elementary_' } },
    },
  });
  console.log(`기존 관계 삭제: ${deleted.count}개`);

  // 새 관계 생성
  let created = 0;
  let skipped = 0;
  let invalidCode = 0;

  for (const rel of data.relations) {
    const conceptId = codeToId.get(rel.conceptCode);
    if (!conceptId) {
      invalidCode++;
      continue;
    }

    for (const prereqCode of rel.prerequisiteCodes) {
      const prereqId = codeToId.get(prereqCode);
      if (!prereqId) {
        invalidCode++;
        if (invalidCode <= 5) console.log(`  무효 코드: ${rel.conceptCode} ← ${prereqCode}`);
        continue;
      }

      // 자기 자신 참조 방지
      if (conceptId === prereqId) {
        skipped++;
        continue;
      }

      try {
        await prisma.conceptPrerequisite.create({
          data: { conceptId, prerequisiteId: prereqId },
        });
        created++;
      } catch {
        skipped++; // 중복 등
      }
    }
  }

  console.log(`\n=== 결과 ===`);
  console.log(`생성: ${created}개`);
  console.log(`스킵: ${skipped}개`);
  console.log(`무효 코드: ${invalidCode}개`);

  // 검증
  console.log(`\n=== 검증 ===`);
  const afterConcepts = await prisma.concept.findMany({
    where: { grade: { startsWith: 'elementary_' } },
    select: {
      conceptCode: true, grade: true,
      prerequisites: { select: { prerequisite: { select: { conceptCode: true } } } },
    },
    orderBy: [{ grade: 'asc' }, { conceptCode: 'asc' }],
  });

  const grades = ['elementary_3', 'elementary_4', 'elementary_5', 'elementary_6'];
  for (const g of grades) {
    const gc = afterConcepts.filter(c => c.grade === g);
    const withPrereq = gc.filter(c => c.prerequisites.length > 0).length;
    const noPrereq = gc.filter(c => c.prerequisites.length === 0).length;
    console.log(`${g.replace('elementary_', '초')}: ${gc.length}개 | 선수있음 ${withPrereq} | 기초(선수없음) ${noPrereq}`);
  }

  // 샘플
  console.log(`\n--- 선수관계 샘플 ---`);
  const withPrereqs = afterConcepts.filter(c => c.prerequisites.length > 0);
  for (const c of withPrereqs.slice(0, 15)) {
    const prereqs = c.prerequisites.map(p => p.prerequisite.conceptCode).join(', ');
    console.log(`${c.conceptCode} ← [${prereqs}]`);
  }

  // 순환 참조 체크
  console.log(`\n--- 순환 참조 체크 ---`);
  const allRels = await prisma.conceptPrerequisite.findMany({
    select: { conceptId: true, prerequisiteId: true },
  });
  const graph = new Map<string, Set<string>>();
  for (const r of allRels) {
    if (!graph.has(r.conceptId)) graph.set(r.conceptId, new Set());
    graph.get(r.conceptId)!.add(r.prerequisiteId);
  }

  let cycles = 0;
  for (const [node, prereqs] of graph) {
    for (const prereq of prereqs) {
      if (graph.get(prereq)?.has(node)) {
        cycles++;
        if (cycles <= 3) {
          const nodeCode = [...codeToId.entries()].find(([, id]) => id === node)?.[0];
          const prereqCode = [...codeToId.entries()].find(([, id]) => id === prereq)?.[0];
          console.log(`  순환: ${nodeCode} ↔ ${prereqCode}`);
        }
      }
    }
  }
  console.log(`순환 참조: ${cycles}개`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
