import type { DiagramPlugin } from '../types';

// 초등
import { numberLinePlugin } from './elementary/number-line';
import { fractionCirclePlugin } from './elementary/fraction-circle';
import { fractionRectPlugin } from './elementary/fraction-rect';
import { placeValuePlugin } from './elementary/place-value';
import { dotArrayPlugin } from './elementary/dot-array';
import { flowChartPlugin } from './elementary/flow-chart';
import { barChartPlugin } from './elementary/bar-chart';
import { lineGraphPlugin } from './elementary/line-graph';
import { pictureGraphPlugin } from './elementary/picture-graph';
import { pieChartPlugin } from './elementary/pie-chart';
import { bandChartPlugin } from './elementary/band-chart';
import { angleFigurePlugin } from './elementary/angle-figure';
import { clockFacePlugin } from './elementary/clock-face';

// 중등
import { coordinatePlanePlugin } from './middle/coordinate-plane';
import { circlePlugin } from './middle/circle';
import { trianglePlugin } from './middle/triangle';
import { quadrilateralPlugin } from './middle/quadrilateral';
import { regularPolygonPlugin } from './middle/regular-polygon';
import { functionGraphPlugin } from './middle/function-graph';
import { vennDiagramPlugin } from './middle/venn-diagram';
import { histogramPlugin } from './middle/histogram';
import { stemLeafPlugin } from './middle/stem-leaf';
import { solidFigurePlugin } from './middle/solid-figure';
import { netDiagramPlugin } from './middle/net-diagram';
import { treeDiagramPlugin } from './middle/tree-diagram';
import { scatterPlotPlugin } from './middle/scatter-plot';

/** 26개 다이어그램 플러그인 전체 목록 */
export const ALL_PLUGINS: DiagramPlugin[] = [
  // 초등 (13)
  numberLinePlugin,
  fractionCirclePlugin,
  fractionRectPlugin,
  placeValuePlugin,
  dotArrayPlugin,
  flowChartPlugin,
  barChartPlugin,
  lineGraphPlugin,
  pictureGraphPlugin,
  pieChartPlugin,
  bandChartPlugin,
  angleFigurePlugin,
  clockFacePlugin,
  // 중등 (13)
  coordinatePlanePlugin,
  circlePlugin,
  trianglePlugin,
  quadrilateralPlugin,
  regularPolygonPlugin,
  functionGraphPlugin,
  vennDiagramPlugin,
  histogramPlugin,
  stemLeafPlugin,
  solidFigurePlugin,
  netDiagramPlugin,
  treeDiagramPlugin,
  scatterPlotPlugin,
];
