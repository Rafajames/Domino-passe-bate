import { useMemo } from 'react';
import { hasSavedMatch, useGame } from '../../state/gameStore';
import { useNav } from '../../state/navigation';
import { usePlayer } from '../../state/playerStore';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { TileSvg } from '../components/Tile';
import './menus.css';

export function HomeScreen() {
  const go = useNav((s) => s.go);
  const player = usePlayer((s) => s.player);
  const resume = useGame((s) => s.resume);
  const saved = useMemo(() => hasSavedMatch(), []);

  return (
    <main className="screen home">
      <div className="screen__body home__body">
        <button className="home__player" onClick={() => go({ name: 'player' })} aria-label="Meu perfil">
          <Avatar emoji={player.avatar} size={36} />
          <span>{player.name}</span>
        </button>

        <div className="home__hero">
          <div className="home__mark" aria-hidden>
            <span className="home__mark-tile home__mark-tile--a">
              <TileSvg first={6} second={6} unit={34} />
            </span>
            <span className="home__mark-tile home__mark-tile--b">
              <TileSvg first={6} second={3} unit={34} horizontal />
            </span>
          </div>
          <h1 className="home__title">
            Passe <span className="home__amp">&amp;</span> Bate
          </h1>
          <p className="home__tagline">Dominó de mesa, do jeito que o seu grupo joga.</p>
        </div>

        <div className="home__actions">
          {saved && (
            <button
              className="btn btn--primary btn--block home__cta"
              onClick={() => {
                if (resume()) go({ name: 'game' });
              }}
            >
              <Icon name="play" size={20} /> Continuar partida
            </button>
          )}
          <button className={`btn btn--block home__cta ${saved ? '' : 'btn--primary'}`} onClick={() => go({ name: 'mode' })}>
            <Icon name="users" size={20} /> Jogar contra bots
          </button>
        </div>

        <nav className="list" aria-label="Menu principal">
          <button className="list__item" onClick={() => go({ name: 'online' })}>
            <Icon name="globe" />
            <span className="list__main">
              <span className="list__label">Jogar online</span>
              <span className="list__hint">Salas, convites, ranking e torneios</span>
            </span>
            <span className="badge badge--soon">Em breve</span>
          </button>
          <button className="list__item" onClick={() => go({ name: 'mode' })}>
            <Icon name="sliders" />
            <span className="list__main">
              <span className="list__label">Regras e perfis</span>
              <span className="list__hint">Escolha, personalize e compartilhe o jeito de jogar</span>
            </span>
          </button>
          <button className="list__item" onClick={() => go({ name: 'howto' })}>
            <Icon name="book" />
            <span className="list__main">
              <span className="list__label">Como jogar</span>
              <span className="list__hint">Passe e Bate, batidas e All Fives em 2 minutos</span>
            </span>
          </button>
          <button className="list__item" onClick={() => go({ name: 'player' })}>
            <Icon name="user" />
            <span className="list__main">
              <span className="list__label">Meu perfil</span>
              <span className="list__hint">Nome, avatar, estatísticas e preferências</span>
            </span>
          </button>
        </nav>
      </div>
    </main>
  );
}
