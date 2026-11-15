import { ScreenHeader } from '../components/ScreenHeader';
import { TileSvg } from '../components/Tile';
import './menus.css';

function Fig({ tiles, caption }: { tiles: [number, number, boolean?][]; caption: string }) {
  return (
    <div className="howto-figure" role="img" aria-label={caption}>
      {tiles.map(([a, b, h], i) => (
        <TileSvg key={i} first={a} second={b} unit={20} horizontal={h ?? a !== b} />
      ))}
      <span className="howto-figure__caption">{caption}</span>
    </div>
  );
}

export function HowToScreen() {
  return (
    <main className="screen">
      <ScreenHeader title="Como jogar" />
      <div className="screen__body">
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: 'var(--fs-xl)' }}>O básico</h2>
          <p>Na sua vez, jogue uma pedra cujo número combine com uma das pontas abertas da mesa. Toque na pedra para levantá-la e depois na ponta destacada — ou toque duas vezes se só houver um lugar.</p>
          <Fig tiles={[[3, 6], [6, 6], [6, 1]]} caption="Pontas abertas: 3 e 1" />
          <p>Quem não tem jogada <strong>passa</strong> (ou compra do dorme, quando a regra tem dorme). Se ninguém consegue jogar, o jogo está <strong>trancado</strong>.</p>
        </section>

        <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: 'var(--fs-xl)' }}>Passe e Bate</h2>
          <p>Em duplas, quem bate (fica sem pedras) primeiro ganha pontos para a dupla. Valores do perfil paraibano:</p>
          <Fig tiles={[[2, 5]]} caption="Batida simples — 1 ponto" />
          <Fig tiles={[[5, 5]]} caption="Batida de carroça — 2 pontos" />
          <Fig tiles={[[4, 2]]} caption="Lá e lô: pontas 4 e 2, um lado da pedra em cada ponta — 3 pontos" />
          <Fig tiles={[[4, 4]]} caption="Lá e lô de carroça (quadrada): pontas 4 e 4 — 6 pontos (ou 4, conforme o perfil)" />
          <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>Pontas iguais com pedra simples (ex.: pontas 3 e 3 batendo com a 3|5) não é lá e lô: é batida simples.</p>
          <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>Esses valores são regionais, não universais. Crie um perfil com os valores do seu grupo.</p>
        </section>

        <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: 'var(--fs-xl)' }}>All Fives</h2>
          <p>Some as pontas da mesa depois de jogar. Se der múltiplo de 5, você marca esse valor.</p>
          <Fig tiles={[[5, 5, false], [5, 0]]} caption="Spinner 5|5 (vale 10) + 0 = 10 pontos" />
          <p>A primeira carroça é o <strong>spinner</strong>: depois que os dois lados forem jogados, ela abre para cima e para baixo. Carroças nas pontas contam em dobro.</p>
          <p>Ao bater, você ganha as pedras dos adversários, arredondadas para múltiplo de 5. No modo <strong>Fiel à mesa</strong>, é preciso marcar os próprios pontos — quem esquece, perde.</p>
        </section>
      </div>
    </main>
  );
}
