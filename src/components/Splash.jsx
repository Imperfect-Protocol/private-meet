export function Splash({ label }) {
  return (
    <main className="grid min-h-screen place-items-center">
      <p className="animate-pulse text-sm uppercase tracking-[0.3em] text-slate-400">{label}…</p>
    </main>
  );
}

export function Brand() {
  return (
    <span className="flex items-center gap-2 font-black tracking-tight text-white">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-amber-400 text-sm text-slate-950">♠</span>
      Private Meet
    </span>
  );
}
