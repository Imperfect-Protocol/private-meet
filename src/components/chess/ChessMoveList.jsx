/** Played moves, numbered in pairs: White's move, then Black's. */
export function ChessMoveList(props) {
  if (props.moves.length === 0) return <p className="text-sm text-slate-500">No moves yet.</p>;
  const turns = Array.from({ length: Math.ceil(props.moves.length / 2) }, (_unused, index) => props.moves.slice(index * 2, index * 2 + 2));
  return (
    <ol className="max-h-72 space-y-1 overflow-y-auto font-mono text-sm text-slate-200">
      {turns.map((pair, index) => (
        <li key={index} className="grid grid-cols-[2.5rem_1fr_1fr]">
          <span className="text-slate-500">{index + 1}.</span>
          {pair.map((move, side) => (
            <span key={side}>{move.san}</span>
          ))}
        </li>
      ))}
    </ol>
  );
}
