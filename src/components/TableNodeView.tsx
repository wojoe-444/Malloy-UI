import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { useModel } from '../lib/store';

export type TableFlowNode = Node<Record<string, never>, 'table'>;

export function TableNodeView({ id, selected }: NodeProps<TableFlowNode>) {
  const table = useModel((s) => s.tables.find((t) => t.id === id));
  if (!table) return null;
  const rows = [
    ...table.dimensions.filter((f) => f.name).map((f) => ({ kind: 'dim', name: f.name })),
    ...table.measures.filter((f) => f.name).map((f) => ({ kind: 'measure', name: f.name })),
  ];
  return (
    <div className={`table-node${selected ? ' selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="handle" title="Drop a join here" />
      <div className="table-node__head">
        <strong>{table.name || 'unnamed'}</strong>
        <span className="muted">{table.connection}</span>
      </div>
      <div className="table-node__path muted" title={table.tablePath}>
        {table.tablePath || 'no table path'}
      </div>
      {table.primaryKey && (
        <div className="table-node__row">
          <span className="tag tag--pk">pk</span> {table.primaryKey}
        </div>
      )}
      {rows.slice(0, 8).map((r) => (
        <div className="table-node__row" key={r.kind + r.name}>
          <span className={`tag tag--${r.kind}`}>{r.kind === 'dim' ? 'dim' : 'm'}</span> {r.name}
        </div>
      ))}
      {rows.length > 8 && <div className="table-node__row muted">+{rows.length - 8} more</div>}
      <Handle type="source" position={Position.Right} className="handle" title="Drag to another table to join it" />
    </div>
  );
}
