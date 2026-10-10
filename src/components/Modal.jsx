import { useEffect } from 'react';

export function Modal({ title, onClose, children, width = 'max-w-md' }) {
  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <section className={`panel w-full ${width} p-6`} onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          {onClose ? (
            <button className="text-slate-400 hover:text-white" type="button" onClick={onClose} aria-label="Close">✕</button>
          ) : null}
        </div>
        {children}
      </section>
    </div>
  );
}
