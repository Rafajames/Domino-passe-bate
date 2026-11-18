import { handPips } from '../../engine/tiles';
import { sideOf } from '../../engine/scoring';
import type { MatchState } from '../../engine/types';
import { TileSvg } from '../components/Tile';
import { sideColor } from './colors';
import { resultDetail, resultTitle, sideName } from './text';
import { Sheet } from './Sheet';

export function RoundEndSheet({ match, viewSeat: HUMAN_SEAT, net = 'local', onNext, onExit, onRematch, onReview }: { match: MatchState; viewSeat: number; net?: 'local' | 'host' | 'guest'; onNext: () => void; onExit: () => void; onRematch: () => void; onReview: () => void }) {
  const rules = match.frozen.rules;
  const finished = match.status === 'finished';
  const r = match.round.result;
  const mySide = sideOf(HUMAN_SEAT, rules);
  const burrinha = rules.mode === 'burrinha';
  const won = burrinha ? !(match.loserSeats ?? []).includes(HUMAN_SEAT) : match.winnerSide === mySide;
  const title = finished ? (won ? 'Vitória!' : 'Fim de partida') : r ? resultTitle(r) : 'Fim da rodada';

  return (
    <Sheet title={title}>
      <div className="round-end">
        {finished && (
          <p className="round-end__headline" style={{ color: won ? 'var(--brass-strong)' : 'var(--text-2)' }}>
            {burrinha
              ? `${(match.loserSeats ?? []).map((s) => match.players[s]?.name).join(' e ')} ${(match.loserSeats?.length ?? 0) > 1 ? 'são as burrinhas' : 'é a burrinha'}! O dorme acabou.`
              : match.winnerSide !== null
                ? `${sideName(match.winnerSide, rules, match.players)} venceu${rules.teams ? 'm' : ''} a partida.`
                : 'Partida encerrada.'}
          </p>
        )}
        {r && <p className="round-end__text">{finished ? `${resultTitle(r)} ` : ''}{resultDetail(r, match.players, rules)}</p>}

        <div className="round-end__scores">
          {match.scores.map((s, side) => (
            <div key={side} className="round-end__score" style={{ ['--side' as string]: sideColor(side, rules.teams) }}>
              <span>{sideName(side, rules, match.players)}</span>
              <strong>{s}</strong>
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
                  {match.players[seat]?.name} <span className="muted">· {handPips(h)} {handPips(h) === 1 ? 'ponto' : 'pontos'}</span>
                </span>
                <span className="round-end__tiles">
                  {h.length === 0 ? <span className="muted">bateu</span> : h.map((t) => <TileSvg key={t.id} first={t.a} second={t.b} unit={14} />)}
                </span>
              </div>
            ))}
            {match.round.outOfPlay.length > 0 && (
              <div className="round-end__hand">
                <span className="round-end__who muted">Cemitério</span>
                <span className="round-end__tiles">
                  {match.round.outOfPlay.map((t) => (
                    <TileSvg key={t.id} first={t.a} second={t.b} unit={14} />
                  ))}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="round-end__actions">
          {net !== 'guest' && (
            <button className="btn btn--block btn--ghost" onClick={onReview}>
              Revisar {finished ? 'o jogo' : 'a rodada'} jogada por jogada
            </button>
          )}
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
