import { edgePath, type LayoutEdge } from './map-layout';

interface Props {
  edge: LayoutEdge;
  color: string;
}

export default function MapEdge({ edge, color }: Props) {
  const isRootEdge = edge.kind === 'root-stage';
  const markerId = `lp-arrow-${edge.stageId}`;
  return (
    <path
      d={edgePath(edge)}
      className="lp-edge"
      stroke={isRootEdge ? color : undefined}
      markerEnd={isRootEdge ? `url(#${markerId})` : undefined}
    />
  );
}
