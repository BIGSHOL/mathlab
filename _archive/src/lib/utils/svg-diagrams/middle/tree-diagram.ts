import { TreeDiagramParams, TreeNode } from '../types';
import { svgWrap, line, text, katexLabel, TEXTBOOK_STYLE } from '../shared/svg-utils';

interface LayoutNode {
  label: string;
  probability?: string;
  x: number;
  y: number;
  children: LayoutNode[];
}

/** 트리 레이아웃 계산 (재귀) */
function layoutTree(
  node: TreeNode,
  depth: number,
  leafIndex: { val: number },
  horizontal: boolean,
  stepX: number,
  stepY: number
): LayoutNode {
  const children: LayoutNode[] = [];
  const childNodes = Array.isArray(node.children) ? node.children : [];

  if (childNodes.length === 0) {
    // 리프 노드
    const idx = leafIndex.val++;
    return {
      label: node.label || '',
      probability: node.probability,
      x: horizontal ? depth * stepX : idx * stepX,
      y: horizontal ? idx * stepY : depth * stepY,
      children: [],
    };
  }

  for (const child of childNodes) {
    children.push(layoutTree(child, depth + 1, leafIndex, horizontal, stepX, stepY));
  }

  // 부모 위치: 자식들의 중간
  const avgPos = horizontal
    ? children.reduce((s, c) => s + c.y, 0) / children.length
    : children.reduce((s, c) => s + c.x, 0) / children.length;

  return {
    label: node.label || '',
    probability: node.probability,
    x: horizontal ? depth * stepX : avgPos,
    y: horizontal ? avgPos : depth * stepY,
    children,
  };
}

/** 트리의 리프 수 세기 */
function countLeaves(node: TreeNode): number {
  const children = Array.isArray(node.children) ? node.children : [];
  if (children.length === 0) return 1;
  return children.reduce((s, c) => s + countLeaves(c), 0);
}

/** 트리 깊이 */
function treeDepth(node: TreeNode): number {
  const children = Array.isArray(node.children) ? node.children : [];
  if (children.length === 0) return 0;
  return 1 + Math.max(...children.map(treeDepth));
}

/** 수형도 SVG 생성 (중2) */
export function renderTreeDiagram(params: TreeDiagramParams): string {
  const root = params.root || { label: '시작' };
  const horizontal = (params.orientation || 'horizontal') === 'horizontal';
  const title = params.title;

  const leaves = countLeaves(root);
  const _depth = treeDepth(root);
  const stepX = horizontal ? 90 : Math.max(50, Math.min(80, 400 / Math.max(leaves, 1)));
  const stepY = horizontal ? Math.max(30, Math.min(50, 300 / Math.max(leaves, 1))) : 60;

  const pad = 30;
  const titleH = title ? 24 : 0;
  const leafIndex = { val: 0 };
  const layoutRoot = layoutTree(root, 0, leafIndex, horizontal, stepX, stepY);

  // 바운딩 박스 계산
  let maxX = 0, maxY = 0;
  function traverse(n: LayoutNode) {
    maxX = Math.max(maxX, n.x);
    maxY = Math.max(maxY, n.y);
    n.children.forEach(traverse);
  }
  traverse(layoutRoot);

  const totalW = maxX + pad * 2;
  const totalH = maxY + pad * 2 + titleH;

  const parts: string[] = [];

  // 제목
  if (title) {
    parts.push(text(totalW / 2, 12, title, { fontSize: 13, fontWeight: 'bold' }));
  }

  // 노드 & 엣지 렌더링
  function renderNode(n: LayoutNode) {
    const nx = pad + n.x;
    const ny = pad + n.y + titleH;

    // 자식 연결선
    for (const child of n.children) {
      const cx = pad + child.x;
      const cy = pad + child.y + titleH;
      parts.push(line(nx, ny, cx, cy, { stroke: TEXTBOOK_STYLE.MAIN_STROKE, strokeWidth: 1.2 }));

      // 확률 라벨 (분기선 중간)
      if (child.probability) {
        const mx = (nx + cx) / 2;
        const my = (ny + cy) / 2;
        const offsetX = horizontal ? 0 : -8;
        const offsetY = horizontal ? -8 : 0;
        parts.push(katexLabel(mx + offsetX, my + offsetY, child.probability, { fontSize: 10 }));
      }
    }

    // 노드 라벨
    if (n.label) {
      // 배경 (가독성)
      const bgW = Math.max(20, n.label.length * 8 + 10);
      parts.push(`<rect x="${nx - bgW / 2}" y="${ny - 10}" width="${bgW}" height="20" rx="3" fill="white" stroke="#DDD" stroke-width="0.8"/>`);
      parts.push(text(nx, ny, n.label, { fontSize: 11, fill: TEXTBOOK_STYLE.LABEL_COLOR }));
    }

    n.children.forEach(renderNode);
  }
  renderNode(layoutRoot);

  return svgWrap(parts.join('\n    '), totalW, totalH);
}

