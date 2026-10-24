export function Splash({ label }) {
  return (
    <main className="grid min-h-screen place-items-center">
      <p className="animate-pulse text-sm uppercase tracking-[0.3em] text-slate-400">{label}…</p>
    </main>
  );
}
