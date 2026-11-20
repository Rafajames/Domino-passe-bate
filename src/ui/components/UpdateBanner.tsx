import { usePwa } from '../../services/pwa';

/** Aviso discreto quando há versão nova mas o jogador está no meio de uma partida. */
export function UpdateBanner() {
  const ready = usePwa((s) => s.updateReady);
  const apply = usePwa((s) => s.applyUpdate);
  if (!ready) return null;
  return (
    <div className="update-banner" role="status">
      <span>Nova versão pronta.</span>
      <button className="btn btn--sm btn--primary" onClick={apply}>
        Atualizar agora
      </button>
      <span className="muted">ou ela entra quando a partida acabar</span>
    </div>
  );
}
