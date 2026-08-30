/**
 * DiagramSpec → DiagramParam[] 변환 어댑터
 *
 * 기존 DB에 저장된 DiagramSpec(6유형) 데이터를 DiagramParam[](26유형)으로
 * 런타임 변환하여 하위 호환을 유지한다.
 */
import type { DiagramSpec, TriangleDiagram, CircleDiagram, CoordinatePlaneDiagram, QuadrilateralDiagram, SolidFigureDiagram } from '@/types/diagram';
import type { DiagramParam } from '@/types/pdf-extract';

// ─── 메인 변환 ────────────────────────────────────

export function convertSpecToParams(spec: DiagramSpec): DiagramParam[] {
  switch (spec.type) {
    case 'triangle':
      return [convertTriangle(spec)];
    case 'circle':
      return [convertCircle(spec)];
    case 'coordinatePlane':
      return [convertCoordinatePlane(spec)];
    case 'quadrilateral':
      return [convertQuadrilateral(spec)];
    case 'solid':
      return [convertSolid(spec)];
    case 'composite':
      // composite → 각 element를 재귀 변환 후 flat
      return (spec.elements ?? []).flatMap(convertSpecToParams);
    case 'polygon':
      // polygon은 신규 타입 — 레거시 DiagramParam 시스템에 동등 매핑 없음.
      // 직접 렌더 경로(`@/lib/diagram/renderer`)로 표시 권장.
      return [];
    default:
      return [];
  }
}

// ─── 삼각형 ────────────────────────────────────

function convertTriangle(spec: TriangleDiagram): DiagramParam {
  // 프리셋 → 좌표 계산 (normalize.ts 로직 인라인)
  const SCALE = 150;
  let vertices: [{ x: number; y: number; label?: string }, { x: number; y: number; label?: string }, { x: number; y: number; label?: string }];

  if (spec.preset) {
    const a = spec.sides?.a ?? 5;
    const b = spec.sides?.b ?? (spec.preset === 'equilateral' ? a : 4);
    const c = spec.sides?.c ?? (spec.preset === 'equilateral' ? a : 3);
    const maxSide = Math.max(a, b, c);

    switch (spec.preset) {
      case 'right': {
        const base = c * (SCALE / maxSide);
        const height = b * (SCALE / maxSide);
        vertices = [
          { x: 0, y: height },
          { x: base, y: height },
          { x: 0, y: 0 },
        ];
        break;
      }
      case 'right-isosceles': {
        const side = SCALE;
        vertices = [
          { x: 0, y: side },
          { x: side, y: side },
          { x: 0, y: 0 },
        ];
        break;
      }
      case 'equilateral': {
        const side = SCALE;
        const h = side * Math.sqrt(3) / 2;
        vertices = [
          { x: 0, y: h },
          { x: side, y: h },
          { x: side / 2, y: 0 },
        ];
        break;
      }
      case 'isosceles': {
        const base = c * (SCALE / Math.max(a, c));
        const equal = a * (SCALE / Math.max(a, c));
        const h = Math.sqrt(equal ** 2 - (base / 2) ** 2);
        vertices = [
          { x: 0, y: h },
          { x: base, y: h },
          { x: base / 2, y: 0 },
        ];
        break;
      }
      default: {
        // scalene: 코사인 법칙
        const sa = a * (SCALE / maxSide);
        const sb = b * (SCALE / maxSide);
        const sc = c * (SCALE / maxSide);
        const cosA = (sb ** 2 + sc ** 2 - sa ** 2) / (2 * sb * sc);
        const sinA = Math.sqrt(Math.max(0, 1 - cosA ** 2));
        vertices = [
          { x: 0, y: SCALE },
          { x: sc, y: SCALE },
          { x: sb * cosA, y: SCALE - sb * sinA },
        ];
        break;
      }
    }
  } else if (spec.vertices) {
    vertices = spec.vertices.map((v) => ({ x: v[0], y: v[1] })) as typeof vertices;
  } else {
    vertices = [
      { x: 0, y: SCALE },
      { x: SCALE, y: SCALE },
      { x: 0, y: 0 },
    ];
  }

  // 꼭짓점 라벨 적용
  const vLabels = spec.vertexLabels ?? ['A', 'B', 'C'];
  vertices.forEach((v, i) => { v.label = vLabels[i]; });

  // sideLabels 변환
  const sideLabels: { from: number; to: number; label: string }[] = [];
  if (spec.showLengths) {
    for (const sl of spec.showLengths) {
      sideLabels.push({ from: sl.edge[0], to: sl.edge[1], label: sl.value });
    }
  } else if (spec.sides) {
    if (spec.sides.c) sideLabels.push({ from: 0, to: 1, label: String(spec.sides.c) });
    if (spec.sides.a) sideLabels.push({ from: 1, to: 2, label: String(spec.sides.a) });
    if (spec.sides.b) sideLabels.push({ from: 2, to: 0, label: String(spec.sides.b) });
  }

  // angleLabels 변환
  const angleLabels: { vertex: number; value: string }[] = [];
  if (spec.showAngles && spec.angleValues) {
    spec.showAngles.forEach((idx, i) => {
      if (spec.angleValues![i]) angleLabels.push({ vertex: idx, value: spec.angleValues![i] });
    });
  } else if (spec.angles) {
    if (spec.angles.A !== undefined) angleLabels.push({ vertex: 0, value: `${spec.angles.A}°` });
    if (spec.angles.B !== undefined) angleLabels.push({ vertex: 1, value: `${spec.angles.B}°` });
    if (spec.angles.C !== undefined) angleLabels.push({ vertex: 2, value: `${spec.angles.C}°` });
  }

  // rightAngleMarks
  const rightAngleMarks: number[] = [];
  if (spec.rightAngle !== undefined) rightAngleMarks.push(spec.rightAngle);

  const params: Record<string, unknown> = {
    vertices,
    sides: sideLabels.length > 0 ? sideLabels : undefined,
    angles: angleLabels.length > 0 ? angleLabels : undefined,
    rightAngleMarks: rightAngleMarks.length > 0 ? rightAngleMarks : undefined,
  };

  // 고급 기하 필드 passthrough
  if (spec.specialPoints) params.specialPoints = spec.specialPoints;
  if (spec.auxiliaryLines) params.auxiliaryLines = spec.auxiliaryLines;
  if (spec.inscribedCircle) params.inscribedCircle = spec.inscribedCircle;
  if (spec.circumscribedCircle) params.circumscribedCircle = spec.circumscribedCircle;

  return { type: 'triangle', label: '삼각형', params };
}

