// 공유 svg-diagrams renderDiagram + Lab 잉크 리컬러(LabDiagram과 동일 경로). 사용: node --import tsx scripts/lab/_render-shared.ts dp.json out.svg
import { renderDiagram } from '@/lib/utils/svg-diagrams';
import { recolorToInk } from '@/lib/lab/diagram/lab-colors';
import { readFileSync, writeFileSync } from 'node:fs';
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const svg = recolorToInk(renderDiagram(d) || '');
writeFileSync(process.argv[3], svg);
console.log('rendered →', process.argv[3], '(' + svg.length + ' chars)');
