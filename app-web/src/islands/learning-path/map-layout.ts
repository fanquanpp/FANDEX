import type { StageVM } from './types';

export const LAYOUT = {
  rootWidth: 176,
  rootHeight: 56,
  nodeWidth: 244,
  nodeHeight: 64,
  nodeGap: 18,
  headerHeight: 56,
  stageGap: 56,
  rootGap: 48,
  padding: 28,
} as const;

export interface PlacedNode {
  id: string;
  x: number;
  y: number;
  stageId: string;
}

export interface PlacedStage {
  id: string;
  x: number;
  y: number;
  height: number;
  nodes: PlacedNode[];
}

export interface LayoutEdge {
  from: { x: number; y: number };
  to: { x: number; y: number };
  stageId: string;
  kind: 'root-stage' | 'stage-node' | 'node-node';
}

export interface MapLayout {
  width: number;
  height: number;
  root: { x: number; y: number; width: number; height: number };
  stages: PlacedStage[];
  edges: LayoutEdge[];
}

function layoutStageNodes(
  nodes: StageVM['nodes'],
  x: number,
  y: number,
): PlacedNode[] {
  return nodes.map((node, index) => ({
    id: node.id,
    x,
    y: y + index * (LAYOUT.nodeHeight + LAYOUT.nodeGap),
    stageId: node.stageId,
  }));
}

export function computeMapLayout(
  stages: StageVM[],
  collapsedStageIds: ReadonlySet<string>,
): MapLayout {
  const { padding, rootWidth, rootGap, stageGap, nodeWidth, headerHeight } = LAYOUT;

  const rootY = padding;

  const placedStages: PlacedStage[] = [];
  const edges: LayoutEdge[] = [];

  stages.forEach((stage, index) => {
    const x = padding + rootWidth + rootGap + index * (nodeWidth + stageGap);
    const visibleNodes = collapsedStageIds.has(stage.id) ? [] : stage.nodes;
    const nodes = layoutStageNodes(visibleNodes, x, padding + headerHeight + 14);
    const height =
      headerHeight +
      (nodes.length > 0
        ? 14 + nodes.length * LAYOUT.nodeHeight + (nodes.length - 1) * LAYOUT.nodeGap
        : 0);

    placedStages.push({ id: stage.id, x, y: padding, height, nodes });

    const rootRight = padding + rootWidth;
    const rootCenterY = rootY + LAYOUT.rootHeight / 2;
    edges.push({
      from: { x: rootRight, y: rootCenterY },
      to: { x, y: padding + headerHeight / 2 },
      stageId: stage.id,
      kind: 'root-stage',
    });

    const headerBottom = padding + headerHeight;
    const headerCenterX = x + nodeWidth / 2;
    nodes.forEach((node, nodeIndex) => {
      const prevNode = nodeIndex === 0 ? undefined : nodes[nodeIndex - 1];
      const fromY =
        nodeIndex === 0 || !prevNode
          ? headerBottom
          : prevNode.y + LAYOUT.nodeHeight;
      edges.push({
        from: { x: headerCenterX, y: fromY },
        to: { x: headerCenterX, y: node.y },
        stageId: stage.id,
        kind: nodeIndex === 0 ? 'stage-node' : 'node-node',
      });
    });
  });

  const lastStage = placedStages[placedStages.length - 1];
  const width = lastStage
    ? lastStage.x + nodeWidth + padding
    : padding + rootWidth + padding;
  const maxHeight = placedStages.reduce((max, stage) => Math.max(max, stage.height), 0);
  const height = maxHeight + padding * 2;

  return {
    width,
    height,
    root: { x: padding, y: rootY, width: rootWidth, height: LAYOUT.rootHeight },
    stages: placedStages,
    edges,
  };
}

export function getNodeCenters(layout: MapLayout): Map<string, { x: number; y: number }> {
  const centers = new Map<string, { x: number; y: number }>();
  for (const stage of layout.stages) {
    for (const node of stage.nodes) {
      centers.set(node.id, {
        x: node.x + LAYOUT.nodeWidth / 2,
        y: node.y + LAYOUT.nodeHeight / 2,
      });
    }
  }
  return centers;
}

export function edgePath(edge: LayoutEdge): string {
  const { from, to } = edge;
  if (edge.kind === 'root-stage') {
    const dx = Math.max(24, Math.min(72, (to.x - from.x) / 2));
    return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
  }
  const dy = 14;
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + dy}, ${to.x} ${to.y - dy}, ${to.x} ${to.y}`;
}
