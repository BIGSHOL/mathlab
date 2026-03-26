/**
 * 중1-1 개념 선수관계 자동 생성 스크립트
 *
 * generate-prerequisites.ts (초등)과 동일한 구조:
 * 1. Gemini에게 중1-1 + 초등 전체 개념 목록을 보내고
 * 2. 각 중1-1 개념의 선수 개념 추출 (초등 개념도 선수로 가능)
 * 3. ConceptPrerequisite 테이블에 저장
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
          conceptCode: { type: Type.STRING, description: '후속 개념 코드 (중1-1 개념)' },
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
  // 중1-1 개념
  const middle1Concepts = await prisma.concept.findMany({
    where: { grade: 'middle_1', semester: 1 },
    select: { id: true, conceptCode: true, title: true, grade: true },
    orderBy: { conceptCode: 'asc' },
  });

  // 초등 전체 개념 (선수 후보)
  const elemConcepts = await prisma.concept.findMany({
    where: { grade: { startsWith: 'elementary_' } },
    select: { id: true, conceptCode: true, title: true, grade: true },
    orderBy: [{ grade: 'asc' }, { conceptCode: 'asc' }],
  });

  console.log(`중1-1 개념: ${middle1Concepts.length}개`);
  console.log(`초등 개념: ${elemConcepts.length}개 (선수 후보)\n`);

  // 개념 목록 텍스트
  const middle1List = middle1Concepts
    .map(c => `${c.conceptCode} | 중1-1 | ${c.title}`)
    .join('\n');

  const elemList = elemConcepts
    .map(c => `${c.conceptCode} | ${c.grade?.replace('elementary_', '초')} | ${c.title}`)
    .join('\n');

  const prompt = `당신은 한국 수학 교육과정 전문가입니다.

아래는 중학교 1학년 1학기(중1-1) 수학 개념 목록과, 초등학교 3~6학년 수학 개념 목록입니다.
각 **중1-1 개념**을 배우기 위해 **반드시 먼저 알아야 하는 선수 개념**을 찾아주세요.

[규칙]
1. 선수관계는 **직접적인 관계만** 설정 (A→B→C일 때, C의 선수는 B만. A는 B의 선수)
2. 같은 대단원 내 소단원 순서 관계: M1-NUM-01-2는 M1-NUM-01-1이 선수
3. **초등 → 중1 연결도 포함**: 중1 소인수분해는 초등 곱셈/약수/배수가 선수
4. 영역 간 연결도 가능: 좌표평면은 수직선이 선수, 방정식은 문자와 식이 선수
5. 선수 개념이 없는 것(가장 기초)은 prerequisiteCodes를 빈 배열 []로
6. **목록에 있는 코드만** 사용 (존재하지 않는 코드 금지)
7. 선수 개념은 보통 1~3개, 최대 5개
8. 초등 선수는 가장 **직접 관련된 상위 학년 개념**만 선택 (초3 기초까지 거슬러 올라가지 말 것)

[중1-1 개념 목록 — 선수관계를 설정할 대상]
${middle1List}

[초등 개념 목록 — 선수 후보로 참조 가능]
${elemList}

**중1-1 개념만** 대상으로 선수관계를 JSON으로 반환하세요. (초등 개념 간 관계는 이미 설정되어 있으므로 제외)`;

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

  // 코드 → id 매핑 (중1 + 초등 모두)
  const codeToId = new Map<string, string>();
  for (const c of [...middle1Concepts, ...elemConcepts]) {
    if (c.conceptCode) codeToId.set(c.conceptCode, c.id);
  }

  // 기존 중1-1 선수관계만 삭제
  const middle1Ids = middle1Concepts.map(c => c.id);
  const deleted = await prisma.conceptPrerequisite.deleteMany({
    where: { conceptId: { in: middle1Ids } },
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
        if (invalidCode <= 10) console.log(`  무효 코드: ${rel.conceptCode} ← ${prereqCode}`);
        continue;
      }

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
        skipped++; // 중복
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
    where: { grade: 'middle_1', semester: 1 },
    select: {
      conceptCode: true, title: true,
      prerequisites: { select: { prerequisite: { select: { conceptCode: true, title: true, grade: true } } } },
    },
    orderBy: { conceptCode: 'asc' },
  });

  let withPrereq = 0, noPrereq = 0, fromElem = 0, fromMiddle = 0;

  for (const c of afterConcepts) {
    if (c.prerequisites.length > 0) {
      withPrereq++;
      const prereqs = c.prerequisites.map(p => {
        const code = p.prerequisite.conceptCode;
        const isElem = p.prerequisite.grade?.startsWith('elementary_');
        if (isElem) fromElem++;
        else fromMiddle++;
        return `${code}${isElem ? '(초)' : ''}`;
      });
      console.log(`${c.conceptCode} ${c.title} ← [${prereqs.join(', ')}]`);
    } else {
      noPrereq++;
      console.log(`${c.conceptCode} ${c.title} ← (기초, 선수 없음)`);
    }
  }

  console.log(`\n선수있음: ${withPrereq}개 | 기초(선수없음): ${noPrereq}개`);
  console.log(`초등→중1 연결: ${fromElem}개 | 중1 내부 연결: ${fromMiddle}개`);

  // 순환 참조 체크
  console.log(`\n--- 순환 참조 체크 ---`);
  const allRels = await prisma.conceptPrerequisite.findMany({
    where: { conceptId: { in: middle1Ids } },
    select: { conceptId: true, prerequisiteId: true },
  });
  let cycles = 0;
  const graph = new Map<string, Set<string>>();
  for (const r of allRels) {
    if (!graph.has(r.conceptId)) graph.set(r.conceptId, new Set());
    graph.get(r.conceptId)!.add(r.prerequisiteId);
  }
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
