// 🚧 Lab 토대4 — 삼각형 렌더러 (각을 호/직각 기호로 표시)
//   공유 svg-diagrams의 renderTriangle은 각을 텍스트로만 찍는다(호·직각 기호 없음).
//   격리 규칙(CLAUDE.md): 공유 유틸 수정 금지 → Lab-local 복제로 각 표현을 보강.
//   공유 svg-utils 헬퍼(svgWrap·katexLabel·renderRightAngleMark·COLORS)는 읽기전용 재사용.
//
//   각 처리:
//     - 90°(라벨 "90°" 또는 기하적 직각) → 직각 기호(⌐, renderRightAngleMark)
//     - 그 외 → 꼭짓점에 호(arc) + 각 값 라벨(호 바깥 이등분선상)
import { svgWrap, katexLabel, renderRightAngleMark, COLORS } from '@/lib/utils/svg-diagrams/shared/svg-utils';
import { LAB_INK, LAB_FILL } from '@/lib/lab/diagram/lab-colors';
import {
  computeIncenter,
  computeCircumcenter,
  computeCentroid,
  computeOrthocenter,
  computeInradius,
  computeCircumradius,
  footOfPerpendicular,
  midpoint,
  dist,
  type Pt,
} from '@/lib/utils/svg-diagrams/shared/geometry-math';
import type { TriangleParams } from '@/lib/utils/svg-diagrams/types';

const PAD = 40;
const BOX = 200;
const ARC_R = 18;

function isRightValue(v: string): boolean {
  return /^\s*90\s*°?\s*$/.test(v);
}

/**
 * 각 값에서 꼭짓점을 계산 — 삼각형은 세 각으로 모양이 결정됨(닮음).
 * 프리셋 도형이 라벨 각과 불일치하는 문제를 해결(라벨 충실 도형).
 *   - angles[i].value를 파싱(°·문자 제거). 미지값(예: "x")은 NaN.
 *   - 정확히 1개 미지면 180−합으로 보완. 셋 다 유효(합 180±1)일 때만 계산, 아니면 null.
 *   - 사인법칙: 변 ∝ sin(대각). P0=(0,0), P1=(sin a2,0), P2는 a0 위로(화면 상단=음수 y).
 */
function verticesFromAngles(
  params: TriangleParams,
): { x: number; y: number; label?: string }[] | null {
  const angles = params.angles ?? [];
  const ang: number[] = [NaN, NaN, NaN];
  for (const a of angles) {
    if (a.vertex < 0 || a.vertex > 2) continue;
    const n = parseFloat(String(a.value ?? '').replace(/[^0-9.]/g, ''));
    ang[a.vertex] = Number.isFinite(n) ? n : NaN;
  }
  // rightAngleMarks[]가 가리키는 꼭짓점은 90°로 주입(각도 라벨 없어도 직각삼각형 좌표 확정).
  if (params.rightAngleMarks) {
    for (const ri of params.rightAngleMarks) {
      if (ri >= 0 && ri <= 2 && !Number.isFinite(ang[ri])) ang[ri] = 90;
    }
  }
  // 유효 각이 2개 미만이면 좌표 계산 불가 → 제공 좌표 사용
  if (ang.filter((x) => Number.isFinite(x)).length < 2) return null;
  const unknownIdx = ang.findIndex((x) => !Number.isFinite(x));
  const knownSum = ang.filter((x) => Number.isFinite(x)).reduce((s, x) => s + x, 0);
  if (ang.filter((x) => Number.isFinite(x)).length === 2 && unknownIdx >= 0) {
    ang[unknownIdx] = 180 - knownSum;
  }
  if (ang.some((x) => !Number.isFinite(x) || x <= 0 || x >= 180)) return null;
  if (Math.abs(ang[0] + ang[1] + ang[2] - 180) > 1) return null;

  const rad = (d: number) => (d * Math.PI) / 180;
  const pos: [number, number][] = [
    [0, 0],
    [Math.sin(rad(ang[2])), 0],
    [Math.sin(rad(ang[1])) * Math.cos(rad(ang[0])), -Math.sin(rad(ang[1])) * Math.sin(rad(ang[0]))],
  ];
  const v = params.vertices ?? [];
  return pos.map((p, i) => ({ x: p[0], y: p[1], label: v[i]?.label }));
}

