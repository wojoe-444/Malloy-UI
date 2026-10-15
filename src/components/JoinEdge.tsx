import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import type { Edge, EdgeProps } from '@xyflow/react';

export type JoinFlowEdge = Edge<{ label: string; index: number }, 'join'>;

export function JoinEdge(props: EdgeProps<JoinFlowEdge>) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected, markerEnd, id } = props;
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  // Several joins between the same two tables share a path, so stagger their labels.
  const dy = (data?.index ?? 0) * 24;
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} className={selected ? 'join-edge selected' : 'join-edge'} interactionWidth={24} />
      <EdgeLabelRenderer>
        <div
          className={`join-label${selected ? ' selected' : ''}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + dy}px)` }}
        >
          {data?.label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
