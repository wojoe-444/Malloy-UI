import { useCallback, useEffect, useMemo } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import type { Connection, Node, OnNodesDelete, OnEdgesDelete } from '@xyflow/react';
import { useModel } from '../lib/store';
import { joinName } from '../lib/malloy';
import { TableNodeView } from './TableNodeView';
import type { TableFlowNode } from './TableNodeView';
import { JoinEdge } from './JoinEdge';
import type { JoinFlowEdge } from './JoinEdge';

const nodeTypes = { table: TableNodeView };
const edgeTypes = { join: JoinEdge };

export function Canvas() {
  const tables = useModel((s) => s.tables);
  const joins = useModel((s) => s.joins);
  const selection = useModel((s) => s.selection);
  const { select, addJoin, updateTable, removeTable, removeJoin } = useModel.getState();
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<TableFlowNode>([]);

  // Keep React Flow's node list (which owns measured sizes + live drag positions) in step with the model.
  const tableKey = tables.map((t) => t.id).join('|');
  const selectedTable = selection?.type === 'table' ? selection.id : null;
  useEffect(() => {
    const current = useModel.getState().tables;
    setNodes((prev) =>
      current.map((t) => {
        const old = prev.find((n) => n.id === t.id);
        return {
          ...old,
          id: t.id,
          type: 'table',
          position: old?.position ?? t.position,
          data: {},
          selected: t.id === selectedTable,
        } as TableFlowNode;
      }),
    );
  }, [tableKey, selectedTable, setNodes]);

  const edges = useMemo<JoinFlowEdge[]>(() => {
    const model = { tables, joins };
    const seen = new Map<string, number>();
    return joins.map((j) => {
      const pair = `${j.from}>${j.to}`;
      const index = seen.get(pair) ?? 0;
      seen.set(pair, index + 1);
      const how = j.kind === 'cross' ? '' : j.mode === 'with' ? ` with ${j.withKey || '?'}` : ' on …';
      const name = joinName(j, model);
      return {
        id: j.id,
        type: 'join',
        source: j.from,
        target: j.to,
        selected: selection?.type === 'join' && selection.id === j.id,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: { label: `join_${j.kind}: ${name}${how}`, index },
      };
    });
  }, [tables, joins, selection]);

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source && c.target) addJoin(c.source, c.target);
    },
    [addJoin],
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => updateTable(node.id, { position: node.position }),
    [updateTable],
  );
  const onNodesDelete: OnNodesDelete = useCallback((deleted) => deleted.forEach((n) => removeTable(n.id)), [removeTable]);
  const onEdgesDelete: OnEdgesDelete = useCallback((deleted) => deleted.forEach((e) => removeJoin(e.id)), [removeJoin]);

  // Double-click empty canvas to add a table at that spot.
  const onPaneDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      useModel.getState().addTable(screenToFlowPosition({ x: e.clientX, y: e.clientY }));
    },
    [screenToFlowPosition],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onConnect={onConnect}
      onNodeDragStop={onNodeDragStop}
      onNodesDelete={onNodesDelete}
      onEdgesDelete={onEdgesDelete}
      onNodeClick={(_, n) => select({ type: 'table', id: n.id })}
      onEdgeClick={(_, e) => select({ type: 'join', id: e.id })}
      onPaneClick={() => select(null)}
      isValidConnection={(c) => !!c.source && !!c.target && c.source !== c.target}
      zoomOnDoubleClick={false}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).classList.contains('react-flow__pane')) onPaneDoubleClick(e);
      }}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      deleteKeyCode={['Backspace', 'Delete']}
    >
      <Background gap={20} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable />
    </ReactFlow>
  );
}
