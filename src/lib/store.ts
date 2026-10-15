import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Field, Join, Model, TableNode, View } from './types';
import { sampleModel } from './sample';

export type Selection = { type: 'table' | 'join'; id: string } | null;
export type FieldKind = 'dimensions' | 'measures';

export const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

interface State extends Model {
  selection: Selection;
  select: (s: Selection) => void;

  addTable: (position?: { x: number; y: number }) => string;
  updateTable: (id: string, patch: Partial<TableNode>) => void;
  removeTable: (id: string) => void;

  addField: (tableId: string, kind: FieldKind) => void;
  updateField: (tableId: string, kind: FieldKind, fieldId: string, patch: Partial<Field>) => void;
  removeField: (tableId: string, kind: FieldKind, fieldId: string) => void;

  addView: (tableId: string) => void;
  updateView: (tableId: string, viewId: string, patch: Partial<View>) => void;
  removeView: (tableId: string, viewId: string) => void;

  addJoin: (from: string, to: string) => string | null;
  updateJoin: (id: string, patch: Partial<Join>) => void;
  removeJoin: (id: string) => void;

  loadModel: (model: Model) => void;
}

const mapTable = (tables: TableNode[], id: string, fn: (t: TableNode) => TableNode) =>
  tables.map((t) => (t.id === id ? fn(t) : t));

export const useModel = create<State>()(
  persist(
    (set, get) => ({
      ...sampleModel,
      selection: null,
      select: (selection) => set({ selection }),

      addTable: (position) => {
        const id = uid('t');
        const taken = new Set(get().tables.map((t) => t.name));
        let n = get().tables.length + 1;
        while (taken.has(`table_${n}`)) n++;
        const count = get().tables.length;
        const table: TableNode = {
          id,
          name: `table_${n}`,
          connection: get().tables[0]?.connection ?? 'duckdb',
          tablePath: '',
          primaryKey: '',
          where: '',
          dimensions: [],
          measures: [{ id: uid('m'), name: 'row_count', expr: 'count()' }],
          views: [],
          position: position ?? { x: 40 + (count % 3) * 300, y: 40 + Math.floor(count / 3) * 220 },
        };
        set((s) => ({ tables: [...s.tables, table], selection: { type: 'table', id } }));
        return id;
      },
      updateTable: (id, patch) => set((s) => ({ tables: mapTable(s.tables, id, (t) => ({ ...t, ...patch })) })),
      removeTable: (id) =>
        set((s) => ({
          tables: s.tables.filter((t) => t.id !== id),
          joins: s.joins.filter((j) => j.from !== id && j.to !== id),
          selection: s.selection?.id === id ? null : s.selection,
        })),

      addField: (tableId, kind) =>
        set((s) => ({
          tables: mapTable(s.tables, tableId, (t) => ({
            ...t,
            [kind]: [...t[kind], { id: uid('f'), name: '', expr: '' }],
          })),
        })),
      updateField: (tableId, kind, fieldId, patch) =>
        set((s) => ({
          tables: mapTable(s.tables, tableId, (t) => ({
            ...t,
            [kind]: t[kind].map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
          })),
        })),
      removeField: (tableId, kind, fieldId) =>
        set((s) => ({
          tables: mapTable(s.tables, tableId, (t) => ({ ...t, [kind]: t[kind].filter((f) => f.id !== fieldId) })),
        })),

      addView: (tableId) =>
        set((s) => ({
          tables: mapTable(s.tables, tableId, (t) => ({
            ...t,
            views: [...t.views, { id: uid('v'), name: `view_${t.views.length + 1}`, groupBy: [], aggregate: [] }],
          })),
        })),
      updateView: (tableId, viewId, patch) =>
        set((s) => ({
          tables: mapTable(s.tables, tableId, (t) => ({
            ...t,
            views: t.views.map((v) => (v.id === viewId ? { ...v, ...patch } : v)),
          })),
        })),
      removeView: (tableId, viewId) =>
        set((s) => ({
          tables: mapTable(s.tables, tableId, (t) => ({ ...t, views: t.views.filter((v) => v.id !== viewId) })),
        })),

      addJoin: (from, to) => {
        if (from === to) return null; // a source can't join itself in Malloy
        const target = get().tables.find((t) => t.id === to);
        if (!target) return null;
        const hasPk = !!target.primaryKey.trim();
        const join: Join = {
          id: uid('j'),
          from,
          to,
          kind: 'one',
          mode: hasPk ? 'with' : 'on',
          // Foreign keys are often named after the target's primary key; a sensible starting guess.
          withKey: hasPk ? target.primaryKey : '',
          onCondition: '',
          alias: '',
        };
        set((s) => ({ joins: [...s.joins, join], selection: { type: 'join', id: join.id } }));
        return join.id;
      },
      updateJoin: (id, patch) => set((s) => ({ joins: s.joins.map((j) => (j.id === id ? { ...j, ...patch } : j)) })),
      removeJoin: (id) =>
        set((s) => ({
          joins: s.joins.filter((j) => j.id !== id),
          selection: s.selection?.id === id ? null : s.selection,
        })),

      loadModel: (model) => set({ tables: model.tables, joins: model.joins, selection: null }),
    }),
    {
      name: 'malloy-ui-model-v1',
      partialize: (s) => ({ tables: s.tables, joins: s.joins }),
    },
  ),
);

export function currentModel(): Model {
  const { tables, joins } = useModel.getState();
  return { tables, joins };
}

/** Parse and sanity-check a model exported by this app. */
export function parseModelJson(text: string): Model {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.tables) || !Array.isArray(data.joins)) {
    throw new Error('Not a Malloy UI model: expected "tables" and "joins" arrays.');
  }
  const ids = new Set<string>();
  for (const t of data.tables) {
    if (typeof t?.id !== 'string' || typeof t?.name !== 'string') throw new Error('Invalid table entry.');
    ids.add(t.id);
  }
  for (const j of data.joins) {
    if (!ids.has(j?.from) || !ids.has(j?.to)) throw new Error('A join refers to a table that does not exist.');
  }
  const tables: TableNode[] = data.tables.map((t: Partial<TableNode>, i: number) => ({
    connection: 'duckdb',
    tablePath: '',
    primaryKey: '',
    where: '',
    dimensions: [],
    measures: [],
    views: [],
    position: { x: 60 + i * 40, y: 60 + i * 40 },
    ...t,
  }));
  const joins: Join[] = data.joins.map((j: Partial<Join>) => ({
    kind: 'one',
    mode: 'on',
    withKey: '',
    onCondition: '',
    alias: '',
    ...j,
  }));
  return { tables, joins };
}
