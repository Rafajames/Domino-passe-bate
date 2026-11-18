import { useEffect, useRef, useState } from 'react';
import { EMOJIS, QUICK_PHRASES } from '../../net/protocol';
import { useOnline } from '../../state/onlineStore';
import { Sheet } from './Sheet';

export function ChatSheet({ onClose }: { onClose: () => void }) {
  const chat = useOnline((s) => s.chat);
  const mySeat = useOnline((s) => s.mySeat);
  const { sendChat, markChatRead } = useOnline.getState();
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markChatRead();
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [chat.length, markChatRead]);

  return (
    <Sheet title="Conversa da mesa" onClose={onClose} side>
      <div className="chat">
        <div className="chat__list" role="log" aria-live="polite">
          {chat.length === 0 && <p className="muted">Nenhuma mensagem ainda.</p>}
          {chat.map((m) => (
            <p key={m.id} className={`chat__msg ${m.seat === mySeat ? 'is-mine' : ''} ${m.kind === 'emoji' ? 'is-emoji' : ''}`}>
              <strong>{m.name}</strong> {m.text}
            </p>
          ))}
          <div ref={endRef} />
        </div>
        <div className="chat__quick">
          {EMOJIS.map((e) => (
            <button key={e} className="chat__emoji" onClick={() => sendChat(e, 'emoji')} aria-label={`Enviar ${e}`}>
              {e}
            </button>
          ))}
        </div>
        <div className="chat__quick">
          {QUICK_PHRASES.map((q) => (
            <button key={q} className="btn btn--sm" onClick={() => sendChat(q, 'quick')}>
              {q}
            </button>
          ))}
        </div>
        <form
          className="chat__form"
          onSubmit={(e) => {
            e.preventDefault();
            sendChat(text, 'text');
            setText('');
          }}
        >
          <input className="input" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="Mensagem" aria-label="Mensagem" />
          <button className="btn btn--primary" type="submit" disabled={!text.trim()}>Enviar</button>
        </form>
      </div>
    </Sheet>
  );
}
