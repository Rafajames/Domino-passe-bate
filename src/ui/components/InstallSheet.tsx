import { usePwa } from '../../services/pwa';
import { Sheet } from '../game/Sheet';

/** Passo a passo quando o navegador não oferece o botão de instalação direto. */
export function InstallSheet({ onClose }: { onClose: () => void }) {
  const isIos = usePwa((s) => s.isIos);
  return (
    <Sheet title="Instalar o app" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isIos ? (
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>Abra esta página no <strong>Safari</strong>.</li>
            <li>Toque no botão <strong>Compartilhar</strong> (quadrado com seta para cima).</li>
            <li>Escolha <strong>Adicionar à Tela de Início</strong> e confirme.</li>
          </ol>
        ) : (
          <>
            <p style={{ margin: 0 }}>Funciona em qualquer navegador (Chrome, Brave, Samsung Internet, Firefox e outros):</p>
            <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>
                Abra o menu do navegador (<strong>⋮</strong> ou <strong>≡</strong>, em cima ou embaixo da tela).
              </li>
              <li>
                Escolha <strong>Instalar app</strong>, <strong>Adicionar à tela inicial</strong> ou <strong>Adicionar à tela de início</strong>.
              </li>
              <li>Confirme. O ícone do jogo aparece na tela do celular.</li>
            </ol>
          </>
        )}
        <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
          Depois de instalado, o jogo abre como um aplicativo, funciona sem internet (exceto o online) e se atualiza sozinho.
        </p>
        <button className="btn btn--primary btn--block" onClick={onClose}>Entendi</button>
      </div>
    </Sheet>
  );
}
