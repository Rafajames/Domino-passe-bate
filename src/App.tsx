import { useEffect } from 'react';
import { configureSound, unlockAudio } from './services/sound';
import { useNav } from './state/navigation';
import { useSettings } from './state/settingsStore';
import { TileDefs } from './ui/components/Tile';
import { ToastHost } from './ui/components/Toast';
import { GameScreen } from './ui/game/GameScreen';
import { EditorScreen } from './ui/screens/EditorScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { HowToScreen } from './ui/screens/HowToScreen';
import { ModeScreen } from './ui/screens/ModeScreen';
import { OnlineScreen } from './ui/screens/OnlineScreen';
import { PlayerScreen } from './ui/screens/PlayerScreen';
import { ProfilesScreen } from './ui/screens/ProfilesScreen';
import { SetupScreen } from './ui/screens/SetupScreen';
import './ui/components/tile.css';
import './ui/components/components.css';

export function App() {
  const screen = useNav((s) => s.stack[s.stack.length - 1] ?? { name: 'home' as const });
  const tableTheme = useSettings((s) => s.tableTheme);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const soundEnabled = useSettings((s) => s.soundEnabled);
  const volume = useSettings((s) => s.volume);

  useEffect(() => configureSound({ enabled: soundEnabled, volume }), [soundEnabled, volume]);

  // Navegadores só liberam áudio depois de um toque/clique.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.table = tableTheme;
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full';
  }, [tableTheme, reducedMotion]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  let content;
  switch (screen.name) {
    case 'home': content = <HomeScreen />; break;
    case 'mode': content = <ModeScreen />; break;
    case 'profiles': content = <ProfilesScreen key={screen.mode} mode={screen.mode} />; break;
    case 'editor': content = <EditorScreen key={screen.profileId} mode={screen.mode} profileId={screen.profileId} />; break;
    case 'setup': content = <SetupScreen profileId={screen.profileId} />; break;
    case 'game': content = <GameScreen />; break;
    case 'player': content = <PlayerScreen />; break;
    case 'online': content = <OnlineScreen />; break;
    case 'howto': content = <HowToScreen />; break;
  }

  return (
    <>
      <TileDefs />
      {content}
      <ToastHost />
    </>
  );
}
