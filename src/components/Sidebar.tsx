import { useModel } from '../lib/store';
import type { FieldKind } from '../lib/store';
import { joinName } from '../lib/malloy';
import type { Join, JoinKind, TableNode, View } from '../lib/types';

const CONNECTIONS = ['duckdb', 'bigquery', 'postgres', 'snowflake', 'mysql', 'trino', 'presto'];

function Labeled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint muted">{hint}</span>}
    </label>
  );
}

export function Sidebar() {
  const selection = useModel((s) => s.selection);
  const tables = useModel((s) => s.tables);
  const joins = useModel((s) => s.joins);
  const { select, addTable } = useModel.getState();

  const table = selection?.type === 'table' ? tables.find((t) => t.id === selection.id) : undefined;
  const join = selection?.type === 'join' ? joins.find((j) => j.id === selection.id) : undefined;

  return (
    <aside className="panel panel--left">
      {table ? (
        <TableEditor table={table} />
      ) : join ? (
        <JoinEditor join={join} />
      ) : (
        <div className="panel__body">
          <h2>Tables</h2>
          <p className="muted">
            Select a table to edit its fields, or drag from the dot on the right of one table to the dot on the left of
            another to create a join. Double-click the canvas to add a table.
          </p>
          <ul className="list">
            {tables.map((t) => (
              <li key={t.id}>
                <button className="link" onClick={() => select({ type: 'table', id: t.id })}>
                  {t.name || 'unnamed'}
                </button>
                <span className="muted"> · {t.dimensions.length} dim · {t.measures.length} measure</span>
              </li>
            ))}
          </ul>
          <button onClick={() => addTable()}>+ Add table</button>
        </div>
      )}
    </aside>
  );
}

