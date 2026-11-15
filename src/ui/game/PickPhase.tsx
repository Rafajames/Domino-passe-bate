import { useRef, useState } from 'react';
import { useGame, type PickingState } from '../../state/gameStore';
import { playSound } from '../../services/sound';
import { Icon } from '../components/Icon';
import { TileBack } from '../components/Tile';
import { useElementSize } from './useElementSize';

/**
 * "Embaralhar e escolher": as 28 pedras viradas na mesa, como na vida real.
 * A interface nunca mostra a face — a escolha é às cegas.
 */
export function PickPhase({ picking, players, boneyard, onExit }: { picking: PickingState; players: number; boneyard: boolean; onExit: () => void }) {
  const { shuffleTable, togglePick, autoPick, confirmPick } = useGame.getState();
  const ref = useRef<HTMLDivElement>(null);
  const { w, h } = useElementSize(ref);
  const [shaking, setShaking] = useState(false);
  const cols = w > h * 1.4 ? 10 : 7;
  const rows = Math.ceil(picking.deck.length / cols);
  const unit = Math.max(22, Math.min(46, w > 0 ? Math.min((w - 24) / (cols * 1.3), (h - 24) / (rows * 2.5)) : 34));
  const remaining = 28 - players * picking.need;
  const done = picking.chosen.length === picking.need;

  function doShuffle() {
    playSound('draw');
    setTimeout(() => playSound('draw'), 160);
    setShaking(true);
    shuffleTable();
    setTimeout(() => setShaking(false), 650);
  }

  return (
    <main className="game pick">
      <header className="game__top">
        <button className="icon-btn" onClick={onExit} aria-label="Sair">
          <Icon name="back" />
        </button>
        <div className="pick__title">
          <strong>Escolha suas pedras</strong>
          <span>
            {picking.chosen.length} de {picking.need}
            {remaining > 0 ? ` · sobram ${remaining} no ${boneyard ? 'dorme' : 'cemitério'}` : ''}
          </span>
        </div>
        <span style={{ width: 44 }} />
      </header>

      <section className="game__table pick__table" aria-label="Pedras viradas na mesa">
        <div ref={ref} className="pick__area">
          <div className={`pick__grid ${shaking ? 'is-shuffling' : ''}`} style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}>
            {picking.deck.map((t, i) => {
              const chosen = picking.chosen.includes(t.id);
              // Leve desalinhamento, como pedras espalhadas na mesa (determinístico por posição).
              const rot = (((i * 37 + picking.shuffles * 11) % 13) - 6) * 0.9;
              return (
                <button
                  key={t.id}
                  className={`pick__tile ${chosen ? 'is-chosen' : ''}`}
                  style={{ ['--rot' as string]: `${rot}deg`, ['--dx' as string]: `${((i * 53) % 41) - 20}px`, ['--dy' as string]: `${((i * 29) % 31) - 15}px` }}
                  aria-pressed={chosen}
                  aria-label={`Pedra virada ${i + 1}${chosen ? ', escolhida' : ''}`}
                  disabled={!chosen && done}
                  onClick={() => {
                    playSound('select');
                    togglePick(t.id);
                  }}
                >
                  <TileBack unit={unit} />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pick__actions">
        <button className="btn" onClick={doShuffle} disabled={picking.chosen.length > 0}>
          Embaralhar
        </button>
        {!done && (
          <button className="btn btn--ghost" onClick={autoPick}>
            Escolher por mim
          </button>
        )}
        <button className="btn btn--primary" disabled={!done} onClick={confirmPick}>
          {done ? 'Pronto — ver minhas pedras' : `Faltam ${picking.need - picking.chosen.length}`}
        </button>
      </section>
      <p className="pick__hint muted">
        {picking.chosen.length === 0 ? 'Embaralhe quantas vezes quiser e toque nas pedras que vão ser suas.' : 'Toque de novo para devolver uma pedra.'}
      </p>
    </main>
  );
}
