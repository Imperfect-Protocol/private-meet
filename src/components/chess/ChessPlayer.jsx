import { Avatar } from '../table/Avatar.jsx';

/** A player's video and name, with the color they play. */
export function ChessPlayer(props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar
        name={props.name}
        stream={props.stream}
        isMe={props.isMe}
        isActive={props.active}
        videoOn={props.videoOn}
        onToggleVideo={props.onToggleVideo}
      />
      <div className="text-center">
        <p className="text-sm font-bold text-white">{props.name}{props.isMe ? ' (you)' : ''}</p>
        <p className="text-xs text-slate-400">{props.white ? 'White' : 'Black'}</p>
      </div>
    </div>
  );
}
