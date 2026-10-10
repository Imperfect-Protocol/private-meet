import { useEffect, useRef } from 'react';

export function DebugConsole({ lines, onClose }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'nearest' }); }, [lines.length]);
  return (
    <section className="panel fixed bottom-4 left-4 z-30 flex h-64 w-[min(38rem,calc(100vw-2rem))] flex-col" aria-label="Debug console">
      <header className="flex items-center justify-between border-b border-slate-700 px-4 py-2">
        <h2 className="text-sm font-bold">Debug console</h2>
        <button type="button" onClick={onClose} aria-label="Close debug console">✕</button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[11px]">
        {lines.map((entry, index) => (
          <p key={index} className="break-words"><span className="text-slate-500">{new Date(entry.at).toLocaleTimeString()} </span><span className="text-amber-300">[{entry.source}] </span>{entry.line}</p>
        ))}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
