import { Avatar } from './Avatar.jsx';
import { Card } from './Card.jsx';

export function Seat({ name, stack, bet, cards, isMe, isTurn, isDealer, isWinner, isFolded, stream, videoOn, onToggleVideo, top }) {
  const hand = (
    <div className={`flex gap-1 ${isFolded ? 'opacity-30' : ''}`}>
      {cards.map((card, index) => <Card key={index} card={card} size="lg" />)}
    </div>
  );
  const chips = (
    <div className="flex items-center gap-3">
      {bet > 0 ? <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-black text-slate-900 shadow">{bet}</span> : null}
      {isDealer ? <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-black text-slate-900 shadow">D</span> : null}
    </div>
  );

  return (
    <div className={`flex items-center gap-4 ${top ? 'flex-row' : 'flex-row-reverse'}`}>
      <div className="flex flex-col items-center gap-2">
        <Avatar name={name} stream={stream} isMe={isMe} isActive={isTurn} isWinner={isWinner} videoOn={videoOn} onToggleVideo={onToggleVideo} />
        <div className="rounded-lg bg-slate-950/80 px-3 py-1 text-center shadow">
          <p className="text-sm font-bold text-white">{name}{isMe ? ' (you)' : ''}</p>
          <p className="text-xs font-semibold text-amber-300">{stack} chips</p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        {top ? hand : chips}
        {top ? chips : hand}
      </div>
    </div>
  );
}