function TableEditor({ table }: { table: TableNode }) {
  const { updateTable, removeTable, addField, updateField, removeField, addView, select } = useModel.getState();
  const joins = useModel((s) => s.joins);
  const tables = useModel((s) => s.tables);
  const outgoing = joins.filter((j) => j.from === table.id);
  const fieldNames = [...table.dimensions, ...table.measures].map((f) => f.name).filter(Boolean);

  return (
    <div className="panel__body">
      <div className="panel__title">
        <h2>Source</h2>
        <button className="danger" onClick={() => removeTable(table.id)}>Delete table</button>
      </div>
      <Labeled label="Source name">
        <input value={table.name} onChange={(e) => updateTable(table.id, { name: e.target.value })} />
      </Labeled>
      <div className="row">
        <Labeled label="Connection">
          <input
            list="connections"
            value={table.connection}
            onChange={(e) => updateTable(table.id, { connection: e.target.value })}
          />
          <datalist id="connections">
            {CONNECTIONS.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Labeled>
        <Labeled label="Primary key">
          <input
            value={table.primaryKey}
            placeholder="id"
            onChange={(e) => updateTable(table.id, { primaryKey: e.target.value })}
          />
        </Labeled>
      </div>
      <Labeled label="Table path" hint="Passed to connection.table('…'), e.g. data/flights.parquet or project.dataset.table">
        <input value={table.tablePath} onChange={(e) => updateTable(table.id, { tablePath: e.target.value })} />
      </Labeled>
      <Labeled label="Filter (optional)" hint="Source-level where:, e.g. dep_time > @2020">
        <input value={table.where} onChange={(e) => updateTable(table.id, { where: e.target.value })} />
      </Labeled>

      <h3>Joins from this source</h3>
      {outgoing.length === 0 && <p className="muted">Drag from this table's right dot to another table to add one.</p>}
      <ul className="list">
        {outgoing.map((j) => (
          <li key={j.id}>
            <button className="link" onClick={() => select({ type: 'join', id: j.id })}>
              join_{j.kind}: {joinName(j, { tables, joins })}
            </button>
          </li>
        ))}
      </ul>

      {(['dimensions', 'measures'] as FieldKind[]).map((kind) => (
        <section key={kind}>
          <div className="panel__title">
            <h3>{kind === 'dimensions' ? 'Dimensions' : 'Measures'}</h3>
            <button onClick={() => addField(table.id, kind)}>+ Add</button>
          </div>
          {table[kind].length === 0 && (
            <p className="muted">
              {kind === 'dimensions' ? 'Computed columns, e.g. dep_delay > 15' : 'Aggregates, e.g. count() or avg(dep_delay)'}
            </p>
          )}
          {table[kind].map((f) => (
            <div className="fieldrow" key={f.id}>
              <input
                className="fieldrow__name"
                placeholder="name"
                value={f.name}
                onChange={(e) => updateField(table.id, kind, f.id, { name: e.target.value })}
              />
              <span className="muted">is</span>
              <input
                className="fieldrow__expr mono"
                placeholder={kind === 'dimensions' ? 'expression' : 'count()'}
                value={f.expr}
                onChange={(e) => updateField(table.id, kind, f.id, { expr: e.target.value })}
              />
              <button className="icon" title="Remove" onClick={() => removeField(table.id, kind, f.id)}>×</button>
            </div>
          ))}
        </section>
      ))}

      <div className="panel__title">
        <h3>Views</h3>
        <button onClick={() => addView(table.id)}>+ Add</button>
      </div>
      {table.views.map((v) => (
        <ViewEditor key={v.id} tableId={table.id} view={v} fieldNames={fieldNames} />
      ))}
    </div>
  );
}

const lines = (text: string) => text.split('\n');

function ViewEditor({ tableId, view, fieldNames }: { tableId: string; view: View; fieldNames: string[] }) {
  const { updateView, removeView } = useModel.getState();
  return (
    <div className="card">
      <div className="fieldrow">
        <input
          className="fieldrow__name"
          placeholder="view name"
          value={view.name}
          onChange={(e) => updateView(tableId, view.id, { name: e.target.value })}
        />
        <input
          className="fieldrow__limit"
          type="number"
          min={0}
          placeholder="limit"
          value={view.limit ?? ''}
          onChange={(e) => updateView(tableId, view.id, { limit: e.target.value ? Number(e.target.value) : undefined })}
        />
        <button className="icon" title="Remove view" onClick={() => removeView(tableId, view.id)}>×</button>
      </div>
      <Labeled label="group_by" hint={fieldNames.length ? `Fields here: ${fieldNames.join(', ')}` : 'One per line'}>
        <textarea
          className="mono"
          rows={2}
          value={view.groupBy.join('\n')}
          onChange={(e) => updateView(tableId, view.id, { groupBy: lines(e.target.value) })}
        />
      </Labeled>
      <Labeled label="aggregate" hint="One per line">
        <textarea
          className="mono"
          rows={2}
          value={view.aggregate.join('\n')}
          onChange={(e) => updateView(tableId, view.id, { aggregate: lines(e.target.value) })}
        />
      </Labeled>
    </div>
  );
}

function JoinEditor({ join }: { join: Join }) {
  const { updateJoin, removeJoin, select } = useModel.getState();
  const tables = useModel((s) => s.tables);
  const from = tables.find((t) => t.id === join.from);
  const to = tables.find((t) => t.id === join.to);
  if (!from || !to) return null;
  const alias = join.alias.trim() || to.name;

  return (
    <div className="panel__body">
      <div className="panel__title">
        <h2>Join</h2>
        <button className="danger" onClick={() => removeJoin(join.id)}>Delete join</button>
      </div>
      <p>
        <button className="link" onClick={() => select({ type: 'table', id: from.id })}>{from.name}</button>
        {' → '}
        <button className="link" onClick={() => select({ type: 'table', id: to.id })}>{to.name}</button>
      </p>
      <Labeled label="Relationship">
        <select value={join.kind} onChange={(e) => updateJoin(join.id, { kind: e.target.value as JoinKind })}>
          <option value="one">join_one — each row matches at most one row</option>
          <option value="many">join_many — each row can match many rows</option>
          <option value="cross">join_cross — every combination</option>
        </select>
      </Labeled>
      <Labeled label="Name (optional)" hint="Needed when the same table is joined twice, e.g. origin_airport">
        <input value={join.alias} placeholder={to.name} onChange={(e) => updateJoin(join.id, { alias: e.target.value })} />
      </Labeled>
      {join.kind !== 'cross' && (
        <>
          <Labeled label="Join using">
            <select value={join.mode} onChange={(e) => updateJoin(join.id, { mode: e.target.value as Join['mode'] })}>
              <option value="with" disabled={!to.primaryKey.trim()}>
                with — {to.name}'s primary key{to.primaryKey ? ` (${to.primaryKey})` : ' (not set)'}
              </option>
              <option value="on">on — a custom condition</option>
            </select>
          </Labeled>
          {join.mode === 'with' ? (
            <Labeled label={`${from.name} field`} hint={`Matched against ${to.name}.${to.primaryKey || 'primary key'}`}>
              <input className="mono" value={join.withKey} placeholder="carrier" onChange={(e) => updateJoin(join.id, { withKey: e.target.value })} />
            </Labeled>
          ) : (
            <Labeled label="Condition" hint={`Reference the joined table as ${alias}, e.g. ${alias}.code = carrier`}>
              <input className="mono" value={join.onCondition} placeholder={`${alias}.code = carrier`} onChange={(e) => updateJoin(join.id, { onCondition: e.target.value })} />
            </Labeled>
          )}
        </>
      )}
      {join.kind === 'cross' && (
        <Labeled label="Condition (optional)">
          <input className="mono" value={join.onCondition} onChange={(e) => updateJoin(join.id, { onCondition: e.target.value })} />
        </Labeled>
      )}
    </div>
  );
}
