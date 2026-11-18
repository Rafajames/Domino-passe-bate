import type { MatchState } from '../../engine/types';
import { useGame } from '../../state/gameStore';
import { playSound } from '../../services/sound';
import { Avatar } from '../components/Avatar';
import { ClaimBar } from './ClaimBar';

/**
 * "Passar o celular": cobre a tela entre uma vez e outra para que ninguém veja
 * as pedras de quem jogou antes. Se o jogador anterior ainda pode marcar pontos
 * (modo fiel), a marcação aparece aqui antes da troca.
 */
export function HandoffCover({ match, seat }: { match: MatchState; seat: number }) {
  const viewSeat = useGame((s) => s.viewSeat);
  const { confirmHandoff, claim } = useGame.getState();
  const player = match.players[seat];
  const prev = match.players[viewSeat];
  const pendingForPrev = match.round.pendingClaim?.seat === viewSeat;
  const isYou = player?.name === 'Você';
  return (
    <main className="handoff" aria-live="polite">
      <div className="handoff__card">
        {pendingForPrev && prev && (
          <div className="handoff__claim">
            <p>
              <strong>{prev.name}</strong>, marque seus pontos antes de passar o aparelho:
            </p>
            <ClaimBar onClaim={(p) => claim(p)} onDismiss={() => undefined} />
          </div>
        )}
        <Avatar emoji={player?.avatar ?? '🎲'} size={84} ring="var(--brass)" />
        <h1 className="handoff__title">{isYou ? 'Sua vez' : `Vez de ${player?.name}`}</h1>
        <p className="muted">Passe o aparelho. As pedras ficam escondidas até {isYou ? 'você' : player?.name} tocar no botão.</p>
        <button
          className="btn btn--primary btn--block"
          style={{ minHeight: 56, fontSize: 'var(--fs-lg)' }}
          onClick={() => {
            playSound('turn');
            confirmHandoff();
          }}
        >
          {isYou ? 'Sou eu' : `Sou ${player?.name}`} — mostrar minhas pedras
        </button>
      </div>
    </main>
  );
}
