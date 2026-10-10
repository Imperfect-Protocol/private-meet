import { useEffect, useRef, useState } from 'react';
import { MAX_CHAT_LENGTH } from '../../lib/meet/ChatLog.js';

export function ChatWindow({ chat, names, seat, connected, onSend, onClose }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'nearest' }); }, [chat.messages.length]);

  const submit = (event) => {
    event.preventDefault();
    if (onSend(text)) setText('');
  };

  return (
    <section className="panel fixed bottom-4 right-4 z-40 flex h-96 w-[min(24rem,calc(100vw-2rem))] flex-col" aria-label="Meeting chat">
      <header className="flex items-center justify-between border-b border-slate-700 p-4">
        <h2 className="font-bold text-white">Chat</h2>
        <button type="button" aria-label="Close chat" onClick={onClose}>✕</button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4" aria-live="polite">
        {!chat.messages.length ? <p className="text-sm text-slate-500">Say hello. Messages stay between the two of you.</p> : null}
        {chat.messages.map((message, index) => (
          <div key={index} className={`mb-3 max-w-[90%] rounded-xl p-3 text-sm ${message.seat === seat ? 'ml-auto bg-rose-500/20' : 'bg-slate-800'}`}>
            <p className="mb-1 text-[10px] text-slate-400">{names[message.seat]} · {new Date(message.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="flex gap-2 border-t border-slate-700 p-3" onSubmit={submit}>
        <input className="field" aria-label="Message" maxLength={MAX_CHAT_LENGTH} placeholder={connected ? 'Write a message…' : 'Peer disconnected'} disabled={!connected} value={text} onChange={(event) => setText(event.target.value)} />
        <button className="btn-primary" type="submit" disabled={!connected || !text.trim()}>Send</button>
      </form>
    </section>
  );
}
