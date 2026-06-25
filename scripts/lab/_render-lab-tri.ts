// Lab 삼각형 렌더러 직접 호출(임시 테스트). 사용: node --import tsx scripts/lab/_render-lab-tri.ts params.json out.svg
import { renderLabTriangle } from '@/lib/lab/diagram/lab-triangle';
import { readFileSync, writeFileSync } from 'node:fs';
const params = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const svg = renderLabTriangle(params);
writeFileSync(process.argv[3], svg);
console.log('rendered →', process.argv[3], '(' + svg.length + ' chars)');