// ─── 원 ────────────────────────────────────

function convertCircle(spec: CircleDiagram): DiagramParam {
  const cx = spec.center?.[0] ?? 150;
  const cy = spec.center?.[1] ?? 150;
  const radius = spec.radius ?? 80;

  const params: Record<string, unknown> = { cx, cy, radius };

  // labels
  const labels: { text: string; angle: number; position?: string }[] = [];
  if (spec.labels) {
    for (const l of spec.labels) {
      // position으로부터 angle 근사 계산
      const angle = Math.atan2(l.position[1] - cy, l.position[0] - cx) * (180 / Math.PI);
      labels.push({ text: l.text, angle });
    }
  }
  if (labels.length > 0) params.labels = labels;

  // arcs: DiagramSpec { from, to } → DiagramParam { startAngle, endAngle }
  if (spec.arcs) {
    params.arcs = spec.arcs.map((a) => ({
      startAngle: a.from,
      endAngle: a.to,
      label: a.label,
    }));
  }

  // chords: DiagramSpec { from, to } → DiagramParam { startAngle, endAngle }
  if (spec.chords) {
    params.chords = spec.chords.map((c) => ({
      startAngle: c.from,
      endAngle: c.to,
      label: c.label,
    }));
  }

  // tangentLines, radiusLines, centralAngles, inscribedAngles — 직접 전달
  if (spec.tangentLines) params.tangentLines = spec.tangentLines;
  if (spec.radiusLines) params.radiusLines = spec.radiusLines;
  if (spec.centralAngles) params.centralAngles = spec.centralAngles;
  if (spec.inscribedAngles) params.inscribedAngles = spec.inscribedAngles;

  return { type: 'circle', label: '원', params };
}

// ─── 좌표평면 ────────────────────────────────────

function convertCoordinatePlane(spec: CoordinatePlaneDiagram): DiagramParam {
  // 함수가 있으면 function_graph, 없으면 coordinate_plane
  const hasFunctions = spec.functions && spec.functions.length > 0;
  const type = hasFunctions ? 'function_graph' : 'coordinate_plane';

  const params: Record<string, unknown> = {
    xRange: spec.xRange ?? [-5, 5],
    yRange: spec.yRange ?? [-5, 5],
    gridStep: spec.showGrid ? 1 : undefined,
  };

  if (hasFunctions) {
    // expr → expression 필드명 변환
    params.functions = spec.functions!.map((f) => ({
      expression: f.expr,
      color: f.color,
      label: f.label,
    }));
  }

  if (spec.points) {
    params.points = spec.points.map((p) => ({
      x: p.coord[0],
      y: p.coord[1],
      label: p.label,
    }));
  }

  if (spec.lines) {
    params.lines = spec.lines.map((l) => ({
      from: { x: l.from[0], y: l.from[1] },
      to: { x: l.to[0], y: l.to[1] },
      label: l.label,
    }));
  }

  const label = hasFunctions ? '함수 그래프' : '좌표평면';
  return { type, label, params };
}

