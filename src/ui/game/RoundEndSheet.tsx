import { handPips } from '../../engine/tiles';
import { sideOf } from '../../engine/scoring';
import type { MatchState } from '../../engine/types';
import { TileSvg } from '../components/Tile';
import { sideColor } from './colors';
import { resultDetail, resultTitle, sideName } from './text';
import { Sheet } from './Sheet';
import { Icon } from '../components/Icon';

export function RoundEndSheet({ match, viewSeat: HUMAN_SEAT, net = 'local', onNext, onExit, onRematch, onReview, onPeek }: { match: MatchState; viewSeat: number; net?: 'local' | 'host' | 'guest'; onNext: () => void; onExit: () => void; onRematch: () => void; onReview: () => void; onPeek: () => void }) {
  const rules = match.frozen.rules;
  const finished = match.status === 'finished';
  const r = match.round.result;
  const mySide = sideOf(HUMAN_SEAT, rules);
  const burrinha = rules.mode === 'burrinha';
  const won = burrinha ? !(match.loserSeats ?? []).includes(HUMAN_SEAT) : match.winnerSide === mySide;
  const winnerName = !burrinha && match.winnerSide !== null ? sideName(match.winnerSide, rules, match.players) : '';
  // Um título só: quem venceu a partida (sem repetir "Vitória!" + "Nós vencemos").
  const title = finished
    ? burrinha
      ? won ? 'Você escapou!' : 'Fim do dorme'
      : match.winnerSide === null
        ? 'Partida encerrada'
        : rules.teams
          ? won ? 'Nós vencemos!' : 'Eles venceram'
          : won ? 'Você venceu!' : `${winnerName} venceu`
    : r
      ? resultTitle(r)
      : 'Fim da rodada';
  // Pontos ganhos nesta rodada, mostrados no placar do lado que pontuou.
  const gained = r && !burrinha && r.type !== 'carrocas' && r.winnerSide !== null && r.points > 0 ? { side: r.winnerSide, points: r.points } : null;

  return (
    <Sheet title={title}>
      <div className="round-end">
        {finished && burrinha && (
          <p className="round-end__headline" style={{ color: won ? 'var(--brass-strong)' : 'var(--text-2)' }}>
            {`${(match.loserSeats ?? []).map((s) => match.players[s]?.name).join(' e ')} ${(match.loserSeats?.length ?? 0) > 1 ? 'são as burrinhas' : 'é a burrinha'}! O dorme acabou.`}
          </p>
        )}
        {r && <p className="round-end__text">{finished ? `${resultTitle(r)} ` : ''}{resultDetail(r, match.players, rules)}</p>}

        <div className="round-end__scores">
          {match.scores
            .map((s, side) => ({ s, side }))
            .sort((a, b) => (rules.teams ? Number(b.side === mySide) - Number(a.side === mySide) : 0))
            .map(({ s, side }) => (
            <div key={side} className="round-end__score" style={{ ['--side' as string]: sideColor(side, rules.teams) }}>
              <span>{sideName(side, rules, match.players)}</span>
              <strong>{s}</strong>
              {gained?.side === side && <em className="round-end__gain">+{gained.points}</em>}
              {burrinha && <small className="muted">castigo{s === 1 ? '' : 's'} · {match.handSizes?.[side] ?? '-'} pedras</small>}
            </div>
          ))}
        </div>

        {r && (
          <div className="round-end__hands">
            <h3 className="section-title">Pedras que sobraram</h3>
            {r.hands.map((h, seat) => (
              <div key={seat} className="round-end__hand">
                <span className="round-end__who">
                  {match.players[seat]?.name}
                  {h.length > 0 && <span className="muted"> · {handPips(h)} {handPips(h) === 1 ? 'ponto' : 'pontos'}</span>}
                </span>
                <span className="round-end__tiles">
                  {h.length === 0 ? <span className="round-end__out">bateu ✓</span> : h.map((t) => <TileSvg key={t.id} first={t.a} second={t.b} unit={18} />)}
                </span>
              </div>
            ))}
            {match.round.outOfPlay.length > 0 && (
              <div className="round-end__hand">
                <span className="round-end__who muted">Cemitério</span>
                <span className="round-end__tiles">
                  {match.round.outOfPlay.map((t) => (
                    <TileSvg key={t.id} first={t.a} second={t.b} unit={18} />
                  ))}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="round-end__actions">
          <div className="round-end__secondary">
            <button className="btn btn--sm" onClick={onPeek}>
              <Icon name="eye" size={16} /> Ver a mesa
            </button>
            {net !== 'guest' && (
              <button className="btn btn--sm" onClick={onReview}>
                <Icon name="history" size={16} /> Revisar jogadas
              </button>
            )}
          </div>
          {finished ? (
            <>
              {net !== 'guest' ? (
                <button className="btn btn--primary btn--block" onClick={onRematch}>Jogar de novo</button>
              ) : (
                <p className="muted" style={{ textAlign: 'center' }}>Aguardando o anfitrião começar outra partida…</p>
              )}
              <button className="btn btn--block" onClick={onExit}>{net === 'local' ? 'Menu inicial' : 'Sair da sala'}</button>
            </>
          ) : (
            <button className="btn btn--primary btn--block" onClick={onNext} autoFocus>
              Próxima rodada
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
