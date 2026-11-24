import { useState, type ReactNode } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { TileSvg } from '../components/Tile';
import { readJSON, writeJSON } from '../../services/storage';
import './menus.css';

/**
 * Livro de regras: uma aba por modalidade, mais o básico e o glossário.
 * Os valores descritos são os dos perfis embutidos; cada grupo pode mudar no editor de regras.
 */

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel rulebook__section">
      <h2 className="rulebook__h">{title}</h2>
      {children}
    </section>
  );
}

function Facts({ items }: { items: [string, string][] }) {
  return (
    <dl className="rulebook__facts">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const Note = ({ children }: { children: ReactNode }) => <p className="rulebook__note">{children}</p>;

function Basics() {
  return (
    <>
      <Section title="O material">
        <p>São 28 pedras, cada uma com dois números de 0 (branco) a 6. A pedra com os dois números iguais é a <strong>carroça</strong> — há sete: do branco à sena.</p>
        <Fig tiles={[[0, 0], [3, 3], [6, 6]]} caption="Carroças de branco, terno e sena" />
      </Section>
      <Section title="Como se joga">
        <p>Na sua vez, encaixe uma pedra cujo número combine com uma das <strong>pontas</strong> abertas da mesa.</p>
        <Fig tiles={[[3, 6], [6, 6], [6, 1]]} caption="Pontas abertas: 3 e 1" />
        <p>Sem pedra que encaixe, você <strong>passa</strong> — ou <strong>compra</strong> do dorme, nas modalidades que têm dorme.</p>
        <p>Quem fica sem pedras <strong>bate</strong> e encerra a rodada. Se ninguém consegue jogar, o jogo está <strong>trancado</strong>: aí conta quem tem menos pontos na mão.</p>
      </Section>
      <Section title="No aplicativo">
        <p>Toque numa pedra para levantá-la e depois na ponta destacada. Se a pedra só cabe num lugar — ou nas duas pontas com o mesmo número — toque nela de novo e ela vai sozinha.</p>
        <p>As regras de cada modalidade podem ser mudadas em <strong>Regras e perfis</strong>: cada mesa tem seu costume.</p>
      </Section>
    </>
  );
}

function PasseBate() {
  return (
    <>
      <Section title="Visão geral">
        <Facts
          items={[
            ['Jogadores', '4, em duas duplas — o parceiro senta à sua frente'],
            ['Pedras', '7 para cada um, sem dorme'],
            ['Saída', 'Na 1ª rodada, quem tem a carroça de sena; depois, quem venceu a rodada, com qualquer pedra'],
            ['Meta', 'A dupla que fizer 6 pontos primeiro'],
          ]}
        />
        <p>Quem não tem pedra que encaixe <strong>passa</strong> a vez — daí o nome. Ganha a rodada quem bater primeiro.</p>
      </Section>
      <Section title="Batidas">
        <Fig tiles={[[2, 5]]} caption="Batida simples — 1 ponto" />
        <Fig tiles={[[5, 5]]} caption="Batida de carroça — 2 pontos" />
        <Fig tiles={[[4, 2]]} caption="Lá e lô: pontas 4 e 2, cada lado da pedra numa ponta — 3 pontos" />
        <Fig tiles={[[4, 4]]} caption="Lá e lô de carroça (quadrada ou cruzada): pontas 4 e 4 — 6 pontos" />
        <Note>Pontas iguais com pedra simples (pontas 3 e 3, batendo com a 3|5) não é lá e lô: é batida simples. Em algumas mesas a quadrada vale 4 — use o perfil "Quadrada vale 4".</Note>
      </Section>
      <Section title="Jogo trancado">
        <p>Ninguém consegue jogar: cada um conta os pontos da própria mão. Quem tiver a <strong>menor mão</strong> ganha 1 ponto para a dupla. Se os dois menores forem de duplas diferentes, ninguém pontua.</p>
      </Section>
      <Section title="Carroças na mão">
        <p><strong>Quatro carroças:</strong> quem recebeu mostra, as pedras voltam para a mesa e são distribuídas de novo. Essa rodada <strong>vale o dobro</strong>.</p>
        <p><strong>Cinco carroças ou mais:</strong> o jogador ganha a partida na hora (em duplas, a dupla).</p>
        <Note>Em algumas mesas a rodada das quatro carroças vale só 1 ponto a mais. Dá para escolher no editor de regras.</Note>
      </Section>
    </>
  );
}

function Fives() {
  return (
    <>
      <Section title="Visão geral">
        <Facts
          items={[
            ['Jogadores', '2 com dorme (7 pedras cada) ou 4 em duplas, sem dorme'],
            ['Saída', 'Com dorme, jogador sorteado; em duplas, quem tem a carroça de sena. Depois, quem venceu a mão'],
            ['Meta', '150 pontos'],
          ]}
        />
        <p>Também chamado de <em>All Fives</em>. Aqui se marca ponto durante a mão, não só na batida.</p>
      </Section>
      <Section title="Pontas que somam 5">
        <p>Depois de jogar, some todas as pontas abertas. Se der <strong>múltiplo de 5</strong>, você marca esse valor.</p>
        <Fig tiles={[[5, 5, false], [5, 0]]} caption="Spinner 5|5 (vale 10) + 0 = 10 pontos" />
        <p>A carroça numa ponta conta <strong>as duas metades</strong>. A pedra de saída sozinha conta inteira.</p>
      </Section>
      <Section title="Spinner">
        <p>A primeira carroça jogada é o <strong>spinner</strong>. Depois que os dois lados dela forem jogados, ela abre também para cima e para baixo — a mesa passa a ter até quatro pontas.</p>
      </Section>
      <Section title="Fim da mão">
        <p><strong>Batida:</strong> quem bate marca os pontos das pedras dos adversários, arredondados para o múltiplo de 5 mais próximo.</p>
        <p><strong>Trancado:</strong> o lado com a menor soma na mão marca o total dos outros. Empate: ninguém marca.</p>
        <p>Quem chega à meta vence na hora, mesmo no meio da mão.</p>
      </Section>
      <Section title="Fiel à mesa">
        <p>No estilo <strong>Fiel à mesa</strong>, o jogo não soma por você: é preciso marcar o valor certo antes do próximo jogar. Errou ou esqueceu, perdeu os pontos.</p>
      </Section>
    </>
  );
}

function Burrinha() {
  return (
    <>
      <Section title="Visão geral">
        <Facts
          items={[
            ['Jogadores', '2 a 4, cada um por si'],
            ['Pedras', '3 para cada um; o resto fica no dorme'],
            ['Saída', 'Na 1ª rodada, sorteio; depois, quem bateu primeiro'],
          ]}
        />
        <p>Sem jogada, compre do dorme até conseguir jogar.</p>
      </Section>
      <Section title="Quem perde">
        <p>Quem bate sai da rodada e o jogo continua entre os outros. O <strong>último que ficar com pedras</strong> perde e recomeça a próxima rodada com <strong>uma pedra a mais</strong> — o castigo acumula.</p>
        <p>Se o jogo trancar, perde quem tiver mais pontos na mão (empate: todos os empatados).</p>
      </Section>
      <Section title="Fim da partida">
        <p>Acaba quando não houver mais pedras no dorme para dar as mãos da próxima rodada. Quem levou mais castigos é <strong>a burrinha</strong>.</p>
        <Note>No editor dá para trocar para "mais pontos na mão": a rodada acaba na primeira batida e perde quem tiver mais pontos.</Note>
      </Section>
    </>
  );
}

const GLOSSARY: [string, string][] = [
  ['Batida', 'Ficar sem pedras na mão. Encerra a rodada.'],
  ['Branco, pio, duque, terno, quadra, quina, sena', 'Os números de 0 a 6.'],
  ['Carroça', 'Pedra com os dois lados iguais (ex.: 4|4). Também chamada de bucha.'],
  ['Cemitério', 'Pedras que ficam fora do jogo e ninguém pode comprar.'],
  ['Dorme', 'Pedras que sobram na distribuição e podem ser compradas.'],
  ['Dupla', 'Os dois parceiros, sentados frente a frente. Os pontos são da dupla.'],
  ['Lá e lô', 'Bater com uma pedra que encaixa nas duas pontas ao mesmo tempo, um lado em cada.'],
  ['Passar', 'Ficar sem jogar a vez por não ter pedra que encaixe.'],
  ['Pontas', 'As extremidades abertas da mesa, onde se pode jogar.'],
  ['Quadrada (cruzada)', 'Lá e lô feito com uma carroça: as duas pontas com o mesmo número da carroça.'],
  ['Spinner', 'No De 5 em 5, a primeira carroça, que abre para os quatro lados.'],
  ['Trancado', 'Quando ninguém consegue jogar. Ganha quem tiver menos pontos na mão.'],
];

function Glossary() {
  return (
    <Section title="Glossário">
      <dl className="rulebook__glossary">
        {GLOSSARY.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

const TABS = [
  { id: 'basico', label: 'O básico', body: Basics },
  { id: 'passe-bate', label: 'Passe e Bate', body: PasseBate },
  { id: 'cinco', label: 'De 5 em 5', body: Fives },
  { id: 'burrinha', label: 'Burrinha', body: Burrinha },
  { id: 'glossario', label: 'Glossário', body: Glossary },
] as const;
type TabId = (typeof TABS)[number]['id'];

const TAB_KEY = 'dpb.rulebook.tab';

export function HowToScreen() {
  const [tab, setTab] = useState<TabId>(() => {
    const saved = readJSON<string>(TAB_KEY, 'basico');
    return TABS.some((t) => t.id === saved) ? (saved as TabId) : 'basico';
  });
  const choose = (id: TabId) => {
    setTab(id);
    writeJSON(TAB_KEY, id);
    window.scrollTo({ top: 0 });
  };
  const Body = TABS.find((t) => t.id === tab)!.body;
  return (
    <main className="screen">
      <ScreenHeader title="Livro de regras" />
      <nav className="rulebook__tabs" role="tablist" aria-label="Modalidades">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`rulebook__tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => choose(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="screen__body" role="tabpanel">
        <Body />
      </div>
    </main>
  );
}
