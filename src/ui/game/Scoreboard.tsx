import type { MatchState } from '../../engine/types';
import { sideName } from './text';
import { sideColor } from './colors';

export function Scoreboard({ match, pulseSide }: { match: MatchState; pulseSide: { side: number; key: number } | null }) {
  const rules = match.frozen.rules;
  return (
    <div className="scoreboard" aria-label="Placar">
      <div className="scoreboard__sides">
        {match.scores.map((score, side) => (
          <span
            key={pulseSide?.side === side ? `${side}-${pulseSide.key}` : side}
            className={`scoreboard__side ${pulseSide?.side === side ? 'is-pulse' : ''}`}
            style={{ ['--side' as string]: sideColor(side, rules.teams) }}
          >
            <span className="scoreboard__name">{sideName(side, rules, match.players)}</span>
            <span className="scoreboard__score">{score}</span>
          </span>
        ))}
      </div>
      <span className="scoreboard__target">
        até {rules.targetScore} · rodada {match.round.index + 1}
      </span>
    </div>
  );
}
