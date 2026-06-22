// 🚧 Lab 토대4 — 삼각형 렌더러 (각을 호/직각 기호로 표시)
//   공유 svg-diagrams의 renderTriangle은 각을 텍스트로만 찍는다(호·직각 기호 없음).
//   격리 규칙(CLAUDE.md): 공유 유틸 수정 금지 → Lab-local 복제로 각 표현을 보강.
//   공유 svg-utils 헬퍼(svgWrap·katexLabel·renderRightAngleMark·COLORS)는 읽기전용 재사용.
//
//   각 처리:
//     - 90°(라벨 "90°" 또는 기하적 직각) → 직각 기호(⌐, renderRightAngleMark)
//     - 그 외 → 꼭짓점에 호(arc) + 각 값 라벨(호 바깥 이등분선상)
import { svgWrap, katexLabel, renderRightAngleMark, COLORS } from '@/lib/utils/svg-diagrams/shared/svg-utils';
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
  const angles = params.angles;
  if (!angles || angles.length < 2) return null;
  const ang: number[] = [NaN, NaN, NaN];
  for (const a of angles) {
    if (a.vertex < 0 || a.vertex > 2) continue;
    const n = parseFloat(String(a.value ?? '').replace(/[^0-9.]/g, ''));
    ang[a.vertex] = Number.isFinite(n) ? n : NaN;
  }
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
  const stroke = params.strokeColor || COLORS.primary;
  const parts: string[] = [];

  // 면 + 변
  const ptsStr = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  parts.push(
    `<polygon points="${ptsStr}" fill="#EFF6FF" fill-opacity="0.35" stroke="${stroke}" stroke-width="2"/>`,
  );

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
          parts.push(
            katexLabel(Vx + (bx / bl) * (ARC_R + 14), Vy + (by / bl) * (ARC_R + 14), val, { fontSize: 11 }),
          );
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

  return svgWrap(parts.join('\n    '), W, H);
}
