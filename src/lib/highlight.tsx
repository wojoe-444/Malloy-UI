import type { ReactNode } from 'react';

const KEYWORDS = new Set(
  'source is extend primary_key where join_one join_many join_cross with on dimension measure view group_by aggregate limit run query order_by select nest having'.split(
    ' ',
  ),
);

const TOKEN = /(\/\/[^\n]*)|('(?:[^'\\]|\\.)*')|(`(?:[^`\\]|\\.)*`)|\b([A-Za-z_][A-Za-z0-9_]*)(:?)|(\d+(?:\.\d+)?)/g;

/** Tiny Malloy highlighter: comments, strings, keywords, numbers. */
export function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of code.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(code.slice(last, at));
    const [text, comment, string, quoted, word, colon, num] = m;
    if (comment) out.push(<span key={key++} className="tok-comment">{text}</span>);
    else if (string || quoted) out.push(<span key={key++} className="tok-string">{text}</span>);
    else if (word && KEYWORDS.has(word)) {
      out.push(<span key={key++} className="tok-keyword">{word}</span>);
      if (colon) out.push(colon);
    } else if (num) out.push(<span key={key++} className="tok-number">{text}</span>);
    else out.push(text);
    last = at + text.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}
