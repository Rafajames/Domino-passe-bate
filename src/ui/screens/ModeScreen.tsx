import type { GameMode } from '../../engine/rules/types';
import { useNav } from '../../state/navigation';
import { ScreenHeader } from '../components/ScreenHeader';
import { TileSvg } from '../components/Tile';
import './menus.css';

const MODES: { mode: GameMode; title: string; subtitle: string; text: string; tiles: [number, number][] }[] = [
  {
    mode: 'passe-bate',
    title: 'Passe e Bate',
    subtitle: 'Tradicional · regras paraibanas',
    text: 'Quem não tem pedra passa. Bata primeiro — de carroça ou lá e lô vale mais.',
    tiles: [[6, 6], [6, 4], [4, 4]],
  },
  {
    mode: 'all-fives',
    title: 'All Fives',
    subtitle: 'Dominó de pontos · Boa Vista-RR',
    text: 'Feche as pontas em múltiplos de cinco para marcar durante a mão.',
    tiles: [[5, 5], [5, 0], [3, 2]],
  },
];

export function ModeScreen() {
  const go = useNav((s) => s.go);
  return (
    <main className="screen">
      <ScreenHeader title="Modalidade" />
      <div className="screen__body">
        <p className="muted">Escolha a modalidade. No próximo passo você seleciona o perfil de regras.</p>
        <div className="mode-list">
          {MODES.map((m) => (
            <button key={m.mode} className="mode-card" onClick={() => go({ name: 'profiles', mode: m.mode })}>
              <span className="mode-card__tiles" aria-hidden>
                {m.tiles.map(([a, b], i) => (
                  <TileSvg key={i} first={a} second={b} unit={22} horizontal={a !== b} />
                ))}
              </span>
              <span className="mode-card__text">
                <span className="mode-card__title">{m.title}</span>
                <span className="mode-card__subtitle">{m.subtitle}</span>
                <span className="mode-card__desc">{m.text}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
