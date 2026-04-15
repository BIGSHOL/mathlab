import { renderSolidFigure } from './src/lib/utils/svg-diagrams/middle/solid-figure';
import fs from 'fs';

const svg = renderSolidFigure({
    shape: 'cube',
    dimensions: { width: 90, height: 120, depth: 60 },
    gridDivisions: { w: 4, h: 3, d: 2 }
});

fs.writeFileSync('artifact_test_solid.svg', svg);
