# Malloy UI

A visual editor for [Malloy](https://www.malloydata.dev/) models. Lay tables out on a canvas, drag lines between them to create joins, define fields in the left-hand panel, and get valid Malloy source on the right.

## Run it

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # generator tests, including compiling output with the real Malloy compiler
npm run build
```

## How to use it

- **Add a table**: toolbar button, or double-click empty canvas. Select it to edit the source name, connection, table path, primary key and optional `where:` filter.
- **Join tables**: drag from the dot on the right of one table to the dot on the left of another. `A → B` means `A` declares `join_one: B …`. Click the line to change it to `join_many` / `join_cross`, name it (needed to join the same table twice), and choose `with <primary key>` or a custom `on` condition.
- **Define fields**: with a table selected, add dimensions (`name is expression`), measures (`count()`, `avg(x)`) and views (`group_by` / `aggregate` / `limit`).
- **Export**: copy the generated Malloy or download `model.malloy`. *Save project* / *Open project* round-trip the canvas as JSON; the current model is also kept in your browser's local storage.
- Problems (missing primary key for a `with` join, join cycles, duplicate names, …) are listed under the code; click one to jump to it.

## How it works

| File | Role |
| --- | --- |
| `src/lib/types.ts` | The model: tables (sources) and joins |
| `src/lib/malloy.ts` | Model → Malloy generator and validation. Sources are ordered so joined sources are defined first |
| `src/lib/store.ts` | Zustand store, persisted to local storage |
| `src/components/` | React Flow canvas, side panel, code panel |

Stack: React, TypeScript, Vite, [React Flow](https://reactflow.dev/) (`@xyflow/react`), Zustand, Vitest.

## Not yet supported

Importing existing `.malloy` files, reading column lists from a live database, `extend`ing one source from another, SQL-based sources, and `run:` queries.
