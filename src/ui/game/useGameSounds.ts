import { useEffect, useRef } from 'react';
import { sideOf } from '../../engine/scoring';
import type { MatchState } from '../../engine/types';
import { haptic, playSound } from '../../services/sound';

/** Toca os sons correspondentes aos eventos novos da partida. */
export function useGameSounds(match: MatchState | null, HUMAN_SEAT: number): void {
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
        if (e.kind === 'score' && e.seat === HUMAN_SEAT) setTimeout(() => haptic([40, 60, 40]), d);
        delay += 120;
      }
    }
    if (sameRound && prev.status === 'playing' && match.status !== 'playing') {
      const mySide = sideOf(HUMAN_SEAT, match.frozen.rules);
      const won = match.frozen.rules.mode === 'burrinha' ? !(match.loserSeats ?? []).includes(HUMAN_SEAT) : match.winnerSide === mySide;
      const sound = match.status === 'finished' ? (won ? 'win' : 'lose') : 'round';
      setTimeout(() => {
        playSound(sound);
        haptic(sound === 'win' ? [60, 80, 60, 80, 120] : 120);
      }, delay + 350);
    } else if (fresh.length && match.status === 'playing' && r.turn === HUMAN_SEAT) {
      setTimeout(() => {
        playSound('turn');
        haptic(35);
      }, delay + 250);
    }
    seen.current = { id: match.id, round: r.index, count: r.events.length, status: match.status };
  }, [match]); // eslint-disable-line react-hooks/exhaustive-deps
}
