import type { MatchState } from '../../engine/types';
import { playerView } from '../../engine/view';
import { eventText } from './text';
import { Sheet } from './Sheet';

export function HistoryPanel({ match, seat, onClose }: { match: MatchState; seat: number; onClose: () => void }) {
  // Usa a visão do jogador: compras dos outros aparecem sem revelar a pedra.
  const view = playerView(match, seat);
  const items = view.events
    .map((e, i) => ({ i, text: eventText(e, match.players, match.frozen.rules), kind: e.kind }))
    .filter((x) => x.text)
    .reverse();
  return (
    <Sheet title="Histórico da rodada" onClose={onClose} side>
      <ol className="history">
        {items.map((it) => (
          <li key={it.i} className={`history__item history__item--${it.kind}`}>
            {it.text}
          </li>
        ))}
      </ol>
      {match.history.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginTop: 16 }}>Rodadas anteriores</h3>
          <ol className="history">
            {match.history.map((r) => (
              <li key={r.round} className="history__item">
                Rodada {r.round + 1}: {r.winnerSide === null ? 'sem pontos' : `+${r.points}`} {r.type === 'blocked' ? '(trancado)' : ''}
              </li>
            ))}
          </ol>
        </>
      )}
    </Sheet>
  );
}