export function renderLabTriangle(params: TriangleParams): string {
  // 각 값으로 충실한 도형 계산(가능하면), 아니면 제공된 좌표 사용
  const verts = verticesFromAngles(params) ?? params.vertices;
  if (!verts || verts.length < 3) return '';

  const xs = verts.map((v) => v.x);
  const ys = verts.map((v) => v.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const rangeX = Math.max(...xs) - minX || 1;
  const rangeY = Math.max(...ys) - minY || 1;
  const scale = Math.min(BOX / rangeX, BOX / rangeY);
  const toSvg = (p: { x: number; y: number }): [number, number] => [
    PAD + (p.x - minX) * scale,
    PAD + (p.y - minY) * scale,
  ];
  const pts = verts.map(toSvg);
  const W = rangeX * scale + PAD * 2;
  const H = rangeY * scale + PAD * 2;
  const stroke = params.strokeColor || LAB_INK; // 교재 표준 검정 선(브랜드 블루 대신)
  const parts: string[] = [];

  // 보조선·특수점 계산용 Pt 변환(SVG 좌표 기준)
  const P = (i: number): Pt => ({ x: pts[i][0], y: pts[i][1] });

  // segmentLabels(구간 라벨)·연결선이 참조할 점 좌표 맵 — 렌더 진행하며 채운다(특수점·체비안 발).
  const cevianFeet: Record<string, Pt> = {}; // 체비안 footLabel → 좌표 (예: 'D')
  const centerPts: Record<string, Pt> = {}; // 특수점 라벨 → 좌표 (I/O/G/H)

  // 보조선(중선/수선/각이등분선/수직이등분선) — 회색 점선, 도형 배경
  if (params.auxiliaryLines) {
    for (const aux of params.auxiliaryLines) {
      for (let i = 0; i < 3; i++) {
        const v = P(i);
        const p1 = P((i + 1) % 3);
        const p2 = P((i + 2) % 3);
        let target: Pt | null = null;
        if (aux === 'medians') target = midpoint(p1, p2);
        else if (aux === 'altitudes') target = footOfPerpendicular(v, p1, p2);
        else if (aux === 'angle_bisectors') {
          const d1 = dist(v, p1);
          const d2 = dist(v, p2);
          const r = d2 / (d1 + d2 || 1);
          target = { x: p1.x + r * (p2.x - p1.x), y: p1.y + r * (p2.y - p1.y) };
        } else if (aux === 'perpendicular_bisectors') {
          const mid = midpoint(p1, p2);
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const ext = 40;
          parts.push(
            `<line x1="${(mid.x - nx * ext).toFixed(1)}" y1="${(mid.y - ny * ext).toFixed(1)}" x2="${(mid.x + nx * ext).toFixed(1)}" y2="${(mid.y + ny * ext).toFixed(1)}" stroke="#999" stroke-width="1" stroke-dasharray="4,3"/>`,
          );
        }
        if (target) {
          parts.push(
            `<line x1="${v.x.toFixed(1)}" y1="${v.y.toFixed(1)}" x2="${target.x.toFixed(1)}" y2="${target.y.toFixed(1)}" stroke="#999" stroke-width="1" stroke-dasharray="4,3"/>`,
          );
        }
      }
    }
  }

  // 외접원 / 내접원 (회색 점선)
  if (params.circumscribedCircle) {
    const cc = computeCircumcenter(P(0), P(1), P(2));
    const cr = computeCircumradius(P(0), P(1), P(2));
    parts.push(
      `<circle cx="${cc.x.toFixed(1)}" cy="${cc.y.toFixed(1)}" r="${cr.toFixed(1)}" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="4,3"/>`,
    );
  }
  if (params.inscribedCircle) {
    const ic = computeIncenter(P(0), P(1), P(2));
    const ir = computeInradius(P(0), P(1), P(2));
    parts.push(
      `<circle cx="${ic.x.toFixed(1)}" cy="${ic.y.toFixed(1)}" r="${ir.toFixed(1)}" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="4,3"/>`,
    );
  }

  // 면 + 변
  const ptsStr = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  parts.push(
    `<polygon points="${ptsStr}" fill="${LAB_FILL}" fill-opacity="0.6" stroke="${stroke}" stroke-width="2"/>`,
  );

  // 직각 기호(rightAngleMarks[]) — angles에 "90°"가 없어도 직각 표시.
  if (params.rightAngleMarks) {
    for (const ri of params.rightAngleMarks) {
      if (ri < 0 || ri > 2) continue;
      const [Vx, Vy] = pts[ri];
      const [Ax, Ay] = pts[(ri + 1) % 3];
      const [Bx, By] = pts[(ri + 2) % 3];
      parts.push(renderRightAngleMark(Vx, Vy, Ax, Ay, Bx, By, 11));
    }
  }

  const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3;
  const cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;

  // 꼭짓점 라벨 (중심 반대 방향 16px)
  verts.forEach((v, i) => {
    if (!v.label) return;
    const [px, py] = pts[i];
    const dx = px - cx;
    const dy = py - cy;
    const d = Math.hypot(dx, dy) || 1;
    parts.push(katexLabel(px + (dx / d) * 16, py + (dy / d) * 16, v.label, { fontSize: 13 }));
  });

  // 각: 호 또는 직각 기호
  if (params.angles) {
    for (const a of params.angles) {
      const i = a.vertex;
      if (i < 0 || i > 2) continue;
      const [Vx, Vy] = pts[i];
      const [Ax, Ay] = pts[(i + 1) % 3];
      const [Bx, By] = pts[(i + 2) % 3];

      let u1x = Ax - Vx;
      let u1y = Ay - Vy;
      const l1 = Math.hypot(u1x, u1y) || 1;
      u1x /= l1;
      u1y /= l1;
      let u2x = Bx - Vx;
      let u2y = By - Vy;
      const l2 = Math.hypot(u2x, u2y) || 1;
      u2x /= l2;
      u2y /= l2;

      const val = String(a.value ?? '').trim();
      // 직각 기호는 라벨('90°') 기준 — 도형이 충실하므로 라벨이 곧 실제 각.
      const right = isRightValue(val);

      // 이등분선 방향(내부) — 라벨 위치
      const bx = u1x + u2x;
      const by = u1y + u2y;
      const bl = Math.hypot(bx, by) || 1;

      if (right) {
        parts.push(renderRightAngleMark(Vx, Vy, Ax, Ay, Bx, By, 11));
        // 변수 라벨("x" 등)이면 직각 기호와 함께 표기, "90°"면 기호로 충분
        if (val && !isRightValue(val)) {
          parts.push(katexLabel(Vx + (bx / bl) * 28, Vy + (by / bl) * 28, val, { fontSize: 11 }));
        }
      } else {
        const sx = Vx + u1x * ARC_R;
        const sy = Vy + u1y * ARC_R;
        const ex = Vx + u2x * ARC_R;
        const ey = Vy + u2y * ARC_R;
        // sweep: 호가 내부(이등분선 쪽)로 볼록하도록. cross 부호로 결정(검증 후 보정).
        const cross = u1x * u2y - u1y * u2x;
        const sweep = cross > 0 ? 1 : 0;
        parts.push(
          `<path d="M ${sx.toFixed(1)} ${sy.toFixed(1)} A ${ARC_R} ${ARC_R} 0 0 ${sweep} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${COLORS.red}" stroke-width="2"/>`,
        );
        if (val) {
          // 각 라벨 위치 — 좁은 각일수록 이등분선 따라 더 멀리(변과 겹침 방지).
          //   거리 d에서 각 변까지 여유 ≈ d·sin(반각) → d = clearance/sin(반각)로 일정 여유 확보.
          //   대변을 넘지 않게 캡. 그래도 너무 좁으면(여유<9px) 각 '바깥'(이등분선 반대편)으로 뺀다.
          const dot = Math.max(-1, Math.min(1, u1x * u2x + u1y * u2y));
          const half = Math.acos(dot) / 2; // 반각(rad)
          const sinH = Math.max(Math.sin(half), 0.12);
          const oppMid = midpoint(P((i + 1) % 3), P((i + 2) % 3));
          const depth = dist(P(i), oppMid);
          const labelDist = Math.min(Math.max(ARC_R + 12, 16 / sinH + 6), depth * 0.62);
          let lx = Vx + (bx / bl) * labelDist;
          let ly = Vy + (by / bl) * labelDist;
          if (labelDist * sinH < 9) {
            const out = ARC_R + 16;
            lx = Vx - (bx / bl) * out; // 각 바깥쪽
            ly = Vy - (by / bl) * out;
          }
          parts.push(katexLabel(lx, ly, val, { fontSize: 11 }));
        }
      }
    }
  }

  // 변 라벨
  if (params.sides) {
    for (const s of params.sides) {
      if (s.from == null || s.to == null || !s.label) continue;
      const [ax, ay] = pts[s.from];
      const [bx2, by2] = pts[s.to];
      const mx = (ax + bx2) / 2;
      const my = (ay + by2) / 2;
      const dx = mx - cx;
      const dy = my - cy;
      const d = Math.hypot(dx, dy) || 1;
      parts.push(katexLabel(mx + (dx / d) * 14, my + (dy / d) * 14, s.label, { fontSize: 12 }));
    }
  }

  // 변 합동 빗금(congruenceMarks: {from,to,ticks}) — 같은 변끼리 같은 개수의 빗금(이등변·합동 표시).
  //   변 중점 기준 변 수직 방향 짧은 선분 N개를 gap 간격으로 분산. (공유 TriangleParams 표준 필드)
  if (params.congruenceMarks) {
    for (const cm of params.congruenceMarks) {
      const { from, to, ticks } = cm;
      if (from == null || to == null || !ticks || ticks < 1) continue;
      const [ax, ay] = pts[from];
      const [bx2, by2] = pts[to];
      const mx = (ax + bx2) / 2;
      const my = (ay + by2) / 2;
      let dx = bx2 - ax;
      let dy = by2 - ay;
      const dl = Math.hypot(dx, dy) || 1;
      dx /= dl;
      dy /= dl;
      const nx = -dy;
      const ny = dx;
      const gap = 4.5;
      const half = 5;
      for (let k = 0; k < ticks; k++) {
        const off = (k - (ticks - 1) / 2) * gap;
        const px = mx + dx * off;
        const py = my + dy * off;
        parts.push(
          `<line x1="${(px - nx * half).toFixed(1)}" y1="${(py - ny * half).toFixed(1)}" x2="${(px + nx * half).toFixed(1)}" y2="${(py + ny * half).toFixed(1)}" stroke="${stroke}" stroke-width="1.8"/>`,
        );
      }
    }
  }

  // 평행 표시(parallelMarks: {from,to,arrows}) — 같은 화살표 개수 = 평행한 변.
  if (params.parallelMarks) {
    for (const pm of params.parallelMarks) {
      const { from, to, arrows } = pm;
      if (from == null || to == null || !arrows || arrows < 1) continue;
      const [ax, ay] = pts[from];
      const [bx2, by2] = pts[to];
      const mx = (ax + bx2) / 2;
      const my = (ay + by2) / 2;
      let dx = bx2 - ax;
      let dy = by2 - ay;
      const dl = Math.hypot(dx, dy) || 1;
      dx /= dl;
      dy /= dl;
      const gap = 4;
      const len = 5;
      for (let k = 0; k < arrows; k++) {
        const off = (k - (arrows - 1) / 2) * gap;
        const tx = mx + dx * off;
        const ty = my + dy * off;
        // 변 방향으로 향하는 화살촉(>)
        parts.push(
          `<path d="M ${(tx - dx * len + -dy * len).toFixed(1)} ${(ty - dy * len + dx * len).toFixed(1)} L ${tx.toFixed(1)} ${ty.toFixed(1)} L ${(tx - dx * len - -dy * len).toFixed(1)} ${(ty - dy * len - dx * len).toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="1.6"/>`,
        );
      }
    }
  }

  // 특수점(내심 I·외심 O·무게중심 G·수심 H) — 점 + 라벨 (+ 선택: 중심→꼭짓점 연결선·등길이 빗금)
  //   문자열 'incenter'(점만) 또는 객체 {type, connect:'vertices', ticks} 둘 다 허용.
  //   connect:'vertices'면 외심 반지름(OA·OB·OC)·내심 이등분선(IA·IB·IC) 세그먼트를 그린다.
  //   ticks:true면 세 연결선에 등길이 빗금 1개씩(외심: 세 반지름이 같음을 표시).
  const spMap: Record<string, { fn: () => Pt; label: string }> = {
    incenter: { fn: () => computeIncenter(P(0), P(1), P(2)), label: 'I' },
    circumcenter: { fn: () => computeCircumcenter(P(0), P(1), P(2)), label: 'O' },
    centroid: { fn: () => computeCentroid(P(0), P(1), P(2)), label: 'G' },
    orthocenter: { fn: () => computeOrthocenter(P(0), P(1), P(2)), label: 'H' },
  };
  const specialPoints = (params as {
    specialPoints?: (string | { type?: string; connect?: string; ticks?: boolean; label?: string })[];
  }).specialPoints;
  if (specialPoints) {
    for (const spRaw of specialPoints) {
      const sp = typeof spRaw === 'string' ? { type: spRaw } : spRaw;
      const info = sp.type ? spMap[sp.type] : undefined;
      if (!info) continue;
      const pt = info.fn();
      const lbl = sp.label || info.label;
      centerPts[lbl] = pt; // segmentLabels 참조용
      if (sp.connect === 'vertices') {
        for (let i = 0; i < 3; i++) {
          const v = P(i);
          parts.push(
            `<line x1="${pt.x.toFixed(1)}" y1="${pt.y.toFixed(1)}" x2="${v.x.toFixed(1)}" y2="${v.y.toFixed(1)}" stroke="${stroke}" stroke-width="1.2"/>`,
          );
          if (sp.ticks) {
            const mx = (pt.x + v.x) / 2;
            const my = (pt.y + v.y) / 2;
            let dx = v.x - pt.x;
            let dy = v.y - pt.y;
            const dl = Math.hypot(dx, dy) || 1;
            dx /= dl;
            dy /= dl;
            const nx = -dy;
            const ny = dx;
            const h = 5;
            parts.push(
              `<line x1="${(mx - nx * h).toFixed(1)}" y1="${(my - ny * h).toFixed(1)}" x2="${(mx + nx * h).toFixed(1)}" y2="${(my + ny * h).toFixed(1)}" stroke="${stroke}" stroke-width="1.8"/>`,
            );
          }
        }
      }
      parts.push(`<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="2.6" fill="${stroke}"/>`);
      parts.push(katexLabel(pt.x + 10, pt.y - 9, lbl, { fontSize: 12 }));
    }
  }

  // 체비안(cevians) — 한 꼭짓점에서 대변으로 그은 선 1개(median/altitude/bisector) + 교점 라벨(예: D).
  //   auxiliaryLines(3개 전부)와 달리 특정 1개만. altitude는 교점에 직각기호. (Lab 전용 확장 필드)
  const cevians = (params as { cevians?: { from: number; kind?: string; footLabel?: string }[] }).cevians;
  if (cevians) {
    for (const cv of cevians) {
      const i = cv.from;
      if (i == null || i < 0 || i > 2) continue;
      const v = P(i);
      const p1 = P((i + 1) % 3);
      const p2 = P((i + 2) % 3);
      const kind = cv.kind || 'median';
      let t: Pt;
      if (kind === 'altitude') t = footOfPerpendicular(v, p1, p2);
      else if (kind === 'bisector') {
        const d1 = dist(v, p1);
        const d2 = dist(v, p2);
        const r = d2 / (d1 + d2 || 1);
        t = { x: p1.x + r * (p2.x - p1.x), y: p1.y + r * (p2.y - p1.y) };
      } else t = midpoint(p1, p2);
      if (cv.footLabel) cevianFeet[cv.footLabel] = t; // segmentLabels 참조용(예: 'D')
      parts.push(
        `<line x1="${v.x.toFixed(1)}" y1="${v.y.toFixed(1)}" x2="${t.x.toFixed(1)}" y2="${t.y.toFixed(1)}" stroke="${stroke}" stroke-width="1.5"/>`,
      );
      if (kind === 'altitude') parts.push(renderRightAngleMark(t.x, t.y, v.x, v.y, p1.x, p1.y, 9));
      if (cv.footLabel) {
        // 교점 라벨은 삼각형 안쪽(중심 방향)으로 — 변 길이 라벨(바깥)과 겹치지 않게.
        const dx = cx - t.x;
        const dy = cy - t.y;
        const d = Math.hypot(dx, dy) || 1;
        parts.push(katexLabel(t.x + (dx / d) * 14, t.y + (dy / d) * 14, cv.footLabel, { fontSize: 12 }));
      }
    }
  }

  // 구간 라벨(segmentLabels) — 점 사이 선분에 라벨(중선 분할 AG·GD, BD, 반지름 등).
  //   from/to = 점 참조: 숫자(0~2 꼭짓점) | 'G'/'I'/'O'/'H'(특수점) | 체비안 footLabel(예 'D').
  //   라벨은 선분 중점에서 도형 중심 반대 방향으로 수직 오프셋(선 위 겹침 방지·바깥 배치).
  //   ⚠️ 위치정보 없는 레거시 형식(`{label}`만)은 from/to 미해석 → 스킵(본문만). 워크플로는 {from,to,label} 형식으로.
  const segmentLabels = (params as {
    segmentLabels?: { from?: unknown; to?: unknown; label?: string; offset?: number }[];
  }).segmentLabels;
  if (segmentLabels) {
    const resolveRef = (ref: unknown): Pt | null => {
      if (typeof ref === 'number' && ref >= 0 && ref <= 2) return P(ref);
      if (typeof ref === 'string') {
        if (/^[0-2]$/.test(ref)) return P(parseInt(ref, 10));
        if (centerPts[ref]) return centerPts[ref];
        if (cevianFeet[ref]) return cevianFeet[ref];
      }
      return null;
    };
    for (const sl of segmentLabels) {
      if (!sl.label) continue;
      const a = resolveRef(sl.from);
      const b = resolveRef(sl.to);
      if (!a || !b) continue; // 참조 해석 실패 → 스킵
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dl = Math.hypot(dx, dy) || 1;
      dx /= dl;
      dy /= dl;
      let nx = -dy;
      let ny = dx;
      // 도형 중심에서 먼 쪽으로 수직 오프셋(선 위 겹침 방지)
      if ((mx + nx - cx) ** 2 + (my + ny - cy) ** 2 < (mx - nx - cx) ** 2 + (my - ny - cy) ** 2) {
        nx = -nx;
        ny = -ny;
      }
      // 텍스트 폭이 높이보다 커 거의 수직인 선분(중선 등)에선 더 밀어야 안 겹침 → 수평성분 비례 가중.
      const off = sl.offset ?? 13 + Math.abs(nx) * 6;
      parts.push(katexLabel(mx + nx * off, my + ny * off, sl.label, { fontSize: 11 }));
    }
  }

  return svgWrap(parts.join('\n    '), W, H);
}
