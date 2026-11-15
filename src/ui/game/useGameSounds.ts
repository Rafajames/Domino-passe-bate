import { useEffect, useRef } from 'react';
import { sideOf } from '../../engine/scoring';
import type { MatchState } from '../../engine/types';
import { playSound } from '../../services/sound';
import { HUMAN_SEAT } from '../../state/gameStore';

/** Toca os sons correspondentes aos eventos novos da partida. */
export function useGameSounds(match: MatchState | null): void {
  const seen = useRef<{ id: string; round: number; count: number; status: string } | null>(null);

  useEffect(() => {
    if (!match) return;
    const r = match.round;
    const prev = seen.current;
    const sameRound = prev && prev.id === match.id && prev.round === r.index;
    // Na primeira renderização (ou ao retomar) não repete sons antigos.
    const from = sameRound ? prev.count : r.events.length;
    const fresh = r.events.slice(from);
    let delay = 0;
    for (const e of fresh) {
      const name =
        e.kind === 'play' ? 'place' : e.kind === 'draw' ? 'draw' : e.kind === 'pass' ? 'pass' : e.kind === 'score' ? 'score' : null;
      if (name) {
        const d = delay;
        setTimeout(() => playSound(name), d);
        delay += 120;
      }
    }
    if (sameRound && prev.status === 'playing' && match.status !== 'playing') {
      const mySide = sideOf(HUMAN_SEAT, match.frozen.rules);
      const sound = match.status === 'finished' ? (match.winnerSide === mySide ? 'win' : 'lose') : 'round';
      setTimeout(() => playSound(sound), delay + 350);
    } else if (fresh.length && match.status === 'playing' && r.turn === HUMAN_SEAT) {
      setTimeout(() => playSound('turn'), delay + 250);
    }
    seen.current = { id: match.id, round: r.index, count: r.events.length, status: match.status };
  }, [match]);
}
