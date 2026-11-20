import { useEffect } from 'react';
import { configureHaptics, configureSound, unlockAudio } from './services/sound';
import { justUpdatedFrom, setReloadGuard, usePwa } from './services/pwa';
import { useGame } from './state/gameStore';
import { useOnline } from './state/onlineStore';
import { UpdateBanner } from './ui/components/UpdateBanner';
import { useToastStore } from './ui/components/Toast';
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
import { ReplayScreen } from './ui/screens/ReplayScreen';
import './ui/components/tile.css';
import './ui/components/components.css';

export function App() {
  const screen = useNav((s) => s.stack[s.stack.length - 1] ?? { name: 'home' as const });
  const tableTheme = useSettings((s) => s.tableTheme);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const soundEnabled = useSettings((s) => s.soundEnabled);
  const volume = useSettings((s) => s.volume);

  const haptics = useSettings((s) => s.haptics);
  const matchStatus = useGame((s) => s.match?.status ?? null);
  const onlineRole = useOnline((s) => s.role);
  const updateReady = usePwa((s) => s.updateReady);

  // Atualização automática: só recarrega quando não há partida em andamento nem sala online.
  const safeToReload = !(screen.name === 'game' && matchStatus === 'playing') && onlineRole === null && screen.name !== 'online';
  useEffect(() => {
    setReloadGuard(() => {
      const nav = useNav.getState().current();
      const playing = nav.name === 'game' && useGame.getState().match?.status === 'playing';
      return !playing && useOnline.getState().role === null && nav.name !== 'online';
    });
  }, []);
  useEffect(() => {
    if (updateReady && safeToReload) usePwa.getState().applyUpdate();
  }, [updateReady, safeToReload]);
  useEffect(() => {
    const from = justUpdatedFrom();
    if (from) useToastStore.getState().show(`Jogo atualizado para a versão ${usePwa.getState().version}.`);
  }, []);
  useEffect(() => configureSound({ enabled: soundEnabled, volume }), [soundEnabled, volume]);
  useEffect(() => configureHaptics(haptics), [haptics]);

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

  // Link de convite: ?sala=CODIGO abre direto a tela de entrar na sala.
  useEffect(() => {
    const code = new URLSearchParams(location.search).get('sala');
    if (code && /^[A-Z0-9]{6}$/i.test(code)) {
      history.replaceState(null, '', location.pathname);
      useNav.getState().go({ name: 'online', code: code.toUpperCase() });
    }
  }, []);

  let content;
  switch (screen.name) {
    case 'home': content = <HomeScreen />; break;
    case 'mode': content = <ModeScreen />; break;
    case 'profiles': content = <ProfilesScreen key={screen.mode} mode={screen.mode} />; break;
    case 'editor': content = <EditorScreen key={screen.profileId} mode={screen.mode} profileId={screen.profileId} />; break;
    case 'setup': content = <SetupScreen profileId={screen.profileId} />; break;
    case 'game': content = <GameScreen />; break;
    case 'player': content = <PlayerScreen />; break;
    case 'online': content = <OnlineScreen code={screen.code} />; break;
    case 'howto': content = <HowToScreen />; break;
    case 'replay': content = <ReplayScreen initialRound={screen.round} />; break;
  }

  return (
    <>
      <TileDefs />
      {content}
      {!safeToReload && <UpdateBanner />}
      <ToastHost />
    </>
  );
}
