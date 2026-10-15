import { useMemo, useState } from 'react';
import { useModel } from '../lib/store';
import { generateMalloy, validateModel } from '../lib/malloy';
import { highlight } from '../lib/highlight';

export function download(filename: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CodePanel() {
  const tables = useModel((s) => s.tables);
  const joins = useModel((s) => s.joins);
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => generateMalloy({ tables, joins }), [tables, joins]);
  const diagnostics = useMemo(() => validateModel({ tables, joins }), [tables, joins]);
  const { select } = useModel.getState();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable; the code is selectable on screen */
    }
  };

  return (
    <aside className="panel panel--right">
      <div className="panel__title panel__title--bar">
        <h2>Malloy</h2>
        <div className="actions">
          <button onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          <button className="primary" onClick={() => download('model.malloy', code)}>Download .malloy</button>
        </div>
      </div>
      <pre className="code" aria-label="Generated Malloy">{highlight(code)}</pre>
      {diagnostics.length > 0 && (
        <div className="diagnostics">
          <h3>{diagnostics.length} issue{diagnostics.length > 1 ? 's' : ''}</h3>
          <ul>
            {diagnostics.map((d, i) => (
              <li key={i} className={`diag diag--${d.severity}`}>
                <button
                  className="link"
                  onClick={() =>
                    d.joinId
                      ? select({ type: 'join', id: d.joinId })
                      : d.tableId && select({ type: 'table', id: d.tableId })
                  }
                >
                  {d.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
