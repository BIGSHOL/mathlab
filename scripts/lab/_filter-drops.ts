// 임시(throwaway) — 워크플로 output에서 검수 탈락 문항(13개) 제거 → clean JSON.
//   사용: node --import tsx scripts/lab/_filter-drops.ts <in.json> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';

// 드롭: `${conceptId}|${problemNumber}|${type}` (검수에서 렌더 불가/왜곡/미지원필드)
const DROP = new Set([
  // 16-08 무게중심 — segmentLabels 미지원(렌더 누락 + 데이터 위치 모호)
  'lab-cur-mid-16-08|01-1|SHORT_ANSWER',
  'lab-cur-mid-16-08|01-2|SHORT_ANSWER',
  'lab-cur-mid-16-08|02-1|SHORT_ANSWER',
  'lab-cur-mid-16-08|02-2|SHORT_ANSWER',
  'lab-cur-mid-16-08|03-1|SHORT_ANSWER',
  'lab-cur-mid-16-08|03-2|SHORT_ANSWER',
  'lab-cur-mid-16-08|05-1|SHORT_ANSWER',
  // 16-12 — gridDivisions/shadedCells 미지원(9등분 색칠 표적 렌더 불가)
  'lab-cur-mid-16-12|06|MULTIPLE_CHOICE',
  // 16-03 외심/내심 — 의미 왜곡(O 미표시/반각→모양 왜곡/세그먼트 부재)
  'lab-cur-mid-16-03|02|MULTIPLE_CHOICE',
  'lab-cur-mid-16-03|04|MULTIPLE_CHOICE',
  'lab-cur-mid-16-03|05|MULTIPLE_CHOICE',
  // 16-09 MC#02 — 변 라벨 "8    12"→"812" 깨짐 + 중선 footD가 8:12 분할 아님
  'lab-cur-mid-16-09|02|MULTIPLE_CHOICE',
  // 16-05 MC#02 — 평행사변형인데 사다리꼴 모양으로 렌더(모양 모순)
  'lab-cur-mid-16-05|02|MULTIPLE_CHOICE',
]);

const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const byConcept = data.result.byConcept as Record<string, Array<Record<string, string>>>;
let kept = 0, dropped = 0;
for (const cid of Object.keys(byConcept)) {
  byConcept[cid] = byConcept[cid].filter((p) => {
    const key = `${p.conceptId}|${p.problemNumber}|${p.type}`;
    if (DROP.has(key)) { dropped++; return false; }
    kept++; return true;
  });
  if (byConcept[cid].length === 0) delete byConcept[cid];
}
writeFileSync(process.argv[3], JSON.stringify(data, null, 2));
console.log(`kept ${kept}, dropped ${dropped} → ${process.argv[3]}`);
console.log('drops matched:', DROP.size, '(expected 13)');
console.log('kept by concept:', JSON.stringify(Object.fromEntries(Object.entries(byConcept).map(([k, v]) => [k.replace('lab-cur-mid-', ''), v.length]))));