// ─── 사각형 ────────────────────────────────────

function convertQuadrilateral(spec: QuadrilateralDiagram): DiagramParam {
  const SCALE = 150;
  let vertices: [{ x: number; y: number; label?: string }, { x: number; y: number; label?: string }, { x: number; y: number; label?: string }, { x: number; y: number; label?: string }];

  if (spec.preset) {
    const w = (spec.sides?.width ?? 6) * (SCALE / 6);
    const h = (spec.sides?.height ?? 4) * (SCALE / 6);

    switch (spec.preset) {
      case 'square':
        vertices = [{ x: 0, y: w }, { x: w, y: w }, { x: w, y: 0 }, { x: 0, y: 0 }];
        break;
      case 'rectangle':
        vertices = [{ x: 0, y: h }, { x: w, y: h }, { x: w, y: 0 }, { x: 0, y: 0 }];
        break;
      case 'parallelogram': {
        const skew = w * 0.25;
        vertices = [{ x: skew, y: h }, { x: w + skew, y: h }, { x: w, y: 0 }, { x: 0, y: 0 }];
        break;
      }
      case 'rhombus': {
        const half = w / 2;
        const halfH = h / 2;
        vertices = [{ x: half, y: h }, { x: w, y: halfH }, { x: half, y: 0 }, { x: 0, y: halfH }];
        break;
      }
      case 'trapezoid': {
        const top = (spec.sides?.top ?? 3) * (SCALE / 6);
        const offset = (w - top) / 2;
        vertices = [{ x: 0, y: h }, { x: w, y: h }, { x: w - offset, y: 0 }, { x: offset, y: 0 }];
        break;
      }
      default:
        vertices = [{ x: 0, y: h }, { x: w, y: h }, { x: w, y: 0 }, { x: 0, y: 0 }];
    }
  } else if (spec.vertices) {
    vertices = spec.vertices.map((v) => ({ x: v[0], y: v[1] })) as typeof vertices;
  } else {
    vertices = [{ x: 0, y: SCALE }, { x: SCALE, y: SCALE }, { x: SCALE, y: 0 }, { x: 0, y: 0 }];
  }

  // 꼭짓점 라벨
  const vLabels = spec.vertexLabels ?? ['A', 'B', 'C', 'D'];
  vertices.forEach((v, i) => { v.label = vLabels[i]; });

  // sideLabels
  const sideLabels: { from: number; to: number; label: string }[] = [];
  if (spec.showLengths) {
    for (const sl of spec.showLengths) {
      sideLabels.push({ from: sl.edge[0], to: sl.edge[1], label: sl.value });
    }
  } else if (spec.sides) {
    if (spec.sides.width) sideLabels.push({ from: 0, to: 1, label: String(spec.sides.width) });
    if (spec.sides.height) sideLabels.push({ from: 1, to: 2, label: String(spec.sides.height) });
  }

  // angleLabels
  const angleLabels: { vertex: number; value: string }[] = [];
  if (spec.showAngles && spec.angleValues) {
    spec.showAngles.forEach((idx, i) => {
      if (spec.angleValues![i]) angleLabels.push({ vertex: idx, value: spec.angleValues![i] });
    });
  }

  const params: Record<string, unknown> = {
    vertices,
    type: spec.preset,
    sides: sideLabels.length > 0 ? sideLabels : undefined,
    angles: angleLabels.length > 0 ? angleLabels : undefined,
  };

  // 대각선
  if (spec.diagonals) {
    if (typeof spec.diagonals === 'boolean') {
      params.diagonals = [
        { from: 0, to: 2, style: 'dashed' },
        { from: 1, to: 3, style: 'dashed' },
      ];
    } else {
      params.diagonals = spec.diagonals;
    }
  }

  // 기하 마크
  if (spec.rightAngleMarks) params.rightAngleMarks = spec.rightAngleMarks;
  if (spec.congruenceMarks) params.congruenceMarks = spec.congruenceMarks;
  if (spec.parallelMarks) params.parallelMarks = spec.parallelMarks;

  return { type: 'quadrilateral', label: '사각형', params };
}

// ─── 입체도형 ────────────────────────────────────

function convertSolid(spec: SolidFigureDiagram): DiagramParam {
  // shape 매핑: DiagramSpec의 'prism' → DiagramParam의 'triangular_prism' 등
  const shapeMap: Record<string, string> = {
    cube: 'cube',
    cylinder: 'cylinder',
    cone: 'cone',
    sphere: 'sphere',
    prism: 'triangular_prism',
    pyramid: 'pyramid',
  };

  const params: Record<string, unknown> = {
    shape: shapeMap[spec.shape] ?? spec.shape,
    dimensions: spec.dimensions ?? {},
  };

  if (spec.showDimensions) params.showDimensions = true;

  return { type: 'solid_figure', label: '입체도형', params };
}
