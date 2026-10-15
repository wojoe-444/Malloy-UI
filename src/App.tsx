import { useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { CodePanel, download } from './components/CodePanel';
import { currentModel, parseModelJson, useModel } from './lib/store';
import { sampleModel } from './lib/sample';

function Toolbar() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { addTable, loadModel } = useModel.getState();

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      loadModel(parseModelJson(await file.text()));
    } catch (e) {
      alert(`Could not import: ${e instanceof Error ? e.message : e}`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <header className="toolbar">
      <h1>Malloy UI</h1>
      <button className="primary" onClick={() => addTable()}>+ Add table</button>
      <span className="spacer" />
      <button onClick={() => loadModel(sampleModel)}>Load sample</button>
      <button
        onClick={() => {
          if (confirm('Remove all tables and joins?')) loadModel({ tables: [], joins: [] });
        }}
      >
        Clear
      </button>
      <button onClick={() => download('malloy-ui-model.json', JSON.stringify(currentModel(), null, 2), 'application/json')}>
        Save project
      </button>
      <button onClick={() => fileRef.current?.click()}>Open project</button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
    </header>
  );
}

export function App() {
  return (
    <div className="app">
      <Toolbar />
      <main className="workspace">
        <Sidebar />
        <section className="canvas">
          <ReactFlowProvider>
            <Canvas />
          </ReactFlowProvider>
        </section>
        <CodePanel />
      </main>
    </div>
  );
}
