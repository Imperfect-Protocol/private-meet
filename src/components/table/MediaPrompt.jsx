import { useState } from 'react';
import { Modal } from '../Modal.jsx';
import { MediaState } from '../../lib/meet/MediaSession.js';

export function MediaPrompt({ media, onConfirm }) {
  const [videoOn, setVideoOn] = useState(true);
  const starting = media.state === MediaState.Starting;
  return (
    <Modal title="You’re connected">
      <p className="text-sm text-slate-400">Turn on your microphone to talk. Your camera is optional. Your browser will ask for permission.</p>
      <div className="my-6 flex items-center justify-between">
        <span className="font-semibold">Video</span>
        <button
          className={`relative h-7 w-12 rounded-full transition ${videoOn ? 'bg-rose-500' : 'bg-slate-700'}`}
          role="switch"
          aria-checked={videoOn}
          aria-label="Enable video"
          type="button"
          onClick={() => setVideoOn(!videoOn)}
          disabled={starting}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${videoOn ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
      <p className="mb-4 text-sm text-slate-300">Audio is on throughout the call. Use headphones to avoid feedback.</p>
      {media.error ? <p className="mb-4 text-sm text-rose-300">{media.error} Allow microphone access, or turn video off if no camera is available, then retry.</p> : null}
      <button className="btn-primary w-full" type="button" disabled={starting} onClick={() => onConfirm(videoOn)}>{starting ? 'Starting microphone…' : 'OK'}</button>
    </Modal>
  );
}
