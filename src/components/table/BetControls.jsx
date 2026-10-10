import { useState } from 'react';

export function BetControls({ options, onBet }) {
  const [requested, setRequested] = useState(40);
  if (!options) return <p className="text-center text-sm text-slate-400">Waiting for the other player…</p>;
  const raise = Math.min(options.chips, Math.max(options.minRaise, requested));

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button className="btn-ghost" type="button" onClick={() => onBet(0)}>{options.toCall ? 'Fold' : 'Check'}</button>
      {options.toCall > 0 ? <button className="btn-primary" type="button" onClick={() => onBet(options.toCall)}>Call {options.toCall}</button> : null}
      <label className="flex items-center gap-2 text-xs text-slate-400">
        Raise
        <input className="w-24 accent-rose-500" aria-label="Raise amount" type="range" min={options.minRaise} max={options.chips} step="1" value={raise} onChange={(event) => setRequested(Number(event.target.value))} />
      </label>
      <button className="btn-primary" type="button" onClick={() => onBet(raise)}>{options.toCall ? 'Raise' : 'Bet'} {raise}</button>
      <button className="btn-ghost border-amber-400/60 text-amber-200" type="button" onClick={() => onBet(options.chips)}>All in</button>
    </div>
  );
}
