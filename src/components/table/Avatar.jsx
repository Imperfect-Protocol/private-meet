import { useEffect, useRef } from 'react';

function liveTracks(stream, kind) {
  return (stream?.getTracks() ?? []).filter((track) => track.kind === kind && track.readyState !== 'ended');
}

/** Round avatar showing the player's video when present; remote audio plays through a hidden element. */
export function Avatar({ name, stream, isMe, isActive, isWinner, onToggleVideo, videoOn }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const videoTracks = liveTracks(stream, 'video');
  const audioTracks = isMe ? [] : liveTracks(stream, 'audio');
  const hasVideo = videoTracks.length > 0;
  const initials = name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = hasVideo ? new MediaStream(videoTracks) : null;
  }, [stream, hasVideo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.srcObject = audioTracks.length > 0 ? new MediaStream(audioTracks) : null;
    if (audioTracks.length > 0) audioRef.current.play().catch(() => {});
  }, [stream, audioTracks.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const ring = isWinner
    ? 'border-yellow-300 shadow-[0_0_30px_rgba(250,204,21,0.8)]'
    : isActive
      ? 'border-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.6)]'
      : 'border-slate-500';

  return (
    <div className="relative">
      <div className={`relative grid h-28 w-28 place-items-center overflow-hidden rounded-full border-4 bg-slate-900 md:h-32 md:w-32 ${ring}`}>
        {hasVideo ? (
          <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 h-full w-full object-cover ${isMe ? '-scale-x-100' : ''}`} />
        ) : (
          <span className="text-3xl font-black text-white">{initials || '?'}</span>
        )}
      </div>
      {!isMe ? <audio ref={audioRef} autoPlay /> : null}
      {isMe && onToggleVideo ? (
        <button
          type="button"
          onClick={onToggleVideo}
          title={videoOn ? 'Turn camera off' : 'Turn camera on'}
          className={`absolute -right-1 bottom-1 grid h-9 w-9 place-items-center rounded-full border text-sm shadow-lg ${videoOn ? 'border-rose-300 bg-rose-500 text-white' : 'border-slate-500 bg-slate-800 text-slate-300'}`}
        >
          {videoOn ? '📷' : '🚫'}
        </button>
      ) : null}
    </div>
  );
}
