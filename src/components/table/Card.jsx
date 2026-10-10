const SUITS = { s: '♠', h: '♥', d: '♦', c: '♣' };

export function Card({ card, size = 'md' }) {
  const dims = size === 'lg' ? 'h-20 w-14 text-xl' : 'h-16 w-11 text-base';
  if (!card) {
    return (
      <div className={`${dims} rounded-md border-2 border-slate-200 bg-white p-0.5 shadow-lg`}>
        <div className="h-full w-full rounded-sm bg-[repeating-linear-gradient(45deg,#be123c_0_4px,#0f172a_4px_8px)]" />
      </div>
    );
  }
  const isRed = card[1] === 'h' || card[1] === 'd';
  return (
    <div className={`${dims} flex flex-col items-center justify-center rounded-md border-2 border-slate-300 bg-slate-50 font-black shadow-lg ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
      <span className="leading-none">{card[0] === 'T' ? '10' : card[0]}</span>
      <span className="text-2xl leading-none">{SUITS[card[1]]}</span>
    </div>
  );
}

export function EmptyCard() {
  return <div className="h-16 w-11 rounded-md border-2 border-dashed border-white/20" />;
}
