// 공유 svg-diagrams renderDiagram 직접 호출(임시 테스트). 사용: node --import tsx scripts/lab/_render-shared.ts dp.json out.svg
import { renderDiagram } from '@/lib/utils/svg-diagrams';
import { readFileSync, writeFileSync } from 'node:fs';
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const svg = renderDiagram(d);
writeFileSync(process.argv[3], svg || '');
console.log('rendered →', process.argv[3], '(' + (svg || '').length + ' chars)');
