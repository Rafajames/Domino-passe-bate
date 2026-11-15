/** Modo fiel (All Fives): o jogador precisa "cantar" os próprios pontos antes do próximo jogar. */
export function ClaimBar({ onClaim, onDismiss }: { onClaim: (points: number) => void; onDismiss: () => void }) {
  const options = [5, 10, 15, 20, 25, 30, 35, 40];
  return (
    <div className="claim" role="group" aria-label="Marcar pontos">
      <span className="claim__label">Marcar:</span>
      <div className="claim__options">
        {options.map((p) => (
          <button key={p} className="claim__btn" onClick={() => onClaim(p)}>
            {p}
          </button>
        ))}
        <button className="claim__btn claim__btn--none" onClick={onDismiss}>
          Nada
        </button>
      </div>
    </div>
  );
}
